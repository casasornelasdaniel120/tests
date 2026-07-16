"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { FinanceSummary } from "./FinanceSummary";
import { InsumoManager } from "./InsumoManager";
import { PurchaseHistory } from "./PurchaseHistory";

type Tab = "resumen" | "insumos" | "compras";

const TABS: { key: Tab; label: string }[] = [
  { key: "resumen", label: "Resumen" },
  { key: "insumos", label: "Insumos" },
  { key: "compras", label: "Compras" },
];

export function FinanceDashboard() {
  const [tab, setTab] = useState<Tab>("resumen");

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Finanzas</h1>
      </div>

      <div className="flex gap-1 mb-6 bg-bg-elevated border border-border rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-4 h-9 rounded-lg text-sm font-medium transition-colors",
              tab === t.key
                ? "bg-bg-surface text-gold border border-border shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "resumen" && <FinanceSummary />}
      {tab === "insumos" && <InsumoManager />}
      {tab === "compras" && <PurchaseHistory />}
    </div>
  );
}
