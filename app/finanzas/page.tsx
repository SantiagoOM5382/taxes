import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listCuentas, listIngresos, listMovimientos, ensureCuentaEfectivo } from "@/lib/finanzas";
import { getTasasCOP } from "@/lib/tasas";
import { cop, fmtMoneda } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import FinanzasTabs from "@/components/FinanzasTabs";
import PagarTarjeta from "@/components/PagarTarjeta";

export const metadata = { title: "Finanzas" };

export default async function FinanzasPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  await ensureCuentaEfectivo(user.id);
  const [cuentas, ingresos, movimientos, tasas] = await Promise.all([
    listCuentas(user.id),
    listIngresos(user.id),
    listMovimientos(user.id),
    getTasasCOP(),
  ]);

  // Las archivadas no cuentan; el cupo de las tarjetas no es dinero propio, va aparte
  const abiertas = cuentas.filter((c) => c.estado !== "archivada");
  const liquidas = abiertas.filter((c) => !c.es_credito);
  const total = (m: string) => liquidas.filter((c) => c.moneda === m).reduce((s, c) => s + c.saldo, 0);
  const totalCOP = total("COP");
  const totalUSD = total("USD");
  const totalEUR = total("EUR");
  const totalGeneral =
    totalCOP +
    (tasas.usd != null ? totalUSD * tasas.usd : 0) +
    (tasas.eur != null ? totalEUR * tasas.eur : 0);
  const hayUSD = liquidas.some((c) => c.moneda === "USD");
  const hayEUR = liquidas.some((c) => c.moneda === "EUR");

  const tarjetas = abiertas.filter((c) => c.es_credito);
  const activas = cuentas.filter((c) => c.estado === "activa");

  return (
    <>
      <PageHeader title="Finanzas" sub="Tus cuentas, lo que te entra y cómo se mueve tu dinero." />

      <section className="ledger">
        <div className="stats">
          <div className="stat-lead">
            <div className="stat-label">Total en pesos</div>
            <div className="stat-value money">{cop.format(totalGeneral)}</div>
            {tasas.usd != null && (hayUSD || hayEUR) && (
              <div className="stat-note">
                TRM {cop.format(tasas.usd)}
                {hayEUR && tasas.eur != null ? `, EUR ${cop.format(tasas.eur)}` : ""}
              </div>
            )}
          </div>
          <div>
            <div className="stat-label">En COP</div>
            <div className="stat-value money">{cop.format(totalCOP)}</div>
          </div>
          {hayUSD && (
            <div>
              <div className="stat-label">En USD</div>
              <div className="stat-value money">{fmtMoneda("USD", totalUSD)}</div>
            </div>
          )}
          {hayEUR && (
            <div>
              <div className="stat-label">En EUR</div>
              <div className="stat-value money">{fmtMoneda("EUR", totalEUR)}</div>
            </div>
          )}
          <div>
            <div className="stat-label">Cuentas abiertas</div>
            <div className="stat-value num">{liquidas.length}</div>
          </div>
        </div>
      </section>

      {tarjetas.length > 0 && (
        <section className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-head">
            <h2>
              Tarjetas de crédito <span className="count">{tarjetas.length}</span>
            </h2>
          </div>
          <ul className="rows">
            {tarjetas.map((t) => {
              const limite = t.limite_credito ?? 0;
              const disponible = Math.max(0, t.saldo);
              const pctUsado = limite > 0 ? Math.round(((limite - disponible) / limite) * 100) : 0;
              return (
                <li key={t.id} className="row row-wrap">
                  <div className="row-main">
                    <div className="row-title">{t.nombre}</div>
                    <div className="row-sub">
                      {limite > 0
                        ? `${fmtMoneda(t.moneda, disponible)} disponibles de ${fmtMoneda(t.moneda, limite)}`
                        : `Saldo ${fmtMoneda(t.moneda, t.saldo)}, sin cupo definido`}
                      {t.dia_pago_credito ? `. Se paga el día ${t.dia_pago_credito}` : ""}
                    </div>
                    {limite > 0 && (
                      <div
                        className={`meter ${pctUsado > 80 ? "is-danger" : pctUsado > 50 ? "is-warn" : ""}`}
                        style={{ marginTop: 10, maxWidth: 360 }}
                        aria-label={`${pctUsado}% del cupo usado`}
                      >
                        <span style={{ width: `${pctUsado}%` }} />
                      </div>
                    )}
                  </div>
                  {t.estado === "activa" && <PagarTarjeta tarjeta={t} cuentas={activas} />}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <FinanzasTabs cuentas={cuentas} ingresos={ingresos} movimientos={movimientos} />
    </>
  );
}
