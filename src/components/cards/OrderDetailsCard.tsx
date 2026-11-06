"use client";

import React, { useState } from "react";
import { OrderData } from "../../types/gt-operations";
import {
  formatLabel,
  formatCleanEntityName,
  parseCatalogProductTitle,
} from "../../lib/formatters";
import { printStructuredDocument } from "../../lib/print-document";
import {
  ChevronDown,
  ChevronUp,
  ZoomIn,
  Printer,
  Copy,
  Check,
} from "lucide-react";
import { useProductZoom } from "../../context/ProductZoomContext";

interface OrderDetailsCardProps {
  order: OrderData;
  onQuickQuery?: (query: string) => void;
}

export const OrderDetailsCard: React.FC<OrderDetailsCardProps> = ({
  order,
  onQuickQuery,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedId, setCopiedId] = useState(false);
  const { openZoom } = useProductZoom();

  const getStatusPill = (status: string) => {
    const label = formatLabel(status || "Pending");
    return (
      <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-zinc-400">
        <span
          className="h-3 w-px bg-slate-200 dark:bg-white/[0.12]"
          aria-hidden="true"
        />
        <span>{label}</span>
      </span>
    );
  };

  const formattedDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Recent";

  const vehicleNotes: string[] = Array.isArray((order as any).vehicle_notes)
    ? [...(order as any).vehicle_notes]
    : [];

  const rawFilteredLines = (order.lines || []).filter((line: any) => {
    const rawDesc = String(line.product_name || line.description || "").trim();
    const stripped = rawDesc.replace(/\*+/g, " ").replace(/\s+/g, " ").trim();
    const lineAmt = Number(
      line.amount ?? Number(line.qty || 1) * Number(line.unit_price || 0)
    );
    const unitPrice = Number(line.unit_price ?? 0);
    const isZeroDollar =
      Math.abs(lineAmt) < 0.005 && Math.abs(unitPrice) < 0.005;

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

  const seenLineSignatures = new Set<string>();
  const lines = rawFilteredLines.filter((line: any) => {
    const descKey = String(line.product_name || line.description || "")
      .trim()
      .toUpperCase();
    const skuKey = String(line.sku || "")
      .trim()
      .toUpperCase();
    const qtyKey = Number(line.qty ?? 1);
    const priceKey = Number(line.unit_price ?? 0).toFixed(2);
    const amtKey = Number(line.amount ?? qtyKey * Number(line.unit_price ?? 0)).toFixed(2);
    const sig = `${descKey}|${skuKey}|${qtyKey}|${priceKey}|${amtKey}`;
    if (seenLineSignatures.has(sig)) return false;
    seenLineSignatures.add(sig);
    return true;
  });

  const customerDisplayName = formatCleanEntityName(
    order.customer_name || order.rooftop_name || "Dealership Customer"
  );
  const rawOrderNum = String(order.order_number || "").trim();
  const displayOrderNumber = /^INV-(\d{3,7})(?:-[A-Z0-9]+)?$/i.test(rawOrderNum)
    ? `SO-${rawOrderNum.match(/^INV-(\d{3,7})/i)![1]}`
    : rawOrderNum;

  const fulfillmentObj = (order as any).fulfillment || null;
  const fulfillmentStatus =
    fulfillmentObj?.status ||
    (/deliver|ship|complete/i.test(String(order.status || ""))
      ? "Fulfilled"
      : "Pending");
  const dispatchRoute =
    fulfillmentObj?.ship_via || (order as any).ship_via || null;
  const rawFulfillmentMode = fulfillmentObj?.fulfillment_type
    ? formatLabel(fulfillmentObj.fulfillment_type)
    : (order as any).order_type
    ? formatLabel((order as any).order_type)
    : "Warehouse Ship";
  const fulfillmentMode =
    dispatchRoute && /drop\s*ship/i.test(String(dispatchRoute))
      ? formatLabel(fulfillmentStatus)
      : rawFulfillmentMode;
  const shippingAddress =
    fulfillmentObj?.shipping_address || (order as any).shipping_address || null;
  const qtyOrdered = Number(fulfillmentObj?.qty_ordered ?? 0);
  const qtyShipped = Number(fulfillmentObj?.qty_shipped ?? 0);
  const rawPoNumber = String((order as any).po_number || "").trim();
  const orderDigits = displayOrderNumber.replace(/\D/g, "");
  const poDigits = rawPoNumber.replace(/\D/g, "");
  const hasDistinctPo =
    Boolean(rawPoNumber) &&
    rawPoNumber.toUpperCase() !== displayOrderNumber.toUpperCase() &&
    rawPoNumber.toUpperCase() !== rawOrderNum.toUpperCase() &&
    (!orderDigits || poDigits !== orderDigits);
  const poNumber = hasDistinctPo ? rawPoNumber : null;
  const paymentTerms = (order as any).payment_terms || null;
  const rawLinkedInvoices: any[] = Array.isArray((order as any).invoices)
    ? (order as any).invoices
    : [];
  const seenInvoiceNums = new Set<string>();
  const linkedInvoices = rawLinkedInvoices.filter((inv: any) => {
    const rawInvNum = String(inv?.invoice_number || "").trim();
    const norm = /^\d+$/.test(rawInvNum) ? `INV-${rawInvNum}` : rawInvNum;
    if (!norm || seenInvoiceNums.has(norm.toUpperCase())) return false;
    seenInvoiceNums.add(norm.toUpperCase());
    return true;
  });

  const computedSubtotal = lines.reduce((sum: number, l: any) => {
    const uPrice = Number(l.unit_price || 0);
    const lTotal = Number(l.amount || Number(l.qty || 1) * uPrice || 0);
    return sum + lTotal;
  }, 0);
  const orderTotalAmount = Number(order.total ?? computedSubtotal);
  const taxAmount = Number(
    (order as any).tax ??
      (order as any).tax_amount ??
      Math.max(0, Math.round((orderTotalAmount - computedSubtotal) * 100) / 100)
  );

  return (
    <div className="overflow-hidden rounded-2xl bg-white dark:bg-[#14171F] ring-1 ring-slate-900/[0.07] dark:ring-white/[0.08] shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] transition-all">
      {/* Header */}
      <div className="px-5 py-4 flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 font-medium">
            <span>Sales Order</span>
            <span>{formattedDate}</span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap mt-1">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(displayOrderNumber);
                setCopiedId(true);
                setTimeout(() => setCopiedId(false), 1800);
              }}
              title="Copy Order Number"
              className="inline-flex items-center gap-1.5 text-base font-semibold tracking-tight text-slate-900 dark:text-white hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
            >
              <span>{displayOrderNumber}</span>
              {copiedId ? (
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <Copy className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
              )}
            </button>
            {getStatusPill(order.status)}
          </div>

          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
            {onQuickQuery && (order.customer_name || order.rooftop_name) ? (
              <button
                type="button"
                onClick={() =>
                  onQuickQuery(`Tell me about dealership ${customerDisplayName}`)
                }
                className="font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:underline decoration-slate-400 dark:decoration-slate-500 underline-offset-4 truncate cursor-pointer transition-colors"
              >
                {customerDisplayName}
              </button>
            ) : (
              <span className="font-medium text-slate-700 dark:text-slate-200 truncate">
                {customerDisplayName}
              </span>
            )}
            {order.sales_rep_name && (
              <span className="text-xs text-slate-400 dark:text-slate-500">
                Rep: {formatCleanEntityName(order.sales_rep_name)}
              </span>
            )}
          </div>
        </div>

        {/* Right Total & Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 block">
              Total
            </span>
            <span className="text-lg font-semibold tabular-nums tracking-tight text-slate-900 dark:text-white">
              $
              {(order.total || 0).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title={isExpanded ? "Collapse details" : "Expand details"}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Body */}
      {isExpanded && (
        <div>
          {/* Flat Line Items List */}
          {lines.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              {lines.map((line, idx) => {
                let itemImageUrl = line.image_url;
                if (
                  !itemImageUrl ||
                  itemImageUrl.includes("atozpartyrental.com")
                ) {
                  if (
                    (line.product_name &&
                      /BumperShellz/i.test(line.product_name)) ||
                    (line.sku && /ECOFK0101/i.test(line.sku))
                  ) {
                    itemImageUrl =
                      "https://sdda.semadata.org/Standard/Ecoological/FK0101.jpg";
                  } else {
                    itemImageUrl = undefined;
                  }
                }

                const unitPrice = Number(line.unit_price || 0);
                const lineTotal = Number(
                  line.amount || Number(line.qty || 1) * unitPrice || 0
                );

                return (
                  <div
                    key={line.id || idx}
                    className="px-5 py-3.5 flex items-center justify-between gap-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-white/[0.015]"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {itemImageUrl && (
                        <div
                          onClick={() =>
                            openZoom({
                              imageUrl: itemImageUrl!,
                              altText: line.product_name,
                              title: line.product_name,
                              sku: line.sku || undefined,
                              price: line.unit_price,
                            })
                          }
                          role="button"
                          tabIndex={0}
                          className="sara-product-thumb relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-slate-900/[0.08] flex items-center justify-center cursor-zoom-in group"
                          title="Click to zoom image"
                        >
                          <img
                            src={itemImageUrl}
                            alt=""
                            className="h-full w-full object-contain p-0.5 transition-transform duration-200 group-hover:scale-105"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const parent = (e.target as HTMLElement)
                                .parentElement;
                              if (parent) parent.style.display = "none";
                            }}
                          />
                          <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ZoomIn className="w-3.5 h-3.5 text-white" />
                          </div>
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-slate-900 dark:text-slate-100 leading-snug">
                          {parseCatalogProductTitle(line.product_name).title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums flex-wrap">
                          {line.sku &&
                            (onQuickQuery ? (
                              <button
                                type="button"
                                onClick={() =>
                                  onQuickQuery(`Show me product ${line.sku}`)
                                }
                                className="font-mono text-[11px] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-2 cursor-pointer transition-colors"
                              >
                                {formatCleanEntityName(line.sku)}
                              </button>
                            ) : (
                              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                {formatCleanEntityName(line.sku)}
                              </span>
                            ))}
                          <span>Qty {line.qty}</span>
                          <span>
                            $
                            {unitPrice.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{" "}
                            each
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[13px] font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                        $
                        {lineTotal.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-4 text-xs text-slate-400">
              No line item details recorded.
            </div>
          )}

          {taxAmount > 0.005 && (
            <div className="px-5 py-2.5 border-t border-slate-100 dark:border-white/[0.06] flex flex-wrap items-center justify-end gap-5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              <span>
                Subtotal:{" "}
                <strong className="font-medium text-slate-700 dark:text-slate-200">
                  $
                  {computedSubtotal.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </strong>
              </span>
              <span>
                Sales Tax:{" "}
                <strong className="font-medium text-slate-700 dark:text-slate-200">
                  $
                  {taxAmount.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </strong>
              </span>
            </div>
          )}

          {/* Clean Flat Metadata Strip */}
          <div className="bg-slate-50/70 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/[0.06] px-5 py-3.5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
                  Fulfillment
                </span>
                <span className="font-medium text-slate-700 dark:text-slate-200 mt-0.5 block truncate">
                  {fulfillmentMode}
                  {qtyOrdered > 0 ? ` (${qtyShipped}/${qtyOrdered})` : ""}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
                  Dispatch Route
                </span>
                <span className="font-medium text-slate-700 dark:text-slate-200 mt-0.5 block truncate">
                  {dispatchRoute || "Standard Delivery"}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
                  {poNumber ? "PO / Terms" : "Payment Terms"}
                </span>
                <span className="font-medium text-slate-700 dark:text-slate-200 mt-0.5 block truncate">
                  {poNumber
                    ? `${poNumber}${paymentTerms ? ` / ${paymentTerms}` : ""}`
                    : paymentTerms || "Standard"}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
                  Billing
                </span>
                <div className="mt-0.5">
                  {linkedInvoices.length > 0 ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      {linkedInvoices.map((inv: any, idx: number) => {
                        const rawInvNum = String(inv.invoice_number || "").trim();
                        const displayInvNum = /^\d+$/.test(rawInvNum)
                          ? `INV-${rawInvNum}`
                          : rawInvNum;
                        return onQuickQuery && displayInvNum ? (
                          <button
                            key={inv.id || idx}
                            type="button"
                            onClick={() =>
                              onQuickQuery(`Show me Invoice ${displayInvNum}`)
                            }
                            className="font-medium text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white underline decoration-slate-300 dark:decoration-slate-600 underline-offset-2 cursor-pointer transition-colors"
                          >
                            {displayInvNum}
                          </button>
                        ) : (
                          <span
                            key={inv.id || idx}
                            className="font-medium text-slate-700 dark:text-slate-200"
                          >
                            {displayInvNum}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="font-medium text-slate-500 dark:text-slate-400">
                      Pending Billing
                    </span>
                  )}
                </div>
              </div>
            </div>

            {(shippingAddress ||
              vehicleNotes.length > 0 ||
              (order.shipments && order.shipments.length > 0)) && (
              <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-white/[0.05] flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                {shippingAddress && (
                  <span>
                    Ship to:{" "}
                    <strong className="font-medium text-slate-700 dark:text-slate-300">
                      {formatCleanEntityName(shippingAddress)}
                    </strong>
                  </span>
                )}
                {vehicleNotes.length > 0 && (
                  <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                    Vehicle: {vehicleNotes.join(", ")}
                  </span>
                )}
                {order.shipments && order.shipments.length > 0 && (
                  <div>
                    {onQuickQuery ? (
                      <button
                        type="button"
                        onClick={() =>
                          onQuickQuery(
                            `Show shipment for order ${displayOrderNumber}`
                          )
                        }
                        className="font-medium text-slate-700 dark:text-slate-200 underline decoration-slate-300 dark:decoration-slate-600 underline-offset-2 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                      >
                        Tracking:{" "}
                        {order.shipments[0].tracking_number || "View Shipment"}
                      </button>
                    ) : (
                      <span>
                        Tracking:{" "}
                        {order.shipments[0].tracking_number || "Scheduled"}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
