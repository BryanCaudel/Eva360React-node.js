import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { crearSesion } from "../api";

export default function IngresarCodigoScreen({ navigation }) {
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);

  const onStart = async () => {
    const c = codigo.trim().toUpperCase();
    if (!c) return Alert.alert("Falta código", "Escribe un código válido.");
    setLoading(true);
    try {
      const data = await crearSesion(c);
      navigation.replace("RealizarEvaluacion", {
        token_sesion: data.token_sesion,
        encuesta_id: data.encuesta_id,
        evaluado_nombre: data.evaluado_nombre || "(sin nombre)",
        preguntas: data.preguntas || [],
      });
    } catch (e) {
      Alert.alert("Error", e.message || "No se pudo iniciar la sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "800" }}>Ingresar código</Text>
      <Text style={{ color: "#374151" }}>
        Escribe el código de 6 caracteres (3 letras + 3 números).
      </Text>

      <TextInput
        placeholder="ABC123"
        autoCapitalize="characters"
        value={codigo}
        onChangeText={setCodigo}
        style={{
          borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10,
          paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#fff",
        }}
      />

      <TouchableOpacity
        onPress={onStart}
        disabled={loading}
        style={{
          backgroundColor: "#2563eb",
          paddingVertical: 12,
          borderRadius: 10,
          alignItems: "center",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "white", fontWeight: "700" }}>Comenzar</Text>}
      </TouchableOpacity>

      <Text style={{ fontSize: 12, color: "#6b7280" }}>Tip: prueba con “ABC123”.</Text>
    </View>
  );
}
