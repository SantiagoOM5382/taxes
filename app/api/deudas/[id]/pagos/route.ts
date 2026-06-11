import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getDeudaConAcceso } from "@/lib/deudas";
import { getCuenta, registrarMovimiento } from "@/lib/finanzas";

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

  const { monto, fecha_pago, comprobante_url, cuenta_id } = await req.json().catch(() => ({}));
  const montoNum = Number(monto);
  if (!Number.isFinite(montoNum) || montoNum <= 0 || !fecha_pago) {
    return NextResponse.json(
      { error: "monto (> 0) y fecha_pago son obligatorios" },
      { status: 400 }
    );
  }

  // Cuenta de origen opcional: descuenta el saldo y deja el movimiento registrado
  let cuenta = null;
  if (cuenta_id) {
    cuenta = await getCuenta(Number(cuenta_id), user.id);
    if (!cuenta) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    if (cuenta.saldo < montoNum) {
      return NextResponse.json(
        { error: `Saldo insuficiente en ${cuenta.nombre} (disponible: ${cuenta.saldo})` },
        { status: 400 }
      );
    }
  }

  const result = await db.execute({
    sql: "INSERT INTO pagos (deuda_id, monto, fecha_pago, comprobante_url, cuenta_id) VALUES (?, ?, ?, ?, ?)",
    args: [deuda.id, montoNum, fecha_pago, comprobante_url || null, cuenta?.id ?? null],
  });

  if (cuenta) {
    await registrarMovimiento({
      userId: user.id,
      cuentaId: cuenta.id,
      tipo: "pago_deuda",
      monto: -montoNum,
      descripcion: `Pago: ${deuda.descripcion}`,
      fecha: fecha_pago,
    });
  }

  return NextResponse.json({ id: Number(result.lastInsertRowid) }, { status: 201 });
}
