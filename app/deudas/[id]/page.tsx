import { notFound, redirect } from "next/navigation";
import { FileText, Trash2, Archive, RotateCcw, X } from "lucide-react";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getDeudaConAcceso } from "@/lib/deudas";
import { storageConfigurado } from "@/lib/storage";
import { listCuentas } from "@/lib/finanzas";
import { cop, fmtFecha, fmtFrecuencia, MESES } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import NuevoPago from "@/components/NuevoPago";
import Compartir from "@/components/Compartir";
import SubirComprobante from "@/components/SubirComprobante";
import EditarDeuda from "@/components/EditarDeuda";
import Accion from "@/components/Accion";

export default async function DeudaPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) redirect("/login");

  const { id } = await params;
  const deuda = await getDeudaConAcceso(id, user.id);
  if (!deuda) notFound();

  const [pagosRes, accesosRes, cuentas] = await Promise.all([
    db.execute({
      sql: "SELECT * FROM pagos WHERE deuda_id = ? ORDER BY fecha_pago DESC, id DESC",
      args: [deuda.id],
    }),
    deuda.es_propia
      ? db.execute({
          sql: `SELECT u.id, u.email, u.nombre FROM deuda_accesos a
                JOIN users u ON u.id = a.user_id WHERE a.deuda_id = ?`,
          args: [deuda.id],
        })
      : null,
    deuda.es_propia ? listCuentas(user.id) : Promise.resolve([]),
  ]);

  const accesos = (accesosRes?.rows ?? []).map((r) => ({ id: String(r.id), email: String(r.email), nombre: String(r.nombre) }));
  const esDeuda = deuda.categoria === "deuda";
  const pct =
    esDeuda && deuda.monto_inicial > 0
      ? Math.max(0, Math.min(100, Math.round((deuda.total_pagado / deuda.monto_inicial) * 100)))
      : 0;
  const saldada = esDeuda && deuda.monto_actual <= 0;

  const programacion = [
    fmtFrecuencia(deuda.frecuencia_pago),
    deuda.dia_pago ? `día ${deuda.dia_pago}` : null,
    (deuda.frecuencia_pago === "anual" || deuda.frecuencia_pago === "semestral") && deuda.mes_pago
      ? `de ${MESES[deuda.mes_pago - 1].toLowerCase()}`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <PageHeader
        back={{ href: "/dashboard", label: "Resumen" }}
        title={deuda.descripcion}
        tags={
          <>
            {!esDeuda && <span className="tag tag-info">Responsabilidad</span>}
            {!esDeuda && deuda.estado === "archivada" && <span className="tag">Archivada</span>}
            {!deuda.es_propia && <span className="tag">Compartida por {deuda.dueno ?? "otra persona"}</span>}
            {saldada && <span className="tag tag-paid">Saldada</span>}
          </>
        }
        sub={deuda.acreedor ? `Se le paga a ${deuda.acreedor}` : undefined}
        actions={
          deuda.es_propia && (
            <>
              <EditarDeuda deuda={deuda} />
              <Compartir deudaId={deuda.id} accesos={accesos} />
              {!saldada && (
                <NuevoPago
                  deudaId={deuda.id}
                  subidaDisponible={storageConfigurado}
                  montoSugerido={deuda.valor_estimado}
                  pendiente={esDeuda ? Math.max(0, deuda.monto_actual) : null}
                  cuentas={cuentas.filter((c) => c.estado === "activa")}
                />
              )}
            </>
          )
        }
      />

      <section className="ledger">
        {esDeuda ? (
          <>
            <div className="ledger-figures">
              <div className="ledger-item">
                <div className="ledger-label">Saldo pendiente</div>
                <div className={`ledger-figure money ${saldada ? "money-paid" : "money-debt"}`}>
                  {cop.format(Math.max(0, deuda.monto_actual))}
                </div>
                <div className="ledger-note">de {cop.format(deuda.monto_inicial)} iniciales</div>
              </div>
              <div className="ledger-item">
                <div className="ledger-label">Pagado</div>
                <div className="ledger-figure money">{cop.format(deuda.total_pagado)}</div>
                <div className="ledger-note">
                  {pagosRes.rows.length} {pagosRes.rows.length === 1 ? "pago" : "pagos"} registrados
                </div>
              </div>
              <div className="ledger-item">
                <div className="ledger-label">Avance</div>
                <div className="ledger-figure money">{pct}%</div>
                <div className="ledger-note">{programacion}</div>
              </div>
            </div>
            <div className="meter" style={{ marginTop: 22, height: 10 }} aria-label={`${pct}% pagado`}>
              <span style={{ width: `${pct}%` }} />
            </div>
          </>
        ) : (
          <div className="ledger-figures">
            <div className="ledger-item">
              <div className="ledger-label">Valor por pago</div>
              <div className="ledger-figure money">
                {deuda.valor_estimado != null ? cop.format(deuda.valor_estimado) : "Variable"}
              </div>
              <div className="ledger-note">{programacion}</div>
            </div>
            <div className="ledger-item">
              <div className="ledger-label">Pagado en total</div>
              <div className="ledger-figure money">{cop.format(deuda.total_pagado)}</div>
              <div className="ledger-note">
                {pagosRes.rows.length} {pagosRes.rows.length === 1 ? "pago" : "pagos"} registrados
              </div>
            </div>
            <div className="ledger-item">
              <div className="ledger-label">Este periodo</div>
              <div className={`ledger-figure ${deuda.pagada_mes_actual ? "money-paid" : ""}`}>
                {deuda.pagada_mes_actual ? "Pagada" : "Pendiente"}
              </div>
              <div className="ledger-note">
                {deuda.pagado_en_periodo
                  ? `${cop.format(deuda.pagado_en_periodo)} pagados en este periodo`
                  : deuda.pagada_mes_actual
                    ? "Marcada a mano en el resumen"
                    : "Se marca al registrar el pago o desde el resumen"}
              </div>
            </div>
          </div>
        )}
        {esDeuda && (deuda.tasa_interes != null || deuda.fecha_vencimiento) && (
          <div className="stats" style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line-soft)" }}>
            {deuda.tasa_interes != null && (
              <div>
                <div className="stat-label">Interés anual</div>
                <div className="stat-value num">{deuda.tasa_interes}%</div>
              </div>
            )}
            {deuda.fecha_vencimiento && (
              <div>
                <div className="stat-label">Vence</div>
                <div className="stat-value">{fmtFecha(deuda.fecha_vencimiento)}</div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>
            Pagos {pagosRes.rows.length > 0 && <span className="count">{pagosRes.rows.length}</span>}
          </h2>
        </div>
        {pagosRes.rows.length === 0 ? (
          <div className="empty">
            {deuda.es_propia
              ? "Aún no hay pagos. Usa Registrar pago cuando abones."
              : "Aún no hay pagos registrados."}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th className="num">Monto</th>
                  <th style={{ textAlign: "right" }}>Comprobante</th>
                  {deuda.es_propia && <th aria-label="Acciones" />}
                </tr>
              </thead>
              <tbody>
                {pagosRes.rows.map((p) => (
                  <tr key={String(p.id)}>
                    <td>{fmtFecha(String(p.fecha_pago))}</td>
                    <td className="money" style={{ fontWeight: 650 }}>
                      {cop.format(Number(p.monto))}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {p.comprobante_url ? (
                        <a
                          href={String(p.comprobante_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-quiet btn-sm"
                        >
                          <FileText size={15} aria-hidden />
                          Ver
                        </a>
                      ) : deuda.es_propia && storageConfigurado && p.id != null ? (
                        <SubirComprobante deudaId={deuda.id} pagoId={String(p.id)} />
                      ) : (
                        <span className="hint">Sin comprobante</span>
                      )}
                    </td>
                    {deuda.es_propia && (
                      <td style={{ textAlign: "right", width: 44 }}>
                        <Accion
                          url={`/api/deudas/${deuda.id}/pagos/${String(p.id)}`}
                          method="DELETE"
                          className="btn btn-quiet btn-sm"
                          title="Anular pago"
                          ariaLabel={`Anular pago de ${cop.format(Number(p.monto))}`}
                          confirmar={`¿Anular el pago de ${cop.format(Number(p.monto))} del ${fmtFecha(String(p.fecha_pago))}?${
                            p.cuenta_id != null ? " El dinero vuelve a la cuenta de donde salió." : ""
                          }`}
                        >
                          <X size={15} aria-hidden />
                        </Accion>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {deuda.es_propia && accesos.length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <h2>Personas con acceso</h2>
          </div>
          <ul className="rows">
            {accesos.map((a) => (
              <li key={a.email} className="row">
                <span className="avatar" aria-hidden style={{ background: "var(--petrol-soft)", color: "var(--petrol)" }}>
                  {a.nombre.charAt(0).toUpperCase()}
                </span>
                <div className="row-main">
                  <div className="row-title">{a.nombre}</div>
                  <div className="row-sub">{a.email}</div>
                </div>
                <Accion
                  url={`/api/deudas/${deuda.id}/compartir`}
                  method="DELETE"
                  body={{ user_id: a.id }}
                  confirmar={`¿Quitar el acceso de ${a.nombre}? Dejará de ver esta deuda.`}
                  className="btn btn-quiet btn-sm"
                >
                  Quitar acceso
                </Accion>
              </li>
            ))}
          </ul>
        </section>
      )}

      {deuda.es_propia && (
        <section className="panel danger-zone">
          <div>
            <h2>{esDeuda ? "Opciones de la deuda" : "Opciones de la responsabilidad"}</h2>
            <p className="hint">
              {deuda.estado === "archivada"
                ? "Está archivada: no aparece en el resumen ni en el calendario."
                : esDeuda
                  ? "Archívala si ya no la vas a pagar. Se archiva sola al quedar saldada."
                  : "Archívala cuando dejes de pagarla. Puedes restaurarla cuando quieras."}
            </p>
          </div>
          <div className="row-actions">
            {deuda.estado === "archivada" ? (
              <Accion url={`/api/deudas/${deuda.id}`} method="PATCH" body={{ estado: "activa" }}>
                <RotateCcw size={14} aria-hidden />
                Restaurar
              </Accion>
            ) : (
              <Accion url={`/api/deudas/${deuda.id}`} method="PATCH" body={{ estado: "archivada" }}>
                <Archive size={14} aria-hidden />
                Archivar
              </Accion>
            )}
            <Accion
              url={`/api/deudas/${deuda.id}`}
              method="DELETE"
              despues="/dashboard"
              className="btn btn-danger btn-sm"
              confirmar={`¿Eliminar "${deuda.descripcion}" y sus ${pagosRes.rows.length} pagos? No se puede deshacer. Los saldos de tus cuentas no cambian.`}
            >
              <Trash2 size={14} aria-hidden />
              Eliminar
            </Accion>
          </div>
        </section>
      )}
    </>
  );
}
