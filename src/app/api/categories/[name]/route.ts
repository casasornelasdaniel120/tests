import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Renombrar: la FK con ON UPDATE CASCADE actualiza los productos que la usan
export async function PATCH(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const session = await auth();
  if (!session || !["ADMIN", "EDITOR"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { name } = await params;
  const current = decodeURIComponent(name);
  const body = await req.json() as { name?: string };
  const newName = body.name?.trim();

  if (!newName) {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  }
  if (newName.length > 40) {
    return NextResponse.json({ error: "Máximo 40 caracteres" }, { status: 400 });
  }
  if (newName === current) return NextResponse.json({ name: current });

  const { data, error } = await getSupabaseAdmin()
    .from("Category")
    .update({ name: newName })
    .eq("name", current)
    .select("name")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Esa categoría ya existe" }, { status: 409 });
    }
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// Eliminar: la FK con ON DELETE RESTRICT lo impide si hay productos usándola
export async function DELETE(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const session = await auth();
  if (!session || !["ADMIN", "EDITOR"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { name } = await params;
  const category = decodeURIComponent(name);

  const { error } = await getSupabaseAdmin()
    .from("Category")
    .delete()
    .eq("name", category);

  if (error) {
    if (error.code === "23503") {
      return NextResponse.json(
        { error: "No se puede eliminar: hay productos con esta categoría. Cambia su categoría primero." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
