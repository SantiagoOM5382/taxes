"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Acceso {
  email: string;
  nombre: string;
}

export default function Compartir({
  deudaId,
  accesos,
}: {
  deudaId: number;
  accesos: Acceso[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setOk("");
    setLoading(true);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const res = await fetch(`/api/deudas/${deudaId}/compartir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email") }),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Error al compartir");
      return;
    }
    setOk(`Deuda compartida con ${data.invitado.nombre}`);
    formEl.reset();
    router.refresh();
  }

  return (
    <div className="card">
      <h2>Compartir seguimiento</h2>
      <p className="muted" style={{ marginBottom: 10 }}>
        El usuario invitado podrá ver la deuda, los pagos y los comprobantes (solo lectura).
      </p>
      {accesos.length > 0 && (
        <p style={{ marginBottom: 10, fontSize: 14 }}>
          Con acceso: {accesos.map((a) => `${a.nombre} (${a.email})`).join(", ")}
        </p>
      )}
      <form onSubmit={onSubmit}>
        <label>Email del usuario registrado</label>
        <input name="email" type="email" placeholder="santiago@ejemplo.com" required />
        {error && <p className="error">{error}</p>}
        {ok && <p className="ok">{ok}</p>}
        <button disabled={loading}>{loading ? "Compartiendo..." : "Dar acceso"}</button>
      </form>
    </div>
  );
}
