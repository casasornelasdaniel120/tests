import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { Role } from "@prisma/client";

const ROLES: Role[] = ["ADMIN", "CAJERO", "EDITOR"];

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Cliente aparte solo para validar credenciales: signInWithPassword
        // deja la sesión del usuario en el cliente y las queries siguientes
        // perderían los privilegios de service_role.
        const authClient = getSupabaseAdmin();
        const supabase = getSupabaseAdmin();

        // Las credenciales se validan contra Supabase Auth (auth.users)
        const { data: authData, error: authError } =
          await authClient.auth.signInWithPassword({
            email: credentials.email as string,
            password: credentials.password as string,
          });
        if (authError || !authData.user) return null;

        // El perfil (rol, nombre, activo) vive en la tabla User
        let { data: user } = await supabase
          .from("User")
          .select("id, name, email, role, active")
          .eq("email", credentials.email as string)
          .single();

        // Usuarios creados solo en Supabase Auth (p. ej. desde Studio) se
        // aprovisionan aquí en su primer login. El rol puede fijarse en
        // user_metadata.role; si no, queda como CAJERO.
        if (!user) {
          const meta = authData.user.user_metadata ?? {};
          const role = ROLES.includes(meta.role) ? (meta.role as Role) : "CAJERO";
          const { data: created } = await supabase
            .from("User")
            .insert({
              id: authData.user.id,
              name: meta.name ?? (credentials.email as string).split("@")[0],
              email: credentials.email as string,
              role,
              active: true,
              updatedAt: new Date().toISOString(),
            })
            .select("id, name, email, role, active")
            .single();
          user = created;
        }

        if (!user || !user.active) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: Role }).role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
});
