import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// GET /api/affiliates          → ADMIN: lista completa con saldo y totales
// GET /api/affiliates?light=1  → ADMIN/CAJERO: solo id+nombre (selector del POS)
export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const light = searchParams.get("light") === "1";
  const supabase = getSupabaseAdmin();

  if (light) {
    if (!["ADMIN", "CAJERO"].includes(session.user.role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const { data, error } = await supabase
      .from("User")
      .select("id, name")
      .eq("role", "AFILIADO")
      .eq("active", true)
      .order("name");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("User")
    .select(
      `id, name, email, active, commissionPct, createdAt,
       txs:WalletTransaction(type, amount),
       referred:Sale!Sale_affiliateId_fkey(id, total, commissionAmount)`
    )
    .eq("role", "AFILIADO")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const affiliates = (data ?? []).map((a) => {
    const txs = a.txs as { type: string; amount: number }[];
    const referred = a.referred as { id: string; total: number; commissionAmount: number | null }[];
    const balance = txs.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalCommission = txs
      .filter((t) => t.type === "COMISION")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    return {
      id: a.id,
      name: a.name,
      email: a.email,
      active: a.active,
      commissionPct: Number(a.commissionPct),
      createdAt: a.createdAt,
      balance,
      totalCommission,
      salesCount: referred.length,
      salesTotal: referred.reduce((sum, s) => sum + Number(s.total), 0),
    };
  });

  return NextResponse.json(affiliates);
}
