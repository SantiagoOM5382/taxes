"use client";

import { useEffect, useRef, useState } from "react";
import type { Cuenta, MovimientoItem } from "@/lib/finanzas";
import { fmtFecha, fmtMoneda, TIPOS_MOVIMIENTO } from "@/lib/format";

const PAGINA = 20;

// Lista de movimientos con filtro por cuenta y paginación ("Ver más")
export default function MovimientosLista({ iniciales, cuentas }: { iniciales: MovimientoItem[]; cuentas: Cuenta[] }) {
  const [items, setItems] = useState(iniciales);
  const [cuentaId, setCuentaId] = useState("");
  const [hayMas, setHayMas] = useState(iniciales.length >= PAGINA);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const primera = useRef(true);

  // Cuando el servidor refresca (tras un movimiento nuevo), se reinicia la lista sin filtro
  useEffect(() => {
    setItems(iniciales);
    setCuentaId("");
    setHayMas(iniciales.length >= PAGINA);
  }, [iniciales]);

  async function cargar(offset: number, cuenta: string) {
    setCargando(true);
    setError("");
    const qs = new URLSearchParams({ offset: String(offset), limit: String(PAGINA) });
    if (cuenta) qs.set("cuenta_id", cuenta);
    const res = await fetch(`/api/movimientos?${qs}`).catch(() => null);
    setCargando(false);
    if (!res?.ok) {
      setError("No se pudieron cargar los movimientos.");
      return;
    }
    const data = await res.json();
    setItems((prev) => (offset === 0 ? data.movimientos : [...prev, ...data.movimientos]));
    setHayMas(data.movimientos.length >= PAGINA);
  }

  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    cargar(0, cuentaId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuentaId]);

  return (
    <>
      <div style={{ maxWidth: 280, marginBottom: 8 }}>
        <select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)} aria-label="Filtrar por cuenta">
          <option value="">Todas las cuentas</option>
          {cuentas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      {items.length === 0 ? (
        <div className="empty">{cargando ? "Cargando…" : "No hay movimientos."}</div>
      ) : (
        <ul className="rows">
          {items.map((m) => (
            <li key={m.id} className="row">
              <div className="row-main">
                <div className="row-title">{m.descripcion || TIPOS_MOVIMIENTO[m.tipo] || m.tipo}</div>
                <div className="row-sub">
                  {fmtFecha(m.fecha)}, {m.cuenta_nombre}
                  {m.descripcion ? `, ${(TIPOS_MOVIMIENTO[m.tipo] ?? m.tipo).toLowerCase()}` : ""}
                </div>
              </div>
              <div className="row-end">
                <div className={`row-amount money ${m.monto < 0 ? "money-debt" : "money-paid"}`}>
                  {m.monto > 0 ? "+" : ""}
                  {fmtMoneda(m.moneda, m.monto)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="form-error">{error}</p>}
      {hayMas && items.length > 0 && (
        <button className="btn btn-ghost btn-sm mt-md" disabled={cargando} onClick={() => cargar(items.length, cuentaId)}>
          {cargando ? "Cargando…" : "Ver más"}
        </button>
      )}
    </>
  );
}
