import { supabase } from "@/services/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
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
  const [eventNotes, setEventNotes] = useState("");

  // Listas de datos desde Supabase
  const [bandSongs, setBandSongs] = useState<any[]>([]);
  const [selectedSongs, setSelectedSongs] = useState<string[]>([]);
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [bandName, setBandName] = useState("Nombre de la Banda");
  const [bandLogo, setBandLogo] = useState<string | null>(null);

  // Estado temporal compartido para la selección múltiple en modales
  const [tempSelectedSongs, setTempSelectedSongs] = useState<string[]>([]);
  const [isSongModalVisible, setIsSongModalVisible] = useState(false);

  // ESTADOS PARA MODALES INTERACTIVOS DE DETALLE Y EDICIÓN
  const [selectedEventDetails, setSelectedEventDetails] = useState<any | null>(
    null,
  );
  const [isEventDetailsModalVisible, setIsEventDetailsModalVisible] =
    useState(false);
  const [editingEventTime, setEditingEventTime] = useState("20:00");
  const [editingEventNotes, setEditingEventNotes] = useState("");

  const [selectedSongDetail, setSelectedSongDetail] = useState<any | null>(
    null,
  );
  const [isSongDetailModalVisible, setIsSongDetailModalVisible] =
    useState(false);

  // Modal unificado para editar canciones en un evento YA existente
  const [isEditSongModalVisible, setIsEditSongModalVisible] = useState(false);

  // ESTADOS PARA EL MODAL DE CONFIRMACIÓN DE BORRADO DE EVENTO
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [eventToDeleteId, setEventToDeleteId] = useState<string | null>(null);

  // Estado para el mensaje flotante (Toast)
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
      loadBandInfo();
    }
  }, [bandId, month, year]);

  const loadBandInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("bands")
        .select("name, logo_url")
        .eq("id", bandId)
        .single();
      if (!error && data) {
        if (data.name) setBandName(data.name);
        if (data.logo_url) setBandLogo(data.logo_url);
      }
    } catch (e) {
      // Ignorar
    }
  };

  const loadCalendarData = async () => {
    try {
      setLoading(true);

      const { data: repertoryData, error: repError } = await supabase
        .from("songs")
        .select(
          "id, title, author, genre, key, tempo, duration, lyrics, pdf_url",
        )
        .eq("band_id", bandId);

      if (!repError && repertoryData) {
        const sortedRepertory = repertoryData.sort((a, b) => {
          const titleA = (a.title || "").toLowerCase();
          const titleB = (b.title || "").toLowerCase();
          return titleA.localeCompare(titleB);
        });
        setBandSongs(sortedRepertory);
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
          notes,
          event_songs (
            position,
            songs (
              id,
              title,
              author,
              genre,
              key,
              tempo,
              duration,
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
                .filter(Boolean)
            : [];

          return {
            id: ev.id,
            name: ev.name,
            type: ev.type,
            rawDate: ev.event_date,
            day: dateObj.getDate(),
            month: dateObj.getMonth(),
            year: dateObj.getFullYear(),
            dateString: `${fullWeekDays[(dateObj.getDay() + 6) % 7]}, ${dateObj.getDate()} de ${monthNames[dateObj.getMonth()]} de ${dateObj.getFullYear()}`,
            time: ev.time ? ev.time.substring(0, 5) : "20:00",
            notes: ev.notes || "",
            songsCount: sortedSongs.length,
            songsOrderedList: sortedSongs,
          };
        });

        formattedEvents.sort((a: any, b: any) => {
          if (a.rawDate !== b.rawDate) {
            return a.rawDate.localeCompare(b.rawDate);
          }
          return a.time.localeCompare(b.time);
        });

        setEventsList(formattedEvents);

        if (selectedEventDetails) {
          const updatedCurrent = formattedEvents.find(
            (ev: any) => ev.id === selectedEventDetails.id,
          );
          if (updatedCurrent) {
            setSelectedEventDetails(updatedCurrent);
          }
        }
      }
    } catch (error) {
      console.error("Error cargando calendario:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintSetlist = async () => {
    try {
      const songsHtml =
        selectedEventDetails?.songsOrderedList &&
        selectedEventDetails.songsOrderedList.length > 0
          ? selectedEventDetails.songsOrderedList
              .map(
                (song: any, index: number) => `
            <div class="song-item">
              ${index + 1}. ${song.title}
            </div>
          `,
              )
              .join("")
          : '<p style="font-size: 16px; font-style: italic; color: #777; padding-left: 10px;">No hay canciones en este evento.</p>';

      const logoHtml = bandLogo
        ? `<img src="${bandLogo}" style="width: 45px; height: 45px; object-fit: contain; border-radius: 4px;" />`
        : `<div class="logo-box">BAND</div>`;

      const htmlContent = `
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              @page { size: A4; margin: 10mm 12mm; }
              body { font-family: 'Helvetica', Arial, sans-serif; padding: 0px; margin: 0px; color: #111; text-align: center; background: #fff; }
              .header-block { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 2px; }
              .logo-box { width: 65px; height: 65px; background-color: #333; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: bold; border-radius: 4px; font-size: 14px; }
              .band-name { font-size: 32px; font-weight: bold; color: #000; text-align: left; }
              .event-title { font-size: 28px; color: #222; margin-bottom: 1px; font-weight: bold; text-align: center; }
              .event-date { font-size: 22px; color: #555; margin-bottom: 10px; text-align: center; }
              .list-container { width: 100%; text-align: left; overflow: hidden; }
              
              .song-item {
                margin-bottom: 4px;
                font-size: 36px !important;
                font-weight: bold;
                text-transform: uppercase;
                page-break-inside: avoid;
                padding-left: 20px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                width: 100%;
                line-height: 1.05;
              }

              @media print {
                body { -webkit-print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            <div style="width: 100%; display: flex; flex-direction: column; align-items: center;">
              <div class="header-block">
                ${logoHtml}
                <div class="band-name">${bandName}</div>
              </div>

              <div class="event-title">${selectedEventDetails?.name}</div>
              <div class="event-date">${selectedEventDetails?.dateString} - ${selectedEventDetails?.time}</div>
            </div>

            <div class="list-container">
              ${songsHtml}
            </div>
          </body>
        </html>
      `;

      if (Platform.OS === "web") {
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 250);
        } else {
          showToast("El navegador bloqueó la ventana de impresión.");
        }
      } else {
        await Print.printAsync({ html: htmlContent });
      }
    } catch (error) {
      console.error("Error al imprimir:", error);
      showToast("No se pudo abrir la ventana de impresión.");
    }
  };

  const calculateTotalDuration = (songsList: any[]) => {
    if (!songsList || songsList.length === 0) return "0 min";

    let totalSeconds = 0;

    songsList.forEach((song) => {
      const dur = song?.duration;
      if (!dur) return;

      if (typeof dur === "string") {
        const cleanDur = dur.trim();
        if (cleanDur.includes(":")) {
          const parts = cleanDur.split(":");
          const mins = parseInt(parts[0], 10) || 0;
          const secs = parseInt(parts[1], 10) || 0;
          totalSeconds += mins * 60 + secs;
        } else if (!isNaN(Number(cleanDur))) {
          totalSeconds += Number(cleanDur) * 60;
        }
      } else if (typeof dur === "number") {
        totalSeconds += dur * 60;
      }
    });

    if (totalSeconds === 0) return "0 min";

    const totalMins = Math.floor(totalSeconds / 60);
    const remainingSecs = totalSeconds % 60;

    if (remainingSecs > 0) {
      return `${totalMins} min ${remainingSecs} seg`;
    }
    return `${totalMins} min`;
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
            notes: eventNotes.trim() || null,
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
      setEventNotes("");
      setSelectedSongs([]);
      await loadCalendarData();
      showToast("Evento guardado correctamente");
    } catch (error: any) {
      showToast("No se pudo guardar el evento");
    }
  };

  const handleUpdateEventTimeAndNotes = async () => {
    if (!selectedEventDetails) return;

    if (!isValidTimeFormat(editingEventTime)) {
      showToast("Formato de hora incorrecto (ej: 21:30)");
      return;
    }

    try {
      const { error } = await supabase
        .from("events")
        .update({
          time: editingEventTime.trim(),
          notes: editingEventNotes.trim() || null,
        })
        .eq("id", selectedEventDetails.id);

      if (error) throw error;

      setSelectedEventDetails({
        ...selectedEventDetails,
        time: editingEventTime.trim(),
        notes: editingEventNotes.trim(),
      });
      await loadCalendarData();
      showToast("Evento actualizado correctamente");
    } catch (error) {
      showToast("No se pudo actualizar el evento");
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

  const saveNewSongOrderToSupabase = async (newList: any[]) => {
    if (!selectedEventDetails) return;
    try {
      await supabase
        .from("event_songs")
        .delete()
        .eq("event_id", selectedEventDetails.id);

      if (newList.length > 0) {
        const payload = newList.map((song, index) => ({
          event_id: selectedEventDetails.id,
          song_id: song.id,
          position: index + 1,
        }));

        const { error } = await supabase.from("event_songs").insert(payload);
        if (error) throw error;
      }

      setSelectedEventDetails({
        ...selectedEventDetails,
        songsOrderedList: newList,
        songsCount: newList.length,
      });

      await loadCalendarData();
    } catch (error) {
      showToast("No se pudo actualizar el orden de las canciones");
    }
  };

  const moveEventSongUp = (index: number) => {
    if (index === 0 || !selectedEventDetails?.songsOrderedList) return;
    const arr = [...selectedEventDetails.songsOrderedList];
    [arr[index], arr[index - 1]] = [arr[index - 1], arr[index]];
    saveNewSongOrderToSupabase(arr);
  };

  const moveEventSongDown = (index: number) => {
    if (!selectedEventDetails?.songsOrderedList) return;
    if (index === selectedEventDetails.songsOrderedList.length - 1) return;
    const arr = [...selectedEventDetails.songsOrderedList];
    [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    saveNewSongOrderToSupabase(arr);
  };

  const toggleTempSongSelection = (songId: string) => {
    if (tempSelectedSongs.includes(songId)) {
      setTempSelectedSongs(tempSelectedSongs.filter((id) => id !== songId));
    } else {
      setTempSelectedSongs([...tempSelectedSongs, songId]);
    }
  };

  const handleConfirmSongSelection = () => {
    setSelectedSongs(tempSelectedSongs);
    setIsSongModalVisible(false);
  };

  const handleConfirmEditSongSelection = async () => {
    if (!selectedEventDetails) {
      setIsEditSongModalVisible(false);
      return;
    }

    try {
      await supabase
        .from("event_songs")
        .delete()
        .eq("event_id", selectedEventDetails.id);

      if (tempSelectedSongs.length > 0) {
        const eventSongsPayload = tempSelectedSongs.map((songId, index) => ({
          event_id: selectedEventDetails.id,
          song_id: songId,
          position: index + 1,
        }));

        const { error: insertError } = await supabase
          .from("event_songs")
          .insert(eventSongsPayload);

        if (insertError) throw insertError;
      }

      await loadCalendarData();

      const addedSongObjs = bandSongs.filter((s) =>
        tempSelectedSongs.includes(s.id),
      );
      const sortedNewSongs = tempSelectedSongs
        .map((id) => addedSongObjs.find((s) => s.id === id))
        .filter(Boolean);

      setSelectedEventDetails({
        ...selectedEventDetails,
        songsCount: sortedNewSongs.length,
        songsOrderedList: sortedNewSongs,
      });

      setIsEditSongModalVisible(false);
      showToast("Repertorio del evento actualizado");
    } catch (error) {
      showToast("No se pudieron actualizar las canciones");
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

  const dayEvents = selectedDay !== null ? getEventsForDay(selectedDay) : [];

  const addModuleColor =
    eventType === "Ensayo"
      ? "#00bcd4"
      : eventType === "Actuación"
        ? "#ff9800"
        : "#ffffff";

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

      {/* MÓDULO 1: CALENDARIO VISUAL */}
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
                  isSelected && styles.dayCellSelected,
                ]}
                onPress={() => setSelectedDay(day)}
              >
                <Text
                  style={[
                    styles.dayText,
                    isToday && styles.todayCellText,
                    isSelected && styles.dayTextSelected,
                  ]}
                >
                  {day}
                </Text>
                {isToday && <View style={styles.todayUnderlineBar} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* MÓDULO 2: EVENTOS ACTIVOS DEL DÍA SELECCIONADO */}
      {selectedDay !== null && (
        <View style={[styles.cardEventsList, { borderColor: "#ffffff" }]}>
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
              color="#ffffff"
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.cardTitleEvents, { color: "#ffffff" }]}>
              Eventos para el {selectedDay} de {monthNames[month]}
            </Text>
          </View>

          {dayEvents.length === 0 ? (
            <Text style={styles.emptyText}>
              No hay eventos programados para este día.
            </Text>
          ) : (
            dayEvents.map((ev) => {
              const leftBorderColor =
                ev.type === "Ensayo"
                  ? "#00bcd4"
                  : ev.type === "Actuación"
                    ? "#ff9800"
                    : "#ffffff";

              const isEventToday =
                ev.day === currentDayToday &&
                ev.month === currentMonthToday &&
                ev.year === currentYearToday;

              return (
                <TouchableOpacity
                  key={ev.id}
                  style={[
                    styles.miniEventBadge,
                    { borderLeftColor: leftBorderColor },
                  ]}
                  onPress={() => {
                    setSelectedEventDetails(ev);
                    setEditingEventTime(ev.time);
                    setEditingEventNotes(ev.notes || "");
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

                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <TouchableOpacity
                        style={[styles.iconButtonAction, { marginRight: 8 }]}
                        onPress={(e) => {
                          e.stopPropagation();
                          setSelectedEventDetails(ev);
                          setEditingEventTime(ev.time);
                          setEditingEventNotes(ev.notes || "");
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
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Ionicons
                        name="time-outline"
                        size={15}
                        color="#ffffff"
                        style={{ marginRight: 5 }}
                      />
                      <Text
                        style={[styles.miniEventTime, { color: "#ffffff" }]}
                      >
                        {ev.time} {isEventToday ? "| 🚨 ¡Hoy!" : ""} | 🎵{" "}
                        {ev.songsCount} canciones
                      </Text>
                    </View>
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
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}

      {/* MÓDULO 3: AÑADIR EVENTO */}
      {selectedDay !== null && (
        <View style={[styles.cardAddModule, { borderColor: addModuleColor }]}>
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
              color={addModuleColor}
              style={{ marginRight: 8 }}
            />
            <Text
              style={[styles.cardAddModuleTitle, { color: addModuleColor }]}
            >
              Añadir Nuevo Evento
            </Text>
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

          <Text style={styles.labelSmall}>Anotaciones (opcional):</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: "top" }]}
            placeholder="Ej: Traer uniforme de gala, llegar 15 min antes..."
            placeholderTextColor="#666"
            value={eventNotes}
            onChangeText={setEventNotes}
            multiline
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
            <Text style={styles.labelSmall}>
              Repertorio ({selectedSongs.length} canciones)
            </Text>
            <TouchableOpacity
              style={styles.addSongIconButtonWhite}
              onPress={async () => {
                await loadCalendarData();
                setTempSelectedSongs([...selectedSongs]);
                setIsSongModalVisible(true);
              }}
            >
              <Ionicons
                name="add"
                size={18}
                color="#000000"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.addSongButtonTextUnified}>Canciones</Text>
            </TouchableOpacity>
          </View>

          {selectedSongs.map((songId, index) => {
            const songObj = bandSongs.find((s) => s.id === songId);
            if (!songObj) return null;
            return (
              <View key={songId} style={styles.reorderRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.reorderSongText} numberOfLines={1}>
                    {index + 1}. {songObj.title}
                  </Text>
                  <Text style={styles.modalSongMeta} numberOfLines={1}>
                    Tono: {getKeyLabel(songObj.key)}
                  </Text>
                </View>
                <View style={styles.rowActionsRight}>
                  <TouchableOpacity
                    style={styles.miniActionButton}
                    onPress={() => moveSongUp(index)}
                  >
                    <Ionicons
                      name="chevron-up"
                      size={20}
                      color={addModuleColor}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.miniActionButton}
                    onPress={() => moveSongDown(index)}
                  >
                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color={addModuleColor}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.miniActionButton}
                    onPress={() =>
                      setSelectedSongs(
                        selectedSongs.filter((id) => id !== songId),
                      )
                    }
                  >
                    <Ionicons name="close" size={22} color="#ff9800" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: addModuleColor }]}
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
              <Text style={[styles.primaryButtonText, { color: "#000" }]}>
                Guardar Evento en Base de Datos
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* MODAL 1 DE SELECCIÓN MÚLTIPLE (EVENTO NUEVO) */}
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
                Seleccionar Canciones ({tempSelectedSongs.length})
              </Text>
            </View>

            <ScrollView style={styles.modalScrollList}>
              {bandSongs.length === 0 ? (
                <Text style={styles.emptyText}>
                  La banda aún no tiene canciones añadidas en su repertorio.
                </Text>
              ) : (
                bandSongs.map((song) => {
                  const isChecked = tempSelectedSongs.includes(song.id);
                  return (
                    <TouchableOpacity
                      key={song.id}
                      style={[
                        styles.modalSongItem,
                        isChecked && styles.modalSongItemChecked,
                      ]}
                      onPress={() => toggleTempSongSelection(song.id)}
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
                            Tono: {getKeyLabel(song.key)}
                          </Text>
                        </View>
                        <Ionicons
                          name={
                            isChecked ? "radio-button-on" : "radio-button-off"
                          }
                          size={24}
                          color={isChecked ? "#00bcd4" : "#666"}
                          style={{ marginLeft: 8 }}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 8,
                marginTop: 4,
              }}
            >
              <TouchableOpacity
                style={[
                  styles.modalCloseButtonOrange,
                  { flex: 1, marginTop: 0 },
                ]}
                onPress={() => setIsSongModalVisible(false)}
              >
                <Text style={styles.modalCloseButtonOrangeText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.updateTimeButtonWhite,
                  { flex: 1, backgroundColor: "#00bcd4" },
                ]}
                onPress={handleConfirmSongSelection}
              >
                <Text
                  style={[
                    styles.updateTimeButtonWhiteText,
                    { color: "#000", fontSize: 15 },
                  ]}
                >
                  Guardar ({tempSelectedSongs.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 1: DETALLES Y EDICIÓN DEL EVENTO */}
      <Modal
        visible={isEventDetailsModalVisible}
        transparent
        animationType="slide"
      >
        {(() => {
          const detailEventType = selectedEventDetails?.type;
          const detailModalBorderColor =
            detailEventType === "Ensayo"
              ? "#00bcd4"
              : detailEventType === "Actuación"
                ? "#ff9800"
                : "#ffffff";

          return (
            <View style={styles.modalOverlay}>
              <View
                style={[
                  styles.modalContent,
                  { borderColor: detailModalBorderColor, maxHeight: "90%" },
                ]}
              >
                {/* ScrollView unificado para toda la tarjeta del modal */}
                <ScrollView
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={{ paddingBottom: 10 }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    {detailEventType === "Ensayo" && (
                      <Ionicons
                        name="musical-notes-outline"
                        size={26}
                        color="#00bcd4"
                        style={{ marginRight: 10 }}
                      />
                    )}
                    {detailEventType === "Actuación" && (
                      <Ionicons
                        name="mic-outline"
                        size={26}
                        color="#ff9800"
                        style={{ marginRight: 10 }}
                      />
                    )}
                    {detailEventType !== "Ensayo" &&
                      detailEventType !== "Actuación" && (
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
                            detailEventType === "Actuación"
                              ? "#ff9800"
                              : detailEventType === "Ensayo"
                                ? "#00bcd4"
                                : "#ffffff",
                        },
                      ]}
                    >
                      {detailEventType}
                    </Text>
                  </View>

                  {/* BLOQUE DE EDICIÓN DE HORA Y ANOTACIONES */}
                  <View style={styles.editTimeBox}>
                    <Text style={styles.labelSmall}>Hora (HH:MM):</Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          marginBottom: 8,
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

                    <Text style={styles.labelSmall}>
                      Anotaciones del evento:
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          height: 70,
                          textAlignVertical: "top",
                          marginBottom: 8,
                          padding: 10,
                          fontSize: 15,
                        },
                      ]}
                      value={editingEventNotes}
                      onChangeText={setEditingEventNotes}
                      placeholder="Añade notas..."
                      placeholderTextColor="#666"
                      multiline
                    />

                    <TouchableOpacity
                      style={styles.updateTimeButtonWhite}
                      onPress={handleUpdateEventTimeAndNotes}
                    >
                      <Text style={styles.updateTimeButtonWhiteText}>
                        Guardar Cambios de Hora / Anotaciones
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.repertoireSectionHeader}>
                    <Text style={styles.subSectionTitle}>
                      Repertorio ({selectedEventDetails?.songsCount || 0}{" "}
                      canciones):
                    </Text>
                    <TouchableOpacity
                      style={styles.addSongIconButtonWhite}
                      onPress={async () => {
                        await loadCalendarData();
                        const currentSongIds =
                          selectedEventDetails?.songsOrderedList?.map(
                            (s: any) => s.id,
                          ) || [];
                        setTempSelectedSongs(currentSongIds);
                        setIsEditSongModalVisible(true);
                      }}
                    >
                      <Ionicons
                        name="add"
                        size={18}
                        color="#000000"
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.addSongButtonTextUnified}>
                        Canciones
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.estimatedDurationRow}>
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color="#00bcd4"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.estimatedDurationText}>
                      Duración estimada:{" "}
                      <Text style={{ color: "#ffffff", fontWeight: "bold" }}>
                        {calculateTotalDuration(
                          selectedEventDetails?.songsOrderedList,
                        )}
                      </Text>
                    </Text>
                  </View>

                  {/* Lista de canciones con View simple para fluir con el scroll general */}
                  <View style={{ marginBottom: 10 }}>
                    {selectedEventDetails?.songsOrderedList?.length === 0 ? (
                      <Text style={styles.emptyText}>
                        Este evento no tiene canciones asociadas. ¡Añade
                        algunas!
                      </Text>
                    ) : (
                      selectedEventDetails?.songsOrderedList?.map(
                        (song: any, index: number) => (
                          <View
                            key={song.id || index}
                            style={styles.reorderRow}
                          >
                            <TouchableOpacity
                              style={{ flex: 1, marginRight: 8 }}
                              onPress={() => {
                                setSelectedSongDetail(song);
                                setIsSongDetailModalVisible(true);
                              }}
                            >
                              <Text
                                style={styles.reorderSongText}
                                numberOfLines={1}
                              >
                                {index + 1}. {song.title}
                              </Text>
                              <Text
                                style={styles.modalSongMetaLarge}
                                numberOfLines={1}
                              >
                                Tono: {getKeyLabel(song.key)}{" "}
                                {song.duration ? `| ⏱️ ${song.duration}` : ""}{" "}
                                {song.pdf_url ? "| 📄 PDF" : ""}
                              </Text>
                            </TouchableOpacity>

                            <View style={styles.rowActionsRight}>
                              <TouchableOpacity
                                style={styles.miniActionButton}
                                onPress={() => moveEventSongUp(index)}
                              >
                                <Ionicons
                                  name="chevron-up"
                                  size={20}
                                  color="#00bcd4"
                                />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.miniActionButton}
                                onPress={() => moveEventSongDown(index)}
                              >
                                <Ionicons
                                  name="chevron-down"
                                  size={20}
                                  color="#00bcd4"
                                />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.miniActionButton}
                                onPress={() =>
                                  handleRemoveSongFromExistingEvent(song.id)
                                }
                              >
                                <Ionicons
                                  name="close"
                                  size={22}
                                  color="#ff9800"
                                />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ),
                      )
                    )}
                  </View>

                  {/* Botones del final accesibles haciendo scroll hasta abajo */}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginTop: 10,
                      gap: 6,
                    }}
                  >
                    <TouchableOpacity
                      style={[
                        styles.modalCloseButtonDanger,
                        { flex: 1, marginTop: 0, backgroundColor: "#ff9800" },
                      ]}
                      onPress={() =>
                        handleDeleteEvent(selectedEventDetails?.id)
                      }
                    >
                      <Text
                        style={[styles.modalCloseButtonText, { color: "#000" }]}
                      >
                        Eliminar
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.modalCloseButtonDynamic,
                        {
                          flex: 1,
                          marginTop: 0,
                          backgroundColor: "#00bcd4",
                        },
                      ]}
                      onPress={() => setIsEventDetailsModalVisible(false)}
                    >
                      <Text
                        style={[
                          styles.modalCloseButtonDynamicText,
                          { color: "#000000" },
                        ]}
                      >
                        Cerrar
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.modalCloseButtonDynamic,
                        {
                          flex: 1,
                          marginTop: 0,
                          backgroundColor: "#ffffff",
                        },
                      ]}
                      onPress={handlePrintSetlist}
                    >
                      <Text
                        style={[
                          styles.modalCloseButtonDynamicText,
                          { color: "#000000" },
                        ]}
                      >
                        Imprimir
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </View>
          );
        })()}
      </Modal>

      {/* MODAL 2 DE SELECCIÓN MÚLTIPLE PARA EVENTO EXISTENTE */}
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
                Seleccionar Canciones ({tempSelectedSongs.length})
              </Text>
            </View>

            <ScrollView style={styles.modalScrollList}>
              {bandSongs.length === 0 ? (
                <Text style={styles.emptyText}>
                  No hay canciones en el repertorio de la banda.
                </Text>
              ) : (
                bandSongs.map((song) => {
                  const isChecked = tempSelectedSongs.includes(song.id);

                  return (
                    <TouchableOpacity
                      key={song.id}
                      style={[
                        styles.modalSongItem,
                        isChecked && styles.modalSongItemChecked,
                      ]}
                      onPress={() => toggleTempSongSelection(song.id)}
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
                            Tono: {getKeyLabel(song.key)}{" "}
                            {song.duration ? `| ⏱️ ${song.duration}` : ""}
                          </Text>
                        </View>
                        <Ionicons
                          name={
                            isChecked ? "radio-button-on" : "radio-button-off"
                          }
                          size={24}
                          color={isChecked ? "#00bcd4" : "#666"}
                          style={{ marginLeft: 8 }}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 8,
                marginTop: 4,
              }}
            >
              <TouchableOpacity
                style={[
                  styles.modalCloseButtonOrange,
                  { flex: 1, marginTop: 0 },
                ]}
                onPress={() => setIsEditSongModalVisible(false)}
              >
                <Text style={styles.modalCloseButtonOrangeText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.updateTimeButtonWhite,
                  { flex: 1, backgroundColor: "#00bcd4" },
                ]}
                onPress={handleConfirmEditSongSelection}
              >
                <Text
                  style={[
                    styles.updateTimeButtonWhiteText,
                    { color: "#000", fontSize: 15 },
                  ]}
                >
                  Guardar ({tempSelectedSongs.length})
                </Text>
              </TouchableOpacity>
            </View>
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
            <Text style={styles.songDetailTitle}>
              {selectedSongDetail?.title}
            </Text>
            {selectedSongDetail?.author ? (
              <Text style={styles.songDetailAuthor}>
                {selectedSongDetail.author}
              </Text>
            ) : null}

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.songDetailContainer}>
                <View style={styles.songInfoRowModern}>
                  <Ionicons
                    name="disc-outline"
                    size={18}
                    color="#00bcd4"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.songDetailText}>
                    <Text style={styles.boldText}>Género:</Text>{" "}
                    {selectedSongDetail?.genre || "No especificado"}
                  </Text>
                </View>

                <View style={styles.songInfoRowModern}>
                  <Ionicons
                    name="musical-note-outline"
                    size={18}
                    color="#00bcd4"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.songDetailText}>
                    <Text style={styles.boldText}>Tono (Key):</Text>{" "}
                    {getKeyLabel(selectedSongDetail?.key)}
                  </Text>
                </View>

                <View style={styles.songInfoRowModern}>
                  <Ionicons
                    name="speedometer-outline"
                    size={18}
                    color="#00bcd4"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.songDetailText}>
                    <Text style={styles.boldText}>Tempo:</Text>{" "}
                    {selectedSongDetail?.tempo
                      ? `${selectedSongDetail.tempo} BPM`
                      : "No especificado"}
                  </Text>
                </View>

                <View style={styles.songInfoRowModern}>
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color="#00bcd4"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.songDetailText}>
                    <Text style={styles.boldText}>Duración:</Text>{" "}
                    {selectedSongDetail?.duration || "No especificada"}
                  </Text>
                </View>

                {selectedSongDetail?.pdf_url && (
                  <TouchableOpacity
                    style={styles.consultPdfButton}
                    onPress={() => handleOpenPdf(selectedSongDetail.pdf_url)}
                  >
                    <Ionicons
                      name="document-text-outline"
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

      {/* MODAL DE CONFIRMACIÓN PARA BORRAR EVENTO */}
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
                onPress={confirmDeleteEvent}
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
    marginBottom: 12,
  },
  cardAddModule: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    borderWidth: 2,
    marginBottom: 12,
  },
  cardAddModuleTitle: {
    fontSize: 18,
    fontWeight: "bold",
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
    position: "relative",
  },
  dayCellEmpty: { width: "14%", aspectRatio: 1.0 },
  cellEnsayo: { borderColor: "#00bcd4", backgroundColor: "#122a2e" },
  cellActuacion: { borderColor: "#ff9800", backgroundColor: "#3a2512" },
  cellOtro: { borderColor: "#fff", backgroundColor: "#121212" },
  dayCellSelected: {
    backgroundColor: "#4a4a4a",
    borderWidth: 1,
    borderColor: "#616161",
  },
  dayText: { color: "#ccc", fontSize: 14 },
  todayCellText: { color: "#9e9e9e", fontWeight: "bold", fontSize: 22 },
  todayUnderlineBar: {
    position: "absolute",
    bottom: 3,
    width: "55%",
    height: 2.5,
    backgroundColor: "#ffffff",
    borderRadius: 2,
  },
  dayTextSelected: { color: "#ffffff", fontWeight: "bold" },
  cardTitleEvents: {
    fontSize: 18,
    fontWeight: "bold",
  },
  subSectionTitle: {
    fontSize: 16,
    color: "#bbb",
    fontWeight: "bold",
    marginBottom: 8,
    marginTop: 12,
  },
  estimatedDurationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "#121212",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  estimatedDurationText: {
    fontSize: 14,
    color: "#aaa",
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
    borderColor: "#ffffff",
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
    color: "#ffffff",
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
    marginBottom: 6,
    marginTop: 8,
  },
  addSongIconButtonWhite: {
    backgroundColor: "#ffffff",
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  addSongButtonTextUnified: {
    color: "#000000",
    fontSize: 13,
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
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  reorderSongText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  rowActionsRight: {
    flexDirection: "row",
    width: 110,
    justifyContent: "space-between",
    alignItems: "center",
  },
  miniActionButton: {
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButton: {
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
    borderWidth: 1,
  },
  modalTitleWhite: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
  },
  modalTitle: {
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
  updateTimeButtonWhite: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  updateTimeButtonWhiteText: {
    color: "#000000",
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
  modalSongItemChecked: {
    borderColor: "#2a2a2a",
    backgroundColor: "#122a2e",
  },
  modalSongTitle: { color: "#fff", fontWeight: "bold", fontSize: 17 },
  modalSongMeta: { color: "#aaa", fontSize: 14, marginTop: 3 },
  modalSongMetaLarge: { color: "#bbb", fontSize: 15, marginTop: 3 },
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
    backgroundColor: "#ff9800",
    padding: 14,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
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
  modalCloseButtonDynamic: {
    padding: 14,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseButtonDynamicText: {
    color: "#000000",
    fontWeight: "bold",
    fontSize: 15,
  },
  miniEventBadge: {
    backgroundColor: "#121212",
    padding: 14,
    borderRadius: 6,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  eventHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  miniEventName: { color: "#fff", fontWeight: "bold", fontSize: 17 },
  miniEventTime: { fontSize: 15, fontWeight: "600", color: "#ffffff" },
  eventTypeLabelText: { fontSize: 14, fontWeight: "bold" },
  emptyText: {
    color: "#777",
    textAlign: "center",
    fontStyle: "italic",
    padding: 12,
    fontSize: 15,
  },
  songDetailContainer: {
    marginVertical: 5,
  },
  songDetailTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  songDetailAuthor: {
    fontSize: 17,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 14,
  },
  songInfoRowModern: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  songDetailText: {
    color: "#ddd",
    fontSize: 16,
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
  iconButtonAction: {
    padding: 6,
  },
});
