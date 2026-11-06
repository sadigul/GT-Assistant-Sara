"use client";

import React from "react";
import { InvoiceItem } from "../../types/gt-operations";
import { printStructuredDocument } from "../../lib/print-document";
import { X, Printer, Download, CheckCircle2, Building, ShieldCheck } from "lucide-react";

interface InvoiceDetailModalProps {
  invoice: InvoiceItem | null;
  onClose: () => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({ invoice, onClose }) => {
  if (!invoice) return null;

  const handlePrint = () => {
    printStructuredDocument("invoice", invoice);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-700 p-6 text-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header & Logo */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="GoldTouch"
                className="h-11 w-auto object-contain select-none"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              Automotive Dealer Supply &amp; Operations<br />
              Mid-Ohio Valley &amp; Regional Distribution Network • Huntington, WV
            </p>
          </div>

          <div className="text-right sm:pr-8">
            <span className="text-xs uppercase tracking-wider font-bold text-amber-400">TAX INVOICE</span>
            <div className="text-lg font-mono font-bold text-white">{invoice.invoiceNumber}</div>
            <div className="text-xs text-slate-400 mt-1">Date: {invoice.issueDate}</div>
            <div className="text-xs text-slate-400">Due: <strong className="text-amber-400">{invoice.dueDate}</strong></div>
          </div>
        </div>

        {/* Client & Billing Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 text-xs border-b border-slate-800">
          <div>
            <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">BILLED TO:</span>
            <div className="text-sm font-bold text-white mt-0.5">{invoice.clientName}</div>
            <div className="text-slate-400">{invoice.clientEmail}</div>
            <div className="text-slate-400 mt-1">Fulfillment: {invoice.site}</div>
          </div>
          <div className="sm:text-right">
            <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">PAYMENT STATUS:</span>
            <div className="mt-1">
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  invoice.status === "paid"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : invoice.status === "overdue"
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                }`}
              >
                {invoice.status}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-2">
              Currency: <strong>{invoice.currency} (British Pound Sterling)</strong>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="py-4">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-[10px] uppercase text-slate-400">
              <tr>
                <th className="py-2">Item Description</th>
                <th className="py-2 text-center">Qty</th>
                <th className="py-2 text-right">Unit Price</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(invoice.items || []).map((it, i) => (
                <tr key={i} className="text-slate-300">
                  <td className="py-2.5 pr-2 font-medium text-slate-200">{it.description}</td>
                  <td className="py-2.5 text-center font-mono">{it.quantity}</td>
                  <td className="py-2.5 text-right font-mono text-slate-300">£{it.unitPrice.toLocaleString()}</td>
                  <td className="py-2.5 text-right font-mono font-extrabold text-emerald-400">£{it.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="border-t border-slate-800 pt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="text-xs text-slate-400 space-y-0.5">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4" /> GoldTouch Authenticity & Quality Guaranteed
            </div>
            <p>BACS: Sort Code: 20-00-00 | Account: 83920194</p>
          </div>

          <div className="w-full sm:w-auto text-right text-xs space-y-1">
            <div className="flex justify-between sm:justify-end gap-6 text-slate-400">
              <span>Subtotal:</span>
              <span className="font-mono font-bold text-slate-200">£{invoice.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between sm:justify-end gap-6 text-slate-400">
              <span>VAT (20% standard reverse charge / included):</span>
              <span className="font-mono text-slate-200">£0.00</span>
            </div>
            <div className="flex justify-between sm:justify-end gap-6 text-sm font-bold text-slate-200 pt-1 border-t border-slate-800">
              <span>Total Due:</span>
              <span className="text-base font-extrabold font-mono text-emerald-400">£{invoice.amount.toLocaleString()} GBP</span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end gap-2.5">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            <Printer className="w-4 h-4" /> Print Invoice
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
