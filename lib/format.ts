// Formateadores compartidos por páginas y componentes (seguros en cliente y servidor).

export const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function fmtMoneda(moneda: string, valor: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: moneda,
    maximumFractionDigits: moneda === "COP" ? 0 : 2,
  }).format(valor);
}

export const FRECUENCIAS: Record<string, string> = {
  semanal: "Semanal",
  quincenal: "Quincenal",
  mensual: "Mensual",
  semestral: "Semestral",
  anual: "Anual",
  unico: "Único",
};

export function fmtFrecuencia(f: string | null | undefined) {
  if (!f) return "Sin frecuencia";
  return FRECUENCIAS[f] ?? f;
}

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Formatea "YYYY-MM-DD" sin pasar por Date para no correr el día por zona horaria.
export function fmtFecha(iso: string | null | undefined) {
  if (!iso) return "—";
  const [a, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  if (!a || !m || !d) return String(iso);
  return `${d} ${MESES_CORTOS[m - 1]} ${a}`;
}

export const TIPOS_CUENTA: Record<string, string> = {
  banco: "Banco",
  billetera: "Billetera",
  exchange: "Exchange",
  efectivo: "Efectivo",
};

export const TIPOS_MOVIMIENTO: Record<string, string> = {
  recarga: "Recarga",
  retiro: "Retiro",
  transferencia: "Transferencia",
  pago_deuda: "Pago de deuda",
  ajuste: "Ajuste",
};

export function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// "Pagas $X cada quincena"
export const CADA: Record<string, string> = {
  semanal: "cada semana",
  quincenal: "cada quincena",
  mensual: "cada mes",
  semestral: "cada semestre",
  anual: "cada año",
};
