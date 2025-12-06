import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";

export default function LoginScreen({ navigation }) {
  const [user, setUser] = useState("admin");
  const [pass, setPass] = useState("admin1");

  const onLogin = () => {
    if (user === "admin" && pass === "admin1") {
      navigation.replace("Dashboard");
    } else {
      Alert.alert("Credenciales inválidas", "Usuario o contraseña incorrectos.");
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 16, backgroundColor: "#f3f4f6" }}>
      <Text style={{ fontSize: 28, fontWeight: "800", marginTop: 24 }}>Evaluaciones360</Text>

      <Text style={{ fontSize: 16, color: "#374151" }}>Iniciar sesión</Text>

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

      <TouchableOpacity
        onPress={onLogin}
        style={{
          backgroundColor: "#2563eb", paddingVertical: 12, borderRadius: 10, alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontWeight: "700" }}>Entrar</Text>
      </TouchableOpacity>

      <View style={{ height: 1, backgroundColor: "#e5e7eb", marginVertical: 8 }} />

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
