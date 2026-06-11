import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getDeudaConAcceso } from "@/lib/deudas";
import NuevoPago from "@/components/NuevoPago";
import Compartir from "@/components/Compartir";
import { storageConfigurado } from "@/lib/storage";
import { listCuentas } from "@/lib/finanzas";

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export default async function DeudaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");

  const { id } = await params;
  const deuda = await getDeudaConAcceso(id, user.id);
  if (!deuda) notFound();

  const pagosRes = await db.execute({
    sql: "SELECT * FROM pagos WHERE deuda_id = ? ORDER BY fecha_pago DESC, id DESC",
    args: [deuda.id],
  });

  const accesosRes = deuda.es_propia
    ? await db.execute({
        sql: `SELECT u.email, u.nombre FROM deuda_accesos a
              JOIN users u ON u.id = a.user_id WHERE a.deuda_id = ?`,
        args: [deuda.id],
      })
    : null;

  return (
    <main>
      <p style={{ marginBottom: 12 }}>
        <Link href="/">← Volver</Link>
      </p>
      <h1>
        {deuda.descripcion}{" "}
        {deuda.categoria === "responsabilidad" && (
          <span className="badge responsabilidad">responsabilidad</span>
        )}{" "}
        {deuda.es_propia ? (
          <span className="badge propia">propia</span>
        ) : (
          <span className="badge compartida">compartida contigo</span>
        )}
      </h1>

      <div className="card resumen">
        <div>
          <span className="muted">Acreedor</span>
          <strong>{deuda.acreedor ?? "—"}</strong>
        </div>
        <div>
          <span className="muted">Frecuencia</span>
          <strong>{deuda.frecuencia_pago ?? "—"}</strong>
        </div>
        {deuda.categoria === "deuda" ? (
          <>
            <div>
              <span className="muted">Deuda inicial</span>
              <strong className="monto">{cop.format(deuda.monto_inicial)}</strong>
            </div>
            <div>
              <span className="muted">Total pagado</span>
              <strong className="monto">{cop.format(deuda.total_pagado)}</strong>
            </div>
            <div>
              <span className="muted">Deuda actual</span>
              <strong className="monto" style={{ color: deuda.monto_actual <= 0 ? "#166534" : "#b91c1c" }}>
                {cop.format(deuda.monto_actual)}
              </strong>
            </div>
          </>
        ) : (
          <>
            <div>
              <span className="muted">Valor estimado por pago</span>
              <strong className="monto">
                {deuda.valor_estimado != null ? cop.format(deuda.valor_estimado) : "variable"}
              </strong>
            </div>
            <div>
              <span className="muted">Total pagado histórico</span>
              <strong className="monto">{cop.format(deuda.total_pagado)}</strong>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h2>Pagos realizados</h2>
        {pagosRes.rows.length === 0 ? (
          <p className="muted">Sin pagos registrados todavía.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Monto</th>
                <th>Comprobante</th>
              </tr>
            </thead>
            <tbody>
              {pagosRes.rows.map((p) => (
                <tr key={String(p.id)}>
                  <td>{String(p.fecha_pago)}</td>
                  <td className="monto">{cop.format(Number(p.monto))}</td>
                  <td>
                    {p.comprobante_url ? (
                      <a href={String(p.comprobante_url)} target="_blank" rel="noopener noreferrer">
                        Ver comprobante
                      </a>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {deuda.es_propia && (
        <>
          <NuevoPago
            deudaId={deuda.id}
            subidaDisponible={storageConfigurado}
            cuentas={(await listCuentas(user.id)).filter((c) => c.estado === "activa")}
          />
          <Compartir
            deudaId={deuda.id}
            accesos={(accesosRes?.rows ?? []).map((r) => ({
              email: String(r.email),
              nombre: String(r.nombre),
            }))}
          />
        </>
      )}
    </main>
  );
}
