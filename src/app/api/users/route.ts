import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import bcrypt from "bcryptjs";
import { createId } from "@paralleldrive/cuid2";

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
  const hashed = await bcrypt.hash(body.password, 10);

  const { data, error } = await getSupabaseAdmin()
    .from("User")
    .insert({ id: createId(), ...body, password: hashed })
    .select("id, name, email, role, active, createdAt")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
