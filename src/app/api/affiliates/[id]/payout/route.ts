import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { refreshAffiliatePass } from "@/lib/passcreator";
import { createId } from "@paralleldrive/cuid2";

// Registra un pago al doctor (el dinero se entrega fuera del sistema);
// descuenta del monedero con un movimiento PAGO negativo.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json() as { amount?: number; note?: string };
  const amount = Number(body.amount);

  if (Number.isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: affiliate } = await supabase
    .from("User")
    .select("id, role")
    .eq("id", id)
    .eq("role", "AFILIADO")
    .single();
  if (!affiliate) {
    return NextResponse.json({ error: "Afiliado no encontrado" }, { status: 404 });
  }

  const { data: txs } = await supabase
    .from("WalletTransaction")
    .select("amount")
    .eq("affiliateId", id);
  const balance = (txs ?? []).reduce((sum, t) => sum + Number(t.amount), 0);

  if (amount > balance + 0.001) {
    return NextResponse.json(
      { error: `El monto supera el saldo disponible (${balance.toFixed(2)})` },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("WalletTransaction")
    .insert({
      id: createId(),
      affiliateId: id,
      type: "PAGO",
      amount: -amount,
      note: body.note?.trim() || null,
    })
    .select("id, type, amount, note, createdAt")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await refreshAffiliatePass(
    id,
    `Recibiste un pago de $${amount.toFixed(2)}. Saldo: $${(balance - amount).toFixed(2)}`
  );

  return NextResponse.json({ ...data, balance: balance - amount }, { status: 201 });
}
