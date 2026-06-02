"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, ChevronDown, ChevronUp, FileText, Filter } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CorteReport } from "./CorteReport";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PaymentMethod } from "@/types";

interface SaleItem {
  id: string;
  quantity: number;
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

interface CajerUser {
  id: string;
  name: string;
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

const ALL_METHODS: PaymentMethod[] = ["EFECTIVO", "TARJETA", "TRANSFERENCIA"];

export function SaleHistory() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [filterUser, setFilterUser] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [users, setUsers] = useState<CajerUser[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [corteOpen, setCorteOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ date });
    if (filterUser) params.set("userId", filterUser);
    if (filterMethod) params.set("method", filterMethod);

    fetch(`/api/cash-register?${params}`)
      .then((r) => r.json())
      .then((data: { sales: Sale[]; summary: Summary; users: CajerUser[] }) => {
        setSales(data.sales);
        setSummary(data.summary);
        setUsers(data.users);
      })
      .finally(() => setLoading(false));
  }, [date, filterUser, filterMethod]);

  useEffect(() => { load(); }, [load]);

  const hasFilters = filterUser || filterMethod;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Caja del día</h1>
        <Button
          variant="secondary"
          onClick={() => setCorteOpen(true)}
          disabled={!summary || summary.totalSales === 0}
        >
          <FileText size={16} />
          Corte de caja
        </Button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Date */}
        <div className="flex items-center gap-2 h-10 bg-bg-elevated border border-border rounded-lg px-3">
          <Calendar size={14} className="text-text-secondary shrink-0" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent text-sm text-text-primary focus:outline-none"
          />
        </div>

        {/* Cajero filter */}
        <div className="flex items-center gap-2 h-10 bg-bg-elevated border border-border rounded-lg px-3">
          <Filter size={14} className="text-text-secondary shrink-0" />
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="bg-transparent text-sm text-text-primary focus:outline-none pr-2"
          >
            <option value="">Todos los cajeros</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        {/* Method filter */}
        <div className="flex items-center gap-2 h-10 bg-bg-elevated border border-border rounded-lg px-3">
          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="bg-transparent text-sm text-text-primary focus:outline-none pr-2"
          >
            <option value="">Todos los métodos</option>
            {ALL_METHODS.map((m) => (
              <option key={m} value={m}>{METHOD_LABEL[m]}</option>
            ))}
          </select>
        </div>

        {hasFilters && (
          <button
            onClick={() => { setFilterUser(""); setFilterMethod(""); }}
            className="h-10 px-3 text-xs text-text-secondary hover:text-gold transition-colors border border-border rounded-lg"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-bg-surface border border-border rounded-xl p-4">
            <p className="text-xs text-text-secondary">
              Total {hasFilters ? "(filtrado)" : "del día"}
            </p>
            <p className="text-2xl font-bold text-gold mt-1">
              {formatCurrency(summary.totalAmount)}
            </p>
          </div>
          <div className="bg-bg-surface border border-border rounded-xl p-4">
            <p className="text-xs text-text-secondary">Transacciones</p>
            <p className="text-2xl font-bold text-text-primary mt-1">
              {summary.totalSales}
            </p>
          </div>
          {summary.byMethod.length > 0 ? (
            summary.byMethod.map((m) => (
              <div key={m.method} className="bg-bg-surface border border-border rounded-xl p-4">
                <p className="text-xs text-text-secondary">
                  {METHOD_LABEL[m.method] ?? m.method}
                </p>
                <p className="text-xl font-bold text-text-primary mt-1">
                  {formatCurrency(m.amount)}
                </p>
              </div>
            ))
          ) : (
            <div className="bg-bg-surface border border-border rounded-xl p-4 col-span-2">
              <p className="text-xs text-text-secondary">Sin ventas en este período</p>
            </div>
          )}
        </div>
      )}

      {/* Sales list */}
      <div className="bg-bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">
            Ventas ({loading ? "…" : sales.length})
          </h2>
        </div>

        {loading ? (
          <div className="py-16 text-center text-text-secondary text-sm">
            Cargando…
          </div>
        ) : sales.length === 0 ? (
          <div className="py-16 text-center text-text-secondary text-sm">
            No hay ventas para los filtros seleccionados.
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
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
                    <p className="text-xs text-text-secondary mt-0.5 truncate">
                      {formatDate(sale.createdAt)} · {sale.user.name}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-gold shrink-0">
                    {formatCurrency(Number(sale.total))}
                  </span>
                  {expanded === sale.id ? (
                    <ChevronUp size={16} className="text-text-secondary shrink-0" />
                  ) : (
                    <ChevronDown size={16} className="text-text-secondary shrink-0" />
                  )}
                </button>

                {expanded === sale.id && (
                  <div className="px-6 pb-4 bg-bg-elevated/40 border-t border-border">
                    <div className="flex flex-col gap-1 mt-3 mb-3">
                      {sale.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between text-sm text-text-secondary"
                        >
                          <span>{item.quantity}× {item.product.name}</span>
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
                    <div className="flex gap-2 mt-2">
                      {sale.payments.map((p) => (
                        <span key={p.id} className="text-xs text-text-secondary">
                          {METHOD_LABEL[p.method]}: {formatCurrency(Number(p.amount))}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Corte modal */}
      {corteOpen && summary && (
        <CorteReport
          date={date}
          sales={sales}
          summary={summary}
          onClose={() => setCorteOpen(false)}
        />
      )}
    </div>
  );
}
