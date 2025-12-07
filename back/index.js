import express from "express";
import Database from "better-sqlite3";
import crypto from "crypto";
import fs from "fs";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { body, param, validationResult } from "express-validator";

const PORT = Number(process.env.PORT || 3001);
const DB_FILE = process.env.DB_FILE || "./data.db";

// Configuración de seguridad
const JWT_SECRET = process.env.JWT_SECRET || "eva360-secret-key-change-in-production";
const JWT_EXPIRES_IN = "8h";

// Configuración de CORS: en desarrollo permite cualquier origen, en producción se puede restringir
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : null; // null = permitir todos (desarrollo)


const LOG_DIR = process.env.LOG_DIR || "./logs";
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}
const LOG_FILE = `${LOG_DIR}/app.log`;
const logStream = fs.createWriteStream(LOG_FILE, { flags: "a" });

function writeLog(line) {
  const out = `[${new Date().toISOString()}] ${line}\n`;

  console.log(out.trim());

  try {
    logStream.write(out);
  } catch (e) {
    console.error("No se pudo escribir en el log:", e);
  }
}

// Función para sanitizar datos sensibles antes de loggear
function sanitizeForLog(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const sensitive = ["password", "token_sesion", "token", "authorization"];
  const sanitized = { ...obj };
  for (const key in sanitized) {
    if (sensitive.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLog(sanitized[key]);
    }
  }
  return sanitized;
}

function logInfo(msg, meta = null) {
  if (meta) {
    writeLog(`INFO  ${msg} | ${JSON.stringify(sanitizeForLog(meta))}`);
  } else {
    writeLog(`INFO  ${msg}`);
  }
}

function logWarn(msg, meta = null) {
  if (meta) {
    writeLog(`WARN  ${msg} | ${JSON.stringify(sanitizeForLog(meta))}`);
  } else {
    writeLog(`WARN  ${msg}`);
  }
}

function logError(msg, meta = null) {
  if (meta instanceof Error) {
    writeLog(`ERROR ${msg} | ${meta.message} | ${meta.stack}`);
  } else if (meta) {
    writeLog(`ERROR ${msg} | ${JSON.stringify(sanitizeForLog(meta))}`);
  } else {
    writeLog(`ERROR ${msg}`);
  }
}


// Inicialización de la base de datos SQLite
const firstRun = !fs.existsSync(DB_FILE);
const db = new Database(DB_FILE);
db.pragma("foreign_keys = ON");

// Crea las tablas y datos iniciales si es la primera vez que se ejecuta
if (firstRun) {
  db.exec(`
    CREATE TABLE empresas (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL);

    CREATE TABLE equipos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id)
    );

    CREATE TABLE encuestas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL
    );

    CREATE TABLE encuesta_equipo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      encuesta_id INTEGER NOT NULL,
      equipo_id INTEGER NOT NULL,
      codigo TEXT NOT NULL UNIQUE,
      activo INTEGER NOT NULL DEFAULT 1,
      evaluado_nombre TEXT,
      FOREIGN KEY (encuesta_id) REFERENCES encuestas(id),
      FOREIGN KEY (equipo_id) REFERENCES equipos(id)
    );

    CREATE TABLE sesiones_equipo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      encuesta_equipo_id INTEGER NOT NULL,
      token_sesion TEXT NOT NULL UNIQUE,
      finalizada INTEGER NOT NULL DEFAULT 0,
      creado_en TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (encuesta_equipo_id) REFERENCES encuesta_equipo(id)
    );

    CREATE TABLE preguntas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      encuesta_id INTEGER NOT NULL,
      texto TEXT NOT NULL,
      dimension TEXT NOT NULL,
      FOREIGN KEY (encuesta_id) REFERENCES encuestas(id)
    );

    CREATE TABLE respuestas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sesion_id INTEGER NOT NULL,
      pregunta_id INTEGER NOT NULL,
      valor INTEGER NOT NULL CHECK (valor BETWEEN 1 AND 5),
      creado_en TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (sesion_id, pregunta_id),
      FOREIGN KEY (sesion_id) REFERENCES sesiones_equipo(id) ON DELETE CASCADE,
      FOREIGN KEY (pregunta_id) REFERENCES preguntas(id)
    );

    CREATE TABLE usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      activo INTEGER NOT NULL DEFAULT 1,
      creado_en TEXT NOT NULL DEFAULT (datetime('now')),
      actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT INTO empresas (nombre) VALUES ('Empresa Demo');
    INSERT INTO equipos (empresa_id, nombre) VALUES (1, 'Equipo General');
    INSERT INTO encuestas (nombre) VALUES ('Encuesta General Q4');

    INSERT INTO preguntas (encuesta_id, texto, dimension) VALUES
      (1, 'El líder comunica objetivos con claridad', 'COM'),
      (1, 'El equipo colabora de forma efectiva', 'TEQ'),
      (1, 'Me siento motivado por el trabajo', 'MOT');

    INSERT INTO encuesta_equipo (encuesta_id, equipo_id, codigo, activo, evaluado_nombre)
    VALUES (1, 1, 'ABC123', 1, NULL);
  `);
  logInfo("BD creada en primer arranque. Código de prueba: ABC123");
}

