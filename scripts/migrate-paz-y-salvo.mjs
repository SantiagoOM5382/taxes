// Agrega deudas.paz_y_salvo_url: documento de paz y salvo que se sube al saldar una deuda.
// Columna opcional; no modifica datos existentes. Se puede correr varias veces.
// Ejecutar: node scripts/migrate-paz-y-salvo.mjs
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

const cols = await db.execute("PRAGMA table_info(deudas)");
if (cols.rows.some((c) => c.name === "paz_y_salvo_url")) {
  console.log("La columna paz_y_salvo_url ya existe; nada que hacer.");
} else {
  await db.execute("ALTER TABLE deudas ADD COLUMN paz_y_salvo_url TEXT");
  console.log("Migración completa: deudas.paz_y_salvo_url agregada");
}
