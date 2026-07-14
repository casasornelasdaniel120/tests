import { NextResponse } from "next/server";
import { createId } from "@paralleldrive/cuid2";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") === "true";
  const search = searchParams.get("search") ?? "";

  const supabase = getSupabaseAdmin();
  let query = supabase.from("Product").select("*").order("name");

  if (activeOnly) query = query.eq("active", true);
  if (search) query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || !["ADMIN", "EDITOR"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const supabase = getSupabaseAdmin();
  // id/updatedAt los genera Prisma en cliente (@default(cuid()), @updatedAt);
  // al insertar vía Supabase hay que proveerlos manualmente
  const { data, error } = await supabase
    .from("Product")
    .insert({ ...body, id: createId(), updatedAt: new Date().toISOString() })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
