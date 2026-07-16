import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createId } from "@paralleldrive/cuid2";
import type { CreatePurchasePayload } from "@/types";

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = getSupabaseAdmin()
    .from("Purchase")
    .select(`*, user:User(id,name), items:PurchaseItem(*, insumo:Insumo(id,name,unit))`)
    .order("createdAt", { ascending: false });
  if (from) query = query.gte("createdAt", from);
  if (to) query = query.lte("createdAt", to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json() as CreatePurchasePayload;
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "La compra necesita al menos un insumo" }, { status: 400 });
  }
  for (const item of body.items) {
    const qty = Number(item.quantity);
    const cost = Number(item.unitCost);
    if (!item.insumoId || Number.isNaN(qty) || qty <= 0 || Number.isNaN(cost) || cost < 0) {
      return NextResponse.json(
        { error: "Cada renglón necesita insumo, cantidad > 0 y costo unitario ≥ 0" },
        { status: 400 }
      );
    }
  }

  const supabase = getSupabaseAdmin();
  const insumoIds = [...new Set(body.items.map((i) => i.insumoId))];
  const { data: insumos, error: insumosError } = await supabase
    .from("Insumo")
    .select("id, type")
    .in("id", insumoIds);
  if (insumosError) {
    return NextResponse.json({ error: insumosError.message }, { status: 500 });
  }
  const insumoMap = new Map((insumos ?? []).map((i) => [i.id, i]));
  for (const id of insumoIds) {
    const insumo = insumoMap.get(id);
    if (!insumo) {
      return NextResponse.json({ error: "Insumo inexistente en la compra" }, { status: 400 });
    }
    if (insumo.type !== "MATERIAL") {
      return NextResponse.json(
        { error: "La mano de obra no se compra; edita su tarifa directamente" },
        { status: 400 }
      );
    }
  }

  const purchaseId = createId();
  const total = round2(
    body.items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.unitCost), 0)
  );

  const { error: purchaseError } = await supabase.from("Purchase").insert({
    id: purchaseId,
    userId: session.user.id,
    supplier: body.supplier?.trim() || null,
    notes: body.notes?.trim() || null,
    total,
  });
  if (purchaseError) {
    return NextResponse.json({ error: purchaseError.message }, { status: 500 });
  }

  const { error: itemsError } = await supabase.from("PurchaseItem").insert(
    body.items.map((item) => ({
      id: createId(),
      purchaseId,
      insumoId: item.insumoId,
      quantity: Number(item.quantity),
      unitCost: Number(item.unitCost),
      subtotal: round2(Number(item.quantity) * Number(item.unitCost)),
    }))
  );
  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  // Promedio ponderado + stock en un solo UPDATE atómico (rpc), para que
  // compras/ventas concurrentes no se pisen. Secuencial para que dos
  // renglones del mismo insumo se compongan.
  for (const item of body.items) {
    const { error: rpcError } = await supabase.rpc("register_purchase_item", {
      insumo_id: item.insumoId,
      qty: Number(item.quantity),
      unit_cost: Number(item.unitCost),
    });
    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }
  }

  const { data: purchase } = await supabase
    .from("Purchase")
    .select(`*, user:User(id,name), items:PurchaseItem(*, insumo:Insumo(id,name,unit))`)
    .eq("id", purchaseId)
    .single();

  return NextResponse.json(purchase, { status: 201 });
}
