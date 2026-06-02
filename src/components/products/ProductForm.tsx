"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, X } from "lucide-react";
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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");
    setUploading(true);

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json() as { url?: string; error?: string };

    setUploading(false);

    if (!res.ok || !data.url) {
      setUploadError(data.error ?? "Error al subir imagen");
      return;
    }

    setImage(data.url);
  }

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
          <label className="text-sm font-medium text-text-secondary">Categoría</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 bg-bg-elevated border border-border rounded-lg px-3 text-sm text-text-primary focus:outline-none focus:border-gold/60"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
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
        <label className="text-sm font-medium text-text-secondary">Descripción</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-gold/60 resize-none"
          placeholder="Descripción del paquete…"
        />
      </div>

      {/* Image upload */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-secondary">Imagen</label>

        {image ? (
          <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-border bg-bg-elevated">
            <Image src={image} alt="Preview" fill className="object-cover" />
            <button
              type="button"
              onClick={() => { setImage(""); if (fileRef.current) fileRef.current.value = ""; }}
              className="absolute top-2 right-2 w-7 h-7 bg-black/70 rounded-full flex items-center justify-center hover:bg-black transition-colors"
            >
              <X size={14} className="text-white" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full aspect-video border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 hover:border-gold/40 hover:bg-bg-elevated transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <span className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Upload size={24} className="text-text-secondary" />
                <span className="text-sm text-text-secondary">
                  Haz clic para subir imagen
                </span>
                <span className="text-xs text-text-secondary/60">
                  JPG, PNG, WebP · máx 5 MB
                </span>
              </>
            )}
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileChange}
        />

        {uploadError && (
          <p className="text-xs text-red-400">{uploadError}</p>
        )}

        {/* Manual URL fallback */}
        {!image && (
          <Input
            placeholder="O pega una URL de imagen…"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            className="mt-1"
          />
        )}
      </div>

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
