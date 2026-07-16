"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PurchaseForm } from "./PurchaseForm";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PurchaseWithItems } from "@/types";

export function PurchaseHistory() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [purchases, setPurchases] = useState<PurchaseWithItems[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    // Días locales convertidos a instantes UTC (createdAt se guarda en UTC)
    if (from) params.set("from", new Date(`${from}T00:00:00`).toISOString());
    if (to) params.set("to", new Date(`${to}T23:59:59.999`).toISOString());
    fetch(`/api/purchases?${params}`)
      .then((r) => r.json())
      .then((data: PurchaseWithItems[]) => setPurchases(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6">
        <div className="flex items-center gap-2 h-10 bg-bg-elevated border border-border rounded-lg px-3">
          <Calendar size={14} className="text-text-secondary shrink-0" />
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-transparent text-sm text-text-primary focus:outline-none"
          />
        </div>
        <span className="text-sm text-text-secondary">a</span>
        <div className="flex items-center gap-2 h-10 bg-bg-elevated border border-border rounded-lg px-3">
          <Calendar size={14} className="text-text-secondary shrink-0" />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-transparent text-sm text-text-primary focus:outline-none"
          />
        </div>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus size={14} />
          Nueva compra
        </Button>
      </div>

      <div className="bg-bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">
            Órdenes de compra ({loading ? "…" : purchases.length})
          </h2>
        </div>

        {loading ? (
          <div className="py-16 text-center text-text-secondary text-sm">Cargando…</div>
        ) : purchases.length === 0 ? (
          <div className="py-16 text-center text-text-secondary text-sm">
            No hay compras registradas en el período.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {purchases.map((purchase) => (
              <div key={purchase.id}>
                <button
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-bg-elevated transition-colors text-left"
                  onClick={() => setExpanded(expanded === purchase.id ? null : purchase.id)}
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-text-primary">
                      {purchase.supplier ?? "Sin proveedor"}
                    </span>
                    <p className="text-xs text-text-secondary mt-0.5 truncate">
                      {formatDate(purchase.createdAt)} · {purchase.user.name}
                      {purchase.notes ? ` · ${purchase.notes}` : ""}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-gold shrink-0">
                    {formatCurrency(Number(purchase.total))}
                  </span>
                  {expanded === purchase.id ? (
                    <ChevronUp size={16} className="text-text-secondary shrink-0" />
                  ) : (
                    <ChevronDown size={16} className="text-text-secondary shrink-0" />
                  )}
                </button>

                {expanded === purchase.id && (
                  <div className="px-6 pb-4 bg-bg-elevated/40 border-t border-border">
                    <div className="flex flex-col gap-1 mt-3">
                      {purchase.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm text-text-secondary">
                          <span>
                            {Number(item.quantity)} {item.insumo.unit} × {item.insumo.name} a{" "}
                            {formatCurrency(Number(item.unitCost))}
                          </span>
                          <span>{formatCurrency(Number(item.subtotal))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {formOpen && (
        <PurchaseForm
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); load(); }}
        />
      )}
    </div>
  );
}
