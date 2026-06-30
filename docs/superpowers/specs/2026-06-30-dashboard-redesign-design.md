# Dashboard Redesign — Spec

**Date:** 2026-06-30  
**Scope:** `app/dashboard/page.tsx`, `app/layout.tsx` (navbar), `app/globals.css`  
**Goal:** Rediseño visual moderno estilo fintech (estilo A) del dashboard y navbar. No tocar formularios, modales ni otras páginas.

---

## 1. Navbar

**Archivo:** `app/layout.tsx` + clases en `globals.css`

- Fondo `#0f172a` (azul marino profundo), borde inferior `1px solid #1e293b`
- Logo "Mis Deudas": punto de color `#3b82f6` antes del texto (`·  Mis Deudas`)
- Links de nav: color `#94a3b8`, hover `#ffffff` con transición `150ms`
- Avatar circular a la derecha con la inicial del nombre del usuario (fondo `#3b82f6`, texto blanco, `32px`)
- "Salir" como link discreto, no botón

---

## 2. KPI Cards (resumen)

**Archivo:** `app/dashboard/page.tsx`

Tres cards lado a lado (`display: grid; grid-template-columns: repeat(3, 1fr)`), se apilan en móvil.

### Card 1 — Saldo total
- Borde izquierdo `4px solid #22c55e`
- Ícono: 💰 (o SVG billetera)
- Label: "Saldo total" en gris `12px`
- Monto: `28px` bold `#0f172a`
- Subtexto: monedas extranjeras en gris `12px`

### Card 2 — Deuda total
- Borde izquierdo `4px solid #ef4444` si deuda > 0, `4px solid #22c55e` si deuda = 0
- Ícono: ⚠️
- Label: "Deuda total" en gris
- Monto: bold rojo si > 0, verde si = 0

### Card 3 — Crédito disponible
- Borde izquierdo `4px solid #3b82f6`
- Ícono: 💳
- Label: "Crédito disponible" en gris
- Monto principal: cupo disponible en bold
- Subtexto: "X% utilizado de $cupoTotal"
- Barra de progreso horizontal: `height: 4px`, fondo `#e2e8f0`, relleno en rojo proporcional a `cupoUsado/cupoTotal`
- Solo se muestra si el usuario tiene tarjetas de crédito
- Datos vienen de `listCuentas` (ya disponible en el dashboard), filtrar `es_credito === true && limite_credito != null`

---

## 3. Cards de ítems

**Archivo:** `app/dashboard/page.tsx`

Grid de 2 columnas en desktop, 1 en móvil. Cada ítem es una card clickeable.

### Header de sección
```
Deudas (4)          [contador entre paréntesis, mismo h2]
```

### Card de Deuda
- Nombre bold `16px`, acreedor `13px` gris debajo
- Badge de frecuencia (quincenal / mensual / etc.) — color azul claro
- Monto actual bold rojo a la derecha, alineado al top
- Barra de progreso: `height: 6px`, relleno rojo = `(1 - monto_actual/monto_inicial) * 100%` (porcentaje pagado)
- Texto debajo de la barra: "X% pagado" en gris `11px`
- La card entera es un `<Link>` con `href=/deudas/{id}`

### Card de Responsabilidad
- Nombre bold `16px`, a quién `13px` gris
- Badge de frecuencia — color naranja/amarillo
- Valor estimado bold grande a la derecha
- "Pagado históricamente: $X" en gris `12px` debajo del monto
- Sin barra de progreso
- La card entera es un `<Link>`

### Estados vacíos
Mensaje con ícono centrado, texto gris: "No tenés deudas registradas ✓"

---

## 4. CSS — Clases nuevas

Agregar en `globals.css` sin tocar estilos existentes (para no romper otras páginas):

```css
/* KPI grid */
.kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
.kpi-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); border-left: 4px solid transparent; }
.kpi-label { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
.kpi-value { font-size: 28px; font-weight: 700; color: #0f172a; line-height: 1.2; }
.kpi-sub { font-size: 12px; color: #94a3b8; margin-top: 4px; }
.progress-bar { height: 4px; background: #e2e8f0; border-radius: 999px; margin-top: 10px; overflow: hidden; }
.progress-bar-fill { height: 100%; border-radius: 999px; }

/* Item cards grid */
.items-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.item-card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); text-decoration: none; color: inherit; display: block; transition: box-shadow 150ms; border: 1px solid #f1f5f9; }
.item-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.item-card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.item-name { font-size: 15px; font-weight: 700; color: #0f172a; }
.item-sub { font-size: 13px; color: #64748b; margin-top: 2px; }
.item-amount { font-size: 16px; font-weight: 700; text-align: right; white-space: nowrap; }
.item-progress-label { font-size: 11px; color: #94a3b8; margin-top: 6px; }

/* Frecuencia badges */
.freq-badge { display: inline-block; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px; margin-top: 6px; }
.freq-deuda { background: #dbeafe; color: #1e40af; }
.freq-resp { background: #fef3c7; color: #92400e; }

/* Navbar mejorada */
header.topbar { background: #0f172a; border-bottom: 1px solid #1e293b; }
header.topbar .nav-logo { font-weight: 700; font-size: 16px; }
header.topbar .nav-logo span { color: #3b82f6; }
header.topbar .user a { color: #94a3b8; transition: color 150ms; }
header.topbar .user a:hover { color: #fff; }
.avatar { width: 32px; height: 32px; border-radius: 50%; background: #3b82f6; color: #fff; font-size: 14px; font-weight: 700; display: flex; align-items: center; justify-content: center; }

/* Responsive */
@media (max-width: 640px) {
  .kpi-grid { grid-template-columns: 1fr; }
  .items-grid { grid-template-columns: 1fr; }
}
```

---

## 5. Datos adicionales en el dashboard

El dashboard ya llama `listCuentas`. Para la card de crédito, agregar filtro:
```ts
const tarjetas = cuentas.filter(c => c.es_credito && c.limite_credito != null);
const cupoTotal = tarjetas.reduce((s, c) => s + (c.limite_credito ?? 0), 0);
const cupoDisponible = tarjetas.reduce((s, c) => s + Math.max(0, c.saldo), 0);
const cupoUsado = cupoTotal - cupoDisponible;
```

---

## Out of scope

- Formularios, modales, página de detalle de deuda
- Página de Finanzas (la info de crédito se mantiene también allá)
- Calendario, Asesor IA
