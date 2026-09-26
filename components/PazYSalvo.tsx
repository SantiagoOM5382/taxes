"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Lock, ShieldCheck, Upload } from "lucide-react";
import Accion from "./Accion";
import { cop } from "@/lib/format";

// Paz y salvo de una deuda: bloqueado hasta saldarla; después se sube una vez y se descarga cuando se necesite
export default function PazYSalvo({
  deudaId,
  saldada,
  pendiente,
  url,
  esPropia,
  subidaDisponible,
}: {
  deudaId: number;
  saldada: boolean;
  pendiente: number;
  url: string | null;
  esPropia: boolean;
  subidaDisponible: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");

  async function subir(archivo: File | null) {
    if (!archivo) return;
    setError("");
    setSubiendo(true);
    const fd = new FormData();
    fd.append("archivo", archivo);
    const res = await fetch(`/api/deudas/${deudaId}/paz-y-salvo`, { method: "POST", body: fd }).catch(() => null);
    setSubiendo(false);
    if (input.current) input.current.value = "";
    if (!res?.ok) {
      const data = await res?.json().catch(() => ({}));
      setError(data?.error ?? "No se pudo subir el archivo");
      return;
    }
    router.refresh();
  }

  const bloqueado = !saldada && !url;

  return (
    <section className="panel">
      <div className="pys">
        <span className={`pys-icono ${url ? "is-listo" : ""}`} aria-hidden>
          {bloqueado ? <Lock size={20} /> : <ShieldCheck size={20} />}
        </span>
        <div className="pys-texto">
          <h2>Paz y salvo</h2>
          <p className="hint" style={{ marginTop: 2 }}>
            {bloqueado
              ? `Se desbloquea cuando termines de pagar. Te faltan ${cop.format(pendiente)}.`
              : url
                ? "Guardado. Descárgalo cuando lo necesites."
                : esPropia
                  ? "Deuda saldada. Pide el paz y salvo a tu acreedor y súbelo aquí para tenerlo a mano."
                  : "La deuda está saldada. El dueño aún no ha subido el paz y salvo."}
          </p>
          {error && <p className="form-error" style={{ marginTop: 8 }}>{error}</p>}
        </div>
        <div className="row-actions">
          {url && (
            <a className="btn btn-primary btn-sm" href={`${url}&descargar=1`}>
              <Download size={15} aria-hidden />
              Descargar
            </a>
          )}
          {esPropia && !bloqueado && subidaDisponible && (
            <>
              <input ref={input} type="file" accept="image/*,.pdf" hidden onChange={(e) => subir(e.target.files?.[0] ?? null)} />
              <button
                type="button"
                className={`btn ${url ? "btn-ghost" : "btn-primary"} btn-sm`}
                disabled={subiendo}
                onClick={() => input.current?.click()}
              >
                <Upload size={15} aria-hidden />
                {subiendo ? "Subiendo…" : url ? "Reemplazar" : "Subir paz y salvo"}
              </button>
            </>
          )}
          {esPropia && url && (
            <Accion
              url={`/api/deudas/${deudaId}/paz-y-salvo`}
              method="DELETE"
              className="btn btn-quiet btn-sm"
              confirmar="¿Quitar el paz y salvo guardado? Se borra el archivo."
            >
              Quitar
            </Accion>
          )}
        </div>
      </div>
    </section>
  );
}
