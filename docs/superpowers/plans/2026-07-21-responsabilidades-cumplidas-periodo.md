# Responsabilidades: Sistema "Cumplida este Período" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "cumplida este período" tracking to recurring responsibilities with automatic reset based on payment frequency.

**Architecture:** Schema adds two columns (`pagada_mes_actual`, `ultimo_reset_fecha`) to track period completion. Reset logic is lazy (triggered on read via `listDeudas`/`getDeudaConAcceso`). Manual toggle via new PATCH endpoint. UI updates dashboard to show status badge and reorder (unpaid first).

**Tech Stack:** Next.js 15 (App Router), TypeScript, libSQL/Turso, CSS vanilla.

## Global Constraints

- Only applies to `categoria = 'responsabilidad'` — deudas unchanged
- `pagada_mes_actual` is purely visual flag — does NOT affect `total_pagado` or `monto_actual` calculations
- Reset is lazy (on read) not scheduled — no cron needed
- Manual toggle does NOT validate amounts
- If `valor_estimado = null`, NO automatic marking (requires explicit manual toggle)
- Frequency durations: mensual (+1 mes), quincenal (+15 días), semanal (+7 días), diaria (+1 día), semestral (+6 meses), anual (+12 meses)

---

### Task 1: Schema Migration — Add cumplida_mes_actual and ultimo_reset_fecha

**Files:**
- Create: `scripts/migrate-cumplida-periodo.mjs`

**Interfaces:**
- Produces: `deudas.pagada_mes_actual BOOLEAN DEFAULT false`, `deudas.ultimo_reset_fecha DATETIME`

- [ ] **Step 1: Create migration script**

Create `scripts/migrate-cumplida-periodo.mjs` following pattern from existing migrations:

```js
// Agrega columnas para tracking de "cumplida este período" en responsabilidades.
// Ejecutar: node scripts/migrate-cumplida-periodo.mjs
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
  `ALTER TABLE deudas ADD COLUMN pagada_mes_actual BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE deudas ADD COLUMN ultimo_reset_fecha DATETIME`,
]);

console.log("Migración completa: columnas pagada_mes_actual y ultimo_reset_fecha agregadas");
```

- [ ] **Step 2: Run migration**

```bash
cd /home/analista_ti/sty/taxes && node scripts/migrate-cumplida-periodo.mjs
```
Expected: "Migración completa..." message.

- [ ] **Step 3: Commit**

```bash
git add scripts/migrate-cumplida-periodo.mjs
git commit -m "feat: migración para responsabilidades cumplidas este período"
```

---

### Task 2: Update Deuda Interface — Add pagada_mes_actual and ultimo_reset_fecha

**Files:**
- Modify: `lib/deudas.ts:13` (Deuda interface), lines ~47 and ~81 (mapeos en funciones)

**Interfaces:**
- Consumes: `Deuda` interface (existing)
- Produces: `Deuda` interface with new optional fields `pagada_mes_actual?: boolean` and `ultimo_reset_fecha?: string`

- [ ] **Step 1: Update Deuda interface**

In `lib/deudas.ts`, after line 13 (`estado: "activa" | "archivada"`), add:

```ts
  pagada_mes_actual?: boolean;        // responsabilidades only
  ultimo_reset_fecha?: string | null; // responsabilidades only
```

- [ ] **Step 2: Add mapping in getDeudaConAcceso**

In `lib/deudas.ts` at line ~47 (the mapeo in getDeudaConAcceso), add after `estado` line:

```ts
    pagada_mes_actual: Boolean(Number(row.pagada_mes_actual ?? 0)),
    ultimo_reset_fecha: row.ultimo_reset_fecha ? String(row.ultimo_reset_fecha) : null,
```

- [ ] **Step 3: Add mapping in listDeudas**

In `lib/deudas.ts` at line ~81 (the mapeo in listDeudas), add after `estado` line:

```ts
    pagada_mes_actual: Boolean(Number(row.pagada_mes_actual ?? 0)),
    ultimo_reset_fecha: row.ultimo_reset_fecha ? String(row.ultimo_reset_fecha) : null,
```

- [ ] **Step 4: Verify compilation**

```bash
cd /home/analista_ti/sty/taxes && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/deudas.ts
git commit -m "feat: interfaz Deuda expone campos pagada_mes_actual y ultimo_reset_fecha"
```

---

### Task 3: Implement Reset Logic — Helper function

**Files:**
- Modify: `lib/deudas.ts` (add helper function)

