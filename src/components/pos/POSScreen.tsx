"use client";

import { useState, useEffect } from "react";
import { ProductGrid } from "./ProductGrid";
import { Cart } from "./Cart";
import { PaymentModal } from "./PaymentModal";
import { TicketPreview } from "./TicketPreview";
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

  async function handleConfirmPayment(payments: PaymentEntry[]) {
    const payload: CreateSalePayload = {
      clientId: selectedClient?.id,
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
    }
  }

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col overflow-hidden">
        <ProductGrid
          products={filtered}
          allProducts={products}
          search={search}
          loading={productsLoading}
          onSearch={setSearch}
          onAdd={addToCart}
        />
      </div>

      <Cart
        cart={cart}
        globalDiscount={globalDiscount}
        subtotal={subtotal}
        itemDiscounts={itemDiscounts}
        total={total}
        selectedClient={selectedClient}
        onUpdateItem={updateItem}
        onRemoveItem={removeItem}
        onGlobalDiscount={setGlobalDiscount}
        onSelectClient={setSelectedClient}
        onCharge={() => setPaymentOpen(true)}
      />

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
