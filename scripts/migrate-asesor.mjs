// Fase 2: campos para el asesor financiero IA.
// - deudas: tasa_interes (% anual) y fecha_vencimiento → habilitan avalancha y alertas.
// - users: plan (free | premium) para el control de monetización.
// - ia_uso: contador de consultas IA por usuario y mes, base para límites.
// Ejecutar: node scripts/migrate-asesor.mjs
import { createClient } from "@libsql/client";
import { readFileSync, existsSync } from "node:fs";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
    if (m) process.env[m[1]] ??= m[2];
  }
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

await db.execute(`CREATE TABLE IF NOT EXISTS ia_uso (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  periodo TEXT NOT NULL,                         -- 'YYYY-MM' para el conteo mensual
  consultas INTEGER NOT NULL DEFAULT 0,
  ultima_consulta TEXT,
  UNIQUE (user_id, periodo)
)`);

async function addColumn(sql) {
  try {
    await db.execute(sql);
    console.log("OK:", sql);
  } catch (e) {
    if (/duplicate column/i.test(e.message)) console.log("Ya existe:", sql);
    else throw e;
  }
}

await addColumn("ALTER TABLE deudas ADD COLUMN tasa_interes REAL");        // % anual, opcional
await addColumn("ALTER TABLE deudas ADD COLUMN fecha_vencimiento TEXT");   // 'YYYY-MM-DD', opcional
await addColumn("ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'"); // free | premium

console.log("\nMigración completada. Tablas actuales:");
const res = await db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
for (const row of res.rows) console.log(" -", row.name);
