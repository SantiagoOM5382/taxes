"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Cuenta } from "@/lib/finanzas";

interface Props {
  tarjeta: Cuenta;
  cuentas: Cuenta[];
}

type Accion = "pagar" | "capital" | null;

export default function PagarTarjeta({ tarjeta, cuentas }: Props) {
  const router = useRouter();
  const [accion, setAccion] = useState<Accion>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const otras = cuentas.filter((c) => c.id !== tarjeta.id && c.estado === "activa");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const cuentaOrigen = form.get("cuenta_origen");
    const monto = form.get("monto");
    const descripcion =
      accion === "pagar"
        ? `Pago tarjeta ${tarjeta.nombre}`
        : `Aumento de capital ${tarjeta.nombre}`;

    const res = await fetch("/api/movimientos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: "transferencia",
        cuenta_origen: Number(cuentaOrigen),
        cuenta_destino: tarjeta.id,
        monto: Number(monto),
        descripcion,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al registrar");
      return;
    }
    setAccion(null);
    router.refresh();
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="pagar-tarjeta">
      {accion === null ? (
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn-secundario" onClick={() => setAccion("pagar")}>
            Pagar tarjeta
          </button>
          <button className="btn-secundario" onClick={() => setAccion("capital")}>
            Agregar capital
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="editar-cuenta-form">
          <strong style={{ fontSize: 14 }}>
            {accion === "pagar" ? "Pagar tarjeta" : "Agregar capital"} — {tarjeta.nombre}{" "}
            <span className="muted">({fmt(tarjeta.saldo)} disponible)</span>
          </strong>

          <label>Desde qué cuenta sale el dinero</label>
          <select name="cuenta_origen" required>
            <option value="">— Seleccioná una cuenta —</option>
            {otras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} ({fmt(c.saldo)})
              </option>
            ))}
          </select>

          <label>Monto (COP)</label>
          <input name="monto" type="number" min="1" step="any" required />

          {error && <p className="error">{error}</p>}
          <div style={{ display: "flex", gap: 6 }}>
            <button disabled={loading} style={{ fontSize: 13, padding: "5px 12px" }}>
              {loading ? "Registrando..." : "Confirmar"}
            </button>
            <button type="button" className="btn-secundario" onClick={() => setAccion(null)}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
