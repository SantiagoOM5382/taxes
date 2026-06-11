// Fase 1: cuentas, ingresos, movimientos + categorías y frecuencia en deudas.
// Ejecutar: node scripts/migrate-finanzas.mjs
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

await db.batch([
  `CREATE TABLE IF NOT EXISTS cuentas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'banco',         -- banco | billetera | exchange | efectivo
    moneda TEXT NOT NULL DEFAULT 'COP',         -- COP | USD
    saldo REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS ingresos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    descripcion TEXT NOT NULL,
    monto REAL NOT NULL,
    frecuencia TEXT NOT NULL DEFAULT 'mensual', -- semanal | quincenal | mensual | unico
    tipo TEXT NOT NULL DEFAULT 'base',          -- base | extra
    cuenta_id INTEGER REFERENCES cuentas(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS movimientos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    cuenta_id INTEGER NOT NULL REFERENCES cuentas(id),
    tipo TEXT NOT NULL,                          -- recarga | retiro | transferencia | pago_deuda | ajuste
    monto REAL NOT NULL,                         -- positivo entra, negativo sale
    descripcion TEXT,
    fecha TEXT NOT NULL DEFAULT (date('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
]);

// Columnas nuevas (SQLite no tiene ADD COLUMN IF NOT EXISTS)
async function addColumn(sql) {
  try {
    await db.execute(sql);
    console.log("OK:", sql);
  } catch (e) {
    if (/duplicate column/i.test(e.message)) console.log("Ya existe:", sql);
    else throw e;
  }
}

await addColumn("ALTER TABLE deudas ADD COLUMN categoria TEXT NOT NULL DEFAULT 'deuda'");
await addColumn("ALTER TABLE deudas ADD COLUMN frecuencia_pago TEXT");
await addColumn("ALTER TABLE deudas ADD COLUMN valor_estimado REAL");
await addColumn("ALTER TABLE pagos ADD COLUMN cuenta_id INTEGER REFERENCES cuentas(id)");
await addColumn("ALTER TABLE cuentas ADD COLUMN estado TEXT NOT NULL DEFAULT 'activa'"); // activa | inactiva | archivada

console.log("\nMigración completada. Tablas actuales:");
const res = await db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
for (const row of res.rows) console.log(" -", row.name);
