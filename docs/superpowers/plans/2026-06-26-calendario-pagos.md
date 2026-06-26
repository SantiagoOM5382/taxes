# Calendario de Pagos + Cuentas de Crédito — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar soporte de cuentas de crédito con día de pago, y un calendario mensual de responsabilidades con vistas grilla/lista que muestra estado pagado/pendiente derivado de pagos existentes.

**Architecture:** Se extienden las tablas `deudas` y `cuentas` con columnas nuevas via migración; se agrega `lib/calendario.ts` con la lógica pura de generación de ocurrencias; la UI consume esa lógica en una nueva página `/calendario` con dos componentes intercambiables (grilla y lista). No se crea ninguna tabla nueva — el estado pagado/pendiente se deriva de `pagos` en runtime.

**Tech Stack:** Next.js 15 App Router, TypeScript, Turso/libsql, CSS modules existentes (sin nueva librería de estilos).

## Global Constraints

- Sin librerías de calendario externas — implementar grilla con CSS grid puro.
- Todos los textos en español.
- Seguir el patrón de migración de `scripts/migrate-finanzas.mjs` (batch de SQLite con `db.batch()`).
- Seguir el patrón de API: `getSession()` → validar → operar → `NextResponse.json()`.
- `frecuencia_pago` válidos: `semanal | quincenal | mensual | semestral | anual`.
- Días del calendario: quincenal genera día 15 y último día del mes (usar `new Date(año, mes, 0).getDate()` para el último día).
- Estado pagado: mensual/quincenal → mismo mes+año; semestral → mismo semestre (ene-jun / jul-dic); anual → mismo año.

---

## File Map

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `scripts/migrate-calendario.mjs` | Crear | ALTER TABLE `deudas` y `cuentas` |
| `lib/calendario.ts` | Crear | Tipos + función `generarOcurrencias()` |
| `lib/finanzas.ts` | Modificar | Incluir `es_credito` y `dia_pago_credito` en tipo `Cuenta` y queries |
| `lib/deudas.ts` | Modificar | Incluir `dia_pago` y `mes_pago` en tipo `Deuda` y queries |
| `app/api/cuentas/route.ts` | Modificar | Aceptar `es_credito` y `dia_pago_credito` en POST |
| `app/api/deudas/route.ts` | Modificar | Aceptar `dia_pago`, `mes_pago`, `anual` en POST |
| `app/api/calendario/route.ts` | Crear | GET: devuelve ocurrencias del mes con estado pagado/pendiente |
| `components/NuevaCuenta.tsx` | Modificar | Checkbox crédito + campo día de pago |
| `components/NuevaDeuda.tsx` | Modificar | Campo día de pago + mes de vencimiento + opción anual |
| `components/CalendarioGrilla.tsx` | Crear | Vista cuadrícula mensual |
| `components/CalendarioLista.tsx` | Crear | Vista lista agrupada por día |
| `app/calendario/page.tsx` | Crear | Página con toggle y navegación de mes |
| `app/finanzas/page.tsx` | Modificar | Badge "Pago: día X" en cuentas crédito |

---

### Task 1: Migración de schema

**Files:**
- Create: `scripts/migrate-calendario.mjs`

**Interfaces:**
- Produces: columnas `dia_pago INTEGER`, `mes_pago INTEGER` en `deudas`; columnas `es_credito INTEGER DEFAULT 0`, `dia_pago_credito INTEGER` en `cuentas`

- [ ] **Step 1: Crear script de migración**

```js
// scripts/migrate-calendario.mjs
// Ejecutar: node scripts/migrate-calendario.mjs
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
  "ALTER TABLE deudas ADD COLUMN dia_pago INTEGER",
  "ALTER TABLE deudas ADD COLUMN mes_pago INTEGER",
  "ALTER TABLE cuentas ADD COLUMN es_credito INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE cuentas ADD COLUMN dia_pago_credito INTEGER",
]);

console.log("Migración calendario completada.");
process.exit(0);
```

- [ ] **Step 2: Ejecutar migración**

```bash
node scripts/migrate-calendario.mjs
```

Expected: `Migración calendario completada.`

- [ ] **Step 3: Verificar columnas en DB**

