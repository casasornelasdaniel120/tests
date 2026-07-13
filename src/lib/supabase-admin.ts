import { createClient } from "@supabase/supabase-js";

// URL que usa el servidor para hablar con Supabase. Dentro de Docker la app
// llega vía SUPABASE_URL (p. ej. http://host.docker.internal:54321); si no
// está definida se usa la URL pública.
const internalUrl = () =>
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;

export function getSupabaseAdmin() {
  return createClient(internalUrl(), process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

// Busca un usuario de Supabase Auth por email (la API admin no filtra por
// email directamente).
export async function findAuthUserByEmail(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  email: string
) {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw new Error(error.message);
    const match = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (match) return match;
    if (data.users.length < 200) break;
  }
  return null;
}

// Convierte una URL generada con el cliente interno (p. ej. de Storage) a la
// URL pública alcanzable desde el navegador.
export function toPublicUrl(url: string) {
  const internal = process.env.SUPABASE_URL;
  const publicBase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (internal && publicBase && internal !== publicBase) {
    return url.replace(internal, publicBase);
  }
  return url;
}
