import { db } from "./db";

export interface Deuda {
  id: number;
  user_id: number;
  descripcion: string;
  acreedor: string | null;
  monto_inicial: number;
  total_pagado: number;
  monto_actual: number;
  es_propia: boolean;
}

// Devuelve la deuda solo si el usuario es dueño o tiene acceso compartido.
export async function getDeudaConAcceso(deudaId: string, userId: string) {
  const result = await db.execute({
    sql: `SELECT d.*,
            COALESCE((SELECT SUM(p.monto) FROM pagos p WHERE p.deuda_id = d.id), 0) AS total_pagado,
            (d.user_id = ?) AS es_propia
          FROM deudas d
          WHERE d.id = ?
            AND (d.user_id = ? OR EXISTS (
              SELECT 1 FROM deuda_accesos a WHERE a.deuda_id = d.id AND a.user_id = ?
            ))`,
    args: [userId, deudaId, userId, userId],
  });
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    descripcion: String(row.descripcion),
    acreedor: row.acreedor ? String(row.acreedor) : null,
    monto_inicial: Number(row.monto_inicial),
    total_pagado: Number(row.total_pagado),
    monto_actual: Number(row.monto_inicial) - Number(row.total_pagado),
    es_propia: Boolean(Number(row.es_propia)),
  } satisfies Deuda;
}

export async function listDeudas(userId: string) {
  const result = await db.execute({
    sql: `SELECT d.*, u.nombre AS dueno,
            COALESCE((SELECT SUM(p.monto) FROM pagos p WHERE p.deuda_id = d.id), 0) AS total_pagado,
            (d.user_id = ?) AS es_propia
          FROM deudas d
          JOIN users u ON u.id = d.user_id
          WHERE d.user_id = ?
             OR EXISTS (SELECT 1 FROM deuda_accesos a WHERE a.deuda_id = d.id AND a.user_id = ?)
          ORDER BY d.created_at DESC`,
    args: [userId, userId, userId],
  });
  return result.rows.map((row) => ({
    id: Number(row.id),
    descripcion: String(row.descripcion),
    acreedor: row.acreedor ? String(row.acreedor) : null,
    dueno: String(row.dueno),
    monto_inicial: Number(row.monto_inicial),
    total_pagado: Number(row.total_pagado),
    monto_actual: Number(row.monto_inicial) - Number(row.total_pagado),
    es_propia: Boolean(Number(row.es_propia)),
  }));
}
