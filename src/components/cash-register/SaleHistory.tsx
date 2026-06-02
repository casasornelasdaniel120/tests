"use client";

import { useState, useEffect } from "react";
import { Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PaymentMethod } from "@/types";

interface SaleItem {
  id: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
  product: { id: string; name: string };
}

interface SalePayment {
  id: string;
  method: PaymentMethod;
  amount: number;
}

interface Sale {
  id: string;
  createdAt: string;
  subtotal: number;
  discount: number;
  total: number;
  notes: string | null;
  user: { id: string; name: string };
  client: { id: string; name: string } | null;
  items: SaleItem[];
  payments: SalePayment[];
}

interface Summary {
  totalAmount: number;
  totalSales: number;
  byMethod: { method: string; amount: number }[];
}

const METHOD_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
};

const METHOD_BADGE: Record<string, "default" | "success" | "gold"> = {
  EFECTIVO: "success",
  TARJETA: "gold",
  TRANSFERENCIA: "default",
};

export function SaleHistory() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/cash-register?date=${date}`)
      .then((r) => r.json())
      .then((data: { sales: Sale[]; summary: Summary }) => {
        setSales(data.sales);
        setSummary(data.summary);
      });
  }, [date]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Caja del día</h1>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-text-secondary" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-10 bg-bg-elevated border border-border rounded-lg px-3 text-sm text-text-primary focus:outline-none focus:border-gold/60"
          />
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-bg-surface border border-border rounded-xl p-4">
            <p className="text-xs text-text-secondary">Total del día</p>
            <p className="text-2xl font-bold text-gold mt-1">
              {formatCurrency(Number(summary.totalAmount))}
            </p>
          </div>
          <div className="bg-bg-surface border border-border rounded-xl p-4">
            <p className="text-xs text-text-secondary">Transacciones</p>
            <p className="text-2xl font-bold text-text-primary mt-1">
              {summary.totalSales}
            </p>
          </div>
          {summary.byMethod.map((m) => (
            <div
              key={m.method}
              className="bg-bg-surface border border-border rounded-xl p-4"
            >
              <p className="text-xs text-text-secondary">{METHOD_LABEL[m.method] ?? m.method}</p>
              <p className="text-xl font-bold text-text-primary mt-1">
                {formatCurrency(Number(m.amount))}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Sales table */}
      <div className="bg-bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">
            Ventas ({sales.length})
          </h2>
        </div>

        {sales.length === 0 ? (
          <div className="py-16 text-center text-text-secondary text-sm">
            No hay ventas para esta fecha.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sales.map((sale) => (
              <div key={sale.id}>
                <button
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-bg-elevated transition-colors text-left"
                  onClick={() =>
                    setExpanded(expanded === sale.id ? null : sale.id)
                  }
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-text-primary">
                        {sale.client?.name ?? "Sin cliente"}
                      </span>
                      <div className="flex gap-1">
                        {sale.payments.map((p) => (
                          <Badge key={p.id} variant={METHOD_BADGE[p.method] ?? "default"}>
                            {METHOD_LABEL[p.method]}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {formatDate(sale.createdAt)} · {sale.user.name}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-gold">
                    {formatCurrency(Number(sale.total))}
                  </span>
                  {expanded === sale.id ? (
                    <ChevronUp size={16} className="text-text-secondary shrink-0" />
                  ) : (
                    <ChevronDown size={16} className="text-text-secondary shrink-0" />
                  )}
                </button>

                {expanded === sale.id && (
                  <div className="px-6 pb-4 bg-bg-elevated/50">
                    <div className="flex flex-col gap-1 mb-3">
                      {sale.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between text-sm text-text-secondary"
                        >
                          <span>
                            {item.quantity}× {item.product.name}
                          </span>
                          <span>{formatCurrency(Number(item.subtotal))}</span>
                        </div>
                      ))}
                    </div>
                    {Number(sale.discount) > 0 && (
                      <div className="flex justify-between text-sm text-emerald-400">
                        <span>Descuento</span>
                        <span>−{formatCurrency(Number(sale.discount))}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-semibold text-text-primary mt-1 pt-2 border-t border-border">
                      <span>Total</span>
                      <span>{formatCurrency(Number(sale.total))}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
