import { Platform } from "react-native";

// URL del backend en Railway
const RAILWAY_API_URL = "https://eva360react-nodejs-production.up.railway.app";

const getApiUrl = () => {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  return RAILWAY_API_URL;
};

export const API_URL = getApiUrl();
