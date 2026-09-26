import { NextRequest, NextResponse } from "next/server";
import type { InStatement } from "@libsql/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getDeudaConAcceso, estadoSegunSaldo } from "@/lib/deudas";
import { getCuentaOperable, movimientoStmts, type Cuenta } from "@/lib/finanzas";
import { cop } from "@/lib/format";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const deuda = await getDeudaConAcceso(id, user.id);
  if (!deuda) return NextResponse.json({ error: "Deuda no encontrada" }, { status: 404 });
  if (!deuda.es_propia) {
    return NextResponse.json({ error: "Solo el dueño puede registrar pagos" }, { status: 403 });
  }

  const { monto, fecha_pago, comprobante_url, cuenta_id } = await req.json().catch(() => ({}));
  const montoNum = Number(monto);
  if (!Number.isFinite(montoNum) || montoNum <= 0) {
    return NextResponse.json({ error: "El monto debe ser mayor a 0" }, { status: 400 });
  }
  if (typeof fecha_pago !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha_pago)) {
    return NextResponse.json({ error: "La fecha del pago no es válida" }, { status: 400 });
  }
  // Solo enlaces http(s): evita guardar esquemas como javascript:
  const url = typeof comprobante_url === "string" && comprobante_url.trim() ? comprobante_url.trim() : null;
  if (url && !/^(https?:\/\/|\/api\/comprobantes\?)/i.test(url)) {
    return NextResponse.json({ error: "El enlace del comprobante debe empezar por https://" }, { status: 400 });
  }

  if (deuda.categoria === "deuda") {
    const pendiente = deuda.monto_inicial - deuda.total_pagado;
    if (pendiente <= 0) {
      return NextResponse.json({ error: "Esta deuda ya está saldada" }, { status: 400 });
    }
    if (montoNum > pendiente) {
      return NextResponse.json(
        { error: `El pago supera el saldo pendiente (${cop.format(pendiente)})` },
        { status: 400 }
      );
    }
  }

  // Cuenta de origen opcional: descuenta el saldo y deja el movimiento registrado.
  // Las deudas están en pesos, así que solo se aceptan cuentas en COP.
  let cuenta: Cuenta | null = null;
  if (cuenta_id) {
    const op = await getCuentaOperable(Number(cuenta_id), user.id);
    if ("error" in op) return NextResponse.json({ error: op.error }, { status: op.status });
    cuenta = op.cuenta;
    if (cuenta.moneda !== "COP") {
      return NextResponse.json(
        { error: `${cuenta.nombre} está en ${cuenta.moneda}. Pasa primero el dinero a una cuenta en pesos.` },
        { status: 400 }
      );
    }
    if (cuenta.saldo < montoNum) {
      return NextResponse.json(
        { error: `Saldo insuficiente en ${cuenta.nombre} (disponible ${cop.format(cuenta.saldo)})` },
        { status: 400 }
      );
    }
  }

  // Pago, estado de la deuda y movimiento de la cuenta en una sola transacción
  const stmts: InStatement[] = [
    {
      sql: "INSERT INTO pagos (deuda_id, monto, fecha_pago, comprobante_url, cuenta_id) VALUES (?, ?, ?, ?, ?)",
      args: [deuda.id, montoNum, fecha_pago, url, cuenta?.id ?? null],
    },
  ];
  if (deuda.categoria === "deuda") {
    stmts.push({
      sql: "UPDATE deudas SET estado = ? WHERE id = ?",
      args: [estadoSegunSaldo(deuda.monto_inicial, deuda.total_pagado + montoNum), deuda.id],
    });
  }
  if (cuenta) {
    stmts.push(
      ...movimientoStmts({
        userId: user.id,
        cuentaId: cuenta.id,
        tipo: "pago_deuda",
        monto: -montoNum,
        descripcion: `Pago: ${deuda.descripcion}`,
        fecha: fecha_pago,
      })
    );
  }
  const [insert] = await db.batch(stmts, "write");

  return NextResponse.json({ id: Number(insert.lastInsertRowid) }, { status: 201 });
}