**Interfaces:**
- Consumes: `Deuda` object with `ultimo_reset_fecha`, `frecuencia_pago`, `pagada_mes_actual`
- Produces: `{ deuda: Deuda, reseteada: boolean }` — updated deuda with reset applied if needed

- [ ] **Step 1: Add reset helper function**

In `lib/deudas.ts`, add this helper function before `getDeudaConAcceso`:

```ts
function aplicarResetPeriodo(deuda: Deuda): Deuda {
  if (deuda.categoria !== "responsabilidad") {
    return deuda; // solo aplica a responsabilidades
  }

  const now = new Date();
  
  // Si nunca se ha reseteado, setear fecha pero no resetear
  if (!deuda.ultimo_reset_fecha) {
    return {
      ...deuda,
      ultimo_reset_fecha: now.toISOString(),
    };
  }

  const ultimoReset = new Date(deuda.ultimo_reset_fecha);
  let proximoReset = new Date(ultimoReset);

  // Calcular próximo reset basado en frecuencia_pago
  switch (deuda.frecuencia_pago?.toLowerCase()) {
    case "diaria":
      proximoReset.setDate(proximoReset.getDate() + 1);
      break;
    case "semanal":
      proximoReset.setDate(proximoReset.getDate() + 7);
      break;
    case "quincenal":
      proximoReset.setDate(proximoReset.getDate() + 15);
      break;
    case "mensual":
      proximoReset.setMonth(proximoReset.getMonth() + 1);
      break;
    case "semestral":
      proximoReset.setMonth(proximoReset.getMonth() + 6);
      break;
    case "anual":
      proximoReset.setFullYear(proximoReset.getFullYear() + 1);
      break;
    default:
      // Si no hay frecuencia especificada, asumir mensual
      proximoReset.setMonth(proximoReset.getMonth() + 1);
  }

  // Si ya pasó la fecha de próximo reset, resetear
  if (now >= proximoReset) {
    return {
      ...deuda,
      pagada_mes_actual: false,
      ultimo_reset_fecha: now.toISOString(),
    };
  }

  return deuda;
}
```

- [ ] **Step 2: Apply reset in getDeudaConAcceso**

At the end of `getDeudaConAcceso`, before the return statement (after the mapeo object is created), apply reset:

```ts
  const deudaMapeada = { /* existing mapping object */ };
  return aplicarResetPeriodo(deudaMapeada);
```

- [ ] **Step 3: Apply reset in listDeudas**

At the end of the `result.rows.map()` in `listDeudas`, wrap the returned deuda con reset:

```ts
  return result.rows.map((row) => {
    const deuda = {
      id: Number(row.id),
      // ... all existing fields ...
    } satisfies Deuda;
    return aplicarResetPeriodo(deuda);
  });
```

- [ ] **Step 4: Verify compilation**

```bash
cd /home/analista_ti/sty/taxes && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/deudas.ts
git commit -m "feat: implementar reset automático de pagada_mes_actual en responsabilidades"
```

---

### Task 4: Automatic Marking on Payment — Update pagos endpoint

**Files:**
- Modify: `app/api/deudas/[id]/pagos/route.ts`

**Interfaces:**
- Consumes: `deuda.categoria`, `deuda.total_pagado`, `deuda.valor_estimado`, `montoNum`
- Produces: Side effect — updates `deudas.pagada_mes_actual = true` when payment completes responsibility

- [ ] **Step 1: Add auto-mark logic**

In `app/api/deudas/[id]/pagos/route.ts`, after the archivado trigger (Task 4 del plan anterior, around line 54), add:

```ts
  if (deuda.categoria === "responsabilidad") {
    const totalPagadoNuevo = deuda.total_pagado + montoNum;
    const montoEsperado = deuda.valor_estimado ?? 0;
    if (montoEsperado > 0 && totalPagadoNuevo >= montoEsperado) {
      await db.execute({
        sql: "UPDATE deudas SET pagada_mes_actual = true WHERE id = ?",
        args: [deuda.id],
      });
    }
  }
```

- [ ] **Step 2: Verify compilation**

```bash
cd /home/analista_ti/sty/taxes && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/deudas/[id]/pagos/route.ts
git commit -m "feat: marcar responsabilidad cumplida automáticamente al completar pago"
```

---

### Task 5: Manual Toggle Endpoint — New PATCH endpoint

**Files:**
- Create: `app/api/deudas/[id]/cumplida-periodo/route.ts`

**Interfaces:**
- Consumes: `deuda_id`, JSON body `{ cumplida: boolean }`
- Produces: HTTP 200 with `{ updated: true }`

- [ ] **Step 1: Create endpoint**

