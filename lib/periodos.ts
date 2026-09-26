// Periodos de pago y fechas en hora de Colombia.
// Todo trabaja con fechas "YYYY-MM-DD" y aritmética UTC para no correr días por zona horaria.

const ZONA = "America/Bogota";

// Fecha de hoy en Colombia (el servidor corre en UTC; a las 8 p. m. en Bogotá ya es "mañana" en UTC).
export function hoyColombia(): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return partes; // en-CA ya formatea como YYYY-MM-DD
}

export function mesColombia(): string {
  return hoyColombia().slice(0, 7);
}

function parse(iso: string): { a: number; m: number; d: number } {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return { a, m: m - 1, d };
}

function iso(a: number, m: number, d: number): string {
  const f = new Date(Date.UTC(a, m, d));
  return `${f.getUTCFullYear()}-${String(f.getUTCMonth() + 1).padStart(2, "0")}-${String(f.getUTCDate()).padStart(2, "0")}`;
}

function ultimoDia(a: number, m: number): number {
  return new Date(Date.UTC(a, m + 1, 0)).getUTCDate();
}

export interface Periodo {
  clave: string;
  inicio: string; // inclusive
  fin: string; // inclusive
}

// Bloque de N meses que contiene la fecha. Arranca 2 meses antes del mes de pago,
// para que pagar un poco antes del vencimiento cuente para ese vencimiento.
function bloqueMeses(fecha: string, meses: number, mesPago: number | null | undefined, prefijo: string): Periodo {
  const { a, m } = parse(fecha);
  const inicioBloque = mesPago ? (((mesPago - 1 - 2) % 12) + 12) % 12 : 0;
  const total = a * 12 + m - inicioBloque;
  const bloque = Math.floor(total / meses) * meses + inicioBloque;
  const aIni = Math.floor(bloque / 12);
  const mIni = bloque % 12;
  const inicio = iso(aIni, mIni, 1);
  const fin = iso(aIni, mIni + meses, 0);
  return { clave: `${prefijo}:${inicio}`, inicio, fin };
}

// Periodo al que pertenece una fecha según la frecuencia de pago.
export function periodoDe(
  frecuencia: string | null | undefined,
  fecha: string,
  mesPago?: number | null
): Periodo {
  const { a, m, d } = parse(fecha);
  switch (frecuencia) {
    case "semanal": {
      // Semana de lunes a domingo
      const dow = (new Date(Date.UTC(a, m, d)).getUTCDay() + 6) % 7;
      const inicio = iso(a, m, d - dow);
      return { clave: `S:${inicio}`, inicio, fin: iso(a, m, d - dow + 6) };
    }
    case "quincenal": {
      const primera = d <= 15;
      const inicio = iso(a, m, primera ? 1 : 16);
      const fin = primera ? iso(a, m, 15) : iso(a, m, ultimoDia(a, m));
      return { clave: `Q:${inicio}`, inicio, fin };
    }
    case "semestral":
      return bloqueMeses(fecha, 6, mesPago, "H");
    case "anual":
      return bloqueMeses(fecha, 12, mesPago, "A");
    default: {
      // mensual y sin frecuencia
      const inicio = iso(a, m, 1);
      return { clave: `M:${inicio.slice(0, 7)}`, inicio, fin: iso(a, m, ultimoDia(a, m)) };
    }
  }
}

export interface PagoFecha {
  monto: number;
  fecha_pago: string;
}

// ¿Está cubierto el periodo? Por pagos registrados (suma >= valor esperado, o cualquier pago
// si no hay valor esperado) o porque el usuario lo marcó a mano para ese mismo periodo.
export function estadoPeriodo(opts: {
  periodo: Periodo;
  pagos: PagoFecha[];
  valorEsperado: number | null;
  marcaManual: string | null; // clave del periodo marcado a mano
}): { pagada: boolean; porPagos: boolean; pagadoEnPeriodo: number } {
  const { periodo, pagos, valorEsperado, marcaManual } = opts;
  const pagadoEnPeriodo = pagos
    .filter((p) => p.fecha_pago >= periodo.inicio && p.fecha_pago <= periodo.fin)
    .reduce((s, p) => s + p.monto, 0);
  const porPagos =
    pagadoEnPeriodo > 0 && (valorEsperado == null || valorEsperado <= 0 || pagadoEnPeriodo >= valorEsperado);
  return { pagada: porPagos || marcaManual === periodo.clave, porPagos, pagadoEnPeriodo };
}
