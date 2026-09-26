"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";

export default function EliminarIngreso({ id, descripcion }: { id: number; descripcion: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      className="btn btn-quiet btn-sm"
      disabled={loading}
      aria-label={`Eliminar ${descripcion}`}
      title="Eliminar ingreso"
      onClick={async () => {
        if (!confirm(`¿Eliminar el ingreso "${descripcion}"?`)) return;
        setLoading(true);
        await fetch(`/api/ingresos/${id}`, { method: "DELETE" }).catch(() => null);
        setLoading(false);
        router.refresh();
      }}
    >
      <Trash2 size={15} aria-hidden />
    </button>
  );
}
