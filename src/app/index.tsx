import { supabase } from "@/services/supabase";
import { Ionicons } from "@expo/vector-icons";
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

import LogoImg from "../assets/logo.png";

export default function WelcomeScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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
    router.push("/onboarding/profile" as any);
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
              size={24}
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
    width: 140,
    height: 140,
    marginBottom: 10,
  },
  appSubtitle: {
    fontSize: 22, // 50% más grande (aprox de 15 a 22.5)
    color: "#00bcd4", // Color turquesa solicitado para Gestiona tu banda
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 1,
  },
  card: {
    width: "100%",
    backgroundColor: "#1e1e1e",
    borderRadius: 14,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "#fff", // Borde del recuadro cambiado a blanco
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 27, // 50% más grande (de 18 a 27)
    fontWeight: "bold",
    color: "#ff9800",
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 14,
    color: "#fff",
    fontSize: 22, // Tipografía del input un 50% más grande (de 14/15 a 22)
    marginBottom: 14,
  },
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
    padding: 14,
    color: "#fff",
    fontSize: 22, // Tipografía del input un 50% más grande (de 15 a 22.5)
  },
  eyeButton: {
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#ff9800",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 14,
  },
  primaryButtonText: {
    color: "#000",
    fontSize: 24, // 50% más grande (de 16 a 24)
    fontWeight: "bold",
  },
  registerLinkContainer: {
    alignItems: "center",
    marginTop: 6,
  },
  registerLinkText: {
    color: "#aaa",
    fontSize: 21, // 50% más grande (de 14 a 21)
  },
  registerLinkHighlight: {
    color: "#00bcd4",
    fontWeight: "bold",
  },
  creditsSection: {
    alignItems: "center",
    paddingHorizontal: 10,
  },
  authorText: {
    fontSize: 20, // 50% más grande (de 13 a 19.5 -> 20)
    color: "#777",
    textAlign: "center",
    lineHeight: 26,
  },
});
