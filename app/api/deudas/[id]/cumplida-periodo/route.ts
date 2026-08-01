import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getDeudaConAcceso } from "@/lib/deudas";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const deuda = await getDeudaConAcceso(id, user.id);
  if (!deuda) return NextResponse.json({ error: "Deuda no encontrada" }, { status: 404 });
  if (deuda.categoria !== "responsabilidad") {
    return NextResponse.json(
      { error: "Solo se puede marcar cumplida en responsabilidades" },
      { status: 400 }
    );
  }
  if (!deuda.es_propia) {
    return NextResponse.json(
      { error: "Solo el dueño puede cambiar el estado" },
      { status: 403 }
    );
  }

  const { cumplida } = await req.json().catch(() => ({}));
  if (typeof cumplida !== "boolean") {
    return NextResponse.json(
      { error: "cumplida (boolean) es obligatorio" },
      { status: 400 }
    );
  }

  const nuevoEstado = cumplida ? "archivada" : "activa";
  await db.execute({
    sql: "UPDATE deudas SET pagada_mes_actual = ?, estado = ? WHERE id = ?",
    args: [cumplida ? 1 : 0, nuevoEstado, deuda.id],
  });

  return NextResponse.json({ updated: true }, { status: 200 });
}
