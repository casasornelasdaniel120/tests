"use client";

import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { CartItem } from "@/types";

interface CartItemProps {
  item: CartItem;
  onUpdate: (changes: Partial<CartItem>) => void;
  onRemove: () => void;
}

export function CartItem({ item, onUpdate, onRemove }: CartItemProps) {
  const [discountType, setDiscountType] = useState<"$" | "%">("$");
  const [discountInput, setDiscountInput] = useState("");

  function applyDiscount(value: string, type: "$" | "%") {
    const num = parseFloat(value) || 0;
    const base = item.quantity * item.unitPrice;
    const discount =
      type === "%" ? Math.min((num / 100) * base, base) : Math.min(num, base);
    onUpdate({ discount });
  }

  function handleDiscountChange(value: string) {
    setDiscountInput(value);
    applyDiscount(value, discountType);
  }

  function handleTypeToggle(type: "$" | "%") {
    setDiscountType(type);
    applyDiscount(discountInput, type);
  }

  const discountLabel =
    item.discount > 0
      ? discountType === "%"
        ? `−${((item.discount / (item.quantity * item.unitPrice)) * 100).toFixed(0)}%`
        : `−${formatCurrency(item.discount)}`
      : null;

  return (
    <div className="bg-bg-elevated border border-border rounded-xl p-3 flex flex-col gap-2">
      {/* Name + delete */}
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

      {/* Quantity + subtotal */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => item.quantity > 1 && onUpdate({ quantity: item.quantity - 1 })}
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
        <div className="text-right">
          <span className="text-sm font-semibold text-gold">{formatCurrency(item.subtotal)}</span>
          {discountLabel && (
            <p className="text-xs text-emerald-400">{discountLabel}</p>
          )}
        </div>
      </div>

      {/* Discount row: type toggle + input + unit price */}
      <div className="flex gap-1.5 items-center">
        {/* Toggle $ / % */}
        <div className="flex rounded-md overflow-hidden border border-border shrink-0">
          {(["$", "%"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTypeToggle(t)}
              className={`w-7 h-7 text-xs font-medium transition-colors ${
                discountType === t
                  ? "bg-gold/20 text-gold"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={0}
          max={discountType === "%" ? 100 : undefined}
          placeholder={discountType === "%" ? "0%" : "0.00"}
          value={discountInput}
          onChange={(e) => handleDiscountChange(e.target.value)}
          className="flex-1 h-7 bg-bg-surface border border-border rounded-md px-2 text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-gold/60"
        />
        <span className="text-xs text-text-secondary shrink-0">
          {formatCurrency(item.unitPrice)}/u
        </span>
      </div>
    </div>
  );
}
