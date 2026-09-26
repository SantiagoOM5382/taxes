"use client";

import { useState } from "react";
import Field from "./Field";
import { planPorCuota, planPorFecha, programacionDesdeFecha } from "@/lib/plan";
import { CADA, cop, fmtFecha, hoyISO } from "@/lib/format";

type Modo = "cuota" | "fecha" | "ninguno";


// Campos del plan de pagos de una deuda. Calcula en vivo la cuota o la fecha final
// y deja listos los campos ocultos que envía el formulario:
// valor_estimado (cuota), fecha_vencimiento (fin), dia_pago y mes_pago (anclaje).
export default function PlanPagoCampos({
  saldo,
  frecuencia,
  inicial,
}: {
  saldo: number;
  frecuencia: string;
  inicial?: { primerPago?: string | null; cuota?: number | null; fin?: string | null };
}) {
  const [modo, setModo] = useState<Modo>(
    inicial?.cuota ? "cuota" : inicial?.fin ? "fecha" : inicial ? "ninguno" : "cuota"
  );
  const [primerPago, setPrimerPago] = useState(inicial?.primerPago ?? hoyISO());
  const [cuota, setCuota] = useState(inicial?.cuota ? String(inicial.cuota) : "");
  const [fin, setFin] = useState(inicial?.fin ?? "");

  const prog = programacionDesdeFecha(frecuencia, primerPago || hoyISO());
  const valido = saldo > 0 && Boolean(primerPago);
  const plan =
    !valido || modo === "ninguno"
      ? null
      : modo === "cuota"
        ? Number(cuota) > 0
          ? planPorCuota(saldo, Number(cuota), prog, primerPago)
          : null
        : fin
          ? planPorFecha(saldo, fin, prog, primerPago)
          : null;

  const ultima = plan?.cuotas.at(-1);
  const cada = CADA[frecuencia] ?? "por periodo";

  return (
    <div className="plan-campos">
      <div className="field">
        <span className="field-label">Plan de pagos</span>
        <div className="segmented" role="group" aria-label="Cómo calcular el plan">
          <button type="button" aria-pressed={modo === "cuota"} onClick={() => setModo("cuota")}>
            Cuota fija
          </button>
          <button type="button" aria-pressed={modo === "fecha"} onClick={() => setModo("fecha")}>
            Fecha final
          </button>
          <button type="button" aria-pressed={modo === "ninguno"} onClick={() => setModo("ninguno")}>
            Sin plan
          </button>
        </div>
        <span className="hint">
          {modo === "cuota"
            ? "Dinos cuánto pagas y calculamos cuándo terminas."
            : modo === "fecha"
              ? "Dinos cuándo quieres terminar y calculamos la cuota."
              : "Sin cuota ni fecha final. Puedes definirlas después."}
        </span>
      </div>

      {modo !== "ninguno" && (
        <div className="field-row">
          <Field label="Próximo pago">
            <input type="date" value={primerPago} onChange={(e) => setPrimerPago(e.target.value)} required />
          </Field>
          {modo === "cuota" ? (
            <Field label={`Pagas ${cada} (COP)`}>
              <input
                type="number"
                inputMode="decimal"
                min="1"
                step="any"
                value={cuota}
                onChange={(e) => setCuota(e.target.value)}
                required
              />
            </Field>
          ) : (
            <Field label="Terminas de pagar el">
              <input type="date" value={fin} min={primerPago} onChange={(e) => setFin(e.target.value)} required />
            </Field>
          )}
        </div>
      )}

      {modo !== "ninguno" && (
        <div className="plan-preview" aria-live="polite">
          {!valido ? (
            <span className="hint">Escribe el monto total para calcular el plan.</span>
          ) : !plan ? (
            <span className="hint">{modo === "cuota" ? "Escribe cuánto pagas." : "Elige la fecha final."}</span>
          ) : plan.cuotas.length === 0 ? (
            <span className="form-error">No hay fechas de pago entre el próximo pago y la fecha final.</span>
          ) : modo === "cuota" ? (
            <>
              Terminas el <strong>{fmtFecha(plan.fin)}</strong> con {plan.cuotas.length}{" "}
              {plan.cuotas.length === 1 ? "pago" : "pagos"}.
              {ultima && ultima.monto < plan.cuota && <> La última cuota es de {cop.format(ultima.monto)}.</>}
            </>
          ) : (
            <>
              Pagas <strong>{cop.format(plan.cuota)}</strong> {cada}: {plan.cuotas.length}{" "}
              {plan.cuotas.length === 1 ? "pago" : "pagos"}, el último el {fmtFecha(plan.fin)}.
            </>
          )}
        </div>
      )}

      {/* Lo que se guarda */}
      <input type="hidden" name="valor_estimado" value={modo === "ninguno" ? "" : plan?.cuota ?? ""} />
      <input type="hidden" name="fecha_vencimiento" value={modo === "ninguno" ? "" : plan?.fin ?? ""} />
      <input type="hidden" name="dia_pago" value={modo === "ninguno" ? "" : prog.dia_pago ?? ""} />
      <input type="hidden" name="mes_pago" value={modo === "ninguno" ? "" : prog.mes_pago ?? ""} />
    </div>
  );
}