```bash
node -e "
import('@libsql/client').then(async ({createClient}) => {
  const {readFileSync,existsSync} = await import('node:fs');
  if(existsSync('.env.local')) for(const l of readFileSync('.env.local','utf8').split('\n')){const m=l.match(/^([A-Z_]+)=\"?([^\"]*)\"?\$/);if(m)process.env[m[1]]??=m[2];}
  const db=createClient({url:process.env.TURSO_DATABASE_URL,authToken:process.env.TURSO_AUTH_TOKEN});
  const r=await db.execute('PRAGMA table_info(deudas)');
  console.log('deudas:',r.rows.map(x=>x.name));
  const c=await db.execute('PRAGMA table_info(cuentas)');
  console.log('cuentas:',c.rows.map(x=>x.name));
  process.exit(0);
});
"
```

Expected: ver `dia_pago`, `mes_pago` en deudas; `es_credito`, `dia_pago_credito` en cuentas.

- [ ] **Step 4: Commit**

```bash
git add scripts/migrate-calendario.mjs
git commit -m "feat: migración schema — dia_pago en deudas, es_credito en cuentas"
```

---

### Task 2: Tipos y queries — lib/finanzas.ts y lib/deudas.ts

**Files:**
- Modify: `lib/finanzas.ts`
- Modify: `lib/deudas.ts`

**Interfaces:**
- Produces:
  - `Cuenta` ahora incluye `es_credito: boolean`, `dia_pago_credito: number | null`
  - `Deuda` ahora incluye `dia_pago: number | null`, `mes_pago: number | null`
  - `listResponsabilidades(userId): Promise<Responsabilidad[]>` — nuevo export de `lib/deudas.ts`

**Responsabilidad** type:
```ts
export interface Responsabilidad {
  id: number;
  descripcion: string;
  frecuencia_pago: string;
  valor_estimado: number | null;
  dia_pago: number | null;
  mes_pago: number | null;
  created_at: string;
}
```

- [ ] **Step 1: Extender tipo `Cuenta` en `lib/finanzas.ts`**

Buscar el `interface Cuenta` y reemplazar con:

```ts
export interface Cuenta {
  id: number;
  nombre: string;
  tipo: string;
  moneda: string;
  saldo: number;
  estado: EstadoCuenta;
  es_credito: boolean;
  dia_pago_credito: number | null;
}
```

- [ ] **Step 2: Extender `rowToCuenta` en `lib/finanzas.ts`**

Agregar los dos campos al objeto retornado:

```ts
function rowToCuenta(r: Record<string, unknown>): Cuenta {
  const estado = String(r.estado ?? "activa");
  return {
    id: Number(r.id),
    nombre: String(r.nombre),
    tipo: String(r.tipo),
    moneda: String(r.moneda),
    saldo: Number(r.saldo),
    estado: (estado === "inactiva" || estado === "archivada" ? estado : "activa") as EstadoCuenta,
    es_credito: Boolean(Number(r.es_credito ?? 0)),
    dia_pago_credito: r.dia_pago_credito != null ? Number(r.dia_pago_credito) : null,
  };
}
```

- [ ] **Step 3: Extender tipo `Deuda` en `lib/deudas.ts`**

Agregar al `interface Deuda`:

```ts
  dia_pago: number | null;
  mes_pago: number | null;
```

- [ ] **Step 4: Extender `getDeudaConAcceso` y `listDeudas` en `lib/deudas.ts`**

En ambas funciones, agregar los campos al objeto retornado:

```ts
    dia_pago: row.dia_pago != null ? Number(row.dia_pago) : null,
    mes_pago: row.mes_pago != null ? Number(row.mes_pago) : null,
```

- [ ] **Step 5: Agregar `listResponsabilidades` en `lib/deudas.ts`**

Nuevo export al final del archivo:

```ts
export interface Responsabilidad {
  id: number;
  descripcion: string;
  frecuencia_pago: string;
  valor_estimado: number | null;
  dia_pago: number | null;
  mes_pago: number | null;
  created_at: string;
}

export async function listResponsabilidades(userId: string): Promise<Responsabilidad[]> {
  const result = await db.execute({
    sql: `SELECT id, descripcion, frecuencia_pago, valor_estimado, dia_pago, mes_pago, created_at
          FROM deudas
          WHERE user_id = ? AND categoria = 'responsabilidad' AND dia_pago IS NOT NULL
          ORDER BY dia_pago`,
    args: [userId],
  });
  return result.rows.map((r) => ({
    id: Number(r.id),
    descripcion: String(r.descripcion),
    frecuencia_pago: String(r.frecuencia_pago ?? "mensual"),
    valor_estimado: r.valor_estimado != null ? Number(r.valor_estimado) : null,
    dia_pago: r.dia_pago != null ? Number(r.dia_pago) : null,
    mes_pago: r.mes_pago != null ? Number(r.mes_pago) : null,
    created_at: String(r.created_at),
  }));
}
```

