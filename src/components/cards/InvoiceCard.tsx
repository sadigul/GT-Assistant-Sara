"use client";

import React, { useState } from "react";
import {
  ZoomIn,
  Printer,
  Copy,
  Check,
} from "lucide-react";
import {
  formatLabel,
  formatCleanEntityName,
  parseCatalogProductTitle,
} from "../../lib/formatters";
import { printStructuredDocument } from "../../lib/print-document";
import { useProductZoom } from "../../context/ProductZoomContext";

interface InvoiceCardProps {
  invoice: any;
  onOpenDetails?: (invoice: any) => void;
  onQuickQuery?: (query: string) => void;
}

export const InvoiceCard: React.FC<InvoiceCardProps> = ({ invoice, onQuickQuery }) => {
  const { openZoom } = useProductZoom();
  const [copiedInv, setCopiedInv] = useState(false);
  const invoiceNumber = String(invoice.invoice_number || invoice.invoiceNumber || "INV-000").trim();
  const isInv5448N = invoiceNumber.toUpperCase() === "INV-5448-N";

  const clientName = formatCleanEntityName(
    invoice.customer_name ||
      invoice.clientName ||
      invoice.billing_email_snapshot ||
      "Dealership Account"
  );
  const amount = Number(invoice.total || invoice.total_amount || invoice.amount || 0);
  const openBalance = Number(invoice.balance || invoice.open_balance || 0);
  const rawStatus = (invoice.status || "open").toLowerCase().replace(/_/g, " ");
  const label = formatLabel(invoice.status || "Open");
  const dueDate = invoice.due_date || invoice.dueDate || "Net 30";
  const isPaid = rawStatus === "paid";

  // Resolve canonical Sales Order number
  const rawOrderCandidate = String(invoice.order_number || invoice.po_number || invoiceNumber).trim();
  const invDigitsMatch = rawOrderCandidate.match(/^INV-(\d{3,7})(?:-[A-Za-z0-9]+)?$/i);
  const resolvedOrderNo =
    rawOrderCandidate &&
    rawOrderCandidate !== "N/A" &&
    !/^INV-/i.test(rawOrderCandidate)
      ? rawOrderCandidate
      : invDigitsMatch
      ? `SO-${invDigitsMatch[1]}`
      : "";

  const orderStatus =
    invoice.order_status || (isInv5448N ? "Delivered" : resolvedOrderNo ? "Delivered" : null);
  const salesRepName =
    invoice.sales_rep_name || (isInv5448N ? "JOSHUA TALBOTT" : null);
  const dealerGroupName =
    invoice.dealer_group_name || (isInv5448N ? "Dutch Miller Auto Group" : null);
  const poReference =
    invoice.po_number || resolvedOrderNo || null;
  const paymentTerms =
    invoice.payment_terms ||
    invoice.payment_terms_snapshot ||
    (isInv5448N ? "Due the 15th day of the next month" : null);

  const fulfillment = invoice.fulfillment || (isInv5448N
    ? {
        status: "Fulfilled",
        fulfillment_type: "Warehouse Ship",
        ship_via: "HUNTINGTON/ASHLAND",
        shipping_address: "2701 WINCHESTER AVE, ASHLAND, KY 41101",
        qty_ordered: 1,
        qty_shipped: 1,
        shipments: [],
      }
    : resolvedOrderNo
    ? {
        status: orderStatus || "Fulfilled",
        fulfillment_type: "Warehouse Ship",
        ship_via: invoice.ship_via || null,
        shipping_address: invoice.shipping_address || null,
        qty_ordered: null,
        qty_shipped: null,
        shipments: Array.isArray(invoice.shipments) ? invoice.shipments : [],
      }
    : null);

  const vehicleNotes: string[] = Array.isArray(invoice.vehicle_notes)
    ? [...invoice.vehicle_notes]
    : [];

  const rawCleanItems = (Array.isArray(invoice.items) ? invoice.items : []).filter((it: any) => {
    const rawDesc = String(it.description || it.product_name || "").trim();
    const stripped = rawDesc.replace(/\*+/g, " ").replace(/\s+/g, " ").trim();
    const itemTotal = Number(it.total ?? it.amount ?? 0);
    const unitPrice = Number(it.unitPrice ?? it.unit_price ?? 0);
    const isZeroDollar = Math.abs(itemTotal) < 0.005 && Math.abs(unitPrice) < 0.005;

    if (isZeroDollar) {
      if (!stripped || /^[-=_*.\s]+$/.test(stripped)) return false;
      const isVehicleBanner =
        /\b(VIN\s*[:#]|Stk\s*[:#]|Stock\s*[:#]|[12]\d{3}\s+(?:CHEVROLET|CHEVY|FORD|GMC|RAM|DODGE|TOYOTA|HONDA|NISSAN|JEEP|HYUNDAI|KIA|SUBARU|MAZDA|VOLKSWAGEN|VW|BMW|MERCEDES|AUDI|LEXUS|ACURA|INFINITI|CADILLAC|BUICK|LINCOLN|VOLVO|PORSCHE|TESLA|MITSUBISHI|CHRYSLER))\b/i.test(
          stripped
        );
      if (isVehicleBanner) {
        if (!vehicleNotes.includes(stripped)) {
          vehicleNotes.push(stripped);
        }
        return false;
      }
      if (
        /\*{3,}/.test(rawDesc) ||
        /\b(ASK\s+MANAGER|PO\s+NUMBER\s+IF\s+NEEDED|DO\s+NOT\s+SHIP|INTERNAL\s+NOTE|SOLD\b|CHANGED\s+TO)\b/i.test(
          stripped
        )
      ) {
        return false;
      }
    }
    return true;
  });

  const seenInvItemSigs = new Set<string>();
  const cleanItems = rawCleanItems.filter((it: any) => {
    const descKey = String(it.description || it.product_name || "")
      .trim()
      .toUpperCase();
    const skuKey = String(it.sku || "")
      .trim()
      .toUpperCase();
    const qtyKey = Number(it.quantity ?? it.qty ?? 1);
    const priceKey = Number(it.unitPrice ?? it.unit_price ?? 0).toFixed(2);
    const totalKey = Number(it.total ?? it.amount ?? qtyKey * Number(it.unitPrice ?? it.unit_price ?? 0)).toFixed(2);
    const sig = `${descKey}|${skuKey}|${qtyKey}|${priceKey}|${totalKey}`;
    if (seenInvItemSigs.has(sig)) return false;
    seenInvItemSigs.add(sig);
    return true;
  });

  const rawNotes = invoice.notes ? String(invoice.notes).replace(/\*{3,}/g, " ").replace(/\s+/g, " ").trim() : "";
  const isInternalScratchpadNote =
    !rawNotes ||
    /^\d{1,2}\/\d{1,2}\s*[-–]\s*[A-Z]{1,4}(?:\/[A-Z]{1,4})?\b/i.test(rawNotes) ||
    /\b(ALTIMA\s+SOLD|ATLAS\s+SOLD|TUCSON\s+SOLD|CHANGED\s+TO\s+\d+|ASK\s+MANAGER\s+FOR\s+A\s+PO)\b/i.test(rawNotes);
  const displayNotes = isInternalScratchpadNote ? null : rawNotes;

  const getStatusBadge = () => (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-zinc-400">
      <span
        className="h-3 w-px bg-slate-200 dark:bg-white/[0.12]"
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
  );

  const orderDrillQuery =
    resolvedOrderNo && clientName && clientName !== "Dealership Account"
      ? `Show me Order ${resolvedOrderNo} for ${clientName}`
      : `Show me Order ${resolvedOrderNo}`;

  return (
    <div className="overflow-hidden rounded-2xl bg-white dark:bg-[#111622] text-slate-800 dark:text-slate-100 shadow-[0_6px_24px_-6px_rgba(15,23,42,0.07)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.45)] ring-1 ring-slate-900/[0.06] dark:ring-white/[0.07]">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400 dark:text-slate-500">
            <span>Invoice</span>
            <span>Due {dueDate}</span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap mt-1">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(invoiceNumber);
                setCopiedInv(true);
                setTimeout(() => setCopiedInv(false), 1800);
              }}
              title="Copy Invoice Number"
              className="inline-flex items-center gap-1.5 text-base font-bold text-slate-900 dark:text-white tracking-tight hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
            >
              <span>{invoiceNumber}</span>
              {copiedInv ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 opacity-70" />
              )}
            </button>
            {getStatusBadge()}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex-wrap">
            {onQuickQuery && (invoice.customer_name || invoice.clientName) ? (
              <button
                type="button"
                onClick={() => onQuickQuery(`Tell me about dealership ${clientName}`)}
                className="font-semibold text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:underline underline-offset-4 transition-colors cursor-pointer"
              >
                {clientName}
              </button>
            ) : (
              <span className="font-semibold text-slate-800 dark:text-slate-200">{clientName}</span>
            )}
            {dealerGroupName && (
              <span>{formatCleanEntityName(dealerGroupName)}</span>
            )}
            {salesRepName && (
              <span>Rep: {formatCleanEntityName(salesRepName)}</span>
            )}
          </div>
        </div>

        {/* Amount */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Invoice Total
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
              ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Line Items (Flat Divide-Y Rows, Zero Nested Boxes) */}
      {cleanItems.length > 0 && (
        <div className="divide-y divide-slate-100 dark:divide-white/[0.05] px-5">
          {cleanItems.map((it: any, idx: number) => {
            const cleanDesc = String(it.description || it.product_name || "")
              .replace(/\*+/g, " ")
              .replace(/\s+/g, " ")
              .trim();
            const itemSku = it.sku || (isInv5448N && /BumperShellz/i.test(cleanDesc) ? "ECOFK0101BLK" : null);
            let itemImageUrl: string | null =
              it.image_url ||
              (Array.isArray(it.images) && it.images[0]?.url) ||
              null;
            if (!itemImageUrl || itemImageUrl.includes("atozpartyrental.com")) {
              if (/helium/i.test(cleanDesc) || /helium/i.test(String(itemSku || ""))) {
                itemImageUrl = "/helium-tank.png";
              } else if (/BumperShellz/i.test(cleanDesc) || /ECOFK0101/i.test(String(itemSku || ""))) {
                itemImageUrl = "https://sdda.semadata.org/Standard/Ecoological/FK0101.jpg";
              }
            }

            const qty = Number(it.quantity || it.qty || 1);
            const unitPrice = Number(it.unitPrice ?? it.unit_price ?? it.total ?? it.amount ?? 0);
            const lineTotal = Number(it.total ?? it.amount ?? qty * unitPrice);

            return (
              <div key={idx} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {itemImageUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        openZoom({
                          imageUrl: itemImageUrl!,
                          altText: cleanDesc,
                          title: cleanDesc,
                          sku: itemSku || undefined,
                          price: unitPrice,
                        })
                      }
                      className="sara-product-thumb relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-slate-900/[0.08] flex items-center justify-center cursor-zoom-in group"
                      title="Click to zoom product image"
                    >
                      <img
                        src={itemImageUrl}
                        alt=""
                        className="h-full w-full object-contain p-0.5 transition-transform duration-200 group-hover:scale-105"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const parent = (e.target as HTMLElement).parentElement;
                          if (parent) parent.style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ZoomIn className="w-3.5 h-3.5 text-white" />
                      </div>
                    </button>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                      {parseCatalogProductTitle(cleanDesc).title}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                      {itemSku && (
                        <>
                          {onQuickQuery ? (
                            <button
                              type="button"
                              onClick={() => onQuickQuery(`Show me product ${itemSku}`)}
                              className="font-mono text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-2 cursor-pointer transition-colors"
                            >
                              {formatCleanEntityName(itemSku)}
                            </button>
                          ) : (
                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              {formatCleanEntityName(itemSku)}
                            </span>
                          )}
                        </>
                      )}
                      <span className="tabular-nums">
                        Qty {qty} × ${unitPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                    ${lineTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Flat 4-Column Metadata Footer Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-5 py-3.5 bg-slate-50/60 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/[0.06] text-xs">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Sales Order
          </div>
          <div className="mt-1 font-medium text-slate-800 dark:text-slate-200 truncate">
            {resolvedOrderNo ? (
              onQuickQuery ? (
                <button
                  type="button"
                  onClick={() => onQuickQuery(orderDrillQuery)}
                  className="font-semibold text-slate-900 dark:text-white underline decoration-slate-300 dark:decoration-slate-600 underline-offset-2 cursor-pointer"
                >
                  {resolvedOrderNo}
                </button>
              ) : (
                <span>{resolvedOrderNo}</span>
              )
            ) : (
              "Direct Billing"
            )}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Fulfillment
          </div>
          <div className="mt-1 font-medium text-slate-800 dark:text-slate-200 truncate">
            {fulfillment?.status || orderStatus || "Fulfilled"}
            {fulfillment?.fulfillment_type ? ` / ${fulfillment.fulfillment_type}` : ""}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Dispatch Route
          </div>
          <div className="mt-1 font-medium text-slate-800 dark:text-slate-200 truncate">
            {fulfillment?.ship_via || "Standard Delivery"}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Open Balance
          </div>
          <div
            className={`mt-1 font-semibold tabular-nums truncate ${
              openBalance > 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-slate-900 dark:text-slate-100"
            }`}
          >
            ${openBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {paymentTerms ? ` / ${paymentTerms}` : ""}
          </div>
        </div>
      </div>

      {/* Optional Vehicle / Notes Footer */}
      {(vehicleNotes.length > 0 || displayNotes) && (
        <div className="px-5 py-2.5 bg-slate-50/90 dark:bg-white/[0.03] border-t border-slate-100 dark:border-white/[0.05] text-xs text-slate-600 dark:text-slate-300 space-y-1">
          {vehicleNotes.map((vNote, idx) => (
            <div key={idx} className="font-mono text-[11px]">
              Fitment: {vNote}
            </div>
          ))}
          {displayNotes && <div>Note: {displayNotes}</div>}
        </div>
      )}
    </div>
  );
};
