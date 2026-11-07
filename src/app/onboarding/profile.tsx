import { supabase } from "@/services/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
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

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Datos del formulario de registro y perfil
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [instrument, setInstrument] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Estado para el mensaje flotante (Toast)
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Subida opcional de Avatar usando FileSystem Legacy
  const handlePickAndUploadAvatar = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showToast("Se necesitan permisos para acceder a la galería");
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (
        pickerResult.canceled ||
        !pickerResult.assets ||
        pickerResult.assets.length === 0
      ) {
        return;
      }

      setUploadingImage(true);
      const imageUri = pickerResult.assets[0].uri;

      const fileExt = imageUri.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `avatar_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const base64Data = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, byteArray, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const newAvatarUrl = publicData.publicUrl;
      setAvatarUrl(`${newAvatarUrl}?t=${Date.now()}`);
      showToast("¡Avatar subido con éxito!");
    } catch (error: any) {
      console.error("Error en la subida del avatar:", error);
      showToast("Error al subir la imagen.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRegisterAndSaveProfile = async () => {
    // Validaciones obligatorias
    if (!email.trim() || !password) {
      showToast("El correo y la contraseña son obligatorios");
      return;
    }
    if (!fullName.trim()) {
      showToast("El nombre completo es obligatorio");
      return;
    }

    try {
      setLoading(true);

      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });

      if (authError) throw authError;

      const user = authData.user;
      if (!user) throw new Error("No se pudo crear el usuario.");

      // 2. Guardar los datos en la tabla profiles incluyendo el email
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        email: email.trim(),
        full_name: fullName.trim(),
        instrument: instrument.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl ? avatarUrl.split("?")[0] : null,
      });

      if (profileError) throw profileError;

      showToast("¡Registro completado con éxito!");
      setTimeout(() => {
        router.push("/dashboard" as any);
      }, 1000);
    } catch (error: any) {
      console.error("Error en el registro:", error);
      showToast(error.message || "No se pudo completar el registro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
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

      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>👤 Registro de Cuenta</Text>

        <View style={{ alignItems: "center", marginBottom: 20 }}>
          <TouchableOpacity
            style={styles.logoContainerModal}
            onPress={handlePickAndUploadAvatar}
            disabled={uploadingImage}
          >
            {uploadingImage ? (
              <ActivityIndicator size="small" color="#00bcd4" />
            ) : avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.logoImg} />
            ) : (
              <Text style={styles.logoFallback}>🎸</Text>
            )}
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={16} color="#000" />
            </View>
          </TouchableOpacity>
          <Text style={styles.tipText}>
            Toca para añadir tu foto (opcional)
          </Text>
        </View>

        <Text style={styles.label}>Correo electrónico *:</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="tucorreo@email.com"
          placeholderTextColor="#666"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Contraseña *:</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            value={password}
            onChangeText={setPassword}
            placeholder="Mínimo 6 caracteres"
            placeholderTextColor="#666"
            secureTextEntry={!showPassword}
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

        <Text style={styles.label}>Nombre completo *:</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Tu nombre y apellidos"
          placeholderTextColor="#666"
        />

        <Text style={styles.label}>Instrumento principal (opcional):</Text>
        <TextInput
          style={styles.input}
          value={instrument}
          onChangeText={setInstrument}
          placeholder="Ej. Guitarra, Batería..."
          placeholderTextColor="#666"
        />

        <Text style={styles.label}>Biografía (opcional):</Text>
        <TextInput
          style={[styles.input, { height: 90, textAlignVertical: "top" }]}
          value={bio}
          onChangeText={setBio}
          placeholder="Cuéntanos algo sobre ti..."
          placeholderTextColor="#666"
          multiline
        />

        <TouchableOpacity
          style={[styles.modalCloseButtonSave, loading && { opacity: 0.7 }]}
          onPress={handleRegisterAndSaveProfile}
          disabled={loading}
        >
          <Text style={styles.modalCloseButtonSaveText}>
            {loading ? "Registrando..." : "Completar Registro"}
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
    padding: 20,
    justifyContent: "center",
  },
  toastContainer: {
    backgroundColor: "#1e1e1e",
    borderWidth: 1,
    borderColor: "#00bcd4",
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    alignSelf: "center",
    width: "100%",
  },
  toastText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  cardHeader: {
    backgroundColor: "#1e1e1e",
    borderRadius: 14,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ff9800",
    marginBottom: 20,
    textAlign: "center",
  },
  logoContainerModal: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#121212",
    borderWidth: 2,
    borderColor: "#00bcd4",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
  },
  logoImg: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  logoFallback: {
    fontSize: 40,
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#00bcd4",
    padding: 6,
    borderTopLeftRadius: 10,
  },
  tipText: {
    color: "#aaa",
    fontSize: 13,
    marginTop: 6,
  },
  label: {
    fontSize: 15,
    color: "#ccc",
    marginBottom: 6,
    marginTop: 10,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    fontSize: 16,
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
    padding: 12,
    color: "#fff",
    fontSize: 16,
  },
  eyeButton: {
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseButtonSave: {
    backgroundColor: "#ff9800",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  modalCloseButtonSaveText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 16,
  },
});
