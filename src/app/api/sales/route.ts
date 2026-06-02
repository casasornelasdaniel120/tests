import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
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
    .select(`*, user:User(id,name), client:Client(id,name,phone,email), items:SaleItem(*,product:Product(id,name,image)), payments:SalePayment(*)`)
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

  // Insert sale
  const { error: saleError } = await supabase.from("Sale").insert({
    id: saleId,
    userId: session.user.id,
    clientId: body.clientId ?? null,
    subtotal: body.subtotal,
    discount: body.discount,
    total: body.total,
    notes: body.notes ?? null,
  });
  if (saleError) return NextResponse.json({ error: saleError.message }, { status: 500 });

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
    .select(`*, user:User(id,name), client:Client(id,name,phone,email), items:SaleItem(*,product:Product(id,name,image)), payments:SalePayment(*)`)
    .eq("id", saleId)
    .single();

  return NextResponse.json(sale, { status: 201 });
}
