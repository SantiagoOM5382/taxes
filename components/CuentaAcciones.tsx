"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Cuenta } from "@/lib/finanzas";
import EditarCuenta from "./EditarCuenta";
import Accion from "./Accion";

export default function CuentaAcciones({ cuenta }: { cuenta: Cuenta }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function cambiarEstado(estado: "activa" | "inactiva" | "archivada") {
    setLoading(true);
    await fetch(`/api/cuentas/${cuenta.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    }).catch(() => null);
    setLoading(false);
    router.refresh();
  }

  if (cuenta.estado === "archivada") {
    return (
      <div className="row-actions">
        <button className="btn btn-ghost btn-sm" disabled={loading} onClick={() => cambiarEstado("activa")}>
          Restaurar
        </button>
        <Accion
          url={`/api/cuentas/${cuenta.id}`}
          method="DELETE"
          className="btn btn-quiet btn-sm"
          confirmar={`¿Eliminar ${cuenta.nombre} definitivamente? Solo es posible si no tiene movimientos.`}
        >
          Eliminar
        </Accion>
      </div>
    );
  }

  return (
    <div className="row-actions">
      <EditarCuenta cuenta={cuenta} />
      {cuenta.estado === "activa" ? (
        <button
          className="btn btn-quiet btn-sm"
          disabled={loading}
          onClick={() => cambiarEstado("inactiva")}
          title="No se podrá usar para pagos ni movimientos"
        >
          Desactivar
        </button>
      ) : (
        <button className="btn btn-ghost btn-sm" disabled={loading} onClick={() => cambiarEstado("activa")}>
          Activar
        </button>
      )}
      <button
        className="btn btn-quiet btn-sm"
        disabled={loading}
        onClick={() => {
          if (confirm(`¿Archivar ${cuenta.nombre}? Dejará de contar en tus totales. Puedes restaurarla después.`)) {
            cambiarEstado("archivada");
          }
        }}
      >
        Archivar
      </button>
    </div>
  );
}
