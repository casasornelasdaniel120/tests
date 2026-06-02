"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { CartItem } from "@/types";

interface CartItemProps {
  item: CartItem;
  onUpdate: (changes: Partial<CartItem>) => void;
  onRemove: () => void;
}

export function CartItem({ item, onUpdate, onRemove }: CartItemProps) {
  return (
    <div className="bg-bg-elevated border border-border rounded-xl p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-text-primary leading-tight flex-1">
          {item.name}
        </p>
        <button
          onClick={onRemove}
          className="text-text-secondary hover:text-red-400 transition-colors shrink-0"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="flex items-center justify-between">
        {/* Quantity */}
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              item.quantity > 1 && onUpdate({ quantity: item.quantity - 1 })
            }
            className="w-6 h-6 rounded-md bg-bg-surface border border-border flex items-center justify-center text-text-secondary hover:text-gold hover:border-gold/40 transition-colors"
          >
            <Minus size={12} />
          </button>
          <span className="text-sm font-medium text-text-primary w-5 text-center">
            {item.quantity}
          </span>
          <button
            onClick={() => onUpdate({ quantity: item.quantity + 1 })}
            className="w-6 h-6 rounded-md bg-bg-surface border border-border flex items-center justify-center text-text-secondary hover:text-gold hover:border-gold/40 transition-colors"
          >
            <Plus size={12} />
          </button>
        </div>

        {/* Subtotal */}
        <span className="text-sm font-semibold text-gold">
          {formatCurrency(item.subtotal)}
        </span>
      </div>

      {/* Per-item discount */}
      <div className="flex gap-1.5 items-center">
        <input
          type="number"
          min={0}
          placeholder="Desc. $"
          value={item.discount || ""}
          onChange={(e) =>
            onUpdate({ discount: parseFloat(e.target.value) || 0 })
          }
          className="w-full h-7 bg-bg-surface border border-border rounded-md px-2 text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-gold/60"
        />
        <span className="text-xs text-text-secondary shrink-0">
          {formatCurrency(item.unitPrice)}/u
        </span>
      </div>
    </div>
  );
}
