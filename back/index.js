import express from "express";
import Database from "better-sqlite3";
import crypto from "crypto";
import fs from "fs";
import cors from "cors";

const PORT = Number(process.env.PORT || 3001);
const DB_FILE = process.env.DB_FILE || "./data.db";


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

function logInfo(msg, meta = null) {
  if (meta) {
    writeLog(`INFO  ${msg} | ${JSON.stringify(meta)}`);
  } else {
    writeLog(`INFO  ${msg}`);
  }
}

function logWarn(msg, meta = null) {
  if (meta) {
    writeLog(`WARN  ${msg} | ${JSON.stringify(meta)}`);
  } else {
    writeLog(`WARN  ${msg}`);
  }
}

function logError(msg, meta = null) {
  if (meta instanceof Error) {
    writeLog(`ERROR ${msg} | ${meta.message} | ${meta.stack}`);
  } else if (meta) {
    writeLog(`ERROR ${msg} | ${JSON.stringify(meta)}`);
  } else {
    writeLog(`ERROR ${msg}`);
  }
}


const firstRun = !fs.existsSync(DB_FILE);
const db = new Database(DB_FILE);
db.pragma("foreign_keys = ON");

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

    /* Incluye evaluado_nombre */
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


const app = express();
app.use(cors());
app.options("*", cors());
app.use(express.json());

// Normalizar URL
app.use((req, _res, next) => {
  req.url = req.url.replace(/\/{2,}/g, "/");
  next();
});

// LOGS
app.use((req, _res, next) => {
  logInfo("REQUEST", {
    method: req.method,
    url: req.url,
    ip: req.ip,
  });
  next();
});

const bad = (res, msg, code = 400, ctx = {}) => {
  const meta = { code, ...ctx };
  if (code >= 500) {
    logError(msg, meta);
  } else {
    logWarn(msg, meta);
  }
  return res.status(code).json({ error: msg });
};
const isInt = (v) => Number.isInteger(v);
const notEmptyStr = (s) => typeof s === "string" && s.trim().length > 0;

function genCode() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const nums = "0123456789";
  const pick = (pool, n) =>
    Array.from({ length: n }, () => pool[Math.floor(Math.random() * pool.length)]).join("");
  return pick(letters, 3) + pick(nums, 3);
}

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
//verificar que la api este funcionando
app.get("/health", (_req, res) => res.json({ ok: true }));

// Crear sesión usando un codigo 
app.post("/captura/sesion", (req, res) => {
  const { codigo } = req.body || {};
  if (!notEmptyStr(codigo))
    return bad(res, "Código requerido", 400, { endpoint: "/captura/sesion" });

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

// Guardar respuestas 
app.post("/captura/respuestas", (req, res) => {
  const { token_sesion, respuestas } = req.body || {};
  if (!notEmptyStr(token_sesion))
    return bad(res, "token_sesion requerido", 400, { endpoint: "/captura/respuestas" });
  if (!Array.isArray(respuestas) || respuestas.length === 0)
    return bad(res, "respuestas[] requerido", 400, {
      endpoint: "/captura/respuestas",
    });

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

// Finalizar sesión
app.post("/captura/finalizar", (req, res) => {
  const { token_sesion } = req.body || {};
  if (!notEmptyStr(token_sesion))
    return bad(res, "token_sesion requerido", 400, { endpoint: "/captura/finalizar" });

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

// Crear código de evaluacion 
app.post("/admin/codigos", (req, res) => {
  let { encuesta_id = 1, evaluado_nombre, codigo } = req.body || {};
  encuesta_id = Number(encuesta_id);
  if (!Number.isInteger(encuesta_id) || encuesta_id < 1)
    return bad(res, "encuesta_id inválido", 400, { endpoint: "/admin/codigos" });
  if (!evaluado_nombre || !evaluado_nombre.trim())
    return bad(res, "evaluado_nombre requerido", 400, {
      endpoint: "/admin/codigos",
    });

  const equipo_id = ensureDefaultEquipo();
  const tryInsert = db.prepare(
    `
    INSERT INTO encuesta_equipo (encuesta_id, equipo_id, codigo, activo, evaluado_nombre)
    VALUES (?, ?, ?, 1, ?)
  `
  );

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

// Listar códigos
app.get("/admin/codigos", (_req, res) => {
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

// Actualizar código
app.put("/admin/codigos/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!isInt(id) || id < 1)
    return bad(res, "ID inválido", 400, { endpoint: "/admin/codigos/:id" });

  const { evaluado_nombre, activo, codigo } = req.body || {};
  
  // Verificar que existe el código
  const existing = db.prepare(`SELECT id FROM encuesta_equipo WHERE id = ?`).get(id);
  if (!existing)
    return bad(res, "Código no encontrado", 404, { endpoint: "/admin/codigos/:id", id });

  const updates = [];
  const params = [];

  if (evaluado_nombre !== undefined) {
    if (!notEmptyStr(evaluado_nombre))
      return bad(res, "evaluado_nombre debe ser un string no vacío", 400, { endpoint: "/admin/codigos/:id" });
    updates.push("evaluado_nombre = ?");
    params.push(evaluado_nombre.trim());
  }

  if (activo !== undefined) {
    if (typeof activo !== "boolean" && activo !== 0 && activo !== 1)
      return bad(res, "activo debe ser 0 o 1", 400, { endpoint: "/admin/codigos/:id" });
    updates.push("activo = ?");
    params.push(activo ? 1 : 0);
  }

  if (codigo !== undefined) {
    if (!notEmptyStr(codigo))
      return bad(res, "codigo debe ser un string no vacío", 400, { endpoint: "/admin/codigos/:id" });
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
});

// Eliminar código
app.delete("/admin/codigos/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!isInt(id) || id < 1)
    return bad(res, "ID inválido", 400, { endpoint: "/admin/codigos/:id" });

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

// Promedios por sesión finalizada 
app.get("/admin/evaluaciones", (_req, res) => {
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

app.get("/admin/evaluaciones-por-evaluado", (_req, res) => {
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

app.use((req, res) => {
  bad(res, "Ruta no encontrada", 404, { endpoint: req.url, method: req.method });
});

app.use((err, _req, res, _next) => {
  logError("Excepción no controlada", err);
  res.status(500).json({ error: "Error interno del servidor" });
});

// LOG
// Escuchar en todas las interfaces (0.0.0.0) para permitir conexiones desde dispositivos móviles
app.listen(PORT, "0.0.0.0", () => {
  logInfo(`API escuchando en http://0.0.0.0:${PORT}`, { port: PORT });
  logInfo(`API accesible desde: http://localhost:${PORT}`, { port: PORT });
  logInfo(`Para dispositivos móviles, usa la IP de tu máquina en la red local`, { port: PORT });
});

process.on("uncaughtException", (err) => {
  logError("uncaughtException", err);
});
process.on("unhandledRejection", (reason) => {
  logError("unhandledRejection", { reason });
});
