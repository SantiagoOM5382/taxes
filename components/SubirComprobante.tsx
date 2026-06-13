"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function SubirComprobante({
  deudaId,
  pagoId,
  subidaDisponible,
}: {
  deudaId: number;
  pagoId: number | string | null;
  subidaDisponible: boolean;
}) {
  if (pagoId == null) {
    return <span className="muted">—</span>;
  }
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
      const res = await fetch(`/api/deudas/${deudaId}/pagos/${pagoId}/comprobante`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al subir comprobante");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {subidaDisponible ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.pdf"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              handleFile(file);
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
          >
            {loading ? "Subiendo..." : "Subir comprobante"}
          </button>
          {error && <p className="error">{error}</p>}
        </>
      ) : (
        <span className="muted">—</span>
      )}
    </div>
  );
}
