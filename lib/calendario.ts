import type { Responsabilidad } from "./deudas";

export interface EventoCalendario {
  deuda_id: number;
  nombre: string;
  monto_estimado: number | null;
  fecha: string; // YYYY-MM-DD
  pagado: boolean;
}

function toISO(anio: number, mes: number, dia: number): string {
  return `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function ultimoDiaMes(anio: number, mes: number): number {
  return new Date(anio, mes + 1, 0).getDate();
}

function semestre(mes: number): number {
  return mes <= 5 ? 0 : 1;
}

// Devuelve qué días del mes (0-indexed) ocurre esta responsabilidad
function diasEnMes(r: Responsabilidad, mes: number, anio: number): number[] {
  if (!r.dia_pago) return [];
  const ult = ultimoDiaMes(anio, mes);

  switch (r.frecuencia_pago) {
    case "mensual":
      return [Math.min(r.dia_pago, ult)];
    case "quincenal":
      return [Math.min(15, ult), ult];
    case "semestral": {
      const creado = new Date(r.created_at);
      const mesInicio = creado.getMonth();
      // Ocurre en meses que son múltiplo de 6 desde el mes de creación
      const diff = (mes - mesInicio + 12) % 12;
      if (diff % 6 !== 0) return [];
      return [Math.min(r.dia_pago, ult)];
    }
    case "anual": {
      if (r.mes_pago == null) return [];
      if (mes !== r.mes_pago - 1) return [];
      return [Math.min(r.dia_pago, ult)];
    }
    default:
      return [];
  }
}

// Determina si una responsabilidad está pagada para una ocurrencia dada
function estaPagada(
  r: Responsabilidad,
  fecha: string,
  pagos: { deuda_id: number; fecha_pago: string }[]
): boolean {
  const pagosDeLaDeuda = pagos.filter((p) => p.deuda_id === r.id);
  if (pagosDeLaDeuda.length === 0) return false;

  const [anioStr, mesStr] = fecha.split("-");
  const anio = Number(anioStr);
  const mes = Number(mesStr) - 1; // 0-indexed

  switch (r.frecuencia_pago) {
    case "mensual":
    case "quincenal":
      return pagosDeLaDeuda.some((p) => {
        const [pa, pm] = p.fecha_pago.split("-");
        return Number(pa) === anio && Number(pm) - 1 === mes;
      });
    case "semestral": {
      const sem = semestre(mes);
      return pagosDeLaDeuda.some((p) => {
        const [pa, pm] = p.fecha_pago.split("-");
        return Number(pa) === anio && semestre(Number(pm) - 1) === sem;
      });
    }
    case "anual":
      return pagosDeLaDeuda.some((p) => p.fecha_pago.startsWith(String(anio)));
    default:
      return false;
  }
}

export function generarOcurrencias(
  responsabilidades: Responsabilidad[],
  pagos: { deuda_id: number; fecha_pago: string }[],
  mes: number,
  anio: number
): EventoCalendario[] {
  const eventos: EventoCalendario[] = [];

  for (const r of responsabilidades) {
    const dias = diasEnMes(r, mes, anio);
    for (const dia of dias) {
      const fecha = toISO(anio, mes, dia);
      eventos.push({
        deuda_id: r.id,
        nombre: r.descripcion,
        monto_estimado: r.valor_estimado,
        fecha,
        pagado: estaPagada(r, fecha, pagos),
      });
    }
  }

  return eventos.sort((a, b) => a.fecha.localeCompare(b.fecha));
}
