import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { listCuentas } from "@/lib/finanzas";

const TIPOS = ["banco", "billetera", "exchange", "efectivo"];
const MONEDAS = ["COP", "USD", "EUR"];

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json({ cuentas: await listCuentas(user.id) });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { nombre, tipo, moneda, saldo, es_credito, dia_pago_credito } = await req.json().catch(() => ({}));
  const saldoNum = Number(saldo ?? 0);
  if (!nombre || !TIPOS.includes(tipo) || !MONEDAS.includes(moneda) || !Number.isFinite(saldoNum)) {
    return NextResponse.json(
      { error: `nombre, tipo (${TIPOS.join("/")}) y moneda (${MONEDAS.join("/")}) son obligatorios` },
      { status: 400 }
    );
  }

  const esCredito = es_credito ? 1 : 0;
  const diaPago = esCredito && dia_pago_credito != null ? Number(dia_pago_credito) : null;
  if (diaPago !== null && (diaPago < 1 || diaPago > 31 || !Number.isInteger(diaPago))) {
    return NextResponse.json({ error: "dia_pago_credito debe ser un entero entre 1 y 31" }, { status: 400 });
  }

  const result = await db.execute({
    sql: "INSERT INTO cuentas (user_id, nombre, tipo, moneda, saldo, es_credito, dia_pago_credito) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [user.id, nombre, tipo, moneda, saldoNum, esCredito, diaPago],
  });
  return NextResponse.json({ id: Number(result.lastInsertRowid) }, { status: 201 });
}
