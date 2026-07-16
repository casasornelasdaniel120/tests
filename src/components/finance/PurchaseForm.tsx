"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";
import type { Insumo } from "@/types";

interface PurchaseFormProps {
  onClose: () => void;
  onSaved: () => void;
}

interface Row {
  insumoId: string;
  quantity: string;
  unitCost: string;
}

export function PurchaseForm({ onClose, onSaved }: PurchaseFormProps) {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[]>([{ insumoId: "", quantity: "1", unitCost: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/insumos?type=MATERIAL&active=true")
      .then((r) => r.json())
      .then((data: Insumo[]) => setInsumos(Array.isArray(data) ? data : []));
  }, []);

  const total = rows.reduce((sum, row) => {
    const qty = Number(row.quantity);
    const cost = Number(row.unitCost);
    if (Number.isNaN(qty) || Number.isNaN(cost)) return sum;
    return sum + qty * cost;
  }, 0);

  const save = async () => {
    setError("");
    const items = rows
      .filter((r) => r.insumoId)
      .map((r) => ({
        insumoId: r.insumoId,
        quantity: Number(r.quantity),
        unitCost: Number(r.unitCost),
      }));
    if (items.length === 0) {
      setError("Agrega al menos un insumo a la compra");
      return;
    }
    if (items.some((i) => Number.isNaN(i.quantity) || i.quantity <= 0 || Number.isNaN(i.unitCost) || i.unitCost < 0)) {
      setError("Cada renglón necesita cantidad > 0 y costo unitario ≥ 0");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplier, notes, items }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "No se pudo registrar la compra");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Nueva orden de compra" size="lg">
      <div className="flex flex-col gap-4">
        <Input
          label="Proveedor (opcional)"
          value={supplier}
          onChange={(e) => setSupplier(e.target.value)}
          placeholder="Ej. Proveedora Dental del Centro"
        />

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-text-secondary">Insumos</label>
          {rows.map((row, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <select
                value={row.insumoId}
                onChange={(e) => {
                  const next = [...rows];
                  next[idx] = { ...next[idx], insumoId: e.target.value };
                  setRows(next);
                }}
                className="flex-1 min-w-0 h-10 bg-bg-elevated border border-border rounded-lg px-3 text-sm text-text-primary focus:outline-none focus:border-gold/60"
              >
                <option value="">Selecciona material…</option>
                {insumos.map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
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
                className="w-16 sm:w-20 h-10 bg-bg-elevated border border-border rounded-lg px-2 sm:px-3 text-sm text-text-primary text-right focus:outline-none focus:border-gold/60 shrink-0"
                placeholder="Cant."
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={row.unitCost}
                onChange={(e) => {
                  const next = [...rows];
                  next[idx] = { ...next[idx], unitCost: e.target.value };
                  setRows(next);
                }}
                className="w-20 sm:w-24 h-10 bg-bg-elevated border border-border rounded-lg px-2 sm:px-3 text-sm text-text-primary text-right focus:outline-none focus:border-gold/60 shrink-0"
                placeholder="$ unit."
              />
              <button
                onClick={() => setRows(rows.filter((_, i) => i !== idx))}
                disabled={rows.length === 1}
                className="text-text-secondary hover:text-rose transition-colors disabled:opacity-30 shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            onClick={() => setRows([...rows, { insumoId: "", quantity: "1", unitCost: "" }])}
            className="flex items-center gap-1.5 text-sm text-cta hover:underline w-fit"
          >
            <Plus size={16} />
            Agregar renglón
          </button>
        </div>

        <Input
          label="Notas (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Factura, referencia…"
        />

        <div className="flex justify-between text-sm border-t border-border pt-3">
          <span className="text-text-secondary">Total de la compra</span>
          <span className="font-semibold text-text-primary">{formatCurrency(total)}</span>
        </div>

        <p className="text-xs text-text-secondary">
          Al registrar la compra, el stock de cada material aumenta y su costo se
          recalcula como promedio ponderado.
        </p>

        {error && <p className="text-sm text-rose">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Registrar compra</Button>
        </div>
      </div>
    </Modal>
  );
}
