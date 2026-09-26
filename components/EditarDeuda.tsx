"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import type { Deuda } from "@/lib/deudas";
import Modal from "./Modal";
import Field, { OPCIONES_MESES } from "./Field";

// Editor completo de una deuda o responsabilidad (datos, montos y programación del pago)
export default function EditarDeuda({ deuda }: { deuda: Deuda }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [frecuencia, setFrecuencia] = useState(deuda.frecuencia_pago ?? "mensual");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const esDeuda = deuda.categoria === "deuda";
  const conMes = frecuencia === "anual" || frecuencia === "semestral";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const f = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      descripcion: f.get("descripcion"),
      acreedor: f.get("acreedor"),
      frecuencia_pago: frecuencia,
      dia_pago: f.get("dia_pago"),
      mes_pago: conMes ? f.get("mes_pago") : null,
      valor_estimado: f.get("valor_estimado"),
    };
    if (esDeuda) {
      body.monto_inicial = f.get("monto_inicial");
      body.tasa_interes = f.get("tasa_interes");
      body.fecha_vencimiento = f.get("fecha_vencimiento");
    }
    const res = await fetch(`/api/deudas/${deuda.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
      <button className="btn btn-ghost" onClick={() => setOpen(true)}>
        <Pencil size={15} aria-hidden />
        Editar
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={esDeuda ? "Editar deuda" : "Editar responsabilidad"}>
        <form onSubmit={onSubmit}>
          <Field label="Descripción">
            <input name="descripcion" defaultValue={deuda.descripcion} required />
          </Field>
          <Field label="A quién se le paga">
            <input name="acreedor" defaultValue={deuda.acreedor ?? ""} />
          </Field>

          {esDeuda && (
            <>
              <Field label="Monto total (COP)" hint={deuda.total_pagado > 0 ? "No puede ser menor a lo que ya pagaste." : undefined}>
                <input
                  name="monto_inicial"
                  type="number"
                  inputMode="decimal"
                  min={Math.max(1, deuda.total_pagado)}
                  step="any"
                  defaultValue={deuda.monto_inicial}
                  required
                />
              </Field>
              <div className="field-row">
                <Field label="Interés anual %">
                  <input name="tasa_interes" type="number" inputMode="decimal" min="0" step="any" defaultValue={deuda.tasa_interes ?? ""} />
                </Field>
                <Field label="Vence el">
                  <input name="fecha_vencimiento" type="date" defaultValue={deuda.fecha_vencimiento ?? ""} />
                </Field>
              </div>
            </>
          )}

          <div className="field-row">
            <Field label="Frecuencia">
              <select value={frecuencia} onChange={(e) => setFrecuencia(e.target.value)}>
                <option value="semanal">Semanal</option>
                <option value="quincenal">Quincenal</option>
                <option value="mensual">Mensual</option>
                <option value="semestral">Semestral</option>
                <option value="anual">Anual</option>
              </select>
            </Field>
            <Field label={esDeuda ? "Cuota (COP)" : "Valor por pago (COP)"}>
              <input
                name="valor_estimado"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                defaultValue={deuda.valor_estimado ?? ""}
                placeholder="Opcional"
              />
            </Field>
          </div>
          <div className="field-row">
            <Field label="Día de pago" hint="Para verlo en el calendario.">
              <input
                name="dia_pago"
                type="number"
                inputMode="numeric"
                min="1"
                max="31"
                defaultValue={deuda.dia_pago ?? ""}
                placeholder="1 a 31"
              />
            </Field>
            {conMes && (
              <Field label={frecuencia === "anual" ? "Mes de pago" : "Primer mes de pago"}>
                <select name="mes_pago" defaultValue={deuda.mes_pago ?? 1}>
                  {OPCIONES_MESES}
                </select>
              </Field>
            )}
          </div>

          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn btn-quiet" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button className="btn btn-primary" disabled={loading}>
              {loading ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
