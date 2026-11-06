"use client";

import React, { useState } from "react";
import { CatalogProduct } from "../../types/gt-operations";
import { formatLabel, formatCleanEntityName, parseCatalogProductTitle } from "../../lib/formatters";
import {
  Tag,
  TrendingUp,
  CheckCircle2,
  ZoomIn,
  Palette,
  Ruler,
  Layers,
  ShoppingBag,
  Building2,
  Copy,
  Check,
} from "lucide-react";
import { useProductZoom } from "../../context/ProductZoomContext";

interface CatalogProductCardProps {
  product: CatalogProduct;
  onQuickQuery?: (query: string) => void;
}

export const CatalogProductCard: React.FC<CatalogProductCardProps> = ({ product, onQuickQuery }) => {
  const { openZoom } = useProductZoom();
  const [copiedSku, setCopiedSku] = useState(false);

  const handleCopySku = () => {
    const code = product.style_code || product.sku;
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedSku(true);
    setTimeout(() => setCopiedSku(false), 1800);
  };

  const marginPct =
    product.gross_margin_pct != null
      ? Number(product.gross_margin_pct).toFixed(1)
      : product.price && product.cost && product.price > 0
      ? (((product.price - product.cost) / product.price) * 100).toFixed(1)
      : null;

  const unitProfit =
    product.unit_profit != null
      ? Number(product.unit_profit).toFixed(2)
      : product.price && product.cost && product.price > 0
      ? (product.price - product.cost).toFixed(2)
      : null;

  const isHeliumProduct = Boolean(
    (product.name && product.name.toLowerCase().includes("helium")) ||
      (product.sku && product.sku.toLowerCase().includes("helium"))
  );

  let imageUrl = product.image_url;
  if (!imageUrl || imageUrl.includes("atozpartyrental.com") || isHeliumProduct) {
    if (isHeliumProduct) {
      imageUrl = "/helium-tank.png";
    }
  }

  const rawParsed = parseCatalogProductTitle(product.name);
  const isDateRangeTitle = /^\d{1,2}\/\d{1,2}\/\d{2,4}\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(
    rawParsed.title.trim()
  );
  const parsedProductTitle =
    isDateRangeTitle && product.sku
      ? formatCleanEntityName(formatLabel(product.sku))
      : rawParsed.title;
  const parsedProductNote = isDateRangeTitle
    ? `Billing Cycle: ${rawParsed.title.trim()}`
    : rawParsed.note;

  const cleanDescription =
    product.description &&
    !/^\d{1,2}\/\d{1,2}\/\d{2,4}\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(product.description.trim())
      ? product.description
      : undefined;

  const handleZoom = () => {
    if (!imageUrl) return;
    openZoom({
      imageUrl,
      altText: parsedProductTitle,
      title: parsedProductTitle,
      sku: product.sku || undefined,
      price: product.price,
      category: product.category,
      brand: product.brand,
    });
  };

  const hasDescriptionOrColors = Boolean(
    (product.colors && product.colors.length > 0) ||
      cleanDescription ||
      parsedProductNote
  );

  const volumeBreaks = Array.isArray(product.volume_price_breaks)
    ? product.volume_price_breaks
    : [];

  return (
    <div className="mt-3 overflow-hidden rounded-2xl bg-white dark:bg-[#14171F] shadow-[0_6px_24px_-6px_rgba(15,23,42,0.07)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.45)] ring-1 ring-slate-900/[0.07] dark:ring-white/[0.08] transition-all">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-white/[0.02] p-3.5 sm:p-4 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            onClick={imageUrl ? handleZoom : undefined}
            role={imageUrl ? "button" : undefined}
            tabIndex={imageUrl ? 0 : undefined}
            onKeyDown={imageUrl ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleZoom(); } } : undefined}
            className={`sara-product-thumb relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white overflow-hidden ${
              imageUrl ? "cursor-zoom-in hover:border-slate-400 dark:hover:border-white/30 group transition-all" : ""
            }`}
            title={imageUrl ? "Click to view full resolution image" : undefined}
          >
            {imageUrl ? (
              <>
                <img
                  src={imageUrl}
                  alt=""
                  className="h-full w-full object-contain p-1 transition-transform duration-200 group-hover:scale-105"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    if (isHeliumProduct && imageUrl !== "/helium-tank.png") {
                      (e.target as HTMLImageElement).src = "/helium-tank.png";
                      return;
                    }
                    (e.target as HTMLElement).style.display = "none";
                    const fallback = (e.target as HTMLElement).nextElementSibling;
                    if (fallback) (fallback as HTMLElement).style.display = "flex";
                  }}
                />
                <div className="absolute inset-0 bg-slate-900/15 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ZoomIn className="w-4 h-4 text-white" />
                </div>
              </>
            ) : null}
            <div
              className={`h-full w-full items-center justify-center bg-slate-100 dark:bg-white/[0.04] text-slate-400 dark:text-zinc-500 ${
                imageUrl ? "hidden" : "flex"
              }`}
            >
              <Tag className="w-6 h-6" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base tracking-[-0.01em] truncate block">
                {parsedProductTitle}
              </span>
            </div>
            {parsedProductNote && (
              <p className="text-[11.5px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                {parsedProductNote}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 mt-1">
              <button
                type="button"
                onClick={handleCopySku}
                title="Click to copy SKU"
                className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium text-slate-700 dark:text-zinc-200 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200/70 dark:hover:bg-white/[0.1] px-2 py-[2px] rounded-[5px] ring-1 ring-inset ring-slate-300/80 dark:ring-white/[0.1] shrink-0 transition-colors cursor-pointer"
              >
                <span className="text-slate-400 dark:text-zinc-400 font-sans font-normal">
                  {product.style_code ? "Style" : "SKU"}
                </span>
                <span>{product.style_code || product.sku}</span>
                {copiedSku ? (
                  <Check className="w-3 h-3 text-slate-700 dark:text-zinc-200 shrink-0" />
                ) : (
                  <Copy className="w-2.5 h-2.5 text-slate-400 dark:text-zinc-500 shrink-0" />
                )}
              </button>
              {product.brand && (
                <span className="text-slate-700 dark:text-zinc-200 font-semibold truncate">{product.brand}</span>
              )}
              {product.category && (
                <span className="text-slate-500 dark:text-zinc-400 truncate">{product.category}</span>
              )}
              {product.sub_category && (
                <span className="text-slate-500 dark:text-zinc-400 truncate">
                  {product.sub_category}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Dealer Price */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider block">
              Dealer Price
            </span>
            <div className="flex items-baseline justify-end gap-1.5">
              {product.original_price && product.original_price > product.price ? (
                <span className="font-mono text-xs text-slate-400 dark:text-zinc-500 line-through tabular-nums">
                  ${Number(product.original_price).toFixed(2)}
                </span>
              ) : null}
              <span className="text-lg font-semibold tabular-nums tracking-tight text-slate-900 dark:text-white">
                ${Number(product.price).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ERP / CRM Financials, Sizes & Stock Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3.5 bg-white dark:bg-[#14171F] text-xs border-b border-slate-100 dark:border-white/[0.06]">
        {product.cost ? (
          <div>
            <span className="text-slate-400 dark:text-zinc-500 block text-[10px] uppercase font-medium tracking-wider">ERP Unit Cost</span>
            <span className="font-semibold tabular-nums text-slate-900 dark:text-zinc-100 mt-0.5 block">${Number(product.cost).toFixed(2)}</span>
          </div>
        ) : null}

        {marginPct ? (
          <div>
            <span className="text-slate-400 dark:text-zinc-500 block text-[10px] uppercase font-medium tracking-wider">Gross Margin & Profit</span>
            <span className="font-semibold tabular-nums text-slate-900 dark:text-zinc-100 flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-3 h-3 text-slate-400 dark:text-zinc-400" />
              <span>{marginPct}%</span>
              {unitProfit ? (
                <span className="text-slate-500 dark:text-zinc-400 font-normal">
                  (${unitProfit})
                </span>
              ) : null}
            </span>
          </div>
        ) : null}

        {product.size_range || (product.sizes && product.sizes.length > 0) ? (
          <div>
            <span className="text-slate-400 dark:text-zinc-500 block text-[10px] uppercase font-medium tracking-wider">Available Sizes</span>
            <span className="font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1 mt-0.5">
              <Ruler className="w-3 h-3 text-slate-400 dark:text-zinc-400 shrink-0" />
              {product.size_range || product.sizes?.join(", ")}
            </span>
          </div>
        ) : product.supplier_sku && product.supplier_sku !== product.sku ? (
          <div>
            <span className="text-slate-400 dark:text-zinc-500 block text-[10px] uppercase font-medium tracking-wider">
              Supplier SKU
            </span>
            <span className="font-semibold text-slate-800 dark:text-zinc-200 truncate block mt-0.5">
              {product.supplier_sku}
            </span>
          </div>
        ) : null}

        <div>
          <span className="text-slate-400 dark:text-zinc-500 block text-[10px] uppercase font-medium tracking-wider">Inventory Status</span>
          <span className="font-semibold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5 mt-0.5">
            <CheckCircle2 className="w-3 h-3 text-slate-400 dark:text-zinc-400 shrink-0" />
            {typeof product.stock === "number" && product.stock > 0
              ? `${product.stock.toLocaleString("en-US")} Units In Stock`
              : formatLabel(product.stock_status || String(product.stock || "In Stock"))}
          </span>
        </div>
      </div>

      {/* Storefront Volume Price Breaks + ERP/CRM Tier Margins */}
      {volumeBreaks.length > 0 && (
        <div className="p-3.5 bg-slate-50/40 dark:bg-white/[0.015] border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 tracking-wider">
              <Layers className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400" />
              <span>Volume Price Breaks (Storefront & CRM Tiers)</span>
            </div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
              {volumeBreaks.length} Pricing Tiers
            </span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#14171F]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/80 dark:bg-white/[0.02] text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500">
                  <th className="py-2 px-3">Quantity Bracket</th>
                  <th className="py-2 px-3">Storefront Price</th>
                  <th className="py-2 px-3">Customer Savings</th>
                  {product.cost ? <th className="py-2 px-3 text-right">ERP Margin / Profit</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                {volumeBreaks.map((tier, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-2 px-3 font-medium text-slate-800 dark:text-zinc-200">
                      {tier.tier_label}
                    </td>
                    <td className="py-2 px-3 font-semibold tabular-nums text-slate-900 dark:text-zinc-100">
                      ${Number(tier.unit_price).toFixed(2)}
                      <span className="text-[10px] font-normal text-slate-400 dark:text-zinc-500 ml-1">/ unit</span>
                    </td>
                    <td className="py-2 px-3">
                      {tier.discount_pct && tier.discount_pct > 0 ? (
                        <span className="text-[11px] font-medium text-slate-700 dark:text-zinc-300 tabular-nums">
                          Save {Number(tier.discount_pct).toFixed(1).replace(/\.0$/, "")}%
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium">Standard Rate</span>
                      )}
                    </td>
                    {product.cost ? (
                      <td className="py-2 px-3 text-right tabular-nums text-[11.5px] text-slate-700 dark:text-zinc-300">
                        {tier.margin_pct != null ? (
                          <span className="font-semibold text-slate-900 dark:text-zinc-100">
                            {Number(tier.margin_pct).toFixed(1)}%
                            {tier.unit_profit != null ? (
                              <span className="text-slate-500 dark:text-zinc-400 font-normal ml-1">
                                (${Number(tier.unit_profit).toFixed(2)})
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Description & Apparel Colors */}
      {hasDescriptionOrColors && (
        <div className="p-3.5 bg-white dark:bg-[#14171F] space-y-2.5 text-xs border-b border-slate-100 dark:border-white/[0.06]">
          {product.colors && product.colors.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 mb-1.5">
                <Palette className="w-3 h-3 text-slate-400 dark:text-zinc-400" />
                <span>Available Colors ({product.color_count || product.colors.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {product.colors.slice(0, 14).map((color, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-50 dark:bg-white/[0.04] text-slate-700 dark:text-zinc-200 font-medium text-[11px] border border-slate-200 dark:border-white/[0.08]"
                  >
                    {color}
                  </span>
                ))}
                {(product.color_count || product.colors.length) > 14 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-zinc-300 font-semibold text-[11px] border border-slate-200 dark:border-white/[0.1]">
                    +{(product.color_count || product.colors.length) - 14} more
                  </span>
                )}
              </div>
            </div>
          )}

          {cleanDescription && (
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 block mb-0.5">
                Product Overview & Storefront Description
              </span>
              <p className="text-slate-600 dark:text-zinc-300 text-[11px] sm:text-xs leading-relaxed">
                {cleanDescription}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Included Kit Components (for Vehicle Appearance Kits / Bundles) */}
      {product.kit_items && product.kit_items.length > 0 && (
        <div className="p-3.5 bg-slate-50/40 dark:bg-white/[0.015] border-b border-slate-100 dark:border-white/[0.06] text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 tracking-wider">
              <Layers className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400" />
              <span>Included Kit Bundle Components ({product.kit_items.length} Items)</span>
            </div>
            {product.original_price && product.original_price > product.price && (
              <span className="font-mono text-[11px] font-medium text-slate-600 dark:text-zinc-300 tabular-nums">
                Bundle Saves ${(Number(product.original_price) - Number(product.price)).toFixed(2)} vs Individual
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            {product.kit_items.map((item, idx) => (
              <div
                key={`${item.sku}-${idx}`}
                className="flex items-center justify-between gap-2.5 rounded-xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#14171F] px-2.5 py-2"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {item.image_url ? (
                    <button
                      type="button"
                      onClick={() =>
                        openZoom({
                          imageUrl: item.image_url!,
                          altText: item.name,
                          title: item.name,
                          sku: item.sku,
                          price: item.price,
                        })
                      }
                      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white overflow-hidden cursor-zoom-in hover:border-slate-400 dark:hover:border-white/30 group transition-all"
                      title="Click to zoom component image"
                    >
                      <img
                        src={item.image_url}
                        alt=""
                        className="h-full w-full object-contain p-0.5"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-white/[0.04] text-slate-400">
                      <Tag className="w-4 h-4" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-zinc-400">
                        {item.qty}x
                      </span>
                      <button
                        type="button"
                        onClick={() => onQuickQuery?.(`Show me product ${item.sku}`)}
                        className="font-mono text-[10px] font-medium text-slate-700 dark:text-zinc-200 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200/80 dark:hover:bg-white/[0.1] ring-1 ring-inset ring-slate-300/70 dark:ring-white/[0.1] px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                        title={`Inspect component SKU ${item.sku}`}
                      >
                        {item.sku}
                      </button>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-800 dark:text-zinc-200 truncate mt-0.5">
                      {item.name}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 tabular-nums text-[11.5px]">
                  <span className="font-semibold text-slate-900 dark:text-zinc-100 block">
                    ${Number(item.price).toFixed(2)}
                  </span>
                  {item.cost && item.cost > 0 ? (
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">
                      Cost: ${Number(item.cost).toFixed(2)}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Customer Order History & Dealership Sales */}
      {product.order_sales_summary && product.order_sales_summary.total_orders_count > 0 && (
        <div className="p-3.5 bg-slate-50/50 dark:bg-white/[0.015] border-b border-slate-100 dark:border-white/[0.06] text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 tracking-wider">
              <ShoppingBag className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400" />
              <span>Dealership Order History & Sales Performance</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400 tabular-nums">
              <span className="font-semibold text-slate-900 dark:text-zinc-100">
                ${Number(product.order_sales_summary.total_revenue).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Revenue
              </span>
              <span className="h-3 w-px bg-slate-200 dark:bg-white/[0.12]" aria-hidden="true" />
              <span className="font-medium">
                {product.order_sales_summary.total_units_sold.toLocaleString("en-US")} Units / {product.order_sales_summary.total_orders_count} {product.order_sales_summary.total_orders_count === 1 ? "Order" : "Orders"}
              </span>
            </div>
          </div>

          {product.order_sales_summary.recent_orders.length > 0 && (
            <div className="space-y-1.5 mt-2">
              {product.order_sales_summary.recent_orders.slice(0, 5).map((ord, idx) => (
                <div
                  key={`${ord.order_number}-${idx}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#14171F] px-2.5 py-1.5"
                >
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => onQuickQuery?.(`Show me Order ${ord.order_number}`)}
                      className="font-mono text-[11px] font-medium text-slate-700 dark:text-zinc-200 bg-slate-100/90 dark:bg-white/[0.05] hover:bg-slate-200/80 dark:hover:bg-white/[0.1] ring-1 ring-inset ring-slate-300/70 dark:ring-white/[0.1] px-1.5 py-[2px] rounded-[5px] transition-colors cursor-pointer"
                      title={`Inspect Order ${ord.order_number}`}
                    >
                      {ord.order_number}
                    </button>
                    <button
                      type="button"
                      onClick={() => onQuickQuery?.(`Tell me about dealership ${ord.customer_name}`)}
                      className="inline-flex items-center gap-1 font-semibold text-slate-800 dark:text-zinc-200 hover:text-slate-950 dark:hover:text-white hover:underline underline-offset-4 truncate transition-colors cursor-pointer"
                      title={`Inspect ${ord.customer_name}`}
                    >
                      <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{ord.customer_name}</span>
                    </button>
                    {ord.sales_rep_name && (
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                        Rep: {ord.sales_rep_name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 tabular-nums text-[11.5px]">
                    <span className="text-slate-500 dark:text-zinc-400">
                      {ord.qty}x @ ${Number(ord.unit_price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-zinc-100">
                      ${Number(ord.line_total).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Additional Photos strip if available */}
      {(() => {
        if (!product.images || product.images.length <= 1) return null;
        const seenUrls = new Set<string>();
        const uniqueImages = product.images.filter((img) => {
          const rawUrl = typeof img === "string" ? img : img?.url;
          if (!rawUrl) return false;
          if (seenUrls.has(rawUrl)) return false;
          seenUrls.add(rawUrl);
          return true;
        });
        if (uniqueImages.length <= 1) return null;

        return (
          <div className="flex items-center gap-2 p-2.5 bg-slate-50/60 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/[0.06] overflow-x-auto">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 shrink-0 mr-1">
              Gallery ({uniqueImages.length}):
            </span>
            {uniqueImages.slice(0, 8).map((img, idx) => {
              let url = typeof img === "string" ? img : img.url;
              const viewLabel = typeof img === "object" && img.label ? img.label : `View ${idx + 1}`;
              if (!url || url.includes("atozpartyrental.com") || isHeliumProduct) {
                if (isHeliumProduct) {
                  url = "/helium-tank.png";
                }
              }
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => openZoom({
                    imageUrl: url,
                    altText: `${parsedProductTitle} (${viewLabel})`,
                    title: `${parsedProductTitle} - ${viewLabel}`,
                    sku: product.sku || undefined,
                    price: product.price,
                    category: product.category,
                    brand: product.brand,
                  })}
                  className="sara-product-thumb relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white hover:border-slate-400 dark:hover:border-white/30 transition-all cursor-zoom-in block group p-0"
                  title={`Click to view ${viewLabel}`}
                >
                  <img
                    src={url}
                    alt={viewLabel}
                    className="h-full w-full object-contain p-0.5 transition-transform duration-200 group-hover:scale-105"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const btn = e.currentTarget.parentElement;
                      if (btn) btn.style.display = "none";
                    }}
                  />
                  <div className="absolute inset-0 bg-slate-900/15 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ZoomIn className="w-3 h-3 text-white" />
                  </div>
                </button>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
};
