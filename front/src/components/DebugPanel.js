import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { health, crearSesion, enviarRespuestas, finalizarSesion } from "../api";

export default function DebugPanel({ session }) {
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState([]);
  const [localToken, setLocalToken] = useState(null);
  const [localPregs, setLocalPregs] = useState([]);

  function pushLog(title, payload) {
    setLog(prev => [{ ts: new Date().toISOString(), title, payload }, ...prev].slice(0, 30));
  }

  function getToken() {
    return session?.token || localToken;
  }
  function getPregs() {
    return (session?.preguntas && session.preguntas.length ? session.preguntas : localPregs) || [];
  }

  async function testHealth() {
    try { pushLog("GET /health", await health()); }
    catch (e) {
      pushLog("GET /health [ERR]", { status: e?.response?.status || "ERR", data: e?.response?.data || String(e) });
    }
  }

  async function testCrearSesion() {
    try {
      const d = await crearSesion("ABC123");
      setLocalToken(d.token_sesion);
      setLocalPregs(d.preguntas || []);
      pushLog("POST /captura/sesion", { status: 200, data: d });
    } catch (e) {
      pushLog("POST /captura/sesion [ERR]", { status: e?.response?.status || "ERR", data: e?.response?.data || String(e) });
    }
  }

  async function testGuardar() {
    const token = getToken();
    if (!token) return pushLog("POST /captura/respuestas [ERR]", { status: "-", data: "No hay token (crea sesión primero)" });
    const pregs = getPregs();
    const payload = [
      { pregunta_id: pregs?.[0]?.id || 1, valor: 3 },
      { pregunta_id: pregs?.[1]?.id || 2, valor: 4 },
      { pregunta_id: pregs?.[2]?.id || 3, valor: 2 },
    ];
    try {
      const d = await enviarRespuestas(token, payload);
      pushLog("POST /captura/respuestas", { status: 200, data: d });
    } catch (e) {
      pushLog("POST /captura/respuestas [ERR]", { status: e?.response?.status || "ERR", data: e?.response?.data || String(e) });
    }
  }

  async function testFinalizar() {
    const token = getToken();
    if (!token) return pushLog("POST /captura/finalizar [ERR]", { status: "-", data: "No hay token (crea sesión primero)" });
    try {
      const d = await finalizarSesion(token);
      pushLog("POST /captura/finalizar", { status: 200, data: d });
    } catch (e) {
      pushLog("POST /captura/finalizar [ERR]", { status: e?.response?.status || "ERR", data: e?.response?.data || String(e) });
    }
  }

  return (
    <View style={{ position: "absolute", right: 10, bottom: 10, left: 10, pointerEvents: "box-none" }}>
      <TouchableOpacity onPress={() => setOpen(!open)} activeOpacity={0.85} style={{ alignSelf: "flex-end" }}>
        <View style={{ backgroundColor: open ? "#ef4444" : "#0f766e", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 }}>
          <Text style={{ color: "#fff", fontWeight: "800" }}>{open ? "Cerrar Debug" : "Abrir Debug"}</Text>
        </View>
      </TouchableOpacity>

      {open && (
        <View style={{ marginTop: 8, backgroundColor: "#111827", borderRadius: 12, padding: 10, maxHeight: 280 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            <Btn title="Health" onPress={testHealth} />
            <Btn title="Crear Sesión (ABC123)" onPress={testCrearSesion} />
            <Btn title="Guardar Respuestas" onPress={testGuardar} />
            <Btn title="Finalizar Sesión" onPress={testFinalizar} />
          </View>

          <Text style={{ color: "#d1d5db", marginBottom: 6, fontSize: 12 }}>
            token(UI): {session?.token ? session.token.slice(0, 10) + "..." : "(no)"} |{" "}
            token(panel): {localToken ? localToken.slice(0, 10) + "..." : "(no)"} |{" "}
            preguntas(UI/panel): {(session?.preguntas?.length || localPregs.length || 0)} |{" "}
            finalizada(UI): {String(session?.finalizada || false)}
          </Text>

          <ScrollView style={{ borderTopWidth: 1, borderTopColor: "#374151", paddingTop: 6 }}>
            {log.map((item, idx) => (
              <View key={idx} style={{ marginBottom: 8 }}>
                <Text style={{ color: "#93c5fd", fontWeight: "700" }}>{item.title}</Text>
                <Text selectable style={{ color: "#e5e7eb", fontSize: 12 }}>
                  {JSON.stringify(item.payload, null, 2)}
                </Text>
                <Text style={{ color: "#9ca3af", fontSize: 10 }}>{item.ts}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function Btn({ title, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View style={{ backgroundColor: "#2563eb", paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, marginRight: 8, marginBottom: 8 }}>
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
}