- [ ] **Step 6: Verificar que compila sin errores**

```bash
npx tsc --noEmit
```

Expected: sin errores de tipos.

- [ ] **Step 7: Commit**

```bash
git add lib/finanzas.ts lib/deudas.ts
git commit -m "feat: extender tipos Cuenta y Deuda con campos de crédito y dia_pago"
```

---

### Task 3: APIs — cuentas y deudas

**Files:**
- Modify: `app/api/cuentas/route.ts`
- Modify: `app/api/deudas/route.ts`

**Interfaces:**
- Consumes: tipos extendidos de Task 2
- Produces:
  - POST `/api/cuentas` acepta `es_credito?: boolean`, `dia_pago_credito?: number`
  - POST `/api/deudas` acepta `dia_pago?: number`, `mes_pago?: number`, frecuencia `'anual'` válida

- [ ] **Step 1: Modificar POST en `app/api/cuentas/route.ts`**

Reemplazar el body entero de la función `POST`:

```ts
export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { nombre, tipo, moneda, saldo, es_credito, dia_pago_credito } = await req.json().catch(() => ({}));
  const saldoNum = Number(saldo ?? 0);
  if (!nombre || !TIPOS.includes(tipo) || !MONEDAS.includes(moneda) || !Number.isFinite(saldoNum)) {
    return NextResponse.json(
      { error: `nombre, tipo (${TIPOS.join("/")}) y moneda (${MONEDAS.join("/")}) son obligatorios` },
      { status: 400 }
    );
  }

  const esCredito = es_credito ? 1 : 0;
  const diaPago = esCredito && dia_pago_credito != null ? Number(dia_pago_credito) : null;
  if (diaPago !== null && (diaPago < 1 || diaPago > 31 || !Number.isInteger(diaPago))) {
    return NextResponse.json({ error: "dia_pago_credito debe ser un entero entre 1 y 31" }, { status: 400 });
  }

  const result = await db.execute({
    sql: "INSERT INTO cuentas (user_id, nombre, tipo, moneda, saldo, es_credito, dia_pago_credito) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [user.id, nombre, tipo, moneda, saldoNum, esCredito, diaPago],
  });
  return NextResponse.json({ id: Number(result.lastInsertRowid) }, { status: 201 });
}
```

- [ ] **Step 2: Modificar POST en `app/api/deudas/route.ts`**

Cambiar la línea de validación de frecuencia para incluir `'anual'`:

```ts
  const frecuencia = ["semanal", "quincenal", "mensual", "semestral", "anual"].includes(frecuencia_pago)
    ? frecuencia_pago
    : null;
```

Agregar extracción de `dia_pago` y `mes_pago` del body (junto a las otras variables destructuradas):

```ts
  const {
    descripcion,
    acreedor,
    monto_inicial,
    categoria,
    frecuencia_pago,
    valor_estimado,
    tasa_interes,
    fecha_vencimiento,
    dia_pago,
    mes_pago,
  } = await req.json().catch(() => ({}));
```

Antes del INSERT final de la ruta POST, agregar validación:

```ts
  const diaPagoVal = dia_pago != null && dia_pago !== "" ? Number(dia_pago) : null;
  const mesPagoVal = mes_pago != null && mes_pago !== "" ? Number(mes_pago) : null;
  if (diaPagoVal !== null && (diaPagoVal < 1 || diaPagoVal > 31 || !Number.isInteger(diaPagoVal))) {
    return NextResponse.json({ error: "dia_pago debe ser entero entre 1 y 31" }, { status: 400 });
  }
  if (mesPagoVal !== null && (mesPagoVal < 1 || mesPagoVal > 12 || !Number.isInteger(mesPagoVal))) {
    return NextResponse.json({ error: "mes_pago debe ser entero entre 1 y 12" }, { status: 400 });
  }
```

Modificar el INSERT de deudas para incluir los nuevos campos (localizar el INSERT existente y reemplazarlo):

```ts
  await db.execute({
    sql: `INSERT INTO deudas (user_id, descripcion, acreedor, monto_inicial, categoria, frecuencia_pago, valor_estimado, tasa_interes, fecha_vencimiento, dia_pago, mes_pago)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [user.id, descripcion, acreedor || null, monto, cat, frecuencia, estimado, tasa, vence, diaPagoVal, mesPagoVal],
  });
