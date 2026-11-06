import { supabase } from "@/services/supabase";
import { useRouter } from "expo-router";
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

export default function DashboardScreen() {
  const router = useRouter();
  const [bands, setBands] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal para crear banda
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [newBandName, setNewBandName] = useState("");
  const [newBandGenre, setNewBandGenre] = useState("");

  // Modal para insertar código de invitación / unirse a banda
  const [isCodeModalVisible, setIsCodeModalVisible] = useState(false);
  const [inviteCode, setInviteCode] = useState("");

  useEffect(() => {
    loadUserDataAndBands();
  }, []);

  // 1. Cargar información de autenticación, perfil del usuario y sus bandas
  const loadUserDataAndBands = async () => {
    try {
      setLoading(true);

      // A. Obtener usuario autenticado actual
      const { data: authData, error: authError } =
        await supabase.auth.getUser();
      if (authError) throw authError;

      const user = authData?.user;
      if (!user) {
        router.replace("/login" as any);
        return;
      }
      setCurrentUser(user);

      // B. Obtener información extendida del perfil (Nombre, Rol, etc. desde tu tabla 'profiles')
      // Nota: Si tu tabla se llama diferente (ej: 'users'), cambia el nombre en el .from()
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profileError && profileData) {
        setUserProfile(profileData);
      }

      // C. Obtener bandas mediante la tabla intermedia 'band_members'
      const { data: memberBands, error: bandError } = await supabase
        .from("band_members")
        .select(
          `
          band_id,
          bands (*)
        `,
        )
        .eq("user_id", user.id);

      if (bandError) throw bandError;

      if (memberBands) {
        const userBands = memberBands
          .map((item: any) => item.bands)
          .filter(Boolean);
        setBands(userBands);
      }
    } catch (error: any) {
      console.error("Error al cargar el dashboard:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Crear una nueva banda
  const handleCreateBand = async () => {
    if (!newBandName.trim()) {
      Alert.alert("Campo obligatorio", "Introduce el nombre de la banda.");
      return;
    }

    try {
      if (!currentUser) return;

      const { data: createdBand, error: bandError } = await supabase
        .from("bands")
        .insert([
          {
            name: newBandName.trim(),
            genre: newBandGenre.trim() || null,
            created_by: currentUser.id,
          },
        ])
        .select()
        .single();

      if (bandError) throw bandError;

      if (createdBand) {
        const { error: memberError } = await supabase
          .from("band_members")
          .insert([
            {
              band_id: createdBand.id,
              user_id: currentUser.id,
              role: "admin",
            },
          ]);

        if (memberError && memberError.code !== "23505") {
          throw memberError;
        }
      }

      Alert.alert("¡Éxito!", "Banda creada correctamente.");
      setNewBandName("");
      setNewBandGenre("");
      setIsCreateModalVisible(false);
      loadUserDataAndBands();
    } catch (error: any) {
      Alert.alert("Error al crear la banda", error.message);
    }
  };

  // 3. Unirse a una banda mediante código de invitación
  const handleJoinByCode = async () => {
    if (!inviteCode.trim()) {
      Alert.alert("Campo obligatorio", "Introduce el código de invitación.");
      return;
    }

    try {
      const { data: bandData, error: bandError } = await supabase
        .from("bands")
        .select("id, name")
        .eq("invite_code", inviteCode.trim())
        .single();

      if (bandError || !bandData) {
        Alert.alert(
          "Error",
          "El código introducido no es válido o la banda no existe.",
        );
        return;
      }

      const { error: joinError } = await supabase.from("band_members").insert([
        {
          band_id: bandData.id,
          user_id: currentUser.id,
          role: "member",
        },
      ]);

      if (joinError) {
        if (joinError.code === "23505") {
          Alert.alert("Aviso", "Ya formas parte de esta banda.");
        } else {
          throw joinError;
        }
      } else {
        Alert.alert(
          "¡Bienvenido!",
          `Te has unido a la banda: ${bandData.name}`,
        );
        setInviteCode("");
        setIsCodeModalVisible(false);
        loadUserDataAndBands();
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  // 4. Navegación pasando el bandId y el userId hacia el layout de pestañas
  const handleSelectBand = (bandId: string) => {
    if (!currentUser) {
      Alert.alert("Aviso", "No se encontró el usuario actual.");
      return;
    }

    router.push({
      pathname: "/tabs/band-info",
      params: {
        bandId: bandId,
        userId: currentUser.id,
      },
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* SECCIÓN: INFORMACIÓN DETALLADA DEL USUARIO */}
      <View style={styles.userCard}>
        <Text style={styles.welcomeText}>👤 Perfil de Usuario</Text>
        <Text style={styles.userName}>
          {userProfile?.name ||
            userProfile?.full_name ||
            "Nombre no especificado"}
        </Text>
        <Text style={styles.userEmail}>
          {currentUser?.email || "Cargando correo..."}
        </Text>
        <View style={styles.roleContainer}>
          <Text style={styles.userRoleLabel}>Rol / Cargo:</Text>
          <Text style={styles.userRoleValue}>
            {userProfile?.role || userProfile?.instrument || "Músico / Miembro"}
          </Text>
        </View>
      </View>

      <Text style={styles.headerTitle}>🎸 Mis Bandas</Text>

      {/* BOTONERA DE ACCIONES (Crear banda e Insertar código) */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={[styles.primaryButton, { flex: 1, marginRight: 6 }]}
          onPress={() => setIsCreateModalVisible(true)}
        >
          <Text style={styles.primaryButtonText}>➕ Crear Banda</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, { flex: 1, marginLeft: 6 }]}
          onPress={() => setIsCodeModalVisible(true)}
        >
          <Text style={styles.secondaryButtonText}>🔑 Insertar Código</Text>
        </TouchableOpacity>
      </View>

      {/* LISTA DE BANDAS */}
      {loading ? (
        <Text style={styles.loadingText}>Cargando bandas...</Text>
      ) : bands.length === 0 ? (
        <Text style={styles.emptyText}>
          Todavía no perteneces a ninguna banda.
        </Text>
      ) : (
        bands.map((band) => (
          <TouchableOpacity
            key={band.id}
            style={styles.bandCard}
            onPress={() => handleSelectBand(band.id)}
          >
            <Text style={styles.bandName}>{band.name}</Text>
            <Text style={styles.bandGenre}>
              Género: {band.genre || "No especificado"}
            </Text>
          </TouchableOpacity>
        ))
      )}

      {/* MODAL PARA CREAR BANDA */}
      <Modal visible={isCreateModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Crear Nueva Banda</Text>

            <TextInput
              style={styles.input}
              placeholder="Nombre de la banda *"
              placeholderTextColor="#666"
              value={newBandName}
              onChangeText={setNewBandName}
            />
            <TextInput
              style={styles.input}
              placeholder="Género musical (Ej: Rock, Metal)"
              placeholderTextColor="#666"
              value={newBandGenre}
              onChangeText={setNewBandGenre}
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleCreateBand}
            >
              <Text style={styles.primaryButtonText}>💾 Guardar Banda</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setIsCreateModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL PARA INSERTAR CÓDIGO */}
      <Modal visible={isCodeModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Unirse a Banda por Código</Text>

            <TextInput
              style={styles.input}
              placeholder="Introduce el código de invitación"
              placeholderTextColor="#666"
              value={inviteCode}
              onChangeText={setInviteCode}
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleJoinByCode}
            >
              <Text style={styles.primaryButtonText}>🚀 Unirme a la Banda</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setIsCodeModalVisible(false)}
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
  userCard: {
    backgroundColor: "#1e1e1e",
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 20,
    marginTop: 10,
  },
  welcomeText: {
    color: "#888",
    fontSize: 11,
    marginBottom: 4,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  userName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 2,
  },
  userEmail: { color: "#aaa", fontSize: 13, marginBottom: 8 },
  roleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#2a2a2a",
    paddingTop: 8,
  },
  userRoleLabel: { color: "#888", fontSize: 12, marginRight: 6 },
  userRoleValue: { color: "#e91e63", fontSize: 12, fontWeight: "bold" },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  primaryButton: {
    backgroundColor: "#e91e63",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  secondaryButton: {
    backgroundColor: "#333",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#444",
  },
  secondaryButtonText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  loadingText: { color: "#888", textAlign: "center", marginTop: 20 },
  emptyText: {
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 20,
  },
  bandCard: {
    backgroundColor: "#1e1e1e",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 10,
  },
  bandName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  bandGenre: { color: "#aaa", fontSize: 12 },
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
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#e91e63",
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 8,
    color: "#fff",
    fontSize: 12,
    marginBottom: 10,
  },
  modalCloseButton: {
    backgroundColor: "#333",
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 6,
  },
  modalCloseButtonText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
});
