import { supabase } from "@/services/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import JSZip from "jszip";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
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

  const [loading, setLoading] = useState(true);
  const [bandSongs, setBandSongs] = useState<any[]>([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [isExportModalVisible, setIsExportModalVisible] = useState(false);
  const [selectedExportSongIds, setSelectedExportSongIds] = useState<string[]>(
    [],
  );
  const [isExporting, setIsExporting] = useState(false);

  const [isKeyPickerVisible, setIsKeyPickerVisible] = useState(false);
  const [activeKeyTarget, setActiveKeyTarget] = useState<"new" | "edit">("new");

  const [isGenrePickerVisible, setIsGenrePickerVisible] = useState(false);
  const [activeGenreTarget, setActiveGenreTarget] = useState<"new" | "edit">(
    "new",
  );

  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [songToDeleteId, setSongToDeleteId] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

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

  const musicGenres = [
    "Blues",
    "Pop",
    "Rock",
    "Heavy",
    "Electrónica",
    "Fusión",
    "Flamenco",
  ];

  const isValidDurationFormat = (dur: string) => {
    if (!dur.trim()) return true;
    const regex = /^([0-5]?\d):([0-5]\d)$/;
    return regex.test(dur.trim());
  };

  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newGenre, setNewGenre] = useState("Rock");
  const [newKey, setNewKey] = useState("C");
  const [newTempo, setNewTempo] = useState("");
  const [newDuration, setNewDuration] = useState("");
  const [newLyrics, setNewLyrics] = useState("");
  const [newPdfFile, setNewPdfFile] = useState<any>(null);

  const [selectedSong, setSelectedSong] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [editGenre, setEditGenre] = useState("Rock");
  const [editKey, setEditKey] = useState("C");
  const [editTempo, setEditTempo] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editLyrics, setEditLyrics] = useState("");
  const [editPdfFile, setEditPdfFile] = useState<any>(null);
  const [editExistingPdfUrl, setEditExistingPdfUrl] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!bandId) return;
    loadRepertoire();
  }, [bandId]);

  const loadRepertoire = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("songs")
        .select("*")
        .eq("band_id", bandId);

      if (error) throw error;
      if (data) {
        const sortedRepertory = data.sort((a, b) => {
          const titleA = (a.title || "").toLowerCase();
          const titleB = (b.title || "").toLowerCase();
          return titleA.localeCompare(titleB);
        });
        setBandSongs(sortedRepertory);
      }
    } catch (error) {
      console.error("Error cargando repertorio:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenExportModal = () => {
    if (bandSongs.length === 0) {
      showToast("No hay canciones para exportar.");
      return;
    }
    setSelectedExportSongIds(bandSongs.map((s) => s.id));
    setIsExportModalVisible(true);
  };

  const toggleExportSongSelection = (id: string) => {
    if (selectedExportSongIds.includes(id)) {
      setSelectedExportSongIds(
        selectedExportSongIds.filter((sId) => sId !== id),
      );
    } else {
      setSelectedExportSongIds([...selectedExportSongIds, id]);
    }
  };

  const handleExecuteExport = async () => {
    if (selectedExportSongIds.length === 0) {
      showToast("Selecciona al menos una canción para exportar.");
      return;
    }

    setIsExporting(true);
    try {
      const zip = new JSZip();
      const songsToExport = bandSongs.filter((s) =>
        selectedExportSongIds.includes(s.id),
      );
      const exportedSongsData = [];

      for (const song of songsToExport) {
        let pdfBase64 = null;
        if (song.pdf_url) {
          try {
            const pdfResp = await fetch(song.pdf_url);
            const pdfBlob = await pdfResp.blob();
            pdfBase64 = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(pdfBlob);
            });
          } catch (e) {
            console.error(
              "No se pudo adjuntar el PDF de la canción:",
              song.title,
            );
          }
        }

        exportedSongsData.push({
          title: song.title,
          author: song.author,
          genre: song.genre,
          key: song.key,
          tempo: song.tempo,
          duration: song.duration,
          lyrics: song.lyrics,
          pdfBase64: pdfBase64,
        });
      }

      zip.file(
        "repertorio_banda.json",
        JSON.stringify(exportedSongsData, null, 2),
      );

      const content = await zip.generateAsync({ type: "base64" });
      const zipPath = `${FileSystem.documentDirectory}repertorio_banda_${Date.now()}.zip`;
      await FileSystem.writeAsStringAsync(zipPath, content, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(zipPath, {
          mimeType: "application/zip",
          dialogTitle: "Exportar repertorio de banda",
          UTI: "public.zip-archive",
        });
      } else {
        showToast("La compartición no está disponible en este dispositivo.");
      }

      setIsExportModalVisible(false);
      showToast("¡Repertorio exportado en .zip con éxito!");
    } catch (error) {
      console.error(error);
      showToast("Error al generar el archivo .zip.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportZip = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/zip", "application/x-zip-compressed", "*/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      setUploading(true);

      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const base64Data: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const resultStr = reader.result as string;
          const base64Clean = resultStr.includes(",")
            ? resultStr.split(",")[1]
            : resultStr;
          resolve(base64Clean);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(base64Data, { base64: true });

      const jsonFile = loadedZip.file("repertorio_banda.json");
      if (!jsonFile) {
        showToast(
          "El archivo .zip no contiene el formato válido de Bandalica.",
        );
        setUploading(false);
        return;
      }

      const jsonContent = await jsonFile.async("string");
      const importedSongs = JSON.parse(jsonContent);

      if (!Array.isArray(importedSongs)) {
        showToast("El contenido del repertorio no es válido.");
        setUploading(false);
        return;
      }

      let addedCount = 0;

      for (const item of importedSongs) {
        let finalPdfUrl = null;

        if (item.pdfBase64) {
          try {
            const base64CleanPdf =
              item.pdfBase64.split(",")[1] || item.pdfBase64;
            const fileName = `pdf_import_${Date.now()}_${Math.random()
              .toString(36)
              .substring(2, 7)}.pdf`;
            const filePath = `pdf_lyrics/${fileName}`;

            const byteCharacters = atob(base64CleanPdf);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);

            const { error: uploadError } = await supabase.storage
              .from("songs")
              .upload(filePath, byteArray, {
                contentType: "application/pdf",
                upsert: true,
              });

            if (!uploadError) {
              const { data: publicData } = supabase.storage
                .from("songs")
                .getPublicUrl(filePath);
              finalPdfUrl = publicData.publicUrl;
            }
          } catch (e) {
            console.error("Error al subir PDF importado:", e);
          }
        }

        const songPayload: any = {
          title: item.title || "Canción sin título",
          author: item.author || null,
          genre: item.genre || "Rock",
          key: item.key || "C",
          tempo: item.tempo || null,
          duration: item.duration || null,
          lyrics: item.lyrics || null,
          pdf_url: finalPdfUrl,
          band_id: bandId,
          created_by: userId || null,
        };

        const { error: insertError } = await supabase
          .from("songs")
          .insert([songPayload]);

        if (!insertError) {
          addedCount++;
        }
      }

      loadRepertoire();
      showToast(`¡Se han importado ${addedCount} canciones correctamente!`);
    } catch (error) {
      console.error(error);
      showToast("No se pudo procesar el archivo .zip.");
    } finally {
      setUploading(false);
    }
  };

  const pickPdf = async (target: "new" | "edit") => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (target === "new") {
          setNewPdfFile(result.assets[0]);
        } else {
          setEditPdfFile(result.assets[0]);
        }
        showToast("PDF adjuntado con éxito");
      }
    } catch (error) {
      showToast("No se pudo seleccionar el archivo PDF.");
    }
  };

  const handleOpenPdf = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        showToast("No se puede abrir este archivo PDF.");
      }
    } catch (error) {
      showToast("Ocurrió un error al intentar abrir el PDF.");
    }
  };

  const uploadPdfToStorage = async (pdfAsset: any) => {
    const response = await fetch(pdfAsset.uri);
    const blob = await response.blob();
    const fileExt = pdfAsset.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `pdf_lyrics/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("songs")
      .upload(filePath, blob, {
        contentType: "application/pdf",
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from("songs")
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  const handleCreateAndAddSong = async () => {
    if (!newTitle.trim()) {
      showToast("Introduce el título de la canción.");
      return;
    }

    if (!isValidDurationFormat(newDuration)) {
      showToast("Formato de duración incorrecto (ej: 03:45).");
      return;
    }

    setUploading(true);
    try {
      let pdfUrl = null;
      if (newPdfFile) {
        pdfUrl = await uploadPdfToStorage(newPdfFile);
      }

      const currentUserId =
        userId || (await supabase.auth.getUser()).data.user?.id || null;

      const songPayload: any = {
        title: newTitle.trim(),
        author: newAuthor.trim() || null,
        genre: newGenre || "Rock",
        key: newKey || "C",
        tempo: newTempo.trim() || null,
        duration: newDuration.trim() || null,
        lyrics: newLyrics.trim() || null,
        pdf_url: pdfUrl,
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
      setNewAuthor("");
      setNewGenre("Rock");
      setNewKey("C");
      setNewTempo("");
      setNewDuration("");
      setNewLyrics("");
      setNewPdfFile(null);
      setIsAddModalVisible(false);
      loadRepertoire();

      showToast("Canción añadida correctamente");
    } catch (error: any) {
      showToast("No se pudo registrar la canción.");
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateSong = async () => {
    if (!selectedSong || !editTitle.trim()) {
      showToast("El título de la canción no puede estar vacío.");
      return;
    }

    if (!isValidDurationFormat(editDuration)) {
      showToast("Formato de duración incorrecto (ej: 03:45).");
      return;
    }

    setUploading(true);
    try {
      let pdfUrl = editExistingPdfUrl;
      if (editPdfFile) {
        pdfUrl = await uploadPdfToStorage(editPdfFile);
      }

      const { error } = await supabase
        .from("songs")
        .update({
          title: editTitle.trim(),
          author: editAuthor.trim() || null,
          genre: editGenre || "Rock",
          key: editKey || "C",
          tempo: editTempo.trim() || null,
          duration: editDuration.trim() || null,
          lyrics: editLyrics.trim() || null,
          pdf_url: pdfUrl,
        })
        .eq("id", selectedSong.id);

      if (error) throw error;

      setIsEditModalVisible(false);
      loadRepertoire();

      showToast("Cambios actualizados correctamente");
    } catch (error: any) {
      showToast("No se pudo actualizar la canción.");
    } finally {
      setUploading(false);
    }
  };

  const promptDeleteSong = (songId: string) => {
    setSongToDeleteId(songId);
    setIsDeleteModalVisible(true);
  };

  const confirmDeleteSong = async () => {
    if (!songToDeleteId) return;

    try {
      const { error } = await supabase
        .from("songs")
        .delete()
        .eq("id", songToDeleteId);

      if (!error) {
        setBandSongs((prev) => prev.filter((s) => s.id !== songToDeleteId));
        setIsEditModalVisible(false);
        setIsDeleteModalVisible(false);
        setSongToDeleteId(null);
        showToast("Canción eliminada");
      } else {
        showToast("No se pudo eliminar la canción.");
      }
    } catch (error) {
      showToast("Error al eliminar la canción.");
    }
  };

  const openEditModal = (song: any) => {
    setSelectedSong(song);
    setEditTitle(song.title || "");
    setEditAuthor(song.author || "");
    setEditGenre(song.genre || "Rock");
    setEditKey(song.key || "C");
    setEditTempo(song.tempo || "");
    setEditDuration(song.duration || "");
    setEditLyrics(song.lyrics || "");
    setEditExistingPdfUrl(song.pdf_url || null);
    setEditPdfFile(null);
    setIsEditModalVisible(true);
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
          Cargando repertorio...
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

      {/* CABECERA CON EL TÍTULO Y EL NÚMERO DE CANCIONES */}
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 15 }}
      >
        <Ionicons
          name="musical-notes-outline"
          size={26}
          color="#00bcd4"
          style={{ marginRight: 8 }}
        />
        <Text style={styles.headerTitle}>
          Repertorio de la Banda ({bandSongs.length})
        </Text>
      </View>

      <View style={styles.importExportRow}>
        <TouchableOpacity
          style={styles.importExportButton}
          onPress={handleImportZip}
          disabled={uploading}
        >
          <Ionicons
            name="cloud-upload-outline"
            size={18}
            color="#00bcd4"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.importExportButtonText}>
            {uploading ? "Importando..." : "Importar .zip"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.importExportButton}
          onPress={handleOpenExportModal}
        >
          <Ionicons
            name="cloud-download-outline"
            size={18}
            color="#00bcd4"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.importExportButtonText}>Exportar .zip</Text>
        </TouchableOpacity>
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
                alignItems: "flex-start",
              }}
            >
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.songTitle}>{song.title}</Text>
                {song.author ? (
                  <Text style={styles.songAuthor}>{song.author}</Text>
                ) : null}
                {song.duration ? (
                  <Text style={styles.songDurationCard}>
                    ⏱️ Duración: {song.duration}
                  </Text>
                ) : null}

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 4,
                    gap: 8,
                  }}
                >
                  {song.pdf_url && (
                    <TouchableOpacity
                      style={styles.pdfBadgeButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleOpenPdf(song.pdf_url);
                      }}
                    >
                      <Ionicons
                        name="document-text"
                        size={16}
                        color="#00bcd4"
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.pdfBadgeText}>Consultar PDF</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.notesBadgeButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      openEditModal(song);
                    }}
                  >
                    <Ionicons
                      name="reader-outline"
                      size={16}
                      color="#00bcd4"
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.notesBadgeText}>Notas</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ alignItems: "flex-end" }}>
                <View style={styles.rightActionGrid}>
                  <View style={styles.rightColumnItem}>
                    <TouchableOpacity
                      style={styles.iconButtonAction}
                      onPress={(e) => {
                        e.stopPropagation();
                        openEditModal(song);
                      }}
                    >
                      <Ionicons
                        name="create-outline"
                        size={22}
                        color="#00bcd4"
                      />
                    </TouchableOpacity>
                    <Text style={styles.songMetaColumn}>
                      {getKeyLabel(song.key)}
                    </Text>
                  </View>

                  <View style={styles.rightColumnItem}>
                    <TouchableOpacity
                      style={styles.iconButtonAction}
                      onPress={(e) => {
                        e.stopPropagation();
                        promptDeleteSong(song.id);
                      }}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={22}
                        color="#ff9800"
                      />
                    </TouchableOpacity>
                    <Text style={styles.songMetaColumn}>
                      {song.tempo ? song.tempo : ""}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}

      {/* MODAL EXPORTAR */}
      <Modal visible={isExportModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "75%" }]}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Ionicons
                name="cloud-download-outline"
                size={24}
                color="#00bcd4"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.modalTitle}>
                Seleccionar Canciones a Exportar
              </Text>
            </View>

            <Text style={styles.exportSubtitle}>
              Marca los temas que formarán parte del archivo .zip:
            </Text>

            <ScrollView style={styles.modalScrollList}>
              {bandSongs.map((song) => {
                const isSelected = selectedExportSongIds.includes(song.id);
                return (
                  <TouchableOpacity
                    key={`export-song-${song.id}`}
                    style={styles.modalSongItem}
                    onPress={() => toggleExportSongSelection(song.id)}
                  >
                    <Text style={styles.modalSongTitle} numberOfLines={1}>
                      {song.title}
                    </Text>
                    <View
                      style={[
                        styles.roundRadioCheck,
                        isSelected && styles.roundRadioCheckActive,
                      ]}
                    >
                      {isSelected && (
                        <View style={styles.roundRadioCheckInner} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.buttonRowContainer}>
              <TouchableOpacity
                style={styles.actionBtnSave}
                onPress={handleExecuteExport}
                disabled={isExporting}
              >
                <Text style={styles.actionBtnTextDark}>
                  {isExporting ? "Generando ZIP..." : "Generar y Exportar .zip"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtnCancel}
                onPress={() => setIsExportModalVisible(false)}
              >
                <Text style={styles.actionBtnTextDark}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL AÑADIR */}
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
              <TextInput
                style={styles.input}
                placeholder="Título *"
                placeholderTextColor="#666"
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <TextInput
                style={styles.input}
                placeholder="Autor / Intérprete (opcional)"
                placeholderTextColor="#666"
                value={newAuthor}
                onChangeText={setNewAuthor}
              />

              <View style={styles.rowTripleContainer}>
                <View style={styles.rowTripleItem}>
                  <Text style={styles.labelSmall}>Género:</Text>
                  <TouchableOpacity
                    style={styles.pickerButtonCompact}
                    onPress={() => {
                      setActiveGenreTarget("new");
                      setIsGenrePickerVisible(true);
                    }}
                  >
                    <Text
                      style={styles.pickerButtonTextCompact}
                      numberOfLines={1}
                    >
                      {newGenre}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#00bcd4" />
                  </TouchableOpacity>
                </View>

                <View style={styles.rowTripleItem}>
                  <Text style={styles.labelSmall}>Tonalidad:</Text>
                  <TouchableOpacity
                    style={styles.pickerButtonCompact}
                    onPress={() => {
                      setActiveKeyTarget("new");
                      setIsKeyPickerVisible(true);
                    }}
                  >
                    <Text
                      style={styles.pickerButtonTextCompact}
                      numberOfLines={1}
                    >
                      {getKeyLabel(newKey)}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#00bcd4" />
                  </TouchableOpacity>
                </View>

                <View style={styles.rowTripleItem}>
                  <Text style={styles.labelSmall}>Tempo:</Text>
                  <TextInput
                    style={styles.inputCompact}
                    placeholder="BPM"
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                    maxLength={3}
                    value={newTempo}
                    onChangeText={setNewTempo}
                  />
                </View>
              </View>

              <View style={{ marginTop: 4, marginBottom: 8 }}>
                <Text style={styles.labelSmall}>Duración (MM:SS):</Text>
                <TextInput
                  style={[styles.input, { marginBottom: 0 }]}
                  placeholder="Ej: 03:45"
                  placeholderTextColor="#666"
                  maxLength={5}
                  value={newDuration}
                  onChangeText={setNewDuration}
                />
              </View>

              <Text style={[styles.label, { marginTop: 8 }]}>
                Letra / Notas (Texto):
              </Text>
              <TextInput
                style={[styles.input, { height: 90, textAlignVertical: "top" }]}
                placeholder="Letra de la canción en texto (opcional)"
                placeholderTextColor="#666"
                multiline
                value={newLyrics}
                onChangeText={setNewLyrics}
              />

              <Text style={styles.label}>Archivo PDF (Partitura / Letra):</Text>
              <TouchableOpacity
                style={styles.pdfPickerButton}
                onPress={() => pickPdf("new")}
              >
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color="#00bcd4"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.pdfPickerText} numberOfLines={1}>
                  {newPdfFile ? newPdfFile.name : "📂 Adjuntar archivo PDF"}
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.buttonRowContainer}>
              <TouchableOpacity
                style={styles.actionBtnSave}
                onPress={handleCreateAndAddSong}
                disabled={uploading}
              >
                <View style={styles.btnContentWithIcon}>
                  <Ionicons
                    name="save-outline"
                    size={18}
                    color="#000"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.actionBtnTextDark}>
                    {uploading ? "Subiendo..." : "Guardar"}
                  </Text>
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

      {/* MODAL EDITAR */}
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

              <Text style={styles.label}>Autor / Intérprete:</Text>
              <TextInput
                style={styles.input}
                placeholder="Autor o Intérprete"
                placeholderTextColor="#666"
                value={editAuthor}
                onChangeText={setEditAuthor}
              />

              <View style={styles.rowTripleContainer}>
                <View style={styles.rowTripleItem}>
                  <Text style={styles.labelSmall}>Género:</Text>
                  <TouchableOpacity
                    style={styles.pickerButtonCompact}
                    onPress={() => {
                      setActiveGenreTarget("edit");
                      setIsGenrePickerVisible(true);
                    }}
                  >
                    <Text
                      style={styles.pickerButtonTextCompact}
                      numberOfLines={1}
                    >
                      {editGenre}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#00bcd4" />
                  </TouchableOpacity>
                </View>

                <View style={styles.rowTripleItem}>
                  <Text style={styles.labelSmall}>Tonalidad:</Text>
                  <TouchableOpacity
                    style={styles.pickerButtonCompact}
                    onPress={() => {
                      setActiveKeyTarget("edit");
                      setIsKeyPickerVisible(true);
                    }}
                  >
                    <Text
                      style={styles.pickerButtonTextCompact}
                      numberOfLines={1}
                    >
                      {getKeyLabel(editKey)}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#00bcd4" />
                  </TouchableOpacity>
                </View>

                <View style={styles.rowTripleItem}>
                  <Text style={styles.labelSmall}>Tempo:</Text>
                  <TextInput
                    style={styles.inputCompact}
                    placeholder="BPM"
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                    maxLength={3}
                    value={editTempo}
                    onChangeText={setEditTempo}
                  />
                </View>
              </View>

              <View style={{ marginTop: 4, marginBottom: 8 }}>
                <Text style={styles.labelSmall}>Duración (MM:SS):</Text>
                <TextInput
                  style={[styles.input, { marginBottom: 0 }]}
                  placeholder="Ej: 03:45"
                  placeholderTextColor="#666"
                  maxLength={5}
                  value={editDuration}
                  onChangeText={setEditDuration}
                />
              </View>

              <Text style={[styles.label, { marginTop: 8 }]}>
                Letra / Notas (Texto):
              </Text>
              <TextInput
                style={[styles.input, { height: 90, textAlignVertical: "top" }]}
                placeholder="Letra o notas registradas"
                placeholderTextColor="#666"
                multiline
                value={editLyrics}
                onChangeText={setEditLyrics}
              />

              {editExistingPdfUrl && !editPdfFile && (
                <TouchableOpacity
                  style={styles.consultPdfButton}
                  onPress={() => handleOpenPdf(editExistingPdfUrl)}
                >
                  <Ionicons
                    name="eye-outline"
                    size={18}
                    color="#000"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.consultPdfButtonText}>
                    Consultar PDF Actual
                  </Text>
                </TouchableOpacity>
              )}

              <Text style={styles.label}>Cambiar o Adjuntar Archivo PDF:</Text>
              <TouchableOpacity
                style={styles.pdfPickerButton}
                onPress={() => pickPdf("edit")}
              >
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color="#00bcd4"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.pdfPickerText} numberOfLines={1}>
                  {editPdfFile
                    ? editPdfFile.name
                    : editExistingPdfUrl
                      ? "📄 PDF actual guardado (Toca para reemplazar)"
                      : "📂 Adjuntar archivo PDF"}
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.buttonRowContainer}>
              <TouchableOpacity
                style={styles.actionBtnSave}
                onPress={handleUpdateSong}
                disabled={uploading}
              >
                <View style={styles.btnContentWithIcon}>
                  <Ionicons
                    name="save-outline"
                    size={18}
                    color="#000"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.actionBtnTextDark}>
                    {uploading ? "Guardando..." : "Guardar"}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtnDelete}
                onPress={() =>
                  selectedSong && promptDeleteSong(selectedSong.id)
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

      {/* MODAL GÉNERO */}
      <Modal visible={isGenrePickerVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "55%" }]}>
            <Text style={styles.modalTitle}>Seleccionar Género Musical</Text>
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

      {/* MODAL TONALIDAD */}
      <Modal visible={isKeyPickerVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: 16 }]}>
            <Text style={styles.modalTitle}>Seleccionar Tonalidad</Text>
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

      {/* MODAL BORRAR CANCIÓN */}
      <Modal visible={isDeleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { maxHeight: "30%", borderColor: "#ff9800" },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <Ionicons
                name="warning-outline"
                size={26}
                color="#ff9800"
                style={{ marginRight: 8 }}
              />
              <Text
                style={[
                  styles.modalTitle,
                  { color: "#ff9800", marginBottom: 0 },
                ]}
              >
                Eliminar Canción
              </Text>
            </View>

            <Text style={{ color: "#fff", fontSize: 16, marginBottom: 20 }}>
              ¿Deseas borrar esta canción del repertorio definitivamente?
            </Text>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <TouchableOpacity
                style={[
                  styles.modalCloseButtonWhiteStyle,
                  { flex: 1, marginTop: 0 },
                ]}
                onPress={() => setIsDeleteModalVisible(false)}
              >
                <Text style={styles.modalCloseButtonWhiteStyleText}>
                  Volver
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalCloseButtonDanger,
                  { flex: 1, marginTop: 0, backgroundColor: "#ff9800" },
                ]}
                onPress={confirmDeleteSong}
              >
                <Text style={[styles.modalCloseButtonText, { color: "#000" }]}>
                  Borrar
                </Text>
              </TouchableOpacity>
            </View>
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
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  importExportRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  importExportButton: {
    flex: 1,
    backgroundColor: "#1e1e1e",
    borderWidth: 1,
    borderColor: "#00bcd4",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  importExportButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14,
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
    marginBottom: 2,
  },
  songAuthor: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  songDurationCard: {
    color: "#00bcd4",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  rightActionGrid: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
  rightColumnItem: { alignItems: "center", minWidth: 32 },
  songMetaColumn: {
    color: "#aaa",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },
  pdfBadgeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#00bcd4",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  pdfBadgeText: { color: "#00bcd4", fontSize: 13, fontWeight: "bold" },
  notesBadgeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#00bcd4",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  notesBadgeText: { color: "#00bcd4", fontSize: 13, fontWeight: "bold" },
  consultPdfButton: {
    backgroundColor: "#00bcd4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  consultPdfButtonText: { color: "#000", fontWeight: "bold", fontSize: 14 },
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
  exportSubtitle: { color: "#aaa", fontSize: 14, marginBottom: 10 },
  modalScrollList: { maxHeight: 280, marginBottom: 12 },
  modalSongItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#121212",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  modalSongTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
    flex: 1,
    marginRight: 10,
  },
  roundRadioCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#00bcd4",
    justifyContent: "center",
    alignItems: "center",
  },
  roundRadioCheckActive: { borderColor: "#00bcd4" },
  roundRadioCheckInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#00bcd4",
  },
  modalTitle: { fontSize: 21, fontWeight: "bold", color: "#00bcd4" },
  label: { fontSize: 16, color: "#aaa", marginBottom: 6, marginTop: 6 },
  labelSmall: { fontSize: 13, color: "#aaa", marginBottom: 4, marginTop: 4 },
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
  inputCompact: {
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    color: "#fff",
    fontSize: 15,
    textAlign: "center",
    height: 44,
  },
  rowTripleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  rowTripleItem: { flex: 1 },
  pickerButtonCompact: {
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pickerButtonTextCompact: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  pdfPickerButton: {
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  pdfPickerText: { color: "#00bcd4", fontSize: 15, flex: 1 },
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
  keyChipTextCompact: { color: "#aaa", fontWeight: "bold", fontSize: 15 },
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
  keyChipSelected: { backgroundColor: "#00bcd4", borderColor: "#00bcd4" },
  keyChipText: { color: "#aaa", fontWeight: "bold", fontSize: 18 },
  keyChipTextSelected: { color: "#000" },
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
  actionBtnCancel: {
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
  actionBtnTextDark: { color: "#000", fontWeight: "bold", fontSize: 14 },
  iconButtonAction: { padding: 4 },
  modalCloseButtonDanger: {
    backgroundColor: "#ff9800",
    padding: 14,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  modalCloseButtonText: { color: "#000", fontWeight: "bold", fontSize: 15 },
  modalCloseButtonWhiteStyle: {
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  modalCloseButtonWhiteStyleText: {
    color: "#000000",
    fontWeight: "bold",
    fontSize: 15,
  },
});
