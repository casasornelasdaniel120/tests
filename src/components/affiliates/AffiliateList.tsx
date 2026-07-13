"use client";

import { useState, useEffect, useCallback } from "react";
import { Stethoscope, Banknote, Check, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";

interface Affiliate {
  id: string;
  name: string;
  email: string;
  active: boolean;
  commissionPct: number;
  balance: number;
  totalCommission: number;
  salesCount: number;
  salesTotal: number;
}

export function AffiliateList() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editingPct, setEditingPct] = useState<string | null>(null);
  const [pctValue, setPctValue] = useState("");
  const [payoutFor, setPayoutFor] = useState<Affiliate | null>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutNote, setPayoutNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch("/api/affiliates")
      .then((r) => r.json())
      .then((data: Affiliate[]) => {
        setAffiliates(data);
        setLoaded(true);
      });
  }, []);

  useEffect(load, [load]);

  async function savePct(id: string) {
    const pct = parseFloat(pctValue);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      setError("El porcentaje debe estar entre 0 y 100");
      return;
    }
    setError("");
    setSaving(true);
    const res = await fetch(`/api/affiliates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commissionPct: pct }),
    });
    setSaving(false);
    if (res.ok) {
      setEditingPct(null);
      load();
    } else {
      const data = await res.json() as { error?: string };
      setError(data.error ?? "Error al guardar");
    }
  }

  async function toggleActive(a: Affiliate) {
    await fetch(`/api/affiliates/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !a.active }),
    });
    load();
  }

  async function handlePayout(e: React.FormEvent) {
    e.preventDefault();
    if (!payoutFor) return;
    setError("");
    setSaving(true);
    const res = await fetch(`/api/affiliates/${payoutFor.id}/payout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: parseFloat(payoutAmount),
        note: payoutNote || undefined,
      }),
    });
    setSaving(false);
    const data = await res.json() as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Error al registrar el pago");
      return;
    }
    setPayoutFor(null);
    setPayoutAmount("");
    setPayoutNote("");
    load();
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
          <Stethoscope className="text-gold" size={18} />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
            Doctores afiliados
          </h1>
          <p className="text-sm text-text-secondary">
            Configura el % de comisión y registra los pagos de cada doctor
          </p>
        </div>
      </div>

      <div className="bg-bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-secondary border-b border-border">
                <th className="px-5 py-3 font-medium">Doctor</th>
                <th className="px-5 py-3 font-medium text-center">% Comisión</th>
                <th className="px-5 py-3 font-medium text-right">Ventas referidas</th>
                <th className="px-5 py-3 font-medium text-right">Acumulado</th>
                <th className="px-5 py-3 font-medium text-right">Saldo</th>
                <th className="px-5 py-3 font-medium text-center">Estado</th>
                <th className="px-5 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {affiliates.map((a) => (
                <tr key={a.id}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-text-primary">{a.name}</p>
                    <p className="text-xs text-text-secondary">{a.email}</p>
                  </td>
                  <td className="px-5 py-3 text-center">
                    {editingPct === a.id ? (
                      <span className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={pctValue}
                          onChange={(e) => setPctValue(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") savePct(a.id);
                            if (e.key === "Escape") setEditingPct(null);
                          }}
                          className="w-20 h-8 bg-bg-elevated border border-border rounded-lg px-2 text-sm text-text-primary text-center focus:outline-none focus:border-gold/60"
                        />
                        <Button variant="ghost" size="sm" loading={saving} onClick={() => savePct(a.id)}>
                          <Check size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditingPct(null)}>
                          <X size={14} />
                        </Button>
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingPct(a.id);
                          setPctValue(String(a.commissionPct));
                          setError("");
                        }}
                        className="inline-flex items-center gap-1.5 font-semibold text-text-primary hover:text-gold transition-colors cursor-pointer"
                      >
                        {a.commissionPct}%
                        <Pencil size={12} className="text-text-secondary" />
                      </button>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-text-primary whitespace-nowrap">
                    {formatCurrency(a.salesTotal)}
                    <span className="text-xs text-text-secondary"> ({a.salesCount})</span>
                  </td>
                  <td className="px-5 py-3 text-right text-text-primary">
                    {formatCurrency(a.totalCommission)}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-gold">
                    {formatCurrency(a.balance)}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button onClick={() => toggleActive(a)} className="cursor-pointer">
                      <Badge variant={a.active ? "success" : "default"}>
                        {a.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={a.balance <= 0}
                      onClick={() => {
                        setPayoutFor(a);
                        setPayoutAmount(String(a.balance));
                        setError("");
                      }}
                    >
                      <Banknote size={14} />
                      Registrar pago
                    </Button>
                  </td>
                </tr>
              ))}
              {loaded && affiliates.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-text-secondary">
                    Aún no hay doctores registrados. Comparte el link de{" "}
                    <span className="text-cta">/registro</span> con tus afiliados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {error && !payoutFor && (
          <p className="px-5 py-3 text-xs text-red-400 border-t border-border">{error}</p>
        )}
      </div>

      <Modal
        open={!!payoutFor}
        onClose={() => setPayoutFor(null)}
        title={`Registrar pago — ${payoutFor?.name ?? ""}`}
      >
        <form onSubmit={handlePayout} className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            Saldo disponible:{" "}
            <span className="font-semibold text-gold">
              {formatCurrency(payoutFor?.balance ?? 0)}
            </span>
          </p>
          <Input
            label="Monto pagado *"
            type="number"
            min={0.01}
            step={0.01}
            value={payoutAmount}
            onChange={(e) => setPayoutAmount(e.target.value)}
            required
          />
          <Input
            label="Nota (opcional)"
            placeholder="Transferencia, efectivo…"
            value={payoutNote}
            onChange={(e) => setPayoutNote(e.target.value)}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-3 pt-1">
            <Button variant="ghost" type="button" onClick={() => setPayoutFor(null)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" loading={saving} className="flex-1">
              Registrar pago
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
