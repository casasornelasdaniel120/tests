"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, NotebookPen } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { RecipeEditor } from "./RecipeEditor";
import { formatCurrency } from "@/lib/utils";
import type { FinanceSummary as Summary } from "@/types";

// Fechas del filtro en hora local (lo que el usuario ve en el calendario);
// se convierten a instantes UTC al consultar porque createdAt se guarda en UTC
function localYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function firstOfMonth() {
  const d = new Date();
  d.setDate(1);
  return localYMD(d);
}

function today() {
  return localYMD(new Date());
}

export function FinanceSummary() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set("from", new Date(`${from}T00:00:00`).toISOString());
    if (to) params.set("to", new Date(`${to}T23:59:59.999`).toISOString());
    fetch(`/api/finance/summary?${params}`)
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok || !data?.totals) {
          setSummary(null);
          setError((data as { error?: string } | null)?.error ?? "No se pudo cargar el resumen");
          return;
        }
        setError("");
        setSummary(data as Summary);
      })
      .catch(() => { setSummary(null); setError("No se pudo cargar el resumen"); })
      .finally(() => setLoading(false));
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const totals = summary?.totals;

  return (
    <div>
      {/* Rango de fechas */}
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
      </div>

      {error && (
        <div className="bg-bg-surface border border-rose/30 rounded-xl px-4 py-3 mb-6 text-sm text-rose">
          {error}
        </div>
      )}

      {/* KPIs */}
      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-bg-surface border border-border rounded-xl p-4">
            <p className="text-xs text-text-secondary">Ventas</p>
            <p className="text-2xl font-bold text-text-primary mt-1">{formatCurrency(totals.ventas)}</p>
          </div>
          <div className="bg-bg-surface border border-border rounded-xl p-4">
            <p className="text-xs text-text-secondary">Costo</p>
            <p className="text-2xl font-bold text-rose mt-1">{formatCurrency(totals.costo)}</p>
          </div>
          <div className="bg-bg-surface border border-border rounded-xl p-4">
            <p className="text-xs text-text-secondary">Utilidad bruta</p>
            <p className="text-2xl font-bold text-gold mt-1">{formatCurrency(totals.utilidad)}</p>
          </div>
          <div className="bg-bg-surface border border-border rounded-xl p-4">
            <p className="text-xs text-text-secondary">Margen</p>
            <p className="text-2xl font-bold text-text-primary mt-1">{totals.margenPct}%</p>
          </div>
        </div>
      )}

      {/* Por producto */}
      <div className="bg-bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">
            Utilidad por producto ({loading ? "…" : summary?.byProduct.length ?? 0})
          </h2>
        </div>

        {loading ? (
          <div className="py-16 text-center text-text-secondary text-sm">Cargando…</div>
        ) : !summary || summary.byProduct.length === 0 ? (
          <div className="py-16 text-center text-text-secondary text-sm">
            No hay ventas en el período seleccionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-secondary border-b border-border">
                  <th className="px-6 py-3 font-medium">Producto</th>
                  <th className="px-3 py-3 font-medium text-right">Unidades</th>
                  <th className="px-3 py-3 font-medium text-right">Ventas</th>
                  <th className="px-3 py-3 font-medium text-right">Costo</th>
                  <th className="px-3 py-3 font-medium text-right">Utilidad</th>
                  <th className="px-3 py-3 font-medium text-right">Margen</th>
                  <th className="px-6 py-3 font-medium text-right">Receta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {summary.byProduct.map((row) => (
                  <tr key={row.productId} className="hover:bg-bg-elevated transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-text-primary font-medium">{row.name}</span>
                        {row.sinReceta && <Badge variant="warning">Costo incompleto</Badge>}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right text-text-secondary">{row.unidades}</td>
                    <td className="px-3 py-3 text-right text-text-primary">{formatCurrency(row.ventas)}</td>
                    <td className="px-3 py-3 text-right text-text-secondary">{formatCurrency(row.costo)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-gold">{formatCurrency(row.utilidad)}</td>
                    <td className="px-3 py-3 text-right text-text-primary">{row.margenPct}%</td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => setEditing({ id: row.productId, name: row.name })}
                        className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-gold transition-colors"
                      >
                        <NotebookPen size={14} />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totals && totals.itemsSinCosto > 0 && (
          <div className="px-6 py-3 border-t border-border text-xs text-text-secondary">
            {totals.itemsSinCosto} concepto{totals.itemsSinCosto === 1 ? "" : "s"} con costo no
            registrado (ventas previas al módulo o productos sin receta) — se excluyen del costo.
          </div>
        )}
      </div>

      {editing && (
        <RecipeEditor
          productId={editing.id}
          productName={editing.name}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}