```

- [ ] **Step 3: Verificar que compila**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add app/api/cuentas/route.ts app/api/deudas/route.ts
git commit -m "feat: APIs cuentas y deudas aceptan campos de crédito y dia_pago"
```

---

### Task 4: Lógica de calendario — lib/calendario.ts

**Files:**
- Create: `lib/calendario.ts`

**Interfaces:**
- Consumes: `Responsabilidad` de `lib/deudas.ts`
- Produces:
  ```ts
  export interface EventoCalendario {
    deuda_id: number;
    nombre: string;
    monto_estimado: number | null;
    fecha: string; // YYYY-MM-DD
    pagado: boolean;
  }
  export function generarOcurrencias(
    responsabilidades: Responsabilidad[],
    pagos: { deuda_id: number; fecha_pago: string }[],
    mes: number,  // 0-11
    anio: number
  ): EventoCalendario[]
  ```

- [ ] **Step 1: Crear `lib/calendario.ts`**

```ts
import type { Responsabilidad } from "./deudas";

export interface EventoCalendario {
  deuda_id: number;
  nombre: string;
  monto_estimado: number | null;
  fecha: string; // YYYY-MM-DD
  pagado: boolean;
}

function toISO(anio: number, mes: number, dia: number): string {
  return `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function ultimoDiaMes(anio: number, mes: number): number {
  return new Date(anio, mes + 1, 0).getDate();
}

function semestre(mes: number): number {
  return mes <= 5 ? 0 : 1;
}

// Devuelve qué días del mes (0-indexed) ocurre esta responsabilidad
function diasEnMes(r: Responsabilidad, mes: number, anio: number): number[] {
  if (!r.dia_pago) return [];
  const ult = ultimoDiaMes(anio, mes);

  switch (r.frecuencia_pago) {
    case "mensual":
      return [Math.min(r.dia_pago, ult)];
    case "quincenal":
      return [Math.min(15, ult), ult];
    case "semestral": {
      const creado = new Date(r.created_at);
      const mesInicio = creado.getMonth();
      // Ocurre en meses que son múltiplo de 6 desde el mes de creación
      const diff = (mes - mesInicio + 12) % 12;
      if (diff % 6 !== 0) return [];
      return [Math.min(r.dia_pago, ult)];
    }
    case "anual": {
      if (r.mes_pago == null) return [];
      if (mes !== r.mes_pago - 1) return [];
      return [Math.min(r.dia_pago, ult)];
    }
    default:
      return [];
  }
}

// Determina si una responsabilidad está pagada para una ocurrencia dada
function estaPagada(
  r: Responsabilidad,
  fecha: string,
  pagos: { deuda_id: number; fecha_pago: string }[]
): boolean {
  const pagosDeLaDeuda = pagos.filter((p) => p.deuda_id === r.id);
  if (pagosDeLaDeuda.length === 0) return false;

  const [anioStr, mesStr] = fecha.split("-");
  const anio = Number(anioStr);
  const mes = Number(mesStr) - 1; // 0-indexed

  switch (r.frecuencia_pago) {
    case "mensual":
    case "quincenal":
      return pagosDeLaDeuda.some((p) => {
        const [pa, pm] = p.fecha_pago.split("-");
        return Number(pa) === anio && Number(pm) - 1 === mes;
      });
    case "semestral": {
      const sem = semestre(mes);
      return pagosDeLaDeuda.some((p) => {
        const [pa, pm] = p.fecha_pago.split("-");
        return Number(pa) === anio && semestre(Number(pm) - 1) === sem;
      });
    }
    case "anual":
      return pagosDeLaDeuda.some((p) => p.fecha_pago.startsWith(String(anio)));
    default:
      return false;
  }
}

export function generarOcurrencias(
  responsabilidades: Responsabilidad[],
  pagos: { deuda_id: number; fecha_pago: string }[],
  mes: number,
  anio: number
): EventoCalendario[] {
  const eventos: EventoCalendario[] = [];

  for (const r of responsabilidades) {
    const dias = diasEnMes(r, mes, anio);
    for (const dia of dias) {
      const fecha = toISO(anio, mes, dia);
      eventos.push({
        deuda_id: r.id,
        nombre: r.descripcion,
        monto_estimado: r.valor_estimado,
        fecha,
        pagado: estaPagada(r, fecha, pagos),
      });
    }
  }

  return eventos.sort((a, b) => a.fecha.localeCompare(b.fecha));
}
```

- [ ] **Step 2: Verificar que compila**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add lib/calendario.ts
git commit -m "feat: lib/calendario.ts — generarOcurrencias con estado pagado/pendiente"
```

