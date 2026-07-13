import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { passcreatorEnabled } from "@/lib/passcreator";
import { createId } from "@paralleldrive/cuid2";

// Panel del doctor afiliado: su saldo, % vigente, ventas referidas y movimientos
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "AFILIADO") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  const me = session.user.id;

  const [{ data: profile }, { data: txs }, { data: sales }] = await Promise.all([
    supabase.from("User").select("commissionPct, walletToken, passUrl").eq("id", me).single(),
    supabase
      .from("WalletTransaction")
      .select("id, type, amount, note, createdAt")
      .eq("affiliateId", me)
      .order("createdAt", { ascending: false }),
    supabase
      .from("Sale")
      .select("id, total, commissionAmount, createdAt, client:Client(id, name)")
      .eq("affiliateId", me)
      .order("createdAt", { ascending: false }),
  ]);

  const transactions = txs ?? [];
  const referredSales = sales ?? [];

  // El token del QR se genera una sola vez, la primera vez que abre su monedero
  if (profile && !profile.walletToken) {
    const token = createId();
    await supabase
      .from("User")
      .update({ walletToken: token, updatedAt: new Date().toISOString() })
      .eq("id", me);
  }

  const balance = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalCommission = transactions
    .filter((t) => t.type === "COMISION")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalPaid = transactions
    .filter((t) => t.type === "PAGO")
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

  const distinctClients = new Set(
    referredSales
      .map((s) => (s.client as unknown as { id: string } | null)?.id)
      .filter(Boolean)
  ).size;

  return NextResponse.json({
    commissionPct: Number(profile?.commissionPct ?? 0),
    passEnabled: passcreatorEnabled(),
    passUrl: profile?.passUrl ?? null,
    balance,
    totalCommission,
    totalPaid,
    salesCount: referredSales.length,
    salesTotal: referredSales.reduce((sum, s) => sum + Number(s.total), 0),
    distinctClients,
    sales: referredSales,
    transactions,
  });
}
