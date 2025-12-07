import { Platform } from "react-native";

// Determina la URL de la API según la plataforma
// Web: usa localhost, Móvil: usa la IP de la red local
const getApiUrl = () => {
  try {
    if (Platform.OS === "web") {
      return "http://localhost:3001/";
    }
    return "http://192.168.100.71:3001/";
  } catch (error) {
    console.error("Error en getApiUrl:", error);
    return "http://192.168.100.71:3001/";
  }
};

export const API_URL = getApiUrl();
