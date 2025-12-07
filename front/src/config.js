import { Platform } from "react-native";

// URL del backend en Railway - cambiar por tu URL real
const RAILWAY_API_URL = "https://tu-proyecto.railway.app";

// Para desarrollo local, usar esto en lugar de Railway:
// const LOCAL_API_URL = Platform.OS === "web" 
//   ? "http://localhost:3001/" 
//   : "http://192.168.100.71:3001/";

const getApiUrl = () => {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  return RAILWAY_API_URL;
};

export const API_URL = getApiUrl();
