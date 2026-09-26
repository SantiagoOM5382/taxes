import type { Programado } from "./deudas";
import { estadoPeriodo, periodoDe, type PagoFecha } from "./periodos";

export interface EventoCalendario {
  deuda_id: number; // negativo = cuenta (tarjeta de crédito)
  nombre: string;
  monto_estimado: number | null;
  fecha: string; // YYYY-MM-DD
  pagado: boolean;
  tipo?: "deuda" | "responsabilidad" | "tarjeta";
}

function toISO(anio: number, mes: number, dia: number): string {
  return `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function ultimoDiaMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
}

// Días del mes en que vence un pago programado, usando dia_pago como ancla
export type Programacion = Pick<Programado, "dia_pago" | "frecuencia_pago" | "mes_pago" | "created_at">;

export function diasEnMes(r: Programacion, mes: number, anio: number): number[] {
  if (!r.dia_pago) return [];
  const ult = ultimoDiaMes(anio, mes);
  const dia = Math.min(r.dia_pago, ult);

  switch (r.frecuencia_pago) {
    case "quincenal": {
      // Dos pagos separados 15 días: si el ancla es el 20, el otro es el 5
      const otro = r.dia_pago <= 15 ? Math.min(r.dia_pago + 15, ult) : r.dia_pago - 15;
      return [...new Set([dia, otro])].sort((a, b) => a - b);
    }
    case "semanal": {
      // Cada 7 días de verdad: mismo día de la semana que la fecha de referencia
      // (día y mes de pago, en el año en que se creó), en vez de repetir el mismo número cada mes.
      const creado = new Date(String(r.created_at).replace(" ", "T"));
      const anioRef = Number.isNaN(creado.getTime()) ? anio : creado.getFullYear();
      const mesRef = r.mes_pago ? r.mes_pago - 1 : Number.isNaN(creado.getTime()) ? mes : creado.getMonth();
      const dow = new Date(Date.UTC(anioRef, mesRef, r.dia_pago)).getUTCDay();
      const dias: number[] = [];
      for (let d = 1; d <= ult; d++) {
        if (new Date(Date.UTC(anio, mes, d)).getUTCDay() === dow) dias.push(d);
      }
      return dias;
    }
    case "semestral": {
      // Mes de pago configurado; si no hay, el mes en que se creó
      const ancla = r.mes_pago ? r.mes_pago - 1 : new Date(r.created_at).getMonth();
      return ((mes - ancla + 12) % 12) % 6 === 0 ? [dia] : [];
    }
    case "anual":
      if (r.mes_pago == null) return [];
      return mes === r.mes_pago - 1 ? [dia] : [];
    default:
      return [dia];
  }
}

export function generarOcurrencias(
  programados: Programado[],
  pagos: Map<number, PagoFecha[]>,
  mes: number,
  anio: number
): EventoCalendario[] {
  const eventos: EventoCalendario[] = [];
  for (const r of programados) {
    for (const dia of diasEnMes(r, mes, anio)) {
      const fecha = toISO(anio, mes, dia);
      // Mismo criterio que el resumen: pagos dentro del periodo de esta fecha, o marca manual
      const { pagada } = estadoPeriodo({
        periodo: periodoDe(r.frecuencia_pago, fecha, r.mes_pago),
        pagos: pagos.get(r.id) ?? [],
        valorEsperado: r.valor_estimado,
        marcaManual: r.marca_manual,
      });
      eventos.push({
        deuda_id: r.id,
        nombre: r.descripcion,
        monto_estimado: r.valor_estimado,
        fecha,
        pagado: pagada,
        tipo: r.categoria,
      });
    }
  }
  return eventos.sort((a, b) => a.fecha.localeCompare(b.fecha));
}
