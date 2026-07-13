import type { Role, PaymentMethod } from "@prisma/client";

export type { Role, PaymentMethod };

export interface CartItem {
  productId: string;
  name: string;
  image: string | null;
  unitPrice: number;
  quantity: number;
  discount: number;
  subtotal: number;
}

export interface PaymentEntry {
  method: PaymentMethod;
  amount: number;
}

export interface CreateSalePayload {
  clientId?: string;
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    subtotal: number;
  }[];
  subtotal: number;
  discount: number;
  total: number;
  payments: PaymentEntry[];
  notes?: string;
  affiliateId?: string;
}

export interface SaleWithDetails {
  id: string;
  createdAt: Date;
  subtotal: number;
  discount: number;
  total: number;
  notes: string | null;
  user: { id: string; name: string };
  client: { id: string; name: string; phone: string | null; email: string | null } | null;
  affiliate?: { id: string; name: string } | null;
  items: {
    id: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    subtotal: number;
    product: { id: string; name: string; image: string | null };
  }[];
  payments: { id: string; method: PaymentMethod; amount: number }[];
}
