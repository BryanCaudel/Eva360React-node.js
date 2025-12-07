import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform } from "react-native";
import useAuth from "../hooks/useAuth";

export default function LoginScreen({ navigation }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const { login, loading } = useAuth();

  // Valida las credenciales con el backend usando el hook de autenticación
  const onLogin = async () => {
    if (!user.trim() || !pass.trim()) {
      const mensaje = "Por favor ingresa tu usuario y contraseña para continuar.";
      if (Platform.OS === "web") {
        alert(mensaje);
      } else {
        Alert.alert("Campos requeridos", mensaje);
      }
      return;
    }

    const result = await login(user.trim(), pass);
    
    if (result.ok) {
      // El hook ya guardó el token, solo navegar
      navigation.replace("Dashboard");
    } else {
      // Mensajes de error específicos según el tipo de error
      let mensajeError = "Usuario o contraseña incorrectos. Verifica tus credenciales e intenta nuevamente.";
      let tituloError = "Error al iniciar sesión";
      
      if (result.error) {
        // Error de rate limiting (demasiados intentos)
        if (result.error.includes("Demasiados intentos") || result.error.includes("429")) {
          tituloError = "Demasiados intentos";
          mensajeError = "Has realizado demasiados intentos de login. Por favor espera 15 minutos antes de intentar nuevamente.";
        } else if (result.error.includes("Credenciales inválidas") || result.error.includes("401")) {
          tituloError = "Credenciales incorrectas";
          mensajeError = "Usuario o contraseña incorrectos. Verifica tus credenciales e intenta nuevamente.";
        } else if (result.error.includes("Timeout") || result.error.includes("no respondió")) {
          tituloError = "Error de conexión";
          mensajeError = "El servidor no está respondiendo. Verifica tu conexión a internet o que el servidor esté encendido.";
        } else if (result.error.includes("conectar") || result.error.includes("conexión")) {
          tituloError = "Error de conexión";
          mensajeError = "No se pudo conectar con el servidor. Verifica tu conexión a internet.";
        } else {
          mensajeError = result.error;
        }
      }
      
      if (Platform.OS === "web") {
        alert(`${tituloError}: ${mensajeError}`);
      } else {
        Alert.alert(tituloError, mensajeError);
      }
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 16, backgroundColor: "#f3f4f6" }}>
      <Text style={{ fontSize: 28, fontWeight: "800", marginTop: 24 }}>Evaluaciones360</Text>

      <Text style={{ fontSize: 16, color: "#374151" }}>Iniciar sesión</Text>

      {/* Campo de entrada para el usuario: estilos con bordes redondeados y fondo blanco */}
      <TextInput
        placeholder="correo@demo.com"
        value={user}
        onChangeText={setUser}
        autoCapitalize="none"
        style={{
          borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10,
          paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#fff",
        }}
      />
      {/* Campo de entrada para la contraseña: oculta el texto con secureTextEntry */}
      <TextInput
        placeholder="••••••••"
        value={pass}
        onChangeText={setPass}
        secureTextEntry
        style={{
          borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10,
          paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#fff",
        }}
      />

      {/* Botón principal de login: color azul (#2563eb) */}
      <TouchableOpacity
        onPress={onLogin}
        disabled={loading}
        style={{
          backgroundColor: loading ? "#9ca3af" : "#2563eb", 
          paddingVertical: 12, 
          borderRadius: 10, 
          alignItems: "center",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: "white", fontWeight: "700" }}>Entrar</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 1, backgroundColor: "#e5e7eb", marginVertical: 8 }} />

      {/* Botón alternativo para realizar evaluación sin login */}
      <TouchableOpacity
        onPress={() => navigation.navigate("IngresarCodigo")}
        style={{
          backgroundColor: "#111827", paddingVertical: 12, borderRadius: 10, alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontWeight: "700" }}>Realizar evaluación</Text>
      </TouchableOpacity>
    </View>
  );
}
