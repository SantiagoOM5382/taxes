"use client";

import Link from "next/link";
import { Deuda } from "@/lib/deudas";

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export default function ResponsabilidadesGrid({ responsabilidades }: { responsabilidades: Deuda[] }) {
  const responsabilidadesOrdenadas = responsabilidades.sort(
    (a, b) => (a.pagada_mes_actual ? 1 : 0) - (b.pagada_mes_actual ? 1 : 0)
  );

  const toggleCumplidaPeriodo = async (deudaId: number, cumplida: boolean) => {
    try {
      await fetch(`/api/deudas/${deudaId}/cumplida-periodo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cumplida }),
      });
      window.location.reload();
    } catch (err) {
      console.error("Error toggling cumplida:", err);
    }
  };

  return (
    <div className="items-grid">
      {responsabilidadesOrdenadas.map((d) => (
        <div key={d.id} className="item-card" style={{ position: "relative" }}>
          <Link href={`/deudas/${d.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div className="item-card-header">
              <div>
                <div className="item-name">{d.descripcion}</div>
                {d.acreedor && <div className="item-sub">{d.acreedor}</div>}
              </div>
              <div>
                <div className="item-amount" style={{ color: "#0f172a" }}>
                  {d.valor_estimado != null ? cop.format(d.valor_estimado) : "variable"}
                </div>
                <div className="item-progress-label" style={{ textAlign: "right" }}>
                  pagado: {cop.format(d.total_pagado)}
                </div>
              </div>
            </div>
            {d.frecuencia_pago && (
              <span className="freq-badge freq-resp">{d.frecuencia_pago}</span>
            )}
          </Link>

          {d.pagada_mes_actual && (
            <span className="badge" style={{ background: "#dcfce7", color: "#166534", marginTop: 8, display: "inline-block" }}>
              ✓ Pagada
            </span>
          )}
          <button
            type="button"
            className="secondary"
            onClick={(e) => {
              e.preventDefault();
              toggleCumplidaPeriodo(d.id, !d.pagada_mes_actual);
            }}
            style={{ marginTop: 8, fontSize: 11, display: "inline-block", marginLeft: d.pagada_mes_actual ? 8 : 0 }}
            title={d.pagada_mes_actual ? "Desmarcar cumplida" : "Marcar cumplida"}
          >
            {d.pagada_mes_actual ? "✓ Desmarcar" : "Marcar cumplida"}
          </button>
        </div>
      ))}
    </div>
  );
}
