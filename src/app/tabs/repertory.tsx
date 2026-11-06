import { supabase } from "@/services/supabase";
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

  // Formulario para los campos de la tabla 'songs'
  const [newTitle, setNewTitle] = useState("");
  const [newGenre, setNewGenre] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newTempo, setNewTempo] = useState("");
  const [newLyrics, setNewLyrics] = useState("");

  useEffect(() => {
    if (bandId) {
      loadRepertoire();
    }
  }, [bandId]);

  // Cargar las canciones filtradas directamente por el band_id de la banda actual
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

  // Crear una canción nueva guardándola directamente en la tabla 'songs' con su band_id
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
        genre: newGenre.trim() || null,
        key: newKey.trim() || null,
        tempo: newTempo.trim() || null,
        lyrics: newLyrics.trim() || null,
        band_id: bandId, // Asignamos directamente la canción a esta banda[cite: 1]
      };

      if (currentUserId) {
        songPayload.created_by = currentUserId; //[cite: 1]
      }

      const { error: createError } = await supabase
        .from("songs")
        .insert([songPayload]);

      if (createError) throw createError;

      Alert.alert(
        "¡Creada!",
        "Canción registrada y añadida al repertorio correctamente.",
      );

      // Limpiar formulario, cerrar modal y recargar lista
      setNewTitle("");
      setNewGenre("");
      setNewKey("");
      setNewTempo("");
      setNewLyrics("");
      setIsAddModalVisible(false);
      loadRepertoire();
    } catch (error: any) {
      Alert.alert("Error al registrar", error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headerTitle}>🎵 Repertorio de la Banda</Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => setIsAddModalVisible(true)}
      >
        <Text style={styles.primaryButtonText}>➕ Añadir / Crear Canción</Text>
      </TouchableOpacity>

      <Text style={styles.subHeader}>Canciones Activas</Text>
      {bandSongs.length === 0 ? (
        <Text style={styles.emptyText}>
          No hay canciones en el repertorio de esta banda todavía.
        </Text>
      ) : (
        bandSongs.map((song) => (
          <View key={song.id} style={styles.songCard}>
            <Text style={styles.songTitle}>{song.title}</Text>
            <Text style={styles.songMeta}>
              Género: {song.genre || "N/D"} | Tonalidad: {song.key || "N/D"} |
              Tempo: {song.tempo || "N/D"}
            </Text>
            {song.lyrics ? (
              <Text style={styles.songLyrics} numberOfLines={2}>
                Letra: {song.lyrics}
              </Text>
            ) : null}
          </View>
        ))
      )}

      {/* MODAL PARA CREAR CANCIONES */}
      <Modal visible={isAddModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Añadir Tema al Repertorio</Text>

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
              <TextInput
                style={styles.input}
                placeholder="Género (Ej: Rock, Metal)"
                placeholderTextColor="#666"
                value={newGenre}
                onChangeText={setNewGenre}
              />
              <TextInput
                style={styles.input}
                placeholder="Tonalidad (Ej: Am, C)"
                placeholderTextColor="#666"
                value={newKey}
                onChangeText={setNewKey}
              />
              <TextInput
                style={styles.input}
                placeholder="Tempo (Ej: 120 BPM)"
                placeholderTextColor="#666"
                value={newTempo}
                onChangeText={setNewTempo}
              />
              <TextInput
                style={[styles.input, { height: 70, textAlignVertical: "top" }]}
                placeholder="Letra de la canción (opcional)"
                placeholderTextColor="#666"
                multiline
                value={newLyrics}
                onChangeText={setNewLyrics}
              />

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleCreateAndAddSong}
              >
                <Text style={styles.primaryButtonText}>
                  💾 Guardar Canción en la Banda
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setIsAddModalVisible(false)}
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
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 15,
  },
  primaryButton: {
    backgroundColor: "#e91e63",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15,
  },
  primaryButtonText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  subHeader: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
    marginTop: 10,
  },
  emptyText: { color: "#666", fontStyle: "italic", fontSize: 13 },
  songCard: {
    backgroundColor: "#1e1e1e",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 8,
  },
  songTitle: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 2,
  },
  songMeta: { color: "#aaa", fontSize: 11 },
  songLyrics: {
    color: "#888",
    fontSize: 11,
    marginTop: 4,
    fontStyle: "italic",
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
    padding: 16,
    maxHeight: "85%",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#e91e63",
    marginBottom: 10,
  },
  label: { fontSize: 11, color: "#aaa", marginBottom: 4 },
  input: {
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 8,
    color: "#fff",
    fontSize: 12,
    marginBottom: 8,
  },
  modalCloseButton: {
    backgroundColor: "#333",
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 10,
  },
  modalCloseButtonText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
});
