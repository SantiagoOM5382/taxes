import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getDeudaConAcceso } from "@/lib/deudas";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const deuda = await getDeudaConAcceso(id, user.id);
  if (!deuda) return NextResponse.json({ error: "Deuda no encontrada" }, { status: 404 });
  if (!deuda.es_propia) {
    return NextResponse.json(
      { error: "Solo el dueño de la deuda puede registrar pagos" },
      { status: 403 }
    );
  }

  const { monto, fecha_pago, comprobante_url } = await req.json().catch(() => ({}));
  const montoNum = Number(monto);
  if (!Number.isFinite(montoNum) || montoNum <= 0 || !fecha_pago) {
    return NextResponse.json(
      { error: "monto (> 0) y fecha_pago son obligatorios" },
      { status: 400 }
    );
  }

  const result = await db.execute({
    sql: "INSERT INTO pagos (deuda_id, monto, fecha_pago, comprobante_url) VALUES (?, ?, ?, ?)",
    args: [deuda.id, montoNum, fecha_pago, comprobante_url || null],
  });
  return NextResponse.json({ id: Number(result.lastInsertRowid) }, { status: 201 });
}
