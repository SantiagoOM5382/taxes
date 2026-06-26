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

async function addColumn(sql) {
  try {
    await db.execute(sql);
    console.log("OK:", sql);
  } catch (e) {
    if (/duplicate column/i.test(e.message)) console.log("Ya existe:", sql);
    else throw e;
  }
}

await addColumn("ALTER TABLE deudas ADD COLUMN dia_pago INTEGER");
await addColumn("ALTER TABLE deudas ADD COLUMN mes_pago INTEGER");
await addColumn("ALTER TABLE cuentas ADD COLUMN es_credito INTEGER NOT NULL DEFAULT 0");
await addColumn("ALTER TABLE cuentas ADD COLUMN dia_pago_credito INTEGER");

console.log("Migración calendario completada.");
process.exit(0);
