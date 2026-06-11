"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Cuenta } from "@/lib/finanzas";

export default function NuevoIngreso({
  cuentas,
  onSuccess,
}: {
  cuentas: Cuenta[];
  onSuccess?: () => void;
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
    const res = await fetch("/api/ingresos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        descripcion: form.get("descripcion"),
        monto: form.get("monto"),
        frecuencia: form.get("frecuencia"),
        tipo: form.get("tipo"),
        cuenta_id: form.get("cuenta_id") || null,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al registrar el ingreso");
      return;
    }
    formEl.reset();
    router.refresh();
    onSuccess?.();
  }

  return (
    <form onSubmit={onSubmit}>
        <label>Descripción</label>
        <input name="descripcion" placeholder="Sueldo empresa X" required />
        <label>Tipo</label>
        <select name="tipo" defaultValue="base">
          <option value="base">Sueldo base</option>
          <option value="extra">Ingreso extra</option>
        </select>
        <label>Frecuencia de pago</label>
        <select name="frecuencia" defaultValue="quincenal">
          <option value="semanal">Semanal</option>
          <option value="quincenal">Quincenal</option>
          <option value="mensual">Mensual</option>
          <option value="unico">Único</option>
        </select>
        <label>Monto por pago (COP)</label>
        <input name="monto" type="number" min="1" step="any" required />
        <label>¿En qué cuenta te cae? (opcional)</label>
        <select name="cuenta_id" defaultValue="">
          <option value="">—</option>
          {cuentas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      {error && <p className="error">{error}</p>}
      <button disabled={loading}>{loading ? "Guardando..." : "Registrar ingreso"}</button>
    </form>
  );
}
