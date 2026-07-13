import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { data, error } = await getSupabaseAdmin()
    .from("Sale")
    .select(`*, user:User!Sale_userId_fkey(id,name), affiliate:User!Sale_affiliateId_fkey(id,name), client:Client(id,name,phone,email), items:SaleItem(*,product:Product(id,name,image)), payments:SalePayment(*)`)
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(data);
}
