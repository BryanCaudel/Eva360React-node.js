import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import useAuth from "../hooks/useAuth";

export default function DashboardScreen({ navigation }) {
  const { logout } = useAuth();

  const Card = ({ title, subtitle, onPress }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: "#fff",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 6 }}>{title}</Text>
      <Text style={{ color: "#6b7280" }}>{subtitle}</Text>
    </TouchableOpacity>
  );

  const onLogout = () => {
    logout();
    navigation.reset({
      index: 0,
      routes: [{ name: "Login" }],
    });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f3f4f6" }} contentContainerStyle={{ padding: 16 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <View>
          <Text style={{ fontSize: 24, fontWeight: "800" }}>Dashboard</Text>
          <Text style={{ color: "#6b7280", marginTop: 4 }}>Panel de control de Evaluaciones360</Text>
        </View>

        <TouchableOpacity
          onPress={onLogout}
          style={{
            backgroundColor: "#ef4444",
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 10,
          }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>Salir</Text>
        </TouchableOpacity>
      </View>

      <Card
        title="Programar evaluación"
        subtitle="Genera un código único para un evaluado."
        onPress={() => navigation.navigate("ProgramarEvaluacion")}
      />

      <Card
        title="Códigos"
        subtitle="Consulta códigos generados y nombres de evaluados."
        onPress={() => navigation.navigate("Codigos")}
      />

      <Card
        title="Evaluaciones (sesión)"
        subtitle="Puntaje individual."
        onPress={() => navigation.navigate("Evaluaciones")}
      />

      <Card
        title="Promedio por evaluado (acumulado)"
        subtitle="Promedios por área sumando todas las sesiones del evaluado."
        onPress={() => navigation.navigate("EvaluacionesAcumuladas")}
      />

      <Card
        title="Usuarios"
        subtitle="Gestiona los usuarios del sistema (crear, editar, eliminar)."
        onPress={() => navigation.navigate("Usuarios")}
      />
    </ScrollView>
  );
}
