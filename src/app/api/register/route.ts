import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Registro público de doctores afiliados. La cuenta nace activa pero con 0%
// de comisión: no genera abonos hasta que la admin le configure su %.
export async function POST(req: Request) {
  const body = await req.json() as { name?: string; email?: string; password?: string };
  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!name || name.length < 3) {
    return NextResponse.json({ error: "Escribe tu nombre completo" }, { status: 400 });
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Correo inválido" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: authUser, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: "AFILIADO" },
    });
  if (authError || !authUser.user) {
    const msg = /already/i.test(authError?.message ?? "")
      ? "Ya existe una cuenta con ese correo"
      : authError?.message ?? "No se pudo crear la cuenta";
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  const { error } = await supabase.from("User").insert({
    id: authUser.user.id,
    name,
    email,
    role: "AFILIADO",
    commissionPct: 0,
    updatedAt: new Date().toISOString(),
  });

  if (error) {
    await supabase.auth.admin.deleteUser(authUser.user.id);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