---

### Task 5: API GET /api/calendario

**Files:**
- Create: `app/api/calendario/route.ts`

**Interfaces:**
- Consumes: `listResponsabilidades` de `lib/deudas.ts`, `generarOcurrencias` de `lib/calendario.ts`
- Produces: `GET /api/calendario?mes=5&anio=2026` → `{ eventos: EventoCalendario[] }`

- [ ] **Step 1: Crear `app/api/calendario/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listResponsabilidades } from "@/lib/deudas";
import { generarOcurrencias } from "@/lib/calendario";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mesParam = Number(searchParams.get("mes") ?? new Date().getMonth());
  const anioParam = Number(searchParams.get("anio") ?? new Date().getFullYear());

  if (!Number.isInteger(mesParam) || mesParam < 0 || mesParam > 11) {
    return NextResponse.json({ error: "mes debe ser 0-11" }, { status: 400 });
  }
  if (!Number.isInteger(anioParam) || anioParam < 2020 || anioParam > 2100) {
    return NextResponse.json({ error: "anio inválido" }, { status: 400 });
  }

  const responsabilidades = await listResponsabilidades(user.id);

  // Obtener todos los pagos relevantes del usuario para las responsabilidades
  const ids = responsabilidades.map((r) => r.id);
  let pagos: { deuda_id: number; fecha_pago: string }[] = [];
  if (ids.length > 0) {
    const placeholders = ids.map(() => "?").join(",");
    const res = await db.execute({
      sql: `SELECT deuda_id, fecha_pago FROM pagos WHERE deuda_id IN (${placeholders})`,
      args: ids,
    });
    pagos = res.rows.map((r) => ({
      deuda_id: Number(r.deuda_id),
      fecha_pago: String(r.fecha_pago),
    }));
  }

  const eventos = generarOcurrencias(responsabilidades, pagos, mesParam, anioParam);
  return NextResponse.json({ eventos });
}
```

- [ ] **Step 2: Verificar que compila**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add app/api/calendario/route.ts
git commit -m "feat: GET /api/calendario devuelve ocurrencias del mes con estado pagado"
```

---

### Task 6: Componentes UI — CalendarioGrilla y CalendarioLista

**Files:**
- Create: `components/CalendarioGrilla.tsx`
- Create: `components/CalendarioLista.tsx`

**Interfaces:**
- Consumes:
  ```ts
  // Props compartidas
  interface CalendarioProps {
    eventos: EventoCalendario[]; // de lib/calendario.ts
    mes: number;   // 0-11
    anio: number;
  }
  ```
- Produces: componentes React que renderizan los eventos y navegan a `/deudas/[id]` al hacer click

- [ ] **Step 1: Crear `components/CalendarioLista.tsx`**

```tsx
"use client";

import Link from "next/link";
import type { EventoCalendario } from "@/lib/calendario";

interface Props {
  eventos: EventoCalendario[];
  mes: number;
  anio: number;
}

