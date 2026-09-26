import { db } from "./db";
import { estadoPeriodo, hoyColombia, periodoDe, type PagoFecha } from "./periodos";

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
  // Solo responsabilidades: estado del periodo en curso (calculado, no guardado)
  pagada_mes_actual?: boolean;
  pagada_por_pagos?: boolean;
  pagado_en_periodo?: number;
  dueno?: string;
}

type Fila = Record<string, unknown>;

function mapear(row: Fila): Deuda {
  const monto_inicial = Number(row.monto_inicial);
  const total_pagado = Number(row.total_pagado);
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    descripcion: String(row.descripcion),
    acreedor: row.acreedor ? String(row.acreedor) : null,
    monto_inicial,
    total_pagado,
    monto_actual: monto_inicial - total_pagado,
    es_propia: Boolean(Number(row.es_propia)),
    categoria: row.categoria === "responsabilidad" ? "responsabilidad" : "deuda",
    estado: row.estado === "archivada" ? "archivada" : "activa",
    frecuencia_pago: row.frecuencia_pago ? String(row.frecuencia_pago) : null,
    valor_estimado: row.valor_estimado != null ? Number(row.valor_estimado) : null,
    tasa_interes: row.tasa_interes != null ? Number(row.tasa_interes) : null,
    fecha_vencimiento: row.fecha_vencimiento ? String(row.fecha_vencimiento) : null,
    dia_pago: row.dia_pago != null ? Number(row.dia_pago) : null,
    mes_pago: row.mes_pago != null ? Number(row.mes_pago) : null,
    dueno: row.dueno ? String(row.dueno) : undefined,
  };
}

// La marca manual guarda en ultimo_reset_fecha la clave del periodo marcado.
// Si la clave no coincide con el periodo actual, la marca ya venció y no cuenta.
function marcaManual(row: Fila): string | null {
  return Number(row.pagada_mes_actual ?? 0) && row.ultimo_reset_fecha ? String(row.ultimo_reset_fecha) : null;
}

async function pagosPorDeuda(ids: number[]): Promise<Map<number, PagoFecha[]>> {
  const mapa = new Map<number, PagoFecha[]>();
  if (ids.length === 0) return mapa;
  const res = await db.execute({
    sql: `SELECT deuda_id, monto, fecha_pago FROM pagos WHERE deuda_id IN (${ids.map(() => "?").join(",")})`,
    args: ids,
  });
  for (const r of res.rows) {
    const id = Number(r.deuda_id);
    if (!mapa.has(id)) mapa.set(id, []);
    mapa.get(id)!.push({ monto: Number(r.monto), fecha_pago: String(r.fecha_pago).slice(0, 10) });
  }
  return mapa;
}

async function conEstadoPeriodo(filas: Fila[]): Promise<Deuda[]> {
  const deudas = filas.map(mapear);
  const idsResp = deudas.filter((d) => d.categoria === "responsabilidad").map((d) => d.id);
  const pagos = await pagosPorDeuda(idsResp);
  const hoy = hoyColombia();
  return deudas.map((d, i) => {
    if (d.categoria !== "responsabilidad") return d;
    const est = estadoPeriodo({
      periodo: periodoDe(d.frecuencia_pago, hoy, d.mes_pago),
      pagos: pagos.get(d.id) ?? [],
      valorEsperado: d.valor_estimado,
      marcaManual: marcaManual(filas[i]),
    });
    return { ...d, pagada_mes_actual: est.pagada, pagada_por_pagos: est.porPagos, pagado_en_periodo: est.pagadoEnPeriodo };
  });
}

// Devuelve la deuda solo si el usuario es dueño o tiene acceso compartido.
export async function getDeudaConAcceso(deudaId: string, userId: string) {
  const result = await db.execute({
    sql: `SELECT d.*, u.nombre AS dueno,
            COALESCE((SELECT SUM(p.monto) FROM pagos p WHERE p.deuda_id = d.id), 0) AS total_pagado,
            (d.user_id = ?) AS es_propia
          FROM deudas d
          JOIN users u ON u.id = d.user_id
          WHERE d.id = ?
            AND (d.user_id = ? OR EXISTS (
              SELECT 1 FROM deuda_accesos a WHERE a.deuda_id = d.id AND a.user_id = ?
            ))`,
    args: [userId, deudaId, userId, userId],
  });
  if (!result.rows[0]) return null;
  const [deuda] = await conEstadoPeriodo([result.rows[0] as Fila]);
  return deuda;
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
  return conEstadoPeriodo(result.rows as Fila[]);
}

// Estado de archivo de una deuda según lo pagado: saldada = archivada, con saldo = activa.
// Solo aplica a categoría 'deuda'; las responsabilidades se archivan a mano.
export function estadoSegunSaldo(montoInicial: number, totalPagado: number): "activa" | "archivada" {
  return totalPagado >= montoInicial ? "archivada" : "activa";
}

// Pagos programados que aparecen en el calendario: responsabilidades activas
// y deudas con saldo pendiente, siempre que tengan día de pago.
export interface Programado {
  id: number;
  descripcion: string;
  categoria: "deuda" | "responsabilidad";
  frecuencia_pago: string;
  valor_estimado: number | null;
  dia_pago: number | null;
  mes_pago: number | null;
  created_at: string;
  marca_manual: string | null;
}

export async function listProgramados(userId: string): Promise<Programado[]> {
  const result = await db.execute({
    sql: `SELECT d.id, d.descripcion, d.categoria, d.frecuencia_pago, d.valor_estimado, d.dia_pago,
                 d.mes_pago, d.created_at, d.pagada_mes_actual, d.ultimo_reset_fecha, d.monto_inicial,
                 COALESCE((SELECT SUM(p.monto) FROM pagos p WHERE p.deuda_id = d.id), 0) AS total_pagado
          FROM deudas d
          WHERE d.user_id = ? AND d.dia_pago IS NOT NULL AND COALESCE(d.estado, 'activa') != 'archivada'
          ORDER BY d.dia_pago`,
    args: [userId],
  });
  return result.rows
    .filter((r) => r.categoria === "responsabilidad" || Number(r.total_pagado) < Number(r.monto_inicial))
    .map((r) => ({
      id: Number(r.id),
      descripcion: String(r.descripcion),
      categoria: r.categoria === "responsabilidad" ? "responsabilidad" : "deuda",
      frecuencia_pago: String(r.frecuencia_pago ?? "mensual"),
      valor_estimado: r.valor_estimado != null ? Number(r.valor_estimado) : null,
      dia_pago: r.dia_pago != null ? Number(r.dia_pago) : null,
      mes_pago: r.mes_pago != null ? Number(r.mes_pago) : null,
      created_at: String(r.created_at),
      marca_manual: r.categoria === "responsabilidad" ? marcaManual(r as Fila) : null,
    }));
}
