import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Platform } from "react-native";
import { guardarRespuestas, finalizarSesion } from "../api";

export default function RealizarEvaluacionScreen({ route, navigation }) {
  const { token_sesion, evaluado_nombre, preguntas } = route.params || {};
  const [values, setValues] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const totalRespondidas = useMemo(() => Object.keys(values).length, [values]);
  const totalPreguntas = (preguntas || []).length;
  const todasRespondidas = useMemo(() => {
    if (!preguntas || preguntas.length === 0) return false;
    return preguntas.every(p => values[p.id] !== undefined);
  }, [preguntas, values]);

  const onSelect = (pregunta_id, valor) => {
    setValues((prev) => ({ ...prev, [pregunta_id]: valor }));
  };

  const navegarALogin = () => {
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  // si falla el guardado muestra un mensaje de error
  const onSubmit = async () => {
    if (!token_sesion) {
      if (Platform.OS === "web") {
        alert("Error: Sesión inválida.");
      } else {
        Alert.alert("Error", "Sesión inválida.");
      }
      return;
    }

    // Validar que todas las preguntas estén respondidas
    const preguntasIds = (preguntas || []).map(p => p.id);
    const preguntasSinResponder = preguntasIds.filter(id => !values[id]);
    
    if (preguntasSinResponder.length > 0) {
      const mensaje = `Debes responder todas las preguntas. Faltan ${preguntasSinResponder.length} pregunta(s) sin responder.`;
      if (Platform.OS === "web") {
        alert(mensaje);
      } else {
        Alert.alert("Preguntas incompletas", mensaje);
      }
      return;
    }

    const respuestas = Object.entries(values).map(([pregunta_id, valor]) => ({
      pregunta_id: Number(pregunta_id),
      valor: Number(valor),
    }));
    
    if (respuestas.length === 0) {
      if (Platform.OS === "web") {
        alert("Sin respuestas: selecciona al menos una opción.");
      } else {
        Alert.alert("Sin respuestas", "Selecciona al menos una opción.");
      }
      return;
    }

    // Validar que el número de respuestas coincida con el número de preguntas
    if (respuestas.length !== preguntasIds.length) {
      const mensaje = `Debes responder todas las preguntas. Has respondido ${respuestas.length} de ${preguntasIds.length}.`;
      if (Platform.OS === "web") {
        alert(mensaje);
      } else {
        Alert.alert("Preguntas incompletas", mensaje);
      }
      return;
    }

    setSubmitting(true);
    try {
      await guardarRespuestas(token_sesion, respuestas);
      await finalizarSesion(token_sesion);

      if (Platform.OS === "web") {
        alert("Gracias: respuestas enviadas correctamente.");
        navegarALogin();
      } else {
        Alert.alert("Gracias", "Respuestas enviadas correctamente.", [
          { text: "OK", onPress: navegarALogin },
        ]);
      }
    } catch (e) {
      const msg = e?.message || "No se pudo enviar la evaluación.";
      if (Platform.OS === "web") {
        alert(`Error: ${msg}`);
      } else {
        Alert.alert("Error", msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "800" }}>Cuestionario</Text>
      <Text style={{ color: "#374151" }}>
        Evaluado: <Text style={{ fontWeight: "700" }}>{evaluado_nombre || "(sin nombre)"}</Text>
      </Text>
      <Text style={{ color: "#6b7280" }}>Responde (1 = bajo, 5 = alto)</Text>

      {(preguntas || []).map((p) => {
        const estaRespondida = values[p.id] !== undefined;
        return (
          <View
            key={p.id}
            style={{
              padding: 12,
              borderWidth: 2,
              borderColor: estaRespondida ? "#10b981" : "#ef4444",
              borderRadius: 10,
              backgroundColor: estaRespondida ? "#f0fdf4" : "#fef2f2",
              marginBottom: 10,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <Text style={{ fontWeight: "700", flex: 1 }}>
                {p.texto} <Text style={{ color: "#6b7280" }}>[{p.dimension}]</Text>
              </Text>
              {!estaRespondida && (
                <Text style={{ color: "#ef4444", fontSize: 12, fontWeight: "600" }}>⚠ Sin responder</Text>
              )}
            </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[1, 2, 3, 4, 5].map((v) => {
              const active = values[p.id] === v;
              return (
                <TouchableOpacity
                  key={v}
                  onPress={() => onSelect(p.id, v)}
                  style={{
                    borderWidth: 1,
                    borderColor: active ? "#2563eb" : "#e5e7eb",
                    backgroundColor: active ? "#DBEAFE" : "#fff",
                    borderRadius: 8,
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                  }}
                >
                  <Text style={{ fontWeight: "700", color: active ? "#1d4ed8" : "#111827" }}>{v}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          </View>
        );
      })}

      <TouchableOpacity
        onPress={onSubmit}
        disabled={submitting || !todasRespondidas}
        style={{
          backgroundColor: todasRespondidas ? "#2563eb" : "#9ca3af",
          paddingVertical: 12,
          borderRadius: 10,
          alignItems: "center",
          opacity: (submitting || !todasRespondidas) ? 0.6 : 1,
        }}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: "#fff", fontWeight: "700" }}>
            {todasRespondidas ? "Guardar y enviar" : `Completa todas las preguntas (${totalRespondidas}/${totalPreguntas})`}
          </Text>
        )}
      </TouchableOpacity>

      <Text style={{ 
        color: todasRespondidas ? "#10b981" : "#ef4444", 
        marginTop: 6,
        fontWeight: todasRespondidas ? "600" : "400",
        textAlign: "center"
      }}>
        {todasRespondidas 
          ? `✓ Todas las preguntas respondidas (${totalRespondidas}/${totalPreguntas})`
          : `Preguntas respondidas: ${totalRespondidas} / ${totalPreguntas} - Faltan ${totalPreguntas - totalRespondidas} pregunta(s)`
        }
      </Text>
    </View>
  );
}
