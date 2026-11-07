import { supabase } from "@/services/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const ADMIN_EMAIL = "jorgemaltrago@gmail.com";

export default function DashboardScreen() {
  const router = useRouter();
  const [bands, setBands] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Estados para el Panel de Administrador y Gestión de Contraseñas
  const [passwordRequests, setPasswordRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [isManagePasswordModalVisible, setIsManagePasswordModalVisible] =
    useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [defaultPassword, setDefaultPassword] = useState("Banda2026*");
  const [submittingPassword, setSubmittingPassword] = useState(false);

  // Modales de bandas y sus nuevos campos (logo y biografía)
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [newBandName, setNewBandName] = useState("");
  const [newBandGenre, setNewBandGenre] = useState("Rock");
  const [newBandBio, setNewBandBio] = useState("");
  const [newBandLogoUrl, setNewBandLogoUrl] = useState("");
  const [uploadingBandImage, setUploadingBandImage] = useState(false);

  const [isCodeModalVisible, setIsCodeModalVisible] = useState(false);
  const [inviteCode, setInviteCode] = useState("");

  // Selector flotante de género
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

  // Estados para el Modal de Editar Perfil
  const [isEditProfileModalVisible, setIsEditProfileModalVisible] =
    useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editInstrument, setEditInstrument] = useState("");
  const [editVoice, setEditVoice] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  // Estado para el mensaje flotante (Toast)
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  useEffect(() => {
    loadUserDataAndBands();
  }, []);

  const loadUserDataAndBands = async () => {
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

      if (user.email === ADMIN_EMAIL) {
        fetchPasswordRequests();
      }

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
      }
    } catch (error: any) {
      console.error("Error al cargar el dashboard:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- SUBIDA DE AVATAR DE USUARIO ---
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

  // --- SUBIDA DE LOGOTIPO DE LA BANDA ---
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

  const fetchPasswordRequests = async () => {
    setLoadingRequests(true);
    try {
      const { data, error } = await supabase
        .from("password_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPasswordRequests(data || []);
    } catch (error: any) {
      console.error("Error al cargar peticiones:", error.message);
    } finally {
      setLoadingRequests(false);
    }
  };

  // Abrir modal de gestión de contraseña para un usuario
  const handleOpenManagePassword = (req: any) => {
    setSelectedRequest(req);
    setDefaultPassword("Banda2026*");
    setIsManagePasswordModalVisible(true);
  };

  // Asignar contraseña temporal mediante la función RPC con payload JSON (incluyendo ID y correo)
  const handleAssignDefaultPassword = async () => {
    if (!defaultPassword || defaultPassword.length < 6) {
      showToast("La contraseña temporal debe tener al menos 6 caracteres.");
      return;
    }

    try {
      setSubmittingPassword(true);

      const { error: rpcError } = await supabase.rpc(
        "admin_update_user_password",
        {
          payload: {
            target_user_id: selectedRequest?.user_id || null,
            target_email: selectedRequest?.email || null,
            new_password: defaultPassword,
          },
        },
      );

      if (rpcError) throw rpcError;

      const { error: updateError } = await supabase
        .from("password_requests")
        .update({ status: "resolved" })
        .eq("id", selectedRequest.id);

      if (updateError) throw updateError;

      showToast("¡Contraseña temporal asignada con éxito!");
      setIsManagePasswordModalVisible(false);
      fetchPasswordRequests();
    } catch (err: any) {
      console.error("Error al asignar contraseña:", err);
      showToast(err.message || "No se pudo actualizar la contraseña.");
    } finally {
      setSubmittingPassword(false);
    }
  };

  // --- CREAR BANDA INCLUYENDO LOGO Y BIO ---
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
      pathname: "/tabs/band-info",
      params: {
        bandId: bandId,
        userId: currentUser.id,
      },
    });
  };

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

      {/* SECCIÓN: PERFIL DE USUARIO */}
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
            <Text style={styles.welcomeText}>Perfil de Usuario</Text>
          </View>

          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity
              style={styles.profileIconButton}
              onPress={() => setIsEditProfileModalVisible(true)}
            >
              <Ionicons name="create-outline" size={18} color="#00bcd4" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.profileIconButton,
                { marginLeft: 8, borderColor: "#ff5252" },
              ]}
              onPress={handleSignOut}
            >
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

      {/* PANEL DE ADMINISTRADOR */}
      {currentUser?.email === ADMIN_EMAIL && (
        <View style={styles.adminCard}>
          <View style={styles.adminHeaderRow}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name="shield-checkmark-outline"
                size={24}
                color="#ff9800"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.adminCardTitle}>Panel de Administrador</Text>
            </View>
            <TouchableOpacity
              onPress={fetchPasswordRequests}
              style={styles.miniRefreshBtn}
            >
              <Text style={styles.miniRefreshText}>Actualizar</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.adminCardSubtitle}>
            Peticiones de restablecimiento de contraseña:
          </Text>

          {loadingRequests ? (
            <Text style={styles.loadingText}>Cargando peticiones...</Text>
          ) : passwordRequests.length === 0 ? (
            <Text style={styles.emptyAdminText}>
              No hay peticiones pendientes.
            </Text>
          ) : (
            passwordRequests.map((item) => (
              <View key={item.id} style={styles.requestItem}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.requestEmailText}>{item.email}</Text>
                  <Text style={styles.requestDateText}>
                    {new Date(item.created_at).toLocaleString()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.resolveButton}
                  onPress={() => handleOpenManagePassword(item)}
                >
                  <Text style={styles.resolveButtonText}>Gestionar</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      )}

      {/* TÍTULO DE MIS BANDAS */}
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}
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
      {loading ? (
        <Text style={styles.loadingText}>Cargando bandas...</Text>
      ) : bands.length === 0 ? (
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
                    <Ionicons name="musical-notes" size={18} color="#00bcd4" />
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

      {/* MODAL PARA GESTIONAR CONTRASEÑA TEMPORAL (ADMIN) */}
      <Modal
        visible={isManagePasswordModalVisible}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Asignar Contraseña Temporal</Text>
            <Text style={styles.modalDesc}>
              Asigna una contraseña provisional al usuario{" "}
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                {selectedRequest?.email}
              </Text>{" "}
              para que pueda iniciar sesión directamente.
            </Text>

            <Text style={styles.inputLabel}>Nueva contraseña temporal:</Text>
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#666"
              value={defaultPassword}
              onChangeText={setDefaultPassword}
            />

            <View style={styles.buttonRowContainer}>
              <TouchableOpacity
                style={styles.actionBtnSave}
                onPress={handleAssignDefaultPassword}
                disabled={submittingPassword}
              >
                {submittingPassword ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <View style={styles.btnContentWithIcon}>
                    <Ionicons
                      name="checkmark-outline"
                      size={18}
                      color="#000"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.actionBtnTextDark}>
                      Asignar y Enviar
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtnClose}
                onPress={() => setIsManagePasswordModalVisible(false)}
                disabled={submittingPassword}
              >
                <View style={styles.btnContentWithIcon}>
                  <Ionicons
                    name="close-outline"
                    size={18}
                    color="#000"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.actionBtnTextDark}>Cancelar</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL PARA EDITAR PERFIL */}
      <Modal
        visible={isEditProfileModalVisible}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ paddingVertical: 20 }}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Editar Perfil de Usuario</Text>

              <View style={{ alignItems: "center", marginBottom: 15 }}>
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
                style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                placeholder="Cuéntanos algo sobre ti..."
                placeholderTextColor="#666"
                value={editBio}
                onChangeText={setEditBio}
                multiline
              />

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleUpdateProfile}
              >
                <Text style={styles.primaryButtonText}>Guardar Cambios</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setIsEditProfileModalVisible(false)}
              >
                <Text style={styles.modalCloseButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* MODAL PARA CREAR BANDA (CON IMAGEN/LOGO, GÉNERO Y BIOGRAFÍA) */}
      <Modal visible={isCreateModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ paddingVertical: 20 }}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Crear Nueva Banda</Text>

              {/* LOGOTIPO DE LA BANDA */}
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
                <Text style={styles.modalCloseButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* VENTANA FLOTANTE (SUB-MODAL) PARA SELECCIONAR EL GÉNERO */}
      <Modal visible={isGenrePickerVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "55%" }]}>
            <Text style={styles.modalTitle}>Seleccionar Género Musical</Text>
            <Text style={[styles.inputLabel, { marginBottom: 12 }]}>
              Elige un género:
            </Text>

            <ScrollView contentContainerStyle={styles.keysGrid}>
              {musicGenres.map((g) => {
                const isSelected = newBandGenre === g;
                return (
                  <TouchableOpacity
                    key={`picker-genre-${g}`}
                    style={[
                      styles.genreChip,
                      isSelected && styles.keyChipSelected,
                    ]}
                    onPress={() => {
                      setNewBandGenre(g);
                      setIsGenrePickerVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.keyChipText,
                        isSelected && styles.keyChipTextSelected,
                      ]}
                    >
                      {g}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.smallBackButton}
              onPress={() => setIsGenrePickerVisible(false)}
            >
              <Text style={styles.smallBackButtonText}>Volver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL PARA INSERTAR CÓDIGO */}
      <Modal visible={isCodeModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Unirse a Banda por Código</Text>

            <TextInput
              style={styles.input}
              placeholder="Introduce el código de invitación"
              placeholderTextColor="#666"
              value={inviteCode}
              onChangeText={setInviteCode}
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleJoinByCode}
            >
              <Text style={styles.primaryButtonText}>Unirme a la Banda</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setIsCodeModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#121212", padding: 20 },
  toastContainer: {
    backgroundColor: "#1e1e1e",
    borderWidth: 1,
    borderColor: "#00bcd4",
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    alignSelf: "center",
    width: "100%",
  },
  toastText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  userCard: {
    backgroundColor: "#1e1e1e",
    padding: 18,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#fff",
    marginBottom: 16,
    marginTop: 10,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#00bcd4",
    marginRight: 10,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#121212",
    borderWidth: 1.5,
    borderColor: "#00bcd4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  welcomeText: {
    color: "#888",
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  userName: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 2,
  },
  userEmail: {
    color: "#aaa",
    fontSize: 13,
    marginBottom: 10,
  },
  roleContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#121212",
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  userRoleLabel: {
    color: "#888",
    fontSize: 12,
    marginRight: 6,
    fontWeight: "600",
  },
  userRoleValue: {
    color: "#00bcd4",
    fontSize: 13,
    fontWeight: "bold",
  },
  bioContainer: {
    marginTop: 4,
  },
  bioLabel: {
    color: "#888",
    fontSize: 11,
    marginBottom: 2,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  bioText: {
    color: "#ccc",
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 18,
  },
  profileIconButton: {
    backgroundColor: "#121212",
    padding: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#00bcd4",
    alignItems: "center",
    justifyContent: "center",
  },
  adminCard: {
    backgroundColor: "#1a150c",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#ff9800",
    marginBottom: 16,
  },
  adminHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  adminCardTitle: {
    color: "#ff9800",
    fontSize: 16,
    fontWeight: "bold",
  },
  adminCardSubtitle: {
    color: "#aaa",
    fontSize: 12,
    marginBottom: 10,
  },
  miniRefreshBtn: {
    backgroundColor: "#121212",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#ff9800",
  },
  miniRefreshText: {
    color: "#ff9800",
    fontSize: 11,
    fontWeight: "bold",
  },
  requestItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#121212",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  requestEmailText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
  },
  requestDateText: {
    color: "#777",
    fontSize: 11,
    marginTop: 2,
  },
  resolveButton: {
    backgroundColor: "#ff9800",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  resolveButtonText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "bold",
  },
  emptyAdminText: {
    color: "#777",
    fontStyle: "italic",
    fontSize: 13,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  actionButtonsContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: "#00bcd4",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: "#1e1e1e",
    borderWidth: 1.5,
    borderColor: "#00bcd4",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  loadingText: {
    color: "#aaa",
    textAlign: "center",
    marginTop: 20,
  },
  emptyText: {
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 20,
    fontSize: 14,
  },
  bandCard: {
    backgroundColor: "#1e1e1e",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#333",
  },
  bandAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#00bcd4",
    marginRight: 12,
  },
  bandAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#00bcd4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  bandName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  bandGenre: {
    color: "#888",
    fontSize: 12,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 18,
    borderWidth: 1.5,
    borderColor: "#00bcd4",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#00bcd4",
    marginBottom: 12,
    textAlign: "center",
  },
  modalDesc: {
    color: "#aaa",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 18,
  },
  inputLabel: {
    color: "#aaa",
    fontSize: 12,
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 10,
    color: "#fff",
    fontSize: 13,
    marginBottom: 12,
  },
  pickerButton: {
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  pickerButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  modalCloseButton: {
    backgroundColor: "#ffffff",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 8,
  },
  modalCloseButtonText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 14,
  },
  keysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  genreChip: {
    width: "48%",
    backgroundColor: "#121212",
    paddingVertical: 12,
    marginBottom: 8,
    alignItems: "center",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#333",
  },
  keyChipSelected: {
    backgroundColor: "#00bcd4",
    borderColor: "#00bcd4",
  },
  keyChipText: {
    color: "#aaa",
    fontWeight: "bold",
    fontSize: 15,
  },
  keyChipTextSelected: {
    color: "#000",
  },
  smallBackButton: {
    backgroundColor: "#ff9800",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: "center",
    marginTop: 10,
  },
  smallBackButtonText: { color: "#000", fontWeight: "bold", fontSize: 13 },
  logoContainerModal: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#121212",
    borderWidth: 2,
    borderColor: "#00bcd4",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
  },
  logoImg: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  logoFallback: {
    fontSize: 32,
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#00bcd4",
    padding: 6,
    borderTopLeftRadius: 10,
  },
  tipText: {
    color: "#aaa",
    fontSize: 12,
    marginTop: 6,
  },
  buttonRowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    gap: 8,
  },
  btnContentWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnSave: {
    flex: 1,
    backgroundColor: "#00bcd4",
    paddingVertical: 11,
    borderRadius: 6,
    alignItems: "center",
  },
  actionBtnClose: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingVertical: 11,
    borderRadius: 6,
    alignItems: "center",
  },
  actionBtnTextDark: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 14,
  },
});
