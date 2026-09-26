import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listProgramados } from "@/lib/deudas";
import { generarOcurrencias } from "@/lib/calendario";
import type { PagoFecha } from "@/lib/periodos";
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

  const programados = await listProgramados(user.id);
  const pagos = new Map<number, PagoFecha[]>();
  if (programados.length > 0) {
    const ids = programados.map((r) => r.id);
    const res = await db.execute({
      sql: `SELECT deuda_id, monto, fecha_pago FROM pagos WHERE deuda_id IN (${ids.map(() => "?").join(",")})`,
      args: ids,
    });
    for (const r of res.rows) {
      const id = Number(r.deuda_id);
      if (!pagos.has(id)) pagos.set(id, []);
      pagos.get(id)!.push({ monto: Number(r.monto), fecha_pago: String(r.fecha_pago).slice(0, 10) });
    }
  }

  const eventos = generarOcurrencias(programados, pagos, mesParam, anioParam);

  // Tarjetas de crédito: se consideran pagadas si ese mes entró dinero a la tarjeta
  const mm = String(mesParam + 1).padStart(2, "0");
  const tarjetasRes = await db.execute({
    sql: `SELECT c.id, c.nombre, c.dia_pago_credito,
            EXISTS (SELECT 1 FROM movimientos m
                    WHERE m.cuenta_id = c.id AND m.monto > 0 AND m.tipo = 'transferencia'
                      AND substr(m.fecha, 1, 7) = ?) AS pagada
          FROM cuentas c
          WHERE c.user_id = ? AND c.es_credito = 1 AND c.dia_pago_credito IS NOT NULL AND c.estado != 'archivada'`,
    args: [`${anioParam}-${mm}`, user.id],
  });
  const ult = new Date(Date.UTC(anioParam, mesParam + 1, 0)).getUTCDate();
  for (const t of tarjetasRes.rows) {
    const dia = Math.min(Number(t.dia_pago_credito), ult);
    eventos.push({
      deuda_id: -Number(t.id),
      nombre: `Pago ${t.nombre}`,
      monto_estimado: null,
      fecha: `${anioParam}-${mm}-${String(dia).padStart(2, "0")}`,
      pagado: Boolean(Number(t.pagada)),
      tipo: "tarjeta",
    });
  }

  eventos.sort((a, b) => a.fecha.localeCompare(b.fecha));
  return NextResponse.json({ eventos });
}
