"use client";

import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Printer, X, Camera, MessageCircle, Mail } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { SaleWithDetails } from "@/types";

const METHOD_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
};

interface TicketPreviewProps {
  sale: SaleWithDetails;
  onClose: () => void;
}

function buildWhatsAppText(sale: SaleWithDetails): string {
  const folio = sale.id.slice(-8).toUpperCase();
  const items = sale.items
    .map((i) => `  • ${i.quantity}× ${i.product.name}  ${formatCurrency(Number(i.subtotal))}`)
    .join("\n");
  const discount =
    Number(sale.discount) > 0
      ? `\nDescuento: -${formatCurrency(Number(sale.discount))}`
      : "";

  return (
    `🎞️ *FOTO STUDIO — Recibo de compra*\n` +
    `Folio: ${folio}\n` +
    `Fecha: ${formatDate(sale.createdAt)}\n` +
    `─────────────────────\n` +
    `${items}\n` +
    `─────────────────────` +
    `${discount}\n` +
    `*TOTAL: ${formatCurrency(Number(sale.total))}*\n\n` +
    `¡Gracias por su preferencia! 📷`
  );
}

function buildEmailBody(sale: SaleWithDetails): string {
  const folio = sale.id.slice(-8).toUpperCase();
  const items = sale.items
    .map((i) => `${i.quantity}x ${i.product.name}: ${formatCurrency(Number(i.subtotal))}`)
    .join("%0D%0A");
  const discount =
    Number(sale.discount) > 0
      ? `%0D%0ADescuento: -${formatCurrency(Number(sale.discount))}`
      : "";

  return (
    `Folio: ${folio}%0D%0A` +
    `Fecha: ${formatDate(sale.createdAt)}%0D%0A%0D%0A` +
    `${items}` +
    `${discount}%0D%0A` +
    `Total: ${formatCurrency(Number(sale.total))}%0D%0A%0D%0A` +
    `¡Gracias por su preferencia!%0D%0AFoto Studio`
  );
}

export function TicketPreview({ sale, onClose }: TicketPreviewProps) {
  const ticketRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: ticketRef,
    documentTitle: `Ticket-${sale.id}`,
  });

  function handleWhatsApp() {
    const text = encodeURIComponent(buildWhatsAppText(sale));
    const phone = sale.client?.phone?.replace(/\D/g, "") ?? "";
    const url = phone
      ? `https://wa.me/52${phone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
  }

  function handleEmail() {
    const subject = encodeURIComponent(`Recibo Foto Studio — Folio ${sale.id.slice(-8).toUpperCase()}`);
    const body = buildEmailBody(sale);
    const to = sale.client?.email ?? "";
    window.open(`mailto:${to}?subject=${subject}&body=${body}`, "_blank");
  }

  return (
    <Modal open title="Ticket de venta" onClose={onClose} size="sm">
      <div className="flex flex-col gap-4">
        {/* Ticket */}
        <div
          ref={ticketRef}
          className="bg-white text-black p-6 rounded-xl text-sm font-mono"
          style={{ fontFamily: "monospace" }}
        >
          <div className="text-center mb-4">
            <div className="flex justify-center mb-2">
              <Camera size={24} />
            </div>
            <p className="font-bold text-base">FOTO STUDIO</p>
            <p className="text-xs text-gray-500">Fotografía Profesional</p>
            <p className="text-xs text-gray-400 mt-1">{formatDate(sale.createdAt)}</p>
          </div>

          <div className="border-t border-dashed border-gray-300 my-3" />

          {sale.client && (
            <p className="text-xs mb-2 text-gray-600">
              Cliente: <strong>{sale.client.name}</strong>
            </p>
          )}
          <p className="text-xs mb-3 text-gray-600">
            Atendido por: {sale.user.name}
          </p>

          <div className="border-t border-dashed border-gray-300 my-3" />

          {sale.items.map((item) => (
            <div key={item.id} className="flex justify-between text-xs mb-1">
              <span>{item.quantity}× {item.product.name}</span>
              <span>{formatCurrency(Number(item.subtotal))}</span>
            </div>
          ))}

          <div className="border-t border-dashed border-gray-300 my-3" />

          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Subtotal</span>
            <span>{formatCurrency(Number(sale.subtotal))}</span>
          </div>
          {Number(sale.discount) > 0 && (
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Descuento</span>
              <span>−{formatCurrency(Number(sale.discount))}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm mt-1">
            <span>TOTAL</span>
            <span>{formatCurrency(Number(sale.total))}</span>
          </div>

          <div className="border-t border-dashed border-gray-300 my-3" />

          {sale.payments.map((p) => (
            <div key={p.id} className="flex justify-between text-xs text-gray-500">
              <span>{METHOD_LABEL[p.method]}</span>
              <span>{formatCurrency(Number(p.amount))}</span>
            </div>
          ))}

          <div className="border-t border-dashed border-gray-300 my-4" />
          <p className="text-center text-xs text-gray-400">¡Gracias por su preferencia!</p>
          <p className="text-center text-xs text-gray-300 mt-1">
            Folio: {sale.id.slice(-8).toUpperCase()}
          </p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onClose}>
            <X size={16} />
            Cerrar
          </Button>
          <Button onClick={() => handlePrint()}>
            <Printer size={16} />
            Imprimir
          </Button>
          <Button
            variant="secondary"
            onClick={handleWhatsApp}
            className="border-emerald-700/40 hover:border-emerald-500/60 hover:text-emerald-400"
          >
            <MessageCircle size={16} />
            WhatsApp
          </Button>
          <Button
            variant="secondary"
            onClick={handleEmail}
            className="border-blue-700/40 hover:border-blue-500/60 hover:text-blue-400"
          >
            <Mail size={16} />
            Email
          </Button>
        </div>
      </div>
    </Modal>
  );
}
