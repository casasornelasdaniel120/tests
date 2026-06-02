"use client";

import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Printer, X, Camera } from "lucide-react";
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

export function TicketPreview({ sale, onClose }: TicketPreviewProps) {
  const ticketRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: ticketRef,
    documentTitle: `Ticket-${sale.id}`,
  });

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
            <p className="text-xs text-gray-400 mt-1">
              {formatDate(sale.createdAt)}
            </p>
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
              <span>
                {item.quantity}× {item.product.name}
              </span>
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
          <p className="text-center text-xs text-gray-400">
            ¡Gracias por su preferencia!
          </p>
          <p className="text-center text-xs text-gray-300 mt-1">
            Folio: {sale.id.slice(-8).toUpperCase()}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            <X size={16} />
            Cerrar
          </Button>
          <Button className="flex-1" onClick={() => handlePrint()}>
            <Printer size={16} />
            Imprimir
          </Button>
        </div>
      </div>
    </Modal>
  );
}
