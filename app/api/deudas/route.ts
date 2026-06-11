import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { listDeudas } from "@/lib/deudas";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json({ deudas: await listDeudas(user.id) });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { descripcion, acreedor, monto_inicial, categoria, frecuencia_pago, valor_estimado } =
    await req.json().catch(() => ({}));

  const cat = categoria === "responsabilidad" ? "responsabilidad" : "deuda";
  const frecuencia = ["semanal", "quincenal", "mensual", "semestral"].includes(frecuencia_pago)
    ? frecuencia_pago
    : null;

  if (!descripcion) {
    return NextResponse.json({ error: "descripcion es obligatoria" }, { status: 400 });
  }

  // Deuda: requiere monto inicial. Responsabilidad: pago permanente, solo valor estimado.
  let monto = 0;
  let estimado: number | null = null;
  if (cat === "deuda") {
    monto = Number(monto_inicial);
    if (!Number.isFinite(monto) || monto <= 0) {
      return NextResponse.json(
        { error: "monto_inicial (> 0) es obligatorio para deudas" },
        { status: 400 }
      );
    }
  } else {
    estimado = valor_estimado != null && valor_estimado !== "" ? Number(valor_estimado) : null;
    if (estimado != null && (!Number.isFinite(estimado) || estimado <= 0)) {
      return NextResponse.json({ error: "valor_estimado debe ser > 0" }, { status: 400 });
    }
  }

  const result = await db.execute({
    sql: `INSERT INTO deudas (user_id, descripcion, acreedor, monto_inicial, categoria, frecuencia_pago, valor_estimado)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [user.id, descripcion, acreedor || null, monto, cat, frecuencia, estimado],
  });
  return NextResponse.json({ id: Number(result.lastInsertRowid) }, { status: 201 });
}
