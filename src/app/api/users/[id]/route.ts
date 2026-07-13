import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin, findAuthUserByEmail } from "@/lib/supabase-admin";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json() as { name?: string; email?: string; password?: string; role?: string; active?: boolean };
  const supabase = getSupabaseAdmin();

  const { data: current } = await supabase
    .from("User")
    .select("email")
    .eq("id", id)
    .single();
  if (!current) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  // Email y password viven en Supabase Auth
  if (body.password || (body.email && body.email !== current.email)) {
    const authUser = await findAuthUserByEmail(supabase, current.email);
    if (authUser) {
      const { error: authError } = await supabase.auth.admin.updateUserById(
        authUser.id,
        {
          ...(body.password ? { password: body.password } : {}),
          ...(body.email && body.email !== current.email
            ? { email: body.email, email_confirm: true }
            : {}),
        }
      );
      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 500 });
      }
    }
  }

  const update: Record<string, unknown> = { ...body, updatedAt: new Date().toISOString() };
  delete update.password;

  const { data, error } = await supabase
    .from("User")
    .update(update)
    .eq("id", id)
    .select("id, name, email, role, active")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  if (id === session.user.id) {
    return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: current } = await supabase
    .from("User")
    .select("email")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("User").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (current) {
    const authUser = await findAuthUserByEmail(supabase, current.email);
    if (authUser) await supabase.auth.admin.deleteUser(authUser.id);
  }
  return NextResponse.json({ ok: true });
}
