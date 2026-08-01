// Archiva todas las responsabilidades pagadas (pagada_mes_actual = true)
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

await db.execute({
  sql: `UPDATE deudas
        SET estado = 'archivada'
        WHERE categoria = 'responsabilidad'
          AND pagada_mes_actual = true
          AND estado != 'archivada'`,
  args: [],
});

console.log("✓ Responsabilidades pagadas archivadas");
