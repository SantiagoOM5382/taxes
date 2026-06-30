"use client";

import Link from "next/link";
import type { EventoCalendario } from "@/lib/calendario";

interface Props {
  eventos: EventoCalendario[];
}

export default function CalendarioLista({ eventos }: Props) {
  if (eventos.length === 0) {
    return <p className="sin-datos">No hay responsabilidades con día de pago este mes.</p>;
  }

  // Agrupar por fecha
  const grupos = new Map<string, EventoCalendario[]>();
  for (const ev of eventos) {
    if (!grupos.has(ev.fecha)) grupos.set(ev.fecha, []);
    grupos.get(ev.fecha)!.push(ev);
  }

  const formatFecha = (iso: string) => {
    const [, , d] = iso.split("-");
    return `Día ${Number(d)}`;
  };

  const formatMonto = (m: number | null) =>
    m != null ? `$${m.toLocaleString("es-CO")}` : "Monto variable";

  return (
    <div className="calendario-lista">
      {[...grupos.entries()].map(([fecha, evs]) => (
        <div key={fecha} className="lista-grupo">
          <h3 className="lista-fecha">{formatFecha(fecha)}</h3>
          <ul className="lista-eventos">
            {evs.map((ev) => (
              <li key={`${ev.deuda_id}-${fecha}`} className={`lista-evento ${ev.pagado ? "pagado" : "pendiente"}`}>
                <Link href={ev.tipo === "tarjeta" ? "/finanzas" : `/deudas/${ev.deuda_id}`} className="lista-evento-link">
                  <span className="evento-nombre">{ev.nombre}</span>
                  <span className="evento-monto">{formatMonto(ev.monto_estimado)}</span>
                  <span className={`evento-badge ${ev.pagado ? "badge-pagado" : "badge-pendiente"}`}>
                    {ev.pagado ? "Pagado" : "Pendiente"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