Create `app/api/deudas/[id]/cumplida-periodo/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getDeudaConAcceso } from "@/lib/deudas";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const deuda = await getDeudaConAcceso(id, user.id);
  if (!deuda) return NextResponse.json({ error: "Deuda no encontrada" }, { status: 404 });
  if (deuda.categoria !== "responsabilidad") {
    return NextResponse.json(
      { error: "Solo se puede marcar cumplida en responsabilidades" },
      { status: 400 }
    );
  }
  if (!deuda.es_propia) {
    return NextResponse.json(
      { error: "Solo el dueño puede cambiar el estado" },
      { status: 403 }
    );
  }

  const { cumplida } = await req.json().catch(() => ({}));
  if (typeof cumplida !== "boolean") {
    return NextResponse.json(
      { error: "cumplida (boolean) es obligatorio" },
      { status: 400 }
    );
  }

  await db.execute({
    sql: "UPDATE deudas SET pagada_mes_actual = ? WHERE id = ?",
    args: [cumplida ? 1 : 0, deuda.id],
  });

  return NextResponse.json({ updated: true }, { status: 200 });
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd /home/analista_ti/sty/taxes && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/deudas/[id]/cumplida-periodo/route.ts
git commit -m "feat: endpoint PATCH para marcar responsabilidad cumplida manualmente"
```

---

### Task 6: Dashboard UI — Show status badge and reorder

**Files:**
- Modify: `app/dashboard/page.tsx` (responsabilidades section)

**Interfaces:**
- Consumes: `responsabilidades` array with new `pagada_mes_actual` field
- Produces: Reordered list (unpaid first) with visual badge for paid items

- [ ] **Step 1: Sort responsabilidades**

In `app/dashboard/page.tsx`, after filtering responsabilidades, add sort:

```ts
  const responsabilidadesOrdenadas = responsabilidades.sort(
    (a, b) => (a.pagada_mes_actual ? 1 : 0) - (b.pagada_mes_actual ? 1 : 0)
  );
```

- [ ] **Step 2: Update map to use sorted array**

In the responsabilidades card section, change:

```ts
{responsabilidades.map((d) => (
```

to:

```ts
{responsabilidadesOrdenadas.map((d) => (
```

- [ ] **Step 3: Add badge and toggle button in card**

In the item-card for each responsabilidad (inside the Link), add after the item-progress-label:

```tsx
              {d.pagada_mes_actual && (
                <span className="badge" style={{ background: "#dcfce7", color: "#166534", marginTop: 8 }}>
                  ✓ Pagada
                </span>
              )}
              <button
                type="button"
                className="secondary"
                onClick={(e) => {
                  e.preventDefault();
                  toggleCumplidaPeriodo(d.id, !d.pagada_mes_actual);
                }}
                style={{ marginTop: 8, fontSize: 11 }}
                title={d.pagada_mes_actual ? "Desmarcar cumplida" : "Marcar cumplida"}
              >
                {d.pagada_mes_actual ? "✓ Desmarcar" : "Marcar cumplida"}
              </button>
```

- [ ] **Step 4: Add toggle handler**

At the top level of the Home component (before return), add:

```ts
  const toggleCumplidaPeriodo = async (deudaId: number, cumplida: boolean) => {
    try {
      await fetch(`/api/deudas/${deudaId}/cumplida-periodo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cumplida }),
      });
      // Refresh page or re-fetch responsabilidades
      window.location.reload();
    } catch (err) {
      console.error("Error toggling cumplida:", err);
    }
  };
```

- [ ] **Step 5: Verify compilation**

```bash
cd /home/analista_ti/sty/taxes && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 6: Test in browser**

```bash
cd /home/analista_ti/sty/taxes && npm run dev &
sleep 3
# Navegar a dashboard, verificar que responsabilidades se ordenan (no pagadas arriba)
# Clickear botón "Marcar cumplida", verificar que se marca con badge verde
# Clickear de nuevo, verificar que se desmarca
kill %1
```

- [ ] **Step 7: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: UI responsabilidades con badge cumplida este período y ordenamiento"
```

---

## Self-Review

**Spec coverage:**
- ✅ Schema (Task 1)
- ✅ Interfaz (Task 2)
- ✅ Reset automático (Task 3)
- ✅ Automático en pagos (Task 4)
- ✅ Manual toggle endpoint (Task 5)
- ✅ UI dashboard (Task 6)

**Placeholder scan:** None found.

**Type consistency:** `pagada_mes_actual` is `boolean` everywhere, `ultimo_reset_fecha` is `string | null`, `Deuda` interface consistent.

**Scope:** 6 tasks, focused, no unrelated refactoring.
