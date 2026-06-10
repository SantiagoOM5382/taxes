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

  const { descripcion, acreedor, monto_inicial } = await req.json().catch(() => ({}));
  const monto = Number(monto_inicial);
  if (!descripcion || !Number.isFinite(monto) || monto <= 0) {
    return NextResponse.json(
      { error: "descripcion y monto_inicial (> 0) son obligatorios" },
      { status: 400 }
    );
  }

  const result = await db.execute({
    sql: "INSERT INTO deudas (user_id, descripcion, acreedor, monto_inicial) VALUES (?, ?, ?, ?)",
    args: [user.id, descripcion, acreedor || null, monto],
  });
  return NextResponse.json({ id: Number(result.lastInsertRowid) }, { status: 201 });
}
