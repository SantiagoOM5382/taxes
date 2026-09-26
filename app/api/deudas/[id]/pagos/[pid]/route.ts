import { NextRequest, NextResponse } from "next/server";
import type { InStatement } from "@libsql/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getDeudaConAcceso, estadoSegunSaldo } from "@/lib/deudas";
import { getCuenta, movimientoStmts } from "@/lib/finanzas";

// Anula un pago. Si salió de una cuenta, el dinero vuelve a esa cuenta.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, pid } = await params;
  const deuda = await getDeudaConAcceso(id, user.id);
  if (!deuda || !deuda.es_propia) {
    return NextResponse.json({ error: "Solo el dueño puede anular pagos" }, { status: 403 });
  }

  const res = await db.execute({
    sql: "SELECT id, monto, cuenta_id FROM pagos WHERE id = ? AND deuda_id = ?",
    args: [Number(pid), deuda.id],
  });
  const pago = res.rows[0];
  if (!pago) return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  const monto = Number(pago.monto);

  const stmts: InStatement[] = [{ sql: "DELETE FROM pagos WHERE id = ?", args: [Number(pago.id)] }];
  if (deuda.categoria === "deuda") {
    stmts.push({
      sql: "UPDATE deudas SET estado = ? WHERE id = ?",
      args: [estadoSegunSaldo(deuda.monto_inicial, deuda.total_pagado - monto), deuda.id],
    });
  }
  // Devuelve el dinero aunque la cuenta esté desactivada o archivada: es una corrección
  const cuenta = pago.cuenta_id != null ? await getCuenta(Number(pago.cuenta_id), user.id) : null;
  if (cuenta) {
    stmts.push(
      ...movimientoStmts({
        userId: user.id,
        cuentaId: cuenta.id,
        tipo: "pago_deuda",
        monto,
        descripcion: `Pago anulado: ${deuda.descripcion}`,
      })
    );
  }
  await db.batch(stmts, "write");

  return NextResponse.json({ ok: true, devuelto_a: cuenta?.nombre ?? null });
}
