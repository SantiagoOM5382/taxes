import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getCuentaOperable, listMovimientos, movimientoStmts } from "@/lib/finanzas";

// GET ?offset=&limit=&cuenta_id= → página de movimientos (más recientes primero)
export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") ?? 20) || 20));
  const offset = Math.max(0, Number(sp.get("offset") ?? 0) || 0);
  const cuentaId = sp.get("cuenta_id") ? Number(sp.get("cuenta_id")) : null;
  return NextResponse.json({ movimientos: await listMovimientos(user.id, { limit, offset, cuentaId }) });
}

function descripcion(v: unknown, porDefecto: string | null): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, 200) : porDefecto;
}

// Tipos soportados:
//  - recarga:        { tipo, cuenta_id, monto, descripcion? }            → entra dinero
//  - retiro:         { tipo, cuenta_id, monto, descripcion? }            → sale dinero
//  - ajuste:         { tipo, cuenta_id, saldo_real, descripcion? }       → corrige el saldo al valor real
//  - transferencia:  { tipo, cuenta_origen, cuenta_destino, monto, monto_destino?, descripcion? }
//                    monto_destino es obligatorio si las cuentas tienen monedas distintas
export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const tipo = String(body.tipo ?? "");

  if (tipo === "recarga" || tipo === "retiro") {
    const monto = Number(body.monto);
    const op = await getCuentaOperable(Number(body.cuenta_id), user.id);
    if ("error" in op) return NextResponse.json({ error: op.error }, { status: op.status });
    const cuenta = op.cuenta;
    if (!Number.isFinite(monto) || monto <= 0) {
      return NextResponse.json({ error: "El monto debe ser mayor a 0" }, { status: 400 });
    }
    if (tipo === "retiro" && cuenta.saldo < monto) {
      return NextResponse.json({ error: `Saldo insuficiente en ${cuenta.nombre}` }, { status: 400 });
    }
    await db.batch(
      movimientoStmts({
        userId: user.id,
        cuentaId: cuenta.id,
        tipo,
        monto: tipo === "recarga" ? monto : -monto,
        descripcion: descripcion(body.descripcion, null),
      }),
      "write"
    );
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  if (tipo === "ajuste") {
    const saldoReal = Number(body.saldo_real);
    const op = await getCuentaOperable(Number(body.cuenta_id), user.id);
    if ("error" in op) return NextResponse.json({ error: op.error }, { status: op.status });
    const cuenta = op.cuenta;
    if (body.saldo_real === "" || body.saldo_real == null || !Number.isFinite(saldoReal)) {
      return NextResponse.json({ error: "Escribe el saldo real de la cuenta" }, { status: 400 });
    }
    if (saldoReal === cuenta.saldo) {
      return NextResponse.json({ error: "El saldo ya es ese valor" }, { status: 400 });
    }
    await db.batch(
      movimientoStmts({
        userId: user.id,
        cuentaId: cuenta.id,
        tipo: "ajuste",
        monto: saldoReal - cuenta.saldo,
        descripcion: descripcion(body.descripcion, "Ajuste de saldo"),
      }),
      "write"
    );
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  if (tipo === "transferencia") {
    const opOrigen = await getCuentaOperable(Number(body.cuenta_origen), user.id);
    if ("error" in opOrigen) return NextResponse.json({ error: opOrigen.error }, { status: opOrigen.status });
    const opDestino = await getCuentaOperable(Number(body.cuenta_destino), user.id);
    if ("error" in opDestino) return NextResponse.json({ error: opDestino.error }, { status: opDestino.status });
    const origen = opOrigen.cuenta;
    const destino = opDestino.cuenta;
    if (origen.id === destino.id) {
      return NextResponse.json({ error: "Origen y destino no pueden ser la misma cuenta" }, { status: 400 });
    }

    const monto = Number(body.monto);
    const mismaMoneda = origen.moneda === destino.moneda;
    const tieneDestino = body.monto_destino != null && body.monto_destino !== "";
    if (!mismaMoneda && !tieneDestino) {
      return NextResponse.json(
        { error: `${origen.nombre} está en ${origen.moneda} y ${destino.nombre} en ${destino.moneda}. Indica cuánto entra en ${destino.moneda}.` },
        { status: 400 }
      );
    }
    const montoDestino = tieneDestino ? Number(body.monto_destino) : monto;
    if (!Number.isFinite(monto) || monto <= 0 || !Number.isFinite(montoDestino) || montoDestino <= 0) {
      return NextResponse.json({ error: "Los montos deben ser mayores a 0" }, { status: 400 });
    }
    if (origen.saldo < monto) {
      return NextResponse.json({ error: `Saldo insuficiente en ${origen.nombre}` }, { status: 400 });
    }

    const desc = descripcion(body.descripcion, `Transferencia ${origen.nombre} → ${destino.nombre}`);
    // Salida y entrada en la misma transacción: o se registran las dos o ninguna
    await db.batch(
      [
        ...movimientoStmts({ userId: user.id, cuentaId: origen.id, tipo: "transferencia", monto: -monto, descripcion: desc }),
        ...movimientoStmts({ userId: user.id, cuentaId: destino.id, tipo: "transferencia", monto: montoDestino, descripcion: desc }),
      ],
      "write"
    );
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  return NextResponse.json({ error: "tipo debe ser recarga, retiro, ajuste o transferencia" }, { status: 400 });
}
