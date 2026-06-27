"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  deudaId: number;
  frecuenciaActual: string;
  diaPagoActual: number | null;
  mesPagoActual: number | null;
  valorEstimadoActual: number | null;
}

export default function EditarResponsabilidad({
  deudaId,
  frecuenciaActual,
  diaPagoActual,
  mesPagoActual,
  valorEstimadoActual,
}: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [frecuencia, setFrecuencia] = useState(frecuenciaActual);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const diaPago = form.get("dia_pago");
    const mesPago = form.get("mes_pago");
    const valorEstimado = form.get("valor_estimado");

    const res = await fetch(`/api/deudas/${deudaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        frecuencia_pago: frecuencia,
        dia_pago: diaPago ? Number(diaPago) : null,
        mes_pago: frecuencia === "anual" && mesPago ? Number(mesPago) : null,
        valor_estimado: valorEstimado ? Number(valorEstimado) : null,
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
        Configurar día de pago
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card">
      <h3>Configurar día de pago</h3>

      <label>Frecuencia de pago</label>
      <select value={frecuencia} onChange={(e) => setFrecuencia(e.target.value)}>
        <option value="semanal">Semanal</option>
        <option value="quincenal">Quincenal</option>
        <option value="mensual">Mensual</option>
        <option value="semestral">Semestral (cada 6 meses)</option>
        <option value="anual">Anual</option>
      </select>

      <label>Valor estimado por pago (COP, opcional)</label>
      <input
        name="valor_estimado"
        type="number"
        min="0"
        step="any"
        defaultValue={valorEstimadoActual ?? ""}
      />

      <label>Día de pago (1–31)</label>
      <input
        name="dia_pago"
        type="number"
        min="1"
        max="31"
        defaultValue={diaPagoActual ?? ""}
        placeholder="ej. 15"
      />

      {frecuencia === "anual" && (
        <>
          <label>Mes de vencimiento</label>
          <select name="mes_pago" defaultValue={mesPagoActual ?? 1}>
            <option value="1">Enero</option>
            <option value="2">Febrero</option>
            <option value="3">Marzo</option>
            <option value="4">Abril</option>
            <option value="5">Mayo</option>
            <option value="6">Junio</option>
            <option value="7">Julio</option>
            <option value="8">Agosto</option>
            <option value="9">Septiembre</option>
            <option value="10">Octubre</option>
            <option value="11">Noviembre</option>
            <option value="12">Diciembre</option>
          </select>
        </>
      )}

      {error && <p className="error">{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button disabled={loading}>{loading ? "Guardando..." : "Guardar"}</button>
        <button type="button" onClick={() => setAbierto(false)}>Cancelar</button>
      </div>
    </form>
  );
}
