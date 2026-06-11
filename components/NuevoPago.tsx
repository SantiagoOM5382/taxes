"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CuentaOption {
  id: number;
  nombre: string;
  moneda: string;
  saldo: number;
}

export default function NuevoPago({
  deudaId,
  subidaDisponible,
  cuentas,
}: {
  deudaId: number;
  subidaDisponible: boolean;
  cuentas: CuentaOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);

    try {
      let comprobanteUrl = String(form.get("comprobante_url") ?? "");
      const archivo = form.get("comprobante_archivo") as File | null;
      if (archivo && archivo.size > 0) {
        const subida = new FormData();
        subida.append("archivo", archivo);
        const upRes = await fetch(`/api/deudas/${deudaId}/comprobante`, {
          method: "POST",
          body: subida,
        });
        const upData = await upRes.json().catch(() => ({}));
        if (!upRes.ok) {
          throw new Error(upData.error ?? "Error al subir el comprobante");
        }
        comprobanteUrl = upData.url;
      }

      const res = await fetch(`/api/deudas/${deudaId}/pagos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monto: form.get("monto"),
          fecha_pago: form.get("fecha_pago"),
          comprobante_url: comprobanteUrl || null,
          cuenta_id: form.get("cuenta_id") || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al registrar el pago");
      }
      formEl.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>Registrar pago</h2>
      <form onSubmit={onSubmit}>
        <label>Monto (COP)</label>
        <input name="monto" type="number" min="1" step="any" required />
        <label>Fecha del pago</label>
        <input name="fecha_pago" type="date" required />
        <label>¿De qué cuenta sale el dinero?</label>
        <select name="cuenta_id" defaultValue="">
          <option value="">— Sin descontar de ninguna cuenta —</option>
          {cuentas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} ({c.moneda} {c.saldo.toLocaleString("es-CO")})
            </option>
          ))}
        </select>
        {subidaDisponible ? (
          <>
            <label>Comprobante (imagen o PDF — se guarda en Firebase Storage)</label>
            <input name="comprobante_archivo" type="file" accept="image/*,.pdf" />
          </>
        ) : (
          <>
            <label>URL del comprobante (opcional)</label>
            <input
              name="comprobante_url"
              type="url"
              placeholder="https://..."
            />
            <p className="muted">
              Activa Firebase Storage y configura las variables FIREBASE_* para subir archivos directamente.
            </p>
          </>
        )}
        {error && <p className="error">{error}</p>}
        <button disabled={loading}>{loading ? "Guardando..." : "Registrar pago"}</button>
      </form>
    </div>
  );
}
