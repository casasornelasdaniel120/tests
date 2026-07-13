import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createAffiliatePass, passcreatorEnabled } from "@/lib/passcreator";
import { createId } from "@paralleldrive/cuid2";

// El doctor genera (o recupera) su pase digital de Apple/Google Wallet
export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "AFILIADO") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  if (!passcreatorEnabled()) {
    return NextResponse.json(
      { error: "Los pases digitales no están configurados todavía" },
      { status: 503 }
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase
    .from("User")
    .select("id, name, commissionPct, walletToken, passId, passUrl")
    .eq("id", session.user.id)
    .single();
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  if (user.passId && user.passUrl) {
    return NextResponse.json({ url: user.passUrl });
  }

  // Token del QR (se genera una sola vez)
  let token = user.walletToken as string | null;
  if (!token) {
    token = createId();
    await supabase
      .from("User")
      .update({ walletToken: token, updatedAt: new Date().toISOString() })
      .eq("id", user.id);
  }

  const { data: txs } = await supabase
    .from("WalletTransaction")
    .select("amount")
    .eq("affiliateId", user.id);
  const balance = (txs ?? []).reduce((sum, t) => sum + Number(t.amount), 0);

  try {
    const pass = await createAffiliatePass({
      name: user.name,
      balance,
      token,
      affiliateId: user.id,
    });
    if (!pass) throw new Error("Passcreator no configurado");

    await supabase
      .from("User")
      .update({ passId: pass.id, passUrl: pass.url, updatedAt: new Date().toISOString() })
      .eq("id", user.id);

    return NextResponse.json({ url: pass.url }, { status: 201 });
  } catch (err) {
    console.error("[passcreator] error al crear pase:", err);
    return NextResponse.json(
      { error: "No se pudo generar el pase, intenta más tarde" },
      { status: 502 }
    );
  }
}
