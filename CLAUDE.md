# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # next build
npm run lint         # ESLint

npm run db:new       # Create a new empty migration in supabase/migrations
npm run db:migrate   # Apply pending migrations to the LOCAL database (supabase migration up)
npm run db:push      # Apply pending migrations to the LINKED CLOUD project (supabase db push)
npm run db:seed      # Seed database with demo data (supabase/seed.ts, uses .env)

npm run supabase:start   # Local Supabase stack in Docker (API :54321, DB :54322, Studio :54323)
npm run supabase:stop    # Stop the local Supabase stack
npm run docker:up        # Build + run the app container (docker compose)
npm run docker:down      # Stop the app container
```

### Local development
The full stack runs locally: `supabase start` brings up Postgres/API/Storage in Docker (bucket `productos` is declared in `supabase/config.toml` AND created idempotently by migration `20260714000000_storage_bucket_productos`), then `db:migrate` + `db:seed` populate it. `.env` targets the local stack from the host; `.env.docker` is used by the app container (reaches Supabase via `host.docker.internal`, while `NEXT_PUBLIC_SUPABASE_URL` stays `http://localhost:54321` for browser-facing URLs — `toPublicUrl()` in `src/lib/supabase-admin.ts` rewrites storage URLs). Migration `20260713000000_grant_supabase_data_api` grants `service_role` access to tables created by `postgres` (the Supabase Data API no longer auto-exposes them).

**IMPORTANT — the app container (`localhost:3000`) is a production build**: it does NOT pick up code changes until rebuilt with `npm run docker:up`.

No test suite is configured. Playwright is installed as a dev dependency but has no test files yet.

## Architecture

### Stack
- **Next.js 16** (App Router) — see `node_modules/next/dist/docs/` for API specifics; this version has breaking changes from prior releases
- **NextAuth v5 beta** (`next-auth@^5.0.0-beta.31`) — JWT sessions; credentials are verified against **Supabase Auth** (`signInWithPassword`)
- **Supabase CLI migrations** — plain SQL files in `supabase/migrations/`; the CLI owns schema and migration history (no ORM)
- **Supabase JS client** — all runtime database reads/writes go through `getSupabaseAdmin()` using the service role key
- **Tailwind CSS v4** — configured via PostCSS; custom design tokens in `globals.css`
- **Zustand** — available but not yet wired to any store

### Schema & Migrations (Supabase CLI)
The schema lives entirely in `supabase/migrations/*.sql` (hand-written SQL; Prisma was removed). Migration history is tracked by the Supabase CLI in `supabase_migrations.schema_migrations`. The project is linked to cloud project `jmotdsmqgjogezfdixst` ("pos").

Workflow for schema changes: `npm run db:new <name>` → write SQL in the generated file → `npm run db:migrate` (applies to local) → `npm run db:push` (applies to cloud). Inserts from API routes must generate `id` (`createId()` from `@paralleldrive/cuid2`) and set `updatedAt` manually — the DB has no defaults for them (legacy of the Prisma-owned schema).

DB enum types (`Role`, `PaymentMethod`, `WalletTxType`) are mirrored as TypeScript unions in `src/types/index.ts` — keep them in sync when a migration alters an enum.

At runtime every API route calls Supabase via the service role client from `src/lib/supabase-admin.ts`. When adding new queries: use `getSupabaseAdmin()`.

### Auth & Role Guard
`src/lib/auth.ts` exports `{ handlers, signIn, signOut, auth }` from NextAuth. The `auth()` function is the primary way to get the session in Server Components and Route Handlers.

Credentials live in **Supabase Auth** (`auth.users`): `authorize()` calls `supabase.auth.signInWithPassword`, then loads the profile/role from the `User` table by email. Users that exist only in Supabase Auth (e.g. created in Studio) are auto-provisioned into `User` on first login (role from `user_metadata.role`, default CAJERO). The users API (`/api/users`) creates/updates/deletes in Supabase Auth via `auth.admin.*`; `User.password` is legacy and nullable.

Four roles (Postgres enum `Role`, mirrored in `src/types/index.ts`):

| Role | Access |
|------|--------|
| `ADMIN` | Everything (incl. `/afiliados`) |
| `CAJERO` | POS (`/pos`), cash register (`/caja`) |
| `EDITOR` | Clients (`/clientes`), products (`/productos`) |
| `AFILIADO` | Only `/monedero` (affiliate dentist wallet dashboard) |

`homeFor(role)` in `src/lib/roles.ts` is the canonical post-login/unauthorized-redirect target per role — use it in page guards instead of hardcoding paths.

