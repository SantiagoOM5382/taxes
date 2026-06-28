"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al crear la cuenta");
      return;
    }
    formEl.reset();
    setEsCredito(false);
    router.refresh();
    onSuccess?.();
  }

  return (
    <form onSubmit={onSubmit}>
      <label>Nombre</label>
      <input name="nombre" placeholder="Nequi, Bancolombia, Binance, Efectivo..." required />
      <label>Tipo</label>
      <select name="tipo" defaultValue="billetera">
        <option value="banco">Banco</option>
        <option value="billetera">Billetera (Nequi, Daviplata...)</option>
        <option value="exchange">Exchange (Binance...)</option>
        <option value="efectivo">Efectivo (bolsillo)</option>
      </select>
      <label>Moneda</label>
      <select name="moneda" defaultValue="COP">
        <option value="COP">COP — Peso colombiano</option>
        <option value="USD">USD — Dólar</option>
        <option value="EUR">EUR — Euro</option>
      </select>
      <label>Saldo actual</label>
      <input name="saldo" type="number" step="any" defaultValue={0} />

      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={esCredito}
          onChange={(e) => setEsCredito(e.target.checked)}
        />
        Es tarjeta de crédito
      </label>

      {esCredito && (
        <>
          <label>Cupo total (COP)</label>
          <input
            name="limite_credito"
            type="number"
            min="0"
            step="any"
            placeholder="ej. 200000"
          />
          <label>Día de pago (1–31)</label>
          <input
            name="dia_pago_credito"
            type="number"
            min="1"
            max="31"
            placeholder="ej. 10"
            required={esCredito}
          />
        </>
      )}

      {error && <p className="error">{error}</p>}
      <button disabled={loading}>{loading ? "Guardando..." : "Agregar cuenta"}</button>
    </form>
  );
}
