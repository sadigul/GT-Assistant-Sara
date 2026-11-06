"use client";

import React, { useEffect, useState } from "react";
import { X, ZoomIn, ZoomOut, Package, Copy, Check } from "lucide-react";
import {
  formatCurrency,
  formatLabel,
  formatCleanEntityName,
  parseCatalogProductTitle,
} from "../lib/formatters";

export interface ZoomImagePayload {
  imageUrl: string;
  altText?: string;
  title?: string;
  sku?: string;
  price?: number | string;
  category?: string;
  brand?: string;
}

interface ProductImageModalProps {
  payload: ZoomImagePayload;
  onClose: () => void;
}

export const ProductImageModal: React.FC<ProductImageModalProps> = ({ payload, onClose }) => {
  const [imgSrc, setImgSrc] = useState<string>(payload.imageUrl);
  const [hasError, setHasError] = useState(false);
  const [isMagnified, setIsMagnified] = useState(false);
  const [copiedSku, setCopiedSku] = useState(false);

  useEffect(() => {
    let url = payload.imageUrl;
    const nameOrAlt = (payload.title || payload.altText || "").toLowerCase();
    if (!url || url.includes("atozpartyrental.com") || nameOrAlt.includes("helium")) {
      if (nameOrAlt.includes("helium") || (payload.sku && payload.sku.toLowerCase().includes("helium"))) {
        url = "/helium-tank.png";
      }
    }
    setImgSrc(url);
    setHasError(false);
    setIsMagnified(false);
  }, [payload]);

  // Close on Escape key press & lock body scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const { title: cleanTitle, note: cleanNote } = parseCatalogProductTitle(
    payload.title || payload.altText || "Dealership Supply Product"
  );
  const cleanSku = payload.sku ? formatCleanEntityName(formatLabel(payload.sku)) : null;
  const cleanCategory = payload.category ? formatCleanEntityName(formatLabel(payload.category)) : "Automotive Supply";
  const cleanBrand = payload.brand ? formatCleanEntityName(formatLabel(payload.brand)) : "GoldTouch";

  const handleCopySku = () => {
    if (!cleanSku) return;
    navigator.clipboard.writeText(payload.sku || cleanSku);
    setCopiedSku(true);
    setTimeout(() => setCopiedSku(false), 1800);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Product preview: ${cleanTitle}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="sara-modal-surface relative w-full max-w-[540px] bg-white dark:bg-[#14151a] rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] shadow-[0_24px_64px_-12px_rgba(0,0,0,0.72)] overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Refined Architectural Header */}
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-zinc-100 dark:border-white/[0.06] bg-white dark:bg-[#14151a]">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {cleanSku && (
                <button
                  type="button"
                  onClick={handleCopySku}
                  title="Click to copy SKU"
                  className="inline-flex items-center gap-1.5 px-2 py-[2px] rounded-[5px] font-mono text-[11px] font-medium tracking-[0.01em] bg-zinc-100 dark:bg-white/[0.06] text-zinc-700 dark:text-zinc-200 ring-1 ring-inset ring-zinc-300/80 dark:ring-white/[0.1] hover:bg-zinc-200/70 dark:hover:bg-white/[0.1] transition-colors cursor-pointer"
                >
                  <span className="text-zinc-400 dark:text-zinc-400 font-sans font-normal">SKU</span>
                  <span>{cleanSku}</span>
                  {copiedSku ? (
                    <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                  ) : (
                    <Copy className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
                  )}
                </button>
              )}
              <span className="text-[11.5px] font-medium text-zinc-400 dark:text-zinc-400 truncate">
                {cleanBrand} / {cleanCategory}
              </span>
            </div>

            <h3 className="font-semibold text-zinc-900 dark:text-[#f4f4f5] text-[15.5px] sm:text-[16.5px] tracking-[-0.015em] leading-snug mt-1.5">
              {cleanTitle}
            </h3>

            {cleanNote && (
              <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400 leading-relaxed mt-0.5 line-clamp-2">
                {cleanNote}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
            {!hasError && (
              <button
                type="button"
                onClick={() => setIsMagnified((v) => !v)}
                aria-label={isMagnified ? "Reset zoom to 1x" : "Magnify image 1.5x"}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200/70 dark:hover:bg-white/[0.1] text-zinc-700 dark:text-zinc-200 ring-1 ring-inset ring-zinc-300/70 dark:ring-white/[0.09] transition-colors cursor-pointer"
              >
                {isMagnified ? (
                  <>
                    <ZoomOut className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-300" />
                    <span>1x</span>
                  </>
                ) : (
                  <>
                    <ZoomIn className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-300" />
                    <span>1.5x</span>
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close zoomed view"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Seamless Full-Width Studio Lightbox Stage */}
        <div className="sara-zoom-viewport p-3.5 sm:p-4 bg-zinc-50/70 dark:bg-[#101014]">
          <div
            onClick={() => !hasError && setIsMagnified((v) => !v)}
            className={`sara-studio-canvas relative w-full h-[320px] sm:h-[370px] rounded-xl ring-1 ring-inset ring-zinc-200/80 dark:ring-white/[0.08] overflow-hidden flex items-center justify-center select-none ${
              !hasError ? (isMagnified ? "cursor-zoom-out" : "cursor-zoom-in") : ""
            }`}
            title={!hasError ? (isMagnified ? "Click to reset zoom (1x)" : "Click to magnify (1.5x)") : undefined}
          >
            {!hasError ? (
              <img
                src={imgSrc}
                alt={cleanTitle}
                className={`max-h-[280px] sm:max-h-[330px] max-w-[88%] object-contain transition-transform duration-300 ease-out ${
                  isMagnified ? "scale-150" : "hover:scale-[1.03]"
                }`}
                referrerPolicy="no-referrer"
                onError={() => {
                  const nameOrAlt = (payload.title || payload.altText || "").toLowerCase();
                  if (
                    !imgSrc.includes("/helium-tank.png") &&
                    (nameOrAlt.includes("helium") || (payload.sku && payload.sku.toLowerCase().includes("helium")))
                  ) {
                    setImgSrc("/helium-tank.png");
                  } else {
                    setHasError(true);
                  }
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-400 space-y-2">
                <Package className="w-10 h-10 text-zinc-300" />
                <p className="text-sm font-medium text-zinc-600">High-Resolution Photo Unavailable</p>
                <p className="text-xs text-zinc-400 max-w-xs">
                  Visual asset is currently being indexed in the catalog repository.
                </p>
              </div>
            )}

            {/* Minimal Studio Scale Pill */}
            {!hasError && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMagnified((v) => !v);
                }}
                className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-zinc-900/[0.05] hover:bg-zinc-900/[0.09] text-zinc-600 ring-1 ring-inset ring-zinc-900/[0.08] text-[11px] font-medium transition-all cursor-pointer"
              >
                {isMagnified ? (
                  <>
                    <ZoomOut className="w-3 h-3 text-zinc-500" />
                    <span>1.5x Active (Reset)</span>
                  </>
                ) : (
                  <>
                    <ZoomIn className="w-3 h-3 text-zinc-500" />
                    <span>Click to Magnify 1.5x</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Architectural Footer Metadata Bar */}
        <div className="px-5 py-3 border-t border-zinc-100 dark:border-white/[0.06] bg-zinc-50/60 dark:bg-[#14151a] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            {payload.price != null && Number(payload.price) > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-zinc-400 dark:text-zinc-500">
                  Unit Price
                </span>
                <span className="font-semibold text-[13px] tabular-nums text-zinc-900 dark:text-white">
                  {formatCurrency(Number(payload.price))}
                </span>
              </div>
            ) : (
              <span className="text-[11.5px] font-medium text-zinc-500 dark:text-zinc-400">
                {cleanBrand} Catalog Item
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto text-zinc-400 dark:text-zinc-500 text-[11px]">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-zinc-100 dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-300 ring-1 ring-inset ring-zinc-300/70 dark:ring-white/[0.1] rounded-[4px]">
              Esc
            </kbd>
            <span>to close</span>
          </div>
        </div>
      </div>
    </div>
  );
};
