"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Cuenta, IngresoItem } from "@/lib/finanzas";
import Field from "./Field";

// Crea un ingreso, o lo edita si recibe `ingreso`
export default function NuevoIngreso({
  cuentas,
  onSuccess,
  ingreso,
}: {
  cuentas: Cuenta[];
  onSuccess?: () => void;
  ingreso?: IngresoItem;
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
    const res = await fetch(ingreso ? `/api/ingresos/${ingreso.id}` : "/api/ingresos", {
      method: ingreso ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        descripcion: form.get("descripcion"),
        monto: form.get("monto"),
        frecuencia: form.get("frecuencia"),
        tipo: form.get("tipo"),
        cuenta_id: form.get("cuenta_id") || null,
      }),
    }).catch(() => null);
    setLoading(false);
    if (!res?.ok) {
      const data = await res?.json().catch(() => ({}));
      setError(data?.error ?? "No se pudo registrar el ingreso. Intenta de nuevo.");
      return;
    }
    if (!ingreso) formEl.reset();
    router.refresh();
    onSuccess?.();
  }

  return (
    <form onSubmit={onSubmit}>
      <Field label="Descripción">
        <input name="descripcion" placeholder="Sueldo, freelance, arriendo que cobras…" defaultValue={ingreso?.descripcion} required />
      </Field>
      <div className="field-row">
        <Field label="Tipo">
          <select name="tipo" defaultValue={ingreso?.tipo ?? "base"}>
            <option value="base">Sueldo base</option>
            <option value="extra">Ingreso extra</option>
          </select>
        </Field>
        <Field label="Frecuencia">
          <select name="frecuencia" defaultValue={ingreso?.frecuencia ?? "quincenal"}>
            <option value="semanal">Semanal</option>
            <option value="quincenal">Quincenal</option>
            <option value="mensual">Mensual</option>
            <option value="unico">Único</option>
          </select>
        </Field>
      </div>
      <Field label="Monto por pago (COP)">
        <input name="monto" type="number" inputMode="decimal" min="1" step="any" defaultValue={ingreso?.monto} required />
      </Field>
      <Field label="Cae en la cuenta" hint="Opcional. Te permite registrar con un toque que ya te llegó.">
        <select name="cuenta_id" defaultValue={ingreso?.cuenta_id ?? ""}>
          <option value="">Sin cuenta asociada</option>
          {cuentas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </Field>
      {error && <p className="form-error">{error}</p>}
      <button className="btn btn-primary btn-block" disabled={loading}>
        {loading ? "Guardando…" : ingreso ? "Guardar cambios" : "Registrar ingreso"}
      </button>
    </form>
  );
}
