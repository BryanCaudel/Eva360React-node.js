import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, Platform } from "react-native";
import { listarEvaluacionesPorEvaluado } from "../api";

function Pill({ label, value }) {
  return (
    <View style={{
      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
      borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#f9fafb"
    }}>
      <Text style={{ fontSize: 12, color: "#111827", fontWeight: "700" }}>
        {label}: {Number(value).toFixed(2)}
      </Text>
    </View>
  );
}

export default function EvaluacionesAcumuladasScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setError(""); 
    setLoading(true);
    try {
      const data = await listarEvaluacionesPorEvaluado();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      // Mensajes de error específicos
      let mensajeError = "No se pudieron cargar los promedios por evaluado. Intenta nuevamente.";
      
      if (e.message) {
        if (e.message.includes("Token") || e.message.includes("autenticación") || e.message.includes("401")) {
          mensajeError = "Tu sesión ha expirado. Por favor inicia sesión nuevamente.";
        } else if (e.message.includes("Timeout") || e.message.includes("no respondió")) {
          mensajeError = "El servidor no está respondiendo. Verifica tu conexión a internet.";
        } else if (e.message.includes("conectar") || e.message.includes("conexión")) {
          mensajeError = "No se pudo conectar con el servidor. Verifica tu conexión a internet.";
        } else {
          mensajeError = e.message;
        }
      }
      
      setError(mensajeError);
      if (Platform.OS === "web") {
        alert(`Error al cargar promedios: ${mensajeError}`);
      } else {
        Alert.alert("Error al cargar promedios", mensajeError);
      }
    } finally { 
      setLoading(false); 
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await listarEvaluacionesPorEvaluado();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      // Mensajes de error específicos
      let mensajeError = "No se pudieron cargar los promedios por evaluado. Intenta nuevamente.";
      
      if (e.message) {
        if (e.message.includes("Token") || e.message.includes("autenticación") || e.message.includes("401")) {
          mensajeError = "Tu sesión ha expirado. Por favor inicia sesión nuevamente.";
        } else if (e.message.includes("Timeout") || e.message.includes("no respondió")) {
          mensajeError = "El servidor no está respondiendo. Verifica tu conexión a internet.";
        } else if (e.message.includes("conectar") || e.message.includes("conexión")) {
          mensajeError = "No se pudo conectar con el servidor. Verifica tu conexión a internet.";
        } else {
          mensajeError = e.message;
        }
      }
      
      setError(mensajeError);
    } finally { 
      setRefreshing(false); 
    }
  }, []);

  useEffect(() => { load(); }, []);

  const renderItem = ({ item }) => {
    const { evaluado_nombre, codigo, por_area = {} } = item;
    const entries = Object.entries(por_area);

    return (
      <View style={{
        padding: 14, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12,
        backgroundColor: "#fff", marginBottom: 12, gap: 8
      }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: "800" }}>{evaluado_nombre || "(sin nombre)"}</Text>
          <Text style={{ fontSize: 12, color: "#6b7280" }}>Código: {codigo}</Text>
        </View>

        {entries.length === 0 ? (
          <Text style={{ color: "#6b7280" }}>Sin respuestas finalizadas.</Text>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {entries.map(([dim, avg]) => <Pill key={dim} label={dim} value={avg} />)}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "800", marginBottom: 12 }}>
        Promedio por evaluado (acumulado)
      </Text>

      {loading ? <ActivityIndicator /> :
       error ? <Text style={{ color: "crimson", marginBottom: 12 }}>{error}</Text> :
       items.length === 0 ? <Text style={{ color: "#6b7280" }}>Aún no hay evaluaciones finalizadas.</Text> :
       <FlatList data={items} keyExtractor={(it) => String(it.evaluado_id)} renderItem={renderItem}
                 refreshing={refreshing} onRefresh={onRefresh} />}

      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{
          marginTop: 12, alignSelf: "flex-start", backgroundColor: "#111827",
          borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8
        }}
      >
        <Text style={{ color: "white", fontWeight: "700" }}>Volver</Text>
      </TouchableOpacity>
    </View>
  );
}
