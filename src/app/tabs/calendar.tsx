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

export default function CalendarScreen() {
  const params = useLocalSearchParams();
  const bandId = (params.bandId as string) || "";
  const userId = (params.userId as string) || "";

  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const today = new Date();
  const currentDayToday = today.getDate();
  const currentMonthToday = today.getMonth();
  const currentYearToday = today.getFullYear();

  const [selectedDay, setSelectedDay] = useState<number | null>(
    currentDayToday,
  );

  // Estados del formulario de eventos
  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState("Ensayo");
  const [eventTime, setEventTime] = useState("20:00");

  // Listas de datos desde Supabase
  const [bandSongs, setBandSongs] = useState<any[]>([]);
  const [selectedSongs, setSelectedSongs] = useState<string[]>([]); // <--- CORREGIDO AQUÍ
  const [eventsList, setEventsList] = useState<any[]>([]);

  const [isSongModalVisible, setIsSongModalVisible] = useState(false);

  // ESTADOS PARA MODALES INTERACTIVOS DE DETALLE Y EDICIÓN DE ESCALETA
  const [selectedEventDetails, setSelectedEventDetails] = useState<any | null>(
    null,
  );
  const [isEventDetailsModalVisible, setIsEventDetailsModalVisible] =
    useState(false);

  const [selectedSongDetail, setSelectedSongDetail] = useState<any | null>(
    null,
  );
  const [isSongDetailModalVisible, setIsSongDetailModalVisible] =
    useState(false);

  // Modal secundario para añadir canciones a un evento YA existente
  const [isEditSongModalVisible, setIsEditSongModalVisible] = useState(false);

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
  const weekDays = ["L", "M", "X", "J", "V", "S", "D"];
  const fullWeekDays = [
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
    "Domingo",
  ];

  // Carga directa de Supabase al tener el bandId
  useEffect(() => {
    if (bandId) {
      loadCalendarData();
    }
  }, [bandId, month, year]);

  const loadCalendarData = async () => {
    try {
      setLoading(true);

      // 1. Obtener repertorio de la banda directamente de la tabla 'songs'
      const { data: repertoryData, error: repError } = await supabase
        .from("songs")
        .select("id, title, genre, key, tempo, lyrics")
        .eq("band_id", bandId);

      if (!repError && repertoryData) {
        setBandSongs(repertoryData);
      } else if (repError) {
        console.error("Error al cargar canciones:", repError.message);
      }

      // 2. Obtener eventos de la banda y sus canciones asociadas (events -> event_songs -> songs)
      const { data: eventsData, error: eventError } = await supabase
        .from("events")
        .select(
          `
          id,
          name,
          type,
          event_date,
          time,
          event_songs (
            position,
            songs (
              id,
              title,
              genre,
              key,
              tempo,
              lyrics
            )
          )
        `,
        )
        .eq("band_id", bandId);

      if (!eventError && eventsData) {
        const formattedEvents = eventsData.map((ev: any) => {
          const dateObj = new Date(ev.event_date);
          const sortedSongs = ev.event_songs
            ? ev.event_songs
                .sort((a: any, b: any) => a.position - b.position)
                .map((es: any) => es.songs)
            : [];

          return {
            id: ev.id,
            name: ev.name,
            type: ev.type,
            day: dateObj.getDate(),
            month: dateObj.getMonth(),
            year: dateObj.getFullYear(),
            dateString: `${fullWeekDays[(dateObj.getDay() + 6) % 7]}, ${dateObj.getDate()} de ${monthNames[dateObj.getMonth()]} de ${dateObj.getFullYear()}`,
            time: ev.time || "20:00",
            songsCount: sortedSongs.length,
            songsOrderedList: sortedSongs,
          };
        });

        setEventsList(formattedEvents);
      }
    } catch (error) {
      console.error("Error cargando calendario y eventos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEvent = async () => {
    if (!eventName.trim() || selectedDay === null) {
      Alert.alert(
        "Campos incompletos",
        "Selecciona un día en el calendario y pon nombre al evento.",
      );
      return;
    }

    try {
      const formattedMonth = String(month + 1).padStart(2, "0");
      const formattedDayStr = String(selectedDay).padStart(2, "0");
      const dateStringDB = `${year}-${formattedMonth}-${formattedDayStr}`;

      const { data: newEventData, error: eventError } = await supabase
        .from("events")
        .insert([
          {
            band_id: bandId,
            name: eventName.trim(),
            type: eventType,
            event_date: dateStringDB,
            time: eventTime.trim(),
            ...(userId ? { created_by: userId } : {}),
          },
        ])
        .select()
        .single();

      if (eventError) throw eventError;

      if (selectedSongs.length > 0 && newEventData) {
        const eventSongsPayload = selectedSongs.map((songId, index) => ({
          event_id: newEventData.id,
          song_id: songId,
          position: index + 1,
        }));

        const { error: relError } = await supabase
          .from("event_songs")
          .insert(eventSongsPayload);

        if (relError) throw relError;
      }

      Alert.alert("¡Éxito!", "Evento y escaleta guardados correctamente.");
      setEventName("");
      setSelectedSongs([]);
      await loadCalendarData();
    } catch (error: any) {
      Alert.alert("Error", error.message || "No se pudo guardar el evento.");
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    Alert.alert("Eliminar evento", "¿Deseas borrar este evento?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Borrar",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("events")
            .delete()
            .eq("id", eventId);
          if (!error) {
            setEventsList(eventsList.filter((ev) => ev.id !== eventId));
            setIsEventDetailsModalVisible(false);
          } else {
            Alert.alert("Error", "No se pudo eliminar el evento.");
          }
        },
      },
    ]);
  };

  const handleAddSongToExistingEvent = async (songId: string) => {
    if (!selectedEventDetails) return;
    try {
      const nextPosition = selectedEventDetails.songsOrderedList.length + 1;
      const { error } = await supabase.from("event_songs").insert([
        {
          event_id: selectedEventDetails.id,
          song_id: songId,
          position: nextPosition,
        },
      ]);

      if (error) throw error;

      await loadCalendarData();

      const addedSongObj = bandSongs.find((s) => s.id === songId);
      if (addedSongObj) {
        const updatedList = [
          ...selectedEventDetails.songsOrderedList,
          addedSongObj,
        ];
        setSelectedEventDetails({
          ...selectedEventDetails,
          songsOrderedList: updatedList,
          songsCount: updatedList.length,
        });
      }
      setIsEditSongModalVisible(false);
    } catch (error: any) {
      Alert.alert("Error", "No se pudo añadir la canción al evento.");
    }
  };

  const handleRemoveSongFromExistingEvent = async (songId: string) => {
    if (!selectedEventDetails) return;
    try {
      const { error } = await supabase
        .from("event_songs")
        .delete()
        .eq("event_id", selectedEventDetails.id)
        .eq("song_id", songId);

      if (error) throw error;

      await loadCalendarData();

      const updatedList = selectedEventDetails.songsOrderedList.filter(
        (s: any) => s.id !== songId,
      );
      setSelectedEventDetails({
        ...selectedEventDetails,
        songsOrderedList: updatedList,
        songsCount: updatedList.length,
      });
    } catch (error: any) {
      Alert.alert("Error", "No se pudo quitar la canción del evento.");
    }
  };

  const getDaysInMonth = (y: number, m: number) =>
    new Date(y, m + 1, 0).getDate();
  const totalDays = getDaysInMonth(year, month);
  let firstDayIndex = new Date(year, month, 1).getDay();
  firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const daysGridArray = [];
  for (let i = 0; i < firstDayIndex; i++) daysGridArray.push(null);
  for (let i = 1; i <= totalDays; i++) daysGridArray.push(i);

  const getEventsForDay = (day: number) =>
    eventsList.filter(
      (ev) => ev.day === day && ev.month === month && ev.year === year,
    );

  const getDayStyleType = (day: number) => {
    const dayEvs = getEventsForDay(day);
    if (dayEvs.length === 0) return null;
    if (dayEvs.some((ev) => ev.type === "Actuación")) return "Actuación";
    if (dayEvs.some((ev) => ev.type === "Ensayo")) return "Ensayo";
    return "Otro";
  };

  const handleAddSongToEvent = (songId: string) => {
    if (!selectedSongs.includes(songId))
      setSelectedSongs([...selectedSongs, songId]);
    setIsSongModalVisible(false);
  };

  const moveSongUp = (index: number) => {
    if (index === 0) return;
    const arr = [...selectedSongs];
    [arr[index], arr[index - 1]] = [arr[index - 1], arr[index]];
    setSelectedSongs(arr);
  };

  const moveSongDown = (index: number) => {
    if (index === selectedSongs.length - 1) return;
    const arr = [...selectedSongs];
    [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    setSelectedSongs(arr);
  };

  const dayEvents = selectedDay !== null ? getEventsForDay(selectedDay) : [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headerTitle}>📅 Calendario de Eventos</Text>

      {/* CALENDARIO VISUAL */}
      <View style={styles.card}>
        <View style={styles.calendarNavHeader}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => {
              setCurrentDate(new Date(year, month - 1, 1));
              setSelectedDay(1);
            }}
          >
            <Text style={styles.navButtonText}>◀️</Text>
          </TouchableOpacity>
          <Text style={styles.calendarMonthTitle}>
            {monthNames[month]} {year}
          </Text>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => {
              setCurrentDate(new Date(year, month + 1, 1));
              setSelectedDay(1);
            }}
          >
            <Text style={styles.navButtonText}>▶️</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.weekDaysHeaderRow}>
          {weekDays.map((d, i) => (
            <Text key={i} style={styles.weekDayHeaderText}>
              {d}
            </Text>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {daysGridArray.map((day, index) => {
            if (day === null)
              return (
                <View key={`empty-${index}`} style={styles.dayCellEmpty} />
              );
            const isSelected = selectedDay === day;
            const isToday =
              day === currentDayToday &&
              month === currentMonthToday &&
              year === currentYearToday;
            const evType = getDayStyleType(day);

            return (
              <TouchableOpacity
                key={`day-${day}`}
                style={[
                  styles.dayCell,
                  evType === "Ensayo" && styles.cellEnsayo,
                  evType === "Actuación" && styles.cellActuacion,
                  evType === "Otro" && styles.cellOtro,
                  isToday && styles.todayCellHighlight,
                  isSelected && styles.dayCellSelected,
                ]}
                onPress={() => setSelectedDay(day)}
              >
                <Text
                  style={[styles.dayText, isSelected && styles.dayTextSelected]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* FORMULARIO Y LISTADO DEL DÍA SELECCIONADO */}
      {selectedDay !== null && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            📌 Eventos para el {selectedDay} de {monthNames[month]}
          </Text>

          {/* LISTA DE EVENTOS CLICABLES */}
          {dayEvents.map((ev) => (
            <TouchableOpacity
              key={ev.id}
              style={styles.miniEventBadge}
              onPress={() => {
                setSelectedEventDetails(ev);
                setIsEventDetailsModalVisible(true);
              }}
            >
              <View style={styles.eventHeaderRow}>
                <Text style={styles.miniEventName}>
                  🎸 {ev.name} ({ev.type})
                </Text>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeleteEvent(ev.id);
                  }}
                >
                  <Text>🗑️</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.miniEventTime}>
                🕒 {ev.time} | 🎵 {ev.songsCount} canciones (Toca para ver)
              </Text>
            </TouchableOpacity>
          ))}

          <Text style={styles.subSectionTitle}>Añadir Actividad:</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre (Ej: Ensayo General o Concierto Sala X)"
            placeholderTextColor="#666"
            value={eventName}
            onChangeText={setEventName}
          />

          {/* SELECTOR DE TIPO DE EVENTO CON COLORES */}
          <View style={styles.typeSelectorRow}>
            {["Ensayo", "Actuación", "Otro"].map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.typeButton,
                  eventType === t && styles.typeButtonActive,
                ]}
                onPress={() => setEventType(t)}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    eventType === t && styles.typeButtonTextActive,
                  ]}
                >
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ESCALETA / REPERTORIO DEL EVENTO */}
          <View style={styles.repertoireSectionHeader}>
            <Text style={styles.label}>Escaleta / Repertorio del Evento</Text>
            <TouchableOpacity
              style={styles.addSongButton}
              onPress={() => setIsSongModalVisible(true)}
            >
              <Text style={styles.addSongButtonText}>+ Añadir Canción</Text>
            </TouchableOpacity>
          </View>

          {selectedSongs.map((songId, index) => {
            const songObj = bandSongs.find((s) => s.id === songId);
            if (!songObj) return null;
            return (
              <View key={songId} style={styles.reorderRow}>
                <Text style={styles.reorderSongText}>
                  {index + 1}. {songObj.title}
                </Text>
                <View style={styles.rowActionsRight}>
                  <TouchableOpacity onPress={() => moveSongUp(index)}>
                    <Text>⬆️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => moveSongDown(index)}>
                    <Text>⬇️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      setSelectedSongs(
                        selectedSongs.filter((id) => id !== songId),
                      )
                    }
                  >
                    <Text>❌</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSaveEvent}
          >
            <Text style={styles.primaryButtonText}>
              💾 Guardar Evento en Base de Datos
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* MODAL DE SELECCIÓN DE CANCIONES (CREACIÓN NUEVA) */}
      <Modal visible={isSongModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🎵 Repertorio de la Banda</Text>
            <ScrollView style={styles.modalScrollList}>
              {bandSongs.length === 0 ? (
                <Text style={styles.emptyText}>
                  La banda aún no tiene canciones añadidas en su repertorio.
                </Text>
              ) : (
                bandSongs.map((song) => {
                  const added = selectedSongs.includes(song.id);
                  return (
                    <TouchableOpacity
                      key={song.id}
                      style={[
                        styles.modalSongItem,
                        added && styles.modalSongItemDisabled,
                      ]}
                      onPress={() => !added && handleAddSongToEvent(song.id)}
                      disabled={added}
                    >
                      <Text style={styles.modalSongTitle}>
                        {song.title} {added ? "✅" : ""}
                      </Text>
                      <Text style={styles.modalSongMeta}>
                        {song.genre} | {song.key}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setIsSongModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 1: DETALLES DEL EVENTO Y SU ESCALETA EDITABLE */}
      <Modal
        visible={isEventDetailsModalVisible}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              🎸 {selectedEventDetails?.name}
            </Text>
            <Text style={styles.modalSubTitleLarge}>
              🕒 {selectedEventDetails?.time} | 🎵{" "}
              {selectedEventDetails?.songsCount || 0} canciones
            </Text>
            <Text style={styles.modalDateInfo}>
              {selectedEventDetails?.dateString}
            </Text>

            <View style={styles.repertoireSectionHeader}>
              <Text style={styles.subSectionTitle}>Escaleta de Canciones:</Text>
              <TouchableOpacity
                style={styles.addSongButton}
                onPress={() => setIsEditSongModalVisible(true)}
              >
                <Text style={styles.addSongButtonText}>+ Añadir Canción</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollList}>
              {selectedEventDetails?.songsOrderedList?.length === 0 ? (
                <Text style={styles.emptyText}>
                  Este evento no tiene canciones asociadas.
                </Text>
              ) : (
                selectedEventDetails?.songsOrderedList?.map(
                  (song: any, index: number) => (
                    <View key={song.id || index} style={styles.editSongRow}>
                      <TouchableOpacity
                        style={{ flex: 1 }}
                        onPress={() => {
                          setSelectedSongDetail(song);
                          setIsSongDetailModalVisible(true);
                        }}
                      >
                        <Text style={styles.modalSongTitle}>
                          {index + 1}. {song.title}
                        </Text>
                        <Text style={styles.modalSongMetaLarge}>
                          Tono: {song.key || "N/A"} | Género:{" "}
                          {song.genre || "N/A"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.removeSongButton}
                        onPress={() =>
                          handleRemoveSongFromExistingEvent(song.id)
                        }
                      >
                        <Text style={{ fontSize: 16 }}>❌</Text>
                      </TouchableOpacity>
                    </View>
                  ),
                )
              )}
            </ScrollView>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 10,
              }}
            >
              <TouchableOpacity
                style={[
                  styles.modalCloseButton,
                  { backgroundColor: "#c0392b", flex: 1, marginRight: 6 },
                ]}
                onPress={() => handleDeleteEvent(selectedEventDetails?.id)}
              >
                <Text style={styles.modalCloseButtonText}>Eliminar Evento</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalCloseButton, { flex: 1, marginLeft: 6 }]}
                onPress={() => setIsEventDetailsModalVisible(false)}
              >
                <Text style={styles.modalCloseButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL SECUNDARIO: AÑADIR CANCIÓN A EVENTO YA EXISTENTE */}
      <Modal visible={isEditSongModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>➕ Añadir Canción al Evento</Text>
            <ScrollView style={styles.modalScrollList}>
              {bandSongs.length === 0 ? (
                <Text style={styles.emptyText}>
                  No hay canciones en el repertorio de la banda.
                </Text>
              ) : (
                bandSongs.map((song) => {
                  const alreadyInEvent =
                    selectedEventDetails?.songsOrderedList?.some(
                      (s: any) => s.id === song.id,
                    );
                  return (
                    <TouchableOpacity
                      key={song.id}
                      style={[
                        styles.modalSongItem,
                        alreadyInEvent && styles.modalSongItemDisabled,
                      ]}
                      onPress={() =>
                        !alreadyInEvent && handleAddSongToExistingEvent(song.id)
                      }
                      disabled={alreadyInEvent}
                    >
                      <Text style={styles.modalSongTitle}>
                        {song.title} {alreadyInEvent ? "✅ (Ya añadida)" : ""}
                      </Text>
                      <Text style={styles.modalSongMetaLarge}>
                        {song.genre} | {song.key}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setIsEditSongModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Volver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: CARACTERÍSTICAS DE LA CANCIÓN SELECCIONADA */}
      <Modal
        visible={isSongDetailModalVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              🎵 {selectedSongDetail?.title}
            </Text>

            <View style={styles.songDetailContainer}>
              <Text style={styles.songDetailText}>
                ⭐ <Text style={styles.boldText}>Género:</Text>{" "}
                {selectedSongDetail?.genre || "No especificado"}
              </Text>
              <Text style={styles.songDetailText}>
                🎹 <Text style={styles.boldText}>Tono (Key):</Text>{" "}
                {selectedSongDetail?.key || "No especificado"}
              </Text>
              <Text style={styles.songDetailText}>
                ⏱️ <Text style={styles.boldText}>Tempo:</Text>{" "}
                {selectedSongDetail?.tempo
                  ? `${selectedSongDetail.tempo} BPM`
                  : "No especificado"}
              </Text>

              <Text style={[styles.subSectionTitle, { marginTop: 15 }]}>
                Letra / Notas:
              </Text>
              <ScrollView style={styles.lyricsScroll}>
                <Text style={styles.lyricsText}>
                  {selectedSongDetail?.lyrics ||
                    "Sin letra o notas registradas."}
                </Text>
              </ScrollView>
            </View>

            <TouchableOpacity
              style={[styles.modalCloseButton, { marginTop: 15 }]}
              onPress={() => setIsSongDetailModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Volver al Evento</Text>
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
  card: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 6,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 10,
  },
  calendarNavHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  navButton: { backgroundColor: "#2a2a2a", padding: 6, borderRadius: 6 },
  navButtonText: { color: "#fff" },
  calendarMonthTitle: { fontSize: 17, fontWeight: "bold", color: "#fff" },
  weekDaysHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 4,
  },
  weekDayHeaderText: {
    color: "#e91e63",
    fontWeight: "bold",
    width: "14%",
    textAlign: "center",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: -6,
  },
  dayCell: {
    width: "14%",
    aspectRatio: 1.0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121212",
    borderRadius: 6,
    marginVertical: 1,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  dayCellEmpty: { width: "14%", aspectRatio: 1.0 },
  cellEnsayo: { borderColor: "#2ecc71", backgroundColor: "#1b3a2b" },
  cellActuacion: { borderColor: "#3498db", backgroundColor: "#1a334c" },
  cellOtro: { borderColor: "#e67e22", backgroundColor: "#422813" },
  todayCellHighlight: { borderWidth: 2, borderColor: "#fff" },
  dayCellSelected: { backgroundColor: "#e91e63" },
  dayText: { color: "#ccc", fontSize: 13 },
  dayTextSelected: { color: "#fff", fontWeight: "bold" },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#e91e63",
    marginBottom: 10,
  },
  subSectionTitle: {
    fontSize: 14,
    color: "#bbb",
    fontWeight: "bold",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    fontSize: 14,
    marginBottom: 10,
  },
  typeSelectorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  typeButton: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 6,
    marginHorizontal: 2,
  },
  typeButtonActive: { backgroundColor: "#e91e63", borderColor: "#e91e63" },
  typeButtonText: { color: "#aaa", fontSize: 13 },
  typeButtonTextActive: { color: "#fff", fontWeight: "bold" },
  repertoireSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    marginTop: 8,
  },
  addSongButton: {
    backgroundColor: "#e91e63",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addSongButtonText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  reorderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#121212",
    padding: 10,
    borderRadius: 6,
    marginBottom: 6,
  },
  reorderSongText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  rowActionsRight: {
    flexDirection: "row",
    width: 70,
    justifyContent: "space-between",
  },
  primaryButton: {
    backgroundColor: "#e91e63",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  primaryButtonText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
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
    maxHeight: "78%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#e91e63",
    marginBottom: 8,
  },
  modalSubTitleLarge: {
    fontSize: 15,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 4,
  },
  modalDateInfo: {
    fontSize: 13,
    color: "#aaa",
    marginBottom: 10,
  },
  modalScrollList: { marginBottom: 10 },
  modalSongItem: {
    backgroundColor: "#121212",
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  modalSongItemDisabled: { opacity: 0.4 },
  modalSongTitle: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  modalSongMeta: { color: "#aaa", fontSize: 13, marginTop: 3 },
  modalSongMetaLarge: { color: "#bbb", fontSize: 14, marginTop: 3 },
  modalCloseButton: {
    backgroundColor: "#333",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  modalCloseButtonText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  miniEventBadge: {
    backgroundColor: "#121212",
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#e91e63",
  },
  eventHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  miniEventName: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  miniEventTime: {
    color: "#ddd",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  emptyText: {
    color: "#777",
    textAlign: "center",
    fontStyle: "italic",
    padding: 12,
    fontSize: 14,
  },
  label: { fontSize: 14, color: "#ccc", fontWeight: "600" },
  songDetailContainer: {
    marginVertical: 5,
  },
  songDetailText: {
    color: "#ddd",
    fontSize: 15,
    marginBottom: 8,
  },
  boldText: {
    fontWeight: "bold",
    color: "#fff",
  },
  lyricsScroll: {
    backgroundColor: "#121212",
    padding: 12,
    borderRadius: 6,
    maxHeight: 220,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  lyricsText: {
    color: "#ccc",
    fontSize: 14,
    lineHeight: 22,
  },
  editSongRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#121212",
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  removeSongButton: {
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
  },
});
