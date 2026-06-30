import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listResponsabilidades } from "@/lib/deudas";
import { generarOcurrencias } from "@/lib/calendario";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mesParam = Number(searchParams.get("mes") ?? new Date().getMonth());
  const anioParam = Number(searchParams.get("anio") ?? new Date().getFullYear());

  if (!Number.isInteger(mesParam) || mesParam < 0 || mesParam > 11) {
    return NextResponse.json({ error: "mes debe ser 0-11" }, { status: 400 });
  }
  if (!Number.isInteger(anioParam) || anioParam < 2020 || anioParam > 2100) {
    return NextResponse.json({ error: "anio inválido" }, { status: 400 });
  }

  const responsabilidades = await listResponsabilidades(user.id);

  // Obtener todos los pagos relevantes del usuario para las responsabilidades
  const ids = responsabilidades.map((r) => r.id);
  let pagos: { deuda_id: number; fecha_pago: string }[] = [];
  if (ids.length > 0) {
    const placeholders = ids.map(() => "?").join(",");
    const res = await db.execute({
      sql: `SELECT deuda_id, fecha_pago FROM pagos WHERE deuda_id IN (${placeholders})`,
      args: ids,
    });
    pagos = res.rows.map((r) => ({
      deuda_id: Number(r.deuda_id),
      fecha_pago: String(r.fecha_pago),
    }));
  }

  const eventos = generarOcurrencias(responsabilidades, pagos, mesParam, anioParam);

  // Agregar días de pago de tarjetas de crédito
  const tarjetasRes = await db.execute({
    sql: "SELECT id, nombre, dia_pago_credito FROM cuentas WHERE user_id = ? AND es_credito = 1 AND dia_pago_credito IS NOT NULL AND estado != 'archivada'",
    args: [user.id],
  });
  const ult = new Date(anioParam, mesParam + 1, 0).getDate();
  for (const t of tarjetasRes.rows) {
    const dia = Math.min(Number(t.dia_pago_credito), ult);
    const mm = String(mesParam + 1).padStart(2, "0");
    const dd = String(dia).padStart(2, "0");
    eventos.push({
      deuda_id: -Number(t.id),
      nombre: `Pago ${t.nombre}`,
      monto_estimado: null,
      fecha: `${anioParam}-${mm}-${dd}`,
      pagado: false,
      tipo: "tarjeta",
    });
  }

  eventos.sort((a, b) => a.fecha.localeCompare(b.fecha));
  return NextResponse.json({ eventos });
}
