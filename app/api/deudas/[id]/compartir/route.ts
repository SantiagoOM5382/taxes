import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, getToken } from "@/lib/session";
import { getDeudaConAcceso } from "@/lib/deudas";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const deuda = await getDeudaConAcceso(id, user.id);
  if (!deuda || !deuda.es_propia) {
    return NextResponse.json(
      { error: "Solo el dueño puede compartir la deuda" },
      { status: 403 }
    );
  }

  const { email } = await req.json().catch(() => ({}));
  if (!email) {
    return NextResponse.json({ error: "email es obligatorio" }, { status: 400 });
  }

  // Resuelve el email contra el microservicio de auth
  const token = await getToken();
  const res = await fetch(
    `${process.env.AUTH_SERVICE_URL}/api/users/lookup?email=${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    return NextResponse.json(
      { error: "No existe un usuario registrado con ese email" },
      { status: 404 }
    );
  }
  const { user: invitado } = await res.json();

  if (invitado.id === user.id) {
    return NextResponse.json({ error: "No puedes compartirte la deuda a ti mismo" }, { status: 400 });
  }

  await db.execute({
    sql: "INSERT OR IGNORE INTO deuda_accesos (deuda_id, user_id) VALUES (?, ?)",
    args: [deuda.id, invitado.id],
  });
  return NextResponse.json({ ok: true, invitado });
}

// Quita el acceso de una persona a la deuda. Body: { user_id }
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const deuda = await getDeudaConAcceso(id, user.id);
  if (!deuda || !deuda.es_propia) {
    return NextResponse.json({ error: "Solo el dueño puede quitar accesos" }, { status: 403 });
  }

  const { user_id } = await req.json().catch(() => ({}));
  if (user_id == null) return NextResponse.json({ error: "user_id es obligatorio" }, { status: 400 });

  await db.execute({
    sql: "DELETE FROM deuda_accesos WHERE deuda_id = ? AND user_id = ?",
    args: [deuda.id, user_id],
  });
  return NextResponse.json({ ok: true });
}
