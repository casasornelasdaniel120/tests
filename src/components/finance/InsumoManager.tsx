"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { InsumoForm } from "./InsumoForm";
import { formatCurrency, cn } from "@/lib/utils";
import type { Insumo } from "@/types";

export function InsumoManager() {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Insumo | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/insumos")
      .then((r) => r.json())
      .then((data: Insumo[]) => setInsumos(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (insumo: Insumo) => {
    if (!confirm(`¿Eliminar el insumo "${insumo.name}"?`)) return;
    setError("");
    const res = await fetch(`/api/insumos/${insumo.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "No se pudo eliminar el insumo");
      return;
    }
    load();
  };

  const materials = insumos.filter((i) => i.type === "MATERIAL");
  const inventoryValue = materials.reduce(
    (sum, i) => sum + Math.max(Number(i.stock), 0) * Number(i.currentCost),
    0
  );
  const lowStock = materials.filter(
    (i) => i.active && Number(i.stock) < Number(i.minStock)
  ).length;

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-text-secondary">Valor de inventario</p>
          <p className="text-2xl font-bold text-gold mt-1">{formatCurrency(inventoryValue)}</p>
        </div>
        <div className="bg-bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-text-secondary">Insumos con stock bajo</p>
          <p className={cn("text-2xl font-bold mt-1", lowStock > 0 ? "text-rose" : "text-text-primary")}>
            {lowStock}
          </p>
        </div>
      </div>

      <div className="bg-bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">
            Insumos ({loading ? "…" : insumos.length})
          </h2>
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus size={14} />
            Nuevo insumo
          </Button>
        </div>

        {error && (
          <div className="px-6 py-3 border-b border-border text-sm text-rose">{error}</div>
        )}

        {loading ? (
          <div className="py-16 text-center text-text-secondary text-sm">Cargando…</div>
        ) : insumos.length === 0 ? (
          <div className="py-16 text-center text-text-secondary text-sm">
            Aún no hay insumos. Crea el primero para empezar a costear tus productos.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-secondary border-b border-border">
                  <th className="px-6 py-3 font-medium">Insumo</th>
                  <th className="px-3 py-3 font-medium">Tipo</th>
                  <th className="px-3 py-3 font-medium text-right">Costo promedio</th>
                  <th className="px-3 py-3 font-medium text-right">Stock</th>
                  <th className="px-3 py-3 font-medium text-right">Valor</th>
                  <th className="px-6 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {insumos.map((insumo) => {
                  const stock = Number(insumo.stock);
                  const isMaterial = insumo.type === "MATERIAL";
                  return (
                    <tr
                      key={insumo.id}
                      className={cn("hover:bg-bg-elevated transition-colors", !insumo.active && "opacity-50")}
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-text-primary font-medium">{insumo.name}</span>
                          {!insumo.active && <Badge>Inactivo</Badge>}
                        </div>
                        <p className="text-xs text-text-secondary">por {insumo.unit}</p>
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={isMaterial ? "gold" : "default"}>
                          {isMaterial ? "Material" : "Mano de obra"}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-right text-text-primary">
                        {formatCurrency(Number(insumo.currentCost))}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {isMaterial ? (
                          <span
                            className={cn(
                              "font-medium",
                              stock < 0
                                ? "text-rose"
                                : stock < Number(insumo.minStock)
                                  ? "text-amber-500"
                                  : "text-text-primary"
                            )}
                          >
                            {stock}
                          </span>
                        ) : (
                          <span className="text-text-secondary">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-text-secondary">
                        {isMaterial ? formatCurrency(stock * Number(insumo.currentCost)) : "—"}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => { setEditing(insumo); setFormOpen(true); }}
                            className="text-text-secondary hover:text-gold transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => remove(insumo)}
                            className="text-text-secondary hover:text-rose transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <InsumoForm
          initial={editing}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); load(); }}
        />
      )}
    </div>
  );
}
