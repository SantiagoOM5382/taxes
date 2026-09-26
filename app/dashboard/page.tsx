import Link from "next/link";
import { Download } from "lucide-react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listDeudas, type Deuda } from "@/lib/deudas";
import { listCuentas, ensureCuentaEfectivo } from "@/lib/finanzas";
import { getTasasCOP } from "@/lib/tasas";
import { cop, fmtMoneda, fmtFrecuencia } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import NuevaDeudaBoton from "@/components/NuevaDeudaBoton";
import Desplegable from "@/components/Desplegable";
import ResponsabilidadesLista from "@/components/ResponsabilidadesLista";
import Accion from "@/components/Accion";

export const metadata = { title: "Resumen" };

function pctPagado(d: Deuda) {
  if (d.monto_inicial <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round(((d.monto_inicial - d.monto_actual) / d.monto_inicial) * 100)));
}

function DeudaFila({ d, archivada = false }: { d: Deuda; archivada?: boolean }) {
  const pct = pctPagado(d);
  return (
    <li className="row-con-extra">
      <Link href={`/deudas/${d.id}`} className="row">
        <div className="row-main">
          <div className="row-title">{d.descripcion}</div>
          <div className="row-sub">
            {[d.acreedor, d.frecuencia_pago ? fmtFrecuencia(d.frecuencia_pago) : null].filter(Boolean).join(", ") ||
              "Sin acreedor"}
          </div>
          {!archivada && (
            <div className="meter" aria-label={`${pct}% pagado`}>
              <span style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
        <div className="row-end">
          {archivada ? (
            d.monto_actual > 0 ? (
              <>
                <div className="row-amount money">{cop.format(d.monto_actual)}</div>
                <div className="row-amount-sub">Archivada con saldo</div>
              </>
            ) : (
              <>
                <div className="row-amount money">{cop.format(d.monto_inicial)}</div>
                <div className="row-amount-sub">Saldada</div>
              </>
            )
          ) : (
            <>
              <div className="row-amount money money-debt">{cop.format(d.monto_actual)}</div>
              <div className="row-amount-sub">{pct}% pagado</div>
            </>
          )}
        </div>
      </Link>
      {archivada && d.paz_y_salvo_url && (
        <a className="btn btn-ghost btn-sm" href={`${d.paz_y_salvo_url}&descargar=1`} title="Descargar paz y salvo">
          <Download size={14} aria-hidden />
          Paz y salvo
        </a>
      )}
    </li>
  );
}

export default async function Dashboard() {
  const user = await getSession();
  if (!user) redirect("/login");

  await ensureCuentaEfectivo(user.id);
  const [todas, todasCuentas, tasas] = await Promise.all([
    listDeudas(user.id),
    listCuentas(user.id),
    getTasasCOP(),
  ]);

  const propias = todas.filter((d) => d.es_propia);
  const deudas = propias.filter((d) => d.categoria === "deuda" && d.estado !== "archivada");
  const deudasArchivadas = propias.filter((d) => d.categoria === "deuda" && d.estado === "archivada");
  const responsabilidades = propias.filter((d) => d.categoria === "responsabilidad" && d.estado !== "archivada");
  const responsabilidadesArchivadas = propias.filter(
    (d) => d.categoria === "responsabilidad" && d.estado === "archivada"
  );
  const compartidas = todas.filter((d) => !d.es_propia);

  const cuentas = todasCuentas.filter((c) => c.estado !== "archivada");
  const liquidas = cuentas.filter((c) => !c.es_credito);
  const saldoPor = (m: string) => liquidas.filter((c) => c.moneda === m).reduce((s, c) => s + c.saldo, 0);
  const saldoCOP = saldoPor("COP");
  const saldoUSD = saldoPor("USD");
  const saldoEUR = saldoPor("EUR");

  // Suma todo lo convertible; las monedas sin tasa disponible se indican aparte
  const tienes =
    saldoCOP +
    (tasas.usd != null ? saldoUSD * tasas.usd : 0) +
    (tasas.eur != null ? saldoEUR * tasas.eur : 0);
  const extranjeras = [
    saldoUSD > 0 &&
      (tasas.usd != null
        ? `${fmtMoneda("USD", saldoUSD)} a TRM ${cop.format(tasas.usd)}`
        : `${fmtMoneda("USD", saldoUSD)} sin convertir`),
    saldoEUR > 0 &&
      (tasas.eur != null
        ? `${fmtMoneda("EUR", saldoEUR)} a ${cop.format(tasas.eur)}`
        : `${fmtMoneda("EUR", saldoEUR)} sin convertir`),
  ].filter(Boolean);

  const tarjetas = cuentas.filter((c) => c.es_credito && c.limite_credito != null);
  const cupoTotal = tarjetas.reduce((s, c) => s + (c.limite_credito ?? 0), 0);
  const cupoDisponible = tarjetas.reduce((s, c) => s + Math.max(0, c.saldo), 0);
  const creditoUsado = Math.max(0, cupoTotal - cupoDisponible);
  const pctUsado = cupoTotal > 0 ? Math.round((creditoUsado / cupoTotal) * 100) : 0;

  // Debes = saldo de tus deudas + lo usado de las tarjetas
  const debesDeudas = deudas.reduce((s, d) => s + Math.max(0, d.monto_actual), 0);
  const debes = debesDeudas + creditoUsado;
  const base = Math.max(tienes, 0) + debes;
  const pctTienes = base > 0 ? (Math.max(tienes, 0) / base) * 100 : 0;

  const pendientesPeriodo = responsabilidades.filter((r) => !r.pagada_mes_actual).length;
  const primerNombre = user.nombre.split(" ")[0];

  return (
    <>
      <PageHeader
        title={`Hola, ${primerNombre}`}
        sub={
          pendientesPeriodo > 0
            ? `Tienes ${pendientesPeriodo} ${pendientesPeriodo === 1 ? "pago pendiente" : "pagos pendientes"} en este periodo.`
            : "Estás al día con tus pagos de este periodo."
        }
        actions={<NuevaDeudaBoton />}
      />

      <section className="ledger" aria-label="Estado de cuenta">
        <div className="ledger-figures is-2">
          <div className="ledger-item">
            <div className="ledger-label">Tienes</div>
            <div className="ledger-figure money">{cop.format(tienes)}</div>
            <div className="ledger-note">
              {extranjeras.length > 0 ? `Incluye ${extranjeras.join(" y ")}` : `En ${liquidas.length} ${liquidas.length === 1 ? "cuenta" : "cuentas"}`}
            </div>
          </div>
          <div className="ledger-item">
            <div className="ledger-label">Debes</div>
            <div className={`ledger-figure money ${debes > 0 ? "money-debt" : ""}`}>{cop.format(debes)}</div>
            <div className="ledger-note">
              {[
                deudas.length > 0 ? `${deudas.length} ${deudas.length === 1 ? "deuda" : "deudas"}` : null,
                creditoUsado > 0 ? `${cop.format(creditoUsado)} en tarjetas` : null,
              ]
                .filter(Boolean)
                .join(" y ") || "Sin deudas activas"}
            </div>
          </div>
        </div>

        {base > 0 && (
          <>
            <div className="balance-bar" aria-hidden>
              {pctTienes > 0 && <span className="balance-bar-have" style={{ width: `${pctTienes}%` }} />}
              {debes > 0 && <span className="balance-bar-owe" style={{ width: `${100 - pctTienes}%` }} />}
            </div>
            <div className="balance-legend">
              <span>{Math.round(pctTienes)}% es tuyo</span>
              {debes > 0 && <span>{Math.round(100 - pctTienes)}% es deuda</span>}
            </div>
          </>
        )}

        {cupoTotal > 0 && (
          <div className="mt-md" style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <span className="ledger-label">Crédito disponible</span>
              <span className="money" style={{ fontWeight: 650 }}>
                {cop.format(cupoDisponible)} <span className="muted" style={{ fontWeight: 500 }}>de {cop.format(cupoTotal)}</span>
              </span>
            </div>
            <div
              className={`meter mt-md ${pctUsado > 80 ? "is-danger" : pctUsado > 50 ? "is-warn" : ""}`}
              style={{ marginTop: 8 }}
              aria-label={`${pctUsado}% del cupo usado`}
            >
              <span style={{ width: `${pctUsado}%` }} />
            </div>
            <div className="ledger-note">{pctUsado}% del cupo usado</div>
          </div>
        )}
      </section>

      <div className="columns">
        <section className="panel">
          <div className="panel-head">
            <h2>
              Deudas {deudas.length > 0 && <span className="count">{deudas.length}</span>}
            </h2>
          </div>
          {deudas.length === 0 ? (
            <div className="empty">No tienes deudas activas.</div>
          ) : (
            <ul className="rows">
              {deudas.map((d) => (
                <DeudaFila key={d.id} d={d} />
              ))}
            </ul>
          )}
          {deudasArchivadas.length > 0 && (
            <Desplegable label={`Saldadas y archivadas (${deudasArchivadas.length})`}>
              <ul className="rows">
                {deudasArchivadas.map((d) => (
                  <DeudaFila key={d.id} d={d} archivada />
                ))}
              </ul>
            </Desplegable>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>
              Responsabilidades {responsabilidades.length > 0 && <span className="count">{responsabilidades.length}</span>}
            </h2>
            <Link href="/calendario" className="btn btn-quiet btn-sm">
              Ver calendario
            </Link>
          </div>
          {responsabilidades.length === 0 ? (
            <div className="empty">
              Registra arriendo, servicios o suscripciones para marcarlos cada periodo.
            </div>
          ) : (
            <ResponsabilidadesLista responsabilidades={responsabilidades} />
          )}
          {responsabilidadesArchivadas.length > 0 && (
            <Desplegable label={`Archivadas (${responsabilidadesArchivadas.length})`}>
              <ul className="rows">
                {responsabilidadesArchivadas.map((d) => (
                  <li key={d.id} className="row is-muted-soft">
                    <Link href={`/deudas/${d.id}`} className="row-main" style={{ color: "inherit", textDecoration: "none" }}>
                      <div className="row-title">{d.descripcion}</div>
                      <div className="row-sub">
                        {fmtFrecuencia(d.frecuencia_pago)}
                        {d.valor_estimado != null ? `, ${cop.format(d.valor_estimado)}` : ""}
                      </div>
                    </Link>
                    <Accion url={`/api/deudas/${d.id}`} method="PATCH" body={{ estado: "activa" }}>
                      Restaurar
                    </Accion>
                  </li>
                ))}
              </ul>
            </Desplegable>
          )}
        </section>
      </div>

      {compartidas.length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <h2>
              Compartidas contigo <span className="count">{compartidas.length}</span>
            </h2>
          </div>
          <ul className="rows">
            {compartidas.map((d) => (
              <li key={d.id}>
                <Link href={`/deudas/${d.id}`} className="row">
                  <div className="row-main">
                    <div className="row-title">{d.descripcion}</div>
                    <div className="row-sub">
                      De {d.dueno}
                      {d.frecuencia_pago ? `, ${fmtFrecuencia(d.frecuencia_pago).toLowerCase()}` : ""}
                    </div>
                  </div>
                  <div className="row-end">
                    {d.categoria === "deuda" ? (
                      <div className="row-amount money money-debt">{cop.format(d.monto_actual)}</div>
                    ) : (
                      <>
                        <div className="row-amount money">
                          {d.valor_estimado != null ? cop.format(d.valor_estimado) : "Variable"}
                        </div>
                        <div className="row-amount-sub">Responsabilidad</div>
                      </>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
