import { NextRequest, NextResponse } from "next/server";
import type { InValue } from "@libsql/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { estadoSegunSaldo } from "@/lib/deudas";

const FRECUENCIAS = ["semanal", "quincenal", "mensual", "semestral", "anual"];

async function propia(id: string, userId: string) {
  const res = await db.execute({
    sql: `SELECT d.id, d.categoria, d.monto_inicial,
            COALESCE((SELECT SUM(p.monto) FROM pagos p WHERE p.deuda_id = d.id), 0) AS total_pagado
          FROM deudas d WHERE d.id = ? AND d.user_id = ?`,
    args: [id, userId],
  });
  return res.rows[0] ?? null;
}

function error(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

// Edita cualquier campo enviado. Campos: descripcion, acreedor, monto_inicial, tasa_interes,
// fecha_vencimiento, frecuencia_pago, dia_pago, mes_pago, valor_estimado, estado.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const actual = await propia(id, user.id);
  if (!actual) return NextResponse.json({ error: "No encontrada o sin permiso" }, { status: 404 });
  const esDeuda = actual.categoria !== "responsabilidad";
  const totalPagado = Number(actual.total_pagado);

  const body = await req.json().catch(() => ({}));
  const sets: string[] = [];
  const args: InValue[] = [];
  const set = (col: string, val: InValue) => {
    sets.push(`${col} = ?`);
    args.push(val);
  };
  const vacio = (v: unknown) => v === null || v === "";

  if (body.descripcion !== undefined) {
    const d = String(body.descripcion ?? "").trim();
    if (!d) return error("La descripción no puede quedar vacía");
    set("descripcion", d.slice(0, 120));
  }
  if (body.acreedor !== undefined) {
    set("acreedor", vacio(body.acreedor) ? null : String(body.acreedor).trim().slice(0, 120));
  }

  let montoInicial = Number(actual.monto_inicial);
  if (body.monto_inicial !== undefined && esDeuda) {
    montoInicial = Number(body.monto_inicial);
    if (!Number.isFinite(montoInicial) || montoInicial <= 0) return error("El monto total debe ser mayor a 0");
    if (montoInicial < totalPagado) return error("El monto total no puede ser menor a lo que ya pagaste");
    set("monto_inicial", montoInicial);
  }
  if (body.tasa_interes !== undefined) {
    const t = vacio(body.tasa_interes) ? null : Number(body.tasa_interes);
    if (t !== null && (!Number.isFinite(t) || t < 0)) return error("El interés debe ser 0 o más");
    set("tasa_interes", t);
  }
  if (body.fecha_vencimiento !== undefined) {
    const f = vacio(body.fecha_vencimiento) ? null : String(body.fecha_vencimiento);
    if (f !== null && !/^\d{4}-\d{2}-\d{2}$/.test(f)) return error("La fecha de vencimiento no es válida");
    set("fecha_vencimiento", f);
  }
  if (body.frecuencia_pago !== undefined) {
    if (!FRECUENCIAS.includes(body.frecuencia_pago)) return error("Frecuencia no válida");
    set("frecuencia_pago", body.frecuencia_pago);
  }
  if (body.dia_pago !== undefined) {
    const d = vacio(body.dia_pago) ? null : Number(body.dia_pago);
    if (d !== null && (!Number.isInteger(d) || d < 1 || d > 31)) return error("El día de pago va de 1 a 31");
    set("dia_pago", d);
  }
  if (body.mes_pago !== undefined) {
    const m = vacio(body.mes_pago) ? null : Number(body.mes_pago);
    if (m !== null && (!Number.isInteger(m) || m < 1 || m > 12)) return error("El mes de pago no es válido");
    set("mes_pago", m);
  }
  if (body.valor_estimado !== undefined) {
    const v = vacio(body.valor_estimado) ? null : Number(body.valor_estimado);
    if (v !== null && (!Number.isFinite(v) || v < 0)) return error("El valor por pago debe ser 0 o más");
    set("valor_estimado", v);
  }

  if (body.estado !== undefined) {
    if (body.estado !== "activa" && body.estado !== "archivada") return error("Estado no válido");
    set("estado", body.estado);
  } else if (esDeuda && body.monto_inicial !== undefined) {
    // Si cambia el monto total, el estado sigue a lo que falte por pagar
    set("estado", estadoSegunSaldo(montoInicial, totalPagado));
  }

  if (sets.length === 0) return error("Nada que actualizar");

  args.push(id, user.id);
  await db.execute({ sql: `UPDATE deudas SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`, args });
  return NextResponse.json({ ok: true });
}

// Elimina la deuda con sus pagos y accesos compartidos.
// Los saldos de las cuentas no cambian: el dinero pagado ya salió.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const actual = await propia(id, user.id);
  if (!actual) return NextResponse.json({ error: "No encontrada o sin permiso" }, { status: 404 });

  await db.batch(
    [
      { sql: "DELETE FROM pagos WHERE deuda_id = ?", args: [actual.id] },
      { sql: "DELETE FROM deuda_accesos WHERE deuda_id = ?", args: [actual.id] },
      { sql: "DELETE FROM deudas WHERE id = ? AND user_id = ?", args: [actual.id, user.id] },
    ],
    "write"
  );
  return NextResponse.json({ ok: true });
}
