import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { FinanceSummary } from "@/types";

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const supabase = getSupabaseAdmin();

  type SaleItemRow = {
    productId: string;
    quantity: number;
    subtotal: number;
    unitCost: number | null;
    totalCost: number | null;
    product: { id: string; name: string } | null;
  };
  type SaleRow = { id: string; total: number; discount: number; items: SaleItemRow[] };

  // Paginado explícito: PostgREST corta en max_rows (1000) sin avisar, y un
  // rango amplio (todo el año) supera eso fácilmente.
  const PAGE = 1000;
  const sales: SaleRow[] = [];
  for (let offset = 0; ; offset += PAGE) {
    let query = supabase
      .from("Sale")
      .select(`id, total, discount, items:SaleItem(productId, quantity, subtotal, unitCost, totalCost, product:Product(id, name))`)
      .order("createdAt", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (from) query = query.gte("createdAt", from);
    if (to) query = query.lte("createdAt", to);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    sales.push(...((data ?? []) as unknown as SaleRow[]));
    if (!data || data.length < PAGE) break;
  }

  // Agregación en JS, mismo enfoque que /api/cash-register. Los renglones con
  // unitCost NULL (venta previa al módulo o producto sin receta) cuentan en
  // ventas pero se excluyen del costo y se reportan aparte para no inflar
  // la utilidad en silencio. El descuento global de la venta se prorratea
  // entre sus renglones por peso de subtotal, para que "ventas" coincida con
  // el dinero realmente cobrado (Sale.total).
  type Row = FinanceSummary["byProduct"][number];
  const byProductMap = new Map<string, Row>();
  let ventas = 0;
  let costo = 0;
  let itemsSinCosto = 0;

  for (const sale of sales) {
    ventas += Number(sale.total);
    const itemsGross = (sale.items ?? []).reduce((sum, i) => sum + Number(i.subtotal), 0);
    const globalDiscount = Number(sale.discount);

    for (const item of sale.items ?? []) {
      const share = itemsGross > 0 ? Number(item.subtotal) / itemsGross : 0;
      const lineVentas = Number(item.subtotal) - globalDiscount * share;
      const hasCost = item.totalCost !== null && item.totalCost !== undefined;
      const lineCosto = hasCost ? Number(item.totalCost) : 0;

      costo += lineCosto;
      if (!hasCost) itemsSinCosto += 1;

      const key = item.productId;
      const row = byProductMap.get(key) ?? {
        productId: key,
        name: item.product?.name ?? "(producto eliminado)",
        unidades: 0,
        ventas: 0,
        costo: 0,
        utilidad: 0,
        margenPct: 0,
        sinReceta: false,
      };
      row.unidades += Number(item.quantity);
      row.ventas += lineVentas;
      row.costo += lineCosto;
      if (!hasCost) row.sinReceta = true;
      byProductMap.set(key, row);
    }
  }

  const byProduct = [...byProductMap.values()]
    .map((row) => {
      row.ventas = round2(row.ventas);
      row.costo = round2(row.costo);
      row.utilidad = round2(row.ventas - row.costo);
      row.margenPct = row.ventas > 0 ? round2((row.utilidad / row.ventas) * 100) : 0;
      return row;
    })
    .sort((a, b) => b.ventas - a.ventas);

  ventas = round2(ventas);
  costo = round2(costo);
  const utilidad = round2(ventas - costo);

  const summary: FinanceSummary = {
    totals: {
      ventas,
      costo,
      utilidad,
      margenPct: ventas > 0 ? round2((utilidad / ventas) * 100) : 0,
      itemsSinCosto,
    },
    byProduct,
  };

  return NextResponse.json(summary);
}
