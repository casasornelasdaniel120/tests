"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ProductForm } from "./ProductForm";
import { formatCurrency } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  category: string;
  active: boolean;
}

export function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const load = useCallback(() => {
    fetch(`/api/products?search=${encodeURIComponent(search)}`)
      .then((r) => r.json())
      .then((data: Product[]) => setProducts(data));
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  function openEdit(product: Product) {
    setEditing(product);
    setFormOpen(true);
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  async function handleDelete(product: Product) {
    if (!confirm(`¿Eliminar "${product.name}"? Esta acción no se puede deshacer.`)) return;
    await fetch(`/api/products/${product.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Productos</h1>
        <Button onClick={openCreate}>
          <Plus size={16} />
          Nuevo producto
        </Button>
      </div>

      <Input
        placeholder="Buscar por nombre o categoría…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftIcon={<Search size={16} />}
        className="mb-6 max-w-md"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-bg-surface border border-border rounded-2xl overflow-hidden"
          >
            <div className="aspect-video bg-bg-elevated relative">
              {product.image ? (
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-secondary/20 text-5xl font-light">
                  {product.name[0]}
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <p className="font-semibold text-text-primary text-sm">
                    {product.name}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {product.category}
                  </p>
                </div>
                <Badge variant={product.active ? "success" : "default"}>
                  {product.active ? "Activo" : "Inactivo"}
                </Badge>
              </div>
              {product.description && (
                <p className="text-xs text-text-secondary mb-3 line-clamp-2">
                  {product.description}
                </p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-gold">
                  {formatCurrency(product.price)}
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(product)}>
                    <Pencil size={14} />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(product)}
                    className="hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {products.length === 0 && (
          <div className="col-span-3 py-16 text-center text-text-secondary">
            No hay productos.
          </div>
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Editar producto" : "Nuevo producto"}
        size="lg"
      >
        <ProductForm
          initial={editing}
          onSave={() => {
            setFormOpen(false);
            load();
          }}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>
    </div>
  );
}
