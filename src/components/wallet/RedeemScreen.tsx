"use client";

import { useState, useRef } from "react";
import { QrCode, CheckCircle2, RotateCcw, Stethoscope } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";

interface ScannedAffiliate {
  id: string;
  name: string;
  email: string;
  commissionPct: number;
  balance: number;
}

export function RedeemScreen() {
  const [code, setCode] = useState("");
  const [affiliate, setAffiliate] = useState<ScannedAffiliate | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ name: string; amount: number; balance: number } | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  function reset() {
    setCode("");
    setAffiliate(null);
    setAmount("");
    setNote("");
    setError("");
    setDone(null);
    setTimeout(() => codeRef.current?.focus(), 50);
  }

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setError("");
    setLoading(true);
    const res = await fetch(`/api/wallet/scan?token=${encodeURIComponent(code.trim())}`);
    const data = await res.json() as ScannedAffiliate & { error?: string };
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Código no reconocido");
      return;
    }
    setAffiliate(data);
    setAmount(String(data.balance));
  }

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!affiliate) return;
    setError("");
    setLoading(true);
    const res = await fetch("/api/wallet/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: code.trim(),
        amount: parseFloat(amount),
        note: note || undefined,
      }),
    });
    const data = await res.json() as { name: string; amount: number; balance: number; error?: string };
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo registrar el canje");
      return;
    }
    setDone(data);
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-2xl bg-cta/10 border border-cta/20 flex items-center justify-center">
          <QrCode className="text-cta" size={18} />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
            Canje de monedero
          </h1>
          <p className="text-sm text-text-secondary">
            Escanea el pase digital del doctor para pagarle su saldo
          </p>
        </div>
      </div>

      {done ? (
        <div className="bg-bg-surface border border-border rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
          <CheckCircle2 size={48} className="text-gold" />
          <p className="text-lg font-semibold text-text-primary">
            Pago registrado a {done.name}
          </p>
          <p className="text-3xl font-bold text-gold">{formatCurrency(done.amount)}</p>
          <p className="text-sm text-text-secondary">
            Saldo restante: {formatCurrency(done.balance)}
          </p>
          <Button onClick={reset} className="mt-3">
            <RotateCcw size={16} />
            Nuevo canje
          </Button>
        </div>
      ) : !affiliate ? (
        <form
          onSubmit={handleScan}
          className="bg-bg-surface border border-border rounded-2xl p-6 flex flex-col gap-4"
        >
          <Input
            ref={codeRef}
            label="Código del pase"
            placeholder="Escanea el QR o escribe el código…"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoFocus
          />
          <p className="text-xs text-text-secondary">
            El lector de QR escribe el código automáticamente y presiona Enter.
          </p>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" variant="cta" loading={loading} disabled={!code.trim()}>
            Buscar doctor
          </Button>
        </form>
      ) : (
        <form
          onSubmit={handleRedeem}
          className="bg-bg-surface border border-border rounded-2xl p-6 flex flex-col gap-4"
        >
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
              <Stethoscope size={18} className="text-gold" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-text-primary">{affiliate.name}</p>
              <p className="text-xs text-text-secondary">{affiliate.email}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-secondary">Saldo</p>
              <p className="text-lg font-bold text-gold">
                {formatCurrency(affiliate.balance)}
              </p>
            </div>
          </div>

          <Input
            label="Monto a pagar *"
            type="number"
            min={0.01}
            step={0.01}
            max={affiliate.balance}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Nota (opcional)"
            placeholder="Canje en tienda"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-3">
            <Button variant="ghost" type="button" onClick={reset} className="flex-1">
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="cta"
              loading={loading}
              className="flex-1"
              disabled={!amount || parseFloat(amount) <= 0}
            >
              Pagar {amount ? formatCurrency(parseFloat(amount) || 0) : ""}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
