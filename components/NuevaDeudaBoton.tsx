"use client";

import { useState } from "react";
import Modal from "./Modal";
import NuevaDeuda from "./NuevaDeuda";

export default function NuevaDeudaBoton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="boton" onClick={() => setOpen(true)}>
        + Registrar nueva deuda
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Registrar deuda o responsabilidad">
        <NuevaDeuda onSuccess={() => setOpen(false)} />
      </Modal>
    </>
  );
}
