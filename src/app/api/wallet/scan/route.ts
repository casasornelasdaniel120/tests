import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// El cajero escanea el QR del pase del doctor → identifica al afiliado y su saldo
export async function GET(req: Request) {
  const session = await auth();
  if (!session || !["ADMIN", "CAJERO"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ error: "Falta el código" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase
    .from("User")
    .select("id, name, email, commissionPct, active, role")
    .eq("walletToken", token)
    .eq("role", "AFILIADO")
    .single();

  if (!user) {
    return NextResponse.json({ error: "Código no reconocido" }, { status: 404 });
  }
  if (!user.active) {
    return NextResponse.json({ error: "Este afiliado está inactivo" }, { status: 409 });
  }

  const { data: txs } = await supabase
    .from("WalletTransaction")
    .select("amount")
    .eq("affiliateId", user.id);
  const balance = (txs ?? []).reduce((sum, t) => sum + Number(t.amount), 0);

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    commissionPct: Number(user.commissionPct),
    balance,
  });
}
