"use client";

import { useState } from "react";
import { Plus, ArrowLeftRight, Landmark, Wallet, Globe, Banknote, CreditCard } from "lucide-react";
import Modal from "./Modal";
import NuevaCuenta from "./NuevaCuenta";
import NuevoIngreso from "./NuevoIngreso";
import NuevoMovimiento from "./NuevoMovimiento";
import EliminarIngreso from "./EliminarIngreso";
import CuentaAcciones from "./CuentaAcciones";
import Desplegable from "./Desplegable";
import type { Cuenta, IngresoItem, MovimientoItem } from "@/lib/finanzas";
import MovimientosLista from "./MovimientosLista";
import Accion from "./Accion";
import { fmtMoneda, fmtFrecuencia, TIPOS_CUENTA } from "@/lib/format";

type Tab = "cuentas" | "ingresos" | "movimientos";
type ModalAbierto = "cuenta" | "ingreso" | "movimiento" | { editar: IngresoItem } | null;

const ICONO_TIPO: Record<string, typeof Landmark> = {
  banco: Landmark,
  billetera: Wallet,
  exchange: Globe,
  efectivo: Banknote,
};

function CuentaFila({ c }: { c: Cuenta }) {
  const Icono = c.es_credito ? CreditCard : ICONO_TIPO[c.tipo] ?? Wallet;
  const archivada = c.estado === "archivada";
  return (
    <li className={`row row-wrap ${archivada ? "is-muted" : ""}`}>
      <span className="row-icon" aria-hidden>
        <Icono size={18} />
      </span>
      <div className="row-main">
        <div className="row-title">{c.nombre}</div>
        <div className="row-sub">
          {c.es_credito ? "Tarjeta de crédito" : TIPOS_CUENTA[c.tipo] ?? c.tipo}, {c.moneda}
          {c.estado === "inactiva" && <span className="tag tag-warn" style={{ marginLeft: 8 }}>Desactivada</span>}
        </div>
      </div>
      <div className="row-end">
        <div className={`row-amount money ${c.saldo < 0 ? "money-debt" : ""}`}>{fmtMoneda(c.moneda, c.saldo)}</div>
        {c.es_credito && <div className="row-amount-sub">disponible</div>}
      </div>
      <CuentaAcciones cuenta={c} />
    </li>
  );
}

export default function FinanzasTabs({
  cuentas,
  ingresos,
  movimientos,
}: {
  cuentas: Cuenta[];
  ingresos: IngresoItem[];
  movimientos: MovimientoItem[];
}) {
  const [tab, setTab] = useState<Tab>("cuentas");
  const [modal, setModal] = useState<ModalAbierto>(null);
  const cerrar = () => setModal(null);

  const visibles = cuentas.filter((c) => c.estado !== "archivada");
  const archivadas = cuentas.filter((c) => c.estado === "archivada");
  const activas = cuentas.filter((c) => c.estado === "activa");
  // Los ingresos están en pesos: solo se asocian a cuentas activas en COP que no sean tarjeta
  const cop = activas.filter((c) => c.moneda === "COP" && !c.es_credito);
  const cuentaCOP = (id: number | null) => id != null && cop.some((c) => c.id === id);

  const TABS: { id: Tab; label: string }[] = [
    { id: "cuentas", label: "Cuentas" },
    { id: "ingresos", label: "Ingresos" },
    { id: "movimientos", label: "Movimientos" },
  ];

  return (
    <section className="panel">
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            className="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "cuentas" && (
        <div role="tabpanel">
          <div className="panel-head">
            <p className="muted">Nequi, bancos, exchanges, efectivo y tarjetas.</p>
            <button className="btn btn-primary btn-sm" onClick={() => setModal("cuenta")}>
              <Plus size={15} aria-hidden />
              Agregar cuenta
            </button>
          </div>
          {visibles.length === 0 ? (
            <div className="empty">Agrega tu primera cuenta para ver cuánto dinero tienes.</div>
          ) : (
            <ul className="rows">
              {visibles.map((c) => (
                <CuentaFila key={c.id} c={c} />
              ))}
            </ul>
          )}
          {archivadas.length > 0 && (
            <Desplegable label={`Archivadas (${archivadas.length})`}>
              <ul className="rows">
                {archivadas.map((c) => (
                  <CuentaFila key={c.id} c={c} />
                ))}
              </ul>
            </Desplegable>
          )}
        </div>
      )}

      {tab === "ingresos" && (
        <div role="tabpanel">
          <div className="panel-head">
            <p className="muted">Sueldo base e ingresos extra.</p>
            <button className="btn btn-primary btn-sm" onClick={() => setModal("ingreso")}>
              <Plus size={15} aria-hidden />
              Registrar ingreso
            </button>
          </div>
          {ingresos.length === 0 ? (
            <div className="empty">Registra tu sueldo para que el asesor calcule tu capacidad de ahorro.</div>
          ) : (
            <ul className="rows">
              {ingresos.map((i) => (
                <li key={i.id} className="row row-wrap">
                  <div className="row-main">
                    <div className="row-title">{i.descripcion}</div>
                    <div className="row-sub">
                      {[i.tipo === "base" ? "Sueldo base" : "Extra", fmtFrecuencia(i.frecuencia).toLowerCase(), i.cuenta_nombre ? `cae en ${i.cuenta_nombre}` : null]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  </div>
                  <div className="row-end">
                    <div className="row-amount money money-paid">{fmtMoneda("COP", i.monto)}</div>
                  </div>
                  <div className="row-actions">
                    {cuentaCOP(i.cuenta_id) && (
                      <Accion
                        url="/api/movimientos"
                        body={{ tipo: "recarga", cuenta_id: i.cuenta_id, monto: i.monto, descripcion: i.descripcion }}
                        confirmar={`¿Registrar que te llegaron ${fmtMoneda("COP", i.monto)} en ${i.cuenta_nombre}? Se suma al saldo.`}
                        title="Suma este ingreso al saldo de su cuenta"
                      >
                        Lo recibí
                      </Accion>
                    )}
                    <button className="btn btn-quiet btn-sm" onClick={() => setModal({ editar: i })}>
                      Editar
                    </button>
                    <EliminarIngreso id={i.id} descripcion={i.descripcion} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "movimientos" && (
        <div role="tabpanel">
          <div className="panel-head">
            <p className="muted">Recargas, retiros, transferencias y pagos.</p>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setModal("movimiento")}
              disabled={activas.length === 0}
            >
              <ArrowLeftRight size={15} aria-hidden />
              Mover dinero
            </button>
          </div>
          <MovimientosLista iniciales={movimientos} cuentas={visibles} />
        </div>
      )}

      <Modal open={modal === "cuenta"} onClose={cerrar} title="Agregar cuenta">
        <NuevaCuenta onSuccess={cerrar} />
      </Modal>
      <Modal open={modal === "ingreso"} onClose={cerrar} title="Registrar ingreso">
        <NuevoIngreso cuentas={cop} onSuccess={cerrar} />
      </Modal>
      <Modal open={typeof modal === "object" && modal !== null} onClose={cerrar} title="Editar ingreso">
        {typeof modal === "object" && modal !== null && (
          <NuevoIngreso key={modal.editar.id} ingreso={modal.editar} cuentas={cop} onSuccess={cerrar} />
        )}
      </Modal>
      <Modal open={modal === "movimiento"} onClose={cerrar} title="Mover dinero">
        <NuevoMovimiento cuentas={activas} onSuccess={cerrar} />
      </Modal>
    </section>
  );
}
