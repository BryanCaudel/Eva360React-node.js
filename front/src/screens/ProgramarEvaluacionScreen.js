import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { crearCodigo } from "../api"; // <- ruta corregida

export default function ProgramarEvaluacionScreen({ navigation }) {
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const [codigo, setCodigo] = useState("");

  
  const onGenerar = async () => {
    const n = nombre.trim();
    if (!n) return;
    setLoading(true);
    setCodigo("");
    try {
      const data = await crearCodigo(n, 1);
      setCodigo(data.codigo);
    } catch (e) {
      alert(e.message || "Error generando código");
    } finally {
      setLoading(false);
    }
  };

  const onCopiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      alert("Código copiado");
    } catch {
      alert("No se pudo copiar");
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>Programar evaluación</Text>

      <TextInput
        placeholder="Nombre del evaluado"
        value={nombre}
        onChangeText={setNombre}
        style={{
          borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10,
          paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#fff",
        }}
      />

      <TouchableOpacity
        onPress={onGenerar}
        disabled={loading || !nombre.trim()}
        style={{
          backgroundColor: "#2563eb",
          paddingVertical: 12,
          borderRadius: 10,
          alignItems: "center",
          opacity: loading || !nombre.trim() ? 0.6 : 1,
        }}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>Generar código</Text>}
      </TouchableOpacity>

      {codigo ? (
        <View
          style={{
            marginTop: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff", gap: 8,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "700" }}>Código generado:</Text>
          <Text style={{ fontSize: 28, fontWeight: "800", letterSpacing: 2 }}>{codigo}</Text>

          <TouchableOpacity
            onPress={onCopiar}
            style={{ backgroundColor: "#111827", paddingVertical: 10, borderRadius: 10, alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Copiar</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ marginTop: 10, alignSelf: "flex-start", backgroundColor: "#e5e7eb", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
      >
        <Text style={{ color: "#111827", fontWeight: "600" }}>Volver</Text>
      </TouchableOpacity>
    </View>
  );
}
