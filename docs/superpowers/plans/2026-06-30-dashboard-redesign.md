# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar el dashboard con estilo fintech moderno: navbar mejorada, KPI cards prominentes (saldo, deuda, crédito) y cards por ítem para deudas y responsabilidades.

**Architecture:** Se agregan clases CSS nuevas en `globals.css` sin tocar las existentes para no romper otras páginas. El dashboard se reescribe solo en su JSX — la lógica de datos no cambia. La navbar en `layout.tsx` se actualiza con avatar de inicial y links estilizados.

**Tech Stack:** Next.js 15 (App Router), TypeScript, CSS vanilla (no Tailwind), datos ya disponibles via `listCuentas` / `listDeudas`.

## Global Constraints

- No modificar estilos existentes — solo agregar clases nuevas al final de `globals.css`
- No tocar formularios, modales, página de finanzas, calendario ni asesor
- No agregar dependencias externas (no instalar librerías de íconos)
- Usar íconos emoji en lugar de SVG externos
- El layout de cards usa CSS Grid nativo

---

### Task 1: Clases CSS nuevas en globals.css

**Files:**
- Modify: `app/globals.css`

**Interfaces:**
- Produces: clases `.kpi-grid`, `.kpi-card`, `.kpi-label`, `.kpi-value`, `.kpi-sub`, `.progress-bar`, `.progress-bar-fill`, `.items-grid`, `.item-card`, `.item-card-header`, `.item-name`, `.item-sub`, `.item-amount`, `.item-progress-label`, `.freq-badge`, `.freq-deuda`, `.freq-resp`, `.nav-logo`, `.avatar`, estilos responsive para breakpoint `640px`.

- [ ] **Step 1: Agregar bloque CSS al final de globals.css**

Abrir `app/globals.css` y agregar al final:

```css
/* ── Rediseño dashboard ─────────────────────────────────────── */

/* KPI grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.kpi-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  border-left: 4px solid transparent;
}
.kpi-label {
  font-size: 11px;
  color: #64748b;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin-bottom: 6px;
}
.kpi-value {
  font-size: 26px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.kpi-sub {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}
.progress-bar {
  height: 4px;
  background: #e2e8f0;
  border-radius: 999px;
  margin-top: 10px;
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%;
  border-radius: 999px;
}

/* Item cards grid */
.section-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 14px;
  margin-top: 8px;
}
.section-header h2 { margin: 0; }
.section-count {
  font-size: 13px;
  color: #94a3b8;
  font-weight: 600;
}
.items-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 8px;
}
.item-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  text-decoration: none;
  color: inherit;
  display: block;
  transition: box-shadow 150ms, transform 150ms;
  border: 1px solid #f1f5f9;
}
.item-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}
.item-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}
.item-name {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.3;
}
.item-sub {
  font-size: 13px;
  color: #64748b;
  margin-top: 2px;
}
.item-amount {
  font-size: 15px;
  font-weight: 700;
  text-align: right;
  white-space: nowrap;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}
.item-progress-label {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 4px;
}
.freq-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  margin-top: 8px;
}
.freq-deuda { background: #dbeafe; color: #1e40af; }
.freq-resp  { background: #fef3c7; color: #92400e; }

/* Navbar mejorada */
header.topbar { background: #0f172a; border-bottom: 1px solid #1e293b; }
.nav-logo { font-weight: 700 !important; font-size: 16px !important; color: #fff !important; }
.nav-logo .dot { color: #3b82f6; }
header.topbar .user a { color: #94a3b8; transition: color 150ms; font-weight: 500; }
header.topbar .user a:hover { color: #fff; }
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #3b82f6;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 32px 16px;
  color: #94a3b8;
  font-size: 14px;
}

/* Responsive */
@media (max-width: 640px) {
  .kpi-grid { grid-template-columns: 1fr; }
  .items-grid { grid-template-columns: 1fr; }
}
```

- [ ] **Step 2: Verificar que la app compila sin errores**

