"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import type { PaymentEntry, PaymentMethod } from "@/types";

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TARJETA", label: "Tarjeta" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
];

interface PaymentModalProps {
  total: number;
  onClose: () => void;
  onConfirm: (payments: PaymentEntry[]) => Promise<void>;
}

export function PaymentModal({ total, onClose, onConfirm }: PaymentModalProps) {
  const [payments, setPayments] = useState<PaymentEntry[]>([
    { method: "EFECTIVO", amount: total },
  ]);
  const [cashGiven, setCashGiven] = useState(total.toString());
  const [loading, setLoading] = useState(false);

  const totalPaid = payments.reduce((a, p) => a + p.amount, 0);
  const remaining = total - totalPaid;
  const isMixed = payments.length > 1;
  const isCashOnly =
    payments.length === 1 && payments[0].method === "EFECTIVO";
  const cashChange = isCashOnly
    ? Math.max(0, parseFloat(cashGiven) - total)
    : 0;

  function updatePayment(index: number, changes: Partial<PaymentEntry>) {
    setPayments((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...changes } : p))
    );
  }

  function addPayment() {
    const usedMethods = payments.map((p) => p.method);
    const next = METHODS.find((m) => !usedMethods.includes(m.value));
    if (next) {
      setPayments((prev) => [
        ...prev,
        { method: next.value, amount: Math.max(0, remaining) },
      ]);
    }
  }

  function removePayment(index: number) {
    if (payments.length === 1) return;
    setPayments((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleConfirm() {
    const finalPayments = isCashOnly
      ? [{ method: "EFECTIVO" as PaymentMethod, amount: total }]
      : payments;

    if (Math.abs(totalPaid - total) > 0.01 && !isCashOnly) return;

    setLoading(true);
    await onConfirm(finalPayments);
    setLoading(false);
  }

  const canConfirm = isCashOnly
    ? parseFloat(cashGiven) >= total
    : Math.abs(totalPaid - total) < 0.01;

  return (
    <Modal open title="Cobro" onClose={onClose} size="sm">
      <div className="flex flex-col gap-5">
        {/* Total */}
        <div className="text-center py-4 bg-cta/5 border border-cta/20 rounded-2xl">
          <p className="text-xs text-text-secondary mb-1">Total a cobrar</p>
          <p className="text-3xl font-bold text-cta">{formatCurrency(total)}</p>
        </div>

        {/* Payment entries */}
        <div className="flex flex-col gap-3">
          {payments.map((payment, i) => (
            <div key={i} className="flex gap-2 items-center">
              <select
                value={payment.method}
                onChange={(e) =>
                  updatePayment(i, { method: e.target.value as PaymentMethod })
                }
                className="flex-1 h-10 bg-bg-elevated border border-border rounded-xl px-3 text-sm text-text-primary focus:outline-none focus:border-cta/50 focus:ring-1 focus:ring-cta/20"
              >
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                value={isCashOnly ? cashGiven : payment.amount}
                onChange={(e) => {
                  if (isCashOnly) {
                    setCashGiven(e.target.value);
                  } else {
                    updatePayment(i, { amount: parseFloat(e.target.value) || 0 });
                  }
                }}
                className="w-28 h-10 bg-bg-elevated border border-border rounded-xl px-3 text-sm text-text-primary focus:outline-none focus:border-cta/50 focus:ring-1 focus:ring-cta/20"
              />
              {payments.length > 1 && (
                <button
                  onClick={() => removePayment(i)}
                  className="text-text-secondary hover:text-red-400 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Mixed payment info */}
        {isMixed && (
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between text-text-secondary">
              <span>Pagado</span>
              <span>{formatCurrency(totalPaid)}</span>
            </div>
            <div
              className={`flex justify-between font-semibold ${remaining > 0 ? "text-red-400" : "text-emerald-400"}`}
            >
              <span>{remaining > 0 ? "Pendiente" : "Cubierto"}</span>
              <span>
                {remaining > 0 ? `−${formatCurrency(remaining)}` : "✓"}
              </span>
            </div>
          </div>
        )}

        {/* Cash change */}
        {isCashOnly && parseFloat(cashGiven) >= total && (
          <div className="flex justify-between items-center bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
            <span className="text-sm text-emerald-700 font-medium">Cambio</span>
            <span className="text-lg font-bold text-emerald-700">
              {formatCurrency(cashChange)}
            </span>
          </div>
        )}

        {/* Add method (max 3) */}
        {payments.length < 3 && (
          <button
            onClick={addPayment}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-cta transition-colors cursor-pointer"
          >
            <Plus size={14} />
            Agregar método de pago
          </button>
        )}

        <div className="flex gap-3 pt-1">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            variant="cta"
            className="flex-1"
            disabled={!canConfirm}
            loading={loading}
            onClick={handleConfirm}
          >
            Confirmar cobro
          </Button>
        </div>
      </div>
    </Modal>
  );
}