export default function CalendarioLista({ eventos }: Props) {
  if (eventos.length === 0) {
    return <p className="sin-datos">No hay responsabilidades con día de pago este mes.</p>;
  }

  // Agrupar por fecha
  const grupos = new Map<string, EventoCalendario[]>();
  for (const ev of eventos) {
    if (!grupos.has(ev.fecha)) grupos.set(ev.fecha, []);
    grupos.get(ev.fecha)!.push(ev);
  }

  const formatFecha = (iso: string) => {
    const [, , d] = iso.split("-");
    return `Día ${Number(d)}`;
  };

  const formatMonto = (m: number | null) =>
    m != null ? `$${m.toLocaleString("es-CO")}` : "Monto variable";

  return (
    <div className="calendario-lista">
      {[...grupos.entries()].map(([fecha, evs]) => (
        <div key={fecha} className="lista-grupo">
          <h3 className="lista-fecha">{formatFecha(fecha)}</h3>
          <ul className="lista-eventos">
            {evs.map((ev) => (
              <li key={`${ev.deuda_id}-${fecha}`} className={`lista-evento ${ev.pagado ? "pagado" : "pendiente"}`}>
                <Link href={`/deudas/${ev.deuda_id}`} className="lista-evento-link">
                  <span className="evento-nombre">{ev.nombre}</span>
                  <span className="evento-monto">{formatMonto(ev.monto_estimado)}</span>
                  <span className={`evento-badge ${ev.pagado ? "badge-pagado" : "badge-pendiente"}`}>
                    {ev.pagado ? "Pagado" : "Pendiente"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Crear `components/CalendarioGrilla.tsx`**

```tsx
"use client";

import Link from "next/link";
import type { EventoCalendario } from "@/lib/calendario";

interface Props {
  eventos: EventoCalendario[];
  mes: number;
  anio: number;
}

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function CalendarioGrilla({ eventos, mes, anio }: Props) {
  const primerDia = new Date(anio, mes, 1).getDay(); // 0=Dom
  const totalDias = new Date(anio, mes + 1, 0).getDate();

  // Indexar eventos por día (número)
  const porDia = new Map<number, EventoCalendario[]>();
  for (const ev of eventos) {
    const dia = Number(ev.fecha.split("-")[2]);
    if (!porDia.has(dia)) porDia.set(dia, []);
    porDia.get(dia)!.push(ev);
  }

  // Celdas: vacías iniciales + días del mes
  const celdas: (number | null)[] = [
    ...Array(primerDia).fill(null),
    ...Array.from({ length: totalDias }, (_, i) => i + 1),
  ];

  return (
    <div className="calendario-grilla">
      <div className="grilla-header">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="grilla-dia-nombre">{d}</div>
        ))}
      </div>
      <div className="grilla-cuerpo">
        {celdas.map((dia, i) => {
          if (dia === null) return <div key={`vacio-${i}`} className="grilla-celda vacia" />;
          const evs = porDia.get(dia) ?? [];
          const tienePendiente = evs.some((e) => !e.pagado);
          const tienePagado = evs.some((e) => e.pagado);
          return (
            <div key={dia} className={`grilla-celda ${evs.length > 0 ? "con-eventos" : ""}`}>
              <span className="celda-numero">{dia}</span>
              {evs.length > 0 && (
                <div className="celda-dots">
                  {tienePendiente && <span className="dot pendiente" title="Pendiente" />}
                  {tienePagado && <span className="dot pagado" title="Pagado" />}
                </div>
              )}
              {evs.length > 0 && (
                <div className="celda-tooltips">
                  {evs.map((ev) => (
                    <Link key={ev.deuda_id} href={`/deudas/${ev.deuda_id}`} className="celda-tooltip-link">
                      <span className={`dot-mini ${ev.pagado ? "pagado" : "pendiente"}`} />
                      {ev.nombre}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verificar que compila**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add components/CalendarioGrilla.tsx components/CalendarioLista.tsx
git commit -m "feat: componentes CalendarioGrilla y CalendarioLista"
```

---

### Task 7: Página /calendario

**Files:**
- Create: `app/calendario/page.tsx`

**Interfaces:**
- Consumes: `CalendarioGrilla`, `CalendarioLista`, `GET /api/calendario`
- Produces: página con toggle vista, navegación de mes, header con mes/año

- [ ] **Step 1: Crear `app/calendario/page.tsx`**

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import CalendarioGrilla from "@/components/CalendarioGrilla";
import CalendarioLista from "@/components/CalendarioLista";
import type { EventoCalendario } from "@/lib/calendario";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default function CalendarioPage() {
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth());
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [vista, setVista] = useState<"grilla" | "lista">("lista");
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    const res = await fetch(`/api/calendario?mes=${mes}&anio=${anio}`);
    if (res.ok) {
      const data = await res.json();
      setEventos(data.eventos);
    }
    setCargando(false);
  }, [mes, anio]);

  useEffect(() => { cargar(); }, [cargar]);

  function anterior() {
    if (mes === 0) { setMes(11); setAnio((a) => a - 1); }
    else setMes((m) => m - 1);
  }

  function siguiente() {
    if (mes === 11) { setMes(0); setAnio((a) => a + 1); }
    else setMes((m) => m + 1);
  }

  return (
    <main className="contenedor">
      <div className="calendario-header">
        <h1>Calendario de pagos</h1>
        <button
          className="btn-toggle-vista"
          onClick={() => setVista((v) => v === "grilla" ? "lista" : "grilla")}
        >
          {vista === "grilla" ? "Ver lista" : "Ver calendario"}
        </button>
      </div>

      <div className="calendario-nav">
        <button onClick={anterior} aria-label="Mes anterior">‹</button>
        <span className="calendario-mes-label">{MESES[mes]} {anio}</span>
        <button onClick={siguiente} aria-label="Mes siguiente">›</button>
      </div>

      {cargando ? (
        <p className="cargando">Cargando...</p>
      ) : vista === "grilla" ? (
        <CalendarioGrilla eventos={eventos} mes={mes} anio={anio} />
      ) : (
        <CalendarioLista eventos={eventos} mes={mes} anio={anio} />
      )}
    </main>
  );
}
```

- [ ] **Step 2: Agregar enlace al calendario en la navegación**

Localizar el archivo de navegación principal (revisar `app/layout.tsx` o `app/dashboard/page.tsx` para el nav) y agregar:

```tsx
<Link href="/calendario">Calendario</Link>
```

- [ ] **Step 3: Verificar que compila**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add app/calendario/page.tsx
git commit -m "feat: página /calendario con toggle grilla/lista y navegación de mes"
```

---

### Task 8: Actualizar formularios UI — NuevaCuenta y NuevaDeuda

**Files:**
- Modify: `components/NuevaCuenta.tsx`
- Modify: `components/NuevaDeuda.tsx`

**Interfaces:**
- Consumes: APIs extendidas de Task 3
- Produces: formularios que envían `es_credito`, `dia_pago_credito`, `dia_pago`, `mes_pago`

- [ ] **Step 1: Modificar `components/NuevaCuenta.tsx`**

Reemplazar el archivo completo:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NuevaCuenta({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [esCredito, setEsCredito] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const res = await fetch("/api/cuentas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: form.get("nombre"),
        tipo: form.get("tipo"),
        moneda: form.get("moneda"),
        saldo: form.get("saldo") || 0,
        es_credito: esCredito,
        dia_pago_credito: esCredito ? form.get("dia_pago_credito") : null,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al crear la cuenta");
      return;
    }
    formEl.reset();
    setEsCredito(false);
    router.refresh();
    onSuccess?.();
  }

  return (
    <form onSubmit={onSubmit}>
      <label>Nombre</label>
      <input name="nombre" placeholder="Nequi, Bancolombia, Binance, Efectivo..." required />
      <label>Tipo</label>
      <select name="tipo" defaultValue="billetera">
        <option value="banco">Banco</option>
        <option value="billetera">Billetera (Nequi, Daviplata...)</option>
        <option value="exchange">Exchange (Binance...)</option>
        <option value="efectivo">Efectivo (bolsillo)</option>
      </select>
      <label>Moneda</label>
      <select name="moneda" defaultValue="COP">
        <option value="COP">COP — Peso colombiano</option>
        <option value="USD">USD — Dólar</option>
        <option value="EUR">EUR — Euro</option>
      </select>
      <label>Saldo actual</label>
      <input name="saldo" type="number" step="any" defaultValue={0} />

      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={esCredito}
          onChange={(e) => setEsCredito(e.target.checked)}
        />
        Es tarjeta de crédito
      </label>

      {esCredito && (
        <>
          <label>Día de pago (1–31)</label>
          <input
            name="dia_pago_credito"
            type="number"
            min="1"
            max="31"
            placeholder="ej. 10"
            required={esCredito}
          />
        </>
      )}

      {error && <p className="error">{error}</p>}
      <button disabled={loading}>{loading ? "Guardando..." : "Agregar cuenta"}</button>
    </form>
  );
}
```

- [ ] **Step 2: Modificar `components/NuevaDeuda.tsx`**

Agregar estado para `frecuencia` y campos condicionales. Reemplazar el archivo completo:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NuevaDeuda({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [categoria, setCategoria] = useState<"deuda" | "responsabilidad">("deuda");
  const [frecuencia, setFrecuencia] = useState("mensual");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/deudas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        descripcion: form.get("descripcion"),
        acreedor: form.get("acreedor"),
        categoria,
        frecuencia_pago: frecuencia,
        monto_inicial: form.get("monto_inicial"),
        valor_estimado: form.get("valor_estimado"),
        tasa_interes: form.get("tasa_interes"),
        fecha_vencimiento: form.get("fecha_vencimiento"),
        dia_pago: form.get("dia_pago") || null,
        mes_pago: frecuencia === "anual" ? form.get("mes_pago") || null : null,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al crear el registro");
      return;
    }
    (e.target as HTMLFormElement).reset?.();
    setCategoria("deuda");
    setFrecuencia("mensual");
    router.refresh();
    onSuccess?.();
  }

  return (
    <form onSubmit={onSubmit}>
      <label>Categoría</label>
      <select
        value={categoria}
        onChange={(e) => setCategoria(e.target.value as "deuda" | "responsabilidad")}
      >
        <option value="deuda">Deuda (tiene monto total y se termina de pagar)</option>
        <option value="responsabilidad">Responsabilidad (pago permanente: arriendo, servicios...)</option>
      </select>

      <label>Descripción</label>
      <input
        name="descripcion"
        placeholder={categoria === "deuda" ? "Préstamo carro" : "Arriendo apartamento"}
        required
      />
      <label>Acreedor / a quién se paga</label>
      <input name="acreedor" placeholder="Santiago" />

      <label>Frecuencia de pago</label>
      <select value={frecuencia} onChange={(e) => setFrecuencia(e.target.value)}>
        <option value="semanal">Semanal</option>
        <option value="quincenal">Quincenal</option>
        <option value="mensual">Mensual</option>
        <option value="semestral">Semestral (cada 6 meses — ej. universidad)</option>
        <option value="anual">Anual (ej. SOAT, impuestos)</option>
      </select>

      {categoria === "deuda" ? (
        <>
          <label>Monto inicial (COP)</label>
          <input name="monto_inicial" type="number" min="1" step="any" required />
          <label>Tasa de interés anual % (opcional)</label>
          <input name="tasa_interes" type="number" min="0" step="any" placeholder="ej. 28.5" />
          <label>Fecha de vencimiento (opcional)</label>
          <input name="fecha_vencimiento" type="date" />
        </>
      ) : (
        <>
          <label>Valor estimado por pago (COP, opcional)</label>
          <input name="valor_estimado" type="number" min="1" step="any" />
        </>
      )}

      {categoria === "responsabilidad" && (
        <>
          <label>Día de pago (1–31)</label>
          <input name="dia_pago" type="number" min="1" max="31" placeholder="ej. 15" />
          {frecuencia === "anual" && (
            <>
              <label>Mes de vencimiento</label>
              <select name="mes_pago">
                <option value="1">Enero</option>
                <option value="2">Febrero</option>
                <option value="3">Marzo</option>
                <option value="4">Abril</option>
                <option value="5">Mayo</option>
                <option value="6">Junio</option>
                <option value="7">Julio</option>
                <option value="8">Agosto</option>
                <option value="9">Septiembre</option>
                <option value="10">Octubre</option>
                <option value="11">Noviembre</option>
                <option value="12">Diciembre</option>
              </select>
            </>
          )}
        </>
      )}

      {error && <p className="error">{error}</p>}
      <button disabled={loading}>{loading ? "Guardando..." : "Crear"}</button>
    </form>
  );
}
```

- [ ] **Step 3: Verificar que compila**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add components/NuevaCuenta.tsx components/NuevaDeuda.tsx
git commit -m "feat: formularios NuevaCuenta y NuevaDeuda con campos crédito y dia_pago"
```

---

### Task 9: Badge de crédito en /finanzas

**Files:**
- Modify: `app/finanzas/page.tsx`

**Interfaces:**
- Consumes: `Cuenta.es_credito`, `Cuenta.dia_pago_credito` de Task 2
- Produces: badge "Pago: día X" visible junto al nombre de la cuenta en la vista de cuentas

- [ ] **Step 1: Localizar dónde se renderizan los nombres de cuentas**

```bash
grep -n "cuenta.nombre\|cuenta\.nombre\|Cuenta\|NuevaCuenta" /home/analista_ti/sty/taxes/app/finanzas/page.tsx | head -30
```

- [ ] **Step 2: Agregar badge junto al nombre de la cuenta**

Buscar el lugar donde se renderiza `cuenta.nombre` en la lista de cuentas activas e inactivas, y agregar el badge después del nombre:

```tsx
{cuenta.nombre}
{cuenta.es_credito && cuenta.dia_pago_credito && (
  <span className="badge-credito">Pago: día {cuenta.dia_pago_credito}</span>
)}
```

- [ ] **Step 3: Verificar que compila**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add app/finanzas/page.tsx
git commit -m "feat: badge día de pago en cuentas de crédito en /finanzas"
```