**`src/proxy.ts`** (Next 16's renamed middleware — do NOT create a `middleware.ts`) is the outermost gate: it whitelists `PUBLIC_PATHS` (login, registro), redirects anonymous users to `/login`, and enforces `ROLE_PATHS` per prefix. When adding a page route, register it there AND add the page-level guard; forgetting the proxy entry silently redirects anonymous visitors to `/login`.

Role guards are applied at two levels:
1. **Page level** — server components redirect unauthorized roles (e.g. `/pos/page.tsx` redirects EDITORs to `/clientes`)
2. **API level** — every route handler checks `session.user.role`

### Route Structure

```
src/app/
  (auth)/login/          ← public login page
  (dashboard)/           ← protected; layout wraps all with Sidebar + session check
    pos/                 ← POS terminal (ADMIN, CAJERO)
    clientes/            ← client list + detail (ADMIN, EDITOR)
    productos/           ← product list + detail (ADMIN, EDITOR)
    caja/                ← cash register / daily report (ADMIN, CAJERO)
    usuarios/            ← user management (ADMIN only)
  api/
    auth/[...nextauth]/  ← NextAuth handler
    products/            ← GET (all roles), POST/PATCH/DELETE (ADMIN, EDITOR)
    categories/          ← GET (all roles), POST/PATCH/DELETE (ADMIN, EDITOR); rename cascades to products, delete blocked while in use
    clients/             ← GET (all roles), POST/PATCH/DELETE (ADMIN, EDITOR)
    sales/               ← GET (all roles), POST (ADMIN, CAJERO)
    users/               ← GET/POST/PATCH (ADMIN only)
    cash-register/       ← GET daily summary (ADMIN, CAJERO)
    upload/              ← POST image to Supabase Storage bucket "productos"
```

### POS Flow
`POSScreen` (client component) orchestrates the entire point-of-sale:
1. Loads active products from `/api/products?active=true` on mount
2. Manages cart state locally (`CartItem[]`) with per-item and global discounts
3. `PaymentModal` collects split-payment entries (`PaymentEntry[]`)
4. On confirm → POST to `/api/sales` → receives `SaleWithDetails` back
5. `TicketPreview` renders the receipt (printable via `react-to-print`)

`Sale` total = subtotal − per-item discounts − global discount. A sale can have multiple `SalePayment` rows (split payment across methods).

### Affiliates (referral dentists)
Dentists self-register at `/registro` (public) → AFILIADO account with `commissionPct = 0` (no earnings until ADMIN sets their % in `/afiliados`). At checkout the POS `PaymentModal` offers a "¿Viene de parte de un doctor?" selector; `POST /api/sales` freezes the % into `Sale.commissionAmount` and credits a `WalletTransaction` (type `COMISION`). Wallet balance = SUM of `WalletTransaction.amount` (COMISION positive, PAGO negative — payouts are registered manually by ADMIN via `POST /api/affiliates/[id]/payout`). The affiliate sees balance/referrals at `/monedero` (`GET /api/wallet`).

**PostgREST gotcha:** `Sale` has two FKs to `User` (`userId`, `affiliateId`) — every embed must disambiguate: `user:User!Sale_userId_fkey(...)`, `affiliate:User!Sale_affiliateId_fkey(...)`.

### Digital wallet passes (Passcreator)
Each affiliate can add a pass to Apple/Google Wallet (button in `/monedero` → `POST /api/wallet/pass`). The pass shows name/balance/% and a QR carrying `User.walletToken` (generated lazily, unique). In-store redemption: `/canje` page (ADMIN, CAJERO) → scan QR → `GET /api/wallet/scan?token=` → `POST /api/wallet/redeem` (creates a negative `PAGO` tx). `src/lib/passcreator.ts` wraps the Passcreator REST **API v3** (`POST /api/v3/pass?async=false` to create, `PATCH /api/v3/pass/{id}` to update `storedValue` on balance changes — called best-effort from sales/payout/redeem; the v1 endpoints return `null`/HTML for this account, do not use them). Requires `PASSCREATOR_API_KEY` + `PASSCREATOR_TEMPLATE_ID`; the template defines dynamic fields `First Name`, `Last Name`, `ID` and uses `storedValue` for the balance. Without credentials the pass button hides and QR redemption still works (token is in the DB, not the pass).

### Categories
Product categories live in the `Category` table (`name` is the PK). `Product.category` is a FK with `ON UPDATE CASCADE` (renames propagate to products) and `ON DELETE RESTRICT` (deleting an in-use category returns 409). Managed from the "Categorías" modal in `/productos` (`CategoryManager`); `ProductForm` loads the select options from `/api/categories`.

### Design Tokens
Custom colors are CSS variables defined in `src/app/globals.css` and exposed to Tailwind via `@theme inline`. Use these token names in classes:

- `bg-bg-base`, `bg-bg-surface`, `bg-bg-elevated`
- `text-text-primary`, `text-text-secondary`
- `border-border`
- `text-gold` / `bg-gold` — primary brand green (#15803d), despite the name
- `text-cta` / `bg-cta` — blue CTA (#2563eb)
- `text-rose` / `bg-rose` — destructive/alert red

### Image Uploads
`POST /api/upload` accepts `multipart/form-data` with a `file` field, stores to the Supabase Storage bucket `"productos"`, and returns `{ url }`. Max 5 MB; allowed types: jpeg, png, webp, gif.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key for server-side Supabase client |
| `NEXTAUTH_SECRET` | JWT signing secret |
| `NEXTAUTH_URL` | Base URL for NextAuth callbacks |
