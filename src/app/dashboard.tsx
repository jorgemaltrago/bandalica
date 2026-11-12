import { supabase } from "@/services/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const ADMIN_EMAIL = "jorgemaltrago@gmail.com";
const SYNCED_EVENTS_FILE = `${FileSystem.documentDirectory}google_calendar_synced_events.json`;

interface SyncedGoogleEvent {
  id: string;
  name: string;
  bandName: string;
  dateString: string;
  time: string;
  timestamp: number;
}

export default function DashboardScreen() {
  const router = useRouter();
  const [bands, setBands] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Estados para ver detalles de un evento desde el dashboard
  const [selectedEventDetails, setSelectedEventDetails] = useState<any | null>(
    null,
  );
  const [isEventDetailsModalVisible, setIsEventDetailsModalVisible] =
    useState(false);

  // Estados para sincronización con Google Calendar y detección de borrados
  const [syncedGoogleEvents, setSyncedGoogleEvents] = useState<
    SyncedGoogleEvent[]
  >([]);
  const [selectedReminderMinutes, setSelectedReminderMinutes] =
    useState<number>(60);
  const [deletedSyncedEventAlert, setDeletedSyncedEventAlert] =
    useState<SyncedGoogleEvent | null>(null);

  // Estado para las tareas pendientes del Administrador
  const [adminPendingCount, setAdminPendingCount] = useState(0);

  // Estados para crear banda
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [newBandName, setNewBandName] = useState("");
  const [newBandGenre, setNewBandGenre] = useState("Rock");
  const [newBandBio, setNewBandBio] = useState("");
  const [newBandLogoUrl, setNewBandLogoUrl] = useState("");
  const [uploadingBandImage, setUploadingBandImage] = useState(false);

  // Estados para unirse por código
  const [isCodeModalVisible, setIsCodeModalVisible] = useState(false);
  const [inviteCode, setInviteCode] = useState("");

  // Selector flotante de género musical
  const [isGenrePickerVisible, setIsGenrePickerVisible] = useState(false);
  const musicGenres = [
    "Blues",
    "Pop",
    "Rock",
    "Heavy",
    "Electrónica",
    "Fusión",
    "Flamenco",
  ];

  // Estados para editar perfil
  const [isEditProfileModalVisible, setIsEditProfileModalVisible] =
    useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editInstrument, setEditInstrument] = useState("");
  const [editVoice, setEditVoice] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  // Estados para cambiar contraseña desde el perfil
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordAlert, setPasswordAlert] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Mensaje flotante (Toast)
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  const fullWeekDays = [
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
    "Domingo",
  ];

  const reminderOptions = [
    { label: "Sin aviso", minutes: 0 },
    { label: "30 min", minutes: 30 },
    { label: "1 hora", minutes: 60 },
    { label: "2 horas", minutes: 120 },
    { label: "1 día", minutes: 1440 },
  ];

  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    const savedSynced = await readSyncedEventsFromStorage();
    await loadUserDataAndBands(savedSynced);
  };

  const readSyncedEventsFromStorage = async (): Promise<
    SyncedGoogleEvent[]
  > => {
    try {
      if (Platform.OS === "web") {
        const stored = localStorage.getItem("google_calendar_synced_events");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setSyncedGoogleEvents(parsed);
            return parsed;
          }
        }
        return [];
      }

      const fileInfo = await FileSystem.getInfoAsync(SYNCED_EVENTS_FILE);
      if (fileInfo.exists) {
        const content = await FileSystem.readAsStringAsync(SYNCED_EVENTS_FILE);
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          const normalized: SyncedGoogleEvent[] = parsed
            .map((item: any) =>
              typeof item === "string"
                ? {
                    id: item,
                    name: "Evento de banda",
                    bandName: "Banda",
                    dateString: "",
                    time: "",
                    timestamp: Date.now() + 86400000,
                  }
                : item,
            )
            .filter((item: any) => item && item.id);

          setSyncedGoogleEvents(normalized);
          return normalized;
        }
      }
    } catch (e) {
      // Ignorar errores de almacenamiento
    }
    return [];
  };

  const persistSyncedEvents = async (list: SyncedGoogleEvent[]) => {
    setSyncedGoogleEvents(list);
    try {
      if (Platform.OS === "web") {
        localStorage.setItem(
          "google_calendar_synced_events",
          JSON.stringify(list),
        );
        return;
      }
      await FileSystem.writeAsStringAsync(
        SYNCED_EVENTS_FILE,
        JSON.stringify(list),
      );
    } catch (e) {
      // Entorno sin soporte de archivos
    }
  };

  const markEventAsSyncedWithGoogle = async (event: any) => {
    const entry: SyncedGoogleEvent = {
      id: event.id,
      name: event.name,
      bandName: event.bandName || "Banda",
      dateString: event.dateString || "",
      time: event.time || "",
      timestamp: event.eventDateTimeObj
        ? event.eventDateTimeObj.getTime()
        : Date.now(),
    };

    const filtered = syncedGoogleEvents.filter((item) => item.id !== event.id);
    const updated = [...filtered, entry];
    await persistSyncedEvents(updated);
  };

  const handleDismissDeletedEventAlert = async (openCalendar: boolean) => {
    if (deletedSyncedEventAlert) {
      const updated = syncedGoogleEvents.filter(
        (item) => item.id !== deletedSyncedEventAlert.id,
      );
      await persistSyncedEvents(updated);
    }
    setDeletedSyncedEventAlert(null);

    if (openCalendar) {
      Linking.openURL("https://calendar.google.com/").catch(() =>
        showToast("No se pudo abrir Google Calendar."),
      );
    }
  };

  const handleAddToGoogleCalendar = async (event: any) => {
    if (!event?.eventDateTimeObj) return;

    const isCurrentSynced = syncedGoogleEvents.some(
      (item) => item.id === event.id,
    );

    if (isCurrentSynced) {
      const updated = syncedGoogleEvents.filter((item) => item.id !== event.id);
      await persistSyncedEvents(updated);
      showToast("Marcado como no sincronizado.");
      return;
    }

    try {
      const startDate: Date = event.eventDateTimeObj;
      const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

      const formatGoogleDate = (d: Date) =>
        d.toISOString().replace(/-|:|\.\d\d\d/g, "");

      const title = encodeURIComponent(
        `[${event.bandName}] ${event.name} (${event.type})`,
      );

      const songsText =
        event.songsOrderedList && event.songsOrderedList.length > 0
          ? `\n\nRepertorio:\n${event.songsOrderedList
              .map((s: any, idx: number) => `${idx + 1}. ${s.title}`)
              .join("\n")}`
          : "";

      const reminderLabel =
        reminderOptions.find((r) => r.minutes === selectedReminderMinutes)
          ?.label || "1 hora";

      const reminderNote =
        selectedReminderMinutes > 0
          ? `\nRecordatorio configurado: ${reminderLabel} antes.`
          : "";

      const details = encodeURIComponent(
        `Evento de ${event.bandName} gestionado con Bandalica.${reminderNote}${songsText}`,
      );

      const dates = `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`;

      const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`;

      const supported = await Linking.canOpenURL(googleCalendarUrl);
      if (supported) {
        await Linking.openURL(googleCalendarUrl);
        await markEventAsSyncedWithGoogle(event);
        if (Platform.OS === "web") {
          showToast(
            "Se abrió Google Calendar. (Asegúrate de tener sesión iniciada en Google)",
          );
        } else {
          showToast("Google Calendar abierto. Estado actualizado.");
        }
      } else {
        showToast("No se pudo abrir el enlace de Google Calendar.");
      }
    } catch (error) {
      showToast("No se pudo abrir Google Calendar.");
    }
  };

  const loadUserDataAndBands = async (
    currentSyncedList: SyncedGoogleEvent[] = syncedGoogleEvents,
  ) => {
    try {
      setLoading(true);

      const { data: authData, error: authError } =
        await supabase.auth.getUser();
      if (authError) throw authError;

      const user = authData?.user;
      if (!user) {
        router.replace("/" as any);
        return;
      }
      setCurrentUser(user);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profileError && profileData) {
        setUserProfile(profileData);
        setEditFullName(profileData.full_name || "");
        setEditInstrument(profileData.instrument || "");
        setEditVoice(profileData.voice || "");
        setEditPhone(profileData.phone || "");
        setEditBio(profileData.bio || "");
        setEditAvatarUrl(profileData.avatar_url || "");
      }

      // Administrador
      if (user.email === ADMIN_EMAIL) {
        const { count: pendingUsersCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("is_active", false)
          .neq("email", ADMIN_EMAIL);

        const { count: pendingPassCount } = await supabase
          .from("password_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");

        const totalPending = (pendingUsersCount || 0) + (pendingPassCount || 0);
        setAdminPendingCount(totalPending);
      }

      // Obtener bandas del usuario
      const { data: memberBands, error: bandError } = await supabase
        .from("band_members")
        .select(
          `
          band_id,
          bands (*)
        `,
        )
        .eq("user_id", user.id);

      if (bandError) throw bandError;

      if (memberBands) {
        const userBands = memberBands
          .map((item: any) => item.bands)
          .filter(Boolean);
        setBands(userBands);

        const bandIds = userBands.map((b: any) => b.id);
        const now = new Date();
        let activeFutureEventIds: string[] = [];

        if (bandIds.length > 0) {
          const { data: eventsData, error: eventError } = await supabase
            .from("events")
            .select(
              `
              id,
              name,
              type,
              event_date,
              time,
              band_id,
              bands (name, logo_url),
              event_songs (
                position,
                songs (
                  id,
                  title
                )
              )
            `,
            )
            .in("band_id", bandIds)
            .order("event_date", { ascending: true });

          if (!eventError && eventsData) {
            const formattedEvents = eventsData
              .map((ev: any) => {
                const eventTimeStr = ev.time
                  ? ev.time.substring(0, 5)
                  : "20:00";
                const eventDateTimeStr = `${ev.event_date}T${eventTimeStr}:00`;
                const eventDateObj = new Date(eventDateTimeStr);

                const sortedSongs = ev.event_songs
                  ? ev.event_songs
                      .sort((a: any, b: any) => a.position - b.position)
                      .map((es: any) => es.songs)
                  : [];

                const todayStr = now.toISOString().split("T")[0];
                const isToday = ev.event_date === todayStr;

                return {
                  id: ev.id,
                  name: ev.name,
                  type: ev.type,
                  bandName: ev.bands?.name || "Banda",
                  bandLogo: ev.bands?.logo_url || null,
                  dateString: isToday
                    ? "¡Hoy!"
                    : `${fullWeekDays[(eventDateObj.getDay() + 6) % 7]}, ${eventDateObj.getDate()} de ${monthNames[eventDateObj.getMonth()]} de ${eventDateObj.getFullYear()}`,
                  rawDate: ev.event_date,
                  time: eventTimeStr,
                  eventDateTimeObj: eventDateObj,
                  songsCount: sortedSongs.length,
                  songsOrderedList: sortedSongs,
                };
              })
              .filter((ev: any) => {
                return ev.eventDateTimeObj >= now;
              });

            formattedEvents.sort(
              (a: any, b: any) =>
                a.eventDateTimeObj.getTime() - b.eventDateTimeObj.getTime(),
            );

            setUpcomingEvents(formattedEvents);
            activeFutureEventIds = formattedEvents.map((e: any) => e.id);
          }
        } else {
          setUpcomingEvents([]);
        }

        // Comprobación de eventos borrados
        if (currentSyncedList.length > 0) {
          const nowMs = now.getTime();
          const stillFutureSynced = currentSyncedList.filter(
            (item) => item.timestamp >= nowMs,
          );

          if (stillFutureSynced.length !== currentSyncedList.length) {
            await persistSyncedEvents(stillFutureSynced);
          }

          const deletedFutureEvent = stillFutureSynced.find(
            (item) => !activeFutureEventIds.includes(item.id),
          );

          if (deletedFutureEvent) {
            setDeletedSyncedEventAlert(deletedFutureEvent);
          }
        }
      }
    } catch (error: any) {
      console.error("Error al cargar el dashboard:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePickAndUploadAvatar = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showToast("Se necesitan permisos para acceder a la galería.");
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (
        pickerResult.canceled ||
        !pickerResult.assets ||
        pickerResult.assets.length === 0
      ) {
        return;
      }

      setUploadingImage(true);
      const imageUri = pickerResult.assets[0].uri;
      const fileExt = imageUri.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `avatar_${currentUser.id}_${Date.now()}.${fileExt}`;

      const base64Data = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, byteArray, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      setEditAvatarUrl(publicData.publicUrl);
      showToast("Avatar subido. Pulsa 'Guardar Cambios' para aplicar.");
    } catch (error: any) {
      console.error("Error en la subida del avatar:", error);
      showToast("No se pudo subir la imagen.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePickAndUploadBandLogo = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showToast("Se necesitan permisos para acceder a la galería.");
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (
        pickerResult.canceled ||
        !pickerResult.assets ||
        pickerResult.assets.length === 0
      ) {
        return;
      }

      setUploadingBandImage(true);
      const imageUri = pickerResult.assets[0].uri;
      const fileExt = imageUri.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `band_${currentUser.id}_${Date.now()}.${fileExt}`;

      const base64Data = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, byteArray, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      setNewBandLogoUrl(publicData.publicUrl);
      showToast("Logo de banda cargado correctamente.");
    } catch (error: any) {
      console.error("Error al subir el logo de la banda:", error);
      showToast("No se pudo subir la imagen de la banda.");
    } finally {
      setUploadingBandImage(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        showToast(error.message);
      } else {
        router.replace("/" as any);
      }
    } catch (err: any) {
      showToast("Error al cerrar sesión.");
    }
  };

  const handleUpdateProfile = async () => {
    try {
      if (!currentUser) return;

      const updates = {
        id: currentUser.id,
        email: currentUser.email,
        full_name: editFullName.trim(),
        instrument: editInstrument.trim() || null,
        voice: editVoice.trim() || null,
        phone: editPhone.trim() || null,
        bio: editBio.trim() || null,
        avatar_url: editAvatarUrl ? editAvatarUrl.split("?")[0] : null,
      };

      const { error } = await supabase.from("profiles").upsert(updates);
      if (error) throw error;

      showToast("¡Perfil actualizado correctamente!");
      setUserProfile((prev: any) => ({ ...prev, ...updates }));
      setIsEditProfileModalVisible(false);
      loadUserDataAndBands();
    } catch (error: any) {
      showToast(error.message || "Error al actualizar perfil.");
    }
  };

  const handleUpdatePassword = async () => {
    setPasswordAlert(null);

    if (!newPassword || !confirmPassword) {
      setPasswordAlert("Introduce y confirma la nueva contraseña.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordAlert("Las contraseñas no coinciden.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordAlert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      showToast("¡Contraseña actualizada con éxito!");
      setNewPassword("");
      setConfirmPassword("");
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setPasswordAlert(null);
      setIsPasswordModalVisible(false);
    } catch (error: any) {
      setPasswordAlert(error.message || "Error al actualizar la contraseña.");
    }
  };

  const handleCreateBand = async () => {
    if (!newBandName.trim()) {
      showToast("Introduce el nombre de la banda.");
      return;
    }

    try {
      if (!currentUser) return;

      const generatedInviteCode = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

      const { data: createdBand, error: bandError } = await supabase
        .from("bands")
        .insert([
          {
            name: newBandName.trim(),
            genre: newBandGenre || "Rock",
            bio: newBandBio.trim() || null,
            logo_url: newBandLogoUrl ? newBandLogoUrl.split("?")[0] : null,
            invite_code: generatedInviteCode,
            created_by: currentUser.id,
          },
        ])
        .select()
        .single();

      if (bandError) throw bandError;

      if (createdBand) {
        const { error: memberError } = await supabase
          .from("band_members")
          .insert([
            {
              band_id: createdBand.id,
              user_id: currentUser.id,
              role: "admin",
            },
          ]);

        if (memberError && memberError.code !== "23505") {
          throw memberError;
        }
      }

      showToast(`¡Banda creada! Código: ${generatedInviteCode}`);
      setNewBandName("");
      setNewBandGenre("Rock");
      setNewBandBio("");
      setNewBandLogoUrl("");
      setIsCreateModalVisible(false);
      loadUserDataAndBands();
    } catch (error: any) {
      showToast(error.message || "Error al crear la banda.");
    }
  };

  const handleJoinByCode = async () => {
    if (!inviteCode.trim()) {
      showToast("Introduce el código de invitación.");
      return;
    }

    try {
      const { data: bandData, error: bandError } = await supabase
        .from("bands")
        .select("id, name")
        .eq("invite_code", inviteCode.trim())
        .single();

      if (bandError || !bandData) {
        showToast("El código no es válido o la banda no existe.");
        return;
      }

      const { error: joinError } = await supabase.from("band_members").insert([
        {
          band_id: bandData.id,
          user_id: currentUser.id,
          role: "member",
        },
      ]);

      if (joinError) {
        if (joinError.code === "23505") {
          showToast("Ya formas parte de esta banda.");
        } else {
          throw joinError;
        }
      } else {
        showToast(`¡Te has unido a ${bandData.name}!`);
        setInviteCode("");
        setIsCodeModalVisible(false);
        loadUserDataAndBands();
      }
    } catch (error: any) {
      showToast(error.message || "Error al unirse.");
    }
  };

  const handleSelectBand = (bandId: string) => {
    if (!currentUser) {
      showToast("No se encontró el usuario actual.");
      return;
    }

    router.push({
      pathname: "/tabs/calendar" as any,
      params: {
        bandId: bandId,
        userId: currentUser.id,
      },
    });
  };

  // PANTALLA DE CARGA INICIAL
  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center", flex: 1 },
        ]}
      >
        <ActivityIndicator size="large" color="#00bcd4" />
        <Text style={{ color: "#aaa", marginTop: 10 }}>
          Cargando dashboard...
        </Text>
      </View>
    );
  }

  const avatarSource = userProfile?.avatar_url;
  const userBio = userProfile?.bio;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* MENSAJE FLOTANTE (TOAST) */}
      {toastMessage && (
        <View style={styles.toastContainer}>
          <Ionicons
            name="checkmark-circle"
            size={20}
            color="#00bcd4"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* PERFIL DE USUARIO */}
      <View style={styles.userCard}>
        <View style={styles.cardHeaderRow}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            {avatarSource ? (
              <Image
                source={{ uri: avatarSource }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={{ fontSize: 18 }}>🎸</Text>
              </View>
            )}
            <View style={{ flex: 1 }} />
          </View>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              style={styles.actionButtonWithText}
              onPress={() => setIsEditProfileModalVisible(true)}
            >
              <Text style={styles.actionButtonText}>Editar</Text>
              <Ionicons name="create-outline" size={18} color="#00bcd4" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButtonWithText,
                { borderColor: "#ff5252", marginLeft: 8 },
              ]}
              onPress={handleSignOut}
            >
              <Text style={[styles.actionButtonText, { color: "#ff5252" }]}>
                Cerrar sesión
              </Text>
              <Ionicons name="log-out-outline" size={18} color="#ff5252" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.userName}>
          {userProfile?.full_name || "Nombre no especificado"}
        </Text>
        <Text style={styles.userEmail}>
          {currentUser?.email || "Cargando correo..."}
        </Text>

        <View style={styles.roleContainer}>
          <Text style={styles.userRoleLabel}>Instrumento / Voz:</Text>
          <Text style={styles.userRoleValue}>
            {[userProfile?.instrument, userProfile?.voice]
              .filter(Boolean)
              .join(" / ") || "Músico / Miembro"}
          </Text>
        </View>

        {userBio ? (
          <View style={styles.bioContainer}>
            <Text style={styles.bioLabel}>Biografía:</Text>
            <Text style={styles.bioText} numberOfLines={3}>
              {userBio}
            </Text>
          </View>
        ) : null}
      </View>

      {/* BOTÓN / ACCESO DIRECTO AL PANEL DE ADMINISTRACIÓN */}
      {currentUser?.email === ADMIN_EMAIL && (
        <TouchableOpacity
          style={styles.adminAccessButton}
          onPress={() => router.replace("/admin-dashboard" as any)}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <Ionicons
              name="shield-checkmark"
              size={24}
              color="#ff9800"
              style={{ marginRight: 10 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.adminAccessTitle}>
                Administrar Aplicación
              </Text>
              <Text style={styles.adminAccessSubtitle}>
                Panel de control general de Bandalica
              </Text>
            </View>
          </View>

          {adminPendingCount > 0 ? (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>
                {adminPendingCount}{" "}
                {adminPendingCount === 1 ? "pendiente" : "pendientes"}
              </Text>
            </View>
          ) : (
            <View style={styles.badgeContainerAllClear}>
              <Text style={styles.badgeTextAllClear}>Al día ✨</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* TÍTULO DE MIS BANDAS */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 12,
          marginTop: 10,
        }}
      >
        <Ionicons
          name="radio-outline"
          size={22}
          color="#00bcd4"
          style={{ marginRight: 8 }}
        />
        <Text style={styles.headerTitle}>Mis Bandas</Text>
      </View>

      {/* BOTONERA DE ACCIONES */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={[styles.primaryButton, { flex: 1, marginRight: 6 }]}
          onPress={() => setIsCreateModalVisible(true)}
        >
          <Ionicons
            name="add-circle-outline"
            size={18}
            color="#000"
            style={{ marginRight: 4 }}
          />
          <Text style={styles.primaryButtonText}>Crear Banda</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, { flex: 1, marginLeft: 6 }]}
          onPress={() => setIsCodeModalVisible(true)}
        >
          <Ionicons
            name="key-outline"
            size={18}
            color="#fff"
            style={{ marginRight: 4 }}
          />
          <Text style={styles.secondaryButtonText}>Insertar Código</Text>
        </TouchableOpacity>
      </View>

      {/* LISTA DE BANDAS */}
      {bands.length === 0 ? (
        <Text style={styles.emptyText}>
          Todavía no perteneces a ninguna banda.
        </Text>
      ) : (
        bands.map((band) => (
          <TouchableOpacity
            key={band.id}
            style={styles.bandCard}
            onPress={() => handleSelectBand(band.id)}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View
                style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
              >
                {band.logo_url ? (
                  <Image
                    source={{ uri: band.logo_url }}
                    style={styles.bandAvatarImage}
                  />
                ) : (
                  <View style={styles.bandAvatarPlaceholder}>
                    <Ionicons name="radio-outline" size={18} color="#00bcd4" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.bandName}>{band.name}</Text>
                  <Text style={styles.bandGenre}>
                    Género: {band.genre || "No especificado"}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#00bcd4" />
            </View>
          </TouchableOpacity>
        ))
      )}

      {/* SECCIÓN: PRÓXIMOS EVENTOS DE LAS BANDAS DEL USUARIO */}
      {bands.length > 0 && (
        <View style={{ marginTop: 15, marginBottom: 15 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Ionicons
              name="calendar-outline"
              size={22}
              color="#ff9800"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.headerTitle}>Próximos Eventos</Text>
          </View>

          {upcomingEvents.length === 0 ? (
            <Text style={styles.emptyText}>
              No hay eventos próximos programados para tus bandas.
            </Text>
          ) : (
            upcomingEvents.map((ev) => {
              const cardBorderColor =
                ev.type === "Actuación"
                  ? "#ff9800"
                  : ev.type === "Ensayo"
                    ? "#00bcd4"
                    : "#ffffff";

              const isSyncedInGoogle = syncedGoogleEvents.some(
                (item) => item.id === ev.id,
              );

              return (
                <TouchableOpacity
                  key={ev.id}
                  style={[
                    styles.dashboardEventBadge,
                    { borderColor: cardBorderColor },
                  ]}
                  onPress={() => {
                    setSelectedEventDetails(ev);
                    setIsEventDetailsModalVisible(true);
                  }}
                >
                  <View style={styles.eventHeaderRow}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        flex: 1,
                        marginRight: 8,
                      }}
                    >
                      {ev.bandLogo ? (
                        <Image
                          source={{ uri: ev.bandLogo }}
                          style={styles.eventBandSmallAvatar}
                        />
                      ) : (
                        <View style={styles.eventBandSmallPlaceholder}>
                          <Ionicons
                            name="radio-outline"
                            size={14}
                            color="#00bcd4"
                          />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.miniEventName} numberOfLines={1}>
                          {ev.name}
                        </Text>
                        <Text style={styles.dashboardBandTag}>
                          {ev.bandName}
                        </Text>
                      </View>
                    </View>

                    <View style={{ alignItems: "flex-end" }}>
                      <Text
                        style={[
                          styles.eventTypeLabelText,
                          {
                            color:
                              ev.type === "Actuación"
                                ? "#ff9800"
                                : ev.type === "Ensayo"
                                  ? "#00bcd4"
                                  : "#ffffff",
                          },
                        ]}
                      >
                        {ev.type}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginTop: 4,
                        }}
                      >
                        <Ionicons
                          name="time-outline"
                          size={15}
                          color="#ffffff"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.miniEventTime}>{ev.time}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.eventFooterRow}>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Ionicons
                        name="calendar-clear-outline"
                        size={17}
                        color="#00bcd4"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.miniEventDate}>{ev.dateString}</Text>
                    </View>
                  </View>

                  {/* INDICADOR DE AÑADIDO A GOOGLE CALENDAR */}
                  {isSyncedInGoogle && (
                    <View style={styles.googleSyncedBadgeRow}>
                      <Ionicons
                        name="checkmark-circle"
                        size={15}
                        color="#4caf50"
                        style={{ marginRight: 5 }}
                      />
                      <Text style={styles.googleSyncedBadgeText}>
                        Añadido a Google Calendar
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}

      {/* MODAL DE AVISO: EVENTO CANCELADO QUE ESTABA EN GOOGLE CALENDAR */}
      <Modal
        visible={deletedSyncedEventAlert !== null}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { borderColor: "#ff9800" }]}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Ionicons
                name="warning-outline"
                size={28}
                color="#ff9800"
                style={{ marginRight: 10 }}
              />
              <Text
                style={[styles.modalTitleWhite, { color: "#ff9800", flex: 1 }]}
              >
                Evento Eliminado en la Banda
              </Text>
            </View>

            <Text style={styles.deletedAlertBodyText}>
              El evento{" "}
              <Text style={{ fontWeight: "bold", color: "#ffffff" }}>
                "{deletedSyncedEventAlert?.name}"
              </Text>{" "}
              de{" "}
              <Text style={{ fontWeight: "bold", color: "#00bcd4" }}>
                {deletedSyncedEventAlert?.bandName}
              </Text>{" "}
              {deletedSyncedEventAlert?.dateString
                ? `(${deletedSyncedEventAlert.dateString} - ${deletedSyncedEventAlert.time})`
                : ""}{" "}
              ha sido eliminado de la aplicación, pero lo tenías guardado en tu{" "}
              <Text style={{ fontWeight: "bold", color: "#4caf50" }}>
                Google Calendar
              </Text>
              .
            </Text>

            <Text style={styles.deletedAlertSubText}>
              ¿Deseas acceder a Google Calendar ahora para borrarlo también de
              tu agenda?
            </Text>

            <TouchableOpacity
              style={[
                styles.googleCalendarButton,
                {
                  backgroundColor: "#ff9800",
                  borderColor: "#ff9800",
                  marginBottom: 8,
                },
              ]}
              onPress={() => handleDismissDeletedEventAlert(true)}
            >
              <Ionicons
                name="calendar-outline"
                size={18}
                color="#000000"
                style={{ marginRight: 8 }}
              />
              <Text
                style={[styles.googleCalendarButtonText, { color: "#000000" }]}
              >
                Acceder a Google Calendar para borrarlo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseButtonWhite}
              onPress={() => handleDismissDeletedEventAlert(false)}
            >
              <Text style={styles.modalCloseButtonWhiteText}>
                Ya lo he borrado / Descartar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: DETALLES DEL EVENTO */}
      <Modal
        visible={isEventDetailsModalVisible}
        transparent
        animationType="slide"
      >
        {(() => {
          const eventType = selectedEventDetails?.type;
          const modalBorderColor =
            eventType === "Actuación"
              ? "#ff9800"
              : eventType === "Ensayo"
                ? "#00bcd4"
                : "#ffffff";

          const isCurrentEventSynced = selectedEventDetails
            ? syncedGoogleEvents.some(
                (item) => item.id === selectedEventDetails.id,
              )
            : false;

          return (
            <View style={styles.modalOverlay}>
              <View
                style={[styles.modalContent, { borderColor: modalBorderColor }]}
              >
                <View style={styles.modalBandHeaderRow}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flex: 1,
                      marginRight: 8,
                    }}
                  >
                    {selectedEventDetails?.bandLogo ? (
                      <Image
                        source={{ uri: selectedEventDetails.bandLogo }}
                        style={styles.modalBandLogoImage}
                      />
                    ) : (
                      <View style={styles.modalBandLogoPlaceholder}>
                        <Ionicons
                          name="radio-outline"
                          size={18}
                          color="#00bcd4"
                        />
                      </View>
                    )}
                    <Text
                      style={styles.modalBandNameTextWhite}
                      numberOfLines={1}
                    >
                      {selectedEventDetails?.bandName || "Banda"}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.modalTypeBadgeHeader,
                      {
                        color:
                          eventType === "Actuación"
                            ? "#ff9800"
                            : eventType === "Ensayo"
                              ? "#00bcd4"
                              : "#ffffff",
                      },
                    ]}
                  >
                    {eventType}
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  {eventType === "Ensayo" && (
                    <Ionicons
                      name="musical-notes-outline"
                      size={26}
                      color="#00bcd4"
                      style={{ marginRight: 10 }}
                    />
                  )}
                  {eventType === "Actuación" && (
                    <Ionicons
                      name="mic-outline"
                      size={26}
                      color="#ff9800"
                      style={{ marginRight: 10 }}
                    />
                  )}
                  {eventType !== "Ensayo" && eventType !== "Actuación" && (
                    <Ionicons
                      name="location-outline"
                      size={26}
                      color="#ffffff"
                      style={{ marginRight: 10 }}
                    />
                  )}
                  <Text style={styles.modalTitleWhite}>
                    {selectedEventDetails?.name}
                  </Text>
                </View>

                <View style={{ marginBottom: 10 }}>
                  <Text style={styles.modalDateInfo}>
                    {selectedEventDetails?.dateString} a las{" "}
                    {selectedEventDetails?.time}
                  </Text>
                </View>

                <Text style={styles.subSectionTitle}>
                  Repertorio ({selectedEventDetails?.songsCount || 0}{" "}
                  canciones):
                </Text>

                <ScrollView style={styles.modalScrollList}>
                  {selectedEventDetails?.songsOrderedList?.length === 0 ? (
                    <Text style={styles.emptyText}>
                      Este evento no tiene canciones asociadas.
                    </Text>
                  ) : (
                    selectedEventDetails?.songsOrderedList?.map(
                      (song: any, index: number) => (
                        <View
                          key={song.id || index}
                          style={styles.modalSongItemPlain}
                        >
                          <Text style={styles.modalSongTitlePlain}>
                            {index + 1}. {song.title}
                          </Text>
                        </View>
                      ),
                    )
                  )}
                </ScrollView>

                {/* ZONA DE GOOGLE CALENDAR Y RECORDATORIO */}
                <View style={styles.googleCalendarBox}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <Ionicons
                      name="notifications-outline"
                      size={16}
                      color="#00bcd4"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.googleReminderLabel}>
                      Aviso / Recordatorio previo:
                    </Text>
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: 10 }}
                  >
                    {reminderOptions.map((opt) => {
                      const isSelected =
                        selectedReminderMinutes === opt.minutes;
                      return (
                        <TouchableOpacity
                          key={opt.minutes}
                          style={[
                            styles.reminderChip,
                            isSelected && styles.reminderChipActive,
                          ]}
                          onPress={() =>
                            setSelectedReminderMinutes(opt.minutes)
                          }
                        >
                          <Text
                            style={[
                              styles.reminderChipText,
                              isSelected && styles.reminderChipTextActive,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <TouchableOpacity
                    style={[
                      styles.googleCalendarButton,
                      isCurrentEventSynced && styles.googleCalendarButtonSynced,
                    ]}
                    onPress={() =>
                      handleAddToGoogleCalendar(selectedEventDetails)
                    }
                  >
                    <Ionicons
                      name={
                        isCurrentEventSynced
                          ? "checkmark-circle"
                          : "calendar-outline"
                      }
                      size={18}
                      color={isCurrentEventSynced ? "#4caf50" : "#ffffff"}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={[
                        styles.googleCalendarButtonText,
                        isCurrentEventSynced && { color: "#4caf50" },
                      ]}
                    >
                      {isCurrentEventSynced
                        ? "Guardado en Google (Toca para desmarcar)"
                        : Platform.OS === "web"
                          ? "Añadir a Google Calendar (Abrirá pestaña)"
                          : "Añadir a Google Calendar"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[
                    styles.modalCloseButtonDynamic,
                    { backgroundColor: modalBorderColor },
                  ]}
                  onPress={() => setIsEventDetailsModalVisible(false)}
                >
                  <Text
                    style={[
                      styles.modalCloseButtonDynamicText,
                      { color: "#000" },
                    ]}
                  >
                    Cerrar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}
      </Modal>

      {/* MODAL PARA EDITAR PERFIL (ACTUALIZADO CON MAX-HEIGHT Y SCROLL) */}
      <Modal
        visible={isEditProfileModalVisible}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { maxHeight: "82%", paddingBottom: 10 },
            ]}
          >
            <Text style={styles.modalTitle}>Editar Perfil de Usuario</Text>

            <ScrollView
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{
                paddingBottom: 25,
                paddingHorizontal: 4,
              }}
            >
              <View style={{ alignItems: "center", marginBottom: 12 }}>
                <TouchableOpacity
                  style={styles.logoContainerModal}
                  onPress={handlePickAndUploadAvatar}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color="#00bcd4" />
                  ) : editAvatarUrl ? (
                    <Image
                      source={{ uri: editAvatarUrl }}
                      style={styles.logoImg}
                    />
                  ) : (
                    <Text style={styles.logoFallback}>🎸</Text>
                  )}
                  <View style={styles.editBadge}>
                    <Ionicons name="camera" size={16} color="#000" />
                  </View>
                </TouchableOpacity>
                <Text style={styles.tipText}>Toca para cambiar la foto</Text>
              </View>

              <Text style={styles.inputLabel}>
                Correo electrónico (No modificable):
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: "#181818", color: "#777" },
                ]}
                value={currentUser?.email || ""}
                editable={false}
              />

              <Text style={styles.inputLabel}>Nombre completo:</Text>
              <TextInput
                style={styles.input}
                placeholder="Tu nombre y apellidos"
                placeholderTextColor="#666"
                value={editFullName}
                onChangeText={setEditFullName}
              />

              <Text style={styles.inputLabel}>Instrumento principal:</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. Guitarra, Batería..."
                placeholderTextColor="#666"
                value={editInstrument}
                onChangeText={setEditInstrument}
              />

              <Text style={styles.inputLabel}>Voz / Coros:</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. Principal, Coros..."
                placeholderTextColor="#666"
                value={editVoice}
                onChangeText={setEditVoice}
              />

              <Text style={styles.inputLabel}>Teléfono:</Text>
              <TextInput
                style={styles.input}
                placeholder="Tu teléfono de contacto"
                placeholderTextColor="#666"
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Biografía:</Text>
              <TextInput
                style={[styles.input, { height: 75, textAlignVertical: "top" }]}
                placeholder="Cuéntanos algo sobre ti..."
                placeholderTextColor="#666"
                value={editBio}
                onChangeText={setEditBio}
                multiline
              />

              <TouchableOpacity
                style={[styles.secondaryButton, { marginTop: 12 }]}
                onPress={() => {
                  setPasswordAlert(null);
                  setIsPasswordModalVisible(true);
                }}
              >
                <Ionicons
                  name="key-outline"
                  size={18}
                  color="#fff"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.secondaryButtonText}>
                  Cambiar contraseña
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.buttonRowContainerFixed}>
              <TouchableOpacity
                style={[
                  styles.modalBtnAction,
                  { backgroundColor: "#00bcd4", marginRight: 6 },
                ]}
                onPress={handleUpdateProfile}
              >
                <Text
                  style={{ color: "#000", fontWeight: "bold", fontSize: 14 }}
                >
                  Guardar cambios
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalBtnAction,
                  { backgroundColor: "#ffffff", marginLeft: 6 },
                ]}
                onPress={() => setIsEditProfileModalVisible(false)}
              >
                <Text
                  style={{ color: "#000", fontWeight: "bold", fontSize: 14 }}
                >
                  Volver
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL CAMBIO DE CONTRASEÑA */}
      <Modal visible={isPasswordModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { borderColor: "#ff9800" }]}>
            {passwordAlert && (
              <View style={styles.alertBanner}>
                <Ionicons
                  name="warning-outline"
                  size={18}
                  color="#ff5252"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.alertBannerText}>{passwordAlert}</Text>
              </View>
            )}

            <View style={{ alignItems: "center", marginBottom: 10 }}>
              <Ionicons name="key" size={38} color="#ff9800" />
            </View>
            <Text style={[styles.modalTitle, { color: "#ff9800" }]}>
              Cambiar Contraseña
            </Text>
            <Text style={styles.modalDesc}>
              Introduce tu nueva contraseña dos veces para confirmar.
            </Text>

            <Text style={styles.inputLabel}>Nueva contraseña:</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordTextInput}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#666"
                secureTextEntry={!showNewPassword}
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TouchableOpacity
                style={styles.eyeIconBtn}
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                <Ionicons
                  name={showNewPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="#aaa"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Repite la nueva contraseña:</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordTextInput}
                placeholder="Repite la contraseña"
                placeholderTextColor="#666"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity
                style={styles.eyeIconBtn}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="#aaa"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.buttonRowContainer}>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor: "#333",
                    borderWidth: 1,
                    borderColor: "#666",
                  },
                ]}
                onPress={() => {
                  setNewPassword("");
                  setConfirmPassword("");
                  setPasswordAlert(null);
                  setShowNewPassword(false);
                  setShowConfirmPassword(false);
                  setIsPasswordModalVisible(false);
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#ff9800" }]}
                onPress={handleUpdatePassword}
              >
                <Text style={{ color: "#000", fontWeight: "bold" }}>
                  Guardar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL CREAR BANDA */}
      <Modal visible={isCreateModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ paddingVertical: 20 }}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Crear Nueva Banda</Text>

              <View style={{ alignItems: "center", marginBottom: 15 }}>
                <TouchableOpacity
                  style={styles.logoContainerModal}
                  onPress={handlePickAndUploadBandLogo}
                  disabled={uploadingBandImage}
                >
                  {uploadingBandImage ? (
                    <ActivityIndicator size="small" color="#00bcd4" />
                  ) : newBandLogoUrl ? (
                    <Image
                      source={{ uri: newBandLogoUrl }}
                      style={styles.logoImg}
                    />
                  ) : (
                    <Ionicons name="radio-outline" size={32} color="#00bcd4" />
                  )}
                  <View style={styles.editBadge}>
                    <Ionicons name="camera" size={16} color="#000" />
                  </View>
                </TouchableOpacity>
                <Text style={styles.tipText}>
                  Toca para añadir logo de banda
                </Text>
              </View>

              <Text style={styles.inputLabel}>Nombre de la banda *:</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre de la banda"
                placeholderTextColor="#666"
                value={newBandName}
                onChangeText={setNewBandName}
              />

              <Text style={styles.inputLabel}>Género musical:</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setIsGenrePickerVisible(true)}
              >
                <Text style={styles.pickerButtonText}>
                  Género: {newBandGenre}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#00bcd4" />
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Biografía de la banda:</Text>
              <TextInput
                style={[styles.input, { height: 90, textAlignVertical: "top" }]}
                placeholder="Cuéntanos la historia o estilo de la banda..."
                placeholderTextColor="#666"
                value={newBandBio}
                onChangeText={setNewBandBio}
                multiline
              />

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleCreateBand}
              >
                <Text style={styles.primaryButtonText}>Guardar Banda</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setIsCreateModalVisible(false)}
              >
                <Text style={styles.modalCloseButtonText}>Volver</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* MODAL UNIRSE POR CÓDIGO */}
      <Modal visible={isCodeModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Unirse a una Banda</Text>
            <Text style={styles.modalDesc}>
              Introduce el código de invitación que te ha proporcionado el
              administrador de la banda.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Ej. A3F92K"
              placeholderTextColor="#666"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleJoinByCode}
            >
              <Text style={styles.primaryButtonText}>Unirme</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setIsCodeModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Volver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL SELECCIONAR GÉNERO */}
      <Modal visible={isGenrePickerVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: "80%" }]}>
            <Text style={styles.modalTitle}>Selecciona el Género</Text>
            {musicGenres.map((genre) => (
              <TouchableOpacity
                key={genre}
                style={{
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: "#333",
                }}
                onPress={() => {
                  setNewBandGenre(genre);
                  setIsGenrePickerVisible(false);
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 16, textAlign: "center" }}
                >
                  {genre}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.modalCloseButton, { marginTop: 15 }]}
              onPress={() => setIsGenrePickerVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>volver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#121212", flexGrow: 1 },
  toastContainer: {
    position: "absolute",
    top: 10,
    alignSelf: "center",
    backgroundColor: "#1e1e1e",
    borderWidth: 1,
    borderColor: "#00bcd4",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 999,
  },
  toastText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  userCard: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#333",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  avatarImage: { width: 45, height: 45, borderRadius: 22.5, marginRight: 10 },
  avatarPlaceholder: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "#2a2a2a",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  userName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 2,
  },
  userEmail: { color: "#777", fontSize: 13, marginBottom: 10 },
  roleContainer: {
    flexDirection: "row",
    backgroundColor: "#252525",
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  userRoleLabel: { color: "#aaa", fontSize: 13, marginRight: 6 },
  userRoleValue: { color: "#00bcd4", fontSize: 13, fontWeight: "600" },
  bioContainer: { marginTop: 4 },
  bioLabel: { color: "#aaa", fontSize: 12, marginBottom: 2 },
  bioText: { color: "#ccc", fontSize: 13 },
  actionButtonWithText: {
    backgroundColor: "#121212",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#00bcd4",
  },
  actionButtonText: {
    color: "#00bcd4",
    fontWeight: "bold",
    fontSize: 13,
    marginRight: 6,
  },
  adminAccessButton: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ff9800",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  adminAccessTitle: { color: "#ff9800", fontSize: 15, fontWeight: "bold" },
  adminAccessSubtitle: { color: "#888", fontSize: 11 },
  badgeContainer: {
    backgroundColor: "#ff5252",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  badgeContainerAllClear: {
    backgroundColor: "#222",
    borderWidth: 1,
    borderColor: "#444",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  badgeTextAllClear: { color: "#aaa", fontSize: 11, fontWeight: "600" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  actionButtonsContainer: { flexDirection: "row", marginBottom: 16 },
  primaryButton: {
    backgroundColor: "#00bcd4",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 10,
  },
  primaryButtonText: { color: "#000", fontSize: 14, fontWeight: "bold" },
  secondaryButton: {
    backgroundColor: "#333",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#555",
  },
  secondaryButtonText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  bandCard: {
    backgroundColor: "#1e1e1e",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#333",
  },
  bandAvatarImage: { width: 38, height: 38, borderRadius: 19, marginRight: 10 },
  bandAvatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#2a2a2a",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  bandName: { color: "#fff", fontSize: 15, fontWeight: "bold" },
  bandGenre: { color: "#888", fontSize: 12 },
  dashboardEventBadge: {
    backgroundColor: "#1e1e1e",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  eventBandSmallAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  eventBandSmallPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2a2a2a",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  dashboardBandTag: { color: "#aaa", fontSize: 12, marginTop: 1 },
  eventHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  eventFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  googleSyncedBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#2a2a2a",
  },
  googleSyncedBadgeText: {
    color: "#4caf50",
    fontSize: 12,
    fontWeight: "bold",
  },
  deletedAlertBodyText: {
    color: "#ddd",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },
  deletedAlertSubText: {
    color: "#aaa",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  modalCloseButtonWhite: {
    backgroundColor: "#333",
    borderWidth: 1,
    borderColor: "#555",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalCloseButtonWhiteText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  miniEventName: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  miniEventDate: { color: "#ffffff", fontSize: 16, fontWeight: "bold" },
  miniEventTime: { color: "#ffffff", fontSize: 16, fontWeight: "bold" },
  eventTypeLabelText: { fontSize: 14, fontWeight: "bold", textAlign: "right" },
  loadingText: {
    color: "#777",
    fontSize: 13,
    textAlign: "center",
    marginVertical: 10,
  },
  emptyText: {
    color: "#777",
    fontSize: 14,
    textAlign: "center",
    marginVertical: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    maxHeight: "88%",
  },
  modalBandHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  modalBandLogoImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  modalBandLogoPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2a2a2a",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  modalBandNameTextWhite: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
  },
  modalTypeBadgeHeader: {
    fontSize: 14,
    fontWeight: "bold",
  },
  modalTitleWhite: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  modalDateInfo: {
    color: "#aaa",
    fontSize: 13,
  },
  subSectionTitle: {
    color: "#bbb",
    fontSize: 15,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 6,
  },
  modalScrollList: {
    maxHeight: 200,
    marginBottom: 10,
  },
  modalSongItemPlain: {
    backgroundColor: "#121212",
    padding: 12,
    borderRadius: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#333",
  },
  modalSongTitlePlain: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  googleCalendarBox: {
    backgroundColor: "#141414",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#2e2e2e",
    marginBottom: 4,
  },
  googleReminderLabel: {
    color: "#ccc",
    fontSize: 13,
    fontWeight: "600",
  },
  reminderChip: {
    backgroundColor: "#222",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#333",
  },
  reminderChipActive: {
    backgroundColor: "#122a2e",
    borderColor: "#00bcd4",
  },
  reminderChipText: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "600",
  },
  reminderChipTextActive: {
    color: "#00bcd4",
    fontWeight: "bold",
  },
  googleCalendarButton: {
    backgroundColor: "#252525",
    borderWidth: 1,
    borderColor: "#00bcd4",
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  googleCalendarButtonSynced: {
    backgroundColor: "#132615",
    borderColor: "#4caf50",
  },
  googleCalendarButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  modalDesc: {
    color: "#aaa",
    fontSize: 13,
    marginBottom: 15,
    textAlign: "center",
  },
  inputLabel: { color: "#ccc", fontSize: 13, marginBottom: 4, marginTop: 10 },
  input: {
    backgroundColor: "#252525",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#333",
  },
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#252525",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  passwordTextInput: {
    flex: 1,
    padding: 12,
    color: "#fff",
    fontSize: 14,
  },
  eyeIconBtn: {
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  alertBanner: {
    backgroundColor: "rgba(255, 82, 82, 0.15)",
    borderWidth: 1,
    borderColor: "#ff5252",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  alertBannerText: {
    color: "#ff5252",
    fontSize: 13,
    fontWeight: "bold",
    textAlign: "center",
  },
  logoContainerModal: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#2a2a2a",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#00bcd4",
    alignSelf: "center",
  },
  logoImg: { width: 70, height: 70, borderRadius: 35 },
  logoFallback: { fontSize: 28 },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#00bcd4",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  tipText: { color: "#777", fontSize: 11, textAlign: "center", marginTop: 6 },
  pickerButton: {
    backgroundColor: "#252525",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  pickerButtonText: { color: "#fff", fontSize: 14 },
  modalCloseButton: {
    backgroundColor: "#ffffff", // Fondo blanco
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  modalCloseButtonText: {
    color: "#000000", // Letras en negro
    fontWeight: "bold",
    fontSize: 14,
  },
  modalCloseButtonDynamic: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  modalCloseButtonDynamicText: {
    fontWeight: "bold",
    fontSize: 14,
  },
  buttonRowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
  buttonRowContainerFixed: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#2a2a2a",
  },
  modalBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
  },
  modalBtnAction: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
