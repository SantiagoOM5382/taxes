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
  estado: "activa" | "archivada";
  frecuencia_pago: string | null;
  valor_estimado: number | null;
  tasa_interes: number | null;
  fecha_vencimiento: string | null;
  dia_pago: number | null;
  mes_pago: number | null;
  pagada_mes_actual?: boolean;        // responsabilidades only
  ultimo_reset_fecha?: string | null; // responsabilidades only
  dueno?: string;                      // nombre del dueño (en listDeudas)
}

function aplicarResetPeriodo(deuda: Deuda): Deuda {
  if (deuda.categoria !== "responsabilidad") {
    return deuda; // solo aplica a responsabilidades
  }

  const now = new Date();

  // Si nunca se ha reseteado, setear fecha pero no resetear
  if (!deuda.ultimo_reset_fecha) {
    return {
      ...deuda,
      ultimo_reset_fecha: now.toISOString(),
    };
  }

  const ultimoReset = new Date(deuda.ultimo_reset_fecha);
  let proximoReset = new Date(ultimoReset);

  // Calcular próximo reset basado en frecuencia_pago
  switch (deuda.frecuencia_pago?.toLowerCase()) {
    case "diaria":
      proximoReset.setDate(proximoReset.getDate() + 1);
      break;
    case "semanal":
      proximoReset.setDate(proximoReset.getDate() + 7);
      break;
    case "quincenal":
      proximoReset.setDate(proximoReset.getDate() + 15);
      break;
    case "mensual":
      proximoReset.setMonth(proximoReset.getMonth() + 1);
      break;
    case "semestral":
      proximoReset.setMonth(proximoReset.getMonth() + 6);
      break;
    case "anual":
      proximoReset.setFullYear(proximoReset.getFullYear() + 1);
      break;
    default:
      // Si no hay frecuencia especificada, asumir mensual
      proximoReset.setMonth(proximoReset.getMonth() + 1);
  }

  // Si ya pasó la fecha de próximo reset, resetear y desarchizar
  if (now >= proximoReset) {
    return {
      ...deuda,
      pagada_mes_actual: false,
      estado: "activa",
      ultimo_reset_fecha: now.toISOString(),
    };
  }

  return deuda;
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
  const deudaMapeada = {
    id: Number(row.id),
    user_id: Number(row.user_id),
    descripcion: String(row.descripcion),
    acreedor: row.acreedor ? String(row.acreedor) : null,
    monto_inicial: Number(row.monto_inicial),
    total_pagado: Number(row.total_pagado),
    monto_actual: Number(row.monto_inicial) - Number(row.total_pagado),
    es_propia: Boolean(Number(row.es_propia)),
    categoria: row.categoria === "responsabilidad" ? "responsabilidad" : "deuda",
    estado: (row.estado === "archivada" ? "archivada" : "activa") as "activa" | "archivada",
    pagada_mes_actual: Boolean(Number(row.pagada_mes_actual ?? 0)),
    ultimo_reset_fecha: row.ultimo_reset_fecha ? String(row.ultimo_reset_fecha) : null,
    frecuencia_pago: row.frecuencia_pago ? String(row.frecuencia_pago) : null,
    valor_estimado: row.valor_estimado != null ? Number(row.valor_estimado) : null,
    tasa_interes: row.tasa_interes != null ? Number(row.tasa_interes) : null,
    fecha_vencimiento: row.fecha_vencimiento ? String(row.fecha_vencimiento) : null,
    dia_pago: row.dia_pago != null ? Number(row.dia_pago) : null,
    mes_pago: row.mes_pago != null ? Number(row.mes_pago) : null,
  } satisfies Deuda;
  return aplicarResetPeriodo(deudaMapeada);
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
  return result.rows.map((row) => {
    const deuda = {
      id: Number(row.id),
      user_id: Number(row.user_id),
      descripcion: String(row.descripcion),
      acreedor: row.acreedor ? String(row.acreedor) : null,
      monto_inicial: Number(row.monto_inicial),
      total_pagado: Number(row.total_pagado),
      monto_actual: Number(row.monto_inicial) - Number(row.total_pagado),
      es_propia: Boolean(Number(row.es_propia)),
      categoria: (row.categoria === "responsabilidad" ? "responsabilidad" : "deuda") as
        | "deuda"
        | "responsabilidad",
      estado: (row.estado === "archivada" ? "archivada" : "activa") as "activa" | "archivada",
      pagada_mes_actual: Boolean(Number(row.pagada_mes_actual ?? 0)),
      ultimo_reset_fecha: row.ultimo_reset_fecha ? String(row.ultimo_reset_fecha) : null,
      frecuencia_pago: row.frecuencia_pago ? String(row.frecuencia_pago) : null,
      valor_estimado: row.valor_estimado != null ? Number(row.valor_estimado) : null,
      tasa_interes: row.tasa_interes != null ? Number(row.tasa_interes) : null,
      fecha_vencimiento: row.fecha_vencimiento ? String(row.fecha_vencimiento) : null,
      dia_pago: row.dia_pago != null ? Number(row.dia_pago) : null,
      mes_pago: row.mes_pago != null ? Number(row.mes_pago) : null,
      dueno: row.dueno ? String(row.dueno) : undefined,
    } satisfies Deuda;
    return aplicarResetPeriodo(deuda);
  });
}

export interface Responsabilidad {
  id: number;
  descripcion: string;
  frecuencia_pago: string;
  valor_estimado: number | null;
  dia_pago: number | null;
  mes_pago: number | null;
  created_at: string;
}

export async function listResponsabilidades(userId: string): Promise<Responsabilidad[]> {
  const result = await db.execute({
    sql: `SELECT id, descripcion, frecuencia_pago, valor_estimado, dia_pago, mes_pago, created_at
          FROM deudas
          WHERE user_id = ? AND dia_pago IS NOT NULL AND estado != 'archivada'
          ORDER BY dia_pago`,
    args: [userId],
  });
  return result.rows.map((r) => ({
    id: Number(r.id),
    descripcion: String(r.descripcion),
    frecuencia_pago: String(r.frecuencia_pago ?? "mensual"),
    valor_estimado: r.valor_estimado != null ? Number(r.valor_estimado) : null,
    dia_pago: r.dia_pago != null ? Number(r.dia_pago) : null,
    mes_pago: r.mes_pago != null ? Number(r.mes_pago) : null,
    created_at: String(r.created_at),
  }));
}
