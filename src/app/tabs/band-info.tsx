import { supabase } from "@/services/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
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

export default function BandInfoScreen() {
  const params = useLocalSearchParams();
  const bandId = (params.bandId as string) || "";

  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Datos de la banda desde Supabase
  const [name, setName] = useState("");
  const [genre, setGenre] = useState("");
  const [bio, setBio] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  // Estado para el Modal de Edición
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  // Estados temporales para el formulario del modal
  const [tempName, setTempName] = useState("");
  const [tempGenre, setTempGenre] = useState("");
  const [tempBio, setTempBio] = useState("");

  // Estado para el mensaje flotante (Toast)
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  useEffect(() => {
    if (bandId) {
      fetchBandDetailsFromDB();
    }
  }, [bandId]);

  const fetchBandDetailsFromDB = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("bands")
        .select("name, genre, bio, invite_code, logo_url")
        .eq("id", bandId)
        .single();

      if (error) throw error;

      if (data) {
        setName(data.name || "");
        setGenre(data.genre || "");
        setBio(data.bio || "");
        setInviteCode(data.invite_code || "");
        setLogoUrl(data.logo_url ? `${data.logo_url}?t=${Date.now()}` : "");

        setTempName(data.name || "");
        setTempGenre(data.genre || "");
        setTempBio(data.bio || "");
      }
    } catch (e) {
      console.error("Error al obtener los detalles de la banda:", e);
      showToast("No se pudieron cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  // Subida robusta usando FileSystem Legacy
  const handlePickAndUploadImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showToast("Se necesitan permisos para acceder a la galería");
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
      const fileName = `band_${bandId}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Leer la imagen en formato Base64 usando el módulo legacy
      const base64Data = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convertir Base64 a ArrayBuffer/Uint8Array para Supabase
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      const { error: uploadError } = await supabase.storage
        .from("band-logos")
        .upload(filePath, byteArray, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) {
        console.error("Error en Supabase Storage:", uploadError);
        throw uploadError;
      }

      const { data: publicData } = supabase.storage
        .from("band-logos")
        .getPublicUrl(filePath);

      const newLogoUrl = publicData.publicUrl;

      // Actualizar la URL en la base de datos
      const { error: updateError } = await supabase
        .from("bands")
        .update({ logo_url: newLogoUrl })
        .eq("id", bandId);

      if (updateError) throw updateError;

      setLogoUrl(`${newLogoUrl}?t=${Date.now()}`);
      showToast("¡Logotipo actualizado con éxito!");
    } catch (error: any) {
      console.error("Error completo en la subida:", error);
      showToast("Error al subir la imagen. Revisa la consola.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!tempName.trim()) {
      showToast("El nombre de la banda no puede estar vacío");
      return;
    }

    try {
      const { error } = await supabase
        .from("bands")
        .update({
          name: tempName.trim(),
          genre: tempGenre.trim(),
          bio: tempBio.trim(),
        })
        .eq("id", bandId);

      if (error) throw error;

      setName(tempName.trim());
      setGenre(tempGenre.trim());
      setBio(tempBio.trim());

      setIsEditModalVisible(false);
      showToast("¡Datos actualizados correctamente!");
    } catch (error) {
      showToast("No se pudieron guardar los cambios");
    }
  };

  const handleCopyInviteCode = async () => {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    showToast("¡Código copiado al portapapeles!");
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#00bcd4" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
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

      {/* MÓDULO 1: RESUMEN DE LA BANDA */}
      <View style={styles.cardHeader}>
        <View style={styles.logoContainer}>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={styles.logoImg} />
          ) : (
            <Text style={styles.logoFallback}>🎸</Text>
          )}
        </View>

        <Text style={styles.bandTitle}>{name}</Text>
        <Text style={styles.bandGenre}>
          Estilo / Género: {genre || "No especificado"}
        </Text>

        {bio ? (
          <View style={styles.bioPreviewContainer}>
            <Text style={styles.bioPreviewText} numberOfLines={3}>
              {bio}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.editButtonOrange}
          onPress={() => {
            setTempName(name);
            setTempGenre(genre);
            setTempBio(bio);
            setIsEditModalVisible(true);
          }}
        >
          <Ionicons
            name="create-outline"
            size={18}
            color="#000"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.editButtonText}>
            Editar Información y Biografía
          </Text>
        </TouchableOpacity>
      </View>

      {/* MÓDULO 2: CÓDIGO DE INVITACIÓN */}
      <View style={styles.cardInvite}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <Ionicons
            name="key-outline"
            size={22}
            color="#00bcd4"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.sectionTitleTurquoise}>Código de Invitación</Text>
        </View>

        <TouchableOpacity
          style={styles.codeTouchable}
          onPress={handleCopyInviteCode}
        >
          <Text style={styles.codeText}>{inviteCode || "No disponible"}</Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 4,
            }}
          >
            <Ionicons
              name="copy-outline"
              size={16}
              color="#00bcd4"
              style={{ marginRight: 4 }}
            />
            <Text style={{ color: "#00bcd4", fontSize: 13, fontWeight: "600" }}>
              Toca para copiar
            </Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.codeHint}>
          Comparte este código con otros músicos para que puedan unirse a la
          formación.
        </Text>
      </View>

      {/* MODAL DE EDICIÓN */}
      <Modal visible={isEditModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Ionicons
                name="create-outline"
                size={24}
                color="#ff9800"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.modalTitle}>Editar Datos de la Banda</Text>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              <View style={{ alignItems: "center", marginBottom: 14 }}>
                <TouchableOpacity
                  style={styles.logoContainerModal}
                  onPress={handlePickAndUploadImage}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color="#00bcd4" />
                  ) : logoUrl ? (
                    <Image source={{ uri: logoUrl }} style={styles.logoImg} />
                  ) : (
                    <Text style={styles.logoFallback}>🎸</Text>
                  )}
                  <View style={styles.editBadge}>
                    <Ionicons name="camera" size={14} color="#000" />
                  </View>
                </TouchableOpacity>
                <Text style={styles.tipText}>
                  Toca para cambiar el logotipo
                </Text>
              </View>

              <Text style={styles.label}>Nombre de la banda:</Text>
              <TextInput
                style={styles.input}
                value={tempName}
                onChangeText={setTempName}
                placeholder="Nombre"
                placeholderTextColor="#666"
              />

              <Text style={styles.label}>Género musical:</Text>
              <TextInput
                style={styles.input}
                value={tempGenre}
                onChangeText={setTempGenre}
                placeholder="Género"
                placeholderTextColor="#666"
              />

              <Text style={styles.label}>Biografía:</Text>
              <TextInput
                style={[
                  styles.input,
                  { height: 100, textAlignVertical: "top" },
                ]}
                value={tempBio}
                onChangeText={setTempBio}
                placeholder="Escribe la biografía..."
                placeholderTextColor="#666"
                multiline
              />
            </ScrollView>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 14,
              }}
            >
              <TouchableOpacity
                style={[
                  styles.modalCloseButtonOrange,
                  { flex: 1, marginRight: 6, marginTop: 0 },
                ]}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={styles.modalCloseButtonOrangeText}>Volver</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalCloseButtonSave,
                  { flex: 1, marginLeft: 6, marginTop: 0 },
                ]}
                onPress={handleSaveChanges}
              >
                <Text style={styles.modalCloseButtonSaveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#121212",
    padding: 20,
  },
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
    fontSize: 16,
    fontWeight: "bold",
  },
  cardHeader: {
    backgroundColor: "#1e1e1e",
    borderRadius: 14,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "#ff9800",
    marginBottom: 16,
    alignItems: "center",
  },
  cardInvite: {
    backgroundColor: "#1e1e1e",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1.5,
    borderColor: "#00bcd4",
    marginBottom: 16,
    alignItems: "center",
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#121212",
    borderWidth: 2,
    borderColor: "#ff9800",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 12,
  },
  logoContainerModal: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
    fontSize: 34,
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#00bcd4",
    padding: 5,
    borderTopLeftRadius: 8,
  },
  tipText: {
    color: "#aaa",
    fontSize: 12,
    marginTop: 4,
  },
  bandTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 4,
  },
  bandGenre: {
    fontSize: 15,
    color: "#ff9800",
    fontWeight: "600",
    marginBottom: 10,
  },
  bioPreviewContainer: {
    backgroundColor: "#121212",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    width: "100%",
    marginBottom: 14,
  },
  bioPreviewText: {
    color: "#ccc",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  editButtonOrange: {
    backgroundColor: "#ff9800",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 4,
  },
  editButtonText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 14,
  },
  sectionTitleTurquoise: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#00bcd4",
    alignSelf: "flex-start",
  },
  codeTouchable: {
    alignItems: "center",
    marginVertical: 4,
  },
  codeText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    backgroundColor: "#121212",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    overflow: "hidden",
    textAlign: "center",
    letterSpacing: 2,
  },
  codeHint: {
    fontSize: 14,
    color: "#aaa",
    textAlign: "center",
    marginTop: 8,
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
    borderWidth: 1,
    borderColor: "#ff9800",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ff9800",
  },
  label: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 4,
    marginTop: 8,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 10,
    color: "#fff",
    fontSize: 15,
    marginBottom: 8,
  },
  modalCloseButtonOrange: {
    backgroundColor: "#2a2a2a",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  modalCloseButtonOrangeText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  modalCloseButtonSave: {
    backgroundColor: "#ff9800",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  modalCloseButtonSaveText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 14,
  },
});
