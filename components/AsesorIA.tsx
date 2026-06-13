"use client";

import { useState } from "react";

interface Uso {
  plan: string;
  limite: number;
  restantes: number;
  consultas_usadas: number;
}

export default function AsesorIA({ usoInicial }: { usoInicial: Uso }) {
  const [uso, setUso] = useState<Uso>(usoInicial);
  const [metodo, setMetodo] = useState<"avalancha" | "bola_nieve">("avalancha");
  const [pregunta, setPregunta] = useState("");
  const [consejo, setConsejo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function consultar() {
    setError("");
    setConsejo("");
    setLoading(true);
    const res = await fetch("/api/asesor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metodo, pregunta: pregunta.trim() || undefined }),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "No se pudo generar el consejo");
      if (data.uso) setUso(data.uso);
      return;
    }
    setConsejo(data.consejo);
    if (data.uso) setUso(data.uso);
  }

  const sinCupo = uso.restantes <= 0;

  return (
    <div className="card">
      <div className="panel-header">
        <h2>🤖 Asesor financiero IA</h2>
        <span className="badge propia">
          {uso.restantes} de {uso.limite} consultas este mes
        </span>
      </div>

      <label>Estrategia de pago a priorizar</label>
      <select
        value={metodo}
        onChange={(e) => setMetodo(e.target.value as "avalancha" | "bola_nieve")}
      >
        <option value="avalancha">Avalancha (pagar primero la de mayor interés)</option>
        <option value="bola_nieve">Bola de nieve (pagar primero la de menor saldo)</option>
      </select>

      <label>Pregunta específica (opcional)</label>
      <input
        value={pregunta}
        onChange={(e) => setPregunta(e.target.value)}
        placeholder="Ej. ¿Puedo ahorrar algo este mes?"
        maxLength={500}
      />

      <button onClick={consultar} disabled={loading || sinCupo} style={{ marginTop: 12 }}>
        {loading ? "Analizando tus finanzas..." : "Pedir consejo"}
      </button>

      {sinCupo && (
        <p className="muted" style={{ marginTop: 10 }}>
          Llegaste al límite de tu plan {uso.plan}. El próximo mes se renueva tu cupo.
        </p>
      )}
      {error && <p className="error" style={{ marginTop: 10 }}>{error}</p>}

      {consejo && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            background: "#f4f7ff",
            border: "1px solid #dbe4ff",
            borderRadius: 10,
            whiteSpace: "pre-wrap",
            lineHeight: 1.6,
          }}
        >
          {consejo}
        </div>
      )}
    </div>
  );
}
