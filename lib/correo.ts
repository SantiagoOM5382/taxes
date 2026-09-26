import nodemailer, { type Transporter } from "nodemailer";

// Envío de correos por Gmail con una contraseña de aplicación.
// Variables: GMAIL_USER (la cuenta) y GMAIL_APP_PASSWORD (16 caracteres, sin espacios).
// Se crea en https://myaccount.google.com/apppasswords (requiere verificación en 2 pasos).
export const correoConfigurado = Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

let transporte: Transporter | null = null;
function getTransporte() {
  if (!transporte) {
    transporte = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "") },
    });
  }
  return transporte;
}

export async function enviarCorreo(opts: {
  para: string[];
  asunto: string;
  html: string;
  texto: string;
  responderA?: string;
  adjuntos?: { filename: string; content: Buffer; contentType: string }[];
}) {
  if (!correoConfigurado) throw new Error("El envío de correos no está configurado");
  await getTransporte().sendMail({
    from: { name: "Mis Deudas", address: process.env.GMAIL_USER! },
    to: opts.para,
    replyTo: opts.responderA,
    subject: opts.asunto,
    html: opts.html,
    text: opts.texto,
    attachments: opts.adjuntos,
  });
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// Recibo de pago en HTML con estilos en línea (los clientes de correo ignoran <style>)
export function htmlRecibo(d: {
  pagador: string;
  descripcion: string;
  acreedor: string | null;
  monto: string;
  fecha: string;
  filas: [string, string][];
  avance: number | null;
  comprobante: "adjunto" | { enlace: string } | null;
  enlaceApp: string;
}) {
  const filas = d.filas
    .map(
      ([k, v]) =>
        `<tr><td style="padding:10px 0;color:#4f5f64;border-top:1px solid #e6ebe6">${esc(k)}</td>` +
        `<td style="padding:10px 0;text-align:right;font-weight:600;border-top:1px solid #e6ebe6">${esc(v)}</td></tr>`
    )
    .join("");
  const comprobante =
    d.comprobante === "adjunto"
      ? "El comprobante del pago va adjunto a este correo."
      : d.comprobante
        ? `Comprobante: <a href="${esc(d.comprobante.enlace)}" style="color:#1e5a6b">ver comprobante</a>`
        : "Este pago no tiene comprobante adjunto.";
  const barra =
    d.avance == null
      ? ""
      : `<div style="margin:18px 0 4px;height:8px;background:#e6ebe6;border-radius:99px;overflow:hidden">
           <div style="width:${Math.min(100, Math.max(0, d.avance))}%;height:8px;background:#1f7a4d"></div>
         </div>
         <div style="font-size:13px;color:#7d8b8f">${d.avance}% de la deuda pagada</div>`;

  return `<!doctype html><html><body style="margin:0;background:#edf0eb;font-family:Arial,Helvetica,sans-serif;color:#17262b">
  <div style="max-width:520px;margin:0 auto;padding:28px 16px">
    <div style="font-weight:700;font-size:16px;margin-bottom:16px">Mis Deudas</div>
    <div style="background:#ffffff;border:1px solid #d6ddd7;border-radius:14px;padding:24px">
      <div style="font-size:14px;color:#4f5f64">Recibo de pago</div>
      <div style="font-size:30px;font-weight:700;margin:6px 0 2px">${esc(d.monto)}</div>
      <div style="font-size:14px;color:#4f5f64">${esc(d.pagador)} abonó a <strong>${esc(d.descripcion)}</strong>${
        d.acreedor ? ` (${esc(d.acreedor)})` : ""
      } el ${esc(d.fecha)}.</div>
      ${barra}
      <table style="width:100%;border-collapse:collapse;margin-top:18px;font-size:14px">${filas}</table>
      <p style="font-size:14px;color:#4f5f64;margin:18px 0 0">${comprobante}</p>
      <a href="${esc(d.enlaceApp)}" style="display:inline-block;margin-top:20px;background:#1e5a6b;color:#ffffff;text-decoration:none;font-weight:600;padding:11px 18px;border-radius:9px">Ver la deuda en Mis Deudas</a>
    </div>
    <p style="font-size:12px;color:#7d8b8f;margin-top:16px">Recibes este correo porque ${esc(d.pagador)} te dio acceso a esta deuda en Mis Deudas. Si respondes, le llega a esa persona.</p>
  </div></body></html>`;
}
