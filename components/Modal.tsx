"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

export default function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  // Guardamos onClose en una ref para no re-ejecutar el efecto (y robar el foco) en cada render
  const cerrarRef = useRef(onClose);
  cerrarRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previo = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Enfoca el primer campo del formulario, o el diálogo si no hay campos
    const primero = ref.current?.querySelector<HTMLElement>(
      ".modal-body input:not([type=hidden]), .modal-body select, .modal-body textarea"
    );
    (primero ?? ref.current)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrarRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previo?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
