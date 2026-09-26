"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import Modal from "./Modal";
import Field from "./Field";
import { cop, hoyISO } from "@/lib/format";

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
  montoSugerido,
  pendiente,
}: {
  deudaId: number;
  subidaDisponible: boolean;
  cuentas: CuentaOption[];
  montoSugerido?: number | null;
  pendiente?: number | null; // saldo por pagar (solo deudas)
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);

    try {
      // Primero el pago; el archivo se adjunta después para no dejar comprobantes huérfanos
      const res = await fetch(`/api/deudas/${deudaId}/pagos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monto: form.get("monto"),
          fecha_pago: form.get("fecha_pago"),
          comprobante_url: String(form.get("comprobante_url") ?? "") || null,
          cuenta_id: form.get("cuenta_id") || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo registrar el pago");

      const archivo = form.get("comprobante_archivo") as File | null;
      if (archivo && archivo.size > 0) {
        const subida = new FormData();
        subida.append("archivo", archivo);
        const up = await fetch(`/api/deudas/${deudaId}/pagos/${data.id}/comprobante`, { method: "POST", body: subida });
        if (!up.ok) {
          const upData = await up.json().catch(() => ({}));
          formEl.reset();
          router.refresh();
          throw new Error(
            `El pago quedó registrado, pero el comprobante no se subió (${upData.error ?? "error"}). Adjúntalo desde la lista de pagos.`
          );
        }
      }
      formEl.reset();
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo falló. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        <Plus size={17} aria-hidden />
        Registrar pago
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Registrar pago">
        <form onSubmit={onSubmit}>
          <div className="field-row">
            <Field label="Monto (COP)">
              <input
                name="monto"
                type="number"
                inputMode="decimal"
                min="1"
                max={pendiente ?? undefined}
                step="any"
                defaultValue={montoSugerido ?? undefined}
                required
              />
            </Field>
            <Field label="Fecha">
              <input name="fecha_pago" type="date" defaultValue={hoyISO()} required />
            </Field>
          </div>
          {pendiente != null && (
            <p className="hint" style={{ marginTop: -6 }}>
              Faltan {cop.format(pendiente)} por pagar.
            </p>
          )}
          <Field label="Sale de la cuenta" hint="Solo cuentas en pesos. Si eliges una, se descuenta de su saldo.">
            <select name="cuenta_id" defaultValue="">
              <option value="">No descontar de ninguna cuenta</option>
              {cuentas.filter((c) => c.moneda === "COP").map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({cop.format(c.saldo)})
                </option>
              ))}
            </select>
          </Field>
          {subidaDisponible ? (
            <Field label="Comprobante" hint="Imagen o PDF. Opcional.">
              <input name="comprobante_archivo" type="file" accept="image/*,.pdf" />
            </Field>
          ) : (
            <Field label="Enlace al comprobante" hint="Opcional.">
              <input name="comprobante_url" type="url" placeholder="https://…" />
            </Field>
          )}
          {error && <p className="form-error">{error}</p>}
          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Guardando…" : "Registrar pago"}
          </button>
        </form>
      </Modal>
    </>
  );
}
