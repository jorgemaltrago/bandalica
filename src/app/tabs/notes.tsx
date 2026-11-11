import { supabase } from "@/services/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function BandNotesScreen() {
  const params = useLocalSearchParams();
  const bandId = (params.bandId as string) || "";
  const userId = (params.userId as string) || "";

  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estados para el modal de crear nota
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Mensaje flotante (Toast)
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  useEffect(() => {
    if (bandId) {
      fetchNotes();
    }
  }, [bandId]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("band_notes")
        .select(
          `
          id,
          title,
          content,
          created_at,
          user_id,
          profiles (full_name)
        `,
        )
        .eq("band_id", bandId)
        .order("created_at", { ascending: false }); // Las más recientes primero

      if (error) throw error;
      setNotes(data || []);
    } catch (error: any) {
      console.error("Error al cargar notas:", error.message);
      showToast("No se pudieron cargar las notas.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreateNote = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      showToast("Rellena el título y el contenido de la nota.");
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase.from("band_notes").insert([
        {
          band_id: bandId,
          user_id: userId,
          title: newTitle.trim(),
          content: newContent.trim(),
        },
      ]);

      if (error) throw error;

      showToast("¡Nota registrada con éxito!");
      setNewTitle("");
      setNewContent("");
      setIsModalVisible(false);
      fetchNotes();
    } catch (error: any) {
      console.error("Error al crear nota:", error.message);
      showToast("Error al guardar la nota.");
    } finally {
      setSubmitting(false);
    }
  };

  // Función para eliminar nota con confirmación
  const handleDeleteNote = (noteId: string, noteTitle: string) => {
    Alert.alert(
      "Eliminar nota",
      `¿Estás seguro de que quieres eliminar la nota "${noteTitle}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("band_notes")
                .delete()
                .eq("id", noteId);

              if (error) throw error;

              showToast("Nota eliminada correctamente.");
              fetchNotes();
            } catch (error: any) {
              console.error("Error al eliminar nota:", error.message);
              showToast("No se pudo eliminar la nota.");
            }
          },
        },
      ],
    );
  };

  // Formateador de fecha y hora legible
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <View style={styles.container}>
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

      {/* CABECERA Y BOTÓN NUEVA NOTA */}
      <View style={styles.headerRow}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons
            name="document-text-outline"
            size={22}
            color="#00bcd4"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.headerTitle}>Notas de la Banda</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsModalVisible(true)}
        >
          <Ionicons
            name="add"
            size={20}
            color="#000"
            style={{ marginRight: 4 }}
          />
          <Text style={styles.addButtonText}>Nueva Nota</Text>
        </TouchableOpacity>
      </View>

      {/* LISTA DE NOTAS */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#00bcd4" />
        </View>
      ) : notes.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="clipboard-outline" size={48} color="#444" />
          <Text style={styles.emptyText}>
            No hay anotaciones todavía. ¡Crea la primera!
          </Text>
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchNotes();
          }}
          renderItem={({ item }) => (
            <View style={styles.noteCard}>
              <View style={styles.noteHeader}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.noteTitle}>{item.title}</Text>
                  <Text style={styles.noteDate}>
                    {formatDateTime(item.created_at)}
                  </Text>
                </View>

                {/* BOTÓN DE ELIMINAR */}
                <TouchableOpacity
                  style={styles.deleteIconButton}
                  onPress={() => handleDeleteNote(item.id, item.title)}
                >
                  <Ionicons name="trash-outline" size={18} color="#ff5252" />
                </TouchableOpacity>
              </View>

              <Text style={styles.noteContent}>{item.content}</Text>

              <View style={styles.noteFooter}>
                <Ionicons
                  name="person-circle-outline"
                  size={16}
                  color="#00bcd4"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.noteAuthor}>
                  Escrito por:{" "}
                  {item.profiles?.full_name || "Miembro de la banda"}
                </Text>
              </View>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      {/* MODAL PARA CREAR NUEVA NOTA */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nueva Anotación</Text>
            <Text style={styles.modalDesc}>
              La fecha y hora se registrarán automáticamente.
            </Text>

            <Text style={styles.inputLabel}>Título de la nota *:</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Acuerdos de ensayo, ideas de letras..."
              placeholderTextColor="#666"
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <Text style={styles.inputLabel}>Contenido *:</Text>
            <TextInput
              style={[styles.input, { height: 120, textAlignVertical: "top" }]}
              placeholder="Escribe los detalles aquí..."
              placeholderTextColor="#666"
              value={newContent}
              onChangeText={setNewContent}
              multiline
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor: "#333",
                    borderWidth: 1,
                    borderColor: "#555",
                  },
                ]}
                onPress={() => setIsModalVisible(false)}
                disabled={submitting}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#00bcd4" }]}
                onPress={handleCreateNote}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={{ color: "#000", fontWeight: "bold" }}>
                    Guardar
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212", padding: 16 },
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  addButton: {
    backgroundColor: "#00bcd4",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addButtonText: { color: "#000", fontWeight: "bold", fontSize: 13 },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#777",
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
  },
  noteCard: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  noteTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 2,
  },
  noteDate: { color: "#888", fontSize: 11 },
  deleteIconButton: {
    backgroundColor: "#252525",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  noteContent: {
    color: "#ccc",
    fontSize: 14,
    marginBottom: 10,
    lineHeight: 20,
  },
  noteFooter: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#2a2a2a",
    paddingTop: 8,
  },
  noteAuthor: { color: "#00bcd4", fontSize: 12, fontWeight: "500" },
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
    borderColor: "#00bcd4",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
    textAlign: "center",
  },
  modalDesc: {
    color: "#888",
    fontSize: 12,
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
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
  },
});