(function ensureEvaluadoNombreColumn() {
  const cols = db.prepare(`PRAGMA table_info(encuesta_equipo)`).all();
  const hasCol = cols.some((c) => c.name === "evaluado_nombre");
  if (!hasCol) {
    db.exec(`ALTER TABLE encuesta_equipo ADD COLUMN evaluado_nombre TEXT NULL`);
    logInfo("Migración: columna evaluado_nombre agregada a encuesta_equipo");
  }
})();

// Migración: Crear tabla de usuarios si no existe
(function ensureUsuariosTable() {
  try {
    const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios'`).get();
    if (!tables) {
      db.exec(`
        CREATE TABLE usuarios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          activo INTEGER NOT NULL DEFAULT 1,
          creado_en TEXT NOT NULL DEFAULT (datetime('now')),
          actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);
      logInfo("Migración: tabla usuarios creada");
    }
  } catch (e) {
    logError("Error en migración de usuarios", e);
  }
})();


// Configuración de Express
const app = express();

// Helmet: configuración de headers de seguridad
app.use(helmet());

// CORS: configuración según entorno
const corsOptions = {
  origin: ALLOWED_ORIGINS || true, // true = permitir todos (desarrollo)
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json());

// Normaliza las URLs eliminando barras dobles
app.use((req, _res, next) => {
  req.url = req.url.replace(/\/{2,}/g, "/");
  next();
});

// Rate limiting para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo 10 intentos por IP
  message: "Demasiados intentos de login, intenta de nuevo en 15 minutos",
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting general para endpoints de captura y admin
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware de logging: registra todas las peticiones
app.use((req, _res, next) => {
  const logData = {
    method: req.method,
    url: req.url,
    ip: req.ip,
  };
  // No loggear headers de autorización
  if (req.headers.authorization) {
    logData.hasAuth = true;
  }
  logInfo("REQUEST", logData);
  next();
});

// Función helper para enviar respuestas de error
const bad = (res, msg, code = 400, ctx = {}) => {
  const meta = { code, ...ctx };
  if (code >= 500) {
    logError(msg, meta);
  } else {
    logWarn(msg, meta);
  }
  return res.status(code).json({ error: msg });
};

// Middleware para manejar errores de validación de express-validator
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => `${err.param}: ${err.msg}`).join(", ");
    return bad(res, `Errores de validación: ${errorMessages}`, 400, { 
      endpoint: req.url,
      errors: errors.array()
    });
  }
  next();
};
// Funciones de utilidad para validación
const isInt = (v) => Number.isInteger(v);
const notEmptyStr = (s) => typeof s === "string" && s.trim().length > 0;

// Función para hashear contraseñas usando bcrypt
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

// Función para verificar contraseñas usando bcrypt
async function verifyPassword(password, hash) {
  // Si el hash es antiguo (SHA-256, 64 caracteres hex), migrar automáticamente
  if (hash.length === 64 && /^[a-f0-9]{64}$/i.test(hash)) {
    // Hash antiguo SHA-256, verificar y migrar
    const oldHash = crypto.createHash("sha256").update(password).digest("hex");
    if (oldHash === hash) {
      // Contraseña correcta, retornar true (se migrará en el próximo login)
      return true;
    }
    return false;
  }
  // Hash nuevo bcrypt, verificar normalmente
  return await bcrypt.compare(password, hash);
}

// Genera un código único de 6 caracteres (3 letras + 3 números)
function genCode() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const nums = "0123456789";
  const pick = (pool, n) =>
    Array.from({ length: n }, () => pool[Math.floor(Math.random() * pool.length)]).join("");
  return pick(letters, 3) + pick(nums, 3);
}

// Asegura que exista una empresa y equipo por defecto en la base de datos
function ensureDefaultEquipo() {
  let empresa = db.prepare(`SELECT id FROM empresas WHERE nombre='Empresa Demo'`).get();
  if (!empresa) {
    const info = db
      .prepare(`INSERT INTO empresas (nombre) VALUES ('Empresa Demo')`)
      .run();
    empresa = { id: info.lastInsertRowid };
    logInfo("Se creó empresa por defecto", { empresa_id: empresa.id });
  }
  let equipo = db
    .prepare(
      `SELECT id FROM equipos WHERE empresa_id = ? AND nombre = 'Equipo General'`
    )
    .get(empresa.id);
  if (!equipo) {
    const info = db
      .prepare(`INSERT INTO equipos (empresa_id, nombre) VALUES (?, 'Equipo General')`)
      .run(empresa.id);
    equipo = { id: info.lastInsertRowid };
    logInfo("Se creó equipo por defecto", { equipo_id: equipo.id });
  }
  return equipo.id;
}

// Middleware de autenticación para rutas de administración
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return bad(res, "Token de autenticación requerido", 401, { endpoint: req.url });
  }
  
  const token = authHeader.substring(7); // Remover "Bearer "
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // El token es válido, continuar
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return bad(res, "Token expirado", 401, { endpoint: req.url });
    }
    return bad(res, "Token inválido", 401, { endpoint: req.url });
  }
}

// Endpoint: Verifica que el servidor esté funcionando
app.get("/health", (_req, res) => res.json({ ok: true }));

// Endpoint: Autenticación de administrador
app.post(
  "/auth/login",
  loginLimiter,
  [
    body("username")
      .trim()
      .notEmpty().withMessage("username es requerido")
      .isLength({ min: 1, max: 50 }).withMessage("username debe tener entre 1 y 50 caracteres")
      .matches(/^[a-zA-Z0-9_]+$/).withMessage("username solo puede contener letras, números y guiones bajos"),
    body("password")
      .notEmpty().withMessage("password es requerido")
      .isLength({ min: 1, max: 200 }).withMessage("password debe tener entre 1 y 200 caracteres"),
  ],
  handleValidationErrors,
  async (req, res) => {
    const { username, password } = req.body;
    
    // Buscar usuario en la base de datos
    const usuario = db
      .prepare(`SELECT id, username, password_hash, activo FROM usuarios WHERE username = ?`)
      .get(username.trim());
    
    // Si no existe el usuario, verificar credenciales hardcodeadas (compatibilidad)
    if (!usuario) {
      if (username === "admin" && password === "admin1") {
        const token = jwt.sign(
          { username: "admin", role: "admin" },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN }
        );
        
        logInfo("Login exitoso (credenciales legacy)", {
          endpoint: "/auth/login",
          username: "admin",
        });
        
        return res.json({
          ok: true,
          token,
          expiresIn: JWT_EXPIRES_IN,
        });
      }
      
      logWarn("Intento de login fallido - usuario no encontrado", {
        endpoint: "/auth/login",
        username: username,
      });
      
      return bad(res, "Credenciales inválidas", 401, { endpoint: "/auth/login" });
    }
    
    // Verificar si el usuario está activo
    if (usuario.activo !== 1) {
      logWarn("Intento de login fallido - usuario inactivo", {
        endpoint: "/auth/login",
        username: username,
      });
      
      return bad(res, "Usuario inactivo", 401, { endpoint: "/auth/login" });
    }
    
    // Verificar contraseña
    const passwordValid = await verifyPassword(password, usuario.password_hash);
    if (!passwordValid) {
      logWarn("Intento de login fallido - contraseña incorrecta", {
        endpoint: "/auth/login",
        username: username,
      });
      
      return bad(res, "Credenciales inválidas", 401, { endpoint: "/auth/login" });
    }
    
    // Migrar hash antiguo a bcrypt si es necesario
    if (usuario.password_hash.length === 64 && /^[a-f0-9]{64}$/i.test(usuario.password_hash)) {
      try {
        const newHash = await hashPassword(password);
        db.prepare(`UPDATE usuarios SET password_hash = ? WHERE id = ?`).run(newHash, usuario.id);
        logInfo("Hash de contraseña migrado a bcrypt", {
          endpoint: "/auth/login",
          userId: usuario.id,
        });
      } catch (e) {
        logError("Error migrando hash de contraseña", { userId: usuario.id, error: e });
      }
    }
    
    // Generar token
    const token = jwt.sign(
      { username: usuario.username, role: "admin", userId: usuario.id },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    logInfo("Login exitoso", {
      endpoint: "/auth/login",
      username: usuario.username,
      userId: usuario.id,
    });
    
    return res.json({
      ok: true,
      token,
      expiresIn: JWT_EXPIRES_IN,
    });
  }
);

// Endpoint: Crea una nueva sesión de evaluación usando un código
app.post(
  "/captura/sesion",
  apiLimiter,
  [
    body("codigo")
      .trim()
      .notEmpty().withMessage("codigo es requerido")
      .isLength({ min: 1, max: 20 }).withMessage("codigo debe tener entre 1 y 20 caracteres")
      .matches(/^[A-Z0-9]+$/).withMessage("codigo solo puede contener letras mayúsculas y números"),
  ],
  handleValidationErrors,
  (req, res) => {
    const { codigo } = req.body;

  const ee = db
    .prepare(
      `
    SELECT id, encuesta_id, equipo_id, activo, evaluado_nombre
    FROM encuesta_equipo
    WHERE codigo = ?
  `
    )
    .get(codigo.trim().toUpperCase());

  if (!ee || ee.activo !== 1)
    return bad(res, "Código no encontrado o inactivo", 404, {
      endpoint: "/captura/sesion",
      codigo: codigo,
    });

  const token = crypto.randomBytes(24).toString("hex");
  const info = db
    .prepare(
      `
    INSERT INTO sesiones_equipo (encuesta_equipo_id, token_sesion) VALUES (?, ?)
  `
    )
    .run(ee.id, token);

  const preguntas = db
    .prepare(
      `
    SELECT id, texto, dimension FROM preguntas WHERE encuesta_id = ? ORDER BY id
  `
    )
    .all(ee.encuesta_id);

  logInfo("Sesión creada", {
    endpoint: "/captura/sesion",
    sesion_id: info.lastInsertRowid,
    codigo: codigo,
  });

  res.json({
    sesion_id: info.lastInsertRowid,
    token_sesion: token,
    encuesta_id: ee.encuesta_id,
    equipo_id: ee.equipo_id,
    evaluado_nombre: ee.evaluado_nombre || null,
    preguntas,
    meta: { escala: [1, 2, 3, 4, 5] },
  });
});

// Endpoint: Guarda las respuestas de una evaluación (valida que todas las preguntas estén respondidas)
app.post(
  "/captura/respuestas",
  apiLimiter,
  [
    body("token_sesion")
      .trim()
      .notEmpty().withMessage("token_sesion es requerido")
      .isLength({ min: 1, max: 200 }).withMessage("token_sesion debe tener entre 1 y 200 caracteres"),
    body("respuestas")
      .isArray({ min: 1 }).withMessage("respuestas debe ser un array con al menos un elemento"),
    body("respuestas.*.pregunta_id")
      .isInt({ min: 1 }).withMessage("pregunta_id debe ser un número entero mayor a 0")
      .toInt(),
    body("respuestas.*.valor")
      .isInt({ min: 1, max: 5 }).withMessage("valor debe ser un número entre 1 y 5")
      .toInt(),
  ],
  handleValidationErrors,
  (req, res) => {
    const { token_sesion, respuestas } = req.body;

  for (const r of respuestas) {
    if (!r || !isInt(r.pregunta_id) || !isInt(r.valor) || r.valor < 1 || r.valor > 5) {
      return bad(res, "respuestas inválidas (pregunta_id int, valor 1..5)", 400, {
        endpoint: "/captura/respuestas",
        payload: r,
      });
    }
  }

  const ses = db
    .prepare(
      `
    SELECT s.id, s.finalizada, ee.encuesta_id
    FROM sesiones_equipo s
    JOIN encuesta_equipo ee ON ee.id = s.encuesta_equipo_id
    WHERE s.token_sesion = ?
  `
    )
    .get(token_sesion);

  if (!ses)
    return bad(res, "Sesión no encontrada", 404, {
      endpoint: "/captura/respuestas",
      token_sesion,
    });
  if (ses.finalizada === 1)
    return bad(res, "Sesión finalizada", 409, {
      endpoint: "/captura/respuestas",
      token_sesion,
    });

  // Obtener todas las preguntas de la encuesta
  const todasLasPreguntas = db
    .prepare(`SELECT id FROM preguntas WHERE encuesta_id = ?`)
    .all(ses.encuesta_id);
  
  const idsPreguntasEncuesta = todasLasPreguntas.map(p => p.id);
  const idsRespuestas = respuestas.map((r) => r.pregunta_id);
  
  // Validar que todas las preguntas de la encuesta tengan respuesta
  const preguntasSinRespuesta = idsPreguntasEncuesta.filter(id => !idsRespuestas.includes(id));
  
  if (preguntasSinRespuesta.length > 0) {
    return bad(res, `Faltan ${preguntasSinRespuesta.length} pregunta(s) sin responder. Debes responder todas las preguntas de la encuesta.`, 400, {
      endpoint: "/captura/respuestas",
      encuesta_id: ses.encuesta_id,
      preguntas_faltantes: preguntasSinRespuesta,
      total_preguntas: idsPreguntasEncuesta.length,
      respuestas_enviadas: idsRespuestas.length,
    });
  }

  // Validar que las respuestas pertenezcan a la encuesta
  const inClause = idsRespuestas.map(() => "?").join(",");
  const rows = db
    .prepare(
      `
    SELECT id FROM preguntas WHERE encuesta_id = ? AND id IN (${inClause})
  `
    )
    .all(ses.encuesta_id, ...idsRespuestas);
  if (rows.length !== idsRespuestas.length)
    return bad(res, "Hay preguntas fuera de la encuesta", 400, {
      endpoint: "/captura/respuestas",
      encuesta_id: ses.encuesta_id,
      ids: idsRespuestas,
    });

  const insert = db.prepare(
    `
    INSERT INTO respuestas (sesion_id, pregunta_id, valor)
    VALUES (?, ?, ?)
    ON CONFLICT(sesion_id, pregunta_id) DO UPDATE
    SET valor = excluded.valor, creado_en = datetime('now')
  `
  );

  let inserted = 0,
    updated = 0;
  const tx = db.transaction(() => {
    for (const r of respuestas) {
      const info = insert.run(ses.id, r.pregunta_id, r.valor);
      if (info.changes === 1) inserted++;
      else updated++;
    }
  });

  try {
    tx();
  } catch (e) {
    logError("Error guardando respuestas en BD", {
      endpoint: "/captura/respuestas",
      token_sesion,
      error: e,
    });
    return bad(res, "Error guardando respuestas", 500, {
      endpoint: "/captura/respuestas",
    });
  }

  logInfo("Respuestas guardadas", {
    endpoint: "/captura/respuestas",
    sesion_id: ses.id,
    inserted,
    updated,
  });

  res.json({ ok: true, inserted, updated });
});

// Endpoint: Finaliza una sesión de evaluación
app.post(
  "/captura/finalizar",
  apiLimiter,
  [
    body("token_sesion")
      .trim()
      .notEmpty().withMessage("token_sesion es requerido")
      .isLength({ min: 1, max: 200 }).withMessage("token_sesion debe tener entre 1 y 200 caracteres"),
  ],
  handleValidationErrors,
  (req, res) => {
    const { token_sesion } = req.body;

  const ses = db
    .prepare(`SELECT id, finalizada FROM sesiones_equipo WHERE token_sesion = ?`)
    .get(token_sesion);
  if (!ses)
    return bad(res, "Sesión no encontrada", 404, {
      endpoint: "/captura/finalizar",
      token_sesion,
    });
  if (ses.finalizada === 1)
    return bad(res, "Sesión ya finalizada", 409, {
      endpoint: "/captura/finalizar",
      token_sesion,
    });

  db.prepare(`UPDATE sesiones_equipo SET finalizada = 1 WHERE id = ?`).run(ses.id);
  logInfo("Sesión finalizada", {
    endpoint: "/captura/finalizar",
    sesion_id: ses.id,
  });
  res.json({ ok: true, finalizada: true });
});

// Endpoint: Crea un nuevo código de evaluación (genera código único si no se proporciona)
app.post(
  "/admin/codigos",
  requireAdmin,
  apiLimiter,
  [
    body("encuesta_id")
      .optional()
      .isInt({ min: 1 }).withMessage("encuesta_id debe ser un número entero mayor a 0")
      .toInt(),
    body("evaluado_nombre")
      .trim()
      .notEmpty().withMessage("evaluado_nombre es requerido")
      .isLength({ min: 1, max: 200 }).withMessage("evaluado_nombre debe tener entre 1 y 200 caracteres")
      .escape(),
    body("codigo")
      .optional()
      .trim()
      .isLength({ min: 1, max: 20 }).withMessage("codigo debe tener entre 1 y 20 caracteres")
      .matches(/^[A-Z0-9]+$/).withMessage("codigo solo puede contener letras mayúsculas y números"),
  ],
  handleValidationErrors,
  (req, res) => {
    let { encuesta_id = 1, evaluado_nombre, codigo } = req.body;
    encuesta_id = Number(encuesta_id);

  const equipo_id = ensureDefaultEquipo();
  const tryInsert = db.prepare(
    `
    INSERT INTO encuesta_equipo (encuesta_id, equipo_id, codigo, activo, evaluado_nombre)
    VALUES (?, ?, ?, 1, ?)
  `
  );

  // Intenta generar un código único (hasta 10 intentos)
  const desired = codigo && codigo.trim().toUpperCase();
  for (let i = 0; i < 10; i++) {
    const candidate = desired || genCode();
    try {
      const info = tryInsert.run(encuesta_id, equipo_id, candidate, evaluado_nombre.trim());
      logInfo("Código creado", {
        endpoint: "/admin/codigos",
        id: info.lastInsertRowid,
        codigo: candidate,
      });
      return res.json({
        id: info.lastInsertRowid,
        encuesta_id,
        equipo_id,
        codigo: candidate,
        activo: 1,
        evaluado_nombre: evaluado_nombre.trim(),
      });
    } catch (e) {
      logWarn("Intento de código duplicado", {
        endpoint: "/admin/codigos",
        candidate,
      });
      if (desired) return bad(res, "Código duplicado, intenta con otro", 409, { candidate });
      
    }
  }
  return bad(res, "No fue posible generar código único", 500, {
    endpoint: "/admin/codigos",
  });
});

// Endpoint: Obtiene la lista de todos los códigos de evaluación
app.get("/admin/codigos", requireAdmin, apiLimiter, (_req, res) => {
  const rows = db
    .prepare(
      `
    SELECT id, codigo, activo, evaluado_nombre
    FROM encuesta_equipo
    ORDER BY id DESC
  `
    )
    .all();
  
  res.json(rows);
});

// Endpoint: Actualiza los datos de un código existente
app.put(
  "/admin/codigos/:id",
  requireAdmin,
  apiLimiter,
  [
    param("id").isInt({ min: 1 }).withMessage("ID debe ser un número entero mayor a 0").toInt(),
    body("evaluado_nombre")
      .optional()
      .trim()
      .notEmpty().withMessage("evaluado_nombre no puede estar vacío")
      .isLength({ min: 1, max: 200 }).withMessage("evaluado_nombre debe tener entre 1 y 200 caracteres")
      .escape(),
    body("activo")
      .optional()
      .isBoolean().withMessage("activo debe ser un valor booleano")
      .toBoolean(),
    body("codigo")
      .optional()
      .trim()
      .notEmpty().withMessage("codigo no puede estar vacío")
      .isLength({ min: 1, max: 20 }).withMessage("codigo debe tener entre 1 y 20 caracteres")
      .matches(/^[A-Z0-9]+$/).withMessage("codigo solo puede contener letras mayúsculas y números")
      .customSanitizer(value => value.toUpperCase()),
  ],
  handleValidationErrors,
  (req, res) => {
    const id = Number(req.params.id);
    const { evaluado_nombre, activo, codigo } = req.body;

    // Verificar que existe el código
    const existing = db.prepare(`SELECT id FROM encuesta_equipo WHERE id = ?`).get(id);
    if (!existing)
      return bad(res, "Código no encontrado", 404, { endpoint: "/admin/codigos/:id", id });

    const updates = [];
    const params = [];

    if (evaluado_nombre !== undefined) {
      updates.push("evaluado_nombre = ?");
      params.push(evaluado_nombre.trim());
    }

    if (activo !== undefined) {
      updates.push("activo = ?");
      params.push(activo ? 1 : 0);
    }

    if (codigo !== undefined) {
      const codigoUpper = codigo.trim().toUpperCase();
      // Verificar que no esté duplicado (excepto el mismo registro)
      const duplicate = db.prepare(`SELECT id FROM encuesta_equipo WHERE codigo = ? AND id != ?`).get(codigoUpper, id);
      if (duplicate)
        return bad(res, "Código duplicado", 409, { endpoint: "/admin/codigos/:id", codigo: codigoUpper });
      updates.push("codigo = ?");
      params.push(codigoUpper);
    }

    if (updates.length === 0)
      return bad(res, "No hay campos para actualizar", 400, { endpoint: "/admin/codigos/:id" });

    params.push(id);
    const sql = `UPDATE encuesta_equipo SET ${updates.join(", ")} WHERE id = ?`;

    try {
      db.prepare(sql).run(...params);

      const updated = db.prepare(`
      SELECT id, codigo, activo, evaluado_nombre
      FROM encuesta_equipo
      WHERE id = ?
    `).get(id);

      res.json(updated);
    } catch (e) {
      logError("Error actualizando código", { endpoint: "/admin/codigos/:id", id, error: e });
      return bad(res, "Error actualizando código", 500, { endpoint: "/admin/codigos/:id" });
    }
  }
);

// Endpoint: Elimina o desactiva un código (desactiva si tiene sesiones con respuestas, elimina si no)
app.delete(
  "/admin/codigos/:id",
  requireAdmin,
  apiLimiter,
  [
    param("id").isInt({ min: 1 }).withMessage("ID debe ser un número entero mayor a 0"),
  ],
  handleValidationErrors,
  (req, res) => {
    const id = Number(req.params.id);

  const existing = db.prepare(`SELECT id, codigo FROM encuesta_equipo WHERE id = ?`).get(id);
  if (!existing) {
    return bad(res, "Código no encontrado", 404, { endpoint: "/admin/codigos/:id", id });
  }

  const deleteTransaction = db.transaction((codigoId) => {
    const sesiones = db.prepare(`
      SELECT s.id 
      FROM sesiones_equipo s 
      WHERE s.encuesta_equipo_id = ?
    `).all(codigoId);

    if (sesiones && sesiones.length > 0) {
      for (const sesion of sesiones) {
        const respCount = db.prepare(`SELECT COUNT(*) as total FROM respuestas WHERE sesion_id = ?`).get(sesion.id);
        const total = respCount && typeof respCount.total === 'number' ? respCount.total : 0;
        
        if (total > 0) {
          const updateResult = db.prepare(`UPDATE encuesta_equipo SET activo = 0 WHERE id = ?`).run(codigoId);
          return { desactivado: true, changes: updateResult.changes };
        }
      }
      
      db.prepare(`DELETE FROM sesiones_equipo WHERE encuesta_equipo_id = ?`).run(codigoId);
    }
    
    const result = db.prepare(`DELETE FROM encuesta_equipo WHERE id = ?`).run(codigoId);
    
    if (result.changes === 0) {
      throw new Error(`No se pudo eliminar el código con id ${codigoId}.`);
    }
    
    return { eliminado: true, changes: result.changes };
  });

  try {
    const result = deleteTransaction(id);
    
    if (result.desactivado) {
      return res.json({ ok: true, message: "Código desactivado (tiene sesiones con respuestas)", desactivado: true });
    }
    
    res.json({ ok: true, eliminado: true });
  } catch (e) {
    logError("Error eliminando código", { 
      endpoint: "/admin/codigos/:id", 
      id,
      error: e.message,
      stack: e.stack 
    });
    return bad(res, `Error eliminando código: ${e.message}`, 500, { endpoint: "/admin/codigos/:id" });
  }
});

// Endpoint: Obtiene las evaluaciones agrupadas por sesión (promedios por dimensión por sesión)
app.get("/admin/evaluaciones", requireAdmin, apiLimiter, (_req, res) => {
  const rows = db
    .prepare(
      `
    SELECT s.id AS sesion_id, ee.codigo, ee.evaluado_nombre, p.dimension, AVG(r.valor) AS promedio
    FROM sesiones_equipo s
    JOIN encuesta_equipo ee ON ee.id = s.encuesta_equipo_id
    JOIN respuestas r ON r.sesion_id = s.id
    JOIN preguntas p ON p.id = r.pregunta_id
    WHERE s.finalizada = 1
    GROUP BY s.id, p.dimension
    ORDER BY s.id DESC, p.dimension
  `
    )
    .all();

  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.sesion_id)) {
      map.set(row.sesion_id, {
        sesion_id: row.sesion_id,
        codigo: row.codigo,
        evaluado_nombre: row.evaluado_nombre,
        por_area: {},
      });
    }
    map.get(row.sesion_id).por_area[row.dimension] = Number(row.promedio.toFixed(2));
  }
  res.json(Array.from(map.values()));
});

// Endpoint: Obtiene los promedios acumulados por evaluado (suma todas las sesiones del evaluado)
app.get("/admin/evaluaciones-por-evaluado", requireAdmin, apiLimiter, (_req, res) => {
  const rows = db
    .prepare(
      `
    SELECT
      ee.id            AS evaluado_id,
      ee.codigo        AS codigo,
      ee.evaluado_nombre,
      p.dimension      AS dimension,
      AVG(r.valor)     AS promedio
    FROM sesiones_equipo s
    JOIN encuesta_equipo ee ON ee.id = s.encuesta_equipo_id
    JOIN respuestas r       ON r.sesion_id = s.id
    JOIN preguntas p        ON p.id = r.pregunta_id
    WHERE s.finalizada = 1
    GROUP BY ee.id, p.dimension
    ORDER BY ee.id DESC, p.dimension
  `
    )
    .all();

  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.evaluado_id)) {
      map.set(row.evaluado_id, {
        evaluado_id: row.evaluado_id,
        codigo: row.codigo,
        evaluado_nombre: row.evaluado_nombre,
        por_area: {},
      });
    }
    map.get(row.evaluado_id).por_area[row.dimension] = Number(row.promedio.toFixed(2));
  }
  res.json(Array.from(map.values()));
});

// ========== ENDPOINTS CRUD DE USUARIOS ==========

// Endpoint: Obtiene la lista de todos los usuarios
app.get("/admin/usuarios", requireAdmin, apiLimiter, (_req, res) => {
  const rows = db
    .prepare(
      `
    SELECT id, username, activo, creado_en, actualizado_en
    FROM usuarios
    ORDER BY id DESC
  `
    )
    .all();
  
  res.json(rows);
});

// Endpoint: Crea un nuevo usuario
app.post(
  "/admin/usuarios",
  requireAdmin,
  apiLimiter,
  [
    body("username")
      .trim()
      .notEmpty().withMessage("username es requerido")
      .isLength({ min: 3, max: 50 }).withMessage("username debe tener entre 3 y 50 caracteres")
      .matches(/^[a-zA-Z0-9_]+$/).withMessage("username solo puede contener letras, números y guiones bajos"),
    body("password")
      .notEmpty().withMessage("password es requerido")
      .isLength({ min: 4, max: 200 }).withMessage("password debe tener entre 4 y 200 caracteres"),
  ],
  handleValidationErrors,
  async (req, res) => {
    const { username, password } = req.body;
    
    const usernameTrimmed = username.trim();
    const passwordHash = await hashPassword(password);
    
    try {
      const info = db
        .prepare(
          `
        INSERT INTO usuarios (username, password_hash, activo)
        VALUES (?, ?, 1)
      `
        )
        .run(usernameTrimmed, passwordHash);
      
      logInfo("Usuario creado", {
        endpoint: "/admin/usuarios",
        id: info.lastInsertRowid,
        username: usernameTrimmed,
      });
      
      const nuevoUsuario = db
        .prepare(`SELECT id, username, activo, creado_en, actualizado_en FROM usuarios WHERE id = ?`)
        .get(info.lastInsertRowid);
      
      return res.json(nuevoUsuario);
    } catch (e) {
      if (e.message && e.message.includes("UNIQUE constraint failed")) {
        return bad(res, "El nombre de usuario ya existe", 409, {
          endpoint: "/admin/usuarios",
          username: usernameTrimmed,
        });
      }
      
      logError("Error creando usuario", {
        endpoint: "/admin/usuarios",
        error: e,
      });
      
      return bad(res, "Error creando usuario", 500, {
        endpoint: "/admin/usuarios",
      });
    }
  }
);

// Endpoint: Actualiza un usuario existente
app.put(
  "/admin/usuarios/:id",
  requireAdmin,
  apiLimiter,
  [
    param("id").isInt({ min: 1 }).withMessage("ID debe ser un número entero mayor a 0"),
    body("username")
      .optional()
      .trim()
      .notEmpty().withMessage("username no puede estar vacío")
      .isLength({ min: 3, max: 50 }).withMessage("username debe tener entre 3 y 50 caracteres")
      .matches(/^[a-zA-Z0-9_]+$/).withMessage("username solo puede contener letras, números y guiones bajos")
      .customSanitizer(value => value.trim().toLowerCase()),
    body("password")
      .optional()
      .isLength({ min: 4, max: 200 }).withMessage("password debe tener entre 4 y 200 caracteres"),
    body("activo")
      .optional()
      .isBoolean().withMessage("activo debe ser un valor booleano")
      .toBoolean(),
  ],
  handleValidationErrors,
  async (req, res) => {
    const id = Number(req.params.id);
    const { username, password, activo } = req.body;
    
    // Verificar que existe el usuario
    const existing = db.prepare(`SELECT id FROM usuarios WHERE id = ?`).get(id);
    if (!existing) {
      return bad(res, "Usuario no encontrado", 404, { endpoint: "/admin/usuarios/:id", id });
    }
    
    const updates = [];
    const params = [];
    
    if (username !== undefined) {
      const usernameTrimmed = username.trim();
      // Verificar que no esté duplicado (excepto el mismo registro)
      const duplicate = db
        .prepare(`SELECT id FROM usuarios WHERE username = ? AND id != ?`)
        .get(usernameTrimmed, id);
      if (duplicate) {
        return bad(res, "El nombre de usuario ya existe", 409, {
          endpoint: "/admin/usuarios/:id",
          username: usernameTrimmed,
        });
      }
      updates.push("username = ?");
      params.push(usernameTrimmed);
    }
    
    if (password !== undefined && password.trim()) {
      const passwordHash = await hashPassword(password);
      updates.push("password_hash = ?");
      params.push(passwordHash);
    }
    
    if (activo !== undefined) {
      updates.push("activo = ?");
      params.push(activo ? 1 : 0);
    }
    
    if (updates.length === 0) {
      return bad(res, "No hay campos para actualizar", 400, { endpoint: "/admin/usuarios/:id" });
    }
    
    // Actualizar fecha de modificación
    updates.push("actualizado_en = datetime('now')");
    
    params.push(id);
    const sql = `UPDATE usuarios SET ${updates.join(", ")} WHERE id = ?`;
    
    try {
      db.prepare(sql).run(...params);
      
      const updated = db
        .prepare(
          `
        SELECT id, username, activo, creado_en, actualizado_en
        FROM usuarios
        WHERE id = ?
      `
        )
        .get(id);
      
      logInfo("Usuario actualizado", {
        endpoint: "/admin/usuarios/:id",
        id,
      });
      
      res.json(updated);
    } catch (e) {
      logError("Error actualizando usuario", { endpoint: "/admin/usuarios/:id", id, error: e });
      return bad(res, "Error actualizando usuario", 500, { endpoint: "/admin/usuarios/:id" });
    }
  }
);

// Endpoint: Elimina un usuario
app.delete(
  "/admin/usuarios/:id",
  requireAdmin,
  apiLimiter,
  [
    param("id").isInt({ min: 1 }).withMessage("ID debe ser un número entero mayor a 0"),
  ],
  handleValidationErrors,
  (req, res) => {
    const id = Number(req.params.id);
    
    const existing = db.prepare(`SELECT id, username FROM usuarios WHERE id = ?`).get(id);
    if (!existing) {
      return bad(res, "Usuario no encontrado", 404, { endpoint: "/admin/usuarios/:id", id });
    }
    
    try {
      const result = db.prepare(`DELETE FROM usuarios WHERE id = ?`).run(id);
      
      if (result.changes === 0) {
        return bad(res, "No se pudo eliminar el usuario", 500, {
          endpoint: "/admin/usuarios/:id",
          id,
        });
      }
      
      logInfo("Usuario eliminado", {
        endpoint: "/admin/usuarios/:id",
        id,
        username: existing.username,
      });
      
      res.json({ ok: true, eliminado: true });
    } catch (e) {
      logError("Error eliminando usuario", {
        endpoint: "/admin/usuarios/:id",
        id,
        error: e.message,
        stack: e.stack,
      });
      return bad(res, `Error eliminando usuario: ${e.message}`, 500, {
        endpoint: "/admin/usuarios/:id",
      });
    }
  }
);

app.use((req, res) => {
  bad(res, "Ruta no encontrada", 404, { endpoint: req.url, method: req.method });
});

app.use((err, _req, res, _next) => {
  logError("Excepción no controlada", err);
  res.status(500).json({ error: "Error interno del servidor" });
});

app.listen(PORT, "0.0.0.0", () => {
  logInfo(`API escuchando en http://0.0.0.0:${PORT}`, { port: PORT });
});

process.on("uncaughtException", (err) => {
  logError("uncaughtException", err);
});
process.on("unhandledRejection", (reason) => {
  logError("unhandledRejection", { reason });
});
