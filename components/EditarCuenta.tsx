"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  cuentaId: number;
  esCreditoActual: boolean;
  diaPagoActual: number | null;
  limiteCreditoActual: number | null;
}

export default function EditarCuenta({ cuentaId, esCreditoActual, diaPagoActual, limiteCreditoActual }: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [esCredito, setEsCredito] = useState(esCreditoActual);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const diaPago = form.get("dia_pago_credito");
    const limite = form.get("limite_credito");
    const res = await fetch(`/api/cuentas/${cuentaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        es_credito: esCredito,
        dia_pago_credito: esCredito && diaPago ? Number(diaPago) : null,
        limite_credito: esCredito && limite ? Number(limite) : null,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al guardar");
      return;
    }
    setAbierto(false);
    router.refresh();
  }

  if (!abierto) {
    return (
      <button className="btn-secundario" onClick={() => setAbierto(true)}>
        Editar
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="editar-cuenta-form">
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
            defaultValue={limiteCreditoActual ?? ""}
            placeholder="ej. 200000"
          />
          <label>Día de pago (1–31)</label>
          <input
            name="dia_pago_credito"
            type="number"
            min="1"
            max="31"
            defaultValue={diaPagoActual ?? ""}
            placeholder="ej. 10"
            style={{ width: 80 }}
          />
        </>
      )}
      {error && <p className="error">{error}</p>}
      <div style={{ display: "flex", gap: 6 }}>
        <button disabled={loading} style={{ fontSize: 13, padding: "5px 12px" }}>
          {loading ? "Guardando..." : "Guardar"}
        </button>
        <button type="button" className="btn-secundario" onClick={() => setAbierto(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
