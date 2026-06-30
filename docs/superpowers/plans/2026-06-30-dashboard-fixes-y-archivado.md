# Dashboard: fixes de saldo, layout y archivado de deudas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Excluir el saldo de crédito del KPI de saldo total, reordenar las secciones Deudas/Responsabilidades lado a lado, y archivar automáticamente las deudas que se terminan de pagar.

**Architecture:** Tres cambios independientes sobre el dashboard ya rediseñado. El fix de saldo y el de layout son cambios acotados a `dashboard/page.tsx` y `globals.css`. El archivado requiere una migración de schema (columna `estado` en `deudas`), un trigger en el endpoint de pagos, y un componente cliente nuevo para la sección colapsable.

**Tech Stack:** Next.js 15 (App Router), TypeScript, libSQL/Turso, CSS vanilla.

## Global Constraints

- No modificar estilos existentes en `globals.css` salvo los puntuales descritos en cada task — agregar, no reescribir
- No tocar formularios, modales, página de finanzas, calendario ni asesor
- No agregar dependencias externas
- El archivado automático aplica solo a `categoria === "deuda"` — las responsabilidades no se archivan en este plan
- No se implementa reactivar una deuda archivada ni archivado manual

---

### Task 1: Saldo total excluye cuentas de crédito

**Files:**
- Modify: `app/dashboard/page.tsx:32-37`

**Interfaces:**
- Consumes: `cuentas` (ya filtrada por `estado !== "archivada"`, tipo `Cuenta[]` de `lib/finanzas.ts` con campo `es_credito: boolean`)
- Produces: `saldoCOP`, `saldoUSD`, `saldoEUR` calculados solo sobre cuentas no-crédito (sin cambiar su nombre ni los consumidores downstream: `saldoTotal`, `extranjeras`)

- [ ] **Step 1: Modificar el cálculo de saldos líquidos**

En `app/dashboard/page.tsx`, busca:
```ts
  const saldoCOP = cuentas.filter((c) => c.moneda === "COP").reduce((s, c) => s + c.saldo, 0);
  const saldoUSD = cuentas.filter((c) => c.moneda === "USD").reduce((s, c) => s + c.saldo, 0);
  const saldoEUR = cuentas.filter((c) => c.moneda === "EUR").reduce((s, c) => s + c.saldo, 0);
```
Reemplázalo por:
```ts
  const cuentasLiquidas = cuentas.filter((c) => !c.es_credito);
  const saldoCOP = cuentasLiquidas.filter((c) => c.moneda === "COP").reduce((s, c) => s + c.saldo, 0);
  const saldoUSD = cuentasLiquidas.filter((c) => c.moneda === "USD").reduce((s, c) => s + c.saldo, 0);
  const saldoEUR = cuentasLiquidas.filter((c) => c.moneda === "EUR").reduce((s, c) => s + c.saldo, 0);
```
No toques el resto del archivo: `tarjetas`, `cupoTotal`, etc. siguen derivándose de `cuentas` sin cambios.

- [ ] **Step 2: Verificar compilación**

```bash
cd /home/analista_ti/sty/taxes && npx tsc --noEmit 2>&1 | head -20
```
Esperado: sin errores.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "fix: excluir cuentas de crédito del saldo total"
```

---

### Task 2: Layout — Deudas y Responsabilidades lado a lado

**Files:**
- Modify: `app/dashboard/page.tsx` (envolver las cards de Deudas y Responsabilidades)
- Modify: `app/globals.css` (agregar clase `.cards-row` y ajuste responsive)

**Interfaces:**
- Consumes: las cards `<div className="card">` de Deudas y Responsabilidades ya existentes en `dashboard/page.tsx`
- Produces: clase `.cards-row` en `globals.css`, usada para envolver ambas cards

- [ ] **Step 1: Agregar clase `.cards-row` en globals.css**

Al final de `app/globals.css` (después de las clases del rediseño dashboard ya existentes), agrega:

```css
.cards-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.cards-row .items-grid {
  grid-template-columns: 1fr;
}

