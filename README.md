# POS App — FotoStudio

Punto de venta (Next.js 16 + NextAuth v5 + Prisma + Supabase) con entorno de
desarrollo 100 % local sobre Docker.

## Requisitos

- Docker Desktop (o Docker Engine + Compose)
- Node.js ≥ 20

## Arranque rápido (todo en Docker)

```bash
npm install                 # instala deps (incluye la CLI de Supabase)

# 1. Levanta el stack local de Supabase (Postgres, API, Storage, Studio)
npm run supabase:start

# 2. Aplica migraciones y datos demo (solo la primera vez o tras un reset)
npx prisma migrate deploy
npm run db:seed

# 3. Construye y levanta la app en Docker
npm run docker:up
```

- App: http://localhost:3000
- Supabase API: http://localhost:54321
- Supabase Studio: http://localhost:54323
- Postgres local: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

Credenciales demo:

| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@fotostudio.mx | admin123 |
| Cajero | cajero@fotostudio.mx | cajero123 |
| Editor | editor@fotostudio.mx | editor123 |

## Variables de entorno

- `.env` — desarrollo en el host (`npm run dev`, comandos de Prisma). Apunta a
  `127.0.0.1:54321/54322`.
- `.env.docker` — la app dentro de Docker. Usa `host.docker.internal` para
  llegar al Supabase local; `NEXT_PUBLIC_SUPABASE_URL` sigue siendo
  `http://localhost:54321` porque es la URL que ve el navegador.
- `.env.docker.example` — plantilla versionada; copia a `.env.docker` y genera
  tu `NEXTAUTH_SECRET`.

Las llaves (`SUPABASE_SERVICE_ROLE_KEY`, etc.) son las llaves demo compartidas
de la CLI de Supabase — solo sirven en local, no usar en producción.

## Comandos útiles

```bash
npm run dev              # dev server en el host (usa .env)
npm run docker:up        # build + up de la app en Docker
npm run docker:logs      # logs del contenedor
npm run docker:down      # detener la app
npm run supabase:stop    # detener el stack de Supabase
npm run supabase:status  # URLs y llaves del stack local

npm run db:migrate       # nueva migración (dev)
npm run db:seed          # datos demo
```

> Nota: el login se valida contra **Supabase Auth**. Los usuarios demo se dan
> de alta ahí con el seed. Si creas un usuario en Studio → Authentication
> (con "Auto Confirm" activado), podrá entrar a la app: en su primer login se
> le crea el perfil con rol de `user_metadata.role` o CAJERO por defecto.

### Pases digitales (Passcreator)

Los doctores afiliados pueden agregar su monedero a Apple/Google Wallet y
canjear su saldo en tienda (página **/canje**, el cajero escanea el QR del
pase). Para activar los pases:

1. Crea una cuenta en [passcreator.com](https://www.passcreator.com) y genera
   un API key (Settings → API).
2. Crea una plantilla de pase tipo *store card* con los campos dinámicos
   `First Name`, `Last Name` e `ID`, usando `storedValue` para el saldo y
   código QR con valor dinámico.
3. Copia el API key y el UID de la plantilla a `PASSCREATOR_API_KEY` y
   `PASSCREATOR_TEMPLATE_ID` en `.env` y `.env.docker`.

La integración usa el **API v3** de Passcreator (`POST/PATCH /api/v3/pass`).

Sin estas variables, el botón del pase se oculta pero el canje por código
sigue funcionando.

## Notas de arquitectura

- Prisma define el esquema y las migraciones; en runtime todas las consultas
  van por el cliente de Supabase (`getSupabaseAdmin()` en
  `src/lib/supabase-admin.ts`).
- La migración `20260713000000_grant_supabase_data_api` otorga permisos a
  `service_role` sobre las tablas de `public` (la CLI de Supabase ya no expone
  automáticamente tablas creadas por `postgres`).
- El bucket de Storage `productos` se crea automáticamente al hacer
  `supabase start` (declarado en `supabase/config.toml`).
- Dentro de Docker, el servidor usa `SUPABASE_URL` (interna) y las URLs
  públicas de Storage se re-escriben con `toPublicUrl()`.
