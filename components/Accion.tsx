"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Botón que llama a la API, con confirmación opcional, y refresca (o navega) al terminar.
export default function Accion({
  url,
  method = "POST",
  body,
  confirmar,
  despues,
  className = "btn btn-ghost btn-sm",
  title,
  ariaLabel,
  exito,
  children,
}: {
  url: string;
  method?: "POST" | "PATCH" | "DELETE";
  body?: unknown;
  confirmar?: string;
  despues?: string; // ruta a la que ir al terminar; si no, refresca
  exito?: string; // mensaje breve a mostrar cuando sale bien
  className?: string;
  title?: string;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function ejecutar() {
    if (confirmar && !confirm(confirmar)) return;
    setError("");
    setOk("");
    setLoading(true);
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }).catch(() => null);
    setLoading(false);
    if (!res?.ok) {
      const data = await res?.json().catch(() => ({}));
      setError(data?.error ?? "No se pudo completar. Intenta de nuevo.");
      return;
    }
    if (exito) {
      setOk(exito);
      setTimeout(() => setOk(""), 4000);
      return;
    }
    if (despues) router.push(despues);
    router.refresh();
  }

  return (
    <span className="accion">
      <button type="button" className={className} disabled={loading} onClick={ejecutar} title={title} aria-label={ariaLabel}>
        {children}
      </button>
      {ok && (
        <span className="accion-ok" role="status">
          {ok}
        </span>
      )}
      {error && (
        <span className="accion-error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
