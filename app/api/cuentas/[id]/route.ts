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

  const body = await req.json().catch(() => ({}));
  const sets: string[] = [];
  const args: (string | number | null)[] = [];

  if (body.estado !== undefined) {
    if (!ESTADOS.includes(body.estado)) {
      return NextResponse.json({ error: `estado debe ser: ${ESTADOS.join(", ")}` }, { status: 400 });
    }
    sets.push("estado = ?");
    args.push(body.estado);
  }

  if (body.nombre !== undefined) {
    const nombre = String(body.nombre ?? "").trim();
    if (!nombre) return NextResponse.json({ error: "El nombre no puede quedar vacío" }, { status: 400 });
    sets.push("nombre = ?");
    args.push(nombre.slice(0, 80));
  }

  if (body.es_credito !== undefined) {
    sets.push("es_credito = ?");
    args.push(body.es_credito ? 1 : 0);
  }

  if (body.dia_pago_credito !== undefined) {
    const dia = body.dia_pago_credito === null ? null : Number(body.dia_pago_credito);
    if (dia !== null && (!Number.isInteger(dia) || dia < 1 || dia > 31)) {
      return NextResponse.json({ error: "dia_pago_credito debe ser entero entre 1 y 31" }, { status: 400 });
    }
    sets.push("dia_pago_credito = ?");
    args.push(dia);
  }

  if (body.limite_credito !== undefined) {
    const limite = body.limite_credito === null ? null : Number(body.limite_credito);
    if (limite !== null && (!Number.isFinite(limite) || limite < 0)) {
      return NextResponse.json({ error: "limite_credito debe ser >= 0" }, { status: 400 });
    }
    sets.push("limite_credito = ?");
    args.push(limite);
  }

  if (sets.length === 0) return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });

  args.push(cuenta.id, user.id);
  await db.execute({
    sql: `UPDATE cuentas SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
    args,
  });
  return NextResponse.json({ ok: true });
}

// Elimina una cuenta sin historial. Si ya tiene movimientos o pagos, hay que archivarla
// para no perder el registro de a dónde fue el dinero.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const cuenta = await getCuenta(Number(id), user.id);
  if (!cuenta) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

  const uso = await db.execute({
    sql: `SELECT (SELECT COUNT(*) FROM movimientos WHERE cuenta_id = ?) AS movs,
                 (SELECT COUNT(*) FROM pagos WHERE cuenta_id = ?) AS pagos`,
    args: [cuenta.id, cuenta.id],
  });
  if (Number(uso.rows[0].movs) > 0 || Number(uso.rows[0].pagos) > 0) {
    return NextResponse.json(
      { error: `${cuenta.nombre} tiene movimientos registrados. Archívala en lugar de eliminarla.` },
      { status: 409 }
    );
  }

  await db.batch(
    [
      { sql: "UPDATE ingresos SET cuenta_id = NULL WHERE cuenta_id = ? AND user_id = ?", args: [cuenta.id, user.id] },
      { sql: "DELETE FROM cuentas WHERE id = ? AND user_id = ?", args: [cuenta.id, user.id] },
    ],
    "write"
  );
  return NextResponse.json({ ok: true });
}
