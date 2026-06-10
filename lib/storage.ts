import { put, get } from "@vercel/blob";

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
