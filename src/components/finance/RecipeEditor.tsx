"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import type { Insumo, RecipeItem } from "@/types";

interface RecipeEditorProps {
  productId: string;
  productName: string;
  onClose: () => void;
  onSaved: () => void;
}

interface Row {
  insumoId: string;
  quantity: string; // texto del input; se valida al guardar
}

export function RecipeEditor({ productId, productName, onClose, onSaved }: RecipeEditorProps) {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [productPrice, setProductPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Sin filtro de activos: una receta puede referenciar un insumo ya
    // desactivado y debe verse (la venta lo sigue costeando y consumiendo)
    Promise.all([
      fetch("/api/insumos").then((r) => r.json()),
      fetch(`/api/products/${productId}/recipe`).then((r) => r.json()),
      fetch(`/api/products/${productId}`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([insumosData, recipeData, product]: [Insumo[], RecipeItem[], { price?: number } | null]) => {
        setInsumos(Array.isArray(insumosData) ? insumosData : []);
        setRows(
          (Array.isArray(recipeData) ? recipeData : []).map((r) => ({
            insumoId: r.insumoId,
            quantity: String(Number(r.quantity)),
          }))
        );
        if (product?.price !== undefined) setProductPrice(Number(product.price));
      })
      .finally(() => setLoading(false));
  }, [productId]);

  const costFor = (row: Row) => {
    const insumo = insumos.find((i) => i.id === row.insumoId);
    const qty = Number(row.quantity);
    if (!insumo || Number.isNaN(qty)) return 0;
    return qty * Number(insumo.currentCost);
  };

  const totalCost = rows.reduce((sum, row) => sum + costFor(row), 0);
  const usedIds = new Set(rows.map((r) => r.insumoId));

  const save = async () => {
    setError("");
    const items = rows
      .filter((r) => r.insumoId)
      .map((r) => ({ insumoId: r.insumoId, quantity: Number(r.quantity) }));
    if (items.some((i) => Number.isNaN(i.quantity) || i.quantity <= 0)) {
      setError("Todas las cantidades deben ser mayores a 0");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${productId}/recipe`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "No se pudo guardar la receta");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Receta — ${productName}`} size="lg">
      {loading ? (
        <div className="py-10 text-center text-text-secondary text-sm">Cargando…</div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-text-secondary">
            Insumos que consume cada unidad vendida. El costo usa el promedio vigente de
            cada insumo y se congela en el momento de la venta.
          </p>

          {rows.map((row, idx) => {
            const insumo = insumos.find((i) => i.id === row.insumoId);
            return (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={row.insumoId}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...next[idx], insumoId: e.target.value };
                    setRows(next);
                  }}
                  className="flex-1 h-10 bg-bg-elevated border border-border rounded-lg px-3 text-sm text-text-primary focus:outline-none focus:border-gold/60"
                >
                  <option value="">Selecciona insumo…</option>
                  {insumos
                    .filter((i) => i.id === row.insumoId || (i.active && !usedIds.has(i.id)))
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({formatCurrency(Number(i.currentCost))}/{i.unit})
                        {i.active ? "" : " — inactivo"}
                      </option>
                    ))}
                </select>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={row.quantity}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...next[idx], quantity: e.target.value };
                    setRows(next);
                  }}
                  className="w-24 h-10 bg-bg-elevated border border-border rounded-lg px-3 text-sm text-text-primary text-right focus:outline-none focus:border-gold/60"
                  placeholder="Cant."
                />
                <span className="w-24 text-right text-sm text-text-secondary shrink-0">
                  {insumo ? formatCurrency(costFor(row)) : "—"}
                </span>
                <button
                  onClick={() => setRows(rows.filter((_, i) => i !== idx))}
                  className="text-text-secondary hover:text-rose transition-colors shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}

          <button
            onClick={() => setRows([...rows, { insumoId: "", quantity: "1" }])}
            className="flex items-center gap-1.5 text-sm text-cta hover:underline w-fit"
          >
            <Plus size={16} />
            Agregar insumo
          </button>

          <div className="border-t border-border pt-3 mt-1 flex flex-col gap-1">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Costo total estimado</span>
              <span className="font-semibold text-text-primary">{formatCurrency(totalCost)}</span>
            </div>
            {productPrice !== null && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Precio de venta</span>
                  <span className="text-text-primary">{formatCurrency(productPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Utilidad estimada</span>
                  <span className={productPrice - totalCost >= 0 ? "font-semibold text-gold" : "font-semibold text-rose"}>
                    {formatCurrency(productPrice - totalCost)}
                    {productPrice > 0 &&
                      ` (${Math.round(((productPrice - totalCost) / productPrice) * 1000) / 10}%)`}
                  </span>
                </div>
              </>
            )}
          </div>

          {error && <p className="text-sm text-rose">{error}</p>}

          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button onClick={save} loading={saving}>Guardar receta</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
