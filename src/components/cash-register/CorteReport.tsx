"use client";

import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Printer, X, Camera } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Sale {
  id: string;
  createdAt: string;
  total: number;
  discount: number;
  client: { name: string } | null;
  user: { name: string };
  payments: { method: string; amount: number }[];
}

interface Summary {
  totalAmount: number;
  totalSales: number;
  byMethod: { method: string; amount: number }[];
}

interface CorteReportProps {
  date: string;
  sales: Sale[];
  summary: Summary;
  onClose: () => void;
}

const METHOD_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
};

export function CorteReport({ date, sales, summary, onClose }: CorteReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: reportRef,
    documentTitle: `Corte-${date}`,
  });

  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Modal open title="Corte de caja" onClose={onClose} size="lg">
      <div className="flex flex-col gap-4">
        {/* Printable area */}
        <div
          ref={reportRef}
          className="bg-white text-black rounded-xl p-8 text-sm"
          style={{ fontFamily: "monospace" }}
        >
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-2">
              <Camera size={28} />
            </div>
            <p className="text-xl font-bold tracking-wide">FOTO STUDIO</p>
            <p className="text-sm text-gray-500">Fotografía Profesional</p>
            <div className="border-t border-dashed border-gray-300 my-3" />
            <p className="text-base font-bold">CORTE DE CAJA</p>
            <p className="text-sm text-gray-600 capitalize">{dateLabel}</p>
            <p className="text-xs text-gray-400 mt-1">
              Impreso: {formatDate(new Date())}
            </p>
          </div>

          {/* Resumen general */}
          <div className="border border-gray-200 rounded-lg p-4 mb-6">
            <p className="font-bold text-base mb-3 border-b border-dashed border-gray-300 pb-2">
              RESUMEN DEL DÍA
            </p>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between">
                <span className="text-gray-600">Total de transacciones</span>
                <span className="font-semibold">{summary.totalSales}</span>
              </div>
              {summary.byMethod.map((m) => (
                <div key={m.method} className="flex justify-between">
                  <span className="text-gray-600">{METHOD_LABEL[m.method] ?? m.method}</span>
                  <span className="font-semibold">{formatCurrency(m.amount)}</span>
                </div>
              ))}
              <div className="border-t border-dashed border-gray-300 mt-2 pt-2 flex justify-between text-base font-bold">
                <span>TOTAL GENERAL</span>
                <span>{formatCurrency(summary.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Detalle de ventas */}
          <p className="font-bold mb-3">DETALLE DE VENTAS</p>
          {sales.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Sin ventas registradas</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1 text-gray-500 font-medium">Hora</th>
                  <th className="text-left py-1 text-gray-500 font-medium">Cliente</th>
                  <th className="text-left py-1 text-gray-500 font-medium">Cajero</th>
                  <th className="text-left py-1 text-gray-500 font-medium">Método</th>
                  <th className="text-right py-1 text-gray-500 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-600">
                      {new Date(sale.createdAt).toLocaleTimeString("es-MX", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-1.5">{sale.client?.name ?? "—"}</td>
                    <td className="py-1.5 text-gray-600">{sale.user.name}</td>
                    <td className="py-1.5">
                      {sale.payments
                        .map((p) => METHOD_LABEL[p.method] ?? p.method)
                        .join(" + ")}
                    </td>
                    <td className="py-1.5 text-right font-medium">
                      {formatCurrency(Number(sale.total))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Footer */}
          <div className="border-t border-dashed border-gray-300 mt-6 pt-4 text-center text-xs text-gray-400">
            <p>Folio de corte: {date.replace(/-/g, "")} — {summary.totalSales} vtas</p>
            <p className="mt-1">Firma del cajero: ____________________</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            <X size={16} />
            Cerrar
          </Button>
          <Button className="flex-1" onClick={() => handlePrint()}>
            <Printer size={16} />
            Imprimir corte
          </Button>
        </div>
      </div>
    </Modal>
  );
}
