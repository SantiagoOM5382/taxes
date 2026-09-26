import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getDeudaConAcceso } from "@/lib/deudas";
import { subirComprobante, storageConfigurado, eliminarArchivo } from "@/lib/storage";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// Sube (o reemplaza) el paz y salvo. Solo el dueño y solo si la deuda está saldada.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const deuda = await getDeudaConAcceso(id, user.id);
  if (!deuda || !deuda.es_propia) {
    return NextResponse.json({ error: "Solo el dueño puede subir el paz y salvo" }, { status: 403 });
  }
  if (deuda.categoria !== "deuda" || deuda.monto_actual > 0) {
    return NextResponse.json({ error: "El paz y salvo se habilita cuando la deuda está saldada" }, { status: 400 });
  }
  if (!storageConfigurado) {
    return NextResponse.json({ error: "La subida de archivos no está disponible en este momento" }, { status: 503 });
  }

  const form = await req.formData().catch(() => null);
  const archivo = form?.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return NextResponse.json({ error: "Elige un archivo" }, { status: 400 });
  }
  if (archivo.size > MAX_BYTES) {
    return NextResponse.json({ error: "El archivo supera 10 MB" }, { status: 413 });
  }

  const buffer = Buffer.from(await archivo.arrayBuffer());
  const url = await subirComprobante(
    buffer,
    `paz-y-salvo-${archivo.name}`,
    archivo.type || "application/octet-stream",
    deuda.id
  );
  await db.execute({
    sql: "UPDATE deudas SET paz_y_salvo_url = ? WHERE id = ? AND user_id = ?",
    args: [url, deuda.id, user.id],
  });
  await eliminarArchivo(deuda.paz_y_salvo_url); // el anterior, si se reemplazó
  return NextResponse.json({ url }, { status: 201 });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const deuda = await getDeudaConAcceso(id, user.id);
  if (!deuda || !deuda.es_propia) {
    return NextResponse.json({ error: "Solo el dueño puede quitar el paz y salvo" }, { status: 403 });
  }
  await db.execute({
    sql: "UPDATE deudas SET paz_y_salvo_url = NULL WHERE id = ? AND user_id = ?",
    args: [deuda.id, user.id],
  });
  await eliminarArchivo(deuda.paz_y_salvo_url);
  return NextResponse.json({ ok: true });
}
