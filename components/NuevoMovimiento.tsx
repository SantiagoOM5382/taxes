"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Cuenta } from "@/lib/finanzas";
import Field from "./Field";

type Tipo = "recarga" | "retiro" | "transferencia" | "ajuste";

const TIPOS: { id: Tipo; label: string }[] = [
  { id: "recarga", label: "Entrada" },
  { id: "retiro", label: "Salida" },
  { id: "transferencia", label: "Transferir" },
  { id: "ajuste", label: "Ajustar" },
];

const AYUDA: Record<Tipo, string> = {
  recarga: "Dinero que entra a una cuenta.",
  retiro: "Dinero que sale de una cuenta.",
  transferencia: "Mueve dinero entre tus cuentas, incluso entre monedas.",
  ajuste: "Corrige el saldo para que coincida con el real.",
};

export default function NuevoMovimiento({ cuentas, onSuccess }: { cuentas: Cuenta[]; onSuccess?: () => void }) {
  const router = useRouter();
  const [tipo, setTipo] = useState<Tipo>("recarga");
  const [origenId, setOrigenId] = useState(String(cuentas[0]?.id ?? ""));
  const [destinoId, setDestinoId] = useState(String(cuentas[1]?.id ?? cuentas[0]?.id ?? ""));
  const origen = cuentas.find((c) => String(c.id) === origenId);
  const destino = cuentas.find((c) => String(c.id) === destinoId);
  const conversion = Boolean(origen && destino && origen.moneda !== destino.moneda);
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
    }).catch(() => null);
    setLoading(false);
    if (!res?.ok) {
      const data = await res?.json().catch(() => ({}));
      setError(data?.error ?? "No se pudo registrar el movimiento. Intenta de nuevo.");
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
      <div className="field">
        <div className="segmented" role="group" aria-label="Tipo de movimiento">
          {TIPOS.map((t) => (
            <button key={t.id} type="button" aria-pressed={tipo === t.id} onClick={() => setTipo(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <span className="hint">{AYUDA[tipo]}</span>
      </div>

      {tipo === "transferencia" ? (
        <>
          <div className="field-row">
            <Field label="Desde">
              <select name="cuenta_origen" required value={origenId} onChange={(e) => setOrigenId(e.target.value)}>
                {opciones}
              </select>
            </Field>
            <Field label="Hacia">
              <select name="cuenta_destino" required value={destinoId} onChange={(e) => setDestinoId(e.target.value)}>
                {opciones}
              </select>
            </Field>
          </div>
          {origenId === destinoId && <p className="hint">Elige dos cuentas distintas.</p>}
          <div className="field-row">
            <Field label={`Sale${origen ? ` (${origen.moneda})` : ""}`}>
              <input name="monto" type="number" inputMode="decimal" min="0.01" step="any" required />
            </Field>
            {conversion && (
              <Field label={`Entra (${destino?.moneda})`} hint="Lo que realmente llega tras el cambio.">
                <input name="monto_destino" type="number" inputMode="decimal" min="0.01" step="any" required />
              </Field>
            )}
          </div>
        </>
      ) : (
        <div className="field-row">
          <Field label="Cuenta">
            <select name="cuenta_id" required>{opciones}</select>
          </Field>
          {tipo === "ajuste" ? (
            <Field label="Saldo real">
              <input name="saldo_real" type="number" inputMode="decimal" step="any" required />
            </Field>
          ) : (
            <Field label="Monto">
              <input name="monto" type="number" inputMode="decimal" min="0.01" step="any" required />
            </Field>
          )}
        </div>
      )}

      <Field label="Descripción" hint="Opcional.">
        <input name="descripcion" placeholder="Quincena, ahorro, mercado…" />
      </Field>
      {error && <p className="form-error">{error}</p>}
      <button className="btn btn-primary btn-block" disabled={loading}>
        {loading ? "Guardando…" : "Registrar movimiento"}
      </button>
    </form>
  );
}
