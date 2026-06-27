"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NuevaDeuda({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [categoria, setCategoria] = useState<"deuda" | "responsabilidad">("deuda");
  const [frecuencia, setFrecuencia] = useState("mensual");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/deudas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        descripcion: form.get("descripcion"),
        acreedor: form.get("acreedor"),
        categoria,
        frecuencia_pago: frecuencia,
        monto_inicial: form.get("monto_inicial"),
        valor_estimado: form.get("valor_estimado"),
        tasa_interes: form.get("tasa_interes"),
        fecha_vencimiento: form.get("fecha_vencimiento"),
        dia_pago: form.get("dia_pago") || null,
        mes_pago: frecuencia === "anual" ? form.get("mes_pago") || null : null,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al crear el registro");
      return;
    }
    (e.target as HTMLFormElement).reset?.();
    setCategoria("deuda");
    setFrecuencia("mensual");
    router.refresh();
    onSuccess?.();
  }

  return (
    <form onSubmit={onSubmit}>
      <label>Categoría</label>
      <select
        value={categoria}
        onChange={(e) => setCategoria(e.target.value as "deuda" | "responsabilidad")}
      >
        <option value="deuda">Deuda (tiene monto total y se termina de pagar)</option>
        <option value="responsabilidad">Responsabilidad (pago permanente: arriendo, servicios...)</option>
      </select>

      <label>Descripción</label>
      <input
        name="descripcion"
        placeholder={categoria === "deuda" ? "Préstamo carro" : "Arriendo apartamento"}
        required
      />
      <label>Acreedor / a quién se paga</label>
      <input name="acreedor" placeholder="Santiago" />

      <label>Frecuencia de pago</label>
      <select value={frecuencia} onChange={(e) => setFrecuencia(e.target.value)}>
        <option value="semanal">Semanal</option>
        <option value="quincenal">Quincenal</option>
        <option value="mensual">Mensual</option>
        <option value="semestral">Semestral (cada 6 meses — ej. universidad)</option>
        <option value="anual">Anual (ej. SOAT, impuestos)</option>
      </select>

      {categoria === "deuda" ? (
        <>
          <label>Monto inicial (COP)</label>
          <input name="monto_inicial" type="number" min="1" step="any" required />
          <label>Tasa de interés anual % (opcional)</label>
          <input name="tasa_interes" type="number" min="0" step="any" placeholder="ej. 28.5" />
          <label>Fecha de vencimiento (opcional)</label>
          <input name="fecha_vencimiento" type="date" />
        </>
      ) : (
        <>
          <label>Valor estimado por pago (COP, opcional)</label>
          <input name="valor_estimado" type="number" min="1" step="any" />
        </>
      )}

      {categoria === "responsabilidad" && (
        <>
          <label>Día de pago (1–31)</label>
          <input name="dia_pago" type="number" min="1" max="31" placeholder="ej. 15" />
          {frecuencia === "anual" && (
            <>
              <label>Mes de vencimiento</label>
              <select name="mes_pago">
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
        </>
      )}

      {error && <p className="error">{error}</p>}
      <button disabled={loading}>{loading ? "Guardando..." : "Crear"}</button>
    </form>
  );
}
