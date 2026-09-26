"use client";

import Link from "next/link";
import type { EventoCalendario } from "@/lib/calendario";
import { cop } from "@/lib/format";

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

export function EventoFila({ ev }: { ev: EventoCalendario }) {
  return (
    <li>
      <Link href={ev.tipo === "tarjeta" ? "/finanzas" : `/deudas/${ev.deuda_id}`} className={`row ${ev.pagado ? "is-done" : ""}`}>
        <div className="row-main">
          <div className="row-title">{ev.nombre}</div>
          <div className="row-sub">{ev.tipo === "tarjeta" ? "Tarjeta de crédito" : ev.tipo === "deuda" ? "Cuota de deuda" : "Responsabilidad"}</div>
        </div>
        <div className="row-end">
          <div className="row-amount money">{ev.monto_estimado != null ? cop.format(ev.monto_estimado) : "Variable"}</div>
          <span className={`tag ${ev.pagado ? "tag-paid" : "tag-debt"}`} style={{ marginTop: 4 }}>
            {ev.pagado ? "Pagado" : "Pendiente"}
          </span>
        </div>
      </Link>
    </li>
  );
}

export default function CalendarioLista({
  eventos,
  mes,
  anio,
}: {
  eventos: EventoCalendario[];
  mes: number;
  anio: number;
}) {
  if (eventos.length === 0) {
    return (
      <div className="empty">
        No hay pagos programados este mes. Ponle día de pago a tus responsabilidades, deudas o tarjetas para verlos aquí.
      </div>
    );
  }

  const grupos = new Map<string, EventoCalendario[]>();
  for (const ev of eventos) {
    if (!grupos.has(ev.fecha)) grupos.set(ev.fecha, []);
    grupos.get(ev.fecha)!.push(ev);
  }
  const hoy = new Date();

  return (
    <div className="agenda">
      {[...grupos.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([fecha, evs]) => {
          const dia = Number(fecha.split("-")[2]);
          const dow = new Date(anio, mes, dia).getDay();
          const esHoy = hoy.getFullYear() === anio && hoy.getMonth() === mes && hoy.getDate() === dia;
          return (
            <div key={fecha} className={`agenda-day ${esHoy ? "is-today" : ""}`}>
              <div className="agenda-date">
                <div className="agenda-date-num">{dia}</div>
                <div className="agenda-date-dow">{esHoy ? "hoy" : DIAS[dow]}</div>
              </div>
              <div className="panel">
                <ul className="rows">
                  {evs.map((ev) => (
                    <EventoFila key={`${ev.deuda_id}-${fecha}`} ev={ev} />
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
    </div>
  );
}
