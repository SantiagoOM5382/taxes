"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Field, { OPCIONES_MESES } from "./Field";
import PlanPagoCampos from "./PlanPagoCampos";

type Categoria = "deuda" | "responsabilidad";

export default function NuevaDeuda({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [categoria, setCategoria] = useState<Categoria>("deuda");
  const [frecuencia, setFrecuencia] = useState("mensual");
  const [monto, setMonto] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
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
        // Deudas: el plan siempre ancla día y mes. Responsabilidades: el mes solo aplica a anual/semestral.
        mes_pago:
          categoria === "deuda" || frecuencia === "anual" || frecuencia === "semestral"
            ? form.get("mes_pago") || null
            : null,
      }),
    }).catch(() => null);
    setLoading(false);
    if (!res?.ok) {
      const data = await res?.json().catch(() => ({}));
      setError(data?.error ?? "No se pudo guardar. Revisa los datos e intenta de nuevo.");
      return;
    }
    formEl.reset();
    setMonto("");
    setCategoria("deuda");
    setFrecuencia("mensual");
    router.refresh();
    onSuccess?.();
  }

  const esDeuda = categoria === "deuda";

  return (
    <form onSubmit={onSubmit}>
      <div className="field">
        <span className="field-label">¿Qué quieres registrar?</span>
        <div className="segmented" role="group" aria-label="Tipo de registro">
          <button type="button" aria-pressed={esDeuda} onClick={() => setCategoria("deuda")}>
            Deuda
          </button>
          <button type="button" aria-pressed={!esDeuda} onClick={() => setCategoria("responsabilidad")}>
            Responsabilidad
          </button>
        </div>
        <span className="hint">
          {esDeuda
            ? "Tiene un monto total y se termina de pagar."
            : "Pago que se repite siempre: arriendo, servicios, suscripciones."}
        </span>
      </div>

      <Field label="Descripción">
        <input name="descripcion" placeholder={esDeuda ? "Préstamo del carro" : "Arriendo apartamento"} required />
      </Field>
      <Field label="A quién se le paga">
        <input name="acreedor" placeholder={esDeuda ? "Banco, familiar, amigo…" : "Inmobiliaria, EPM…"} />
      </Field>

      <div className="field-row">
        <Field label="Frecuencia de pago">
          <select value={frecuencia} onChange={(e) => setFrecuencia(e.target.value)}>
            <option value="semanal">Semanal</option>
            <option value="quincenal">Quincenal</option>
            <option value="mensual">Mensual</option>
            <option value="semestral">Semestral</option>
            <option value="anual">Anual</option>
          </select>
        </Field>
        {esDeuda ? (
          <Field label="Monto total (COP)">
            <input
              name="monto_inicial"
              type="number"
              inputMode="decimal"
              min="1"
              step="any"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
            />
          </Field>
        ) : (
          <Field label="Valor por pago (COP)">
            <input name="valor_estimado" type="number" inputMode="decimal" min="1" step="any" placeholder="Opcional" />
          </Field>
        )}
      </div>

      {esDeuda ? (
        <>
          <PlanPagoCampos saldo={Number(monto) || 0} frecuencia={frecuencia} />
          <Field label="Interés anual %" hint="Opcional. Ayuda al asesor a decidir qué deuda pagar primero.">
            <input name="tasa_interes" type="number" inputMode="decimal" min="0" step="any" placeholder="Opcional" />
          </Field>
        </>
      ) : (
        <div className="field-row">
          <Field label="Día de pago">
            <input name="dia_pago" type="number" inputMode="numeric" min="1" max="31" placeholder="1 a 31" />
          </Field>
          {(frecuencia === "anual" || frecuencia === "semestral") && (
            <Field label={frecuencia === "anual" ? "Mes de pago" : "Primer mes de pago"}>
              <select name="mes_pago">{OPCIONES_MESES}</select>
            </Field>
          )}
        </div>
      )}

      {error && <p className="form-error">{error}</p>}
      <button className="btn btn-primary btn-block" disabled={loading}>
        {loading ? "Guardando…" : esDeuda ? "Registrar deuda" : "Registrar responsabilidad"}
      </button>
    </form>
  );
}
