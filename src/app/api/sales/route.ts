import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { CreateSalePayload } from "@/types";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const userId = searchParams.get("userId");
  const method = searchParams.get("method");

  const sales = await prisma.sale.findMany({
    where: {
      ...(from && { createdAt: { gte: new Date(from) } }),
      ...(to && { createdAt: { lte: new Date(to) } }),
      ...(userId && { userId }),
      ...(method && { payments: { some: { method: method as "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" } } }),
    },
    include: {
      user: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
      items: { include: { product: { select: { id: true, name: true, image: true } } } },
      payments: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(sales);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || !["ADMIN", "CAJERO"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json() as CreateSalePayload;

  const sale = await prisma.sale.create({
    data: {
      userId: session.user.id,
      clientId: body.clientId,
      subtotal: body.subtotal,
      discount: body.discount,
      total: body.total,
      notes: body.notes,
      items: {
        create: body.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          subtotal: item.subtotal,
        })),
      },
      payments: {
        create: body.payments.map((p) => ({
          method: p.method,
          amount: p.amount,
        })),
      },
    },
    include: {
      user: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
      items: { include: { product: true } },
      payments: true,
    },
  });

  return NextResponse.json(sale, { status: 201 });
}
