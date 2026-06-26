import { db } from "./db";

export type EstadoCuenta = "activa" | "inactiva" | "archivada";

export interface Cuenta {
  id: number;
  nombre: string;
  tipo: string;
  moneda: string;
  saldo: number;
  estado: EstadoCuenta;
  es_credito: boolean;
  dia_pago_credito: number | null;
}

function rowToCuenta(r: Record<string, unknown>): Cuenta {
  const estado = String(r.estado ?? "activa");
  return {
    id: Number(r.id),
    nombre: String(r.nombre),
    tipo: String(r.tipo),
    moneda: String(r.moneda),
    saldo: Number(r.saldo),
    estado: (estado === "inactiva" || estado === "archivada" ? estado : "activa") as EstadoCuenta,
    es_credito: Boolean(Number(r.es_credito ?? 0)),
    dia_pago_credito: r.dia_pago_credito != null ? Number(r.dia_pago_credito) : null,
  };
}

// Devuelve TODAS las cuentas (incluidas archivadas); el caller filtra por estado.
export async function listCuentas(userId: string): Promise<Cuenta[]> {
  const res = await db.execute({
    sql: "SELECT * FROM cuentas WHERE user_id = ? ORDER BY created_at",
    args: [userId],
  });
  return res.rows.map((r) => rowToCuenta(r as Record<string, unknown>));
}

export async function getCuenta(cuentaId: number, userId: string): Promise<Cuenta | null> {
  const res = await db.execute({
    sql: "SELECT * FROM cuentas WHERE id = ? AND user_id = ?",
    args: [cuentaId, userId],
  });
  const r = res.rows[0];
  return r ? rowToCuenta(r as Record<string, unknown>) : null;
}

// Igual que getCuenta pero exige que la cuenta esté activa para operar con ella.
// Devuelve { error } con mensaje claro si está desactivada o archivada.
export async function getCuentaOperable(
  cuentaId: number,
  userId: string
): Promise<{ cuenta: Cuenta } | { error: string; status: number }> {
  const cuenta = await getCuenta(cuentaId, userId);
  if (!cuenta) return { error: "Cuenta no encontrada", status: 404 };
  if (cuenta.estado !== "activa") {
    return {
      error: `La cuenta ${cuenta.nombre} está ${cuenta.estado === "inactiva" ? "desactivada" : "archivada"} y no se puede usar`,
      status: 400,
    };
  }
  return { cuenta };
}

// Garantiza que todo usuario tenga al menos una cuenta de tipo efectivo
// (cuenta cualquier estado, incluso archivada, para no recrearla si el usuario la archivó).
export async function ensureCuentaEfectivo(userId: string) {
  const res = await db.execute({
    sql: "SELECT COUNT(*) AS n FROM cuentas WHERE user_id = ? AND tipo = 'efectivo'",
    args: [userId],
  });
  if (Number(res.rows[0].n) === 0) {
    await db.execute({
      sql: "INSERT INTO cuentas (user_id, nombre, tipo, moneda, saldo) VALUES (?, 'Efectivo', 'efectivo', 'COP', 0)",
      args: [userId],
    });
  }
}

// Registra un movimiento y actualiza el saldo de la cuenta en una sola transacción.
// monto positivo = entra dinero, negativo = sale.
export async function registrarMovimiento(opts: {
  userId: string;
  cuentaId: number;
  tipo: "recarga" | "retiro" | "transferencia" | "pago_deuda" | "ajuste";
  monto: number;
  descripcion?: string | null;
  fecha?: string;
}) {
  const fecha = opts.fecha ?? new Date().toISOString().slice(0, 10);
  await db.batch([
    {
      sql: `INSERT INTO movimientos (user_id, cuenta_id, tipo, monto, descripcion, fecha)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [opts.userId, opts.cuentaId, opts.tipo, opts.monto, opts.descripcion ?? null, fecha],
    },
    {
      sql: "UPDATE cuentas SET saldo = saldo + ? WHERE id = ? AND user_id = ?",
      args: [opts.monto, opts.cuentaId, opts.userId],
    },
  ]);
}

export async function listIngresos(userId: string) {
  const res = await db.execute({
    sql: `SELECT i.*, c.nombre AS cuenta_nombre FROM ingresos i
          LEFT JOIN cuentas c ON c.id = i.cuenta_id
          WHERE i.user_id = ? ORDER BY i.created_at`,
    args: [userId],
  });
  return res.rows.map((r) => ({
    id: Number(r.id),
    descripcion: String(r.descripcion),
    monto: Number(r.monto),
    frecuencia: String(r.frecuencia),
    tipo: String(r.tipo),
    cuenta_id: r.cuenta_id ? Number(r.cuenta_id) : null,
    cuenta_nombre: r.cuenta_nombre ? String(r.cuenta_nombre) : null,
  }));
}

export async function listMovimientos(userId: string, limit = 20) {
  const res = await db.execute({
    sql: `SELECT m.*, c.nombre AS cuenta_nombre, c.moneda FROM movimientos m
          JOIN cuentas c ON c.id = m.cuenta_id
          WHERE m.user_id = ? ORDER BY m.created_at DESC LIMIT ?`,
    args: [userId, limit],
  });
  return res.rows.map((r) => ({
    id: Number(r.id),
    cuenta_nombre: String(r.cuenta_nombre),
    moneda: String(r.moneda),
    tipo: String(r.tipo),
    monto: Number(r.monto),
    descripcion: r.descripcion ? String(r.descripcion) : null,
    fecha: String(r.fecha),
  }));
}
