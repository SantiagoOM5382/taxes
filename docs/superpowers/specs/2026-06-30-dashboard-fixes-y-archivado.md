# Dashboard: fixes de saldo, layout y archivado de deudas — Spec

**Date:** 2026-06-30  
**Scope:** `app/dashboard/page.tsx`, `app/globals.css`, `app/api/deudas/[id]/pagos/route.ts`, `lib/deudas.ts`, `scripts/migrate-archivar-deudas.mjs` (nuevo), `components/DeudasArchivadas.tsx` (nuevo)  
**Goal:** Tres correcciones/mejoras sobre el dashboard ya rediseñado: excluir crédito del saldo total, reordenar Deudas/Responsabilidades lado a lado, y archivar automáticamente deudas pagadas en su totalidad.

---

## 1. Saldo total excluye crédito

**Problema:** `saldoCOP`, `saldoUSD`, `saldoEUR` en `app/dashboard/page.tsx` se calculan reduciendo sobre `cuentas` (ya filtradas por `estado !== 'archivada'`), pero no excluyen cuentas de crédito (`es_credito === true`). El saldo de una tarjeta de crédito no es dinero líquido disponible — es cupo, ya mostrado aparte en la KPI card de crédito.

**Fix:**
```ts
const cuentasLiquidas = cuentas.filter((c) => !c.es_credito);
const saldoCOP = cuentasLiquidas.filter((c) => c.moneda === "COP").reduce((s, c) => s + c.saldo, 0);
const saldoUSD = cuentasLiquidas.filter((c) => c.moneda === "USD").reduce((s, c) => s + c.saldo, 0);
const saldoEUR = cuentasLiquidas.filter((c) => c.moneda === "EUR").reduce((s, c) => s + c.saldo, 0);
```
El resto del cálculo (`saldoTotal`, `extranjeras`) no cambia — solo cambia la fuente (`cuentasLiquidas` en vez de `cuentas`). La variable `tarjetas` (usada para la KPI de crédito) sigue derivándose de `cuentas` sin cambios.

---

## 2. Layout: Deudas y Responsabilidades lado a lado

**Antes:** Deudas, Responsabilidades y Compartidas son tres `<div className="card">` apiladas verticalmente, cada una full-width.

**Después:**
- Nuevo wrapper `<div className="cards-row">` que envuelve las cards de Deudas y Responsabilidades (no la de Compartidas).
- CSS: `.cards-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }`
- En mobile (`max-width: 640px`): `.cards-row { grid-template-columns: 1fr; }` (apiladas, Deudas arriba).
- Compartidas sigue siendo una card independiente, full-width, debajo de `.cards-row`.
- El `.items-grid` interno de cada card no cambia de definición — al estar en una columna más angosta, sus 2 columnas internas pueden lucir apretadas; se ajusta a 1 columna interna cuando el contenedor padre es angosto agregando `.cards-row .items-grid { grid-template-columns: 1fr; }`.

---

## 3. Archivado automático de deudas pagadas

### 3.1 Schema

Nuevo script `scripts/migrate-archivar-deudas.mjs` (sigue el patrón de los `migrate-*.mjs` existentes — lee `.env.local`, usa `@libsql/client`, ejecuta `db.batch`):

```js
await db.batch([
  `ALTER TABLE deudas ADD COLUMN estado TEXT NOT NULL DEFAULT 'activa'`,
]);
```

Valores válidos: `'activa' | 'archivada'`. Solo aplica a deudas (`categoria = 'deuda'`); las responsabilidades quedan siempre en `'activa'` (no se tocan, fuera de alcance).

### 3.2 Trigger de archivado

En `app/api/deudas/[id]/pagos/route.ts`, después del `INSERT INTO pagos` y antes del `return`:

```ts
if (deuda.categoria === "deuda") {
  const totalPagadoNuevo = deuda.total_pagado + montoNum;
  if (totalPagadoNuevo >= deuda.monto_inicial) {
    await db.execute({
      sql: "UPDATE deudas SET estado = 'archivada' WHERE id = ?",
      args: [deuda.id],
    });
  }
}
```

### 3.3 Lectura (`lib/deudas.ts`)

`listDeudas` debe incluir `estado` en el `SELECT` y en el objeto mapeado (campo nuevo en `Deuda`: `estado: "activa" | "archivada"`). No se filtra dentro de `listDeudas` — el filtrado por activa/archivada lo hace el caller (el dashboard), igual que ya se filtra `categoria` y `es_propia` ahí.

### 3.4 Dashboard

En `app/dashboard/page.tsx`:
```ts
const deudas = todas.filter((d) => d.categoria === "deuda" && d.es_propia && d.estado !== "archivada");
const deudasArchivadas = todas.filter((d) => d.categoria === "deuda" && d.es_propia && d.estado === "archivada");
```
`deudaTotal` sigue sumando solo `deudas` (activas) — las archivadas tienen `monto_actual = 0` de todas formas, no afectaría el total, pero se excluyen explícitamente por claridad de intención.

### 3.5 UI — sección colapsable

Nuevo componente cliente `components/DeudasArchivadas.tsx`:
- Recibe `deudasArchivadas: Deuda[]` como prop
- Si `deudasArchivadas.length === 0`, no renderiza nada
- Si hay archivadas: un botón/link `Ver archivadas ({N})` con `useState` para togglear visibilidad
- Al expandir, muestra un `.items-grid` con cards simples (mismo `.item-card`, sin barra de progreso ya que `monto_actual = 0` siempre): nombre, acreedor, badge "pagada" en verde, monto_inicial como referencia
- Se renderiza debajo del `.items-grid` de Deudas, dentro de la misma card de "Deudas"

---

## Out of scope

- Botón de archivado manual (ni para deudas ni responsabilidades)
- Reactivar una deuda archivada
- Archivado de responsabilidades
- Cambios a la página `/deudas/[id]` de detalle
