import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getCuenta, listMovimientos, registrarMovimiento } from "@/lib/finanzas";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json({ movimientos: await listMovimientos(user.id) });
}

// Tipos soportados:
//  - recarga:        { tipo, cuenta_id, monto, descripcion? }            → entra dinero
//  - retiro:         { tipo, cuenta_id, monto, descripcion? }            → sale dinero
//  - ajuste:         { tipo, cuenta_id, saldo_real, descripcion? }       → corrige el saldo al valor real
//  - transferencia:  { tipo, cuenta_origen, cuenta_destino, monto, monto_destino?, descripcion? }
//                    monto_destino permite conversión de moneda (ej. COP → USD en Binance)
export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const tipo = String(body.tipo ?? "");

  if (tipo === "recarga" || tipo === "retiro") {
    const monto = Number(body.monto);
    const cuenta = await getCuenta(Number(body.cuenta_id), user.id);
    if (!cuenta) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    if (!Number.isFinite(monto) || monto <= 0) {
      return NextResponse.json({ error: "monto (> 0) es obligatorio" }, { status: 400 });
    }
    if (tipo === "retiro" && cuenta.saldo < monto) {
      return NextResponse.json(
        { error: `Saldo insuficiente en ${cuenta.nombre} (${cuenta.saldo})` },
        { status: 400 }
      );
    }
    await registrarMovimiento({
      userId: user.id,
      cuentaId: cuenta.id,
      tipo,
      monto: tipo === "recarga" ? monto : -monto,
      descripcion: body.descripcion ?? null,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  if (tipo === "ajuste") {
    const saldoReal = Number(body.saldo_real);
    const cuenta = await getCuenta(Number(body.cuenta_id), user.id);
    if (!cuenta) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    if (!Number.isFinite(saldoReal)) {
      return NextResponse.json({ error: "saldo_real es obligatorio" }, { status: 400 });
    }
    await registrarMovimiento({
      userId: user.id,
      cuentaId: cuenta.id,
      tipo: "ajuste",
      monto: saldoReal - cuenta.saldo,
      descripcion: body.descripcion ?? "Ajuste de saldo",
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  if (tipo === "transferencia") {
    const monto = Number(body.monto);
    const montoDestino = body.monto_destino != null ? Number(body.monto_destino) : monto;
    const origen = await getCuenta(Number(body.cuenta_origen), user.id);
    const destino = await getCuenta(Number(body.cuenta_destino), user.id);
    if (!origen || !destino) {
      return NextResponse.json({ error: "Cuenta origen o destino no encontrada" }, { status: 404 });
    }
    if (origen.id === destino.id) {
      return NextResponse.json({ error: "Origen y destino no pueden ser la misma cuenta" }, { status: 400 });
    }
    if (!Number.isFinite(monto) || monto <= 0 || !Number.isFinite(montoDestino) || montoDestino <= 0) {
      return NextResponse.json({ error: "monto (> 0) es obligatorio" }, { status: 400 });
    }
    if (origen.saldo < monto) {
      return NextResponse.json(
        { error: `Saldo insuficiente en ${origen.nombre} (${origen.saldo})` },
        { status: 400 }
      );
    }
    const desc = body.descripcion ?? `Transferencia ${origen.nombre} → ${destino.nombre}`;
    await registrarMovimiento({
      userId: user.id, cuentaId: origen.id, tipo: "transferencia",
      monto: -monto, descripcion: desc,
    });
    await registrarMovimiento({
      userId: user.id, cuentaId: destino.id, tipo: "transferencia",
      monto: montoDestino, descripcion: desc,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  return NextResponse.json(
    { error: "tipo debe ser recarga, retiro, ajuste o transferencia" },
    { status: 400 }
  );
}
