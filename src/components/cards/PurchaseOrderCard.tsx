"use client";

import React, { useState } from "react";
import { ZoomIn, Printer, ChevronDown, ChevronUp } from "lucide-react";
import { formatLabel } from "../../lib/formatters";
import { printStructuredDocument } from "../../lib/print-document";
import { useProductZoom } from "../../context/ProductZoomContext";

interface PurchaseOrderCardProps {
  po: any;
  onQuickQuery?: (query: string) => void;
}

export const PurchaseOrderCard: React.FC<PurchaseOrderCardProps> = ({ po, onQuickQuery }) => {
  const items = po.items || po.lines || [];
  const [showItems, setShowItems] = useState(() => items.length > 0 && items.length <= 6);
  const { openZoom } = useProductZoom();

  const poNumber = po.poNumber || po.po_number || "PO-0000";
  const supplier = po.supplier || po.vendor_name || "Supplier";
  const status = (po.status || "draft").toLowerCase();
  const totalAmount = Number(po.totalAmount ?? po.total_amount ?? 0);
  const currency = po.currency || "USD";
  const expectedDelivery = po.expectedDelivery || po.expected_delivery_date || "TBD";
  const carrier = po.carrier || "Standard Freight";
  const category = po.category || "Dealership Supplies";

  const stages = [
    { key: "draft", label: "Draft" },
    { key: "submitted", label: "Submitted" },
    { key: "approved", label: "Approved" },
    { key: "in_transit", label: "In Transit" },
    { key: "received", label: "Received" }
  ];

  const getStageIndex = (st: string) => {
    switch (st) {
      case "draft": return 0;
      case "submitted": return 1;
      case "approved":
      case "supplier_confirmed": return 2;
      case "in_transit":
      case "shipped": return 3;
      case "received":
      case "fulfilled":
      case "completed":
      case "qc_approved": return 4;
      default: return 1;
    }
  };

  const currentIdx = getStageIndex(status);

  return (
    <div className="overflow-hidden rounded-2xl bg-white dark:bg-[#111622] text-slate-800 dark:text-slate-100 shadow-[0_6px_24px_-6px_rgba(15,23,42,0.07)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.45)] ring-1 ring-slate-900/[0.06] dark:ring-white/[0.07]">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400 dark:text-slate-500">
            <span>Purchase Order</span>
            <span>ETA {expectedDelivery}</span>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap mt-1">
            <span className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              {poNumber}
            </span>
            <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-zinc-400">
              <span
                className="h-3 w-px bg-slate-200 dark:bg-white/[0.12]"
                aria-hidden="true"
              />
              <span>{formatLabel(status)}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex-wrap">
            <span className="font-semibold text-slate-800 dark:text-slate-200">{supplier}</span>
            <span>{category}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Total ({currency})
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
              ${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Minimal Linear Progress Strip */}
      <div className="px-5 py-3.5 border-b border-slate-100 dark:border-white/[0.05] bg-slate-50/40 dark:bg-white/[0.01]">
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-2">
          <span>Procurement Stage</span>
          <span className="font-medium text-slate-700 dark:text-slate-300 tabular-nums">
            {stages[currentIdx]?.label} ({Math.round(((currentIdx + 1) / stages.length) * 100)}%)
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {stages.map((stage, idx) => (
            <div key={stage.key} className="space-y-1">
              <div
                className={`h-1.5 rounded-full transition-colors ${
                  idx <= currentIdx
                    ? "bg-slate-900 dark:bg-white"
                    : "bg-slate-200 dark:bg-slate-800"
                }`}
              />
              <div
                className={`text-[10px] truncate ${
                  idx === currentIdx
                    ? "font-semibold text-slate-900 dark:text-white"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {stage.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Line Items */}
      {items.length > 0 && (
        <div>
          <div className="px-5 py-2.5 flex items-center justify-between text-xs border-b border-slate-100 dark:border-white/[0.05]">
            <span className="text-slate-500 dark:text-slate-400">
              Carrier: <strong className="text-slate-800 dark:text-slate-200 font-medium">{carrier}</strong>
            </span>
            <button
              type="button"
              onClick={() => setShowItems(!showItems)}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white cursor-pointer"
            >
              <span>{showItems ? "Hide items" : `Show items (${items.length})`}</span>
              {showItems ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showItems && (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.05] px-5">
              {items.map((item: any, i: number) => {
                const itemName = String(item.name || item.product_name || item.sku || "");
                let itemImageUrl: string | null = item.image_url || (Array.isArray(item.images) && item.images[0]?.url) || null;
                if (!itemImageUrl || itemImageUrl.includes("atozpartyrental.com")) {
                  if (/helium/i.test(itemName) || /helium/i.test(String(item.sku || ""))) {
                    itemImageUrl = "/helium-tank.png";
                  } else if (/BumperShellz/i.test(itemName) || /ECOFK0101/i.test(String(item.sku || ""))) {
                    itemImageUrl = "https://sdda.semadata.org/Standard/Ecoological/FK0101.jpg";
                  }
                }
                const unitCost = Number(item.unitCost || item.unit_price || item.cost || 0);
                const qty = Number(item.qty || item.quantity || 1);

                return (
                  <div key={i} className="py-3 flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {itemImageUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            openZoom({
                              imageUrl: itemImageUrl!,
                              altText: itemName,
                              title: itemName,
                              sku: item.sku || undefined,
                              price: unitCost,
                            })
                          }
                          className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-slate-900/[0.08] flex items-center justify-center cursor-zoom-in group"
                        >
                          <img
                            src={itemImageUrl}
                            alt=""
                            className="h-full w-full object-contain p-0.5"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ZoomIn className="w-3 h-3 text-white" />
                          </div>
                        </button>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {itemName}
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                          {item.sku && (
                            <>
                              {onQuickQuery ? (
                                <button
                                  type="button"
                                  onClick={() => onQuickQuery(`Show me product ${item.sku}`)}
                                  className="font-mono text-[11px] underline decoration-slate-300 dark:decoration-slate-600 underline-offset-2 cursor-pointer"
                                >
                                  {item.sku}
                                </button>
                              ) : (
                                <span className="font-mono text-[11px]">{item.sku}</span>
                              )}
                            </>
                          )}
                          <span className="tabular-nums">
                            Qty {qty} {item.unit || "units"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="font-semibold text-slate-900 dark:text-white tabular-nums shrink-0">
                      ${unitCost.toFixed(2)}/{item.unit || "ea"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
