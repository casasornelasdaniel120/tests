import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { refreshAffiliatePass } from "@/lib/passcreator";
import { createId } from "@paralleldrive/cuid2";

// Canje en tienda: con el QR del pase escaneado, el cajero le paga al doctor
// desde su monedero (movimiento PAGO negativo) y el pase se actualiza.
export async function POST(req: Request) {
  const session = await auth();
  if (!session || !["ADMIN", "CAJERO"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json() as { token?: string; amount?: number; note?: string };
  const token = body.token?.trim();
  const amount = Number(body.amount);

  if (!token) return NextResponse.json({ error: "Falta el código" }, { status: 400 });
  if (Number.isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: affiliate } = await supabase
    .from("User")
    .select("id, name, active")
    .eq("walletToken", token)
    .eq("role", "AFILIADO")
    .single();

  if (!affiliate) {
    return NextResponse.json({ error: "Código no reconocido" }, { status: 404 });
  }
  if (!affiliate.active) {
    return NextResponse.json({ error: "Este afiliado está inactivo" }, { status: 409 });
  }

  const { data: txs } = await supabase
    .from("WalletTransaction")
    .select("amount")
    .eq("affiliateId", affiliate.id);
  const balance = (txs ?? []).reduce((sum, t) => sum + Number(t.amount), 0);

  if (amount > balance + 0.001) {
    return NextResponse.json(
      { error: `El monto supera el saldo disponible (${balance.toFixed(2)})` },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("WalletTransaction").insert({
    id: createId(),
    affiliateId: affiliate.id,
    type: "PAGO",
    amount: -amount,
    note: body.note?.trim() || "Canje en tienda",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const newBalance = balance - amount;
  await refreshAffiliatePass(
    affiliate.id,
    `Canjeaste $${amount.toFixed(2)}. Saldo: $${newBalance.toFixed(2)}`
  );

  return NextResponse.json(
    { name: affiliate.name, amount, balance: newBalance },
    { status: 201 }
  );
}
