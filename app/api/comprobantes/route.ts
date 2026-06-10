import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getDeudaConAcceso } from "@/lib/deudas";
import { obtenerComprobante } from "@/lib/storage";

// Sirve un comprobante del store privado de Vercel Blob.
// Solo el dueño de la deuda o un usuario con acceso compartido puede verlo.
export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const path = req.nextUrl.searchParams.get("path") ?? "";
  const match = path.match(/^comprobantes\/deuda-(\d+)\//);
  if (!match) {
    return NextResponse.json({ error: "Ruta inválida" }, { status: 400 });
  }

  const deuda = await getDeudaConAcceso(match[1], user.id);
  if (!deuda) {
    return NextResponse.json({ error: "Sin acceso a esta deuda" }, { status: 403 });
  }

  const res = await obtenerComprobante(path);
  if (!res || res.statusCode !== 200 || !res.stream) {
    return NextResponse.json({ error: "Comprobante no encontrado" }, { status: 404 });
  }

  return new NextResponse(res.stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/octet-stream",
      "Content-Disposition": res.headers.get("content-disposition") ?? "inline",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
