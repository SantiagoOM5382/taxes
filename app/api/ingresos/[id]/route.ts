import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getCuentaOperable } from "@/lib/finanzas";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const result = await db.execute({
    sql: "DELETE FROM ingresos WHERE id = ? AND user_id = ?",
    args: [id, user.id],
  });
  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "Ingreso no encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

const FRECUENCIAS = ["semanal", "quincenal", "mensual", "unico"];
const TIPOS = ["base", "extra"];

// Edita un ingreso. Campos: descripcion, monto, frecuencia, tipo, cuenta_id
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const descripcion = String(body.descripcion ?? "").trim();
  const monto = Number(body.monto);
  if (!descripcion || !Number.isFinite(monto) || monto <= 0 || !FRECUENCIAS.includes(body.frecuencia) || !TIPOS.includes(body.tipo)) {
    return NextResponse.json({ error: "Revisa descripción, monto, frecuencia y tipo" }, { status: 400 });
  }
  let cuentaId: number | null = null;
  if (body.cuenta_id) {
    const op = await getCuentaOperable(Number(body.cuenta_id), user.id);
    if ("error" in op) return NextResponse.json({ error: op.error }, { status: op.status });
    cuentaId = op.cuenta.id;
  }

  const result = await db.execute({
    sql: `UPDATE ingresos SET descripcion = ?, monto = ?, frecuencia = ?, tipo = ?, cuenta_id = ?
          WHERE id = ? AND user_id = ?`,
    args: [descripcion.slice(0, 120), monto, body.frecuencia, body.tipo, cuentaId, id, user.id],
  });
  if (result.rowsAffected === 0) return NextResponse.json({ error: "Ingreso no encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
