import { API_URL } from "./config";

async function req(path, opts = {}) {
  const baseUrl = API_URL.endsWith("/") ? API_URL : `${API_URL}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const url = `${baseUrl}${normalizedPath}`;

  let r;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const fetchOptions = {
      headers: {
        "Content-Type": "application/json",
        ...(opts.headers || {}),
      },
      signal: controller.signal,
      ...opts,
    };
    
    if (opts.signal) {
      opts.signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
      });
    }
    
    r = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Timeout: El servidor no respondió. Verifica que el backend esté corriendo.");
    }
    throw new Error(`No se pudo conectar con el servidor. Verifica tu conexión o que la API esté encendida.`);
  }

  const contentType = r.headers.get("content-type") || "";
  let data = {};
  
  const text = await r.text().catch(() => "");
  
  if (contentType.includes("application/json") || text.trim().startsWith("[")) {
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      data = {};
    }
  } else {
    if (text) data = { message: text };
  }

  if (!r.ok) {
    const message =
      data.error ||
      data.message ||
      data.detail ||
      `Error HTTP ${r.status}`;
    throw new Error(message);
  }

  return data;
}

// Ping
export function health() {
  return req("/health");
}


export function crearCodigo(evaluado_nombre, encuesta_id = 1) {
  return req("/admin/codigos", {
    method: "POST",
    body: JSON.stringify({ evaluado_nombre, encuesta_id }),
  });
}
export async function listarCodigos() {
  const rows = await req("/admin/codigos");
  if (!Array.isArray(rows)) return [];

  return rows.map((r) => ({
    ...r,
    codigo_acceso: r.codigo,
  }));
}

export function actualizarCodigo(id, datos) {
  return req(`/admin/codigos/${id}`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}

export function eliminarCodigo(id) {
  return req(`/admin/codigos/${id}`, {
    method: "DELETE",
  });
}
export function listarEvaluaciones() {
  return req("/admin/evaluaciones");
}
export function listarEvaluacionesPorEvaluado() {
  return req("/admin/evaluaciones-por-evaluado");
}

export function crearSesion(codigo) {
  return req("/captura/sesion", {
    method: "POST",
    body: JSON.stringify({ codigo }),
  });
}

export function enviarRespuestas(token_sesion, respuestas) {
  return req("/captura/respuestas", {
    method: "POST",
    body: JSON.stringify({ token_sesion, respuestas }),
  });
}

export function guardarRespuestas(token_sesion, respuestas) {
  return enviarRespuestas(token_sesion, respuestas);
}

export function finalizarSesion(token_sesion) {
  return req("/captura/finalizar", {
    method: "POST",
    body: JSON.stringify({ token_sesion }),
  });
}
