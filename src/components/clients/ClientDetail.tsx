"use client";

import { useState } from "react";
import { Pencil, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ClientForm } from "./ClientForm";
import { formatCurrency, formatDate } from "@/lib/utils";

const METHOD_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
};

interface Sale {
  id: string;
  createdAt: string;
  total: number;
  discount: number;
  user: { name: string };
  items: { id: string; quantity: number; product: { name: string } }[];
  payments: { id: string; method: string; amount: number }[];
}

interface Client {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  sales: Sale[];
}

export function ClientDetail({ client }: { client: Client }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  const totalSpent = client.sales.reduce((acc, s) => acc + Number(s.total), 0);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Back + header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link
            href="/clientes"
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-gold transition-colors mb-3"
          >
            <ArrowLeft size={14} /> Volver a clientes
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">{client.name}</h1>
          <div className="flex gap-4 mt-1.5 text-sm text-text-secondary">
            {client.phone && <span>{client.phone}</span>}
            {client.email && <span>{client.email}</span>}
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil size={14} />
          Editar
        </Button>
      </div>

      {/* Notes */}
      {client.notes && (
        <p className="mb-6 text-sm text-text-secondary bg-bg-elevated border border-border rounded-lg px-4 py-3">
          {client.notes}
        </p>
      )}

      {/* Stats */}
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

      {/* Sales history */}
      <h2 className="text-base font-semibold text-text-primary mb-4">
        Historial de compras
      </h2>

      {client.sales.length === 0 ? (
        <p className="text-text-secondary text-sm">Sin compras registradas.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {client.sales.map((sale) => (
            <div key={sale.id} className="bg-bg-surface border border-border rounded-xl p-4">
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
              <div className="flex gap-2 flex-wrap">
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

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar cliente">
        <ClientForm
          initial={client}
          onSave={() => {
            setEditOpen(false);
            router.refresh();
          }}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>
    </div>
  );
}
