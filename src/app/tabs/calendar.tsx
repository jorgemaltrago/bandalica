import { supabase } from "@/services/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Linking,
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

  // Estados del formulario de eventos nuevos
  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState("Ensayo");
  const [eventTime, setEventTime] = useState("20:00");

  // Listas de datos desde Supabase
  const [bandSongs, setBandSongs] = useState<any[]>([]);
  const [selectedSongs, setSelectedSongs] = useState<string[]>([]);
  const [eventsList, setEventsList] = useState<any[]>([]);

  const [isSongModalVisible, setIsSongModalVisible] = useState(false);

  // ESTADOS PARA MODALES INTERACTIVOS DE DETALLE Y EDICIÓN
  const [selectedEventDetails, setSelectedEventDetails] = useState<any | null>(
    null,
  );
  const [isEventDetailsModalVisible, setIsEventDetailsModalVisible] =
    useState(false);
  const [editingEventTime, setEditingEventTime] = useState("20:00");

  const [selectedSongDetail, setSelectedSongDetail] = useState<any | null>(
    null,
  );
  const [isSongDetailModalVisible, setIsSongDetailModalVisible] =
    useState(false);

  // Modal secundario para añadir canciones a un evento YA existente
  const [isEditSongModalVisible, setIsEditSongModalVisible] = useState(false);

  // ESTADOS PARA EL MODAL DE CONFIRMACIÓN DE BORRADO DE EVENTO
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [eventToDeleteId, setEventToDeleteId] = useState<string | null>(null);

  // Estado para el mensaje flotante (Toast) elegante
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

  const isValidTimeFormat = (timeStr: string) => {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return timeRegex.test(timeStr.trim());
  };

  useEffect(() => {
    if (bandId) {
      loadCalendarData();
    }
  }, [bandId, month, year]);

  const loadCalendarData = async () => {
    try {
      setLoading(true);

      const { data: repertoryData, error: repError } = await supabase
        .from("songs")
        .select("id, title, genre, key, tempo, lyrics, pdf_url")
        .eq("band_id", bandId);

      if (!repError && repertoryData) {
        setBandSongs(repertoryData);
      }

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
              lyrics,
              pdf_url
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
            time: ev.time ? ev.time.substring(0, 5) : "20:00",
            songsCount: sortedSongs.length,
            songsOrderedList: sortedSongs,
          };
        });

        setEventsList(formattedEvents);
      }
    } catch (error) {
      console.error("Error cargando calendario:", error);
    } finally {
      setLoading(false);
    }
  };

  // Función para abrir el PDF en el navegador o visor del sistema
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

  const handleSaveEvent = async () => {
    if (!eventName.trim() || selectedDay === null) {
      showToast("Selecciona un día y pon nombre al evento");
      return;
    }

    if (!isValidTimeFormat(eventTime)) {
      showToast("Formato de hora incorrecto (ej: 20:00)");
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

        await supabase.from("event_songs").insert(eventSongsPayload);
      }

      setEventName("");
      setSelectedSongs([]);
      await loadCalendarData();
      showToast("Evento guardado correctamente");
    } catch (error: any) {
      showToast("No se pudo guardar el evento");
    }
  };

  const handleUpdateEventTime = async () => {
    if (!selectedEventDetails) return;

    if (!isValidTimeFormat(editingEventTime)) {
      showToast("Formato de hora incorrecto (ej: 21:30)");
      return;
    }

    try {
      const { error } = await supabase
        .from("events")
        .update({ time: editingEventTime.trim() })
        .eq("id", selectedEventDetails.id);

      if (error) throw error;

      setSelectedEventDetails({
        ...selectedEventDetails,
        time: editingEventTime.trim(),
      });
      await loadCalendarData();
      showToast("Hora actualizada");
    } catch (error) {
      showToast("No se pudo actualizar la hora");
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    setEventToDeleteId(eventId);
    setIsDeleteModalVisible(true);
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDeleteId) return;

    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventToDeleteId);

      if (!error) {
        setEventsList((prevList) =>
          prevList.filter((ev) => ev.id !== eventToDeleteId),
        );
        setIsEventDetailsModalVisible(false);
        setIsDeleteModalVisible(false);
        setEventToDeleteId(null);
        await loadCalendarData();
        showToast("Evento eliminado");
      } else {
        showToast("No se pudo eliminar el evento");
      }
    } catch (error) {
      showToast("Error al eliminar el evento");
    }
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
      showToast("Canción añadida al evento");
    } catch (error) {
      showToast("No se pudo añadir la canción");
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
      showToast("Canción retirada");
    } catch (error) {
      showToast("No se pudo quitar la canción");
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
    if (dayEvs.some((ev) => ev.type === "Ensayo")) return "Ensayo";
    if (dayEvs.some((ev) => ev.type === "Actuación")) return "Actuación";
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

      {/* MÓDULO 1: CALENDARIO VISUAL (Borde Blanco) */}
      <View style={styles.cardCalendar}>
        <View style={styles.calendarNavHeader}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => {
              setCurrentDate(new Date(year, month - 1, 1));
              setSelectedDay(1);
            }}
          >
            <Ionicons name="chevron-back" size={20} color="#ff9800" />
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
            <Ionicons name="chevron-forward" size={20} color="#ff9800" />
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
                  style={[
                    styles.dayText,
                    isToday && styles.todayCellText,
                    isSelected && !isToday && styles.dayTextSelected,
                  ]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* MÓDULO 2: EVENTOS ACTIVOS DEL DÍA SELECCIONADO (Borde Naranja) */}
      {selectedDay !== null && (
        <View style={styles.cardEventsList}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Ionicons
              name="location-sharp"
              size={28}
              color="#ff9800"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.cardTitleEvents}>
              Eventos para el {selectedDay} de {monthNames[month]}
            </Text>
          </View>

          {dayEvents.length === 0 ? (
            <Text style={styles.emptyText}>
              No hay eventos programados para este día.
            </Text>
          ) : (
            dayEvents.map((ev) => (
              <TouchableOpacity
                key={ev.id}
                style={styles.miniEventBadge}
                onPress={() => {
                  setSelectedEventDetails(ev);
                  setEditingEventTime(ev.time);
                  setIsEventDetailsModalVisible(true);
                }}
              >
                <View style={styles.eventHeaderRow}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flex: 1,
                    }}
                  >
                    {ev.type === "Ensayo" && (
                      <Ionicons
                        name="musical-notes-outline"
                        size={24}
                        color="#00bcd4"
                        style={{ marginRight: 10 }}
                      />
                    )}
                    {ev.type === "Actuación" && (
                      <Ionicons
                        name="mic-outline"
                        size={24}
                        color="#ff9800"
                        style={{ marginRight: 10 }}
                      />
                    )}
                    <Text style={styles.miniEventName} numberOfLines={1}>
                      {ev.name}
                    </Text>
                  </View>

                  {/* ACCIONES DE LA TARJETA: EDITAR (Turquesa) Y BORRAR (Naranja) */}
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <TouchableOpacity
                      style={[styles.iconButtonAction, { marginRight: 8 }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        setSelectedEventDetails(ev);
                        setEditingEventTime(ev.time);
                        setIsEventDetailsModalVisible(true);
                      }}
                    >
                      <Ionicons
                        name="create-outline"
                        size={20}
                        color="#00bcd4"
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.iconButtonAction}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteEvent(ev.id);
                      }}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color="#ff9800"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 6,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons
                      name="time-outline"
                      size={15}
                      color="#00bcd4"
                      style={{ marginRight: 5 }}
                    />
                    <Text style={styles.miniEventTime}>
                      {ev.time} | 🎵 {ev.songsCount} canciones
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.eventTypeLabelText,
                      {
                        color: ev.type === "Actuación" ? "#ff9800" : "#ffffff",
                      },
                    ]}
                  >
                    {ev.type}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      {/* MÓDULO 3: MÓDULO NUEVO E INDEPENDIENTE PARA "AÑADIR EVENTO" (Borde Turquesa) */}
      {selectedDay !== null && (
        <View style={styles.cardAddModule}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <Ionicons
              name="add-circle"
              size={26}
              color="#00bcd4"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.cardAddModuleTitle}>Añadir Nuevo Evento</Text>
          </View>

          <Text style={styles.labelSmall}>Nombre del evento:</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Ensayo General o Concierto Sala X"
            placeholderTextColor="#666"
            value={eventName}
            onChangeText={setEventName}
          />

          <Text style={styles.labelSmall}>
            Hora del evento (Formato 24h - Ej: 20:00):
          </Text>
          <TextInput
            style={styles.input}
            placeholder="HH:MM (ej. 21:15)"
            placeholderTextColor="#666"
            value={eventTime}
            onChangeText={setEventTime}
            maxLength={5}
          />

          <Text style={styles.labelSmall}>Tipo de evento:</Text>
          <View style={styles.typeSelectorRow}>
            {["Ensayo", "Actuación", "Otro"].map((t) => {
              const isSelected = eventType === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeButton,
                    isSelected &&
                      t === "Ensayo" &&
                      styles.typeButtonEnsayoActive,
                    isSelected &&
                      t === "Actuación" &&
                      styles.typeButtonActuacionActive,
                    isSelected && t === "Otro" && styles.typeButtonOtroActive,
                  ]}
                  onPress={() => setEventType(t)}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      isSelected &&
                        t === "Ensayo" &&
                        styles.typeButtonTextEnsayoActive,
                      isSelected &&
                        t === "Actuación" &&
                        styles.typeButtonTextActuacionActive,
                      isSelected &&
                        t === "Otro" &&
                        styles.typeButtonTextOtroActive,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.repertoireSectionHeader}>
            <Text style={styles.label}>
              Repertorio ({selectedSongs.length} canciones)
            </Text>
            <TouchableOpacity
              style={styles.addSongButtonWhite}
              onPress={() => setIsSongModalVisible(true)}
            >
              <Text style={styles.addSongButtonWhiteText}>Añadir Canción</Text>
            </TouchableOpacity>
          </View>

          {selectedSongs.map((songId, index) => {
            const songObj = bandSongs.find((s) => s.id === songId);
            if (!songObj) return null;
            return (
              <View key={songId} style={styles.reorderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reorderSongText}>
                    {index + 1}. {songObj.title}
                  </Text>
                  <Text style={styles.modalSongMeta}>
                    Tono: {songObj.key || "N/A"}
                  </Text>
                </View>
                <View style={styles.rowActionsRight}>
                  <TouchableOpacity
                    style={styles.miniActionButton}
                    onPress={() => moveSongUp(index)}
                  >
                    <Ionicons name="chevron-up" size={18} color="#00bcd4" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.miniActionButton}
                    onPress={() => moveSongDown(index)}
                  >
                    <Ionicons name="chevron-down" size={18} color="#00bcd4" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.miniActionButton}
                    onPress={() =>
                      setSelectedSongs(
                        selectedSongs.filter((id) => id !== songId),
                      )
                    }
                  >
                    <Ionicons name="close" size={20} color="#ff9800" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSaveEvent}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="save-outline"
                size={20}
                color="#000"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.primaryButtonText}>
                Guardar Evento en Base de Datos
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* MODAL DE SELECCIÓN DE CANCIONES (CREACIÓN NUEVA) */}
      <Modal visible={isSongModalVisible} transparent animationType="slide">
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
                name="musical-notes-outline"
                size={24}
                color="#00bcd4"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.modalSongHeaderTitleClean}>
                Añadir Canción al Evento
              </Text>
            </View>

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
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.modalSongTitle}>
                            {song.title}
                          </Text>
                          <Text style={styles.modalSongMeta}>
                            Tono: {song.key || "N/A"}
                          </Text>
                        </View>
                        {added ? (
                          <Ionicons
                            name="checkmark-circle"
                            size={24}
                            color="#00bcd4"
                            style={{ marginLeft: 8 }}
                          />
                        ) : (
                          <Ionicons
                            name="add-circle-outline"
                            size={24}
                            color="#00bcd4"
                            style={{ marginLeft: 8 }}
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButtonOrange}
              onPress={() => setIsSongModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonOrangeText}>Volver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 1: DETALLES DEL EVENTO */}
      <Modal
        visible={isEventDetailsModalVisible}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              {selectedEventDetails?.type === "Ensayo" && (
                <Ionicons
                  name="musical-notes-outline"
                  size={26}
                  color="#00bcd4"
                  style={{ marginRight: 10 }}
                />
              )}
              {selectedEventDetails?.type === "Actuación" && (
                <Ionicons
                  name="mic-outline"
                  size={26}
                  color="#ff9800"
                  style={{ marginRight: 10 }}
                />
              )}
              {selectedEventDetails?.type !== "Ensayo" &&
                selectedEventDetails?.type !== "Actuación" && (
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

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <Text style={styles.modalDateInfo}>
                {selectedEventDetails?.dateString}
              </Text>
              <Text
                style={[
                  styles.modalTypeBadgeText,
                  {
                    color:
                      selectedEventDetails?.type === "Actuación"
                        ? "#ff9800"
                        : selectedEventDetails?.type === "Ensayo"
                          ? "#00bcd4"
                          : "#ffffff",
                  },
                ]}
              >
                {selectedEventDetails?.type}
              </Text>
            </View>

            <View style={styles.editTimeBox}>
              <Text style={styles.labelSmall}>
                Modificar hora (Formato HH:MM):
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      flex: 1,
                      marginBottom: 0,
                      marginRight: 8,
                      padding: 10,
                      fontSize: 15,
                    },
                  ]}
                  value={editingEventTime}
                  onChangeText={setEditingEventTime}
                  placeholder="Ej: 21:15"
                  placeholderTextColor="#666"
                  maxLength={5}
                />
                <TouchableOpacity
                  style={styles.updateTimeButton}
                  onPress={handleUpdateEventTime}
                >
                  <Text style={styles.updateTimeButtonText}>
                    Actualizar Hora
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.repertoireSectionHeader}>
              <Text style={styles.subSectionTitle}>
                Repertorio ({selectedEventDetails?.songsCount || 0} canciones):
              </Text>
              <TouchableOpacity
                style={styles.addSongButtonWhite}
                onPress={() => setIsEditSongModalVisible(true)}
              >
                <Text style={styles.addSongButtonWhiteText}>
                  Añadir Canción
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollList}>
              {selectedEventDetails?.songsOrderedList?.length === 0 ? (
                <Text style={styles.emptyText}>
                  Este evento no tiene canciones asociadas. ¡Añade algunas!
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
                          Tono: {song.key || "N/A"}{" "}
                          {song.pdf_url ? "| 📄 PDF" : ""}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.removeSongButton}
                        onPress={() =>
                          handleRemoveSongFromExistingEvent(song.id)
                        }
                      >
                        <Ionicons
                          name="close-circle-outline"
                          size={22}
                          color="#ff9800"
                        />
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
                  styles.modalCloseButtonDanger,
                  { flex: 1, marginRight: 6, marginTop: 0 },
                ]}
                onPress={() => handleDeleteEvent(selectedEventDetails?.id)}
              >
                <Text style={styles.modalCloseButtonText}>Eliminar Evento</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalCloseButtonOrange,
                  { flex: 1, marginLeft: 6, marginTop: 0 },
                ]}
                onPress={() => setIsEventDetailsModalVisible(false)}
              >
                <Text style={styles.modalCloseButtonOrangeText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL SECUNDARIO: AÑADIR CANCIÓN A EVENTO YA EXISTENTE */}
      <Modal visible={isEditSongModalVisible} transparent animationType="slide">
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
                name="musical-notes-outline"
                size={24}
                color="#00bcd4"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.modalSongHeaderTitleClean}>
                Añadir Canción al Evento
              </Text>
            </View>

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
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.modalSongTitle}>
                            {song.title}
                          </Text>
                          <Text style={styles.modalSongMetaLarge}>
                            Tono: {song.key || "N/A"}
                          </Text>
                        </View>
                        {alreadyInEvent ? (
                          <Ionicons
                            name="checkmark-circle"
                            size={24}
                            color="#00bcd4"
                            style={{ marginLeft: 8 }}
                          />
                        ) : (
                          <Ionicons
                            name="add-circle-outline"
                            size={24}
                            color="#00bcd4"
                            style={{ marginLeft: 8 }}
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButtonOrange}
              onPress={() => setIsEditSongModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonOrangeText}>Volver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: CARACTERÍSTICAS DE LA CANCIÓN SELECCIONADA CON CONSULTA DE PDF */}
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

            <ScrollView showsVerticalScrollIndicator={false}>
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

                {/* BOTÓN EXPLÍCITO PARA CONSULTAR EL PDF DE LA CANCIÓN */}
                {selectedSongDetail?.pdf_url && (
                  <TouchableOpacity
                    style={styles.consultPdfButton}
                    onPress={() => handleOpenPdf(selectedSongDetail.pdf_url)}
                  >
                    <Ionicons
                      name="document-text"
                      size={18}
                      color="#000"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.consultPdfButtonText}>
                      Consultar PDF de la Canción
                    </Text>
                  </TouchableOpacity>
                )}

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
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButtonOrange}
              onPress={() => setIsSongDetailModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonOrangeText}>
                Volver al Evento
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE CONFIRMACIÓN OSCURO PARA BORRAR EVENTO */}
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
                Eliminar Evento
              </Text>
            </View>

            <Text style={{ color: "#fff", fontSize: 16, marginBottom: 20 }}>
              ¿Deseas borrar este evento definitivamente?
            </Text>

            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <TouchableOpacity
                style={[
                  styles.modalCloseButtonOrange,
                  { flex: 1, marginRight: 6, marginTop: 0 },
                ]}
                onPress={() => setIsDeleteModalVisible(false)}
              >
                <Text style={styles.modalCloseButtonOrangeText}>Volver</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalCloseButtonDanger,
                  { flex: 1, marginLeft: 6, marginTop: 0 },
                ]}
                onPress={confirmDeleteEvent}
              >
                <Text style={styles.modalCloseButtonText}>Sí, Borrar</Text>
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
  toastText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  cardCalendar: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 6,
    borderWidth: 1.5,
    borderColor: "#ffffff",
    marginBottom: 12,
  },
  cardEventsList: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    borderWidth: 1.5,
    borderColor: "#ff9800",
    marginBottom: 12,
  },
  cardAddModule: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    borderWidth: 2,
    borderColor: "#00bcd4",
    marginBottom: 12,
  },
  cardAddModuleTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#00bcd4",
  },
  calendarNavHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  navButton: { backgroundColor: "#2a2a2a", padding: 6, borderRadius: 6 },
  calendarMonthTitle: { fontSize: 17, fontWeight: "bold", color: "#fff" },
  weekDaysHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 4,
  },
  weekDayHeaderText: {
    color: "#00bcd4",
    fontWeight: "bold",
    width: "14%",
    textAlign: "center",
    fontSize: 15,
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
  cellActuacion: { borderColor: "#ff9800", backgroundColor: "#3a2512" },
  cellOtro: { borderColor: "#fff", backgroundColor: "#121212" },
  todayCellHighlight: { backgroundColor: "#fff", borderColor: "#fff" },
  dayCellSelected: { borderWidth: 2, borderColor: "#00bcd4" },
  dayText: { color: "#ccc", fontSize: 14 },
  todayCellText: { color: "#000", fontWeight: "bold", fontSize: 15 },
  dayTextSelected: { color: "#fff", fontWeight: "bold" },
  cardTitleEvents: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ff9800",
  },
  subSectionTitle: {
    fontSize: 16,
    color: "#bbb",
    fontWeight: "bold",
    marginBottom: 8,
    marginTop: 12,
  },
  labelSmall: {
    fontSize: 14,
    color: "#aaa",
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 14,
    color: "#fff",
    fontSize: 16,
    marginBottom: 8,
  },
  typeSelectorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  typeButton: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 6,
    marginHorizontal: 2,
  },
  typeButtonEnsayoActive: {
    borderColor: "#00bcd4",
    borderWidth: 2,
  },
  typeButtonActuacionActive: {
    borderColor: "#ff9800",
    borderWidth: 2,
  },
  typeButtonOtroActive: {
    borderColor: "#ffffff",
    borderWidth: 2,
  },
  typeButtonText: { color: "#aaa", fontSize: 15 },
  typeButtonTextEnsayoActive: {
    color: "#00bcd4",
    fontWeight: "bold",
    fontSize: 15,
  },
  typeButtonTextActuacionActive: {
    color: "#ff9800",
    fontWeight: "bold",
    fontSize: 15,
  },
  typeButtonTextOtroActive: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 15,
  },
  repertoireSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 8,
  },
  addSongButtonWhite: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addSongButtonWhiteText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "bold",
  },
  reorderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#121212",
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  reorderSongText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  rowActionsRight: {
    flexDirection: "row",
    width: 100,
    justifyContent: "space-between",
    alignItems: "center",
  },
  miniActionButton: {
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#00bcd4",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  primaryButtonText: { color: "#000", fontWeight: "bold", fontSize: 16 },
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
    borderWidth: 1,
    borderColor: "#00bcd4",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ff9800",
    marginBottom: 8,
  },
  modalTitleWhite: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
  },
  modalSongHeaderTitleClean: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#00bcd4",
  },
  modalDateInfo: {
    fontSize: 14,
    color: "#aaa",
    marginBottom: 4,
  },
  modalTypeBadgeText: {
    fontSize: 15,
    fontWeight: "bold",
  },
  editTimeBox: {
    backgroundColor: "#121212",
    padding: 10,
    borderRadius: 8,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  updateTimeButton: {
    backgroundColor: "#ff9800",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  updateTimeButtonText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 13,
  },
  modalScrollList: { marginBottom: 10 },
  modalSongItem: {
    backgroundColor: "#121212",
    padding: 14,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  modalSongItemDisabled: { opacity: 0.5 },
  modalSongTitle: { color: "#fff", fontWeight: "bold", fontSize: 17 },
  modalSongMeta: { color: "#aaa", fontSize: 14, marginTop: 3 },
  modalSongMetaLarge: { color: "#bbb", fontSize: 15, marginTop: 3 },
  modalCloseButton: {
    backgroundColor: "#ff9800",
    padding: 14,
    borderRadius: 6,
    alignItems: "center",
  },
  modalCloseButtonText: { color: "#000", fontWeight: "bold", fontSize: 15 },
  modalCloseButtonOrange: {
    backgroundColor: "#ff9800",
    padding: 14,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 4,
  },
  modalCloseButtonOrangeText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 15,
  },
  modalCloseButtonDanger: {
    backgroundColor: "#c0392b",
    padding: 14,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  miniEventBadge: {
    backgroundColor: "#121212",
    padding: 14,
    borderRadius: 6,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#ff9800",
  },
  eventHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  miniEventName: { color: "#fff", fontWeight: "bold", fontSize: 17 },
  miniEventTime: { color: "#00bcd4", fontSize: 15, fontWeight: "600" },
  eventTypeLabelText: { fontSize: 14, fontWeight: "bold" },
  emptyText: {
    color: "#777",
    textAlign: "center",
    fontStyle: "italic",
    padding: 12,
    fontSize: 15,
  },
  label: { fontSize: 15, color: "#ccc", fontWeight: "600" },
  songDetailContainer: {
    marginVertical: 5,
  },
  songDetailText: {
    color: "#ddd",
    fontSize: 16,
    marginBottom: 8,
  },
  boldText: {
    fontWeight: "bold",
    color: "#00bcd4",
  },
  lyricsScroll: {
    backgroundColor: "#121212",
    padding: 12,
    borderRadius: 6,
    maxHeight: 180,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    marginTop: 8,
  },
  lyricsText: {
    color: "#ccc",
    fontSize: 15,
    lineHeight: 22,
  },
  consultPdfButton: {
    backgroundColor: "#00bcd4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  consultPdfButtonText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 15,
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
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  iconButtonAction: {
    padding: 6,
  },
});
