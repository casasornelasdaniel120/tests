import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true } },
      client: { select: { id: true, name: true, phone: true, email: true } },
      items: { include: { product: true } },
      payments: true,
    },
  });

  if (!sale) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(sale);
}
