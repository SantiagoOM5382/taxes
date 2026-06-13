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
  categoria: "deuda" | "responsabilidad";
  frecuencia_pago: string | null;
  valor_estimado: number | null;
  tasa_interes: number | null;
  fecha_vencimiento: string | null;
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
    categoria: row.categoria === "responsabilidad" ? "responsabilidad" : "deuda",
    frecuencia_pago: row.frecuencia_pago ? String(row.frecuencia_pago) : null,
    valor_estimado: row.valor_estimado != null ? Number(row.valor_estimado) : null,
    tasa_interes: row.tasa_interes != null ? Number(row.tasa_interes) : null,
    fecha_vencimiento: row.fecha_vencimiento ? String(row.fecha_vencimiento) : null,
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
    categoria: (row.categoria === "responsabilidad" ? "responsabilidad" : "deuda") as
      | "deuda"
      | "responsabilidad",
    frecuencia_pago: row.frecuencia_pago ? String(row.frecuencia_pago) : null,
    valor_estimado: row.valor_estimado != null ? Number(row.valor_estimado) : null,
    tasa_interes: row.tasa_interes != null ? Number(row.tasa_interes) : null,
    fecha_vencimiento: row.fecha_vencimiento ? String(row.fecha_vencimiento) : null,
  }));
}
