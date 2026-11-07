import { supabase } from "@/services/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function RepertoireScreen() {
  const params = useLocalSearchParams();
  const bandId = (params.bandId as string) || "";
  const userId = (params.userId as string) || "";

  const [bandSongs, setBandSongs] = useState<any[]>([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  // Estados para controlar los selectores flotantes de tonalidad y género
  const [isKeyPickerVisible, setIsKeyPickerVisible] = useState(false);
  const [activeKeyTarget, setActiveKeyTarget] = useState<"new" | "edit">("new");

  const [isGenrePickerVisible, setIsGenrePickerVisible] = useState(false);
  const [activeGenreTarget, setActiveGenreTarget] = useState<"new" | "edit">(
    "new",
  );

  // Estado para el mensaje flotante (Toast) elegante en lugar de alertas blancas
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Mapeo de notas en inglés a español para mostrar y guardar
  const musicalKeysMap = [
    { label: "Do", value: "C" },
    { label: "Do#", value: "C#" },
    { label: "Re", value: "D" },
    { label: "Re#", value: "D#" },
    { label: "Mi", value: "E" },
    { label: "Fa", value: "F" },
    { label: "Fa#", value: "F#" },
    { label: "Sol", value: "G" },
    { label: "Sol#", value: "G#" },
    { label: "La", value: "A" },
    { label: "La#", value: "A#" },
    { label: "Si", value: "B" },
  ];

  const getKeyLabel = (val: string) => {
    const found = musicalKeysMap.find((k) => k.value === val);
    return found ? found.label : val || "Do";
  };

  // Lista de géneros preestablecidos con Flamenco incluido
  const musicGenres = [
    "Blues",
    "Pop",
    "Rock",
    "Heavy",
    "Electrónica",
    "Fusión",
    "Flamenco",
  ];

  // Estados del formulario de creación
  const [newTitle, setNewTitle] = useState("");
  const [newGenre, setNewGenre] = useState("Rock");
  const [newKey, setNewKey] = useState("C");
  const [newTempo, setNewTempo] = useState("");
  const [newLyrics, setNewLyrics] = useState("");

  // Estados del formulario de edición / detalle de canción seleccionada
  const [selectedSong, setSelectedSong] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editGenre, setEditGenre] = useState("Rock");
  const [editKey, setEditKey] = useState("C");
  const [editTempo, setEditTempo] = useState("");
  const [editLyrics, setEditLyrics] = useState("");

  useEffect(() => {
    if (bandId) {
      loadRepertoire();
    }
  }, [bandId]);

  const loadRepertoire = async () => {
    try {
      const { data, error } = await supabase
        .from("songs")
        .select("*")
        .eq("band_id", bandId);

      if (error) throw error;
      if (data) {
        setBandSongs(data);
      }
    } catch (error) {
      console.error("Error cargando repertorio:", error);
    }
  };

  const handleCreateAndAddSong = async () => {
    if (!newTitle.trim()) {
      Alert.alert("Campo obligatorio", "Introduce el título de la canción.");
      return;
    }

    if (!bandId) {
      Alert.alert("Error", "No se ha detectado el ID de la banda.");
      return;
    }

    try {
      const currentUserId =
        userId || (await supabase.auth.getUser()).data.user?.id || null;

      const songPayload: any = {
        title: newTitle.trim(),
        genre: newGenre || "Rock",
        key: newKey || "C",
        tempo: newTempo.trim() || null,
        lyrics: newLyrics.trim() || null,
        band_id: bandId,
      };

      if (currentUserId) {
        songPayload.created_by = currentUserId;
      }

      const { error: createError } = await supabase
        .from("songs")
        .insert([songPayload]);

      if (createError) throw createError;

      setNewTitle("");
      setNewGenre("Rock");
      setNewKey("C");
      setNewTempo("");
      setNewLyrics("");
      setIsAddModalVisible(false);
      loadRepertoire();

      showToast("Canción añadida correctamente");
    } catch (error: any) {
      Alert.alert("Error al registrar", error.message);
    }
  };

  const handleUpdateSong = async () => {
    if (!selectedSong || !editTitle.trim()) {
      Alert.alert(
        "Campo obligatorio",
        "El título de la canción no puede estar vacío.",
      );
      return;
    }

    try {
      const { error } = await supabase
        .from("songs")
        .update({
          title: editTitle.trim(),
          genre: editGenre || "Rock",
          key: editKey || "C",
          tempo: editTempo.trim() || null,
          lyrics: editLyrics.trim() || null,
        })
        .eq("id", selectedSong.id);

      if (error) throw error;

      setIsEditModalVisible(false);
      loadRepertoire();

      showToast("Cambios actualizados correctamente");
    } catch (error: any) {
      Alert.alert("Error", "No se pudo actualizar la canción.");
    }
  };

  const handleDeleteSong = async (songId: string) => {
    Alert.alert(
      "Eliminar canción",
      "¿Deseas borrar esta canción del repertorio?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Borrar",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("songs")
              .delete()
              .eq("id", songId);
            if (!error) {
              setBandSongs((prev) => prev.filter((s) => s.id !== songId));
              setIsEditModalVisible(false);
              showToast("Canción eliminada");
            } else {
              Alert.alert("Error", "No se pudo eliminar la canción.");
            }
          },
        },
      ],
    );
  };

  const openEditModal = (song: any) => {
    setSelectedSong(song);
    setEditTitle(song.title || "");
    setEditGenre(song.genre || "Rock");
    setEditKey(song.key || "C");
    setEditTempo(song.tempo || "");
    setEditLyrics(song.lyrics || "");
    setIsEditModalVisible(true);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* AVISO FLOTANTE (TOAST) ESTILO OSCURO */}
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

      {/* TÍTULO PRINCIPAL */}
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 15 }}
      >
        <Ionicons
          name="musical-notes-outline"
          size={26}
          color="#00bcd4"
          style={{ marginRight: 8 }}
        />
        <Text style={styles.headerTitle}>Repertorio de la Banda</Text>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => setIsAddModalVisible(true)}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name="add-circle-outline"
            size={24}
            color="#000"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.primaryButtonText}>Añadir / Crear Canción</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.subHeader}>Canciones Activas</Text>
      {bandSongs.length === 0 ? (
        <Text style={styles.emptyText}>
          No hay canciones en el repertorio de esta banda todavía.
        </Text>
      ) : (
        bandSongs.map((song) => (
          <TouchableOpacity
            key={song.id}
            style={styles.songCard}
            onPress={() => openEditModal(song)}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.songTitle}>{song.title}</Text>
                <Text style={styles.songMeta}>
                  Tonalidad: {getKeyLabel(song.key)} | Tempo:{" "}
                  {song.tempo || "N/D"}
                </Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="create-outline"
                  size={24}
                  color="#00bcd4"
                  style={{ marginRight: 14 }}
                />
                <TouchableOpacity
                  style={styles.iconButtonAction}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeleteSong(song.id);
                  }}
                >
                  <Ionicons name="trash-outline" size={24} color="#ff9800" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}

      {/* MODAL PARA CREAR CANCIONES */}
      <Modal visible={isAddModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <Ionicons
                name="musical-note-outline"
                size={26}
                color="#00bcd4"
                style={{ marginRight: 10 }}
              />
              <Text style={styles.modalTitle}>Añadir Tema al Repertorio</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>
                Crear tema nuevo para esta banda:
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Título *"
                placeholderTextColor="#666"
                value={newTitle}
                onChangeText={setNewTitle}
              />

              {/* BOTÓN DESPLEGABLE PARA GÉNERO (CREACIÓN) */}
              <Text style={styles.label}>Género:</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => {
                  setActiveGenreTarget("new");
                  setIsGenrePickerVisible(true);
                }}
              >
                <Text style={styles.pickerButtonText}>Género: {newGenre}</Text>
                <Ionicons name="chevron-down" size={20} color="#00bcd4" />
              </TouchableOpacity>

              {/* BOTÓN DESPLEGABLE PARA TONALIDAD (CREACIÓN) */}
              <Text style={styles.label}>Tonalidad:</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => {
                  setActiveKeyTarget("new");
                  setIsKeyPickerVisible(true);
                }}
              >
                <Text style={styles.pickerButtonText}>
                  Nota seleccionada: {getKeyLabel(newKey)}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#00bcd4" />
              </TouchableOpacity>

              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                placeholder="Tempo (Ej: 120 BPM)"
                placeholderTextColor="#666"
                value={newTempo}
                onChangeText={setNewTempo}
              />
              <TextInput
                style={[
                  styles.input,
                  { height: 110, textAlignVertical: "top" },
                ]}
                placeholder="Letra de la canción (opcional)"
                placeholderTextColor="#666"
                multiline
                value={newLyrics}
                onChangeText={setNewLyrics}
              />
            </ScrollView>

            {/* BOTONERA INFERIOR (AÑADIR TEMA): GUARDAR (TURQUESA) Y CANCELAR (NARANJA) */}
            <View style={styles.buttonRowContainer}>
              <TouchableOpacity
                style={styles.actionBtnSave}
                onPress={handleCreateAndAddSong}
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
                style={styles.actionBtnCancel}
                onPress={() => setIsAddModalVisible(false)}
              >
                <View style={styles.btnContentWithIcon}>
                  <Ionicons
                    name="close-circle-outline"
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

      {/* MODAL PARA EDITAR Y VER DETALLES DE LA CANCIÓN */}
      <Modal visible={isEditModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <Ionicons
                name="create-outline"
                size={26}
                color="#00bcd4"
                style={{ marginRight: 10 }}
              />
              <Text style={styles.modalTitle}>Editar Canción</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Título:</Text>
              <TextInput
                style={styles.input}
                placeholder="Título"
                placeholderTextColor="#666"
                value={editTitle}
                onChangeText={setEditTitle}
              />

              {/* BOTÓN DESPLEGABLE PARA GÉNERO (EDICIÓN) */}
              <Text style={styles.label}>Género:</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => {
                  setActiveGenreTarget("edit");
                  setIsGenrePickerVisible(true);
                }}
              >
                <Text style={styles.pickerButtonText}>Género: {editGenre}</Text>
                <Ionicons name="chevron-down" size={20} color="#00bcd4" />
              </TouchableOpacity>

              {/* BOTÓN DESPLEGABLE PARA TONALIDAD (EDICIÓN) */}
              <Text style={styles.label}>Tonalidad:</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => {
                  setActiveKeyTarget("edit");
                  setIsKeyPickerVisible(true);
                }}
              >
                <Text style={styles.pickerButtonText}>
                  Nota seleccionada: {getKeyLabel(editKey)}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#00bcd4" />
              </TouchableOpacity>

              <Text style={[styles.label, { marginTop: 8 }]}>Tempo:</Text>
              <TextInput
                style={styles.input}
                placeholder="Tempo"
                placeholderTextColor="#666"
                value={editTempo}
                onChangeText={setEditTempo}
              />
              <Text style={styles.label}>Letra / Notas:</Text>
              <TextInput
                style={[
                  styles.input,
                  { height: 150, textAlignVertical: "top" },
                ]}
                placeholder="Letra o notas registradas"
                placeholderTextColor="#666"
                multiline
                value={editLyrics}
                onChangeText={setEditLyrics}
              />
            </ScrollView>

            {/* BOTONERA INFERIOR (EDITAR): GUARDAR (TURQUESA), ELIMINAR (NARANJA), VOLVER (BLANCO) */}
            <View style={styles.buttonRowContainer}>
              <TouchableOpacity
                style={styles.actionBtnSave}
                onPress={handleUpdateSong}
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
                style={styles.actionBtnDelete}
                onPress={() =>
                  selectedSong && handleDeleteSong(selectedSong.id)
                }
              >
                <View style={styles.btnContentWithIcon}>
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color="#000"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.actionBtnTextDark}>Eliminar</Text>
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
        </View>
      </Modal>

      {/* VENTANA FLOTANTE (SUB-MODAL) PARA SELECCIONAR EL GÉNERO */}
      <Modal visible={isGenrePickerVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "55%" }]}>
            <Text style={styles.modalTitle}>Seleccionar Género Musical</Text>
            <Text style={[styles.label, { marginBottom: 12, color: "#aaa" }]}>
              Elige un género:
            </Text>

            <ScrollView contentContainerStyle={styles.keysGrid}>
              {musicGenres.map((g) => {
                const currentSelected =
                  activeGenreTarget === "new" ? newGenre : editGenre;
                const isSelected = currentSelected === g;
                return (
                  <TouchableOpacity
                    key={`picker-genre-${g}`}
                    style={[
                      styles.genreChip,
                      isSelected && styles.keyChipSelected,
                    ]}
                    onPress={() => {
                      if (activeGenreTarget === "new") {
                        setNewGenre(g);
                      } else {
                        setEditGenre(g);
                      }
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

      {/* VENTANA FLOTANTE (SUB-MODAL) PARA SELECCIONAR LA TONALIDAD EN ESPAÑOL */}
      <Modal visible={isKeyPickerVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: 16 }]}>
            <Text style={styles.modalTitle}>Seleccionar Tonalidad</Text>
            <Text style={[styles.label, { marginBottom: 8, color: "#aaa" }]}>
              Elige una nota musical:
            </Text>

            <View style={styles.keysGridCompact}>
              {musicalKeysMap.map((item) => {
                const currentSelected =
                  activeKeyTarget === "new" ? newKey : editKey;
                const isSelected = currentSelected === item.value;
                return (
                  <TouchableOpacity
                    key={`picker-key-${item.value}`}
                    style={[
                      styles.keyChipCompact,
                      isSelected && styles.keyChipSelected,
                    ]}
                    onPress={() => {
                      if (activeKeyTarget === "new") {
                        setNewKey(item.value);
                      } else {
                        setEditKey(item.value);
                      }
                      setIsKeyPickerVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.keyChipTextCompact,
                        isSelected && styles.keyChipTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.smallBackButton}
              onPress={() => setIsKeyPickerVisible(false)}
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
  toastText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
  },
  primaryButton: {
    backgroundColor: "#00bcd4",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15,
  },
  primaryButtonText: { color: "#000", fontWeight: "bold", fontSize: 16 },
  subHeader: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
    marginTop: 10,
  },
  emptyText: { color: "#666", fontStyle: "italic", fontSize: 16 },
  songCard: {
    backgroundColor: "#1e1e1e",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#00bcd4",
  },
  songTitle: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 6,
  },
  songMeta: { color: "#aaa", fontSize: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 20,
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: "#00bcd4",
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: "bold",
    color: "#00bcd4",
  },
  label: { fontSize: 16, color: "#aaa", marginBottom: 6, marginTop: 6 },
  input: {
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    fontSize: 16,
    marginBottom: 10,
  },
  pickerButton: {
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  pickerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  keysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  keysGridCompact: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 6,
  },
  keyChipCompact: {
    width: "22%",
    backgroundColor: "#121212",
    paddingVertical: 10,
    marginBottom: 8,
    alignItems: "center",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#333",
  },
  keyChipTextCompact: {
    color: "#aaa",
    fontWeight: "bold",
    fontSize: 15,
  },
  genreChip: {
    width: "48%",
    backgroundColor: "#121212",
    paddingVertical: 14,
    marginBottom: 10,
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
    fontSize: 18,
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
    marginTop: 8,
  },
  smallBackButtonText: { color: "#000", fontWeight: "bold", fontSize: 14 },
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
    backgroundColor: "#00bcd4", // Turquesa
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  actionBtnDelete: {
    flex: 1,
    backgroundColor: "#ff9800", // Naranja
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  actionBtnCancel: {
    flex: 1,
    backgroundColor: "#ff9800", // Naranja para cancelar en añadir
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  actionBtnClose: {
    flex: 1,
    backgroundColor: "#ffffff", // Blanco
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  actionBtnTextDark: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 14,
  },
  iconButtonAction: {
    padding: 4,
  },
});
