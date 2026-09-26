"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Cuenta } from "@/lib/finanzas";
import Modal from "./Modal";
import Field from "./Field";

export default function EditarCuenta({ cuenta }: { cuenta: Cuenta }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [esCredito, setEsCredito] = useState(cuenta.es_credito);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const diaPago = form.get("dia_pago_credito");
    const limite = form.get("limite_credito");
    const res = await fetch(`/api/cuentas/${cuenta.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: form.get("nombre"),
        es_credito: esCredito,
        dia_pago_credito: esCredito && diaPago ? Number(diaPago) : null,
        limite_credito: esCredito && limite ? Number(limite) : null,
      }),
    }).catch(() => null);
    setLoading(false);
    if (!res?.ok) {
      const data = await res?.json().catch(() => ({}));
      setError(data?.error ?? "No se pudo guardar. Intenta de nuevo.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        Editar
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Editar ${cuenta.nombre}`}>
        <form onSubmit={onSubmit}>
          <Field label="Nombre">
            <input name="nombre" defaultValue={cuenta.nombre} required />
          </Field>
          <label className="check">
            <input type="checkbox" checked={esCredito} onChange={(e) => setEsCredito(e.target.checked)} />
            Es tarjeta de crédito
          </label>
          {esCredito && (
            <div className="field-row">
              <Field label="Cupo total (COP)">
                <input
                  name="limite_credito"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  defaultValue={cuenta.limite_credito ?? ""}
                  placeholder="2000000"
                />
              </Field>
              <Field label="Día de pago">
                <input
                  name="dia_pago_credito"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="31"
                  defaultValue={cuenta.dia_pago_credito ?? ""}
                  placeholder="1 a 31"
                />
              </Field>
            </div>
          )}
          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn btn-quiet" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button className="btn btn-primary" disabled={loading}>
              {loading ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
