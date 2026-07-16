import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createId } from "@paralleldrive/cuid2";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const { data, error } = await getSupabaseAdmin()
    .from("ProductInsumo")
    .select(`id, insumoId, quantity, insumo:Insumo(id, name, unit, type, currentCost)`)
    .eq("productId", id)
    .order("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json() as { items?: { insumoId: string; quantity: number }[] };
  const items = body.items ?? [];

  const seen = new Set<string>();
  for (const item of items) {
    const qty = Number(item.quantity);
    if (!item.insumoId || Number.isNaN(qty) || qty <= 0) {
      return NextResponse.json(
        { error: "Cada renglón necesita insumo y cantidad > 0" },
        { status: 400 }
      );
    }
    if (seen.has(item.insumoId)) {
      return NextResponse.json({ error: "Insumo repetido en la receta" }, { status: 400 });
    }
    seen.add(item.insumoId);
  }

  const supabase = getSupabaseAdmin();
  const { data: product } = await supabase.from("Product").select("id").eq("id", id).single();
  if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  if (items.length > 0) {
    const { data: insumos, error: insumosError } = await supabase
      .from("Insumo")
      .select("id")
      .in("id", [...seen]);
    if (insumosError) return NextResponse.json({ error: insumosError.message }, { status: 500 });
    if ((insumos ?? []).length !== seen.size) {
      return NextResponse.json({ error: "Insumo inexistente en la receta" }, { status: 400 });
    }
  }

  // Reemplazo completo sin ventana de pérdida: primero upsert de los
  // renglones nuevos (si falla, la receta anterior queda intacta) y solo
  // después se borran los que ya no aplican.
  if (items.length > 0) {
    const { error: upsertError } = await supabase.from("ProductInsumo").upsert(
      items.map((item) => ({
        id: createId(),
        productId: id,
        insumoId: item.insumoId,
        quantity: Number(item.quantity),
      })),
      { onConflict: "productId,insumoId" }
    );
    if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  let staleQuery = supabase.from("ProductInsumo").delete().eq("productId", id);
  if (items.length > 0) {
    staleQuery = staleQuery.not(
      "insumoId",
      "in",
      `(${items.map((i) => `"${i.insumoId}"`).join(",")})`
    );
  }
  const { error: deleteError } = await staleQuery;
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  const { data, error } = await supabase
    .from("ProductInsumo")
    .select(`id, insumoId, quantity, insumo:Insumo(id, name, unit, type, currentCost)`)
    .eq("productId", id)
    .order("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
