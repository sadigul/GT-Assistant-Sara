"use client";

import React, { useState } from "react";
import { ShipmentData } from "../../types/gt-operations";
import { formatLabel } from "../../lib/formatters";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ZoomIn,
  Printer,
} from "lucide-react";
import { printStructuredDocument } from "../../lib/print-document";
import { useProductZoom } from "../../context/ProductZoomContext";

interface ShipmentCardProps {
  shipment: ShipmentData;
  onQuickQuery?: (query: string) => void;
}

export const ShipmentCard: React.FC<ShipmentCardProps> = ({ shipment, onQuickQuery }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const { openZoom } = useProductZoom();

  const getStatusBadge = (status: string) => {
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

  const copyTracking = () => {
    if (shipment.tracking_number) {
      navigator.clipboard.writeText(shipment.tracking_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formattedDate = shipment.ship_date || shipment.shipped_at
    ? new Date(shipment.ship_date || shipment.shipped_at!).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Scheduled";

  const items = shipment.items || [];

  return (
    <div className="overflow-hidden rounded-2xl bg-white dark:bg-[#111622] text-slate-800 dark:text-slate-100 shadow-[0_6px_24px_-6px_rgba(15,23,42,0.07)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.45)] ring-1 ring-slate-900/[0.06] dark:ring-white/[0.07]">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400 dark:text-slate-500">
            <span>Shipment Manifest</span>
            <span>{formattedDate}</span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap mt-1">
            <span className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              {shipment.shipment_number}
            </span>
            {getStatusBadge(shipment.status)}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex-wrap">
            {shipment.order_number && (
              <>
                {onQuickQuery ? (
                  <button
                    type="button"
                    onClick={() => onQuickQuery(`Show me Order ${shipment.order_number}`)}
                    className="font-semibold text-slate-800 dark:text-slate-200 underline decoration-slate-300 dark:decoration-slate-600 underline-offset-4 cursor-pointer"
                  >
                    Order {shipment.order_number}
                  </button>
                ) : (
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Order {shipment.order_number}
                  </span>
                )}
              </>
            )}
            {shipment.customer_name && (
              <>
                {onQuickQuery ? (
                  <button
                    type="button"
                    onClick={() => onQuickQuery(`Tell me about dealership ${shipment.customer_name}`)}
                    className="hover:text-slate-900 dark:hover:text-white underline decoration-slate-300 dark:decoration-slate-600 underline-offset-4 cursor-pointer"
                  >
                    {shipment.customer_name}
                  </button>
                ) : (
                  <span>{shipment.customer_name}</span>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Carrier
            </div>
            <div className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5">
              {shipment.carrier || "Fleet Assigned"} {shipment.service ? `(${shipment.service})` : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Tracking Number Bar */}
      {shipment.tracking_number && (
        <div className="px-5 py-2.5 bg-slate-50/60 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/[0.05] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-slate-500 dark:text-slate-400">Tracking Number:</span>
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 break-all">
              {shipment.tracking_number}
            </span>
          </div>
          <button
            type="button"
            onClick={copyTracking}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      )}

      {/* Item Lines Section */}
      {items.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-5 py-2.5 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-b border-slate-100 dark:border-white/[0.05] cursor-pointer"
          >
            <span>Manifest Items ({items.length})</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {isExpanded && (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.05] px-5">
              {items.map((it: any, i: number) => {
                let itemImageUrl: string | null = it.image_url || (Array.isArray(it.images) && it.images[0]?.url) || null;
                if (!itemImageUrl || itemImageUrl.includes("atozpartyrental.com")) {
                  if (/helium/i.test(String(it.description || "")) || /helium/i.test(String(it.sku || ""))) {
                    itemImageUrl = "/helium-tank.png";
                  } else if (/BumperShellz/i.test(String(it.description || "")) || /ECOFK0101/i.test(String(it.sku || ""))) {
                    itemImageUrl = "https://sdda.semadata.org/Standard/Ecoological/FK0101.jpg";
                  }
                }
                return (
                  <div key={i} className="py-3 flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {itemImageUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            openZoom({
                              imageUrl: itemImageUrl!,
                              altText: it.description || it.sku,
                              title: it.description || it.sku,
                              sku: it.sku || undefined,
                              price: it.unit_price ? Number(it.unit_price) : undefined,
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
                          {it.description || it.sku}
                        </div>
                        {it.sku && (
                          <div className="mt-0.5">
                            {onQuickQuery ? (
                              <button
                                type="button"
                                onClick={() => onQuickQuery(`Show me product ${it.sku}`)}
                                className="font-mono text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline decoration-slate-300 dark:decoration-slate-600 underline-offset-2 cursor-pointer"
                              >
                                {it.sku}
                              </button>
                            ) : (
                              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                {it.sku}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="font-semibold text-slate-900 dark:text-white tabular-nums shrink-0">
                      Qty {it.qty_shipped}
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
