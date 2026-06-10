# Mis Deudas (taxes)

App web (Next.js + Turso) para llevar deudas y pagos. Cada usuario autenticado ve sus deudas y puede compartir el seguimiento de una deuda con otro usuario registrado (solo lectura: ve pagos, fechas, montos, comprobantes, deuda inicial y actual).

La autenticación la hace el microservicio **auth** (`AUTH_SERVICE_URL`); el token JWT se guarda en una cookie httpOnly y se valida localmente con el mismo `AUTH_JWT_SECRET`.

## Tablas (en Turso)

- `deudas` — descripción, acreedor, monto_inicial, dueño (`user_id`)
- `pagos` — monto, fecha_pago, **comprobante_url** (URL de Firebase Storage)
- `deuda_accesos` — a qué usuarios se les compartió cada deuda
- `users` — la administra el microservicio auth

La deuda actual se calcula: `monto_inicial - SUM(pagos.monto)`.

## Desarrollo local

```bash
npm install
npm run dev   # http://localhost:3000 (el auth debe estar corriendo en :3001)
```

## Comprobantes con Vercel Blob

La subida se hace **desde el servidor** vía `POST /api/deudas/[id]/comprobante` usando [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) (`lib/storage.ts`). El archivo queda en el store con una URL pública impredecible que se guarda en `pagos.comprobante_url`.

Solo requiere la variable `BLOB_READ_WRITE_TOKEN` (se genera en Vercel → proyecto → Storage → Blob). En el deploy de Vercel se inyecta sola al conectar el store; en local va en `.env.local`.

(Antes se usaba Firebase Storage con Admin SDK; se descartó porque activar Storage exige plan Blaze con tarjeta. Las credenciales `FIREBASE_*` quedan en `.env.local` sin uso.)

## Deploy en Vercel

1. Sube este folder a un repo de GitHub e impórtalo en [vercel.com/new](https://vercel.com/new).
2. Variables de entorno:
   - `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
   - `AUTH_JWT_SECRET` (el MISMO del proyecto auth)
   - `AUTH_SERVICE_URL` = URL de Vercel del proyecto auth (ej. `https://mi-auth.vercel.app`)
   - `NEXT_PUBLIC_FIREBASE_*` (cuando tengas Firebase)
3. Deploy.
