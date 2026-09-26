"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import Field from "./Field";

interface Uso {
  plan: string;
  limite: number;
  restantes: number;
  consultas_usadas: number;
}

type Metodo = "avalancha" | "bola_nieve";

export default function AsesorIA({ usoInicial }: { usoInicial: Uso }) {
  const [uso, setUso] = useState<Uso>(usoInicial);
  const [metodo, setMetodo] = useState<Metodo>("avalancha");
  const [pregunta, setPregunta] = useState("");
  const [consejo, setConsejo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function consultar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setConsejo("");
    setLoading(true);
    const res = await fetch("/api/asesor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metodo, pregunta: pregunta.trim() || undefined }),
    }).catch(() => null);
    setLoading(false);
    const data = await res?.json().catch(() => ({}));
    if (data?.uso) setUso(data.uso);
    if (!res?.ok) {
      setError(data?.error ?? "No se pudo generar el consejo. Intenta de nuevo.");
      return;
    }
    setConsejo(data.consejo);
  }

  const sinCupo = uso.restantes <= 0;
  const pctUsado = uso.limite > 0 ? Math.round(((uso.limite - uso.restantes) / uso.limite) * 100) : 100;

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Pide un consejo</h2>
        <div className="quota">
          <div className={`meter ${sinCupo ? "is-danger" : ""}`} aria-hidden>
            <span style={{ width: `${pctUsado}%` }} />
          </div>
          Te quedan {uso.restantes} de {uso.limite} consultas este mes
        </div>
      </div>

      <form onSubmit={consultar} style={{ maxWidth: 620 }}>
        <div className="field">
          <span className="field-label">¿Qué deuda pagar primero?</span>
          <div className="segmented" role="group" aria-label="Estrategia">
            <button type="button" aria-pressed={metodo === "avalancha"} onClick={() => setMetodo("avalancha")}>
              Avalancha
            </button>
            <button type="button" aria-pressed={metodo === "bola_nieve"} onClick={() => setMetodo("bola_nieve")}>
              Bola de nieve
            </button>
          </div>
          <span className="hint">
            {metodo === "avalancha"
              ? "La de mayor interés primero. Pagas menos intereses en total."
              : "La de menor saldo primero. Cierras deudas más rápido."}
          </span>
        </div>

        <Field label="Pregunta específica" hint="Opcional.">
          <textarea
            value={pregunta}
            onChange={(e) => setPregunta(e.target.value)}
            placeholder="¿Me alcanza para ahorrar algo este mes?"
            maxLength={500}
            rows={3}
          />
        </Field>

        {error && <p className="form-error">{error}</p>}
        {sinCupo && (
          <p className="form-error">
            Usaste las {uso.limite} consultas de tu plan {uso.plan}. Se renuevan el próximo mes.
          </p>
        )}

        <div>
          <button className="btn btn-primary" disabled={loading || sinCupo}>
            <Sparkles size={16} aria-hidden />
            {loading ? "Analizando tus finanzas…" : "Pedir consejo"}
          </button>
        </div>
      </form>

      {loading && <div className="skeleton" style={{ height: 120, marginTop: 18, maxWidth: 620 }} />}
      {consejo && <div className="advice" aria-live="polite">{consejo}</div>}
    </section>
  );
}
