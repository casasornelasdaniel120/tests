"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const CATEGORIES = [
  "Retrato",
  "Corporativo",
  "Quinceañera",
  "Familia",
  "Bebé",
  "Otro",
];

interface ProductData {
  id?: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  category: string;
  active: boolean;
}

interface ProductFormProps {
  initial: ProductData | null;
  onSave: () => void;
  onCancel: () => void;
}

export function ProductForm({ initial, onSave, onCancel }: ProductFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial?.price?.toString() ?? "");
  const [image, setImage] = useState(initial?.image ?? "");
  const [category, setCategory] = useState(initial?.category ?? CATEGORIES[0]);
  const [active, setActive] = useState(initial?.active ?? true);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      name,
      description: description || undefined,
      price: parseFloat(price),
      image: image || undefined,
      category,
      active,
    };

    const url = initial?.id ? `/api/products/${initial.id}` : "/api/products";
    const method = initial?.id ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);
    onSave();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Nombre *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="col-span-2"
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">
            Categoría
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 bg-bg-elevated border border-border rounded-lg px-3 text-sm text-text-primary focus:outline-none focus:border-gold/60"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="Precio *"
          type="number"
          min={0}
          step={0.01}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-secondary">
          Descripción
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-gold/60 resize-none"
          placeholder="Descripción del paquete…"
        />
      </div>

      <Input
        label="URL de imagen"
        value={image}
        onChange={(e) => setImage(e.target.value)}
        placeholder="/uploads/retrato.jpg o https://…"
      />

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="w-4 h-4 accent-gold"
        />
        <span className="text-sm text-text-primary">Producto activo (visible en POS)</span>
      </label>

      <div className="flex gap-3 pt-2">
        <Button variant="ghost" type="button" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" loading={loading} className="flex-1">
          {initial ? "Guardar cambios" : "Crear producto"}
        </Button>
      </div>
    </form>
  );
}
