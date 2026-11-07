import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
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

  // Comprobar si ya hay una sesión activa de forma segura (dinámica)
  useEffect(() => {
    if (Platform.OS !== "web") {
      checkActiveSession();
    }
  }, []);

  const checkActiveSession = async () => {
    try {
      // Importamos dinámicamente Supabase solo cuando el componente corre en el dispositivo
      const { supabase } = await import("@/services/supabase");
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        router.replace("/dashboard" as any);
      }
    } catch (error) {
      console.log("Error al comprobar sesión activa:", error);
    }
  };

  // Función de Iniciar Sesión
  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert(
        "Campos requeridos",
        "Por favor, introduce tu correo y contraseña.",
      );
      return;
    }

    setLoading(true);
    try {
      const { supabase } = await import("@/services/supabase");
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) throw error;

      if (data.user?.email === ADMIN_EMAIL) {
        Alert.alert(
          "¡Bienvenido, Administrador!",
          "Entrando a tu panel de control.",
        );
      }

      router.replace("/dashboard" as any);
    } catch (error: any) {
      Alert.alert(
        "Error de acceso",
        error.message || "Credenciales incorrectas.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Función para que un usuario pida restablecer su contraseña
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert(
        "Correo requerido",
        "Por favor, introduce tu correo electrónico en el campo de arriba para enviar la petición al administrador.",
      );
      return;
    }

    try {
      const { supabase } = await import("@/services/supabase");
      const { error } = await supabase
        .from("password_requests")
        .insert([{ email: email.trim(), status: "pending" }]);

      if (error) throw error;

      Alert.alert(
        "Petición enviada",
        "Se ha registrado tu solicitud. El administrador revisará la petición y te enviará una nueva contraseña.",
      );
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message ||
          "No se pudo registrar la petición de restablecimiento.",
      );
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
              size={17}
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

        {/* Botón de solicitar recuperación al admin */}
        <TouchableOpacity
          style={styles.forgotPasswordContainer}
          onPress={handleForgotPassword}
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
          Jorge Martín Cabello © 2026. Todos los derechos reservados.
        </Text>
        <Text style={styles.testModeText}>Aplicación en modo pruebas</Text>
      </View>
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
    marginBottom: 12,
  },
  logo: {
    width: 90,
    height: 90,
    marginBottom: 6,
  },
  appSubtitle: {
    fontSize: 15,
    color: "#00bcd4",
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 1,
  },
  card: {
    width: "100%",
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#fff",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: "bold",
    color: "#ff9800",
    marginBottom: 12,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 10,
    color: "#fff",
    fontSize: 15,
    marginBottom: 10,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    marginBottom: 10,
  },
  passwordInput: {
    flex: 1,
    padding: 10,
    color: "#fff",
    fontSize: 15,
  },
  eyeButton: {
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#ff9800",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  primaryButtonText: {
    color: "#000",
    fontSize: 17,
    fontWeight: "bold",
  },
  forgotPasswordContainer: {
    alignItems: "center",
    marginBottom: 10,
  },
  forgotPasswordText: {
    color: "#ff9800",
    fontSize: 13.5,
    textDecorationLine: "underline",
  },
  registerLinkContainer: {
    alignItems: "center",
    marginTop: 2,
  },
  registerLinkText: {
    color: "#aaa",
    fontSize: 14.5,
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
    fontSize: 13,
    color: "#777",
    textAlign: "center",
    lineHeight: 18,
  },
  testModeText: {
    fontSize: 12,
    color: "#00bcd4",
    textAlign: "center",
    marginTop: 4,
    fontStyle: "italic",
  },
});
