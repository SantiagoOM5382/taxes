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

function calcularProximoDiaPago(
  frecuencia: string | null,
  dia_pago: number | null,
  mes_pago: number | null,
  now: Date
): Date {
  const prox = new Date(now);

  if (!dia_pago) {
    // Sin día específico, default a hoy
    return prox;
  }

  const mesActual = now.getMonth();
  const diaActual = now.getDate();
  const anioActual = now.getFullYear();
  const ultDiaDelMes = new Date(anioActual, mesActual + 1, 0).getDate();
  const diaPagoEfectivo = Math.min(dia_pago, ultDiaDelMes);

  switch (frecuencia?.toLowerCase()) {
    case "diaria":
      prox.setDate(diaActual + 1);
      return prox;

    case "semanal": {
      const diasHastaDiaPago = (diaPagoEfectivo - diaActual + 7) % 7 || 7;
      prox.setDate(diaActual + diasHastaDiaPago);
      return prox;
    }

    case "quincenal": {
      // Próximo 15 o 30
      if (diaActual < 15) {
        prox.setDate(15);
      } else if (diaActual < 30 && ultDiaDelMes >= 30) {
        prox.setDate(30);
      } else {
        // Próximo mes, día 15
        prox.setMonth(mesActual + 1);
        prox.setDate(15);
      }
      return prox;
    }

    case "mensual": {
      if (diaActual < diaPagoEfectivo) {
        prox.setDate(diaPagoEfectivo);
      } else {
        prox.setMonth(mesActual + 1);
        const ultDelProxMes = new Date(anioActual, mesActual + 2, 0).getDate();
        prox.setDate(Math.min(dia_pago, ultDelProxMes));
      }
      return prox;
    }

    case "semestral": {
      if (mes_pago == null) return prox;
      const mesPagoIndex = mes_pago - 1; // 0-indexed
      const mesProx = mesPagoIndex < mesActual ? mesPagoIndex + 6 : mesPagoIndex;
      const anioProx = mesPagoIndex < mesActual ? anioActual + 1 : anioActual;
      prox.setFullYear(anioProx);
      prox.setMonth(mesProx);
      const ultDelMesProx = new Date(anioProx, mesProx + 1, 0).getDate();
      prox.setDate(Math.min(dia_pago, ultDelMesProx));
      return prox;
    }

    case "anual": {
      if (mes_pago == null) return prox;
      const mesPagoIndex = mes_pago - 1; // 0-indexed
      if (
        mesActual > mesPagoIndex ||
        (mesActual === mesPagoIndex && diaActual > diaPagoEfectivo)
      ) {
        prox.setFullYear(anioActual + 1);
      }
      prox.setMonth(mesPagoIndex);
      const ultDelMesPago = new Date(prox.getFullYear(), mesPagoIndex + 1, 0).getDate();
      prox.setDate(Math.min(dia_pago, ultDelMesPago));
      return prox;
    }

    default:
      // Asumir mensual
      if (diaActual < diaPagoEfectivo) {
        prox.setDate(diaPagoEfectivo);
      } else {
        prox.setMonth(mesActual + 1);
        const ultDelProxMes = new Date(anioActual, mesActual + 2, 0).getDate();
        prox.setDate(Math.min(dia_pago || 1, ultDelProxMes));
      }
      return prox;
  }
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

  // Calcular próximo día de pago basado en días reales, no duración
  const proximoDiaPago = calcularProximoDiaPago(
    deuda.frecuencia_pago,
    deuda.dia_pago,
    deuda.mes_pago,
    now
  );

  // Si hoy >= próximo día de pago, resetear y desarchizar
  if (now >= proximoDiaPago) {
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
