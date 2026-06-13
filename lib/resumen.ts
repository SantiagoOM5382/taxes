import { db } from "./db";
import { listDeudas } from "./deudas";
import { listCuentas, listIngresos } from "./finanzas";
import { getTasasCOP, type TasasCOP } from "./tasas";

// ---------------------------------------------------------------------------
// Capa determinista del asesor financiero.
// Todo lo que hay aquí se calcula en código (sin IA): es la "fuente de verdad"
// que luego el LLM solo explica en lenguaje natural. Nunca al revés.
// ---------------------------------------------------------------------------

// Factor para normalizar cualquier frecuencia a un equivalente MENSUAL.
// 'unico' no es recurrente → 0 (no entra en el cálculo mensual).
const FACTOR_MENSUAL: Record<string, number> = {
  semanal: 52 / 12, // ~4.33 pagos al mes
  quincenal: 2,
  mensual: 1,
  semestral: 1 / 6,
  unico: 0,
};

export function aMensual(monto: number, frecuencia: string | null): number {
  if (!frecuencia) return monto; // sin frecuencia conocida, se asume mensual
  return monto * (FACTOR_MENSUAL[frecuencia] ?? 1);
}

function convertirACOP(monto: number, moneda: string, tasas: TasasCOP): number {
  if (moneda === "COP") return monto;
  if (moneda === "USD") return tasas.usd != null ? monto * tasas.usd : 0;
  if (moneda === "EUR") return tasas.eur != null ? monto * tasas.eur : 0;
  return 0;
}

export interface DeudaResumen {
  id: number;
  descripcion: string;
  acreedor: string | null;
  monto_actual: number;
  monto_inicial: number;
  porcentaje_pagado: number;
  tasa_interes: number | null;
  fecha_vencimiento: string | null;
  dias_para_vencer: number | null;
}

export interface ResumenFinanciero {
  generado_en: string;
  patrimonio: {
    saldo_total_cop: number;
    por_moneda: { moneda: string; saldo: number; saldo_cop: number }[];
    tasas: TasasCOP;
  };
  ingresos: {
    mensual_base: number;
    mensual_extra: number;
    mensual_total: number;
  };
  deudas: {
    total_adeudado: number;
    cantidad: number;
    detalle: DeudaResumen[];
  };
  responsabilidades: {
    gasto_fijo_mensual: number;
    cantidad: number;
  };
  flujo_caja: {
    ingreso_mensual: number;
    gasto_fijo_mensual: number;
    pago_deudas_mensual_reciente: number;
    capacidad_ahorro_estimada: number;
  };
  ritmo_pago: {
    pagado_ult_30d: number;
    pagado_ult_90d: number;
  };
  indicadores: {
    ratio_deuda_ingreso_mensual: number | null;
    meses_para_liquidar_deudas: number | null;
  };
}

function diasEntre(desde: Date, hasta: Date): number {
  return Math.round((hasta.getTime() - desde.getTime()) / 86_400_000);
}

// Total pagado (movimientos tipo pago_deuda) en los últimos `dias` días.
async function pagadoUltimosDias(userId: string, dias: number): Promise<number> {
  const desde = new Date(Date.now() - dias * 86_400_000).toISOString().slice(0, 10);
  const res = await db.execute({
    sql: `SELECT COALESCE(SUM(ABS(monto)), 0) AS total FROM movimientos
          WHERE user_id = ? AND tipo = 'pago_deuda' AND fecha >= ?`,
    args: [userId, desde],
  });
  return Number(res.rows[0]?.total ?? 0);
}

