"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NuevaDeuda({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [categoria, setCategoria] = useState<"deuda" | "responsabilidad">("deuda");

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
        frecuencia_pago: form.get("frecuencia_pago") || null,
        monto_inicial: form.get("monto_inicial"),
        valor_estimado: form.get("valor_estimado"),
        tasa_interes: form.get("tasa_interes"),
        fecha_vencimiento: form.get("fecha_vencimiento"),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al crear el registro");
      return;
    }
    (e.target as HTMLFormElement).reset?.();
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
        <select name="frecuencia_pago" defaultValue="mensual">
          <option value="semanal">Semanal</option>
          <option value="quincenal">Quincenal</option>
          <option value="mensual">Mensual</option>
          <option value="semestral">Semestral (cada 6 meses — ej. universidad)</option>
        </select>

        {categoria === "deuda" ? (
          <>
            <label>Monto inicial (COP)</label>
            <input name="monto_inicial" type="number" min="1" step="any" required />
            <label>Tasa de interés anual % (opcional — ayuda al asesor a priorizar)</label>
            <input name="tasa_interes" type="number" min="0" step="any" placeholder="ej. 28.5" />
            <label>Fecha de vencimiento (opcional)</label>
            <input name="fecha_vencimiento" type="date" />
          </>
        ) : (
          <>
            <label>Valor estimado por pago (COP, opcional — puede variar)</label>
            <input name="valor_estimado" type="number" min="1" step="any" />
          </>
        )}

      {error && <p className="error">{error}</p>}
      <button disabled={loading}>{loading ? "Guardando..." : "Crear"}</button>
    </form>
  );
}
