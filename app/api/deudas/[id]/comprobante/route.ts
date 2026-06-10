import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getDeudaConAcceso } from "@/lib/deudas";
import { subirComprobante, storageConfigurado } from "@/lib/storage";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

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
      { error: "Solo el dueño de la deuda puede subir comprobantes" },
      { status: 403 }
    );
  }

  if (!storageConfigurado) {
    return NextResponse.json(
      { error: "Firebase Storage no está configurado en el servidor" },
      { status: 503 }
    );
  }

  const form = await req.formData().catch(() => null);
  const archivo = form?.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  }
  if (archivo.size > MAX_BYTES) {
    return NextResponse.json({ error: "El archivo supera 10 MB" }, { status: 413 });
  }

  try {
    const buffer = Buffer.from(await archivo.arrayBuffer());
    const url = await subirComprobante(
      buffer,
      archivo.name,
      archivo.type || "application/octet-stream",
      deuda.id
    );
    return NextResponse.json({ url }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al subir el comprobante" },
      { status: 502 }
    );
  }
}
