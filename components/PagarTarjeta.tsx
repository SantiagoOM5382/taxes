"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Cuenta } from "@/lib/finanzas";
import { fmtMoneda } from "@/lib/format";
import Modal from "./Modal";
import Field from "./Field";

type Accion = "pagar" | "capital" | null;

export default function PagarTarjeta({ tarjeta, cuentas }: { tarjeta: Cuenta; cuentas: Cuenta[] }) {
  const router = useRouter();
  const [accion, setAccion] = useState<Accion>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Solo cuentas en la misma moneda de la tarjeta, para no mezclar pesos con dólares
  const otras = cuentas.filter(
    (c) => c.id !== tarjeta.id && c.estado === "activa" && !c.es_credito && c.moneda === tarjeta.moneda
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/movimientos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: "transferencia",
        cuenta_origen: Number(form.get("cuenta_origen")),
        cuenta_destino: tarjeta.id,
        monto: Number(form.get("monto")),
        descripcion: accion === "pagar" ? `Pago tarjeta ${tarjeta.nombre}` : `Aumento de capital ${tarjeta.nombre}`,
      }),
    }).catch(() => null);
    setLoading(false);
    if (!res?.ok) {
      const data = await res?.json().catch(() => ({}));
      setError(data?.error ?? "No se pudo registrar. Intenta de nuevo.");
      return;
    }
    setAccion(null);
    router.refresh();
  }

  return (
    <div className="row-actions">
      <button className="btn btn-ghost btn-sm" onClick={() => setAccion("capital")}>
        Agregar capital
      </button>
      <button className="btn btn-primary btn-sm" onClick={() => setAccion("pagar")}>
        Pagar tarjeta
      </button>
      <Modal
        open={accion !== null}
        onClose={() => setAccion(null)}
        title={accion === "pagar" ? `Pagar ${tarjeta.nombre}` : `Agregar capital a ${tarjeta.nombre}`}
      >
        <p className="muted" style={{ marginBottom: 16 }}>
          Disponible ahora: <span className="money">{fmtMoneda(tarjeta.moneda, tarjeta.saldo)}</span>
        </p>
        <form onSubmit={onSubmit}>
          <Field label="Sale de la cuenta">
            <select name="cuenta_origen" required defaultValue="">
              <option value="" disabled>
                Elige una cuenta
              </option>
              {otras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({fmtMoneda(c.moneda, c.saldo)})
                </option>
              ))}
            </select>
          </Field>
          {otras.length === 0 && (
            <p className="form-error">No tienes cuentas activas en {tarjeta.moneda} desde donde pagar.</p>
          )}
          <Field label={`Monto (${tarjeta.moneda})`}>
            <input name="monto" type="number" inputMode="decimal" min="1" step="any" required />
          </Field>
          {error && <p className="form-error">{error}</p>}
          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Registrando…" : accion === "pagar" ? "Pagar tarjeta" : "Agregar capital"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
