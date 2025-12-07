import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform } from "react-native";
import { crearCodigo } from "../api";

export default function ProgramarEvaluacionScreen({ navigation }) {
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const [codigo, setCodigo] = useState("");

  // Genera un código único de 6 caracteres para el evaluado
  const onGenerar = async () => {
    const n = nombre.trim();
    if (!n) {
      if (Platform.OS === "web") {
        alert("Por favor ingresa el nombre del evaluado.");
      } else {
        Alert.alert("Campo requerido", "Por favor ingresa el nombre del evaluado para generar el código.");
      }
      return;
    }
    
    setLoading(true);
    setCodigo("");
    try {
      const data = await crearCodigo(n, 1);
      setCodigo(data.codigo);
    } catch (e) {
      // Mensajes de error específicos
      let mensajeError = "No se pudo generar el código. Intenta nuevamente.";
      let tituloError = "Error";
      
      if (e.message) {
        if (e.message.includes("Token") || e.message.includes("autenticación") || e.message.includes("401")) {
          tituloError = "Sesión expirada";
          mensajeError = "Tu sesión ha expirado. Por favor inicia sesión nuevamente.";
        } else if (e.message.includes("duplicado") || e.message.includes("409")) {
          tituloError = "Código duplicado";
          mensajeError = "El código que intentas crear ya existe. Intenta con otro nombre.";
        } else if (e.message.includes("Timeout") || e.message.includes("no respondió")) {
          tituloError = "Error de conexión";
          mensajeError = "El servidor no está respondiendo. Verifica tu conexión a internet.";
        } else if (e.message.includes("conectar") || e.message.includes("conexión")) {
          tituloError = "Error de conexión";
          mensajeError = "No se pudo conectar con el servidor. Verifica tu conexión a internet.";
        } else {
          mensajeError = e.message;
        }
      }
      
      if (Platform.OS === "web") {
        alert(`${tituloError}: ${mensajeError}`);
      } else {
        Alert.alert(tituloError, mensajeError);
      }
    } finally {
      setLoading(false);
    }
  };

  // Copia el código generado al portapapeles
  const onCopiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      if (Platform.OS === "web") {
        alert("Código copiado al portapapeles");
      } else {
        Alert.alert("Éxito", "Código copiado al portapapeles");
      }
    } catch {
      if (Platform.OS === "web") {
        alert("No se pudo copiar el código. Intenta copiarlo manualmente.");
      } else {
        Alert.alert("Error", "No se pudo copiar el código. Intenta copiarlo manualmente.");
      }
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>Programar evaluación</Text>

      {/* Input para el nombre del evaluado: estilos con bordes redondeados */}
      <TextInput
        placeholder="Nombre del evaluado"
        value={nombre}
        onChangeText={setNombre}
        style={{
          borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10,
          paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#fff",
        }}
      />

      {/* Botón para generar código: se deshabilita si está cargando o el nombre está vacío */}
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
