import { put, get, del, list } from "@vercel/blob";

export const storageConfigurado = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

// Sube el archivo al store privado de Vercel Blob y devuelve la URL interna
// (/api/comprobantes?path=...) que valida acceso antes de servir el archivo.
export async function subirComprobante(
  buffer: Buffer,
  nombreArchivo: string,
  contentType: string,
  deudaId: number
): Promise<string> {
  if (!storageConfigurado) {
    throw new Error("Vercel Blob no está configurado (falta BLOB_READ_WRITE_TOKEN)");
  }
  const limpio = nombreArchivo.replace(/[^a-zA-Z0-9._-]/g, "_");
  const pathname = `comprobantes/deuda-${deudaId}/${Date.now()}-${limpio}`;
  await put(pathname, buffer, { access: "private", contentType });
  return `/api/comprobantes?path=${encodeURIComponent(pathname)}`;
}

export async function obtenerComprobante(pathname: string) {
  return get(pathname, { access: "private" });
}

// Extrae el pathname del blob a partir de la URL interna /api/comprobantes?path=...
export function pathDeUrlInterna(url: string | null | undefined): string | null {
  if (!url || !url.startsWith("/api/comprobantes?")) return null;
  return new URLSearchParams(url.split("?")[1]).get("path");
}

// Borra un archivo del store. Si falla no interrumpe: el registro en la base ya se actualizó.
export async function eliminarArchivo(url: string | null | undefined) {
  const path = pathDeUrlInterna(url);
  if (!path || !storageConfigurado) return;
  try {
    await del(path);
  } catch (e) {
    console.error("[storage] no se pudo borrar", path, e);
  }
}

// Borra todos los archivos de una deuda (comprobantes y paz y salvo) al eliminarla
export async function eliminarArchivosDeuda(deudaId: number) {
  if (!storageConfigurado) return;
  try {
    let cursor: string | undefined;
    do {
      const res = await list({ prefix: `comprobantes/deuda-${deudaId}/`, cursor });
      if (res.blobs.length) await del(res.blobs.map((b) => b.pathname));
      cursor = res.hasMore ? res.cursor : undefined;
    } while (cursor);
  } catch (e) {
    console.error("[storage] no se pudieron borrar los archivos de la deuda", deudaId, e);
  }
}

// Descarga un archivo del store como Buffer (para adjuntarlo a un correo)
export async function leerArchivo(url: string | null | undefined) {
  const path = pathDeUrlInterna(url);
  if (!path || !storageConfigurado) return null;
  const res = await get(path, { access: "private" });
  if (!res || res.statusCode !== 200 || !res.stream) return null;
  const buffer = Buffer.from(await new Response(res.stream as unknown as ReadableStream).arrayBuffer());
  return {
    buffer,
    nombre: (path.split("/").pop() ?? "comprobante").replace(/^\d+-/, ""),
    tipo: res.headers.get("content-type") ?? "application/octet-stream",
  };
}