// Arma el panorama financiero completo y ya digerido del usuario.
// Esto es lo único que se le pasa al LLM — nunca la base de datos cruda.
export async function getResumenFinanciero(userId: string): Promise<ResumenFinanciero> {
  const [deudasTodas, cuentasTodas, ingresos, tasas, pagado30, pagado90] = await Promise.all([
    listDeudas(userId),
    listCuentas(userId),
    listIngresos(userId),
    getTasasCOP(),
    pagadoUltimosDias(userId, 30),
    pagadoUltimosDias(userId, 90),
  ]);

  // Solo cuentas no archivadas cuentan para el patrimonio.
  const cuentas = cuentasTodas.filter((c) => c.estado !== "archivada");
  const monedas = Array.from(new Set(cuentas.map((c) => c.moneda)));
  const porMoneda = monedas.map((moneda) => {
    const saldo = cuentas.filter((c) => c.moneda === moneda).reduce((s, c) => s + c.saldo, 0);
    return { moneda, saldo, saldo_cop: convertirACOP(saldo, moneda, tasas) };
  });
  const saldoTotalCOP = porMoneda.reduce((s, m) => s + m.saldo_cop, 0);

  // Solo deudas propias y de categoría 'deuda' (las que se liquidan).
  const deudas = deudasTodas.filter((d) => d.categoria === "deuda" && d.es_propia);
  const responsabilidades = deudasTodas.filter(
    (d) => d.categoria === "responsabilidad" && d.es_propia
  );

  const hoy = new Date();
  const detalleDeudas: DeudaResumen[] = deudas.map((d) => ({
    id: d.id,
    descripcion: d.descripcion,
    acreedor: d.acreedor,
    monto_actual: d.monto_actual,
    monto_inicial: d.monto_inicial,
    porcentaje_pagado:
      d.monto_inicial > 0 ? Math.round((d.total_pagado / d.monto_inicial) * 100) : 0,
    tasa_interes: d.tasa_interes,
    fecha_vencimiento: d.fecha_vencimiento,
    dias_para_vencer: d.fecha_vencimiento
      ? diasEntre(hoy, new Date(d.fecha_vencimiento + "T00:00:00"))
      : null,
  }));
  const totalAdeudado = deudas.reduce((s, d) => s + d.monto_actual, 0);

  // Gasto fijo mensual = responsabilidades normalizadas a mensual.
  const gastoFijoMensual = responsabilidades.reduce(
    (s, d) => s + aMensual(d.valor_estimado ?? 0, d.frecuencia_pago),
    0
  );

  const ingresoBase = ingresos
    .filter((i) => i.tipo === "base")
    .reduce((s, i) => s + aMensual(i.monto, i.frecuencia), 0);
  const ingresoExtra = ingresos
    .filter((i) => i.tipo !== "base")
    .reduce((s, i) => s + aMensual(i.monto, i.frecuencia), 0);
  const ingresoMensual = ingresoBase + ingresoExtra;

  // Aproximamos el pago mensual a deuda con el ritmo de los últimos 90 días.
  const pagoDeudasMensual = pagado90 / 3;
  const capacidadAhorro = ingresoMensual - gastoFijoMensual - pagoDeudasMensual;

  return {
    generado_en: new Date().toISOString(),
    patrimonio: {
      saldo_total_cop: Math.round(saldoTotalCOP),
      por_moneda: porMoneda,
      tasas,
    },
    ingresos: {
      mensual_base: Math.round(ingresoBase),
      mensual_extra: Math.round(ingresoExtra),
      mensual_total: Math.round(ingresoMensual),
    },
    deudas: {
      total_adeudado: Math.round(totalAdeudado),
      cantidad: deudas.length,
      detalle: detalleDeudas,
    },
    responsabilidades: {
      gasto_fijo_mensual: Math.round(gastoFijoMensual),
      cantidad: responsabilidades.length,
    },
    flujo_caja: {
      ingreso_mensual: Math.round(ingresoMensual),
      gasto_fijo_mensual: Math.round(gastoFijoMensual),
      pago_deudas_mensual_reciente: Math.round(pagoDeudasMensual),
      capacidad_ahorro_estimada: Math.round(capacidadAhorro),
    },
    ritmo_pago: {
      pagado_ult_30d: Math.round(pagado30),
      pagado_ult_90d: Math.round(pagado90),
    },
    indicadores: {
      ratio_deuda_ingreso_mensual:
        ingresoMensual > 0 ? Math.round((totalAdeudado / ingresoMensual) * 100) / 100 : null,
      meses_para_liquidar_deudas:
        pagoDeudasMensual > 0 ? Math.ceil(totalAdeudado / pagoDeudasMensual) : null,
    },
  };
}

// ---------------------------------------------------------------------------
// Estrategias de pago de deuda (deterministas).
// ---------------------------------------------------------------------------

export type MetodoPago = "avalancha" | "bola_nieve";

export interface PasoEstrategia {
  orden: number;
  deuda_id: number;
  descripcion: string;
  monto_actual: number;
  tasa_interes: number | null;
  motivo: string;
}

// avalancha = mayor tasa de interés primero (óptimo financiero).
// bola_nieve = menor saldo primero (motivacional: cierras deudas rápido).
// Si no hay tasas registradas, avalancha cae a bola de nieve automáticamente.
export function ordenarEstrategia(
  deudas: DeudaResumen[],
  metodo: MetodoPago
): PasoEstrategia[] {
  const activas = deudas.filter((d) => d.monto_actual > 0);
  const hayTasas = activas.some((d) => d.tasa_interes != null);
  const usarAvalancha = metodo === "avalancha" && hayTasas;

  const ordenadas = [...activas].sort((a, b) => {
    if (usarAvalancha) {
      return (b.tasa_interes ?? 0) - (a.tasa_interes ?? 0);
    }
    return a.monto_actual - b.monto_actual;
  });

  return ordenadas.map((d, i) => ({
    orden: i + 1,
    deuda_id: d.id,
    descripcion: d.descripcion,
    monto_actual: d.monto_actual,
    tasa_interes: d.tasa_interes,
    motivo: usarAvalancha
      ? `Tasa de ${d.tasa_interes}% anual — la más cara primero ahorra intereses`
      : `Saldo de ${Math.round(d.monto_actual).toLocaleString("es-CO")} — cerrar deudas pequeñas da impulso`,
  }));
}
