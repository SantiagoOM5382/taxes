"use client";

import { useState, useEffect, useCallback } from "react";
import CalendarioGrilla from "@/components/CalendarioGrilla";
import CalendarioLista from "@/components/CalendarioLista";
import type { EventoCalendario } from "@/lib/calendario";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default function CalendarioPage() {
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth());
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [vista, setVista] = useState<"grilla" | "lista">("lista");
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    const res = await fetch(`/api/calendario?mes=${mes}&anio=${anio}`);
    if (res.ok) {
      const data = await res.json();
      setEventos(data.eventos);
    }
    setCargando(false);
  }, [mes, anio]);

  useEffect(() => { cargar(); }, [cargar]);

  function anterior() {
    if (mes === 0) { setMes(11); setAnio((a) => a - 1); }
    else setMes((m) => m - 1);
  }

  function siguiente() {
    if (mes === 11) { setMes(0); setAnio((a) => a + 1); }
    else setMes((m) => m + 1);
  }

  return (
    <main className="contenedor">
      <div className="calendario-header">
        <h1>Calendario de pagos</h1>
        <button
          className="btn-toggle-vista"
          onClick={() => setVista((v) => v === "grilla" ? "lista" : "grilla")}
        >
          {vista === "grilla" ? "Ver lista" : "Ver calendario"}
        </button>
      </div>

      <div className="calendario-nav">
        <button onClick={anterior} aria-label="Mes anterior">‹</button>
        <span className="calendario-mes-label">{MESES[mes]} {anio}</span>
        <button onClick={siguiente} aria-label="Mes siguiente">›</button>
      </div>

      {cargando ? (
        <p className="cargando">Cargando...</p>
      ) : vista === "grilla" ? (
        <CalendarioGrilla eventos={eventos} mes={mes} anio={anio} />
      ) : (
        <CalendarioLista eventos={eventos} />
      )}
    </main>
  );
}
