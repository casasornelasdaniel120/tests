-- Supabase Data API (PostgREST) no expone automáticamente las tablas creadas
-- por el rol `postgres` (Prisma). El cliente de la app usa la service_role key,
-- así que se le otorgan privilegios sobre las tablas existentes y futuras.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT USAGE ON SCHEMA public TO service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
    ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
      GRANT ALL ON TABLES TO service_role;
    ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
      GRANT ALL ON SEQUENCES TO service_role;
  END IF;
END
$$;
