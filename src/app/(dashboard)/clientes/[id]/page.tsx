import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ClientDetail } from "@/components/clients/ClientDetail";

export default async function ClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session || !["ADMIN", "EDITOR"].includes(session.user.role)) {
    redirect("/pos");
  }

  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      sales: {
        include: {
          items: { include: { product: { select: { name: true } } } },
          payments: true,
          user: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!client) notFound();

  const serialized = {
    ...client,
    sales: client.sales.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
      total: Number(s.total),
      discount: Number(s.discount),
      payments: s.payments.map((p) => ({
        ...p,
        amount: Number(p.amount),
      })),
    })),
  };

  return <ClientDetail client={serialized} />;
}
