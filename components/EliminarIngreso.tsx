"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function EliminarIngreso({ id }: { id: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      className="secondary"
      style={{ color: "#b91c1c", borderColor: "#fca5a5", padding: "4px 10px" }}
      disabled={loading}
      onClick={async () => {
        if (!confirm("¿Eliminar este ingreso?")) return;
        setLoading(true);
        await fetch(`/api/ingresos/${id}`, { method: "DELETE" });
        router.refresh();
      }}
    >
      Eliminar
    </button>
  );
}
