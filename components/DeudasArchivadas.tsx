"use client";

import { useState } from "react";
import Link from "next/link";
import type { listDeudas } from "@/lib/deudas";

type DeudaItem = Awaited<ReturnType<typeof listDeudas>>[number];

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export default function DeudasArchivadas({ deudas }: { deudas: DeudaItem[] }) {
  const [abierto, setAbierto] = useState(false);

  if (deudas.length === 0) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <button
        type="button"
        className="secondary"
        onClick={() => setAbierto((v) => !v)}
        style={{ fontSize: 13 }}
      >
        {abierto ? "Ocultar archivadas" : `Ver archivadas (${deudas.length})`}
      </button>
      {abierto && (
        <div className="items-grid" style={{ marginTop: 12 }}>
          {deudas.map((d) => (
            <Link key={d.id} className="item-card" href={`/deudas/${d.id}`}>
              <div className="item-card-header">
                <div>
                  <div className="item-name">{d.descripcion}</div>
                  {d.acreedor && <div className="item-sub">{d.acreedor}</div>}
                </div>
                <div className="item-amount" style={{ color: "#166534" }}>
                  {cop.format(d.monto_inicial)}
                </div>
              </div>
              <span className="freq-badge" style={{ background: "#dcfce7", color: "#166534" }}>
                pagada
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
