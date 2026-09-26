import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getDeudaConAcceso } from "@/lib/deudas";
import { hoyColombia, periodoDe } from "@/lib/periodos";

// Marca o desmarca una responsabilidad como pagada en el periodo actual.
// No la archiva: la marca vence sola cuando empieza el siguiente periodo.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const deuda = await getDeudaConAcceso(id, user.id);
  if (!deuda) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (deuda.categoria !== "responsabilidad") {
    return NextResponse.json({ error: "Solo las responsabilidades se marcan por periodo" }, { status: 400 });
  }
  if (!deuda.es_propia) {
    return NextResponse.json({ error: "Solo el dueño puede cambiar el estado" }, { status: 403 });
  }

  const { cumplida } = await req.json().catch(() => ({}));
  if (typeof cumplida !== "boolean") {
    return NextResponse.json({ error: "cumplida (boolean) es obligatorio" }, { status: 400 });
  }
  if (!cumplida && deuda.pagada_por_pagos) {
    return NextResponse.json(
      { error: "Este periodo está cubierto por pagos registrados. Anula el pago para desmarcarlo." },
      { status: 409 }
    );
  }

  // ultimo_reset_fecha guarda la clave del periodo marcado (ej. "M:2026-09")
  const periodo = periodoDe(deuda.frecuencia_pago, hoyColombia(), deuda.mes_pago);
  await db.execute({
    sql: "UPDATE deudas SET pagada_mes_actual = ?, ultimo_reset_fecha = ? WHERE id = ? AND user_id = ?",
    args: [cumplida ? 1 : 0, cumplida ? periodo.clave : null, deuda.id, user.id],
  });

  return NextResponse.json({ ok: true, periodo: periodo.clave });
}
