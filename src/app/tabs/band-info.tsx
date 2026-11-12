import { supabase } from "@/services/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Clipboard,
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
  const router = useRouter();
  const params = useLocalSearchParams();
  const bandId = (params.bandId as string) || "";
  const userId = (params.userId as string) || "";

  const [loading, setLoading] = useState(true);
  const [bandInfo, setBandInfo] = useState<any>(null);
  const [isCreator, setIsCreator] = useState(false);

  // Estados para el Modal de Editar Banda
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editGenre, setEditGenre] = useState("Rock");
  const [editBio, setEditBio] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  // Estado para el Modal de Confirmación de Borrado de Banda
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

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

  // Estado para el mensaje flotante (Toast)
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  useEffect(() => {
    if (!bandId) return;
    loadBandInfo();
  }, [bandId]);

  const loadBandInfo = async () => {
    try {
      setLoading(true);

      const activeUserId =
        userId || (await supabase.auth.getUser()).data.user?.id || null;

      if (!activeUserId) return;

      const { data: bandData, error: bandError } = await supabase
        .from("bands")
        .select("*")
        .eq("id", bandId)
        .single();

      if (bandError) throw bandError;

      if (bandData) {
        setBandInfo(bandData);
        setEditName(bandData.name || "");
        setEditGenre(bandData.genre || "Rock");
        setEditBio(bandData.bio || "");
        setEditLogoUrl(bandData.logo_url || "");

        if (bandData.created_by === activeUserId) {
          setIsCreator(true);
        } else {
          setIsCreator(false);
        }
      }
    } catch (error: any) {
      console.error("Error al cargar la información de la banda:", error);
      showToast("No se pudo cargar la información de la banda.");
    } finally {
      setLoading(false);
    }
  };

  // --- SUBIDA DE LOGOTIPO DE LA BANDA ---
  const handlePickAndUploadLogo = async () => {
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
      const fileName = `band_logo_${bandId}_${Date.now()}.${fileExt}`;

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

      setEditLogoUrl(publicData.publicUrl);
      showToast("Imagen subida. Pulsa 'Guardar' para aplicar.");
    } catch (error: any) {
      console.error("Error al subir imagen:", error);
      showToast("No se pudo subir la imagen.");
    } finally {
      setUploadingImage(false);
    }
  };

  // --- ACTUALIZAR BANDA ---
  const handleUpdateBand = async () => {
    if (!editName.trim()) {
      showToast("El nombre de la banda no puede estar vacío.");
      return;
    }

    try {
      const updates = {
        name: editName.trim(),
        genre: editGenre || "Rock",
        bio: editBio.trim() || null,
        logo_url: editLogoUrl ? editLogoUrl.split("?")[0] : null,
      };

      const { error } = await supabase
        .from("bands")
        .update(updates)
        .eq("id", bandId);

      if (error) throw error;

      showToast("¡Información de la banda actualizada!");
      setIsEditModalVisible(false);
      loadBandInfo();
    } catch (error: any) {
      showToast(error.message || "Error al actualizar la banda.");
    }
  };

  // --- ELIMINAR BANDA Y SUS DATOS ASSOCIADOS ---
  const handleDeleteBand = async () => {
    try {
      await supabase.from("band_members").delete().eq("band_id", bandId);
      await supabase.from("songs").delete().eq("band_id", bandId);

      const { error } = await supabase.from("bands").delete().eq("id", bandId);

      if (error) throw error;

      setIsDeleteModalVisible(false);
      showToast("Banda eliminada correctamente");

      setTimeout(() => {
        router.replace("/dashboard" as any);
      }, 1500);
    } catch (error: any) {
      console.error("Error al eliminar la banda:", error);
      showToast("No se pudo eliminar la banda.");
    }
  };

  const handleCopyCode = (code: string) => {
    if (!code) return;
    Clipboard.setString(code);
    showToast(`¡Código "${code}" copiado al portapapeles!`);
  };

  // PANTALLA DE CARGA INICIAL SI EL BANDID AÚN NO LLEGÓ DEL LAYOUT
  if (!bandId || loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#00bcd4" />
        <Text style={{ color: "#aaa", marginTop: 10 }}>
          Cargando información de la banda...
        </Text>
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

      <View style={styles.headerContainer}>
        <View style={{ flex: 1 }} />
        {isCreator && (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              style={styles.actionButtonWithText}
              onPress={() => setIsEditModalVisible(true)}
            >
              <Text style={styles.actionButtonText}>Editar</Text>
              <Ionicons name="create-outline" size={18} color="#00bcd4" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButtonWithText,
                { borderColor: "#ff9800", marginLeft: 8 },
              ]}
              onPress={() => setIsDeleteModalVisible(true)}
            >
              <Text style={[styles.actionButtonText, { color: "#ff9800" }]}>
                Borrar
              </Text>
              <Ionicons name="trash-outline" size={18} color="#ff9800" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {bandInfo ? (
        <View style={styles.card}>
          <View style={{ alignItems: "center", marginBottom: 20 }}>
            {bandInfo.logo_url ? (
              <Image
                source={{ uri: bandInfo.logo_url }}
                style={styles.bandLogoLarge}
              />
            ) : (
              <View style={styles.bandLogoPlaceholder}>
                <Ionicons name="radio-outline" size={40} color="#00bcd4" />
              </View>
            )}
          </View>

          <View style={styles.row}>
            <Ionicons
              name="radio-outline"
              size={20}
              color="#00bcd4"
              style={styles.icon}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Nombre de la Banda</Text>
              <Text style={styles.value}>{bandInfo.name}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <Ionicons
              name="disc-outline"
              size={20}
              color="#00bcd4"
              style={styles.icon}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Género Musical</Text>
              <Text style={styles.value}>
                {bandInfo.genre || "No especificado"}
              </Text>
            </View>
          </View>

          {bandInfo.bio ? (
            <View style={styles.row}>
              <Ionicons
                name="document-text-outline"
                size={20}
                color="#00bcd4"
                style={styles.icon}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Biografía</Text>
                <Text style={styles.bioValue}>{bandInfo.bio}</Text>
              </View>
            </View>
          ) : null}

          {isCreator && (
            <TouchableOpacity
              style={styles.codeContainer}
              activeOpacity={0.7}
              onPress={() => handleCopyCode(bandInfo.invite_code)}
            >
              <View style={styles.rowInvite}>
                <Ionicons
                  name="key-outline"
                  size={20}
                  color="#ff9800"
                  style={styles.icon}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.codeLabel}>
                    Código de Invitación (Toca para copiar)
                  </Text>
                  <Text style={styles.codeValue}>
                    {bandInfo.invite_code || "No disponible"}
                  </Text>
                </View>
                <Ionicons name="copy-outline" size={20} color="#ff9800" />
              </View>
              <Text style={styles.codeTip}>
                Pulsa sobre esta tarjeta para copiar el código y compartirlo
                fácilmente.
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <Text style={styles.emptyText}>
          No se encontró información de esta banda.
        </Text>
      )}

      {/* MODAL EDITAR BANDA */}
      <Modal visible={isEditModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ paddingVertical: 20 }}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Editar Banda</Text>

              <View style={{ alignItems: "center", marginBottom: 15 }}>
                <TouchableOpacity
                  style={styles.logoContainerModal}
                  onPress={handlePickAndUploadLogo}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color="#00bcd4" />
                  ) : editLogoUrl ? (
                    <Image
                      source={{ uri: editLogoUrl }}
                      style={styles.logoImg}
                    />
                  ) : (
                    <Ionicons name="radio-outline" size={36} color="#00bcd4" />
                  )}
                  <View style={styles.editBadge}>
                    <Ionicons name="camera" size={16} color="#000" />
                  </View>
                </TouchableOpacity>
                <Text style={styles.tipText}>Toca para cambiar la imagen</Text>
              </View>

              <Text style={styles.inputLabel}>Nombre de la banda *:</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre"
                placeholderTextColor="#666"
                value={editName}
                onChangeText={setEditName}
              />

              <Text style={styles.inputLabel}>Género musical:</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setIsGenrePickerVisible(true)}
              >
                <Text style={styles.pickerButtonText}>Género: {editGenre}</Text>
                <Ionicons name="chevron-down" size={20} color="#00bcd4" />
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Biografía:</Text>
              <TextInput
                style={[styles.input, { height: 90, textAlignVertical: "top" }]}
                placeholder="Biografía de la banda..."
                placeholderTextColor="#666"
                value={editBio}
                onChangeText={setEditBio}
                multiline
              />

              <View style={styles.buttonRowContainer}>
                <TouchableOpacity
                  style={styles.actionBtnSave}
                  onPress={handleUpdateBand}
                >
                  <View style={styles.btnContentWithIcon}>
                    <Ionicons
                      name="save-outline"
                      size={18}
                      color="#000"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.actionBtnTextDark}>Guardar</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtnClose}
                  onPress={() => setIsEditModalVisible(false)}
                >
                  <View style={styles.btnContentWithIcon}>
                    <Ionicons
                      name="arrow-back-outline"
                      size={18}
                      color="#000"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.actionBtnTextDark}>Volver</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* MODAL BORRAR BANDA */}
      <Modal visible={isDeleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { borderColor: "#ff9800" }]}>
            <View style={{ alignItems: "center", marginBottom: 12 }}>
              <Ionicons name="warning-outline" size={42} color="#ff9800" />
            </View>
            <Text style={[styles.modalTitle, { color: "#ff9800" }]}>
              ¿Eliminar Banda?
            </Text>
            <Text style={styles.deleteWarningText}>
              Estás a punto de borrar la banda{" "}
              <Text style={{ fontWeight: "bold", color: "#fff" }}>
                {bandInfo?.name}
              </Text>
              . Esta acción eliminará permanentemente todas sus canciones,
              miembros y datos asociados del sistema.
            </Text>

            <View style={styles.buttonRowContainer}>
              <TouchableOpacity
                style={styles.actionBtnDelete}
                onPress={handleDeleteBand}
              >
                <View style={styles.btnContentWithIcon}>
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color="#000"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.actionBtnTextDark}>Borrar</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtnCloseWhite}
                onPress={() => setIsDeleteModalVisible(false)}
              >
                <View style={styles.btnContentWithIcon}>
                  <Ionicons
                    name="arrow-back-outline"
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

      {/* MODAL GÉNERO */}
      <Modal visible={isGenrePickerVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "55%" }]}>
            <Text style={styles.modalTitle}>Seleccionar Género Musical</Text>
            <Text style={[styles.inputLabel, { marginBottom: 12 }]}>
              Elige un género:
            </Text>

            <ScrollView contentContainerStyle={styles.keysGrid}>
              {musicGenres.map((g) => {
                const isSelected = editGenre === g;
                return (
                  <TouchableOpacity
                    key={`picker-genre-${g}`}
                    style={[
                      styles.genreChip,
                      isSelected && styles.keyChipSelected,
                    ]}
                    onPress={() => {
                      setEditGenre(g);
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
  toastText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10,
  },
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
  card: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 18,
    borderWidth: 1.5,
    borderColor: "#333",
  },
  bandLogoLarge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: "#00bcd4",
  },
  bandLogoPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#121212",
    borderWidth: 2,
    borderColor: "#00bcd4",
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
    paddingBottom: 12,
  },
  rowInvite: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  icon: { marginRight: 14 },
  label: {
    color: "#888",
    fontSize: 12,
    marginBottom: 2,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  value: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  bioValue: {
    color: "#ccc",
    fontSize: 14,
    fontStyle: "italic",
    lineHeight: 20,
  },
  codeContainer: {
    backgroundColor: "#1a150c",
    borderWidth: 1.5,
    borderColor: "#ff9800",
    borderRadius: 10,
    padding: 14,
    marginTop: 6,
  },
  codeLabel: {
    color: "#ff9800",
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  codeValue: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: 1.5,
    marginTop: 2,
  },
  codeTip: { color: "#aaa", fontSize: 12, fontStyle: "italic", marginTop: 6 },
  emptyText: {
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 30,
    fontSize: 15,
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
    marginBottom: 14,
    textAlign: "center",
  },
  deleteWarningText: {
    color: "#ccc",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  inputLabel: { color: "#aaa", fontSize: 12, marginBottom: 4 },
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
  pickerButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
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
  keyChipSelected: { backgroundColor: "#00bcd4", borderColor: "#00bcd4" },
  keyChipText: { color: "#aaa", fontWeight: "bold", fontSize: 15 },
  keyChipTextSelected: { color: "#000" },
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
  logoImg: { width: "100%", height: "100%", resizeMode: "cover" },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#00bcd4",
    padding: 6,
    borderTopLeftRadius: 10,
  },
  tipText: { color: "#aaa", fontSize: 12, marginTop: 6 },
  buttonRowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
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
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  actionBtnDelete: {
    flex: 1,
    backgroundColor: "#ff9800",
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  actionBtnClose: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  actionBtnCloseWhite: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  actionBtnTextDark: { color: "#000", fontWeight: "bold", fontSize: 14 },
});
