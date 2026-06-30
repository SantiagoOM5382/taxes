import type { Responsabilidad } from "./deudas";

export interface EventoCalendario {
  deuda_id: number;      // negativo = cuenta (tarjeta de crédito)
  nombre: string;
  monto_estimado: number | null;
  fecha: string; // YYYY-MM-DD
  pagado: boolean;
  tipo?: "deuda" | "tarjeta";
}

function toISO(anio: number, mes: number, dia: number): string {
  return `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function ultimoDiaMes(anio: number, mes: number): number {
  return new Date(anio, mes + 1, 0).getDate();
}

// Devuelve qué días del mes ocurre esta responsabilidad, usando dia_pago como ancla
function diasEnMes(r: Responsabilidad, mes: number, anio: number): number[] {
  if (!r.dia_pago) return [];
  const ult = ultimoDiaMes(anio, mes);
  const dia = Math.min(r.dia_pago, ult);

  switch (r.frecuencia_pago) {
    case "mensual":
      return [dia];
    case "quincenal": {
      const segunda = r.dia_pago + 15;
      return segunda <= ult ? [dia, segunda] : [dia];
    }
    case "semanal": {
      const dias: number[] = [];
      for (let d = dia; d >= 1; d -= 7) dias.unshift(d);
      for (let d = dia + 7; d <= ult; d += 7) dias.push(d);
      return dias;
    }
    case "semestral": {
      const creado = new Date(r.created_at);
      const mesInicio = creado.getMonth();
      const diff = (mes - mesInicio + 12) % 12;
      if (diff % 6 !== 0) return [];
      return [dia];
    }
    case "anual": {
      if (r.mes_pago == null) return [];
      if (mes !== r.mes_pago - 1) return [];
      return [dia];
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
      return pagosDeLaDeuda.some((p) => {
        const [pa, pm] = p.fecha_pago.split("-");
        return Number(pa) === anio && Number(pm) - 1 === mes;
      });
    case "quincenal": {
      const diaOcurrencia = Number(fecha.split("-")[2]);
      const mitad = r.dia_pago ?? 15;
      return pagosDeLaDeuda.some((p) => {
        const [pa, pm, pd] = p.fecha_pago.split("-");
        if (Number(pa) !== anio || Number(pm) - 1 !== mes) return false;
        const diaPago = Number(pd);
        if (diaOcurrencia <= mitad) return diaPago >= 1 && diaPago <= mitad;
        return diaPago > mitad;
      });
    }
    case "semanal": {
      const diaOcurrencia = Number(fecha.split("-")[2]);
      return pagosDeLaDeuda.some((p) => {
        const [pa, pm, pd] = p.fecha_pago.split("-");
        if (Number(pa) !== anio || Number(pm) - 1 !== mes) return false;
        const diaPago = Number(pd);
        return Math.abs(diaPago - diaOcurrencia) < 7;
      });
    }
    case "semestral": {
      const ocurrencia = new Date(fecha);
      return pagosDeLaDeuda.some((p) => {
        const fechaPago = new Date(p.fecha_pago);
        const diffMeses =
          (fechaPago.getFullYear() - ocurrencia.getFullYear()) * 12 +
          (fechaPago.getMonth() - ocurrencia.getMonth());
        return Math.abs(diffMeses) < 3;
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
