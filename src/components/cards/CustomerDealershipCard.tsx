"use client";

import React, { useState } from "react";
import { DealershipCustomer } from "../../types/gt-operations";
import { formatLabel } from "../../lib/formatters";
import { LocationMapCard } from "./LocationMapCard";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Tag,
  ShoppingCart,
  FileText,
  ArrowUpRight,
  Truck,
  Globe,
  UserCheck,
  CheckCircle2,
  DollarSign,
  Compass,
  Printer,
} from "lucide-react";
import { printStructuredDocument } from "../../lib/print-document";

interface CustomerDealershipCardProps {
  customer: DealershipCustomer;
  onQuickQuery?: (query: string) => void;
}

export const CustomerDealershipCard: React.FC<CustomerDealershipCardProps> = ({
  customer,
  onQuickQuery,
}) => {
  const [showMap, setShowMap] = useState(false);

  const hasKpiSummary =
    customer.total_orders_count !== undefined ||
    customer.lifetime_spend !== undefined ||
    customer.open_invoice_balance !== undefined;

  const fullAddress =
    [customer.address_line1, customer.address_line2, customer.city, customer.state, customer.zip_code]
      .filter(Boolean)
      .join(", ") || customer.name;

  return (
    <div className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900/90 shadow-[0_8px_28px_-6px_rgba(15,23,42,0.08)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] ring-1 ring-slate-900/[0.06] dark:ring-white/[0.08] transition-all">
      {/* Top Header Banner */}
      <div className="flex flex-wrap items-start justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/40 px-4 py-3.5">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 ring-1 ring-slate-900/[0.05] dark:ring-white/[0.06]">
            <Building2 className="w-5 h-5 shrink-0 stroke-[1.75]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-tight truncate">
                {customer.name}
              </h4>
              {customer.code && (
                <span className="inline-flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-zinc-400">
                  <span className="h-3 w-px bg-slate-200 dark:bg-white/[0.12]" aria-hidden="true" />
                  <span>{customer.code}</span>
                </span>
              )}
              {customer.status && (
                <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-zinc-400">
                  <span className="h-3 w-px bg-slate-200 dark:bg-white/[0.12]" aria-hidden="true" />
                  <span>{formatLabel(customer.status)}</span>
                </span>
              )}
              {customer.group_name && (
                <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-zinc-400">
                  <span className="h-3 w-px bg-slate-200 dark:bg-white/[0.12]" aria-hidden="true" />
                  <span>{customer.group_name}</span>
                </span>
              )}
              {customer.qbo_customer_id && (
                <span className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 dark:text-zinc-500">
                  <span className="h-3 w-px bg-slate-200 dark:bg-white/[0.12]" aria-hidden="true" />
                  <span>QBO #{customer.qbo_customer_id}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span className="inline-flex items-center gap-1 min-w-0">
                <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="truncate">{fullAddress}</span>
              </span>
              <button
                type="button"
                onClick={() => setShowMap((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white underline decoration-slate-300 dark:decoration-white/20 underline-offset-4 transition-colors cursor-pointer shrink-0"
              >
                <Compass className="w-3 h-3 shrink-0" />
                {showMap ? "Hide Map" : "Live Map"}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {customer.pricing_tier && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-zinc-400 shrink-0">
              <Tag className="w-3 h-3 text-slate-400 dark:text-zinc-500 shrink-0" />
              {`Tier: ${formatLabel(customer.pricing_tier)}`}
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        {/* Collapsible Interactive Live Map Inside Customer Card */}
        {showMap && (
          <div className="mb-3">
            <LocationMapCard location={customer} compact />
          </div>
        )}

        {/* Cross-Table Account KPI Summary (Borderless Soft Tiles) */}
        {hasKpiSummary && (
          <div className="grid grid-cols-3 gap-2.5 mb-3">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Total Orders
              </div>
              <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                {customer.total_orders_count ?? 0}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Total Volume
              </div>
              <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                ${Number(customer.lifetime_spend || 0).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Open Balance
              </div>
              <div
                className={`text-sm sm:text-base font-extrabold tabular-nums mt-0.5 ${
                  Number(customer.open_invoice_balance || 0) > 0
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-slate-900 dark:text-slate-100"
                }`}
              >
                ${Number(customer.open_invoice_balance || 0).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>
        )}

      {/* Core Dealership Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
        {customer.phone && (
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{customer.phone}</span>
          </div>
        )}

        {customer.billing_email && (
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{customer.billing_email}</span>
          </div>
        )}

        {customer.website_url && (
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{customer.website_url}</span>
          </div>
        )}

        {customer.delivery_route && (
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{customer.delivery_route}</span>
          </div>
        )}

        {(customer.terms || customer.payment_terms) && (
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              Terms:{" "}
              <strong className="text-slate-900 dark:text-slate-100">
                {[customer.terms, customer.payment_terms]
                  .filter(Boolean)
                  .map((t) => formatLabel(t!))
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .join(" / ")}
              </strong>
            </span>
          </div>
        )}

        {customer.assigned_sales_rep && (
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              Sales Rep:{" "}
              <strong className="text-slate-900 dark:text-slate-100">
                {customer.assigned_sales_rep}
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* Recent Orders, Invoices & Shipments Preview (Borderless Rows) */}
      {((customer.recent_orders && customer.recent_orders.length > 0) ||
        (customer.recent_invoices && customer.recent_invoices.length > 0) ||
        (customer.recent_shipments && customer.recent_shipments.length > 0)) && (
        <div className="mt-3.5 space-y-3">
          {customer.recent_orders && customer.recent_orders.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                Recent Orders ({customer.recent_orders.length})
              </div>
              <div className="space-y-1.5">
                {customer.recent_orders.slice(0, 3).map((ord) => (
                  <div
                    key={ord.order_number}
                    onClick={() => onQuickQuery?.(`Show me Order ${ord.order_number}`)}
                    className="px-3 py-2 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 hover:bg-slate-100/90 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                          {ord.order_number}
                        </span>
                        <span className="text-slate-600 dark:text-slate-300 truncate">
                          {formatLabel(ord.status)}
                          {ord.sales_rep_name ? ` / Rep: ${ord.sales_rep_name}` : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          ${Number(ord.total || 0).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            printStructuredDocument("order", {
                              ...ord,
                              customer_name: customer.name,
                              shipping_address: fullAddress,
                            });
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white ring-1 ring-slate-900/[0.08] dark:ring-white/[0.1] transition-colors cursor-pointer"
                          title={`Print Order ${ord.order_number} PDF`}
                        >
                          <Printer className="w-2.5 h-2.5 shrink-0 stroke-[1.75]" />
                          <span>PDF</span>
                        </button>
                      </div>
                    </div>
                    {ord.items_summary && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {ord.items_summary}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {customer.recent_invoices && customer.recent_invoices.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                Billing & Invoices ({customer.recent_invoices.length})
              </div>
              <div className="space-y-1.5">
                {customer.recent_invoices.slice(0, 3).map((inv) => (
                  <div
                    key={inv.invoice_number}
                    onClick={() => onQuickQuery?.(`Show me Invoice ${inv.invoice_number}`)}
                    className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 hover:bg-slate-100/90 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <DollarSign className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {inv.invoice_number}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 truncate">
                        {formatLabel(inv.status)}
                        {inv.due_date ? ` / Due ${inv.due_date}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-amber-700 dark:text-amber-400">
                        ${Number(inv.open_balance ?? inv.total ?? 0).toFixed(2)} open
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          printStructuredDocument("invoice", {
                            ...inv,
                            customer_name: customer.name,
                          });
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white ring-1 ring-slate-900/[0.08] dark:ring-white/[0.1] transition-colors cursor-pointer"
                        title={`Print Invoice ${inv.invoice_number} PDF`}
                      >
                        <Printer className="w-2.5 h-2.5 shrink-0 stroke-[1.75]" />
                        <span>PDF</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {customer.recent_shipments && customer.recent_shipments.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                Shipments & Delivery ({customer.recent_shipments.length})
              </div>
              <div className="space-y-1.5">
                {customer.recent_shipments.slice(0, 2).map((shp, idx) => (
                  <div
                    key={shp.shipment_number || idx}
                    onClick={() =>
                      shp.shipment_number && onQuickQuery?.(`Show me Shipment ${shp.shipment_number}`)
                    }
                    className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 hover:bg-slate-100/90 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Truck className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {shp.shipment_number || "Shipment"}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 truncate">
                        {shp.carrier || "Carrier"}
                        {shp.tracking_number ? ` / ${shp.tracking_number}` : ""}
                      </span>
                    </div>
                    <span className="font-medium text-slate-500 dark:text-zinc-400 shrink-0">
                      {formatLabel(shp.status || "Shipped")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
};
