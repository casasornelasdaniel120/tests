"use client";

import { useState } from "react";
import Image from "next/image";
import { Search, Plus, TreePine } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  category: string;
}

interface ProductGridProps {
  products: Product[];
  allProducts: Product[];
  search: string;
  loading: boolean;
  onSearch: (v: string) => void;
  onAdd: (product: Product) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Retrato: "bg-amber-50 text-amber-700 border border-amber-200",
  Corporativo: "bg-blue-50 text-blue-700 border border-blue-200",
  Quinceañera: "bg-pink-50 text-pink-700 border border-pink-200",
  Familia: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Bebé: "bg-violet-50 text-violet-700 border border-violet-200",
};

function SkeletonCard() {
  return (
    <div className="bg-bg-surface border border-border rounded-2xl overflow-hidden animate-pulse">
      <div className="aspect-video bg-bg-elevated" />
      <div className="p-4 flex flex-col gap-2">
        <div className="h-4 w-16 bg-bg-elevated rounded-full" />
        <div className="h-4 w-3/4 bg-bg-elevated rounded" />
        <div className="h-3 w-full bg-bg-elevated rounded" />
        <div className="h-5 w-20 bg-bg-elevated rounded mt-1" />
      </div>
    </div>
  );
}

export function ProductGrid({ products, allProducts, search, loading, onSearch, onAdd }: ProductGridProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = Array.from(new Set(allProducts.map((p) => p.category))).sort();

  const visible = activeCategory
    ? products.filter((p) => p.category === activeCategory)
    : products;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 sm:px-6 pt-3 sm:pt-4 pb-3 border-b border-border bg-bg-surface flex flex-col gap-3">
        <Input
          placeholder="Buscar paquete o categoría…"
          value={search}
          onChange={(e) => { onSearch(e.target.value); setActiveCategory(null); }}
          leftIcon={<Search size={16} />}
        />
        {!loading && categories.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all border cursor-pointer ${
                activeCategory === null
                  ? "bg-gold/10 text-gold border-gold/30 shadow-sm"
                  : "border-border text-text-secondary hover:text-text-primary hover:border-gold/30"
              }`}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all border cursor-pointer ${
                  activeCategory === cat
                    ? "bg-gold/10 text-gold border-gold/30 shadow-sm"
                    : "border-border text-text-secondary hover:text-text-primary hover:border-gold/30"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary gap-3">
            <TreePine size={40} className="opacity-20 text-gold" />
            <p className="text-sm">No hay productos activos</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {visible.map((product) => (
              <button
                key={product.id}
                onClick={() => onAdd(product)}
                className="group relative bg-bg-surface border border-border rounded-2xl overflow-hidden text-left hover:border-gold/40 transition-all hover:shadow-lg hover:shadow-black/5 cursor-pointer"
              >
                <div className="aspect-video bg-bg-elevated relative overflow-hidden">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-secondary/30 text-4xl font-light">
                      {product.name[0]}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gold/0 group-hover:bg-gold/5 transition-colors flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all shadow-md">
                      <Plus size={20} className="text-white" />
                    </div>
                  </div>
                </div>
                <div className="p-2.5 sm:p-4">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      CATEGORY_COLORS[product.category] ?? "bg-bg-elevated text-text-secondary border border-border"
                    }`}
                  >
                    {product.category}
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-text-primary mt-1.5 sm:mt-2 leading-tight">
                    {product.name}
                  </p>
                  {product.description && (
                    <p className="text-xs text-text-secondary mt-1 line-clamp-2 hidden sm:block">
                      {product.description}
                    </p>
                  )}
                  <p className="text-sm sm:text-base font-bold text-gold mt-2 sm:mt-3">
                    {formatCurrency(product.price)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
