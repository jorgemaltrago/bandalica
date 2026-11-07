import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

// Importamos el logotipo simplificado (logo2) desde la carpeta assets
import LogoIcon from "../../assets/logo2.png";

export default function BandInfoScreen() {
  // Datos de ejemplo de la banda
  const bandProfile = {
    name: "Bandálica",
    genre: "Rock / Metal",
    founded: "2026",
    city: "Utrera, Sevilla",
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Cabecera de Información de la Banda con el Logo2 a la izquierda */}
      <View style={styles.headerRow}>
        <Image
          source={LogoIcon}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <Text style={styles.headerTitle}>Información de la Banda</Text>
      </View>

      {/* Tarjeta con los datos de la banda */}
      <View style={styles.cardSection}>
        <Text style={styles.dataLabel}>Nombre de la Banda:</Text>
        <Text style={styles.dataValue}>{bandProfile.name}</Text>

        <Text style={styles.dataLabel}>Género Musical:</Text>
        <Text style={styles.dataValue}>{bandProfile.genre}</Text>

        <Text style={styles.dataLabel}>Año de Fundación:</Text>
        <Text style={styles.dataValue}>{bandProfile.founded}</Text>

        <Text style={styles.dataLabel}>Ciudad:</Text>
        <Text style={styles.dataValue}>{bandProfile.city}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#121212", // Fondo oscuro corporativo
    padding: 24,
    paddingTop: 40,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
    paddingBottom: 16,
  },
  headerLogo: {
    width: 36, // Tamaño pequeño y elegante para acompañar al texto
    height: 36,
    marginRight: 12, // Espacio entre el logo y el texto
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
  },
  cardSection: {
    backgroundColor: "#1e1e1e", // Tarjeta con tono gris oscuro
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  dataLabel: {
    fontSize: 13,
    color: "#aaa",
    marginBottom: 4,
    fontWeight: "600",
  },
  dataValue: {
    fontSize: 17,
    color: "#fff",
    marginBottom: 16,
    fontWeight: "500",
  },
});
