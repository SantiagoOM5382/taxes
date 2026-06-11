import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { listIngresos, getCuenta } from "@/lib/finanzas";

const FRECUENCIAS = ["semanal", "quincenal", "mensual", "unico"];
const TIPOS = ["base", "extra"];

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json({ ingresos: await listIngresos(user.id) });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { descripcion, monto, frecuencia, tipo, cuenta_id } = await req.json().catch(() => ({}));
  const montoNum = Number(monto);
  if (!descripcion || !Number.isFinite(montoNum) || montoNum <= 0 ||
      !FRECUENCIAS.includes(frecuencia) || !TIPOS.includes(tipo)) {
    return NextResponse.json(
      { error: "descripcion, monto (> 0), frecuencia y tipo son obligatorios" },
      { status: 400 }
    );
  }

  let cuentaId: number | null = null;
  if (cuenta_id) {
    const cuenta = await getCuenta(Number(cuenta_id), user.id);
    if (!cuenta) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    cuentaId = cuenta.id;
  }

  const result = await db.execute({
    sql: "INSERT INTO ingresos (user_id, descripcion, monto, frecuencia, tipo, cuenta_id) VALUES (?, ?, ?, ?, ?, ?)",
    args: [user.id, descripcion, montoNum, frecuencia, tipo, cuentaId],
  });
  return NextResponse.json({ id: Number(result.lastInsertRowid) }, { status: 201 });
}
