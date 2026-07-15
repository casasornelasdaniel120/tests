-- Bucket de imágenes de productos (usado por POST /api/upload).
-- En local también lo declara supabase/config.toml; este insert es idempotente
-- y garantiza que exista en la nube, donde config.toml no aplica.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'productos',
  'productos',
  true,
  5242880, -- 5 MiB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
