"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Cuenta } from "@/lib/finanzas";

type Tipo = "recarga" | "retiro" | "transferencia" | "ajuste";

export default function NuevoMovimiento({
  cuentas,
  onSuccess,
}: {
  cuentas: Cuenta[];
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState<Tipo>("recarga");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);

    const body: Record<string, unknown> = { tipo, descripcion: form.get("descripcion") || null };
    if (tipo === "transferencia") {
      body.cuenta_origen = form.get("cuenta_origen");
      body.cuenta_destino = form.get("cuenta_destino");
      body.monto = form.get("monto");
      const md = form.get("monto_destino");
      if (md) body.monto_destino = md;
    } else if (tipo === "ajuste") {
      body.cuenta_id = form.get("cuenta_id");
      body.saldo_real = form.get("saldo_real");
    } else {
      body.cuenta_id = form.get("cuenta_id");
      body.monto = form.get("monto");
    }

    const res = await fetch("/api/movimientos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al registrar el movimiento");
      return;
    }
    formEl.reset();
    router.refresh();
    onSuccess?.();
  }

  const opciones = cuentas.map((c) => (
    <option key={c.id} value={c.id}>
      {c.nombre} ({c.moneda} {c.saldo.toLocaleString("es-CO")})
    </option>
  ));

  return (
    <form onSubmit={onSubmit}>
        <label>Operación</label>
        <select value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)}>
          <option value="recarga">Recarga / entrada de dinero</option>
          <option value="retiro">Retiro / salida de dinero</option>
          <option value="transferencia">Transferencia entre mis cuentas</option>
          <option value="ajuste">Ajustar saldo al valor real</option>
        </select>

        {tipo === "transferencia" ? (
          <>
            <label>Desde</label>
            <select name="cuenta_origen" required>{opciones}</select>
            <label>Hacia</label>
            <select name="cuenta_destino" required>{opciones}</select>
            <label>Monto que sale (en la moneda de origen)</label>
            <input name="monto" type="number" min="0.01" step="any" required />
            <label>Monto que entra (opcional — solo si hay conversión de moneda, ej. COP → USD)</label>
            <input name="monto_destino" type="number" min="0.01" step="any" />
          </>
        ) : tipo === "ajuste" ? (
          <>
            <label>Cuenta</label>
            <select name="cuenta_id" required>{opciones}</select>
            <label>Saldo real actual</label>
            <input name="saldo_real" type="number" step="any" required />
          </>
        ) : (
          <>
            <label>Cuenta</label>
            <select name="cuenta_id" required>{opciones}</select>
            <label>Monto</label>
            <input name="monto" type="number" min="0.01" step="any" required />
          </>
        )}

        <label>Descripción (opcional)</label>
        <input name="descripcion" placeholder="Quincena, ahorro, gastos..." />
      {error && <p className="error">{error}</p>}
      <button disabled={loading}>{loading ? "Guardando..." : "Registrar"}</button>
    </form>
  );
}
