# Responsabilidades: Sistema "Cumplida este Período" — Spec

**Date:** 2026-07-21  
**Scope:** Schema (2 columnas nuevas), triggers en pagos, reset automático, UI en dashboard  
**Goal:** Marcar responsabilidades recurrentes como "cumplidas" para el período actual, con reset automático basado en frecuencia de pago.

---

## 1. Schema

Agregar a tabla `deudas` (solo aplica a `categoria = 'responsabilidad'`):

```sql
ALTER TABLE deudas ADD COLUMN pagada_mes_actual BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE deudas ADD COLUMN ultimo_reset_fecha DATETIME;
```

Semántica:
- `pagada_mes_actual`: indica si la responsabilidad se pagó/completó en el período actual
- `ultimo_reset_fecha`: timestamp del último reset automático (NULL inicialmente, se setea en primer uso)

---

## 2. Reset Automático

Sistema detecta cada lectura si es momento de resetear basado en `frecuencia_pago`:

**Duración por frecuencia:**
- `"mensual"` → +1 mes
- `"quincenal"` → +15 días
- `"semanal"` → +7 días
- `"diaria"` → +1 día
- `"semestral"` → +6 meses
- `"anual"` → +12 meses

**Lógica:**
```
Si ultimo_reset_fecha es NULL:
  - Setear ultimo_reset_fecha = NOW()
  - No resetear pagada_mes_actual

Si ultimo_reset_fecha + (duración según frecuencia) <= NOW():
  - Setear pagada_mes_actual = false
  - Setear ultimo_reset_fecha = NOW()
```

**Cuándo se ejecuta:**
- En `listDeudas()` antes de retornar (aplica reset si corresponde)
- En `getDeudaConAcceso()` antes de retornar
- No requiere cron — es lazy reset en lectura

---

## 3. Marcar como Cumplida

### Automático
En endpoint `POST /api/deudas/[id]/pagos`, después de registrar el pago:
```ts
if (deuda.categoria === "responsabilidad") {
  const totalPagadoNuevo = deuda.total_pagado + montoNum;
  if (totalPagadoNuevo >= (deuda.valor_estimado ?? 0)) {
    // Actualizar pagada_mes_actual a true
    await db.execute({
      sql: "UPDATE deudas SET pagada_mes_actual = true WHERE id = ?",
      args: [deuda.id],
    });
  }
}
```

### Manual
Nuevo endpoint `PATCH /api/deudas/[id]/cumplida-periodo`:
```json
{
  "cumplida": true  // o false para desmarcar
}
```

Actualiza `pagada_mes_actual` directamente, sin validar montos.

---

## 4. UI — Dashboard

### Ordenamiento
En `app/dashboard/page.tsx`, después de filtrar responsabilidades:
```ts
const responsabilidadesOrdenadas = responsabilidades.sort(
  (a, b) => (a.pagada_mes_actual ? 1 : 0) - (b.pagada_mes_actual ? 1 : 0)
);
```
Resultado: no pagadas primero, luego pagadas.

### Card visual
En componente de card de responsabilidad (dentro de `.items-grid`):

**Si `pagada_mes_actual = true`:**
- Mostrar badge verde: `✓ Pagada [mes-actual]`
- Card puede tener opacidad reducida (ej: 0.7) para visualmente "deshabilitarla"
- Botón checkmark activo (clickeable para desmarcar)

**Si `pagada_mes_actual = false`:**
- Sin badge
- Card opacidad normal
- Botón checkmark inactivo (clickeable para marcar)

**Botón toggle:**
```tsx
<button 
  className="icon-button"
  onClick={() => toggleCumplidaPeriodo(d.id, !d.pagada_mes_actual)}
  title={pagada_mes_actual ? "Desmarcar cumplida" : "Marcar cumplida"}
>
  ✓
</button>
```

---

## 5. Interfaz Deuda

Actualizar `Deuda` en `lib/deudas.ts`:
```ts
export interface Deuda {
  // ... campos existentes ...
  categoria: "deuda" | "responsabilidad";
  estado: "activa" | "archivada";
  pagada_mes_actual?: boolean;  // opcional, solo para responsabilidades
  ultimo_reset_fecha?: string;  // opcional, solo para responsabilidades
}
```

Mapear en `listDeudas()` y `getDeudaConAcceso()`.

---

## 6. Datos y Restricciones

- `pagada_mes_actual` NO afecta `total_pagado` ni `monto_actual` — es solo flag visual
- Reset automático es silent (sin errores, sin logs especiales)
- Si `valor_estimado = null` (responsabilidad con monto variable), no se marca automáticamente
- Reset automático se ejecuta antes de retornar datos en queries (transparente para caller)

---

## 7. Out of Scope

- Historial de "fue pagada en X período" — solo trackea período actual
- Notificaciones de responsabilidades sin pagar
- Cambio de `frecuencia_pago` después de creada (requeriría recalc de `ultimo_reset_fecha`)
- Archivar responsabilidades (futura feature)
