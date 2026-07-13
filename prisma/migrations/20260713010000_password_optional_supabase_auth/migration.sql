-- Las credenciales ahora se validan en Supabase Auth (auth.users);
-- la columna password queda solo como legado.
ALTER TABLE "public"."User" ALTER COLUMN "password" DROP NOT NULL;
