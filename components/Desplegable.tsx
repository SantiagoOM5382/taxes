"use client";

import { useId, useState } from "react";
import { ChevronRight } from "lucide-react";

// Sección plegable genérica: el contenido puede venir renderizado desde el servidor.
export default function Desplegable({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  const id = useId();
  return (
    <div>
      <button
        type="button"
        className="disclosure"
        aria-expanded={abierto}
        aria-controls={id}
        onClick={() => setAbierto((v) => !v)}
      >
        <ChevronRight size={16} aria-hidden />
        {label}
      </button>
      <div id={id} hidden={!abierto}>
        {children}
      </div>
    </div>
  );
}
