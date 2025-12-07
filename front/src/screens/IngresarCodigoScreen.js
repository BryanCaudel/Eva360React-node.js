import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform } from "react-native";
import { crearSesion } from "../api";

export default function IngresarCodigoScreen({ navigation }) {
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);

  // Valida el código y crea una sesión de evaluación
  const onStart = async () => {
    const c = codigo.trim().toUpperCase();
    
    // Validación de formato del código
    if (!c) {
      const mensaje = "Por favor ingresa el código de 6 caracteres para continuar.";
      if (Platform.OS === "web") {
        alert(mensaje);
      } else {
        Alert.alert("Código requerido", mensaje);
      }
      return;
    }
    
    if (c.length !== 6) {
      const mensaje = "El código debe tener exactamente 6 caracteres (3 letras y 3 números).";
      if (Platform.OS === "web") {
        alert(mensaje);
      } else {
        Alert.alert("Código inválido", mensaje);
      }
      return;
    }
    
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
      // Mensajes de error específicos según el tipo de error
      let mensajeError = "No se pudo iniciar la sesión. Intenta nuevamente.";
      let tituloError = "Error";
      
      if (e.message) {
        if (e.message.includes("no encontrado") || e.message.includes("404")) {
          tituloError = "Código no encontrado";
          mensajeError = `El código "${c}" no existe en el sistema. Verifica que hayas ingresado el código correcto.`;
        } else if (e.message.includes("inactivo") || e.message.includes("activo")) {
          tituloError = "Código inactivo";
          mensajeError = `El código "${c}" está inactivo. Contacta al administrador para más información.`;
        } else if (e.message.includes("Timeout") || e.message.includes("no respondió")) {
          tituloError = "Error de conexión";
          mensajeError = "El servidor no está respondiendo. Verifica tu conexión a internet o que el servidor esté encendido.";
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

  return (
    <View style={{ flex: 1, padding: 16, gap: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "800" }}>Ingresar código</Text>
      <Text style={{ color: "#374151" }}>
        Escribe el código de 6 caracteres (3 letras + 3 números).
      </Text>

      {/* Input para el código: convierte automáticamente a mayúsculas */}
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

      {/* Botón para iniciar la evaluación: muestra indicador de carga mientras procesa */}
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
    </View>
  );
}
