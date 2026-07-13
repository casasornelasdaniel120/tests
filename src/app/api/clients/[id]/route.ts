import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const [{ data: client }, { data: sales }] = await Promise.all([
    supabase.from("Client").select("*").eq("id", id).single(),
    supabase
      .from("Sale")
      .select(`id, createdAt, total, discount, subtotal, notes, user:User!Sale_userId_fkey(id,name), items:SaleItem(*,product:Product(id,name,image)), payments:SalePayment(*)`)
      .eq("clientId", id)
      .order("createdAt", { ascending: false }),
  ]);

  if (!client) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ ...client, sales: sales ?? [] });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { data, error } = await getSupabaseAdmin().from("Client").update(body).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const { error } = await getSupabaseAdmin().from("Client").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
