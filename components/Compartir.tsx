"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Share2 } from "lucide-react";
import Modal from "./Modal";
import Field from "./Field";

interface Acceso {
  email: string;
  nombre: string;
}

export default function Compartir({ deudaId, accesos }: { deudaId: number; accesos: Acceso[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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
    }).catch(() => null);
    setLoading(false);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      setError(data?.error ?? "No se pudo compartir. Intenta de nuevo.");
      return;
    }
    setOk(`Listo. ${data.invitado.nombre} ya puede ver esta deuda.`);
    formEl.reset();
    router.refresh();
  }

  return (
    <>
      <button className="btn btn-ghost" onClick={() => setOpen(true)}>
        <Share2 size={16} aria-hidden />
        Compartir
      </button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setOk("");
          setError("");
        }}
        title="Compartir seguimiento"
      >
        <p className="muted" style={{ marginBottom: 16 }}>
          La persona podrá ver la deuda, sus pagos y comprobantes. No podrá modificar nada.
        </p>
        {accesos.length > 0 && (
          <p className="hint" style={{ marginBottom: 16 }}>
            Ya tienen acceso: {accesos.map((a) => a.nombre).join(", ")}.
          </p>
        )}
        <form onSubmit={onSubmit}>
          <Field label="Correo de la persona" hint="Debe tener una cuenta en Mis Deudas.">
            <input name="email" type="email" placeholder="nombre@correo.com" required />
          </Field>
          {error && <p className="form-error">{error}</p>}
          {ok && <p className="form-ok">{ok}</p>}
          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Compartiendo…" : "Dar acceso"}
          </button>
        </form>
      </Modal>
    </>
  );
}
