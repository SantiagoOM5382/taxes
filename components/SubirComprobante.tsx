"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";

export default function SubirComprobante({ deudaId, pagoId }: { deudaId: number; pagoId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File | null) {
    if (!file) return;
    setError("");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("archivo", file);
      const res = await fetch(`/api/deudas/${deudaId}/pagos/${pagoId}/comprobante`, { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo subir");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        hidden
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => inputRef.current?.click()} disabled={loading}>
        <Upload size={14} aria-hidden />
        {loading ? "Subiendo…" : "Adjuntar"}
      </button>
      {error && (
        <div className="hint" style={{ color: "var(--debt)", marginTop: 4 }}>
          {error}
        </div>
      )}
    </>
  );
}
