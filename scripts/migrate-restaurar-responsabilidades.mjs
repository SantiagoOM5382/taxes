// Corrige responsabilidades que quedaron archivadas por el error anterior:
// marcar "cumplida" las archivaba y el reinicio de periodo nunca las devolvía.
// Ahora "pagada este periodo" se calcula aparte y archivar es una acción manual,
// así que estas vuelven a activas y sin marca (el periodo se calcula con sus pagos).
//
// Ejecutar:  node scripts/migrate-restaurar-responsabilidades.mjs          (solo muestra)
//            node scripts/migrate-restaurar-responsabilidades.mjs --aplicar (aplica)
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

const afectadas = await db.execute(
  `SELECT id, user_id, descripcion FROM deudas
   WHERE categoria = 'responsabilidad' AND estado = 'archivada' AND pagada_mes_actual = 1`
);
console.table(afectadas.rows);

if (!process.argv.includes("--aplicar")) {
  console.log(`${afectadas.rows.length} responsabilidades por restaurar. Usa --aplicar para corregirlas.`);
  process.exit(0);
}

const res = await db.execute(
  `UPDATE deudas SET estado = 'activa', pagada_mes_actual = 0, ultimo_reset_fecha = NULL
   WHERE categoria = 'responsabilidad' AND estado = 'archivada' AND pagada_mes_actual = 1`
);
console.log(`Restauradas: ${res.rowsAffected}`);
