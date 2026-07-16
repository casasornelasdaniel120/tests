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
    .select(`*, user:User!Sale_userId_fkey(id,name), affiliate:User!Sale_affiliateId_fkey(id,name), client:Client(id,name,phone,email), items:SaleItem(id,quantity,unitPrice,discount,subtotal,product:Product(id,name,image)), payments:SalePayment(*)`)
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
  const round2 = (n: number) => Math.round(n * 100) / 100;

  // Costo de producción congelado por producto: suma de la receta (BOM) al
  // costo promedio vigente de cada insumo. Producto sin receta → costo NULL
  // (el reporte lo señala en vez de asumir costo 0). Si la consulta falla,
  // la venta se rechaza: congelar NULL por un error transitorio corrompería
  // el costo histórico sin remedio (los snapshots no se recalculan).
  const productIds = [...new Set(body.items.map((i) => i.productId))];
  const { data: recipeRows, error: recipeError } = await supabase
    .from("ProductInsumo")
    .select("productId, quantity, insumo:Insumo(id, type, currentCost)")
    .in("productId", productIds);
  if (recipeError) {
    return NextResponse.json({ error: recipeError.message }, { status: 500 });
  }
  type RecipeRow = {
    productId: string;
    quantity: number;
    insumo: { id: string; type: string; currentCost: number } | null;
  };
  const recipes = (recipeRows ?? []) as unknown as RecipeRow[];
  const costByProduct = new Map<string, number>();
  for (const row of recipes) {
    if (!row.insumo) continue;
    const prev = costByProduct.get(row.productId) ?? 0;
    costByProduct.set(
      row.productId,
      round2(prev + Number(row.quantity) * Number(row.insumo.currentCost))
    );
  }

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
      body.items.map((item) => {
        const unitCost = costByProduct.get(item.productId) ?? null;
        return {
          id: createId(),
          saleId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          subtotal: item.subtotal,
          unitCost,
          totalCost: unitCost !== null ? round2(unitCost * item.quantity) : null,
        };
      })
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

  // Descuenta stock de insumos MATERIAL según las recetas vendidas —
  // best-effort: nunca bloquea la venta y el stock puede quedar negativo
  // (visible en /finanzas). El decremento es relativo y atómico (rpc) para
  // que ventas/compras concurrentes no se pisen el stock entre sí.
  const qtyByProduct = new Map<string, number>();
  for (const item of body.items) {
    qtyByProduct.set(
      item.productId,
      (qtyByProduct.get(item.productId) ?? 0) + Number(item.quantity)
    );
  }
  const usedByInsumo = new Map<string, number>();
  for (const row of recipes) {
    if (!row.insumo || row.insumo.type !== "MATERIAL") continue;
    const soldQty = qtyByProduct.get(row.productId) ?? 0;
    if (soldQty === 0) continue;
    usedByInsumo.set(
      row.insumo.id,
      (usedByInsumo.get(row.insumo.id) ?? 0) + Number(row.quantity) * soldQty
    );
  }
  const stockResults = await Promise.all(
    [...usedByInsumo.entries()].map(([insumoId, used]) =>
      supabase
        .rpc("decrement_insumo_stock", { insumo_id: insumoId, amount: used })
        .then((res) => ({ insumoId, error: res.error }))
    )
  );
  for (const res of stockResults) {
    if (res.error) {
      console.error(`Venta ${saleId}: no se descontó stock de ${res.insumoId}:`, res.error.message);
    }
  }

  // Return full sale with relations
  const { data: sale } = await supabase
    .from("Sale")
    .select(`*, user:User!Sale_userId_fkey(id,name), affiliate:User!Sale_affiliateId_fkey(id,name), client:Client(id,name,phone,email), items:SaleItem(id,quantity,unitPrice,discount,subtotal,product:Product(id,name,image)), payments:SalePayment(*)`)
    .eq("id", saleId)
    .single();

  return NextResponse.json(sale, { status: 201 });
}
