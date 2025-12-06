import { Platform } from "react-native";

const getApiUrl = () => {
  if (Platform.OS === "web") {
    return "http://localhost:3001/";
  }

  return "http://192.168.100.71:3001/";
};

export const API_URL = getApiUrl();
