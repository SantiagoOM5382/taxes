"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Cuenta } from "@/lib/finanzas";

export default function CuentaAcciones({ cuenta }: { cuenta: Cuenta }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function cambiarEstado(estado: "activa" | "inactiva" | "archivada") {
    setLoading(true);
    await fetch(`/api/cuentas/${cuenta.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    setLoading(false);
    router.refresh();
  }

  const estilo = { padding: "4px 10px", fontSize: 12 } as const;

  if (cuenta.estado === "archivada") {
    return (
      <button className="boton" style={estilo} disabled={loading} onClick={() => cambiarEstado("activa")}>
        Restaurar
      </button>
    );
  }

  return (
    <span style={{ display: "inline-flex", gap: 6 }}>
      {cuenta.estado === "activa" ? (
        <button
          className="secondary accion"
          style={estilo}
          disabled={loading}
          onClick={() => cambiarEstado("inactiva")}
        >
          Desactivar
        </button>
      ) : (
        <button className="boton" style={estilo} disabled={loading} onClick={() => cambiarEstado("activa")}>
          Activar
        </button>
      )}
      <button
        className="secondary accion"
        style={estilo}
        disabled={loading}
        onClick={() => {
          if (confirm(`¿Archivar la cuenta ${cuenta.nombre}? Dejará de aparecer en Mis cuentas.`)) {
            cambiarEstado("archivada");
          }
        }}
      >
        Archivar
      </button>
    </span>
  );
}
