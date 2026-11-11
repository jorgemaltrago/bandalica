import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import LogoImg from "../assets/logo.png";

const ADMIN_EMAIL = "jorgemaltrago@gmail.com";

export default function WelcomeScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Estados para el Modal de Aviso Emergente
  const [isWarningModalVisible, setIsWarningModalVisible] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");

  // Estados para el Modal de Recuperación de Contraseña
  const [isForgotPasswordModalVisible, setIsForgotPasswordModalVisible] =
    useState(false);
  const [recoveryPhone, setRecoveryPhone] = useState("");
  const [submittingRecovery, setSubmittingRecovery] = useState(false);

  // Estados para el Modal de Política de Uso
  const [isPolicyModalVisible, setIsPolicyModalVisible] = useState(false);

  const showAlertModal = (msg: string) => {
    setWarningMessage(msg);
    setIsWarningModalVisible(true);
  };

  useEffect(() => {
    if (Platform.OS !== "web") {
      checkActiveSession();
    }
  }, []);

  const checkActiveSession = async () => {
    try {
      const { supabase } = await import("@/services/supabase");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session && session.user) {
        if (session.user.email !== ADMIN_EMAIL) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("is_active")
            .eq("id", session.user.id)
            .single();

          if (profileData && profileData.is_active === false) {
            await supabase.auth.signOut();
            return;
          }
        }
        router.replace("/dashboard" as any);
      }
    } catch (error) {
      console.log("Error al comprobar sesión activa:", error);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      showAlertModal("Por favor, introduce tu correo y contraseña.");
      return;
    }

    setLoading(true);
    try {
      const { supabase } = await import("@/services/supabase");
      const trimmedEmail = email.trim().toLowerCase();

      // 1. Autenticar con Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: password,
      });

      if (error) throw error;

      const user = data.user;
      if (!user) throw new Error("No se pudo obtener el usuario.");

      // 2. Comprobar si está activo en la tabla profiles
      if (trimmedEmail !== ADMIN_EMAIL) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("is_active")
          .eq("id", user.id)
          .single();

        if (profileError || !profileData || profileData.is_active !== true) {
          await supabase.auth.signOut();
          showAlertModal(
            "Tu cuenta está pendiente de activación. Espera a que el administrador te active para poder entrar.",
          );
          return;
        }
      }

      router.replace("/dashboard" as any);
    } catch (error: any) {
      showAlertModal(error.message || "Credenciales incorrectas.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForgotPasswordModal = () => {
    if (!email.trim()) {
      showAlertModal(
        "Por favor, introduce primero tu correo electrónico arriba para solicitar la recuperación.",
      );
      return;
    }
    setRecoveryPhone("");
    setIsForgotPasswordModalVisible(true);
  };

  const handleConfirmForgotPassword = async () => {
    if (recoveryPhone.length < 9) {
      showAlertModal(
        "Por favor, introduce los 9 dígitos de tu número de teléfono.",
      );
      return;
    }

    try {
      setSubmittingRecovery(true);
      const { supabase } = await import("@/services/supabase");

      const fullPhone = "+34" + recoveryPhone;

      const { error } = await supabase.from("password_requests").insert([
        {
          email: email.trim().toLowerCase(),
          phone: fullPhone,
          status: "pending",
        },
      ]);

      if (error) throw error;

      setIsForgotPasswordModalVisible(false);
      showAlertModal(
        "Petición enviada con éxito. El administrador revisará tu solicitud y te contactará por WhatsApp con una contraseña provisional.",
      );
    } catch (error: any) {
      showAlertModal(error.message || "No se pudo registrar la petición.");
    } finally {
      setSubmittingRecovery(false);
    }
  };

  const handleGoToRegister = () => {
    router.push("/onboarding/profile" as any);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.logoSection}>
        <Image source={LogoImg} style={styles.logo} resizeMode="contain" />
        <Text style={styles.appSubtitle}>Gestiona tu banda</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔑 Iniciar Sesión</Text>

        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          placeholderTextColor="#666"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Contraseña"
            placeholderTextColor="#666"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={20}
              color="#888"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, loading && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? "Entrando..." : "Entrar"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.forgotPasswordContainer}
          onPress={handleOpenForgotPasswordModal}
        >
          <Text style={styles.forgotPasswordText}>
            ¿Has olvidado tu contraseña?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerLinkContainer}
          onPress={handleGoToRegister}
        >
          <Text style={styles.registerLinkText}>
            ¿No tienes cuenta?{" "}
            <Text style={styles.registerLinkHighlight}>Regístrate aquí</Text>
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.creditsSection}>
        <Text style={styles.authorText}>
          Jorge Martín Cabello{"\n"}© 2026. Todos los derechos reservados.
        </Text>
        <Text style={styles.testModeText}>Bandalica V1.1</Text>

        {/* ENLACE A POLÍTICA DE USO */}
        <TouchableOpacity
          style={{ marginTop: 10 }}
          onPress={() => setIsPolicyModalVisible(true)}
        >
          <Text style={styles.policyLinkText}>
            Política de Uso y Aviso Legal
          </Text>
        </TouchableOpacity>
      </View>

      {/* MODAL DE POLÍTICA DE USO */}
      <Modal visible={isPolicyModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "80%" }]}>
            <View style={{ alignItems: "center", marginBottom: 8 }}>
              <Ionicons
                name="document-text-outline"
                size={38}
                color="#00bcd4"
              />
            </View>
            <Text style={[styles.modalTitle, { color: "#00bcd4" }]}>
              Política de Uso y Aviso Legal
            </Text>

            <ScrollView style={{ marginBottom: 15, maxHeight: 300 }}>
              <Text style={styles.policySectionHeader}>
                1. Naturaleza Privada
              </Text>
              <Text style={styles.policyText}>
                Bandalica es una aplicación privada, de carácter particular y no
                comercial, desarrollada y mantenida por Jorge Martín Cabello. No
                tiene fin lucrativo ni se encuentra distribuida en tiendas
                comerciales. Su uso está limitado exclusivamente al autor y a su
                círculo íntimo de colaboradores y músicos.
              </Text>

              <Text style={styles.policySectionHeader}>
                2. Exoneración de Responsabilidad
              </Text>
              <Text style={styles.policyText}>
                • El uso de la aplicación y el registro de datos, eventos,
                repertorios o notas se realiza de forma voluntaria y bajo la
                responsabilidad exclusiva del usuario.{"\n\n"}• El desarrollador
                no garantiza la disponibilidad ininterrumpida del servicio ni se
                hace responsable por la pérdida de datos, fallos en el sistema,
                caídas de la base de datos o incidencias técnicas de cualquier
                índole.{"\n\n"}• Al tratarse de una herramienta particular, el
                creador no asume ningún tipo de responsabilidad legal, civil o
                económica ante los usuarios o terceros por inconvenientes
                derivados de su utilización.
              </Text>

              <Text style={styles.policySectionHeader}>3. Aceptación</Text>
              <Text style={styles.policyText}>
                El acceso y uso de Bandalica implica la aceptación expresa de
                esta política y el reconocimiento de la naturaleza privada de la
                herramienta.
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: "#00bcd4" }]}
              onPress={() => setIsPolicyModalVisible(false)}
            >
              <Text style={[styles.modalBtnText, { color: "#000" }]}>
                Entendido
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE RECUPERACIÓN DE CONTRASEÑA */}
      <Modal
        visible={isForgotPasswordModalVisible}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ alignItems: "center", marginBottom: 10 }}>
              <Ionicons name="logo-whatsapp" size={38} color="#25D366" />
            </View>
            <Text style={[styles.modalTitle, { color: "#ff9800" }]}>
              Recuperar Contraseña
            </Text>
            <Text style={styles.modalDesc}>
              Introduce tus 9 dígitos de teléfono. El sistema añadirá el +34
              automáticamente para enviarte la clave por WhatsApp.
            </Text>

            <Text style={styles.inputLabel}>Tu Teléfono / WhatsApp:</Text>

            <View style={styles.phoneInputContainer}>
              <Text style={styles.prefixFixedText}>+34</Text>
              <View style={styles.phoneDivider} />
              <TextInput
                style={styles.phoneField}
                placeholder="600123456"
                placeholderTextColor="#666"
                value={recoveryPhone}
                onChangeText={(text) => {
                  const numericOnly = text.replace(/[^0-9]/g, "").slice(0, 9);
                  setRecoveryPhone(numericOnly);
                }}
                keyboardType="phone-pad"
                maxLength={9}
              />
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 20,
              }}
            >
              <TouchableOpacity
                style={[
                  styles.modalBtnAction,
                  {
                    backgroundColor: "#333",
                    borderWidth: 1,
                    borderColor: "#666",
                  },
                ]}
                onPress={() => setIsForgotPasswordModalVisible(false)}
                disabled={submittingRecovery}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnAction, { backgroundColor: "#ff9800" }]}
                onPress={handleConfirmForgotPassword}
                disabled={submittingRecovery}
              >
                <Text style={{ color: "#000", fontWeight: "bold" }}>
                  Enviar Petición
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE AVISO / ALERTA EMERGENTE GENERAL */}
      <Modal visible={isWarningModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ alignItems: "center", marginBottom: 10 }}>
              <Ionicons name="alert-circle-outline" size={42} color="#ff9800" />
            </View>
            <Text style={[styles.modalTitle, { color: "#ff9800" }]}>Aviso</Text>
            <Text style={styles.modalDesc}>{warningMessage}</Text>

            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: "#ff9800" }]}
              onPress={() => setIsWarningModalVisible(false)}
            >
              <Text style={styles.modalBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#121212",
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 16,
  },
  logo: {
    width: 125,
    height: 125,
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 16,
    color: "#00bcd4",
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 1,
  },
  card: {
    width: "100%",
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 18,
    borderWidth: 1.5,
    borderColor: "#fff",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 21,
    fontWeight: "bold",
    color: "#ff9800",
    marginBottom: 14,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 14,
    color: "#fff",
    fontSize: 16,
    marginBottom: 12,
  },
  phoneInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#ff9800",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  prefixFixedText: {
    color: "#ff9800",
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 8,
  },
  phoneDivider: {
    width: 1,
    height: 22,
    backgroundColor: "#333",
    marginRight: 8,
  },
  phoneField: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    paddingVertical: 14,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    color: "#fff",
    fontSize: 16,
  },
  eyeButton: {
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#ff9800",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "bold",
  },
  forgotPasswordContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  forgotPasswordText: {
    color: "#ff9800",
    fontSize: 14.5,
    textDecorationLine: "underline",
  },
  registerLinkContainer: {
    alignItems: "center",
    marginTop: 4,
  },
  registerLinkText: {
    color: "#aaa",
    fontSize: 15.5,
  },
  registerLinkHighlight: {
    color: "#00bcd4",
    fontWeight: "bold",
  },
  creditsSection: {
    alignItems: "center",
    paddingHorizontal: 8,
  },
  authorText: {
    fontSize: 14,
    color: "#777",
    textAlign: "center",
    lineHeight: 20,
  },
  testModeText: {
    fontSize: 13,
    color: "#00bcd4",
    textAlign: "center",
    marginTop: 4,
    fontWeight: "600",
  },
  policyLinkText: {
    fontSize: 13.5,
    color: "#00bcd4",
    textAlign: "center",
    textDecorationLine: "underline",
    fontWeight: "600",
  },
  policySectionHeader: {
    color: "#00bcd4",
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 4,
  },
  policyText: {
    color: "#ccc",
    fontSize: 13,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 24,
    borderWidth: 1.5,
    borderColor: "#ff9800",
    width: "88%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  modalDesc: {
    color: "#aaa",
    fontSize: 13.5,
    marginBottom: 20,
    textAlign: "center",
    lineHeight: 19,
  },
  inputLabel: {
    color: "#ccc",
    fontSize: 13,
    marginBottom: 4,
  },
  modalBtn: {
    backgroundColor: "#ff9800",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    width: "100%",
    justifyContent: "center",
  },
  modalBtnText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
  modalBtnAction: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
  },
});
