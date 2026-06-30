// Agrega columna estado a deudas para archivado automático al pagarse completas.
// Ejecutar: node scripts/migrate-archivar-deudas.mjs
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
  `ALTER TABLE deudas ADD COLUMN estado TEXT NOT NULL DEFAULT 'activa'`,
]);

console.log("Migración completa: deudas.estado agregado");