@media (max-width: 640px) {
  .cards-row {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 2: Envolver las cards de Deudas y Responsabilidades en dashboard/page.tsx**

En `app/dashboard/page.tsx`, localiza el `<div className="card">` que contiene `<h2>Deudas</h2>` y el `<div className="card">` que contiene `<h2>Responsabilidades</h2>` — son dos bloques consecutivos. Envuélvelos en un único `<div className="cards-row">`:

```tsx
<div className="cards-row">
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
</div>
```

La card de "Deudas compartidas conmigo" queda fuera de `.cards-row`, sin cambios, debajo de este bloque.

- [ ] **Step 3: Verificar compilación**

```bash
cd /home/analista_ti/sty/taxes && npx tsc --noEmit 2>&1 | head -20
```
Esperado: sin errores.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/page.tsx app/globals.css
git commit -m "style: Deudas y Responsabilidades lado a lado en el dashboard"
```

---

### Task 3: Migración de schema — columna estado en deudas

**Files:**
- Create: `scripts/migrate-archivar-deudas.mjs`

**Interfaces:**
- Produces: columna `deudas.estado TEXT NOT NULL DEFAULT 'activa'` en la base de datos Turso

- [ ] **Step 1: Crear el script de migración**

Sigue el patrón exacto de `scripts/migrate-finanzas.mjs` (lee `.env.local`, usa `@libsql/client`):

```js
// Agrega columna estado a deudas para archivado automático al pagarse completas.
// Ejecutar: node scripts/migrate-archivar-deudas.mjs
import { createClient } from "@libsql/client";
import { readFileSync, existsSync } from "node:fs";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
    if (m) process.env[m[1]] ??= m[2];
  }
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

await db.batch([
  `ALTER TABLE deudas ADD COLUMN estado TEXT NOT NULL DEFAULT 'activa'`,
]);

console.log("Migración completa: deudas.estado agregado");
```

- [ ] **Step 2: Ejecutar la migración**

```bash
cd /home/analista_ti/sty/taxes && node scripts/migrate-archivar-deudas.mjs
```
Esperado: imprime "Migración completa: deudas.estado agregado" sin errores. Si la columna ya existe (re-ejecución), fallará con "duplicate column name" — en ese caso confirma que la columna ya está presente y continúa.

- [ ] **Step 3: Commit**

```bash
git add scripts/migrate-archivar-deudas.mjs
git commit -m "feat: migración para columna estado en deudas (archivado)"
```

---

### Task 4: Trigger de archivado automático al completar el pago

**Files:**
- Modify: `app/api/deudas/[id]/pagos/route.ts`

**Interfaces:**
- Consumes: `deuda` (objeto devuelto por `getDeudaConAcceso`, tiene `categoria`, `total_pagado`, `monto_inicial`, `id`), `montoNum` (number, monto del pago que se está registrando)
- Produces: efecto secundario — `UPDATE deudas SET estado='archivada'` cuando corresponde

- [ ] **Step 1: Agregar el trigger después del INSERT INTO pagos**

En `app/api/deudas/[id]/pagos/route.ts`, localiza:
```ts
  const result = await db.execute({
    sql: "INSERT INTO pagos (deuda_id, monto, fecha_pago, comprobante_url, cuenta_id) VALUES (?, ?, ?, ?, ?)",
    args: [deuda.id, montoNum, fecha_pago, comprobante_url || null, cuenta?.id ?? null],
  });

  if (cuenta) {
```
Inserta el trigger de archivado entre el `INSERT INTO pagos` y el `if (cuenta)`:
```ts
  const result = await db.execute({
    sql: "INSERT INTO pagos (deuda_id, monto, fecha_pago, comprobante_url, cuenta_id) VALUES (?, ?, ?, ?, ?)",
    args: [deuda.id, montoNum, fecha_pago, comprobante_url || null, cuenta?.id ?? null],
  });

  if (deuda.categoria === "deuda") {
    const totalPagadoNuevo = deuda.total_pagado + montoNum;
    if (totalPagadoNuevo >= deuda.monto_inicial) {
      await db.execute({
        sql: "UPDATE deudas SET estado = 'archivada' WHERE id = ?",
        args: [deuda.id],
      });
    }
  }

  if (cuenta) {
```

- [ ] **Step 2: Verificar compilación**

```bash
cd /home/analista_ti/sty/taxes && npx tsc --noEmit 2>&1 | head -20
```
Esperado: sin errores.

- [ ] **Step 3: Probar manualmente el endpoint**

```bash
cd /home/analista_ti/sty/taxes && npm run dev &
sleep 3
curl -s -X POST http://localhost:3000/api/deudas/1/pagos -H "Content-Type: application/json" -d '{}' | head -5
```
Esperado: respuesta 401 "No autorizado" (sin sesión) — confirma que el endpoint sigue respondiendo y no hay errores de sintaxis en el archivo. Mata el proceso dev después: `kill %1`.

- [ ] **Step 4: Commit**

```bash
git add app/api/deudas/[id]/pagos/route.ts
git commit -m "feat: archivar deuda automáticamente al completar el pago"
```

---

### Task 5: listDeudas devuelve estado

**Files:**
- Modify: `lib/deudas.ts:55-84` (función `listDeudas` y la interfaz `Deuda`)

**Interfaces:**
- Consumes: columna `deudas.estado` agregada en Task 3
- Produces: `Deuda.estado: "activa" | "archivada"` — nuevo campo consumido por Task 6 (dashboard)

- [ ] **Step 1: Agregar `estado` a la interfaz Deuda**

En `lib/deudas.ts`, busca la interfaz `Deuda` (líneas 3-18) y agrega el campo después de `categoria`:
```ts
export interface Deuda {
  id: number;
  user_id: number;
  descripcion: string;
  acreedor: string | null;
  monto_inicial: number;
  total_pagado: number;
  monto_actual: number;
  es_propia: boolean;
  categoria: "deuda" | "responsabilidad";
  estado: "activa" | "archivada";
  frecuencia_pago: string | null;
  valor_estimado: number | null;
  tasa_interes: number | null;
  fecha_vencimiento: string | null;
  dia_pago: number | null;
  mes_pago: number | null;
}
```

- [ ] **Step 2: Mapear `estado` en listDeudas**

En `lib/deudas.ts`, dentro de `listDeudas`, el `SELECT d.*` ya trae la columna `estado` (es `SELECT *`, no hace falta tocar el SQL). Busca el mapeo del resultado:
```ts
  return result.rows.map((row) => ({
    id: Number(row.id),
    descripcion: String(row.descripcion),
    acreedor: row.acreedor ? String(row.acreedor) : null,
    dueno: String(row.dueno),
    monto_inicial: Number(row.monto_inicial),
    total_pagado: Number(row.total_pagado),
    monto_actual: Number(row.monto_inicial) - Number(row.total_pagado),
    es_propia: Boolean(Number(row.es_propia)),
    categoria: (row.categoria === "responsabilidad" ? "responsabilidad" : "deuda") as
      | "deuda"
      | "responsabilidad",
    frecuencia_pago: row.frecuencia_pago ? String(row.frecuencia_pago) : null,
```
Agrega el campo `estado` justo después de `categoria`:
```ts
    categoria: (row.categoria === "responsabilidad" ? "responsabilidad" : "deuda") as
      | "deuda"
      | "responsabilidad",
    estado: (row.estado === "archivada" ? "archivada" : "activa") as "activa" | "archivada",
    frecuencia_pago: row.frecuencia_pago ? String(row.frecuencia_pago) : null,
```

- [ ] **Step 3: Verificar compilación**

```bash
cd /home/analista_ti/sty/taxes && npx tsc --noEmit 2>&1 | head -20
```
Esperado: puede haber errores de tipo en `dashboard/page.tsx` si el tipo `Deuda` se usa explícitamente en otros archivos sin el nuevo campo — revisa el output y ajusta solo si tsc señala un error real. Si la única referencia es a través de `listDeudas(...)` inferido, no debería haber errores.

- [ ] **Step 4: Commit**

```bash
git add lib/deudas.ts
git commit -m "feat: listDeudas expone el campo estado"
```

---

### Task 6: Dashboard filtra activas/archivadas y muestra sección colapsable

**Files:**
- Create: `components/DeudasArchivadas.tsx`
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `Deuda` (con campo `estado` de Task 5), `cop` (Intl.NumberFormat ya definido en `dashboard/page.tsx`, se re-crea localmente en el componente cliente porque no se puede pasar una función entre server/client components)
- Produces: componente `DeudasArchivadas({ deudas }: { deudas: Deuda[] })` — default export, client component

- [ ] **Step 1: Crear el componente DeudasArchivadas**

Crea `components/DeudasArchivadas.tsx`:
```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import type { Deuda } from "@/lib/deudas";

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export default function DeudasArchivadas({ deudas }: { deudas: Deuda[] }) {
  const [abierto, setAbierto] = useState(false);

  if (deudas.length === 0) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <button
        type="button"
        className="secondary"
        onClick={() => setAbierto((v) => !v)}
        style={{ fontSize: 13 }}
      >
        {abierto ? "Ocultar archivadas" : `Ver archivadas (${deudas.length})`}
      </button>
      {abierto && (
        <div className="items-grid" style={{ marginTop: 12 }}>
          {deudas.map((d) => (
            <Link key={d.id} className="item-card" href={`/deudas/${d.id}`}>
              <div className="item-card-header">
                <div>
                  <div className="item-name">{d.descripcion}</div>
                  {d.acreedor && <div className="item-sub">{d.acreedor}</div>}
                </div>
                <div className="item-amount" style={{ color: "#166534" }}>
                  {cop.format(d.monto_inicial)}
                </div>
              </div>
              <span className="freq-badge" style={{ background: "#dcfce7", color: "#166534" }}>
                pagada
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Filtrar deudas activas/archivadas en el dashboard**

En `app/dashboard/page.tsx`, busca:
```ts
  const deudas = todas.filter((d) => d.categoria === "deuda" && d.es_propia);
```
Reemplázalo por:
```ts
  const deudas = todas.filter(
    (d) => d.categoria === "deuda" && d.es_propia && d.estado !== "archivada"
  );
  const deudasArchivadas = todas.filter(
    (d) => d.categoria === "deuda" && d.es_propia && d.estado === "archivada"
  );
```

- [ ] **Step 3: Importar y renderizar DeudasArchivadas**

En `app/dashboard/page.tsx`, agrega el import junto a los demás:
```ts
import DeudasArchivadas from "@/components/DeudasArchivadas";
```
Dentro de la card de "Deudas" (la que está en `.cards-row`, creada en Task 2), justo antes del `</div>` de cierre de esa card (después del bloque `{deudas.length === 0 ? ... : (...)}`), agrega:
```tsx
    <DeudasArchivadas deudas={deudasArchivadas} />
  </div>
```
Es decir, el cierre de la card de Deudas pasa de:
```tsx
    )}
  </div>
```
a:
```tsx
    )}
    <DeudasArchivadas deudas={deudasArchivadas} />
  </div>
```

- [ ] **Step 4: Verificar compilación**

```bash
cd /home/analista_ti/sty/taxes && npx tsc --noEmit 2>&1 | head -20
```
Esperado: sin errores.

- [ ] **Step 5: Probar visualmente**

```bash
cd /home/analista_ti/sty/taxes && npm run dev &
sleep 3
curl -s http://localhost:3000/dashboard -o /dev/null -w "%{http_code}\n"
kill %1
```
Esperado: `200` o `307` (redirect a login si no hay sesión en curl) — confirma que la página renderiza sin error 500.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/page.tsx components/DeudasArchivadas.tsx
git commit -m "feat: sección colapsable de deudas archivadas en el dashboard"
```
