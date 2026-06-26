// scripts/migrate-calendario.mjs
// Ejecutar: node scripts/migrate-calendario.mjs
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
  "ALTER TABLE deudas ADD COLUMN dia_pago INTEGER",
  "ALTER TABLE deudas ADD COLUMN mes_pago INTEGER",
  "ALTER TABLE cuentas ADD COLUMN es_credito INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE cuentas ADD COLUMN dia_pago_credito INTEGER",
]);

console.log("Migración calendario completada.");
process.exit(0);
