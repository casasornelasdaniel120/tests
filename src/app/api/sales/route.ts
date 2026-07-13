import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { refreshAffiliatePass } from "@/lib/passcreator";
import { createId } from "@paralleldrive/cuid2";
import type { CreateSalePayload } from "@/types";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const userId = searchParams.get("userId");
  const method = searchParams.get("method");

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("Sale")
    .select(`*, user:User!Sale_userId_fkey(id,name), affiliate:User!Sale_affiliateId_fkey(id,name), client:Client(id,name,phone,email), items:SaleItem(*,product:Product(id,name,image)), payments:SalePayment(*)`)
    .order("createdAt", { ascending: false });

  if (from) query = query.gte("createdAt", from);
  if (to) query = query.lte("createdAt", to);
  if (userId) query = query.eq("userId", userId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sales = data ?? [];
  if (method) {
    sales = sales.filter((s) =>
      (s.payments as { method: string }[]).some((p) => p.method === method)
    );
  }

  return NextResponse.json(sales);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || !["ADMIN", "CAJERO"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json() as CreateSalePayload;
  const supabase = getSupabaseAdmin();
  const saleId = createId();

  // Venta referida por un doctor afiliado: el % vigente se congela aquí
  let commissionAmount: number | null = null;
  if (body.affiliateId) {
    const { data: affiliate } = await supabase
      .from("User")
      .select("id, commissionPct, role, active")
      .eq("id", body.affiliateId)
      .single();
    if (!affiliate || affiliate.role !== "AFILIADO" || !affiliate.active) {
      return NextResponse.json({ error: "Doctor afiliado inválido" }, { status: 400 });
    }
    commissionAmount =
      Math.round(Number(body.total) * Number(affiliate.commissionPct)) / 100;
  }

  // Insert sale
  const { error: saleError } = await supabase.from("Sale").insert({
    id: saleId,
    userId: session.user.id,
    clientId: body.clientId ?? null,
    subtotal: body.subtotal,
    discount: body.discount,
    total: body.total,
    notes: body.notes ?? null,
    affiliateId: body.affiliateId ?? null,
    commissionAmount,
  });
  if (saleError) return NextResponse.json({ error: saleError.message }, { status: 500 });

  // Abono de la comisión al monedero del doctor
  if (body.affiliateId && commissionAmount && commissionAmount > 0) {
    const { error: txError } = await supabase.from("WalletTransaction").insert({
      id: createId(),
      affiliateId: body.affiliateId,
      saleId,
      type: "COMISION",
      amount: commissionAmount,
    });
    if (txError) return NextResponse.json({ error: txError.message }, { status: 500 });

    // Actualiza el saldo en el pase digital del doctor (best-effort)
    await refreshAffiliatePass(
      body.affiliateId,
      `Nueva comisión: $${commissionAmount.toFixed(2)} 🎉`
    );
  }

  // Insert items and payments in parallel
  const [itemsRes, paymentsRes] = await Promise.all([
    supabase.from("SaleItem").insert(
      body.items.map((item) => ({
        id: createId(),
        saleId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        subtotal: item.subtotal,
      }))
    ),
    supabase.from("SalePayment").insert(
      body.payments.map((p) => ({
        id: createId(),
        saleId,
        method: p.method,
        amount: p.amount,
      }))
    ),
  ]);

  if (itemsRes.error) return NextResponse.json({ error: itemsRes.error.message }, { status: 500 });
  if (paymentsRes.error) return NextResponse.json({ error: paymentsRes.error.message }, { status: 500 });

  // Return full sale with relations
  const { data: sale } = await supabase
    .from("Sale")
    .select(`*, user:User!Sale_userId_fkey(id,name), affiliate:User!Sale_affiliateId_fkey(id,name), client:Client(id,name,phone,email), items:SaleItem(*,product:Product(id,name,image)), payments:SalePayment(*)`)
    .eq("id", saleId)
    .single();

  return NextResponse.json(sale, { status: 201 });
}
