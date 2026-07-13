import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || !["ADMIN", "CAJERO"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? new Date().toISOString().split("T")[0];
  const userId = searchParams.get("userId") ?? undefined;
  const method = searchParams.get("method") ?? undefined;

  const start = `${date}T00:00:00`;
  const end = `${date}T23:59:59`;
  const supabase = getSupabaseAdmin();

  // Fetch sales with relations
  let salesQuery = supabase
    .from("Sale")
    .select(`*, user:User!Sale_userId_fkey(id,name), client:Client(id,name), items:SaleItem(*,product:Product(id,name)), payments:SalePayment(*)`)
    .gte("createdAt", start)
    .lte("createdAt", end)
    .order("createdAt", { ascending: false });

  if (userId) salesQuery = salesQuery.eq("userId", userId);

  const { data: allSales } = await salesQuery;
  const sales = allSales ?? [];

  // Filter by method in TypeScript (Supabase nested filter limitation)
  const filtered = method
    ? sales.filter((s) => (s.payments as { method: string }[]).some((p) => p.method === method))
    : sales;

  // Fetch unique users who worked that day
  const { data: userRows } = await supabase
    .from("Sale")
    .select("userId, user:User!Sale_userId_fkey(id,name)")
    .gte("createdAt", start)
    .lte("createdAt", end);

  const usersMap = new Map<string, { id: string; name: string }>();
  (userRows ?? []).forEach((r) => {
    const u = r.user as unknown as { id: string; name: string } | null;
    if (u) usersMap.set(u.id, u);
  });

  // Aggregate totals from un-filtered sales (full day)
  const byMethodMap = new Map<string, number>();
  sales.forEach((s) => {
    (s.payments as { method: string; amount: number }[]).forEach((p) => {
      byMethodMap.set(p.method, (byMethodMap.get(p.method) ?? 0) + Number(p.amount));
    });
  });

  const totalAmount = Array.from(byMethodMap.values()).reduce((a, b) => a + b, 0);

  return NextResponse.json({
    date,
    sales: filtered,
    users: Array.from(usersMap.values()),
    summary: {
      totalAmount,
      totalSales: filtered.length,
      byMethod: Array.from(byMethodMap.entries()).map(([method, amount]) => ({ method, amount })),
    },
  });
}
