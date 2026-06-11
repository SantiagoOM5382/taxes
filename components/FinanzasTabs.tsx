"use client";

import { useState } from "react";
import Modal from "./Modal";
import NuevaCuenta from "./NuevaCuenta";
import NuevoIngreso from "./NuevoIngreso";
import NuevoMovimiento from "./NuevoMovimiento";
import EliminarIngreso from "./EliminarIngreso";
import type { Cuenta } from "@/lib/finanzas";

interface Ingreso {
  id: number;
  descripcion: string;
  monto: number;
  frecuencia: string;
  tipo: string;
  cuenta_nombre: string | null;
}

interface Movimiento {
  id: number;
  cuenta_nombre: string;
  moneda: string;
  tipo: string;
  monto: number;
  descripcion: string | null;
  fecha: string;
}

function fmt(moneda: string, valor: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: moneda,
    maximumFractionDigits: moneda === "USD" ? 2 : 0,
  }).format(valor);
}

const FRECUENCIA_LABEL: Record<string, string> = {
  semanal: "Semanal",
  quincenal: "Quincenal",
  mensual: "Mensual",
  unico: "Único",
};

type Tab = "cuentas" | "ingresos" | "movimientos";
type ModalAbierto = "cuenta" | "ingreso" | "movimiento" | null;

export default function FinanzasTabs({
  cuentas,
  ingresos,
  movimientos,
}: {
  cuentas: Cuenta[];
  ingresos: Ingreso[];
  movimientos: Movimiento[];
}) {
  const [tab, setTab] = useState<Tab>("cuentas");
  const [modal, setModal] = useState<ModalAbierto>(null);
  const cerrar = () => setModal(null);

  return (
    <>
      <div className="tabs">
        <button className={`tab ${tab === "cuentas" ? "activa" : ""}`} onClick={() => setTab("cuentas")}>
          Mis cuentas
        </button>
        <button className={`tab ${tab === "ingresos" ? "activa" : ""}`} onClick={() => setTab("ingresos")}>
          Mis ingresos
        </button>
        <button
          className={`tab ${tab === "movimientos" ? "activa" : ""}`}
          onClick={() => setTab("movimientos")}
        >
          Últimos movimientos
        </button>
      </div>

      {tab === "cuentas" && (
        <div className="tab-panel">
          <div className="panel-header">
            <h2>Mis cuentas</h2>
            <button className="boton" onClick={() => setModal("cuenta")}>
              + Agregar cuenta
            </button>
          </div>
          {cuentas.length === 0 ? (
            <p className="muted">Registra tus cuentas: Nequi, Bancolombia, Binance, efectivo...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Cuenta</th>
                  <th>Tipo</th>
                  <th>Moneda</th>
                  <th>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {cuentas.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nombre}</td>
                    <td>{c.tipo}</td>
                    <td>{c.moneda}</td>
                    <td className={`monto ${c.saldo < 0 ? "negativo" : ""}`}>
                      {fmt(c.moneda, c.saldo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "ingresos" && (
        <div className="tab-panel">
          <div className="panel-header">
            <h2>Mis ingresos</h2>
            <button className="boton" onClick={() => setModal("ingreso")}>
              + Registrar ingreso
            </button>
          </div>
          {ingresos.length === 0 ? (
            <p className="muted">Registra tu sueldo base e ingresos extra.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th>Tipo</th>
                  <th>Frecuencia</th>
                  <th>Monto por pago</th>
                  <th>Cae en</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ingresos.map((i) => (
                  <tr key={i.id}>
                    <td>{i.descripcion}</td>
                    <td>{i.tipo === "base" ? "Sueldo base" : "Extra"}</td>
                    <td>{FRECUENCIA_LABEL[i.frecuencia] ?? i.frecuencia}</td>
                    <td className="monto">{fmt("COP", i.monto)}</td>
                    <td>{i.cuenta_nombre ?? "—"}</td>
                    <td>
                      <EliminarIngreso id={i.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "movimientos" && (
        <div className="tab-panel">
          <div className="panel-header">
            <h2>Últimos movimientos</h2>
            <button className="boton" onClick={() => setModal("movimiento")} disabled={cuentas.length === 0}>
              + Mover dinero
            </button>
          </div>
          {movimientos.length === 0 ? (
            <p className="muted">Aún no hay movimientos.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cuenta</th>
                  <th>Tipo</th>
                  <th>Descripción</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m) => (
                  <tr key={m.id}>
                    <td>{m.fecha}</td>
                    <td>{m.cuenta_nombre}</td>
                    <td>{m.tipo.replace("_", " ")}</td>
                    <td>{m.descripcion ?? "—"}</td>
                    <td className={`monto ${m.monto < 0 ? "negativo" : "positivo"}`}>
                      {m.monto > 0 ? "+" : ""}
                      {fmt(m.moneda, m.monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <Modal open={modal === "cuenta"} onClose={cerrar} title="Agregar cuenta">
        <NuevaCuenta onSuccess={cerrar} />
      </Modal>
      <Modal open={modal === "ingreso"} onClose={cerrar} title="Registrar ingreso">
        <NuevoIngreso cuentas={cuentas} onSuccess={cerrar} />
      </Modal>
      <Modal open={modal === "movimiento"} onClose={cerrar} title="Mover dinero">
        <NuevoMovimiento cuentas={cuentas} onSuccess={cerrar} />
      </Modal>
    </>
  );
}
