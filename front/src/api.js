import { API_URL } from "./config";

// Almacenamiento del token 
let authToken = null;

// Función para obtener el token actual 
export function getAuthToken() {
  return authToken;
}

// Función para establecer el token 
export function setAuthToken(token) {
  authToken = token;
}

// Función para limpiar el token
export function clearAuthToken() {
  authToken = null;
}

// Función base para realizar peticiones HTTP a la API
// Maneja timeouts, errores de conexión y parsing de respuestas
async function req(path, opts = {}) {
  const baseUrl = API_URL.endsWith("/") ? API_URL : `${API_URL}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const url = `${baseUrl}${normalizedPath}`;

  let r;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const headers = {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    };
    
    // Agregar token de autenticación si existe y es un endpoint de admin
    // Solo para endpoints de admin (que empiezan con admin/)
    // Obtener el token fresco en cada petición
    // Usar normalizedPath para verificar si es un endpoint de admin
    const token = getAuthToken();
    if (token && normalizedPath.startsWith("admin/") && !headers.Authorization && !opts.headers?.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const fetchOptions = {
      headers,
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
    // Manejo especial para errores 429 (rate limit)
    if (r.status === 429) {
      const rateLimitMessage = data.message || data.error || "Demasiados intentos. Por favor espera unos minutos e intenta nuevamente.";
      throw new Error(rateLimitMessage);
    }
    
    // Manejo especial para errores 401 (no autorizado)
    if (r.status === 401) {
      clearAuthToken(); // Limpiar token si es 401
    }
    
    const message =
      data.error ||
      data.message ||
      data.detail ||
      `Error HTTP ${r.status}`;
    throw new Error(message);
  }

  return data;
}

// Endpoint: Verifica que el servidor esté funcionando
export function health() {
  return req("/health");
}

// Endpoint: Autenticación de administrador
export function login(username, password) {
  return req("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

// Endpoint: Crea un nuevo código de evaluación para un evaluado
export function crearCodigo(evaluado_nombre, encuesta_id = 1) {
  return req("/admin/codigos", {
    method: "POST",
    body: JSON.stringify({ evaluado_nombre, encuesta_id }),
  });
}

// Endpoint: Obtiene la lista de todos los códigos de evaluación
export async function listarCodigos() {
  const rows = await req("/admin/codigos");
  if (!Array.isArray(rows)) return [];

  return rows.map((r) => ({
    ...r,
    codigo_acceso: r.codigo,
  }));
}

// Endpoint: Actualiza los datos de un código existente
export function actualizarCodigo(id, datos) {
  return req(`/admin/codigos/${id}`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}

// Endpoint: Elimina o desactiva un código (según tenga sesiones con respuestas)
export function eliminarCodigo(id) {
  return req(`/admin/codigos/${id}`, {
    method: "DELETE",
  });
}

// Endpoint: Obtiene las evaluaciones agrupadas por sesión
export function listarEvaluaciones() {
  return req("/admin/evaluaciones");
}

// Endpoint: Obtiene los promedios acumulados por evaluado
export function listarEvaluacionesPorEvaluado() {
  return req("/admin/evaluaciones-por-evaluado");
}

// Endpoint: Crea una nueva sesión de evaluación usando un código
export function crearSesion(codigo) {
  return req("/captura/sesion", {
    method: "POST",
    body: JSON.stringify({ codigo }),
  });
}

// Endpoint: Envía las respuestas de la evaluación
export function enviarRespuestas(token_sesion, respuestas) {
  return req("/captura/respuestas", {
    method: "POST",
    body: JSON.stringify({ token_sesion, respuestas }),
  });
}

// Alias para enviarRespuestas (mantiene compatibilidad)
export function guardarRespuestas(token_sesion, respuestas) {
  return enviarRespuestas(token_sesion, respuestas);
}

// Endpoint: Finaliza una sesión de evaluación
export function finalizarSesion(token_sesion) {
  return req("/captura/finalizar", {
    method: "POST",
    body: JSON.stringify({ token_sesion }),
  });
}

// ========== ENDPOINTS CRUD DE USUARIOS ==========

// Endpoint: Obtiene la lista de todos los usuarios
export async function listarUsuarios() {
  const rows = await req("/admin/usuarios");
  if (!Array.isArray(rows)) return [];
  return rows;
}

// Endpoint: Crea un nuevo usuario
export function crearUsuario(username, password) {
  return req("/admin/usuarios", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

// Endpoint: Actualiza un usuario existente
export function actualizarUsuario(id, datos) {
  return req(`/admin/usuarios/${id}`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}

// Endpoint: Elimina un usuario
export function eliminarUsuario(id) {
  return req(`/admin/usuarios/${id}`, {
    method: "DELETE",
  });
}
