"use client";

import Link from "next/link";
import type { EventoCalendario } from "@/lib/calendario";

interface Props {
  eventos: EventoCalendario[];
  mes: number;
  anio: number;
}

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function CalendarioGrilla({ eventos, mes, anio }: Props) {
  const primerDia = new Date(anio, mes, 1).getDay(); // 0=Dom
  const totalDias = new Date(anio, mes + 1, 0).getDate();

  // Indexar eventos por día (número)
  const porDia = new Map<number, EventoCalendario[]>();
  for (const ev of eventos) {
    const dia = Number(ev.fecha.split("-")[2]);
    if (!porDia.has(dia)) porDia.set(dia, []);
    porDia.get(dia)!.push(ev);
  }

  // Celdas: vacías iniciales + días del mes
  const celdas: (number | null)[] = [
    ...Array(primerDia).fill(null),
    ...Array.from({ length: totalDias }, (_, i) => i + 1),
  ];

  return (
    <div className="calendario-grilla">
      <div className="grilla-header">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="grilla-dia-nombre">{d}</div>
        ))}
      </div>
      <div className="grilla-cuerpo">
        {celdas.map((dia, i) => {
          if (dia === null) return <div key={`vacio-${i}`} className="grilla-celda vacia" />;
          const evs = porDia.get(dia) ?? [];
          const tienePendiente = evs.some((e) => !e.pagado);
          const tienePagado = evs.some((e) => e.pagado);
          return (
            <div key={dia} className={`grilla-celda ${evs.length > 0 ? "con-eventos" : ""}`}>
              <span className="celda-numero">{dia}</span>
              {evs.length > 0 && (
                <div className="celda-dots">
                  {tienePendiente && <span className="dot pendiente" title="Pendiente" />}
                  {tienePagado && <span className="dot pagado" title="Pagado" />}
                </div>
              )}
              {evs.length > 0 && (
                <div className="celda-tooltips">
                  {evs.map((ev) => (
                    <Link key={ev.deuda_id} href={ev.tipo === "tarjeta" ? "/finanzas" : `/deudas/${ev.deuda_id}`} className="celda-tooltip-link">
                      <span className={`dot-mini ${ev.pagado ? "pagado" : "pendiente"}`} />
                      {ev.nombre}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
