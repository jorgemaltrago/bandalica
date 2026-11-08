import { supabase } from "@/services/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Linking,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const ADMIN_EMAIL = "jorgemaltrago@gmail.com";

export default function AdminDashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Pestañas del Admin: 'passwords' | 'activations' | 'users' | 'bands'
  const [adminTab, setAdminTab] = useState("passwords");

  // Datos
  const [passwordRequests, setPasswordRequests] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allBands, setAllBands] = useState<any[]>([]);

  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingPendingUsers, setLoadingPendingUsers] = useState(false);
  const [loadingAllUsers, setLoadingAllUsers] = useState(false);
  const [loadingBands, setLoadingBands] = useState(false);

  // Estados para Modales de Acción
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Modal de Contraseñas (Amarillo)
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [tempPassword, setTempPassword] = useState("");

  // Modal de Activación de Usuario (Turquesa)
  const [isActivationModalVisible, setIsActivationModalVisible] =
    useState(false);

  // Modal de Borrado (Rojo)
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deleteType, setDeleteType] = useState<
    "user" | "band" | "password_request" | null
  >(null);

  // Mensaje flotante (Toast)
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  useEffect(() => {
    verifyAdminAndLoadData();
  }, []);

  const verifyAdminAndLoadData = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || user.email !== ADMIN_EMAIL) {
        showToast("Acceso no autorizado.");
        router.replace("/dashboard" as any);
        return;
      }
      loadAllAdminData();
    } catch (error: any) {
      console.error("Error de verificación:", error.message);
      router.replace("/dashboard" as any);
    } finally {
      setLoading(false);
    }
  };

  const loadAllAdminData = async () => {
    fetchPasswordRequests();
    fetchPendingUsers();
    fetchAllUsers();
    fetchAllBands();
  };

  const fetchPasswordRequests = async () => {
    setLoadingRequests(true);
    try {
      const { data, error } = await supabase
        .from("password_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPasswordRequests(data || []);
    } catch (error: any) {
      console.error("Error cargando peticiones:", error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchPendingUsers = async () => {
    setLoadingPendingUsers(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_active", false)
        .neq("email", ADMIN_EMAIL);

      if (error) throw error;
      setPendingUsers(data || []);
    } catch (error: any) {
      console.error("Error cargando usuarios pendientes:", error);
    } finally {
      setLoadingPendingUsers(false);
    }
  };

  const fetchAllUsers = async () => {
    setLoadingAllUsers(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });

      if (error) throw error;
      setAllUsers(data || []);
    } catch (error: any) {
      console.error("Error cargando todos los usuarios:", error);
    } finally {
      setLoadingAllUsers(false);
    }
  };

  const fetchAllBands = async () => {
    setLoadingBands(true);
    try {
      const { data, error } = await supabase
        .from("bands")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setAllBands(data || []);
    } catch (error: any) {
      console.error("Error cargando bandas:", error);
    } finally {
      setLoadingBands(false);
    }
  };

  const handleOpenPasswordModal = (item: any) => {
    setSelectedItem(item);
    const randomPass = Math.random().toString(36).substring(2, 10);
    setTempPassword(randomPass);
    setIsPasswordModalVisible(true);
  };

  const handleFulfillPasswordRequest = async () => {
    if (!selectedItem) return;

    try {
      const { error } = await supabase
        .from("password_requests")
        .update({ status: "resolved" })
        .eq("id", selectedItem.id);

      if (error) throw error;

      setIsPasswordModalVisible(false);
      showToast("Petición marcada como resuelta.");
      fetchPasswordRequests();

      if (selectedItem.phone) {
        const cleanPhone = selectedItem.phone.replace(/[^0-9]/g, "");
        const message = encodeURIComponent(
          `¡Hola! Desde Bandalica te hemos generado una contraseña provisional para tu cuenta (${selectedItem.email}): *${tempPassword}*. Te recomendamos cambiarla al entrar.`,
        );
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${message}`;

        Linking.openURL(whatsappUrl).catch((err) => {
          console.error("No se pudo abrir WhatsApp:", err);
          showToast("Petición resuelta, pero no se pudo abrir WhatsApp.");
        });
      } else {
        showToast(
          "Petición resuelta (El usuario no indicó teléfono para WhatsApp).",
        );
      }
    } catch (error: any) {
      showToast(error.message || "Error al procesar la petición.");
    }
  };

  const handleOpenActivationModal = (user: any) => {
    setSelectedItem(user);
    setIsActivationModalVisible(true);
  };

  const handleConfirmActivation = async () => {
    if (!selectedItem) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: true })
        .eq("id", selectedItem.id);

      if (error) throw error;

      setIsActivationModalVisible(false);
      showToast(`¡Usuario ${selectedItem.full_name} activado con éxito!`);
      loadAllAdminData();
    } catch (error: any) {
      showToast(error.message || "No se pudo activar el usuario.");
    }
  };

  const handleOpenDeleteModal = (
    item: any,
    type: "user" | "band" | "password_request",
  ) => {
    setSelectedItem(item);
    setDeleteType(type);
    setIsDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedItem || !deleteType) return;

    try {
      if (deleteType === "user") {
        const { error } = await supabase
          .from("profiles")
          .delete()
          .eq("id", selectedItem.id);
        if (error) throw error;
        showToast("Usuario eliminado correctamente.");
      } else if (deleteType === "band") {
        const { error } = await supabase
          .from("bands")
          .delete()
          .eq("id", selectedItem.id);
        if (error) throw error;
        showToast("Banda eliminada correctamente.");
      } else if (deleteType === "password_request") {
        const { error } = await supabase
          .from("password_requests")
          .delete()
          .eq("id", selectedItem.id);
        if (error) throw error;
        showToast("Petición de contraseña eliminada.");
        fetchPasswordRequests();
      }

      setIsDeleteModalVisible(false);
      loadAllAdminData();
    } catch (error: any) {
      showToast(error.message || "Error al eliminar el elemento.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
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

      {/* CABECERA */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/dashboard" as any)}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Panel de Administración</Text>
      </View>

      {/* PESTAÑAS DE NAVEGACIÓN (ALTURA FIJA Y COMPACTA CON SCROLL HORIZONTAL) */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          <TouchableOpacity
            style={[
              styles.tabButton,
              adminTab === "passwords" && styles.tabActiveYellow,
            ]}
            onPress={() => setAdminTab("passwords")}
          >
            <Ionicons
              name="key-outline"
              size={16}
              color={adminTab === "passwords" ? "#000" : "#ff9800"}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabText,
                adminTab === "passwords" && styles.tabTextActiveBlack,
              ]}
            >
              Contraseñas ({passwordRequests.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              adminTab === "activations" && styles.tabActiveTurquoise,
            ]}
            onPress={() => setAdminTab("activations")}
          >
            <Ionicons
              name="person-add-outline"
              size={16}
              color={adminTab === "activations" ? "#000" : "#00bcd4"}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabText,
                adminTab === "activations" && styles.tabTextActiveBlack,
              ]}
            >
              Activaciones ({pendingUsers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              adminTab === "users" && styles.tabActiveWhite,
            ]}
            onPress={() => setAdminTab("users")}
          >
            <Ionicons
              name="people-outline"
              size={16}
              color={adminTab === "users" ? "#000" : "#fff"}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabText,
                adminTab === "users" && styles.tabTextActiveBlack,
              ]}
            >
              Usuarios ({allUsers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              adminTab === "bands" && styles.tabActiveWhite,
            ]}
            onPress={() => setAdminTab("bands")}
          >
            <Ionicons
              name="radio-outline"
              size={16}
              color={adminTab === "bands" ? "#000" : "#fff"}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabText,
                adminTab === "bands" && styles.tabTextActiveBlack,
              ]}
            >
              Bandas ({allBands.length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ========================================================== */}
      {/* PESTAÑA 1: CONTRASEÑAS */}
      {/* ========================================================== */}
      {adminTab === "passwords" && (
        <View style={styles.cardSection}>
          <Text style={[styles.sectionTitle, { color: "#ff9800" }]}>
            🔑 Peticiones de Contraseña
          </Text>
          {loadingRequests ? (
            <ActivityIndicator color="#ff9800" style={{ marginVertical: 20 }} />
          ) : passwordRequests.length === 0 ? (
            <Text style={styles.emptyText}>No hay peticiones pendientes.</Text>
          ) : (
            passwordRequests.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.itemTitle}>{item.email}</Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 4,
                    }}
                  >
                    <Ionicons
                      name="logo-whatsapp"
                      size={15}
                      color="#25D366"
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={{
                        color: "#25D366",
                        fontSize: 13,
                        fontWeight: "600",
                      }}
                    >
                      WhatsApp: {item.phone || "No especificado"}
                    </Text>
                  </View>
                  <Text style={styles.itemDate}>
                    Fecha: {new Date(item.created_at).toLocaleString()}
                  </Text>
                </View>

                {/* BOTONES DE ACCIÓN: GESTIONAR + PAPELERA */}
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <TouchableOpacity
                    style={[
                      styles.btnAction,
                      { backgroundColor: "#ff9800", marginRight: 8 },
                    ]}
                    onPress={() => handleOpenPasswordModal(item)}
                  >
                    <Text style={styles.btnActionTextDark}>Gestionar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.btnActionIcon,
                      { backgroundColor: "#ff5252" },
                    ]}
                    onPress={() =>
                      handleOpenDeleteModal(item, "password_request")
                    }
                  >
                    <Ionicons name="trash-outline" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* ========================================================== */}
      {/* PESTAÑA 2: ACTIVACIONES */}
      {/* ========================================================== */}
      {adminTab === "activations" && (
        <View style={styles.cardSection}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons
              name="person-add-outline"
              size={18}
              color="#00bcd4"
              style={{ marginRight: 8 }}
            />
            <Text
              style={[
                styles.sectionTitle,
                { color: "#00bcd4", marginBottom: 0 },
              ]}
            >
              Usuarios Pendientes de Activar
            </Text>
          </View>
          {loadingPendingUsers ? (
            <ActivityIndicator color="#00bcd4" style={{ marginVertical: 20 }} />
          ) : pendingUsers.length === 0 ? (
            <Text style={styles.emptyText}>
              No hay usuarios esperando activación.
            </Text>
          ) : (
            pendingUsers.map((user) => (
              <View key={user.id} style={styles.itemCard}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.itemTitle}>
                    {user.full_name || "Sin nombre"}
                  </Text>
                  <Text style={styles.itemSubtitle}>{user.email}</Text>
                  <Text style={styles.itemDate}>
                    Instrumento: {user.instrument || "No especificado"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.btnAction, { backgroundColor: "#00bcd4" }]}
                  onPress={() => handleOpenActivationModal(user)}
                >
                  <Text style={styles.btnActionTextDark}>Activar</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      )}

      {/* ========================================================== */}
      {/* PESTAÑA 3: USUARIOS */}
      {/* ========================================================== */}
      {adminTab === "users" && (
        <View style={styles.cardSection}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons
              name="people-outline"
              size={18}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text
              style={[styles.sectionTitle, { color: "#fff", marginBottom: 0 }]}
            >
              Usuarios
            </Text>
          </View>
          {loadingAllUsers ? (
            <ActivityIndicator color="#fff" style={{ marginVertical: 20 }} />
          ) : allUsers.length === 0 ? (
            <Text style={styles.emptyText}>No hay usuarios registrados.</Text>
          ) : (
            allUsers.map((user) => (
              <View key={user.id} style={styles.itemCard}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.itemTitle}>
                    {user.full_name || "Sin nombre"}
                  </Text>
                  <Text style={styles.itemSubtitle}>{user.email}</Text>
                  <Text
                    style={{
                      color: user.is_active ? "#00bcd4" : "#ff9800",
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    {user.is_active ? "● Activo" : "○ Pendiente"}{" "}
                    {user.email === ADMIN_EMAIL ? "(Admin)" : ""}
                  </Text>
                </View>
                {user.email !== ADMIN_EMAIL && (
                  <TouchableOpacity
                    style={[
                      styles.btnActionIcon,
                      { backgroundColor: "#ff5252" },
                    ]}
                    onPress={() => handleOpenDeleteModal(user, "user")}
                  >
                    <Ionicons name="trash-outline" size={16} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      )}

      {/* ========================================================== */}
      {/* PESTAÑA 4: BANDAS */}
      {/* ========================================================== */}
      {adminTab === "bands" && (
        <View style={styles.cardSection}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons
              name="radio-outline"
              size={18}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text
              style={[styles.sectionTitle, { color: "#fff", marginBottom: 0 }]}
            >
              Bandas
            </Text>
          </View>
          {loadingBands ? (
            <ActivityIndicator color="#fff" style={{ marginVertical: 20 }} />
          ) : allBands.length === 0 ? (
            <Text style={styles.emptyText}>No hay bandas creadas.</Text>
          ) : (
            allBands.map((band) => (
              <View key={band.id} style={styles.itemCard}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.itemTitle}>{band.name}</Text>
                  <Text style={styles.itemSubtitle}>
                    Género: {band.genre || "No especificado"}
                  </Text>
                  <Text style={styles.itemDate}>
                    Código: {band.invite_code}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.btnActionIcon, { backgroundColor: "#ff5252" }]}
                  onPress={() => handleOpenDeleteModal(band, "band")}
                >
                  <Ionicons name="trash-outline" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      )}

      {/* ========================================================== */}
      {/* MODAL 1: GESTIÓN DE CONTRASEÑA Y WHATSAPP */}
      {/* ========================================================== */}
      <Modal visible={isPasswordModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { borderColor: "#ff9800" }]}>
            <View style={{ alignItems: "center", marginBottom: 10 }}>
              <Ionicons name="logo-whatsapp" size={38} color="#25D366" />
            </View>
            <Text style={[styles.modalTitle, { color: "#ff9800" }]}>
              Enviar Contraseña por WhatsApp
            </Text>
            <Text style={styles.modalDesc}>
              Se enviará la siguiente clave provisional al número{" "}
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                {selectedItem?.phone}
              </Text>
              :
            </Text>

            <View style={styles.tempPassContainer}>
              <Text style={styles.tempPassText}>{tempPassword}</Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 15,
              }}
            >
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor: "#333",
                    borderWidth: 1,
                    borderColor: "#666",
                  },
                ]}
                onPress={() => setIsPasswordModalVisible(false)}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#25D366" }]}
                onPress={handleFulfillPasswordRequest}
              >
                <Text style={{ color: "#000", fontWeight: "bold" }}>
                  Enviar WhatsApp
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================== */}
      {/* MODAL 2: ACTIVAR USUARIO */}
      {/* ========================================================== */}
      <Modal
        visible={isActivationModalVisible}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { borderColor: "#00bcd4" }]}>
            <View style={{ alignItems: "center", marginBottom: 10 }}>
              <Ionicons name="person-add" size={38} color="#00bcd4" />
            </View>
            <Text style={[styles.modalTitle, { color: "#00bcd4" }]}>
              Activar Usuario
            </Text>
            <Text style={styles.modalDesc}>
              ¿Deseas permitir el acceso a{" "}
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                {selectedItem?.full_name}
              </Text>{" "}
              ({selectedItem?.email})?
            </Text>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 15,
              }}
            >
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor: "#333",
                    borderWidth: 1,
                    borderColor: "#666",
                  },
                ]}
                onPress={() => setIsActivationModalVisible(false)}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#00bcd4" }]}
                onPress={handleConfirmActivation}
              >
                <Text style={{ color: "#000", fontWeight: "bold" }}>
                  Confirmar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================== */}
      {/* MODAL 3: ELIMINAR / DESTRUCTIVO */}
      {/* ========================================================== */}
      <Modal visible={isDeleteModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { borderColor: "#ff5252" }]}>
            <View style={{ alignItems: "center", marginBottom: 10 }}>
              <Ionicons name="warning-outline" size={38} color="#ff5252" />
            </View>
            <Text style={[styles.modalTitle, { color: "#ff5252" }]}>
              Confirmar Eliminación
            </Text>
            <Text style={styles.modalDesc}>
              ¿Estás seguro de que deseas eliminar{" "}
              {deleteType === "user"
                ? "al usuario"
                : deleteType === "band"
                  ? "la banda"
                  : "la petición de contraseña de"}{" "}
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                {selectedItem?.full_name ||
                  selectedItem?.name ||
                  selectedItem?.email}
              </Text>
              ? Esta acción no se puede deshacer.
            </Text>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 15,
              }}
            >
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor: "#333",
                    borderWidth: 1,
                    borderColor: "#666",
                  },
                ]}
                onPress={() => setIsDeleteModalVisible(false)}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#ff5252" }]}
                onPress={handleConfirmDelete}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  Eliminar
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
  container: { padding: 16, backgroundColor: "#121212", flexGrow: 1 },
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
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  backButton: {
    padding: 8,
    backgroundColor: "#222",
    borderRadius: 8,
    marginRight: 12,
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },

  // Pestañas con scroll horizontal de altura fija y compacta
  tabsWrapper: {
    height: 52,
    marginBottom: 20,
  },
  tabsContainer: {
    alignItems: "center",
    paddingVertical: 4,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e1e",
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  tabActiveYellow: { backgroundColor: "#ff9800", borderColor: "#ff9800" },
  tabActiveTurquoise: { backgroundColor: "#00bcd4", borderColor: "#00bcd4" },
  tabActiveWhite: { backgroundColor: "#fff", borderColor: "#fff" },
  tabText: { color: "#ccc", fontSize: 13, fontWeight: "600" },
  tabTextActiveBlack: { color: "#000", fontWeight: "bold" },

  cardSection: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 15 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  emptyText: {
    color: "#777",
    fontSize: 14,
    textAlign: "center",
    marginVertical: 20,
  },
  itemCard: {
    backgroundColor: "#181818",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  itemTitle: { color: "#fff", fontSize: 15, fontWeight: "bold" },
  itemSubtitle: { color: "#aaa", fontSize: 13, marginTop: 2 },
  itemDate: { color: "#666", fontSize: 11, marginTop: 4 },

  btnAction: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    flexGrow: 0,
    flexShrink: 0,
  },
  btnActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    flexGrow: 0,
    flexShrink: 0,
  },
  btnActionTextDark: { color: "#000", fontWeight: "bold", fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1.5,
    width: "85%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  modalDesc: {
    color: "#aaa",
    fontSize: 13,
    marginBottom: 15,
    textAlign: "center",
  },
  tempPassContainer: {
    backgroundColor: "#121212",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ff9800",
    alignItems: "center",
    marginBottom: 10,
  },
  tempPassText: {
    color: "#ff9800",
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  modalBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
  },
});
