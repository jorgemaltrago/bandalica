import { supabase } from "@/services/supabase";
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

export default function BandSelectionScreen() {
  const router = useRouter();

  const [step, setStep] = useState<"menu" | "create" | "join">("menu");
  const [loading, setLoading] = useState(false);

  // Campos de la banda
  const [name, setName] = useState("");
  const [genre, setGenre] = useState("");
  const [bio, setBio] = useState("");
  const [founded, setFounded] = useState("");
  const [city, setCity] = useState("");
  const [bandLogo, setBandLogo] = useState("");

  // Código de invitación
  const [inviteCode, setInviteCode] = useState("");

  const handlePickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "Permiso denegado",
        "Se necesitan permisos para acceder a la galería de fotos.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setBandLogo(result.assets[0].uri);
    }
  };

  // --- CREAR BANDA EN SUPABASE ---
  const handleCreateBand = async () => {
    if (!name.trim()) {
      Alert.alert(
        "Campo obligatorio",
        "Por favor, introduce al menos el nombre de la banda.",
      );
      return;
    }

    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay usuario autenticado.");

      const generatedCode = `BAND-${name.toUpperCase().replace(/\s+/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
      let logoUrl = "";

      // 1. Subir imagen a Supabase Storage si se seleccionó una
      if (bandLogo) {
        const response = await fetch(bandLogo);
        const blob = await response.blob();
        const fileExt = bandLogo.split(".").pop() || "jpg";
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `band-logos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("band-logos") // Asegúrate de tener este bucket creado en Supabase
          .upload(filePath, blob);

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from("band-logos")
            .getPublicUrl(filePath);
          logoUrl = publicUrlData.publicUrl;
        }
      }

      // 2. Insertar la banda en la tabla 'bands'
      const { data: bandData, error: bandError } = await supabase
        .from("bands")
        .insert([
          {
            name: name.trim(),
            genre: genre.trim() || "Rock / Metal",
            bio: bio.trim(),
            invite_code: generatedCode,
            logo_url: logoUrl,
            created_by: user.id,
          },
        ])
        .select()
        .single();

      if (bandError) throw bandError;

      // 3. Vincular al usuario como miembro de la banda en 'band_members'
      const { error: memberError } = await supabase
        .from("band_members")
        .insert([
          {
            band_id: bandData.id,
            user_id: user.id,
            role: "admin",
          },
        ]);

      if (memberError) throw memberError;

      Alert.alert("¡Banda creada!", `Código de invitación: ${generatedCode}`);

      // Redirigir pasando el bandId real a las pestañas
      router.replace({
        pathname: "/tabs/band-info",
        params: { bandId: bandData.id },
      });
    } catch (error: any) {
      Alert.alert("Error", error.message || "No se pudo crear la banda.");
    } finally {
      setLoading(false);
    }
  };

  // --- UNIRSE A BANDA MEDIANTE CÓDIGO ---
  const handleJoinBand = async () => {
    if (!inviteCode.trim()) {
      Alert.alert(
        "Código obligatorio",
        "Por favor, introduce el código de invitación de la banda.",
      );
      return;
    }

    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay usuario autenticado.");

      // 1. Buscar la banda por su código de invitación
      const { data: bandData, error: bandError } = await supabase
        .from("bands")
        .select("id, name")
        .eq("invite_code", inviteCode.trim())
        .single();

      if (bandError || !bandData) {
        throw new Error(
          "No se ha encontrado ninguna banda con ese código de invitación.",
        );
      }

      // 2. Insertar al usuario en 'band_members'
      const { error: memberError } = await supabase
        .from("band_members")
        .insert([
          {
            band_id: bandData.id,
            user_id: user.id,
            role: "member",
          },
        ]);

      if (memberError) {
        if (memberError.code === "23505") {
          // Ya es miembro, permitimos entrar directamente
        } else {
          throw memberError;
        }
      }

      Alert.alert(
        "¡Bienvenido!",
        `Te has unido correctamente a ${bandData.name}`,
      );

      router.replace({
        pathname: "/tabs/band-info",
        params: { bandId: bandData.id },
      });
    } catch (error: any) {
      Alert.alert("Error", error.message || "No se pudo unir a la banda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headerTitle}>🎸 Configuración de la Banda</Text>

      {/* --- MENÚ DE ELECCIÓN --- */}
      {step === "menu" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>¿Cómo deseas continuar?</Text>
          <Text style={styles.cardHint}>
            Crea una nueva banda con su historia y logotipo cuadrado, o
            introduce el código de invitación.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setStep("create")}
          >
            <Text style={styles.primaryButtonText}>➕ Crear una Banda</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setStep("join")}
          >
            <Text style={styles.secondaryButtonText}>
              🔑 Introducir Código de Invitación
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* --- CREAR BANDA --- */}
      {step === "create" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Datos de la Banda</Text>
          <Text style={styles.cardHint}>
            Introduce la información detallada:
          </Text>

          <Text style={styles.label}>
            Logotipo de la Banda (Formato Cuadrado)
          </Text>
          <TouchableOpacity
            style={styles.imagePickerButton}
            onPress={handlePickImage}
          >
            {bandLogo ? (
              <Image source={{ uri: bandLogo }} style={styles.previewImage} />
            ) : (
              <Text style={styles.imagePickerText}>
                🖼️ Seleccionar imagen cuadrada
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>Nombre de la Banda *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Bandálica Rock"
            placeholderTextColor="#666"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Género Musical</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Rock / Metal"
            placeholderTextColor="#666"
            value={genre}
            onChangeText={setGenre}
          />

          <Text style={styles.label}>Año de Fundación</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 2026"
            placeholderTextColor="#666"
            keyboardType="numeric"
            value={founded}
            onChangeText={setFounded}
          />

          <Text style={styles.label}>Ciudad</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Utrera, Sevilla"
            placeholderTextColor="#666"
            value={city}
            onChangeText={setCity}
          />

          <Text style={styles.label}>Biografía / Historia</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Escribe la historia o biografía de la banda..."
            placeholderTextColor="#666"
            multiline={true}
            numberOfLines={4}
            value={bio}
            onChangeText={setBio}
          />

          <TouchableOpacity
            style={[styles.primaryButton, loading && { opacity: 0.7 }]}
            onPress={handleCreateBand}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading
                ? "Guardando en Base de Datos..."
                : "💾 Guardar Banda y Ver Información"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep("menu")}
          >
            <Text style={styles.backButtonText}>⬅️ Volver atrás</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* --- UNIRSE CON CÓDIGO --- */}
      {step === "join" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Unirse a una Banda</Text>
          <Text style={styles.cardHint}>
            Introduce el código facilitado por los administradores:
          </Text>

          <Text style={styles.label}>Código de Invitación *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: BAND-2026-X7K2"
            placeholderTextColor="#666"
            autoCapitalize="characters"
            value={inviteCode}
            onChangeText={setInviteCode}
          />

          <TouchableOpacity
            style={[styles.primaryButton, loading && { opacity: 0.7 }]}
            onPress={handleJoinBand}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? "Buscando Banda..." : "🚀 Unirme a la Banda"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep("menu")}
          >
            <Text style={styles.backButtonText}>⬅️ Volver atrás</Text>
          </TouchableOpacity>
        </View>
      )}
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
  headerTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#1e1e1e",
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#e91e63",
    marginBottom: 6,
  },
  cardHint: { fontSize: 13, color: "#888", marginBottom: 20, lineHeight: 18 },
  label: { fontSize: 13, color: "#ccc", marginBottom: 6, fontWeight: "600" },
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
  textArea: { height: 80, textAlignVertical: "top" },
  imagePickerButton: {
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#e91e63",
    borderStyle: "dashed",
    borderRadius: 8,
    height: 120,
    width: 120,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    overflow: "hidden",
  },
  imagePickerText: {
    color: "#aaa",
    fontSize: 13,
    textAlign: "center",
    padding: 10,
  },
  previewImage: { width: "100%", height: "100%", resizeMode: "cover" },
  primaryButton: {
    backgroundColor: "#e91e63",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
    marginTop: 4,
  },
  primaryButtonText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
  secondaryButton: {
    backgroundColor: "#2a2a2a",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#444",
  },
  secondaryButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  backButton: { paddingVertical: 10, alignItems: "center", marginTop: 4 },
  backButtonText: { color: "#888", fontSize: 13, fontWeight: "600" },
});
