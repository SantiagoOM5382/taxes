// Agrega columnas para tracking de "cumplida este período" en responsabilidades.
// Ejecutar: node scripts/migrate-cumplida-periodo.mjs
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
  `ALTER TABLE deudas ADD COLUMN pagada_mes_actual BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE deudas ADD COLUMN ultimo_reset_fecha DATETIME`,
]);

console.log("Migración completa: columnas pagada_mes_actual y ultimo_reset_fecha agregadas");
