import { supabase } from "@/services/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function MembersScreen() {
  const params = useLocalSearchParams();
  const bandId = (params.bandId as string) || "";
  const userId = (params.userId as string) || "";

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [bandCreatorId, setBandCreatorId] = useState<string | null>(null);

  useEffect(() => {
    if (bandId) {
      loadBandDataAndMembers();
    } else {
      setLoading(false);
    }
  }, [bandId]);

  const loadBandDataAndMembers = async () => {
    try {
      setLoading(true);

      const activeUserId =
        userId || (await supabase.auth.getUser()).data.user?.id || null;

      if (!activeUserId) return;

      // 1. Consultar la tabla 'bands' para saber quién es el creador de la banda
      const { data: bandData, error: bandError } = await supabase
        .from("bands")
        .select("created_by")
        .eq("id", bandId)
        .single();

      if (bandError) throw bandError;
      const creatorId = bandData?.created_by || null;
      setBandCreatorId(creatorId);

      // 2. Cargar los miembros de la banda haciendo un JOIN con la tabla 'profiles'
      const { data: membersData, error: membersError } = await supabase
        .from("band_members")
        .select(
          `
          id,
          role,
          user_id,
          profiles (
            id,
            full_name,
            avatar_url
          )
        `,
        )
        .eq("band_id", bandId);

      if (membersError) throw membersError;

      if (membersData) {
        const formattedMembers = membersData.map((m: any) => ({
          id: m.id, // ID del registro en band_members
          userId: m.user_id,
          name: m.profiles?.full_name || "Músico sin nombre",
          role: m.role || "Miembro",
          // Identificamos visualmente si este miembro es el creador
          isCreator: m.user_id === creatorId,
        }));
        setMembers(formattedMembers);

        // 3. Comprobar si el usuario actual es admin o el creador de esta banda
        const currentUserMember = membersData.find(
          (m: any) => m.user_id === activeUserId,
        );

        if (
          (currentUserMember && currentUserMember.role === "admin") ||
          activeUserId === creatorId
        ) {
          setIsUserAdmin(true);
        } else {
          setIsUserAdmin(false);
        }
      }
    } catch (error: any) {
      console.error("Error al cargar miembros:", error);
      Alert.alert("Error", "No se pudieron cargar los miembros de la banda.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = (
    membershipId: string,
    memberName: string,
    isCreator: boolean,
  ) => {
    if (isCreator) {
      Alert.alert(
        "Acción no permitida",
        "No se puede dar de baja al creador de la banda.",
      );
      return;
    }

    Alert.alert(
      "Dar de baja",
      `¿Estás seguro de que quieres dar de baja a ${memberName} de la banda?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Dar de baja",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("band_members")
                .delete()
                .eq("id", membershipId);

              if (error) throw error;

              setMembers(members.filter((m) => m.id !== membershipId));
              Alert.alert("Éxito", "El miembro ha sido dado de baja.");
            } catch (error: any) {
              Alert.alert(
                "Error",
                error.message || "No se pudo dar de baja al miembro.",
              );
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#e91e63" />
        <Text style={{ color: "#aaa", marginTop: 10 }}>
          Cargando músicos...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {members.length === 0 ? (
        <Text style={styles.emptyText}>
          No hay miembros registrados en esta banda todavía.
        </Text>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            // Un miembro solo se puede borrar si:
            // 1. El usuario actual es admin (o creador)
            // 2. El elemento de la lista NO es el creador de la banda
            const canDelete = isUserAdmin && !item.isCreator;

            return (
              <View style={styles.memberCard}>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.memberName}>{item.name}</Text>
                    {item.isCreator && (
                      <View style={styles.creatorBadge}>
                        <Text style={styles.creatorBadgeText}>Creador</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.memberRole}>Rol: {item.role}</Text>
                </View>

                {/* Mostramos el botón de borrar solo si cumple las reglas de permisos */}
                {canDelete && (
                  <TouchableOpacity
                    onPress={() =>
                      handleRemoveMember(item.id, item.name, item.isCreator)
                    }
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ff4444" />
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212", padding: 16 },
  memberCard: {
    backgroundColor: "#1e1e1e",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  memberName: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  creatorBadge: {
    backgroundColor: "#e91e63",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  creatorBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  memberRole: { color: "#888", fontSize: 14 },
  deleteButton: { padding: 8 },
  emptyText: {
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 20,
  },
});
