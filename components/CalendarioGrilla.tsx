"use client";

import { useState } from "react";
import type { EventoCalendario } from "@/lib/calendario";
import { MESES } from "@/lib/format";
import { EventoFila } from "./CalendarioLista";

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function CalendarioGrilla({
  eventos,
  mes,
  anio,
}: {
  eventos: EventoCalendario[];
  mes: number;
  anio: number;
}) {
  const hoy = new Date();
  const esMesActual = hoy.getMonth() === mes && hoy.getFullYear() === anio;
  const [seleccionado, setSeleccionado] = useState<number | null>(esMesActual ? hoy.getDate() : null);

  // Semana empieza el lunes, como en los calendarios colombianos
  const primerDia = (new Date(anio, mes, 1).getDay() + 6) % 7;
  const totalDias = new Date(anio, mes + 1, 0).getDate();

  const porDia = new Map<number, EventoCalendario[]>();
  for (const ev of eventos) {
    const dia = Number(ev.fecha.split("-")[2]);
    if (!porDia.has(dia)) porDia.set(dia, []);
    porDia.get(dia)!.push(ev);
  }

  const celdas: (number | null)[] = [
    ...Array(primerDia).fill(null),
    ...Array.from({ length: totalDias }, (_, i) => i + 1),
  ];
  while (celdas.length % 7 !== 0) celdas.push(null);

  const delDia = seleccionado != null ? porDia.get(seleccionado) ?? [] : [];

  return (
    <>
      <div className="cal-grid">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="cal-weekday">
            {d}
          </div>
        ))}
        {celdas.map((dia, i) => {
          if (dia === null) return <div key={`vacio-${i}`} className="cal-day is-blank" aria-hidden />;
          const evs = porDia.get(dia) ?? [];
          const esHoy = esMesActual && dia === hoy.getDate();
          return (
            <button
              key={dia}
              type="button"
              className={`cal-day ${esHoy ? "is-today" : ""}`}
              aria-pressed={seleccionado === dia}
              aria-label={`${dia} de ${MESES[mes]}${evs.length ? `, ${evs.length} ${evs.length === 1 ? "pago" : "pagos"}` : ""}`}
              onClick={() => setSeleccionado(dia)}
            >
              <span className="cal-num">{dia}</span>
              {evs.slice(0, 2).map((ev) => (
                <span key={`${ev.deuda_id}`} className={`cal-chip ${ev.pagado ? "is-paid" : ""}`}>
                  {ev.nombre}
                </span>
              ))}
              {evs.length > 2 && <span className="cal-more">y {evs.length - 2} más</span>}
              {evs.length > 0 && (
                <span className="cal-dots" aria-hidden>
                  {evs.slice(0, 3).map((ev) => (
                    <span key={ev.deuda_id} className={`cal-dot ${ev.pagado ? "is-paid" : ""}`} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <section className="panel" style={{ marginTop: 20 }}>
        {seleccionado == null ? (
          <p className="muted">Elige un día para ver sus pagos.</p>
        ) : (
          <>
            <div className="panel-head" style={{ marginBottom: delDia.length ? 4 : 0 }}>
              <h2>
                {seleccionado} de {MESES[mes].toLowerCase()}
              </h2>
            </div>
            {delDia.length === 0 ? (
              <p className="muted">Sin pagos este día.</p>
            ) : (
              <ul className="rows">
                {delDia.map((ev) => (
                  <EventoFila key={ev.deuda_id} ev={ev} />
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </>
  );
}
