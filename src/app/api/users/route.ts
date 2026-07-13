import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("User")
    .select("id, name, email, role, active, createdAt")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json() as { name: string; email: string; password: string; role: string };
  const supabase = getSupabaseAdmin();

  // El usuario se crea en Supabase Auth; la tabla User guarda el perfil/rol
  const { data: authUser, error: authError } =
    await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { name: body.name, role: body.role },
    });
  if (authError || !authUser.user) {
    return NextResponse.json(
      { error: authError?.message ?? "No se pudo crear el usuario" },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from("User")
    .insert({
      id: authUser.user.id,
      name: body.name,
      email: body.email,
      role: body.role,
      updatedAt: new Date().toISOString(),
    })
    .select("id, name, email, role, active, createdAt")
    .single();

  if (error) {
    await supabase.auth.admin.deleteUser(authUser.user.id);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
