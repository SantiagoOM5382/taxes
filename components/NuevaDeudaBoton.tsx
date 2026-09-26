"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import Modal from "./Modal";
import NuevaDeuda from "./NuevaDeuda";

export default function NuevaDeudaBoton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        <Plus size={17} aria-hidden />
        Registrar
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Registrar deuda o responsabilidad">
        <NuevaDeuda onSuccess={() => setOpen(false)} />
      </Modal>
    </>
  );
}
