import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || !["ADMIN", "CAJERO"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? new Date().toISOString().split("T")[0];

  const start = new Date(`${date}T00:00:00`);
  const end = new Date(`${date}T23:59:59`);

  const [sales, totals] = await Promise.all([
    prisma.sale.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: {
        user: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true } } } },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.salePayment.aggregate({
      where: { sale: { createdAt: { gte: start, lte: end } } },
      _sum: { amount: true },
    }),
  ]);

  const byMethod = await prisma.salePayment.groupBy({
    by: ["method"],
    where: { sale: { createdAt: { gte: start, lte: end } } },
    _sum: { amount: true },
  });

  return NextResponse.json({
    date,
    sales,
    summary: {
      totalAmount: totals._sum.amount ?? 0,
      totalSales: sales.length,
      byMethod: byMethod.map((m) => ({
        method: m.method,
        amount: m._sum.amount ?? 0,
      })),
    },
  });
}
