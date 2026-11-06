//const params = useLocalSearchParams();
//const bandId = (params.bandId as string) || "";
//const userId = (params.userId as string) || "";

import { supabase } from "@/services/supabase";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

export default function BandInfoScreen() {
  const params = useLocalSearchParams();
  const bandId = (params.bandId as string) || "";

  // Estado para almacenar la información de la banda traída de Supabase
  const [bandData, setBandData] = useState({
    name: "Cargando...",
    genre: "Cargando...",
    bio: "",
    invite_code: "",
    logo_url: "",
  });

  const [loading, setLoading] = useState(true);

  // Consulta directa a Supabase al abrir la pantalla usando el bandId
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

      if (!error && data) {
        setBandData({
          name: data.name || "Banda sin nombre",
          genre: data.genre || "Rock",
          bio: data.bio || "",
          invite_code: data.invite_code || "",
          logo_url: data.logo_url || "",
        });
      }
    } catch (e) {
      console.error("Error al obtener los detalles de la banda:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Cabecera / Logotipo de la Banda */}
      <View style={styles.card}>
        <View style={styles.logoContainer}>
          {bandData.logo_url ? (
            <Image source={{ uri: bandData.logo_url }} style={styles.logoImg} />
          ) : (
            <Text style={styles.logoFallback}>🎸</Text>
          )}
        </View>

        <Text style={styles.bandTitle}>{bandData.name}</Text>
        <Text style={styles.bandGenre}>Género: {bandData.genre}</Text>
      </View>

      {/* Información y biografía */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📖 Biografía</Text>
        <Text style={styles.bioText}>
          {bandData.bio
            ? bandData.bio
            : "Esta banda aún no ha añadido una biografía."}
        </Text>
      </View>

      {/* Código de invitación */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🔑 Código de Invitación</Text>
        <Text style={styles.codeText}>
          {bandData.invite_code || "No disponible"}
        </Text>
        <Text style={styles.codeHint}>
          Comparte este código con otros músicos para que puedan unirse a la
          formación.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#121212",
    padding: 20,
  },
  card: {
    backgroundColor: "#1e1e1e",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 16,
    alignItems: "center",
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#e91e63",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 12,
  },
  logoImg: {
    width: "100%",
    height: "100%",
  },
  logoFallback: {
    fontSize: 34,
  },
  bandTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 4,
  },
  bandGenre: {
    fontSize: 14,
    color: "#e91e63",
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#e91e63",
    marginBottom: 10,
    alignSelf: "flex-start",
  },
  bioText: {
    fontSize: 13,
    color: "#ccc",
    lineHeight: 20,
    alignSelf: "flex-start",
  },
  codeText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    backgroundColor: "#121212",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    overflow: "hidden",
    marginBottom: 6,
  },
  codeHint: {
    fontSize: 11,
    color: "#777",
    textAlign: "center",
  },
});
