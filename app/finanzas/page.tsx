import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listCuentas, listIngresos, listMovimientos } from "@/lib/finanzas";
import NuevaCuenta from "@/components/NuevaCuenta";
import NuevoIngreso from "@/components/NuevoIngreso";
import NuevoMovimiento from "@/components/NuevoMovimiento";
import EliminarIngreso from "@/components/EliminarIngreso";

function fmt(moneda: string, valor: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: moneda,
    maximumFractionDigits: moneda === "USD" ? 2 : 0,
  }).format(valor);
}

const FRECUENCIA_LABEL: Record<string, string> = {
  semanal: "Semanal",
  quincenal: "Quincenal",
  mensual: "Mensual",
  unico: "Único",
};

export default async function FinanzasPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const [cuentas, ingresos, movimientos] = await Promise.all([
    listCuentas(user.id),
    listIngresos(user.id),
    listMovimientos(user.id),
  ]);

  const totalCOP = cuentas.filter((c) => c.moneda === "COP").reduce((s, c) => s + c.saldo, 0);
  const totalUSD = cuentas.filter((c) => c.moneda === "USD").reduce((s, c) => s + c.saldo, 0);

  return (
    <main>
      <p style={{ marginBottom: 12 }}>
        <Link href="/">← Volver al inicio</Link>
      </p>
      <h1>Mis Finanzas</h1>

      <div className="card resumen">
        <div>
          <span className="muted">Total en COP</span>
          <strong className="monto">{fmt("COP", totalCOP)}</strong>
        </div>
        <div>
          <span className="muted">Total en USD</span>
          <strong className="monto">{fmt("USD", totalUSD)}</strong>
        </div>
        <div>
          <span className="muted">Cuentas</span>
          <strong>{cuentas.length}</strong>
        </div>
      </div>

      <div className="card">
        <h2>Mis cuentas</h2>
        {cuentas.length === 0 ? (
          <p className="muted">Registra tus cuentas: Nequi, Bancolombia, Binance, efectivo...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Cuenta</th>
                <th>Tipo</th>
                <th>Moneda</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {cuentas.map((c) => (
                <tr key={c.id}>
                  <td>{c.nombre}</td>
                  <td>{c.tipo}</td>
                  <td>{c.moneda}</td>
                  <td className={`monto ${c.saldo < 0 ? "negativo" : ""}`}>
                    {fmt(c.moneda, c.saldo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <NuevaCuenta />
      {cuentas.length > 0 && <NuevoMovimiento cuentas={cuentas} />}

      <div className="card">
        <h2>Mis ingresos</h2>
        {ingresos.length === 0 ? (
          <p className="muted">Registra tu sueldo base e ingresos extra.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Tipo</th>
                <th>Frecuencia</th>
                <th>Monto</th>
                <th>Cae en</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ingresos.map((i) => (
                <tr key={i.id}>
                  <td>{i.descripcion}</td>
                  <td>{i.tipo === "base" ? "Sueldo base" : "Extra"}</td>
                  <td>{FRECUENCIA_LABEL[i.frecuencia] ?? i.frecuencia}</td>
                  <td className="monto">{fmt("COP", i.monto)}</td>
                  <td>{i.cuenta_nombre ?? "—"}</td>
                  <td>
                    <EliminarIngreso id={i.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <NuevoIngreso cuentas={cuentas} />

      <div className="card">
        <h2>Últimos movimientos</h2>
        {movimientos.length === 0 ? (
          <p className="muted">Aún no hay movimientos.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cuenta</th>
                <th>Tipo</th>
                <th>Descripción</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((m) => (
                <tr key={m.id}>
                  <td>{m.fecha}</td>
                  <td>{m.cuenta_nombre}</td>
                  <td>{m.tipo.replace("_", " ")}</td>
                  <td>{m.descripcion ?? "—"}</td>
                  <td className={`monto ${m.monto < 0 ? "negativo" : "positivo"}`}>
                    {m.monto > 0 ? "+" : ""}
                    {fmt(m.moneda, m.monto)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
