import { supabase } from "@/services/supabase";
import { Ionicons } from "@expo/vector-icons"; // 👈 1. Importado para el icono del ojito
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Importamos tu logotipo oficial desde la carpeta assets
import LogoImg from "../assets/logo.png";

export default function WelcomeScreen() {
  const router = useRouter();

  // Estados para el inicio de sesión directo
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // 👈 2. Estado para mostrar/ocultar la contraseña
  const [loading, setLoading] = useState(false);

  // Función para iniciar sesión directamente
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
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) throw error;

      // 💡 3. Si el login es exitoso, redirigimos al dashboard del usuario
      router.push("/dashboard" as any);
    } catch (error: any) {
      Alert.alert(
        "Error de acceso",
        error.message || "Credenciales incorrectas.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoToRegister = () => {
    // Te lleva al flujo completo de registro de perfil
    router.push("/onboarding/profile");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Sección del Logotipo Principal */}
      <View style={styles.logoSection}>
        <Image source={LogoImg} style={styles.logo} resizeMode="contain" />
        <Text style={styles.appSubtitle}>Gestiona tu banda</Text>
      </View>

      {/* Formulario de Login Directo */}
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

        {/* 👁️ Campo de contraseña con el botón del ojito integrado */}
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

        {/* Enlace para registrarse si no tiene cuenta */}
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

      {/* Créditos de Autoría y Copyright */}
      <View style={styles.creditsSection}>
        <Text style={styles.authorText}>
          Aplicación realizada por Jorge Martín Cabello, copyright 2026. Todos
          los derechos reservados.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#121212",
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 10,
  },
  appSubtitle: {
    fontSize: 16,
    color: "#e91e63",
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  card: {
    width: "100%",
    backgroundColor: "#1e1e1e",
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 30,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    fontSize: 14,
    marginBottom: 14,
  },
  // 👁️ Nuevos estilos para el contenedor del input de contraseña + el ojito
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    marginBottom: 14,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    color: "#fff",
    fontSize: 14,
  },
  eyeButton: {
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#e91e63",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 14,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  registerLinkContainer: {
    alignItems: "center",
    marginTop: 6,
  },
  registerLinkText: {
    color: "#aaa",
    fontSize: 13,
  },
  registerLinkHighlight: {
    color: "#e91e63",
    fontWeight: "bold",
  },
  creditsSection: {
    alignItems: "center",
    paddingHorizontal: 10,
  },
  authorText: {
    fontSize: 13,
    color: "#b0b0b0",
    textAlign: "center",
    lineHeight: 18,
  },
});
