import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { InValue } from "@libsql/core/api";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  // Verificar que la deuda existe y pertenece al usuario
  const check = await db.execute({
    sql: "SELECT id, categoria FROM deudas WHERE id = ? AND user_id = ?",
    args: [id, user.id],
  });
  if (!check.rows[0]) {
    return NextResponse.json({ error: "No encontrada o sin permiso" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { dia_pago, mes_pago, frecuencia_pago, valor_estimado } = body;

  const frecuenciasValidas = ["semanal", "quincenal", "mensual", "semestral", "anual"];

  // Validar dia_pago
  let diaPagoVal: number | null = null;
  if (dia_pago != null && dia_pago !== "") {
    diaPagoVal = Number(dia_pago);
    if (!Number.isInteger(diaPagoVal) || diaPagoVal < 1 || diaPagoVal > 31) {
      return NextResponse.json({ error: "dia_pago debe ser entero entre 1 y 31" }, { status: 400 });
    }
  }

  // Validar mes_pago
  let mesPagoVal: number | null = null;
  if (mes_pago != null && mes_pago !== "") {
    mesPagoVal = Number(mes_pago);
    if (!Number.isInteger(mesPagoVal) || mesPagoVal < 1 || mesPagoVal > 12) {
      return NextResponse.json({ error: "mes_pago debe ser entero entre 1 y 12" }, { status: 400 });
    }
  }

  // Validar frecuencia_pago
  const frecuenciaVal =
    frecuencia_pago && frecuenciasValidas.includes(frecuencia_pago) ? frecuencia_pago : undefined;

  // Validar valor_estimado
  let estimadoVal: number | null | undefined = undefined;
  if (valor_estimado !== undefined) {
    estimadoVal = valor_estimado === null || valor_estimado === "" ? null : Number(valor_estimado);
    if (estimadoVal !== null && (!Number.isFinite(estimadoVal) || estimadoVal < 0)) {
      return NextResponse.json({ error: "valor_estimado debe ser >= 0" }, { status: 400 });
    }
  }

  // Construir SET dinámico con solo los campos enviados
  const sets: string[] = [];
  const args: InValue[] = [];

  if (diaPagoVal !== undefined || dia_pago === null) {
    sets.push("dia_pago = ?");
    args.push(dia_pago === null ? null : diaPagoVal);
  }
  if (mesPagoVal !== undefined || mes_pago === null) {
    sets.push("mes_pago = ?");
    args.push(mes_pago === null ? null : mesPagoVal);
  }
  if (frecuenciaVal !== undefined) {
    sets.push("frecuencia_pago = ?");
    args.push(frecuenciaVal);
  }
  if (estimadoVal !== undefined) {
    sets.push("valor_estimado = ?");
    args.push(estimadoVal);
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  args.push(id, user.id);
  await db.execute({
    sql: `UPDATE deudas SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
    args,
  });

  return NextResponse.json({ ok: true });
}
