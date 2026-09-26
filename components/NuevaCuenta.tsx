"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Field from "./Field";

export default function NuevaCuenta({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [esCredito, setEsCredito] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const res = await fetch("/api/cuentas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: form.get("nombre"),
        tipo: form.get("tipo"),
        moneda: form.get("moneda"),
        saldo: form.get("saldo") || 0,
        es_credito: esCredito,
        dia_pago_credito: esCredito ? form.get("dia_pago_credito") : null,
        limite_credito: esCredito && form.get("limite_credito") ? Number(form.get("limite_credito")) : null,
      }),
    }).catch(() => null);
    setLoading(false);
    if (!res?.ok) {
      const data = await res?.json().catch(() => ({}));
      setError(data?.error ?? "No se pudo crear la cuenta. Intenta de nuevo.");
      return;
    }
    formEl.reset();
    setEsCredito(false);
    router.refresh();
    onSuccess?.();
  }

  return (
    <form onSubmit={onSubmit}>
      <Field label="Nombre">
        <input name="nombre" placeholder="Nequi, Bancolombia, Binance…" required />
      </Field>
      <div className="field-row">
        <Field label="Tipo">
          <select name="tipo" defaultValue="billetera">
            <option value="banco">Banco</option>
            <option value="billetera">Billetera</option>
            <option value="exchange">Exchange</option>
            <option value="efectivo">Efectivo</option>
          </select>
        </Field>
        <Field label="Moneda">
          <select name="moneda" defaultValue="COP">
            <option value="COP">COP, peso</option>
            <option value="USD">USD, dólar</option>
            <option value="EUR">EUR, euro</option>
          </select>
        </Field>
      </div>
      <Field label={esCredito ? "Disponible actual" : "Saldo actual"}>
        <input name="saldo" type="number" inputMode="decimal" step="any" defaultValue={0} />
      </Field>

      <label className="check">
        <input type="checkbox" checked={esCredito} onChange={(e) => setEsCredito(e.target.checked)} />
        Es tarjeta de crédito
      </label>

      {esCredito && (
        <div className="field-row">
          <Field label="Cupo total (COP)">
            <input name="limite_credito" type="number" inputMode="decimal" min="0" step="any" placeholder="2000000" />
          </Field>
          <Field label="Día de pago">
            <input
              name="dia_pago_credito"
              type="number"
              inputMode="numeric"
              min="1"
              max="31"
              placeholder="1 a 31"
              required
            />
          </Field>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}
      <button className="btn btn-primary btn-block" disabled={loading}>
        {loading ? "Guardando…" : "Agregar cuenta"}
      </button>
    </form>
  );
}
