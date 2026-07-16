"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Insumo, InsumoType } from "@/types";

interface InsumoFormProps {
  initial?: Insumo | null;
  onClose: () => void;
  onSaved: () => void;
}

export function InsumoForm({ initial, onClose, onSaved }: InsumoFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<InsumoType>(initial?.type ?? "MATERIAL");
  const [unit, setUnit] = useState(initial?.unit ?? "pieza");
  const [currentCost, setCurrentCost] = useState(
    initial ? String(Number(initial.currentCost)) : "0"
  );
  const [minStock, setMinStock] = useState(initial ? String(Number(initial.minStock)) : "0");
  const [active, setActive] = useState(initial?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEdit = Boolean(initial?.id);
  // El costo de un MATERIAL existente sale del promedio de compras
  const costEditable = !isEdit || initial?.type === "MANO_DE_OBRA";

  const save = async () => {
    setError("");
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name,
        unit,
        minStock: Number(minStock),
        active,
      };
      if (!isEdit) payload.type = type;
      if (costEditable) payload.currentCost = Number(currentCost);

      const res = await fetch(isEdit ? `/api/insumos/${initial!.id}` : "/api/insumos", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "No se pudo guardar el insumo");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={isEdit ? "Editar insumo" : "Nuevo insumo"}>
      <div className="flex flex-col gap-4">
        <Input
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Placa radiográfica"
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Tipo</label>
          <select
            value={type}
            onChange={(e) => {
              const t = e.target.value as InsumoType;
              setType(t);
              setUnit(t === "MANO_DE_OBRA" ? "hora" : "pieza");
            }}
            disabled={isEdit}
            className="h-10 bg-bg-elevated border border-border rounded-lg px-3 text-sm text-text-primary focus:outline-none focus:border-gold/60 disabled:opacity-50"
          >
            <option value="MATERIAL">Material (inventariado)</option>
            <option value="MANO_DE_OBRA">Mano de obra (tarifa por hora)</option>
          </select>
          {isEdit && (
            <p className="text-xs text-text-secondary">El tipo no se puede cambiar.</p>
          )}
        </div>

        <Input
          label="Unidad"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="pieza, hora, ml…"
        />

        <div className="flex flex-col gap-1.5">
          <Input
            label={type === "MANO_DE_OBRA" ? "Tarifa por unidad" : "Costo unitario"}
            type="number"
            min="0"
            step="0.01"
            value={currentCost}
            onChange={(e) => setCurrentCost(e.target.value)}
            disabled={!costEditable}
          />
          {!costEditable && (
            <p className="text-xs text-text-secondary">
              El costo de un material se actualiza con órdenes de compra (promedio ponderado).
            </p>
          )}
        </div>

        {type === "MATERIAL" && (
          <Input
            label="Stock mínimo (alerta)"
            type="number"
            min="0"
            step="0.001"
            value={minStock}
            onChange={(e) => setMinStock(e.target.value)}
          />
        )}

        {isEdit && (
          <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="accent-gold"
            />
            Activo
          </label>
        )}

        {error && <p className="text-sm text-rose">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} loading={saving} disabled={!name.trim()}>
            {isEdit ? "Guardar" : "Crear insumo"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
