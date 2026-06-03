"use client";

import { useState } from "react";
import { ShoppingCart, Trash2, User, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CartItem as CartItemComponent } from "./CartItem";
import { ClientSearch } from "./ClientSearch";
import { cn, formatCurrency } from "@/lib/utils";
import type { CartItem } from "@/types";

interface CartProps {
  cart: CartItem[];
  globalDiscount: number;
  subtotal: number;
  itemDiscounts: number;
  total: number;
  selectedClient: { id: string; name: string } | null;
  onUpdateItem: (productId: string, changes: Partial<CartItem>) => void;
  onRemoveItem: (productId: string) => void;
  onGlobalDiscount: (v: number) => void;
  onSelectClient: (client: { id: string; name: string } | null) => void;
  onCharge: () => void;
  className?: string;
}

export function Cart({
  cart,
  globalDiscount,
  subtotal,
  itemDiscounts,
  total,
  selectedClient,
  onUpdateItem,
  onRemoveItem,
  onGlobalDiscount,
  onSelectClient,
  onCharge,
  className,
}: CartProps) {
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [discountInput, setDiscountInput] = useState("");
  const [discountType, setDiscountType] = useState<"$" | "%">("$");

  function applyGlobalDiscount() {
    const val = parseFloat(discountInput);
    if (isNaN(val) || val < 0) return;
    const discount =
      discountType === "%"
        ? Math.min((val / 100) * subtotal, subtotal)
        : Math.min(val, subtotal);
    onGlobalDiscount(discount);
    setDiscountInput("");
  }

  return (
    <div className={cn("w-80 shrink-0 bg-bg-surface border-l border-border flex flex-col h-full shadow-sm", className)}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2 text-text-primary font-semibold">
          <ShoppingCart size={18} className="text-gold" />
          Carrito
          {cart.length > 0 && (
            <span className="ml-1 bg-gold/10 text-gold text-xs px-2 py-0.5 rounded-full border border-gold/20">
              {cart.length}
            </span>
          )}
        </div>
        {cart.length > 0 && (
          <button
            onClick={() => cart.forEach((i) => onRemoveItem(i.productId))}
            className="text-text-secondary hover:text-red-500 transition-colors cursor-pointer"
            title="Vaciar carrito"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Client */}
      <div className="px-4 py-3 border-b border-border">
        {selectedClient ? (
          <div className="flex items-center justify-between bg-gold/5 border border-gold/20 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2">
              <User size={14} className="text-gold" />
              <span className="text-sm text-text-primary font-medium">{selectedClient.name}</span>
            </div>
            <button
              onClick={() => onSelectClient(null)}
              className="text-text-secondary hover:text-text-primary cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setClientSearchOpen(true)}
            className="flex items-center gap-2 w-full text-sm text-text-secondary hover:text-gold transition-colors py-1 cursor-pointer"
          >
            <User size={14} />
            Agregar cliente (opcional)
          </button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary text-sm gap-3">
            <div className="w-14 h-14 rounded-2xl bg-bg-elevated border border-border flex items-center justify-center">
              <ShoppingCart size={24} className="opacity-30" />
            </div>
            <p>El carrito está vacío</p>
          </div>
        ) : (
          cart.map((item) => (
            <CartItemComponent
              key={item.productId}
              item={item}
              onUpdate={(changes) => onUpdateItem(item.productId, changes)}
              onRemove={() => onRemoveItem(item.productId)}
            />
          ))
        )}
      </div>

      {/* Discount + Totals */}
      <div className="px-4 py-4 border-t border-border flex flex-col gap-3">
        {/* Global discount */}
        <div className="flex gap-1.5">
          <div className="flex rounded-xl overflow-hidden border border-border shrink-0">
            {(["$", "%"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setDiscountType(t)}
                className={`w-8 h-8 text-xs font-semibold transition-colors cursor-pointer ${
                  discountType === t
                    ? "bg-gold/10 text-gold"
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
            value={discountInput}
            onChange={(e) => setDiscountInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyGlobalDiscount()}
            placeholder={discountType === "%" ? "Desc. %" : "Desc. $"}
            className="flex-1 h-8 bg-bg-elevated border border-border rounded-xl px-3 text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/20"
          />
          <button
            onClick={applyGlobalDiscount}
            className="px-3 h-8 text-xs bg-bg-elevated border border-border rounded-xl text-text-secondary hover:text-gold hover:border-gold/40 transition-colors shrink-0 cursor-pointer"
          >
            Aplicar
          </button>
        </div>

        {/* Totals */}
        <div className="flex flex-col gap-1 text-sm bg-bg-elevated rounded-2xl px-4 py-3">
          <div className="flex justify-between text-text-secondary">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {(itemDiscounts + globalDiscount) > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Descuento</span>
              <span>−{formatCurrency(itemDiscounts + globalDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-text-primary font-bold text-base pt-2 border-t border-border mt-1">
            <span>Total</span>
            <span className="text-gold">{formatCurrency(total)}</span>
          </div>
        </div>

        <Button
          variant="cta"
          size="lg"
          className="w-full"
          disabled={cart.length === 0}
          onClick={onCharge}
        >
          Cobrar {formatCurrency(total)}
        </Button>
      </div>

      {clientSearchOpen && (
        <ClientSearch
          onSelect={(client) => {
            onSelectClient(client);
            setClientSearchOpen(false);
          }}
          onClose={() => setClientSearchOpen(false)}
        />
      )}
    </div>
  );
}
