import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

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
