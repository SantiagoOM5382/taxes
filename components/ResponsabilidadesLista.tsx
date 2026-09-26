"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import type { Deuda } from "@/lib/deudas";
import { cop, fmtFrecuencia } from "@/lib/format";

export default function ResponsabilidadesLista({ responsabilidades }: { responsabilidades: Deuda[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [ocupadas, setOcupadas] = useState<number[]>([]);
  // Estado optimista: el check cambia al instante y el servidor confirma después
  const [marcadas, setMarcadas] = useState<Record<number, boolean>>({});
  const [error, setError] = useState("");

  const cumplida = (d: Deuda) => marcadas[d.id] ?? Boolean(d.pagada_mes_actual);
  const ordenadas = [...responsabilidades].sort((a, b) => Number(cumplida(a)) - Number(cumplida(b)));

  async function alternar(d: Deuda) {
    const nuevo = !cumplida(d);
    if (!nuevo && d.pagada_por_pagos) {
      setError(`"${d.descripcion}" tiene pagos registrados en este periodo. Anula el pago desde su detalle para desmarcarla.`);
      return;
    }
    setError("");
    setMarcadas((m) => ({ ...m, [d.id]: nuevo }));
    setOcupadas((o) => [...o, d.id]);
    const res = await fetch(`/api/deudas/${d.id}/cumplida-periodo`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cumplida: nuevo }),
    }).catch(() => null);
    setOcupadas((o) => o.filter((x) => x !== d.id));
    if (!res?.ok) {
      const data = await res?.json().catch(() => ({}));
      setMarcadas((m) => ({ ...m, [d.id]: !nuevo }));
      setError(data?.error ?? `No se pudo actualizar "${d.descripcion}". Intenta de nuevo.`);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <>
      {error && <p className="form-error" style={{ marginBottom: 8 }}>{error}</p>}
      <ul className="rows">
        {ordenadas.map((d) => {
          const hecha = cumplida(d);
          return (
            <li key={d.id}>
              <div className={`row ${hecha ? "is-done" : ""}`}>
                <button
                  type="button"
                  className={`check-btn ${hecha && d.pagada_por_pagos ? "is-locked" : ""}`}
                  aria-pressed={hecha}
                  aria-label={hecha ? `Desmarcar ${d.descripcion}` : `Marcar ${d.descripcion} como pagada este periodo`}
                  title={
                    hecha && d.pagada_por_pagos
                      ? "Pagada con pagos registrados"
                      : hecha
                        ? "Desmarcar"
                        : "Marcar como pagada este periodo"
                  }
                  disabled={ocupadas.includes(d.id)}
                  onClick={() => alternar(d)}
                >
                  <Check size={16} strokeWidth={3} aria-hidden />
                </button>
                <Link href={`/deudas/${d.id}`} className="row-main" style={{ color: "inherit", textDecoration: "none" }}>
                  <div className="row-title">{d.descripcion}</div>
                  <div className="row-sub">
                    {[fmtFrecuencia(d.frecuencia_pago), d.dia_pago ? `día ${d.dia_pago}` : null, d.acreedor]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                </Link>
                <div className="row-end">
                  <div className="row-amount money">
                    {d.valor_estimado != null ? cop.format(d.valor_estimado) : "Variable"}
                  </div>
                  {hecha && (
                    <div className="row-amount-sub">{d.pagada_por_pagos ? "Pago registrado" : "Marcada como pagada"}</div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