```bash
cd /home/analista_ti/sty/taxes && npx tsc --noEmit 2>&1 | head -20
```
Esperado: sin errores de tipos.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "style: agregar clases CSS para rediseño dashboard"
```

---

### Task 2: Navbar actualizada

**Files:**
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `user.nombre` (string) de `getSession()`
- Produces: navbar con logo estilizado, links en gris azulado, avatar circular con inicial del usuario

- [ ] **Step 1: Reemplazar el contenido de layout.tsx**

```tsx
import "./globals.css";
import Link from "next/link";
import { getSession } from "@/lib/session";
import LogoutButton from "@/components/LogoutButton";

export const metadata = { title: "Mis Deudas" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  return (
    <html lang="es">
      <body>
        <header className="topbar">
          <Link href="/" className="nav-logo">
            <span className="dot">·</span> Mis Deudas
          </Link>
          {user && (
            <div className="user">
              <Link href="/asesor">Asesor IA</Link>
              <Link href="/dashboard">Mis Deudas</Link>
              <Link href="/finanzas">Mis Finanzas</Link>
              <Link href="/calendario">Calendario</Link>
              <div className="avatar">{user.nombre.charAt(0).toUpperCase()}</div>
              <LogoutButton />
            </div>
          )}
        </header>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verificar compilación**

```bash
cd /home/analista_ti/sty/taxes && npx tsc --noEmit 2>&1 | head -20
```
Esperado: sin errores.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "style: navbar con logo estilizado y avatar de usuario"
```

---

### Task 3: KPI Cards en el dashboard

**Files:**
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `saldoTotal`, `extranjeras`, `deudaTotal` (ya calculados en la página), `listCuentas` (ya importado y llamado)
- Produces: sección KPI con 3 cards (saldo, deuda, crédito) reemplazando el `<div className="card resumen">`

- [ ] **Step 1: Agregar cálculos de crédito al bloque de datos existente**

En `app/dashboard/page.tsx`, después de la línea donde se define `deudaTotal`, agregar:

```ts
const tarjetas = cuentas.filter((c) => c.es_credito && c.limite_credito != null);
const cupoTotal = tarjetas.reduce((s, c) => s + (c.limite_credito ?? 0), 0);
const cupoDisponible = tarjetas.reduce((s, c) => s + Math.max(0, c.saldo), 0);
const cupoUsado = cupoTotal - cupoDisponible;
const pctUsado = cupoTotal > 0 ? Math.round((cupoUsado / cupoTotal) * 100) : 0;
```

- [ ] **Step 2: Reemplazar el bloque `<div className="card resumen">` con las KPI cards**

Buscar y reemplazar el bloque que empieza con `<div className="card resumen">` y termina en su `</div>` de cierre por:

```tsx
<div className="kpi-grid">
  {/* Saldo total */}
  <div className="kpi-card" style={{ borderLeftColor: "#22c55e" }}>
    <div className="kpi-label">💰 Saldo total</div>
    <div className="kpi-value">{cop.format(saldoTotal)}</div>
    {extranjeras.length > 0 && (
      <div className="kpi-sub">incluye {extranjeras.join(" y ")}</div>
    )}
  </div>

  {/* Deuda total */}
  <div className="kpi-card" style={{ borderLeftColor: deudaTotal > 0 ? "#ef4444" : "#22c55e" }}>
    <div className="kpi-label">⚠️ Deuda total</div>
    <div className="kpi-value" style={{ color: deudaTotal > 0 ? "#b91c1c" : "#166534" }}>
      {cop.format(deudaTotal)}
    </div>
    {deudaTotal === 0 && <div className="kpi-sub">¡Sin deudas! 🎉</div>}
  </div>

  {/* Crédito disponible — solo si hay tarjetas */}
  {cupoTotal > 0 && (
    <div className="kpi-card" style={{ borderLeftColor: "#3b82f6" }}>
      <div className="kpi-label">💳 Crédito disponible</div>
      <div className="kpi-value" style={{ color: pctUsado > 80 ? "#b91c1c" : "#0f172a" }}>
        {cop.format(cupoDisponible)}
      </div>
      <div className="kpi-sub">{pctUsado}% utilizado de {cop.format(cupoTotal)}</div>
      <div className="progress-bar">
        <div
          className="progress-bar-fill"
          style={{
            width: `${pctUsado}%`,
            background: pctUsado > 80 ? "#ef4444" : pctUsado > 50 ? "#f59e0b" : "#3b82f6",
          }}
        />
      </div>
    </div>
  )}
</div>
```

- [ ] **Step 3: Verificar compilación**

```bash
cd /home/analista_ti/sty/taxes && npx tsc --noEmit 2>&1 | head -20
```
Esperado: sin errores.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: KPI cards de saldo, deuda y crédito en dashboard"
```

---

### Task 4: Cards de ítems — Deudas

**Files:**
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: array `deudas` (ya disponible), cada ítem tiene `id`, `descripcion`, `acreedor`, `frecuencia_pago`, `monto_inicial`, `monto_actual`
- Produces: sección "Deudas" con grid de cards clickeables con barra de progreso

- [ ] **Step 1: Reemplazar el bloque `<div className="card">` de Deudas**

Buscar el bloque que empieza con `<div className="card">` seguido de `<h2>Deudas</h2>` y reemplazarlo completo por:

```tsx
<div className="card">
  <div className="section-header">
    <h2>Deudas</h2>
    {deudas.length > 0 && <span className="section-count">({deudas.length})</span>}
  </div>
  {deudas.length === 0 ? (
    <div className="empty-state">No tenés deudas registradas ✓</div>
  ) : (
    <div className="items-grid">
      {deudas.map((d) => {
        const pct = d.monto_inicial > 0
          ? Math.round(((d.monto_inicial - d.monto_actual) / d.monto_inicial) * 100)
          : 100;
        return (
          <Link key={d.id} className="item-card" href={`/deudas/${d.id}`}>
            <div className="item-card-header">
              <div>
                <div className="item-name">{d.descripcion}</div>
                {d.acreedor && <div className="item-sub">{d.acreedor}</div>}
              </div>
              <div className="item-amount" style={{ color: "#b91c1c" }}>
                {cop.format(d.monto_actual)}
              </div>
            </div>
            {d.frecuencia_pago && (
              <span className="freq-badge freq-deuda">{d.frecuencia_pago}</span>
            )}
            <div className="progress-bar" style={{ marginTop: 10 }}>
              <div
                className="progress-bar-fill"
                style={{ width: `${pct}%`, background: "#22c55e" }}
              />
            </div>
            <div className="item-progress-label">{pct}% pagado</div>
          </Link>
        );
      })}
    </div>
  )}
</div>
```

- [ ] **Step 2: Verificar compilación**

```bash
cd /home/analista_ti/sty/taxes && npx tsc --noEmit 2>&1 | head -20
```
Esperado: sin errores.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: cards de deudas con barra de progreso en dashboard"
```

---

### Task 5: Cards de ítems — Responsabilidades y compartidas

**Files:**
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: arrays `responsabilidades` y `compartidas` (ya disponibles). Responsabilidades tienen `valor_estimado` (number | null) y `total_pagado`. Compartidas tienen además `dueno` y `categoria`.
- Produces: sección "Responsabilidades" con grid de cards sin barra de progreso, y sección "Deudas compartidas conmigo" también como cards.

- [ ] **Step 1: Reemplazar el bloque de Responsabilidades**

Buscar el bloque `<div className="card">` con `<h2>Responsabilidades (pagos permanentes)</h2>` y reemplazarlo por:

```tsx
<div className="card">
  <div className="section-header">
    <h2>Responsabilidades</h2>
    {responsabilidades.length > 0 && (
      <span className="section-count">({responsabilidades.length})</span>
    )}
  </div>
  {responsabilidades.length === 0 ? (
    <div className="empty-state">Sin responsabilidades registradas</div>
  ) : (
    <div className="items-grid">
      {responsabilidades.map((d) => (
        <Link key={d.id} className="item-card" href={`/deudas/${d.id}`}>
          <div className="item-card-header">
            <div>
              <div className="item-name">{d.descripcion}</div>
              {d.acreedor && <div className="item-sub">{d.acreedor}</div>}
            </div>
            <div>
              <div className="item-amount" style={{ color: "#0f172a" }}>
                {d.valor_estimado != null ? cop.format(d.valor_estimado) : "variable"}
              </div>
              <div className="item-progress-label" style={{ textAlign: "right" }}>
                pagado: {cop.format(d.total_pagado)}
              </div>
            </div>
          </div>
          {d.frecuencia_pago && (
            <span className="freq-badge freq-resp">{d.frecuencia_pago}</span>
          )}
        </Link>
      ))}
    </div>
  )}
</div>
```

- [ ] **Step 2: Reemplazar el bloque de Deudas compartidas**

Buscar el bloque `<div className="card">` con `<h2>Deudas compartidas conmigo</h2>` y reemplazarlo por:

```tsx
<div className="card">
  <div className="section-header">
    <h2>Deudas compartidas conmigo</h2>
    {compartidas.length > 0 && (
      <span className="section-count">({compartidas.length})</span>
    )}
  </div>
  {compartidas.length === 0 ? (
    <div className="empty-state">Nadie te ha compartido una deuda todavía</div>
  ) : (
    <div className="items-grid">
      {compartidas.map((d) => (
        <Link key={d.id} className="item-card" href={`/deudas/${d.id}`}>
          <div className="item-card-header">
            <div>
              <div className="item-name">{d.descripcion}</div>
              <div className="item-sub">de {d.dueno}</div>
            </div>
            <div className="item-amount" style={{ color: d.categoria === "deuda" ? "#b91c1c" : "#0f172a" }}>
              {d.categoria === "deuda"
                ? cop.format(d.monto_actual)
                : d.valor_estimado != null
                  ? cop.format(d.valor_estimado)
                  : "variable"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {d.frecuencia_pago && (
              <span className={`freq-badge ${d.categoria === "deuda" ? "freq-deuda" : "freq-resp"}`}>
                {d.frecuencia_pago}
              </span>
            )}
            {d.categoria === "responsabilidad" && (
              <span className="badge responsabilidad">responsabilidad</span>
            )}
          </div>
        </Link>
      ))}
    </div>
  )}
</div>
```

- [ ] **Step 3: Verificar compilación**

```bash
cd /home/analista_ti/sty/taxes && npx tsc --noEmit 2>&1 | head -20
```
Esperado: sin errores.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: cards de responsabilidades y deudas compartidas en dashboard"
```

---

### Task 6: Ajuste del panel-header del dashboard

**Files:**
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `user.nombre`, botones existentes (NuevaDeudaBoton, links a /asesor y /finanzas)
- Produces: `panel-header` con `h1` más chico y botones con mejor espaciado visual

- [ ] **Step 1: Actualizar el panel-header**

Buscar el bloque `<div className="panel-header">` en `dashboard/page.tsx` y reemplazarlo por:

```tsx
<div className="panel-header" style={{ marginBottom: 20 }}>
  <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>
    Hola, {user.nombre} 👋
  </h1>
  <div style={{ display: "flex", gap: 8 }}>
    <NuevaDeudaBoton />
    <Link className="boton" href="/asesor" style={{ background: "#7c3aed" }}>
      🤖 Asesor IA
    </Link>
    <Link className="boton" href="/finanzas" style={{ background: "#0f172a", border: "1px solid #334155" }}>
      Finanzas
    </Link>
  </div>
</div>
```

- [ ] **Step 2: Verificar compilación final**

```bash
cd /home/analista_ti/sty/taxes && npx tsc --noEmit 2>&1 | head -20
```
Esperado: sin errores.

- [ ] **Step 3: Commit final**

```bash
git add app/dashboard/page.tsx
git commit -m "style: panel-header del dashboard con saludo y botones diferenciados"
```
