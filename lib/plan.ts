// Plan de pagos de una deuda: fechas de las cuotas, cuota necesaria y fecha en que se termina.
// Usa las mismas fechas que el calendario (diasEnMes), así el plan y el calendario coinciden.
// Sin dependencias de servidor: se usa también en los formularios.
import { diasEnMes, type Programacion } from "./calendario";

const PASOS_MAX = 600; // tope de cuotas (~11 años semanales) para no iterar sin fin

function iso(a: number, m: number, d: number) {
  return `${a}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// Fechas de pago desde `desde` (inclusive). Se detiene al llegar a `n` fechas o pasar `hasta`.
export function fechasDePago(
  prog: Programacion,
  desde: string,
  limite: { n?: number; hasta?: string }
): string[] {
  if (!prog.dia_pago) return [];
  const fechas: string[] = [];
  let a = Number(desde.slice(0, 4));
  let m = Number(desde.slice(5, 7)) - 1;
  const tope = limite.n ?? PASOS_MAX;
  // 20 años de meses como máximo (semestral/anual pueden saltarse meses vacíos)
  for (let i = 0; i < 240 && fechas.length < tope; i++) {
    for (const dia of diasEnMes(prog, m, a)) {
      const f = iso(a, m, dia);
      if (f < desde) continue;
      if (limite.hasta && f > limite.hasta) return fechas;
      fechas.push(f);
      if (fechas.length >= tope) return fechas;
    }
    m++;
    if (m === 12) {
      m = 0;
      a++;
    }
  }
  return fechas;
}

// Cuota redondeada hacia arriba a miles de pesos: la última cuota queda un poco menor
export function cuotaParaTerminar(saldo: number, numeroCuotas: number): number {
  if (numeroCuotas <= 0 || saldo <= 0) return 0;
  return Math.ceil(saldo / numeroCuotas / 1000) * 1000;
}

export interface Cuota {
  numero: number;
  fecha: string;
  monto: number;
  saldo_despues: number;
}

// Reparte el saldo en cuotas del valor dado sobre las fechas disponibles
export function repartir(saldo: number, cuota: number, fechas: string[]): Cuota[] {
  const cuotas: Cuota[] = [];
  let resta = saldo;
  for (let i = 0; i < fechas.length && resta > 0; i++) {
    const monto = Math.min(cuota, resta);
    resta -= monto;
    cuotas.push({ numero: i + 1, fecha: fechas[i], monto, saldo_despues: resta });
  }
  return cuotas;
}

export interface ResultadoPlan {
  cuota: number;
  cuotas: Cuota[];
  fin: string | null; // fecha de la última cuota
  alcanza: boolean; // false si no hay fechas suficientes para cubrir el saldo
}

// Dado el valor de la cuota, ¿cuándo termino?
export function planPorCuota(saldo: number, cuota: number, prog: Programacion, desde: string): ResultadoPlan {
  if (cuota <= 0 || saldo <= 0) return { cuota, cuotas: [], fin: null, alcanza: saldo <= 0 };
  const n = Math.ceil(saldo / cuota);
  const fechas = fechasDePago(prog, desde, { n });
  const cuotas = repartir(saldo, cuota, fechas);
  return { cuota, cuotas, fin: cuotas.at(-1)?.fecha ?? null, alcanza: fechas.length >= n };
}

// Dada la fecha final, ¿cuánto debo pagar en cada cuota?
export function planPorFecha(saldo: number, hasta: string, prog: Programacion, desde: string): ResultadoPlan {
  const fechas = fechasDePago(prog, desde, { hasta });
  const cuota = cuotaParaTerminar(saldo, fechas.length);
  const cuotas = repartir(saldo, cuota, fechas);
  return { cuota, cuotas, fin: cuotas.at(-1)?.fecha ?? null, alcanza: fechas.length > 0 };
}

// Día y mes de anclaje a partir de la fecha del primer pago
export function programacionDesdeFecha(frecuencia: string, primerPago: string): Programacion {
  return {
    frecuencia_pago: frecuencia,
    dia_pago: Number(primerPago.slice(8, 10)),
    mes_pago: Number(primerPago.slice(5, 7)),
    created_at: primerPago,
  };
}

function diaSiguiente(fecha: string): string {
  const d = new Date(Date.UTC(Number(fecha.slice(0, 4)), Number(fecha.slice(5, 7)) - 1, Number(fecha.slice(8, 10)) + 1));
  return d.toISOString().slice(0, 10);
}

export interface PlanVigente {
  cuotas: (Cuota & { vencida: boolean })[];
  cuota: number;
  fin: string | null;
  vencimiento: string | null;
  // Cuota necesaria para terminar a tiempo, si con la cuota actual te pasas del vencimiento
  cuota_necesaria: number | null;
  vencimiento_pasado: boolean;
}

// Plan desde hoy para lo que falta de una deuda. Si la cuota del periodo actual ya está cubierta,
// arranca en el siguiente periodo; si se abonó parte, la primera cuota es solo lo que falta.
export function planVigente(o: {
  saldo: number;
  cuota: number | null;
  vencimiento: string | null;
  prog: Programacion;
  hoy: string;
  periodo: { inicio: string; fin: string };
  pagadoEnPeriodo: number;
}): PlanVigente | null {
  const { saldo, prog, hoy, periodo, pagadoEnPeriodo, vencimiento } = o;
  if (saldo <= 0 || !prog.dia_pago || (!o.cuota && !vencimiento)) return null;

  const cubierto = o.cuota ? pagadoEnPeriodo >= o.cuota : pagadoEnPeriodo > 0;
  const desde = cubierto ? diaSiguiente(periodo.fin) : periodo.inicio;

  let cuota = o.cuota ?? 0;
  let cuotas: Cuota[];
  if (cuota > 0) {
    const fechas = fechasDePago(prog, desde, {});
    cuotas = [];
    let resta = saldo;
    for (let i = 0; i < fechas.length && resta > 0; i++) {
      const objetivo = i === 0 && !cubierto ? Math.max(0, cuota - pagadoEnPeriodo) : cuota;
      const monto = Math.min(objetivo, resta);
      if (monto <= 0) continue;
      resta -= monto;
      cuotas.push({ numero: cuotas.length + 1, fecha: fechas[i], monto, saldo_despues: resta });
    }
  } else {
    const p = planPorFecha(saldo, vencimiento!, prog, desde);
    cuota = p.cuota;
    cuotas = p.cuotas;
  }

  const fin = cuotas.at(-1)?.fecha ?? null;
  const vencimientoPasado = Boolean(vencimiento && vencimiento < hoy);
  let necesaria: number | null = null;
  if (vencimiento && fin && fin > vencimiento && !vencimientoPasado) {
    necesaria = planPorFecha(saldo, vencimiento, prog, desde).cuota || null;
  }

  return {
    cuotas: cuotas.map((c) => ({ ...c, vencida: c.fecha < hoy })),
    cuota,
    fin,
    vencimiento,
    cuota_necesaria: necesaria,
    vencimiento_pasado: vencimientoPasado,
  };
}
