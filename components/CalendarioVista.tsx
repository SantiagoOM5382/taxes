"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import CalendarioGrilla from "@/components/CalendarioGrilla";
import CalendarioLista from "@/components/CalendarioLista";
import PageHeader from "@/components/PageHeader";
import type { EventoCalendario } from "@/lib/calendario";
import { cop, MESES } from "@/lib/format";

export default function CalendarioVista() {
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth());
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [vista, setVista] = useState<"mes" | "lista">("mes");
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError("");
    fetch(`/api/calendario?mes=${mes}&anio=${anio}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => vigente && setEventos(data.eventos))
      .catch(() => vigente && setError("No se pudo cargar el calendario. Recarga la página."))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [mes, anio]);

  function mover(delta: number) {
    const d = new Date(anio, mes + delta, 1);
    setMes(d.getMonth());
    setAnio(d.getFullYear());
  }

  const esMesActual = mes === hoy.getMonth() && anio === hoy.getFullYear();
  const pendientes = eventos.filter((e) => !e.pagado);
  const porPagar = pendientes.reduce((s, e) => s + (e.monto_estimado ?? 0), 0);

  return (
    <>
      <PageHeader title="Calendario" sub="Qué pagos vencen cada día del mes." />

      <div className="cal-toolbar">
        <div className="cal-month">
          <button className="icon-btn" onClick={() => mover(-1)} aria-label="Mes anterior">
            <ChevronLeft size={20} />
          </button>
          <span className="cal-month-label" aria-live="polite">
            {MESES[mes]} {anio}
          </span>
          <button className="icon-btn" onClick={() => mover(1)} aria-label="Mes siguiente">
            <ChevronRight size={20} />
          </button>
          {!esMesActual && (
            <button
              className="btn btn-quiet btn-sm"
              onClick={() => {
                setMes(hoy.getMonth());
                setAnio(hoy.getFullYear());
              }}
            >
              Hoy
            </button>
          )}
        </div>
        <div className="segmented" role="group" aria-label="Vista">
          <button aria-pressed={vista === "mes"} onClick={() => setVista("mes")}>
            Mes
          </button>
          <button aria-pressed={vista === "lista"} onClick={() => setVista("lista")}>
            Lista
          </button>
        </div>
      </div>

      {!cargando && !error && eventos.length === 0 && (
        <div className="cal-summary">
          <span className="tag">Sin pagos programados este mes</span>
        </div>
      )}
      {!cargando && !error && eventos.length > 0 && (
        <div className="cal-summary">
          <span className={`tag ${pendientes.length > 0 ? "tag-debt" : "tag-paid"}`}>
            {pendientes.length === 0
              ? "Todo pagado"
              : `${pendientes.length} ${pendientes.length === 1 ? "pendiente" : "pendientes"}`}
          </span>
          {eventos.length - pendientes.length > 0 && (
            <span className="tag tag-paid">
              {eventos.length - pendientes.length} {eventos.length - pendientes.length === 1 ? "pagado" : "pagados"}
            </span>
          )}
          {porPagar > 0 && <span className="tag">{cop.format(porPagar)} por pagar</span>}
        </div>
      )}

      {error ? (
        <p className="form-error">{error}</p>
      ) : cargando ? (
        <div className="skeleton" style={{ height: 420 }} aria-label="Cargando" />
      ) : vista === "mes" ? (
        <CalendarioGrilla key={`${anio}-${mes}`} eventos={eventos} mes={mes} anio={anio} />
      ) : (
        <CalendarioLista eventos={eventos} mes={mes} anio={anio} />
      )}
    </>
  );
}
