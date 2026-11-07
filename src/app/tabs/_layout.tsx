import { supabase } from "@/services/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";

export default function TabLayout() {
  const params = useLocalSearchParams();
  const bandId = (params.bandId as string) || "";
  const userId = (params.userId as string) || "";

  const [bandName, setBandName] = useState<string>("BANDA");
  const [bandLogo, setBandLogo] = useState<string | null>(null);

  useEffect(() => {
    if (bandId) {
      fetchBandDetailsFromDB();
    }
  }, [bandId]);

  const fetchBandDetailsFromDB = async () => {
    try {
      const { data, error } = await supabase
        .from("bands")
        .select("name, logo_url")
        .eq("id", bandId)
        .single();

      if (!error && data) {
        if (data.name) setBandName(data.name.toUpperCase());
        if (data.logo_url) setBandLogo(data.logo_url);
      }
    } catch (e) {
      console.error("Error al obtener los detalles de la banda:", e);
    }
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: "#121212",
          borderBottomWidth: 1,
          borderBottomColor: "#222",
          height: 85,
        },
        headerTintColor: "#fff",
        // Personalizamos el título de la cabecera con la imagen a la izquierda y el nombre a la derecha
        headerTitle: () => (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {bandLogo ? (
              <Image source={{ uri: bandLogo }} style={styles.headerLogo} />
            ) : (
              <View style={styles.headerLogoPlaceholder}>
                <Ionicons name="musical-notes" size={18} color="#00bcd4" />
              </View>
            )}
            <Text style={styles.headerTitleText} numberOfLines={1}>
              {bandName}
            </Text>
          </View>
        ),
        headerTitleAlign: "center",
        tabBarStyle: {
          backgroundColor: "#1e1e1e",
          borderTopColor: "#333",
          height: 100,
          paddingBottom: 30,
          paddingTop: 3,
        },
        tabBarActiveTintColor: "#00bcd4",
        tabBarInactiveTintColor: "#888",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginBottom: 4,
        },
      }}
    >
      <Tabs.Screen
        name="band-info"
        options={{
          title: "Banda",
          href: {
            pathname: "/tabs/band-info",
            params: { bandId, userId },
          },
          tabBarIcon: ({ color }) => (
            <Ionicons name="musical-notes" size={36} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendario",
          href: {
            pathname: "/tabs/calendar",
            params: { bandId, userId },
          },
          tabBarIcon: ({ color }) => (
            <Ionicons name="calendar" size={36} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="repertory"
        options={{
          title: "Repertorio",
          href: {
            pathname: "/tabs/repertory",
            params: { bandId, userId },
          },
          tabBarIcon: ({ color }) => (
            <Ionicons name="mic" size={36} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          title: "Miembros",
          href: {
            pathname: "/tabs/members",
            params: { bandId, userId },
          },
          tabBarIcon: ({ color }) => (
            <Ionicons name="people" size={36} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  );
}

const styles = {
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#00bcd4",
    marginRight: 10,
  },
  headerLogoPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1e1e1e",
    borderWidth: 1.5,
    borderColor: "#00bcd4kval",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: 10,
  },
  headerTitleText: {
    fontWeight: "bold" as const,
    fontSize: 16,
    color: "#ffffff",
    letterSpacing: 0.5,
  },
};
