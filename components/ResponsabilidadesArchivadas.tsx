"use client";

import { useState } from "react";
import Link from "next/link";
import type { Deuda } from "@/lib/deudas";

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export default function ResponsabilidadesArchivadas({ responsabilidades }: { responsabilidades: Deuda[] }) {
  const [abierto, setAbierto] = useState(false);

  if (responsabilidades.length === 0) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <button
        type="button"
        className="secondary"
        onClick={() => setAbierto((v) => !v)}
        style={{ fontSize: 13 }}
      >
        {abierto ? "Ocultar pagadas" : `Ver pagadas (${responsabilidades.length})`}
      </button>
      {abierto && (
        <div className="items-grid" style={{ marginTop: 12 }}>
          {responsabilidades.map((d) => (
            <Link key={d.id} className="item-card" href={`/deudas/${d.id}`}>
              <div className="item-card-header">
                <div>
                  <div className="item-name">{d.descripcion}</div>
                  {d.acreedor && <div className="item-sub">{d.acreedor}</div>}
                </div>
                <div className="item-amount" style={{ color: "#0f172a" }}>
                  {d.valor_estimado != null ? cop.format(d.valor_estimado) : "variable"}
                </div>
              </div>
              {d.frecuencia_pago && (
                <span className="freq-badge freq-resp">{d.frecuencia_pago}</span>
              )}
              <span className="freq-badge" style={{ background: "#dcfce7", color: "#166534", marginLeft: 6 }}>
                ✓ Pagada
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
