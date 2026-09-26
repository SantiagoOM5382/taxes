import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getDeudaConAcceso } from "@/lib/deudas";
import { leerArchivo } from "@/lib/storage";
import { correoConfigurado, enviarCorreo, htmlRecibo } from "@/lib/correo";
import { cop, fmtFecha } from "@/lib/format";

// Envía el recibo de un pago, con su comprobante, a las personas con acceso a la deuda
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; pid: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!correoConfigurado) {
    return NextResponse.json({ error: "El envío de correos no está disponible en este momento" }, { status: 503 });
  }

  const { id, pid } = await params;
  const deuda = await getDeudaConAcceso(id, user.id);
  if (!deuda || !deuda.es_propia) {
    return NextResponse.json({ error: "Solo el dueño puede enviar recibos" }, { status: 403 });
  }

  const [pagoRes, accesosRes] = await Promise.all([
    db.execute({
      sql: `SELECT p.id, p.monto, p.fecha_pago, p.comprobante_url,
              (SELECT COALESCE(SUM(q.monto), 0) FROM pagos q
               WHERE q.deuda_id = p.deuda_id
                 AND (q.fecha_pago < p.fecha_pago OR (q.fecha_pago = p.fecha_pago AND q.id <= p.id))) AS acumulado
            FROM pagos p WHERE p.id = ? AND p.deuda_id = ?`,
      args: [Number(pid), deuda.id],
    }),
    db.execute({
      sql: `SELECT u.email, u.nombre FROM deuda_accesos a JOIN users u ON u.id = a.user_id WHERE a.deuda_id = ?`,
      args: [deuda.id],
    }),
  ]);
  const pago = pagoRes.rows[0];
  if (!pago) return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  const para = accesosRes.rows.map((r) => String(r.email));
  if (para.length === 0) {
    return NextResponse.json({ error: "Comparte la deuda con alguien para poder enviarle el recibo" }, { status: 400 });
  }

  const monto = Number(pago.monto);
  const acumulado = Number(pago.acumulado);
  const esDeuda = deuda.categoria === "deuda";
  // Saldo y avance tal como quedaron después de ESTE pago (sirve para reenviar recibos viejos)
  const saldoTras = Math.max(0, deuda.monto_inicial - acumulado);
  const filas: [string, string][] = esDeuda
    ? [
        ["Monto de la deuda", cop.format(deuda.monto_inicial)],
        ["Pagado hasta este abono", cop.format(acumulado)],
        ["Saldo pendiente", saldoTras === 0 ? "Saldada" : cop.format(saldoTras)],
      ]
    : [
        ["Valor por pago", deuda.valor_estimado != null ? cop.format(deuda.valor_estimado) : "Variable"],
        ["Pagado en total", cop.format(acumulado)],
      ];

  const url = pago.comprobante_url ? String(pago.comprobante_url) : null;
  let adjunto: Awaited<ReturnType<typeof leerArchivo>> = null;
  try {
    adjunto = await leerArchivo(url);
  } catch (e) {
    console.error("[recibo] no se pudo leer el comprobante", e);
  }
  const externo = url && /^https?:\/\//i.test(url) ? url : null;

  const origen = process.env.APP_URL ?? req.nextUrl.origin;
  const fecha = fmtFecha(String(pago.fecha_pago));
  const avance = esDeuda && deuda.monto_inicial > 0 ? Math.round((Math.min(acumulado, deuda.monto_inicial) / deuda.monto_inicial) * 100) : null;

  try {
    await enviarCorreo({
      para,
      responderA: user.email,
      asunto: `Recibo de pago: ${cop.format(monto)} a ${deuda.descripcion}`,
      html: htmlRecibo({
        pagador: user.nombre,
        descripcion: deuda.descripcion,
        acreedor: deuda.acreedor,
        monto: cop.format(monto),
        fecha,
        filas,
        avance,
        comprobante: adjunto ? "adjunto" : externo ? { enlace: externo } : null,
        enlaceApp: `${origen}/deudas/${deuda.id}`,
      }),
      texto:
        `${user.nombre} abonó ${cop.format(monto)} a "${deuda.descripcion}" el ${fecha}.\n` +
        filas.map(([k, v]) => `${k}: ${v}`).join("\n") +
        `\n\nVer la deuda: ${origen}/deudas/${deuda.id}`,
      adjuntos: adjunto ? [{ filename: adjunto.nombre, content: adjunto.buffer, contentType: adjunto.tipo }] : undefined,
    });
  } catch (e) {
    console.error("[recibo] fallo el envío", e);
    return NextResponse.json({ error: "No se pudo enviar el correo. Intenta de nuevo en unos minutos." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, enviado_a: para });
}
