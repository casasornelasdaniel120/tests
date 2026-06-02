import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

const METHOD_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
};

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
          items: { include: { product: true } },
          payments: true,
          user: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!client) notFound();

  const totalSpent = client.sales.reduce(
    (acc, s) => acc + Number(s.total),
    0
  );

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">{client.name}</h1>
        <div className="flex gap-4 mt-2 text-sm text-text-secondary">
          {client.phone && <span>{client.phone}</span>}
          {client.email && <span>{client.email}</span>}
        </div>
        {client.notes && (
          <p className="mt-3 text-sm text-text-secondary bg-bg-elevated border border-border rounded-lg px-4 py-3">
            {client.notes}
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-text-secondary">Total gastado</p>
          <p className="text-xl font-bold text-gold mt-1">{formatCurrency(totalSpent)}</p>
        </div>
        <div className="bg-bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-text-secondary">Visitas</p>
          <p className="text-xl font-bold text-text-primary mt-1">{client.sales.length}</p>
        </div>
        <div className="bg-bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-text-secondary">Última visita</p>
          <p className="text-sm font-medium text-text-primary mt-1">
            {client.sales[0] ? formatDate(client.sales[0].createdAt) : "—"}
          </p>
        </div>
      </div>

      <h2 className="text-base font-semibold text-text-primary mb-4">
        Historial de compras
      </h2>

      {client.sales.length === 0 ? (
        <p className="text-text-secondary text-sm">Sin compras registradas.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {client.sales.map((sale) => (
            <div
              key={sale.id}
              className="bg-bg-surface border border-border rounded-xl p-4"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs text-text-secondary">
                  {formatDate(sale.createdAt)} · {sale.user.name}
                </span>
                <span className="text-sm font-bold text-gold">
                  {formatCurrency(Number(sale.total))}
                </span>
              </div>
              <div className="flex flex-col gap-1 mb-3">
                {sale.items.map((item) => (
                  <span key={item.id} className="text-sm text-text-primary">
                    {item.quantity}× {item.product.name}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                {sale.payments.map((p) => (
                  <Badge key={p.id} variant="default">
                    {METHOD_LABEL[p.method]} {formatCurrency(Number(p.amount))}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
