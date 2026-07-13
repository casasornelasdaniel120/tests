"use client";

import { useState, useEffect } from "react";
import { Wallet, TrendingUp, Users, Receipt, Percent, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";

interface WalletData {
  commissionPct: number;
  passEnabled: boolean;
  passUrl: string | null;
  balance: number;
  totalCommission: number;
  totalPaid: number;
  salesCount: number;
  salesTotal: number;
  distinctClients: number;
  sales: {
    id: string;
    total: number;
    commissionAmount: number | null;
    createdAt: string;
    client: { id: string; name: string } | null;
  }[];
  transactions: {
    id: string;
    type: "COMISION" | "PAGO" | "AJUSTE";
    amount: number;
    note: string | null;
    createdAt: string;
  }[];
}

type Period = "todo" | "mes" | "mes-pasado";

const TX_LABEL: Record<string, string> = {
  COMISION: "Comisión",
  PAGO: "Pago recibido",
  AJUSTE: "Ajuste",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function inPeriod(iso: string, period: Period) {
  if (period === "todo") return true;
  const d = new Date(iso);
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  if (period === "mes") return d >= thisMonth;
  return d >= lastMonth && d < thisMonth;
}

export function WalletDashboard({ userName }: { userName: string }) {
  const [data, setData] = useState<WalletData | null>(null);
  const [period, setPeriod] = useState<Period>("todo");
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState("");

  useEffect(() => {
    fetch("/api/wallet")
      .then((r) => r.json())
      .then(setData);
  }, []);

  async function handleAddToWallet() {
    if (data?.passUrl) {
      window.open(data.passUrl, "_blank");
      return;
    }
    setPassError("");
    setPassLoading(true);
    const res = await fetch("/api/wallet/pass", { method: "POST" });
    const result = await res.json() as { url?: string; error?: string };
    setPassLoading(false);
    if (!res.ok || !result.url) {
      setPassError(result.error ?? "No se pudo generar el pase");
      return;
    }
    setData((prev) => (prev ? { ...prev, passUrl: result.url! } : prev));
    window.open(result.url, "_blank");
  }

  if (!data) {
    return (
      <div className="p-8 flex justify-center">
        <span className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mt-16" />
      </div>
    );
  }

  const visibleSales = data.sales.filter((s) => inPeriod(s.createdAt, period));

  const cards = [
    {
      label: "Saldo disponible",
      value: formatCurrency(data.balance),
      icon: Wallet,
      accent: "text-gold",
    },
    {
      label: "Acumulado histórico",
      value: formatCurrency(data.totalCommission),
      icon: TrendingUp,
      accent: "text-cta",
    },
    {
      label: "Clientes referidos",
      value: String(data.distinctClients),
      icon: Users,
      accent: "text-text-primary",
    },
    {
      label: "Ventas referidas",
      value: formatCurrency(data.salesTotal),
      icon: Receipt,
      accent: "text-text-primary",
    },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
            Mi monedero
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">Hola, {userName}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={data.commissionPct > 0 ? "success" : "default"} className="gap-1">
            <Percent size={12} />
            Comisión: {data.commissionPct}%
          </Badge>
          {data.passEnabled && (
            <Button variant="secondary" size="sm" loading={passLoading} onClick={handleAddToWallet}>
              <Smartphone size={14} />
              {data.passUrl ? "Ver mi pase" : "Agregar a mi Wallet"}
            </Button>
          )}
        </div>
      </div>

      {passError && <p className="text-xs text-red-400">{passError}</p>}

      {data.commissionPct === 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-2xl px-4 py-3">
          Tu cuenta está creada pero aún no tiene porcentaje de comisión
          asignado. El administrador lo configurará pronto.
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="bg-bg-surface border border-border rounded-2xl p-4 sm:p-5"
          >
            <div className="flex items-center gap-2 text-text-secondary text-xs mb-2">
              <c.icon size={14} />
              {c.label}
            </div>
            <p className={`text-xl sm:text-2xl font-bold ${c.accent}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Referred sales */}
      <div className="bg-bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-text-primary">
            Clientes que han venido de tu parte
          </h2>
          <div className="flex gap-1">
            {([
              ["todo", "Todo"],
              ["mes", "Este mes"],
              ["mes-pasado", "Mes pasado"],
            ] as [Period, string][]).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setPeriod(value)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  period === value
                    ? "bg-gold/10 text-gold border border-gold/20"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-secondary border-b border-border">
                <th className="px-5 py-3 font-medium">Fecha</th>
                <th className="px-5 py-3 font-medium">Cliente</th>
                <th className="px-5 py-3 font-medium text-right">Compró</th>
                <th className="px-5 py-3 font-medium text-right">Tu comisión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleSales.map((s) => (
                <tr key={s.id}>
                  <td className="px-5 py-3 text-text-secondary whitespace-nowrap">
                    {formatDate(s.createdAt)}
                  </td>
                  <td className="px-5 py-3 text-text-primary">
                    {s.client?.name ?? (
                      <span className="text-text-secondary italic">
                        Cliente sin registrar
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-text-primary">
                    {formatCurrency(Number(s.total))}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-gold">
                    {formatCurrency(Number(s.commissionAmount ?? 0))}
                  </td>
                </tr>
              ))}
              {visibleSales.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-text-secondary">
                    Aún no hay ventas referidas en este periodo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Wallet movements */}
      <div className="bg-bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">
            Movimientos del monedero
          </h2>
        </div>
        <ul className="divide-y divide-border">
          {data.transactions.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-5 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary">
                  {TX_LABEL[t.type] ?? t.type}
                  {t.note && (
                    <span className="text-text-secondary"> — {t.note}</span>
                  )}
                </p>
                <p className="text-xs text-text-secondary">{formatDate(t.createdAt)}</p>
              </div>
              <span
                className={`text-sm font-semibold whitespace-nowrap ${
                  Number(t.amount) >= 0 ? "text-gold" : "text-red-500"
                }`}
              >
                {Number(t.amount) >= 0 ? "+" : "−"}
                {formatCurrency(Math.abs(Number(t.amount)))}
              </span>
            </li>
          ))}
          {data.transactions.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-text-secondary">
              Sin movimientos todavía.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
