import { supabase } from "@/services/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

export default function TabLayout() {
  // 1. El layout recibe los parámetros iniciales enviados desde el Dashboard
  const params = useLocalSearchParams();
  const bandId = (params.bandId as string) || "";
  const userId = (params.userId as string) || "";

  const [bandName, setBandName] = useState<string>("BANDA");

  useEffect(() => {
    if (bandId) {
      fetchBandNameFromDB();
    }
  }, [bandId]);

  const fetchBandNameFromDB = async () => {
    try {
      const { data, error } = await supabase
        .from("bands")
        .select("name")
        .eq("id", bandId)
        .single();

      if (!error && data?.name) {
        setBandName(data.name.toUpperCase());
      }
    } catch (e) {
      console.error("Error al obtener el nombre de la banda:", e);
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
          height: 80,
          paddingTop: 10,
          paddingBottom: 5,
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
          fontSize: 16,
          color: "#ffffff",
        },
        headerTitleAlign: "center",
        headerTitle: bandName,
        tabBarStyle: {
          backgroundColor: "#1e1e1e",
          borderTopColor: "#333",
          height: 100,
          paddingBottom: 30,
          paddingTop: 3,
        },
        // Color activo cambiado a azul turquesa en lugar de rojo
        tabBarActiveTintColor: "#00bcd4",
        tabBarInactiveTintColor: "#888",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginBottom: 4,
        },
      }}
    >
      {/* 2. Forzamos mediante 'href' que cada pestaña mantenga y arrastre el bandId y userId */}
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
