import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getCuenta } from "@/lib/finanzas";

const ESTADOS = ["activa", "inactiva", "archivada"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const cuenta = await getCuenta(Number(id), user.id);
  if (!cuenta) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

  const { estado } = await req.json().catch(() => ({}));
  if (!ESTADOS.includes(estado)) {
    return NextResponse.json(
      { error: `estado debe ser: ${ESTADOS.join(", ")}` },
      { status: 400 }
    );
  }

  await db.execute({
    sql: "UPDATE cuentas SET estado = ? WHERE id = ? AND user_id = ?",
    args: [estado, cuenta.id, user.id],
  });
  return NextResponse.json({ ok: true, estado });
}
