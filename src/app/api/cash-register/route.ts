import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { PaymentMethod } from "@prisma/client";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || !["ADMIN", "CAJERO"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? new Date().toISOString().split("T")[0];
  const userId = searchParams.get("userId") ?? undefined;
  const method = searchParams.get("method") as PaymentMethod | null;

  const start = new Date(`${date}T00:00:00`);
  const end = new Date(`${date}T23:59:59`);

  const dateFilter = { createdAt: { gte: start, lte: end } };

  const saleWhere = {
    ...dateFilter,
    ...(userId && { userId }),
    ...(method && { payments: { some: { method } } }),
  };

  const [sales, byMethod, users] = await Promise.all([
    prisma.sale.findMany({
      where: saleWhere,
      include: {
        user: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true } } } },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    // Totales agrupados por método (siempre del día completo, sin filtrar por método)
    prisma.salePayment.groupBy({
      by: ["method"],
      where: { sale: { ...dateFilter, ...(userId && { userId }) } },
      _sum: { amount: true },
    }),
    // Cajeros que trabajaron ese día (para el select de filtro)
    prisma.user.findMany({
      where: {
        sales: { some: dateFilter },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalAmount = byMethod.reduce(
    (acc, m) => acc + Number(m._sum.amount ?? 0),
    0
  );

  return NextResponse.json({
    date,
    sales,
    users,
    summary: {
      totalAmount,
      totalSales: sales.length,
      byMethod: byMethod.map((m) => ({
        method: m.method,
        amount: Number(m._sum.amount ?? 0),
      })),
    },
  });
}
