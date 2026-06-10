"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NuevaDeuda() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/deudas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        descripcion: form.get("descripcion"),
        acreedor: form.get("acreedor"),
        monto_inicial: form.get("monto_inicial"),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al crear la deuda");
      return;
    }
    (e.target as HTMLFormElement).reset?.();
    router.refresh();
  }

  return (
    <div className="card">
      <h2>Registrar nueva deuda</h2>
      <form onSubmit={onSubmit}>
        <label>Descripción</label>
        <input name="descripcion" placeholder="Préstamo carro" required />
        <label>Acreedor (a quién le debes)</label>
        <input name="acreedor" placeholder="Santiago" />
        <label>Monto inicial (COP)</label>
        <input name="monto_inicial" type="number" min="1" step="any" required />
        {error && <p className="error">{error}</p>}
        <button disabled={loading}>{loading ? "Guardando..." : "Crear deuda"}</button>
      </form>
    </div>
  );
}
