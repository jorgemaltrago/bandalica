import { supabase } from "@/services/supabase";
import { Ionicons } from "@expo/vector-icons"; // 👈 1. Importante para el icono del ojito
import * as ImagePicker from "expo-image-picker";
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

export default function ProfileScreen() {
  const router = useRouter();

  // Estados del perfil
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // 👈 2. Estado para mostrar/ocultar contraseña
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [instrument, setInstrument] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  // Función para seleccionar la imagen del teléfono
  const handlePickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        "Permiso denegado",
        "Necesitamos acceso a tus fotos para subir un avatar.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  // Función para subir la imagen a Supabase Storage
  const uploadAvatarToSupabase = async (
    uri: string,
    userId: string,
  ): Promise<string | null> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split(".").pop() || "jpg";
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, blob, { upsert: true });

      if (uploadError) {
        console.error("Error en upload de Supabase:", uploadError);
        return null;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error("Error procesando la imagen:", error);
      return null;
    }
  };

  const handleRegisterUser = async () => {
    if (!fullName.trim()) {
      Alert.alert(
        "Campo obligatorio",
        "Por favor, introduce tu nombre y apellido.",
      );
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      Alert.alert(
        "Correo obligatorio",
        "Por favor, introduce un correo electrónico válido.",
      );
      return;
    }

    if (!password || password.length < 6) {
      Alert.alert(
        "Contraseña obligatoria",
        "La contraseña debe tener al menos 6 caracteres.",
      );
      return;
    }

    setLoading(true);

    try {
      // 1. Registrar al usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });

      if (authError) throw authError;

      const userId = authData.user?.id;

      if (userId) {
        let publicAvatarUrl = "";

        // 2. Si el usuario eligió un avatar, intentamos subirlo
        if (avatarUri) {
          const uploadedUrl = await uploadAvatarToSupabase(avatarUri, userId);
          if (uploadedUrl) {
            publicAvatarUrl = uploadedUrl;
          }
        }

        // 3. Guardar los datos en la tabla public.profiles
        const { error: profileError } = await supabase.from("profiles").insert([
          {
            id: userId,
            email: email.trim(),
            full_name: fullName.trim(),
            instrument: instrument.trim() || "Sin especificar",
            phone: phone.trim() || "",
            avatar_url: publicAvatarUrl,
          },
        ]);

        if (profileError) throw profileError;
      }

      // 💡 4. Redirección limpia al Index (pantalla de inicio/login)
      Alert.alert(
        "¡Cuenta creada con éxito!",
        "Por favor, inicia sesión con tu correo y contraseña para continuar.",
        [
          {
            text: "Entrar",
            onPress: () => {
              router.replace("/" as any); // Esto te manda directo al index
            },
          },
        ],
      );
    } catch (error: any) {
      Alert.alert(
        "Error en el registro",
        error.message || "Ocurrió un error inesperado.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>👤 Perfil del Músico</Text>
        <Text style={styles.cardHint}>
          Introduce tus datos. La foto de perfil es opcional y podrás añadirla o
          cambiarla más adelante:
        </Text>

        {/* Selector de Avatar */}
        <View style={styles.avatarContainer}>
          <TouchableOpacity
            style={styles.avatarPicker}
            onPress={handlePickImage}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarPlaceholderText}>📷 + Foto</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.avatarLabel}>Foto de perfil (Opcional)</Text>
        </View>

        <Text style={styles.label}>Nombre y Apellido *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Juan Pérez"
          placeholderTextColor="#666"
          value={fullName}
          onChangeText={setFullName}
        />

        <Text style={styles.label}>Correo Electrónico *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: juan@email.com"
          placeholderTextColor="#666"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        {/* 👁️ Campo de Contraseña con el Botón del Ojito */}
        <Text style={styles.label}>Contraseña * (Mín. 6 caracteres)</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="••••••••"
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

        <Text style={styles.label}>Instrumento / Voz (Opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Guitarra Solista / Vocalista"
          placeholderTextColor="#666"
          value={instrument}
          onChangeText={setInstrument}
        />

        <Text style={styles.label}>Teléfono de Contacto (Opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: +34 600 000 000"
          placeholderTextColor="#666"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        <TouchableOpacity
          style={[styles.primaryButton, loading && { opacity: 0.7 }]}
          onPress={handleRegisterUser}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? "Registrando perfil..." : "Crear Cuenta"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#121212",
    padding: 24,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#1e1e1e",
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#e91e63",
    marginBottom: 6,
  },
  cardHint: {
    fontSize: 13,
    color: "#888",
    marginBottom: 20,
    lineHeight: 18,
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatarPicker: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 6,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholderText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  avatarLabel: {
    fontSize: 12,
    color: "#aaa",
  },
  label: {
    fontSize: 13,
    color: "#ccc",
    marginBottom: 6,
    fontWeight: "600",
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
  // 👁️ Estilos específicos para el contenedor de la contraseña con el ojito
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
    marginTop: 10,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
});
