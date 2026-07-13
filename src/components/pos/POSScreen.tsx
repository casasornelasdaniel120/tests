"use client";

import { useState, useEffect } from "react";
import { ShoppingCart, X } from "lucide-react";
import { ProductGrid } from "./ProductGrid";
import { Cart } from "./Cart";
import { PaymentModal } from "./PaymentModal";
import { TicketPreview } from "./TicketPreview";
import { formatCurrency } from "@/lib/utils";
import type { CartItem, CreateSalePayload, PaymentEntry, SaleWithDetails } from "@/types";

export function POSScreen() {
  const [products, setProducts] = useState<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    image: string | null;
    category: string;
  }[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [selectedClient, setSelectedClient] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<SaleWithDetails | null>(null);
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    fetch("/api/products?active=true")
      .then((r) => r.json())
      .then((data: typeof products) => setProducts(data))
      .finally(() => setProductsLoading(false));
  }, []);

  function addToCart(product: (typeof products)[0]) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? {
                ...i,
                quantity: i.quantity + 1,
                subtotal: (i.quantity + 1) * i.unitPrice - i.discount,
              }
            : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          image: product.image,
          unitPrice: Number(product.price),
          quantity: 1,
          discount: 0,
          subtotal: Number(product.price),
        },
      ];
    });
  }

  function updateItem(productId: string, changes: Partial<CartItem>) {
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        const updated = { ...item, ...changes };
        updated.subtotal =
          updated.quantity * updated.unitPrice - updated.discount;
        return updated;
      })
    );
  }

  function removeItem(productId: string) {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }

  const subtotal = cart.reduce((a, i) => a + i.quantity * i.unitPrice, 0);
  const itemDiscounts = cart.reduce((a, i) => a + i.discount, 0);
  const total = Math.max(0, subtotal - itemDiscounts - globalDiscount);

  async function handleConfirmPayment(payments: PaymentEntry[], affiliateId?: string) {
    const payload: CreateSalePayload = {
      clientId: selectedClient?.id,
      affiliateId,
      items: cart.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount,
        subtotal: i.subtotal,
      })),
      subtotal,
      discount: itemDiscounts + globalDiscount,
      total,
      payments,
    };

    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const sale = await res.json() as SaleWithDetails;
      setCompletedSale(sale);
      setCart([]);
      setGlobalDiscount(0);
      setSelectedClient(null);
      setPaymentOpen(false);
      setCartOpen(false);
    }
  }

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  const cartProps = {
    cart,
    globalDiscount,
    subtotal,
    itemDiscounts,
    total,
    selectedClient,
    onUpdateItem: updateItem,
    onRemoveItem: removeItem,
    onGlobalDiscount: setGlobalDiscount,
    onSelectClient: setSelectedClient,
  };

  return (
    <div className="flex h-full relative">
      {/* Product grid — full width on mobile/tablet, shrinks on desktop */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <ProductGrid
          products={filtered}
          allProducts={products}
          search={search}
          loading={productsLoading}
          onSearch={setSearch}
          onAdd={addToCart}
        />
      </div>

      {/* Desktop + tablet cart panel (md+) */}
      <div className="hidden md:flex md:w-64 lg:w-80 shrink-0">
        <Cart
          {...cartProps}
          className="w-full border-l-0 md:border-l"
          onCharge={() => setPaymentOpen(true)}
        />
      </div>

      {/* Mobile floating cart button (< md) */}
      {cart.length > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="md:hidden fixed bottom-20 right-4 z-30 bg-cta text-white rounded-2xl px-4 py-3 shadow-xl flex items-center gap-2 transition-all active:scale-95"
        >
          <ShoppingCart size={18} />
          <span className="font-bold">{formatCurrency(total)}</span>
          <span className="bg-white/25 rounded-full px-2 py-0.5 text-xs font-semibold">
            {cart.length}
          </span>
        </button>
      )}

      {/* Mobile cart drawer (< md) */}
      {cartOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setCartOpen(false)}
          />
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-bg-surface shadow-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: "90dvh" }}
          >
            {/* Drag handle + close */}
            <div className="flex items-center justify-between px-5 pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-border mx-auto" />
            </div>
            <button
              onClick={() => setCartOpen(false)}
              className="absolute top-3 right-4 text-text-secondary hover:text-text-primary transition-colors"
            >
              <X size={20} />
            </button>
            <Cart
              {...cartProps}
              className="w-full border-l-0 h-auto flex-1"
              onCharge={() => { setCartOpen(false); setPaymentOpen(true); }}
            />
          </div>
        </div>
      )}

      {paymentOpen && (
        <PaymentModal
          total={total}
          onClose={() => setPaymentOpen(false)}
          onConfirm={handleConfirmPayment}
        />
      )}

      {completedSale && (
        <TicketPreview
          sale={completedSale}
          onClose={() => setCompletedSale(null)}
        />
      )}
    </div>
  );
}
