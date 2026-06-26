# Spec: Calendario de Pagos + Cuentas de Crédito

**Fecha:** 2026-06-26  
**Estado:** Aprobado

---

## Contexto

El usuario adquirió dos cuentas NU (ahorros y crédito amparada). Necesita:
1. Modelar cuentas de crédito con día de pago en el sistema existente.
2. Un calendario de responsabilidades con vista mensual/lista que muestre pagos pendientes y pagados, con navegación a la deuda para registrar el pago.

---

## Cambios de Schema

### Tabla `deudas` (extensión)
```sql
ALTER TABLE deudas ADD COLUMN dia_pago INTEGER;   -- día del mes (1-31)
ALTER TABLE deudas ADD COLUMN mes_pago INTEGER;   -- solo para frecuencia='anual' (1-12)
```
La columna `frecuencia_pago` existente agrega el valor `'anual'` como opción válida.

### Tabla `cuentas` (extensión)
```sql
ALTER TABLE cuentas ADD COLUMN es_credito INTEGER DEFAULT 0;    -- boolean
ALTER TABLE cuentas ADD COLUMN dia_pago_credito INTEGER;        -- día de pago (ej: 10)
```

### Sin tabla nueva
El estado pagado/pendiente en el calendario se deriva de la tabla `pagos` existente. No se crea `calendario_registros`.

---

## Lógica de Generación de Ocurrencias

Para cada responsabilidad (`categoria = 'responsabilidad'`) con `dia_pago` definido, se generan ocurrencias:

| Frecuencia   | Lógica de ocurrencia                                         |
|--------------|--------------------------------------------------------------|
| `mensual`    | Día `dia_pago` de cada mes                                   |
| `quincenal`  | Día 15 y día 30 (o último día del mes) de cada mes          |
| `semestral`  | Día `dia_pago` cada 6 meses desde `created_at`              |
| `anual`      | Día `dia_pago` del mes `mes_pago` cada año                  |

### Estado pagado/pendiente
Una ocurrencia se considera **pagada** si existe al menos un registro en `pagos` para esa `deuda_id` con `fecha_pago` dentro del período correspondiente:

- `mensual` / `quincenal` → mismo mes y año de la ocurrencia
- `semestral` → dentro del semestre natural (ene-jun / jul-dic)
- `anual` → mismo año de la ocurrencia

### Función `generarOcurrencias(responsabilidades, mes, año)`
Devuelve un array de eventos `{ deuda_id, nombre, monto_estimado, fecha, pagado }` para un mes dado. Se implementa en `lib/calendario.ts`.

---

## UI

### Nueva página `/calendario`

- Toggle en esquina superior derecha para alternar entre **vista grilla** y **vista lista**.
- Muestra el mes actual por defecto. Navegación con flechas `< >` a meses anteriores/siguientes.

**Vista grilla:**
- Cuadrícula mensual estándar (7 columnas, semanas como filas).
- Cada día con eventos muestra dots de colores apilados: 🔴 pendiente, 🟢 pagado.
- Si el día tiene múltiples responsabilidades, se apilan los dots con tooltip del nombre.

**Vista lista:**
- Eventos del mes ordenados por día, agrupados por fecha.
- Cada evento muestra: nombre, monto estimado, badge de estado (Pendiente / Pagado).
- Los días sin eventos no aparecen.

**Interacción:**
- Click en cualquier evento (en ambas vistas) → redirige a `/deudas/[id]`.
- El registro del pago se hace en la página de deuda existente.

### Actualización en `/finanzas` — Cuentas
- Las cuentas con `es_credito = true` muestran un badge **"Pago: día X"** junto al nombre.
- El formulario de nueva cuenta incluye checkbox "¿Es tarjeta de crédito?" que habilita el campo "Día de pago".

### Actualización en formulario de responsabilidades
- Nuevos campos al crear/editar una responsabilidad: **"Día de pago"** (número 1-31) y, si la frecuencia es anual, **"Mes de vencimiento"** (selector de mes).
- La opción `anual` se agrega al selector de frecuencia existente.

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `scripts/migrate-calendario.mjs` | Nueva migración con ALTER TABLE para `deudas` y `cuentas` |
| `lib/finanzas.ts` | Agregar `es_credito` y `dia_pago_credito` a queries de cuentas |
| `lib/deudas.ts` | Agregar `dia_pago` y `mes_pago` a queries de responsabilidades |
| `lib/calendario.ts` | Nueva: función `generarOcurrencias()` |
| `app/calendario/page.tsx` | Nueva página con toggle grilla/lista |
| `components/CalendarioGrilla.tsx` | Nueva: vista cuadrícula mensual |
| `components/CalendarioLista.tsx` | Nueva: vista lista mensual |
| `components/NuevaCuenta.tsx` | Agregar campos de crédito |
| `components/NuevaDeuda.tsx` | Agregar `dia_pago`, `mes_pago`, opción `anual` |
| `app/finanzas/page.tsx` | Mostrar badge de día de pago en cuentas crédito |

---

## Fuera de Alcance

- Notificaciones push o email de recordatorio (futuro).
- Marcar pagado directamente desde el calendario con checkbox (el pago se registra en `/deudas/[id]`).
- Soporte para responsabilidades sin `dia_pago` definido (no aparecen en el calendario).
