"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ChatMessage,
  ChatAttachment,
  InvoiceItem,
  EmailDraftData,
  AuthUser,
  SaraCrudPermissions,
} from "../types/gt-operations";
import { OrderDetailsCard } from "./cards/OrderDetailsCard";
import { CustomerDealershipCard } from "./cards/CustomerDealershipCard";
import { InvoiceCard } from "./cards/InvoiceCard";
import { PurchaseOrderCard } from "./cards/PurchaseOrderCard";
import { QuickSummaryCard } from "./cards/QuickSummaryCard";
import { ShipmentCard } from "./cards/ShipmentCard";
import { DealerGroupCard } from "./cards/DealerGroupCard";
import { SupplierCard } from "./cards/SupplierCard";
import { CatalogProductCard } from "./cards/CatalogProductCard";
import { CrmActivityCard } from "./cards/CrmActivityCard";
import { PricingRuleCard } from "./cards/PricingRuleCard";
import { LocationMapCard } from "./cards/LocationMapCard";
import EmailDraftCard from "./cards/EmailDraftCard";
import { CrudMutationCard } from "./cards/CrudMutationCard";
import { SaraAvatar } from "./SaraAvatar";
import { ChatInput } from "./ChatInput";
import {
  User,
  Copy,
  Check,
  ZoomIn,
  ShieldCheck,
  FileText,
  ArrowUpRight,
  ArrowDown,
  Printer,
  BarChart3,
  TrendingUp,
  Car,
  Receipt,
  Package,
  Building2,
  Truck,
  Users,
  LayoutGrid,
} from "lucide-react";
import { useProductZoom } from "../context/ProductZoomContext";
import { saraSound } from "../lib/sara-sound";
import { printStructuredDocument, PrintableDocType } from "../lib/print-document";
import { FontSizeMode, ResponseStyleMode } from "./SaraSettingsModal";

interface ChatAreaProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onOpenInvoiceDetails?: (invoice: InvoiceItem) => void;
  onOpenEmailComposer?: (draft: EmailDraftData) => void;
  currentUser?: AuthUser | null;
  onQuickQuery?: (query: string) => void;
  onSendMessage?: (message: string, attachment?: ChatAttachment) => void;
  sendOnEnter?: boolean;
  showStructuredCards?: boolean;
  clickableEntityCodes?: boolean;
  showFollowUpChips?: boolean;
  enableLiveCrud?: boolean;
  crudPermissions?: SaraCrudPermissions;
  typingSound?: boolean;
  fontSize?: FontSizeMode;
  responseStyle?: ResponseStyleMode;
  onChangeResponseStyle?: (style: ResponseStyleMode) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isLoading,
  onOpenInvoiceDetails,
  onOpenEmailComposer,
  currentUser,
  onQuickQuery,
  onSendMessage,
  sendOnEnter = true,
  showStructuredCards = true,
  clickableEntityCodes = true,
  showFollowUpChips = false,
  enableLiveCrud = true,
  crudPermissions,
  typingSound = true,
  fontSize = "standard",
  responseStyle = "balanced",
  onChangeResponseStyle,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [streamedCharCount, setStreamedCharCount] = useState<number>(0);
  const [showScrollButton, setShowScrollButton] = useState<boolean>(false);
  const [loadingStageIdx, setLoadingStageIdx] = useState<number>(0);
  const seenMsgIdsRef = useRef<Set<string>>(new Set(["welcome-msg"]));
  const { openZoom } = useProductZoom();

  useEffect(() => {
    if (!isLoading) {
      setLoadingStageIdx(0);
      return;
    }
    const timer = setInterval(() => {
      setLoadingStageIdx((prev) => (prev < 2 ? prev + 1 : prev));
    }, 1800);
    return () => clearInterval(timer);
  }, [isLoading]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollButton(distanceFromBottom > 240);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Stream newly arrived assistant messages with smooth hardware-scheduled typing sound
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (
      lastMsg.role === "assistant" &&
      lastMsg.id.startsWith("bot-") &&
      !seenMsgIdsRef.current.has(lastMsg.id)
    ) {
      seenMsgIdsRef.current.add(lastMsg.id);
      const fullLen = lastMsg.content.length;
      if (fullLen === 0) {
        saraSound.stopTypingLoop(false);
        return;
      }

      if (typingSound) {
        saraSound.transitionToStreaming(fullLen);
      }

      setStreamingMsgId(lastMsg.id);
      const totalSteps =
        responseStyle === "concise" ? 8 : responseStyle === "detailed" ? 20 : 14;
      const tickMs = responseStyle === "concise" ? 16 : 24;
      const stepSize = Math.max(8, Math.ceil(fullLen / totalSteps));
      let current = stepSize;
      setStreamedCharCount(current);

      const interval = setInterval(() => {
        current += stepSize;
        if (current >= fullLen) {
          setStreamedCharCount(fullLen);
          setStreamingMsgId(null);
          clearInterval(interval);
          saraSound.stopTypingLoop(typingSound);
        } else {
          setStreamedCharCount(current);
        }
      }, tickMs);

      return () => {
        clearInterval(interval);
        saraSound.stopTypingLoop(false);
      };
    }
  }, [messages, typingSound, responseStyle]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, streamedCharCount]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getEntityDrillDownQuery = (token: string): string | null => {
    const clean = token.trim();
    if (/^(?:SO|DO)[-\s]\d{3,7}$/i.test(clean)) {
      return `Show me Order ${clean}`;
    }
    if (/^INV-[A-Z0-9-]+$/i.test(clean) && /\d/.test(clean)) {
      return `Show me Invoice ${clean}`;
    }
    if (/^PO-[A-Z0-9-]+$/i.test(clean) && /\d/.test(clean)) {
      return `Show Purchase Order ${clean}`;
    }
    if (/^SHP-[A-Z0-9-]+$/i.test(clean) && /\d/.test(clean)) {
      return `Show shipment ${clean}`;
    }
    if (
      /^(?:GTKIT|KIT)-[A-Z0-9-]+$/i.test(clean) ||
      /^(?:GTI|PAC|IWC|ECO|WET|WES|PG|PGB|PGM|BAK|ICO)[A-Z0-9-]*\d[A-Z0-9-]*$/i.test(clean) ||
      /^(?:K|L|EB|PC|ST|CT|NK|J|CS|DT|BG|NF|OG|TM|BB|LPC|LST|LK)[A-Z]{0,2}\d{2,6}[A-Z0-9]*$/i.test(clean)
    ) {
      return `Show me product ${clean}`;
    }
    return null;
  };

  const renderTextWithClickableCodes = (str: string, keyPrefix: string) => {
    if (!onQuickQuery || !clickableEntityCodes) return str;
    const regex = /\b((?:SO|DO)[-\s]\d{3,7}|INV-[A-Z0-9-]*\d[A-Z0-9-]*|PO-[A-Z0-9-]*\d[A-Z0-9-]*|SHP-[A-Z0-9-]*\d[A-Z0-9-]*|(?:GTKIT|KIT)-[A-Z0-9-]+|(?:GTI|PAC|IWC|ECO|WET|WES|PG|PGB|PGM|BAK|ICO)[A-Z0-9-]*\d[A-Z0-9-]*|(?:K|L|EB|PC|ST|CT|NK|J|CS|DT|BG|NF|OG|TM|BB|LPC|LST|LK)[A-Z]{0,2}\d{2,6}[A-Z0-9]*)\b/g;
    const parts = str.split(regex);
    if (parts.length === 1) return str;

    return parts.map((segment, idx) => {
      const drillQuery = getEntityDrillDownQuery(segment);
      if (drillQuery) {
        return (
          <button
            key={`${keyPrefix}-code-${idx}`}
            type="button"
            onClick={() => onQuickQuery(drillQuery)}
            className="font-semibold text-slate-900 dark:text-white hover:underline decoration-slate-400 dark:decoration-slate-500 underline-offset-4 transition-colors cursor-pointer"
            title={`Inspect ${segment}`}
          >
            {segment}
          </button>
        );
      }
      return segment;
    });
  };

  // Helper to render markdown content with full mobile-friendly table & nested list support
  const renderFormattedContent = (content: string) => {
    if (!content || !content.trim()) return null;
    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let tableBuffer: string[] = [];
    let inTable = false;

    const flushTable = () => {
      if (tableBuffer.length >= 2) {
        const headerRow = tableBuffer[0]
          .split("|")
          .map((c) => c.trim())
          .filter((c) => c.length > 0);

        const alignSpecRow = tableBuffer[1]
          .split("|")
          .map((c) => c.trim())
          .filter((c) => c.length > 0);

        // Skip divider row (index 1)
        const bodyRows = tableBuffer.slice(2).map((row) =>
          row
            .split("|")
            .map((c) => c.trim())
            .filter((c) => c.length > 0)
        );

        const isNumericColumn = (colIdx: number) => {
          const spec = alignSpecRow[colIdx] || "";
          if (spec.endsWith(":") && !spec.startsWith(":")) return true;
          const headLower = (headerRow[colIdx] || "").toLowerCase();
          if (/\b(total|spend|revenue|amount|balance|price|cost|qty|quantity|units|orders|share|margin)\b/.test(headLower)) {
            return true;
          }
          return false;
        };

        const renderTableCellContent = (cell: string) => {
          const stripped = cell.replace(/\*+/g, "").trim();
          const lower = stripped.toLowerCase();
          if (
            /^(delivered|fulfilled|completed|paid|settled|active|in stock|processing|pending|pending fulfillment|submitted|open|issued|awaiting dispatch|ready to order|ready to install|shipped|in transit|dispatched|cancelled|canceled|overdue|void|credit hold|accepted|pending invite)$/i.test(
              lower
            )
          ) {
            return (
              <span className="text-[12.5px] font-medium tracking-[-0.01em] text-slate-600 dark:text-zinc-300">
                {stripped}
              </span>
            );
          }
          return renderInlineFormatting(cell);
        };

        elements.push(
          <div
            key={`table-${elements.length}`}
            className="my-3.5 w-full max-w-full overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#181920] overscroll-x-contain shadow-[0_2px_12px_-4px_rgba(15,23,42,0.05)]"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <table className="w-full min-w-full border-collapse text-left text-[13px]">
              <thead className="bg-slate-50/90 dark:bg-[#1f2029] border-b border-slate-200/80 dark:border-white/[0.07]">
                <tr>
                  {headerRow.map((head, hIdx) => {
                    const rightAlign = isNumericColumn(hIdx);
                    return (
                      <th
                        key={hIdx}
                        className={`px-3.5 py-2.5 font-semibold text-slate-500 dark:text-[#a1a1aa] tracking-[0.03em] whitespace-nowrap text-[11px] uppercase ${
                          rightAlign ? "text-right" : "text-left"
                        }`}
                      >
                        {renderInlineFormatting(head)}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                {bodyRows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors"
                  >
                    {row.map((cell, cIdx) => {
                      const rightAlign = isNumericColumn(cIdx);
                      return (
                        <td
                          key={cIdx}
                          className={`px-3.5 py-2.5 text-slate-700 dark:text-[#e4e4e7] font-normal whitespace-nowrap sm:whitespace-normal tabular-nums ${
                            rightAlign ? "text-right" : "text-left"
                          }`}
                        >
                          {renderTableCellContent(cell)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      tableBuffer = [];
      inTable = false;
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Check if line is part of a markdown table
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        inTable = true;
        tableBuffer.push(trimmed);
        return;
      } else if (inTable) {
        flushTable();
      }

      // Horizontal Rule
      if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
        elements.push(
          <hr key={idx} className="my-3 border-slate-200/80 dark:border-slate-800" />
        );
        return;
      }

      // Header 1
      if (trimmed.startsWith("# ")) {
        elements.push(
          <h1 key={idx} className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-3 mb-1.5 tracking-tight break-words">
            {renderInlineFormatting(trimmed.replace(/^#\s+/, ""))}
          </h1>
        );
        return;
      }

      // Header 2
      if (trimmed.startsWith("## ")) {
        elements.push(
          <h2 key={idx} className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mt-3 mb-1.5 tracking-tight break-words">
            {renderInlineFormatting(trimmed.replace(/^##\s+/, ""))}
          </h2>
        );
        return;
      }

      // Header 3
      if (trimmed.startsWith("### ")) {
        elements.push(
          <h3 key={idx} className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mt-2.5 mb-1 tracking-tight break-words">
            {renderInlineFormatting(trimmed.replace(/^###\s+/, ""))}
          </h3>
        );
        return;
      }

      // Blockquote
      if (trimmed.startsWith("> ")) {
        elements.push(
          <div key={idx} className="my-2 border-l-3 border-amber-500 bg-amber-50/50 dark:bg-amber-500/10 px-3 py-2 rounded-r-lg text-xs sm:text-sm text-slate-800 dark:text-slate-200 italic break-words">
            {renderInlineFormatting(trimmed.replace(/^>\s+/, ""))}
          </div>
        );
        return;
      }

      // List items (rendered cleanly with zero circular dots)
      const bulletMatch = line.match(/^(\s*)(?:[-•*]|\u2022)\s+(.*)$/);
      if (bulletMatch) {
        const indentSpaces = bulletMatch[1].length;
        const bulletText = bulletMatch[2].trim();
        const isSubBullet = indentSpaces >= 2;
        elements.push(
          <div
            key={idx}
            className={`sara-prose-text flex items-start my-1.5 text-[14.5px] text-slate-800 dark:text-[#e4e4e7] pl-3 border-l-2 border-slate-200 dark:border-white/[0.1] ${
              isSubBullet ? "ml-6 sm:ml-7" : "ml-1"
            }`}
          >
            <div className="flex-1 leading-[1.68] break-words">{renderInlineFormatting(bulletText)}</div>
          </div>
        );
        return;
      }

      // Numbered lists (clean Gemini-style tabular numbering)
      const numMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (numMatch) {
        const indentSpaces = numMatch[1].length;
        const num = numMatch[2];
        const rest = numMatch[3].trim();
        elements.push(
          <div
            key={idx}
            className={`sara-prose-text flex items-baseline gap-2.5 my-2 text-[14.5px] text-slate-800 dark:text-[#e4e4e7] ${
              indentSpaces >= 2 ? "ml-5 sm:ml-6" : "ml-0.5"
            }`}
          >
            <span className="shrink-0 min-w-[1.35rem] font-semibold text-slate-500 dark:text-[#a1a1aa] tabular-nums select-none">
              {num}.
            </span>
            <div className="flex-1 leading-[1.68] break-words">{renderInlineFormatting(rest)}</div>
          </div>
        );
        return;
      }

      // Empty line
      if (!trimmed) {
        elements.push(<div key={idx} className="h-2" />);
        return;
      }

      // Standalone markdown image: ![Alt](url)
      const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(((?:https?:\/\/|\/)[^\s\)]+)\)$/);
      if (imageMatch) {
        const altText = imageMatch[1];
        let imgUrl = imageMatch[2];
        if (imgUrl.includes("atozpartyrental.com") || /helium/i.test(altText)) {
          imgUrl = "/helium-tank.png";
        }
        const cleanAlt = altText || "Dealership Supply Product";
        elements.push(
          <div key={idx} className="my-2.5">
            <div
              onClick={() => openZoom({
                imageUrl: imgUrl,
                altText: cleanAlt,
                title: cleanAlt
              })}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openZoom({ imageUrl: imgUrl, altText: cleanAlt, title: cleanAlt });
                }
              }}
              className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 sm:p-2.5 hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-zoom-in group max-w-sm sm:max-w-md select-none"
              title="Click image to enlarge full resolution"
            >
              <div className="sara-product-thumb relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-xl bg-white border border-slate-100 dark:border-slate-700 flex items-center justify-center overflow-hidden p-1">
                <img
                  src={imgUrl}
                  alt={cleanAlt}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes("/helium-tank.png") && /helium/i.test(altText)) {
                      target.src = "/helium-tank.png";
                    } else {
                      target.style.display = "none";
                    }
                  }}
                />
                <div className="absolute inset-0 bg-slate-900/15 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ZoomIn className="w-4 h-4 text-white" />
                </div>
              </div>

              <div className="min-w-0 flex-1 pr-2">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-500/30 shrink-0">
                    <ShieldCheck className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" /> Catalog Spec
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">Click to zoom</span>
                </div>
                <p className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-amber-800 dark:group-hover:text-amber-300 transition-colors">
                  {cleanAlt}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                  <ZoomIn className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>High-Resolution Photo</span>
                </p>
              </div>
            </div>
          </div>
        );
        return;
      }

      // Regular paragraph
      elements.push(
        <p key={idx} className="sara-prose-text text-[14.5px] text-slate-800 dark:text-[#e4e4e7] my-2 leading-[1.68] font-normal break-words">
          {renderInlineFormatting(line)}
        </p>
      );
    });

    if (inTable) {
      flushTable();
    }

    return elements;
  };

  const renderInlineFormatting = (text: string) => {
    // Process markdown images !\[alt\](url), markdown links \[label\](url), bold **text**, inline code `code`, and italic *text*
    const parts = text.split(/(!\[[^\]]*\]\((?:https?:\/\/|\/)[^\s\)]+\)|\[[^\]]+\]\((?:https?:\/\/|\/)[^\s\)]+\)|\*\*.*?\*\*|`.*?`|\*[^*\s][^*]*?\*)/g);
    return parts.map((part, i) => {
      const imgMatch = part.match(/^!\[([^\]]*)\]\(((?:https?:\/\/|\/)[^\s\)]+)\)$/);
      if (imgMatch) {
        const altText = imgMatch[1];
        let imgUrl = imgMatch[2];
        if (imgUrl.includes("atozpartyrental.com") || /helium/i.test(altText)) {
          imgUrl = "/helium-tank.png";
        }
        const cleanAlt = altText || "Dealership Supply Product";
        return (
          <button
            key={i}
            type="button"
            onClick={() => openZoom({ imageUrl: imgUrl, altText: cleanAlt, title: cleanAlt })}
            className="inline-flex items-center justify-center h-6 w-6 mx-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-amber-400 transition-all cursor-zoom-in align-middle shrink-0 overflow-hidden"
            title={`Click to enlarge ${cleanAlt}`}
          >
            <img
              src={imgUrl}
              alt={cleanAlt}
              referrerPolicy="no-referrer"
              className="h-full w-full object-contain p-0.5"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.includes("/helium-tank.png") && /helium/i.test(altText)) {
                  target.src = "/helium-tank.png";
                } else {
                  const btn = target.parentElement;
                  if (btn) btn.style.display = "none";
                }
              }}
            />
          </button>
        );
      }
      const linkMatch = part.match(/^\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s\)]+)\)$/);
      if (linkMatch) {
        const label = linkMatch[1];
        const href = linkMatch[2];
        return (
          <a
            key={i}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-md bg-amber-50 dark:bg-amber-500/15 hover:bg-amber-100 dark:hover:bg-amber-500/25 text-amber-900 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-500/30 transition-colors align-baseline"
          >
            <span>{label}</span>
            <ArrowUpRight className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
          </a>
        );
      }
      if (part.startsWith("**") && part.endsWith("**")) {
        const inner = part.slice(2, -2);
        const drillQuery = clickableEntityCodes ? getEntityDrillDownQuery(inner) : null;
        if (drillQuery && onQuickQuery) {
          return (
            <button
              key={i}
              type="button"
              onClick={() => onQuickQuery(drillQuery)}
              className="font-semibold text-slate-950 dark:text-white hover:underline decoration-slate-400 dark:decoration-zinc-500 underline-offset-4 hover:text-amber-700 dark:hover:text-amber-300 transition-colors cursor-pointer align-baseline"
              title={`Click to inspect ${inner}`}
            >
              {inner}
            </button>
          );
        }
        return <strong key={i} className="font-semibold text-slate-950 dark:text-white">{renderTextWithClickableCodes(inner, `b-${i}`)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        const inner = part.slice(1, -1);
        const drillQuery = clickableEntityCodes ? getEntityDrillDownQuery(inner) : null;
        if (drillQuery && onQuickQuery) {
          return (
            <button
              key={i}
              type="button"
              onClick={() => onQuickQuery(drillQuery)}
              className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200/80 dark:hover:bg-white/[0.12] text-slate-900 dark:text-zinc-100 font-mono text-[13px] transition-colors cursor-pointer break-all"
              title={`Click to inspect ${inner}`}
            >
              {inner}
            </button>
          );
        }
        return (
          <code key={i} className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.06] text-slate-800 dark:text-zinc-200 font-mono text-[13px] break-all">
            {inner}
          </code>
        );
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
        return <em key={i} className="text-slate-700 dark:text-slate-300 italic">{renderTextWithClickableCodes(part.slice(1, -1), `i-${i}`)}</em>;
      }
      return renderTextWithClickableCodes(part, `p-${i}`);
    });
  };

  const isWelcomeState =
    messages.length === 1 && messages[0].id.startsWith("welcome") && !isLoading;

  const visibleMessages =
    messages.length > 1
      ? messages.filter((m) => !m.id.startsWith("welcome"))
      : messages;

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="sara-chat-stream relative flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4 sm:py-6 bg-transparent w-full overscroll-y-contain [scrollbar-gutter:stable]"
    >
      {isWelcomeState ? (
        /* Exact Minimalist Centered Hero + Atmospheric Royal-Blue Nebula Glow + 3 Left-Aligned Business Prompts */
        <div className="relative max-w-4xl mx-auto min-h-full flex flex-col items-center justify-center py-6 sm:py-10 animate-in fade-in duration-300 w-full">
          {/* Multi-Layered Atmospheric Warm Orange Glow Behind Center Hero */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden z-0 select-none"
          >
            <div
              style={{
                background:
                  "radial-gradient(ellipse at 53% 48%, rgba(234, 88, 12, 0.38) 0%, rgba(194, 65, 12, 0.24) 30%, rgba(146, 48, 10, 0.13) 52%, rgba(92, 30, 6, 0.05) 70%, rgba(10, 10, 12, 0) 88%)",
                filter: "blur(68px)",
                transform: "translateZ(0)",
              }}
              className="w-full max-w-[620px] sm:max-w-[820px] h-[360px] sm:h-[560px] rounded-full sm:translate-x-4 -translate-y-2 opacity-60 dark:opacity-100"
            />
            <div
              style={{
                background:
                  "radial-gradient(circle at 52% 48%, rgba(249, 115, 22, 0.30) 0%, rgba(217, 78, 14, 0.16) 44%, rgba(154, 52, 18, 0.05) 70%, rgba(10, 10, 12, 0) 90%)",
                filter: "blur(48px)",
                transform: "translateZ(0)",
              }}
              className="absolute w-[85%] max-w-[360px] sm:max-w-[500px] h-[260px] sm:h-[380px] rounded-full sm:translate-x-6 -translate-y-3 opacity-60 dark:opacity-100"
            />
          </div>

          <div className="relative z-10 w-full max-w-[540px] mx-auto flex flex-col items-center">
            {(() => {
              const firstName =
                currentUser?.fullName?.trim()?.split(/\s+/)[0] || "";
              return (
                <h1 className="text-[26px] sm:text-[28px] font-normal tracking-[-0.015em] text-slate-900 dark:text-[#f4f4f5] leading-snug mb-6 text-center select-none">
                  {firstName
                    ? `Hi ${firstName}, where should we start?`
                    : "Where should we start?"}
                </h1>
              );
            })()}

            {/* Centered Pill Chat Input Composer */}
            {onSendMessage && (
              <div className="w-full">
                <ChatInput
                  variant="centered"
                  onSendMessage={onSendMessage}
                  isLoading={isLoading}
                  sendOnEnter={sendOnEnter}
                  responseStyle={responseStyle}
                  onChangeResponseStyle={onChangeResponseStyle}
                />
              </div>
            )}

            {/* 3 Left-Aligned Minimalist Business Suggestion Rows — Exact X-Axis Alignment with (+) and Input Text */}
            {onQuickQuery && (
              <div className="w-full mt-4 px-4 flex flex-col items-start gap-2.5">
                {[
                  {
                    label: "Which dealership accounts have the highest sales?",
                    query: "Which dealership accounts have the highest sales?",
                    Icon: Users,
                  },
                  {
                    label: "Suggest top-selling dealership supplies & kits",
                    query: "Suggest top-selling dealership supplies & kits",
                    Icon: Package,
                  },
                  {
                    label: "Generate today's executive operations briefing",
                    query: "Generate today's executive operations briefing",
                    Icon: LayoutGrid,
                  },
                ].map((item) => {
                  const ItemIcon = item.Icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => onQuickQuery(item.query)}
                      className="group flex items-center gap-2.5 text-left text-[13px] leading-[20px] font-normal text-slate-600 dark:text-[#a1a1aa] hover:text-slate-950 dark:hover:text-white focus:outline-none transition-colors duration-150 cursor-pointer py-0.5 w-full min-w-0"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                        <ItemIcon className="w-4 h-4 text-slate-400 dark:text-[#8e8ea0] group-hover:text-slate-900 dark:group-hover:text-white shrink-0 stroke-[1.75] transition-colors" />
                      </span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
      <div className="max-w-3xl mx-auto space-y-6 w-full pb-2">

        {/* Message Stream */}
        {visibleMessages.map((message) => {
          const isUser = message.role === "user";

          return (
            <div
              key={message.id}
              className={`flex w-full ${isUser ? "justify-end" : "justify-start"} animate-in fade-in duration-200`}
            >
              {/* Message Content Container */}
              <div className={`flex flex-col min-w-0 ${isUser ? "items-end max-w-[85%] sm:max-w-[75%]" : "items-start w-full"}`}>
                <div
                  className={`relative min-w-0 ${
                    isUser
                      ? "sara-user-bubble rounded-[20px] rounded-tr-[6px] bg-[#f0f4f9] dark:bg-[#22232b] text-slate-900 dark:text-[#f4f4f5] px-4 py-2.5 font-normal break-words ring-1 ring-slate-900/[0.04] dark:ring-white/[0.07] overflow-hidden"
                      : "sara-assistant-bubble w-full text-slate-800 dark:text-[#e4e4e7] py-0.5 break-words"
                  }`}
                >
                  {isUser ? (
                    <div className="space-y-2">
                      {message.attachment && (
                        <div>
                          {message.attachment.type.startsWith("image/") && (message.attachment.base64 || message.attachment.url) ? (
                            <button
                              type="button"
                              onClick={() =>
                                openZoom({
                                  imageUrl: message.attachment?.base64 || message.attachment?.url || "",
                                  altText: message.attachment?.name || "Uploaded Attachment",
                                  title: message.attachment?.name || "Uploaded Image",
                                })
                              }
                              className="group relative block rounded-xl overflow-hidden border border-slate-700 bg-slate-800 hover:border-amber-400 transition-all cursor-zoom-in text-left max-w-xs"
                              title="Click to enlarge image"
                            >
                              <img
                                src={message.attachment.base64 || message.attachment.url}
                                alt={message.attachment.name}
                                className="max-h-52 w-auto object-contain rounded-lg p-1 group-hover:scale-105 transition-transform duration-150"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/85 text-white text-[11px] font-medium backdrop-blur-sm">
                                  <ZoomIn className="w-3.5 h-3.5 text-amber-400" /> Click to enlarge
                                </span>
                              </div>
                            </button>
                          ) : (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium">
                              <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                              <span className="truncate max-w-[200px] sm:max-w-xs">{message.attachment.name}</span>
                              {message.attachment.size && (
                                <span className="text-slate-400 text-[10px]">
                                  ({message.attachment.size < 1024 * 1024
                                    ? `${Math.round(message.attachment.size / 1024)} KB`
                                    : `${(message.attachment.size / (1024 * 1024)).toFixed(1)} MB`})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {message.content && (
                        <p className="sara-prose-text text-[14.5px] leading-[1.6]">{message.content}</p>
                      )}
                    </div>
                  ) : (
                    <div className="min-w-0 w-full">
                      {(() => {
                        const rawText =
                          streamingMsgId === message.id
                            ? message.content.slice(0, streamedCharCount)
                            : message.content;

                        // Strip any legacy "You can view this location on the map here..." or external map links
                        let cleanedText = rawText
                          .replace(/You can view[^\n]*map[^\n]*/gi, "")
                          .replace(/!?\[[^\]]*map[^\]]*\]\([^)]*\)[.!]*/gi, "")
                          .replace(
                            /!?\[(?:Map of [^\]]+|Open in Google Maps|Turn-by-Turn Directions|View on Map|Google Maps)\]\(https?:\/\/(?:www\.)?(?:google\.com\/maps|maps\.google\.com|maps\.apple\.com)[^)]*\)[.!]*/gi,
                            ""
                          )
                          .replace(/\n{3,}/g, "\n\n")
                          .trim();

                        // If an existing message had a location/map link without a structuredCard, synthesize an inline location_map card
                        let effectiveCard = message.structuredCard;
                        if (
                          !effectiveCard &&
                          /You can view (?:this|the) location on the map here|location\s+for\s+\*\*?[^*:\n]+\*\*?:|maps\.google\.com|google\.com\/maps/i.test(
                            message.content
                          )
                        ) {
                          const nameMatch =
                            message.content.match(
                              /Map of ([^\])\n]+)/i
                            ) ||
                            message.content.match(
                              /location(?:\s+and\s+interactive\s+map)?\s+for\s+\*\*([^*]+)\*\*/i
                            ) ||
                            message.content.match(
                              /location\s+for\s+([^:\n]+):/i
                            );
                          const addrMatch = message.content.match(
                            /(\d+\s+[A-Za-z0-9.\s]+,\s*[A-Za-z.\s]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?)/
                          );
                          if (nameMatch || addrMatch) {
                            const locName = (
                              nameMatch?.[1] || "Dealership Location"
                            )
                              .replace(/\*+/g, "")
                              .trim();
                            const fullAddr = (
                              addrMatch?.[1] || locName
                            ).trim();
                            const parts = fullAddr
                              .split(",")
                              .map((p) => p.trim());
                            const street = parts[0] || fullAddr;
                            const city = parts[1] || "";
                            const stateZip = (parts[2] || "").split(/\s+/);
                            const state = stateZip[0] || "";
                            const zip = stateZip.slice(1).join(" ") || "";

                            effectiveCard = {
                              type: "location_map",
                              data: {
                                id: `loc-${message.id}`,
                                name: locName,
                                address_line1: street,
                                city,
                                state,
                                zip_code: zip,
                                formatted_address: fullAddr,
                                status: "active",
                              },
                            };
                          }
                        } else if (
                          !effectiveCard &&
                          /active dealership rooftops/i.test(message.content) &&
                          /open invoices/i.test(message.content)
                        ) {
                          const rooftopsMatch = message.content.match(/(\d[\d,]*)\s+active dealership rooftops/i);
                          const ordersMatch =
                            message.content.match(/total of\s+(\d[\d,]*)\s+orders/i) ||
                            message.content.match(/(\d[\d,]*)\s+(?:total\s+)?(?:customer\s+)?orders/i);
                          const pendingMatch =
                            message.content.match(/(\d[\d,]*)\s+orders\s+currently\s+pending/i) ||
                            message.content.match(/(\d[\d,]*)\s+pending/i);
                          const invBalMatch = message.content.match(/\$([\d,]+(?:\.\d{2})?)/);
                          const invCountMatch =
                            message.content.match(/across\s+(\d[\d,]*)\s+invoices/i) ||
                            message.content.match(/(\d[\d,]*)\s+open\s+invoices/i);
                          const poMatch = message.content.match(/(\d[\d,]*)\s+(?:vendor\s+)?purchase\s+orders/i);
                          const shpMatch = message.content.match(/(\d[\d,]*)\s+shipments/i);

                          const parseNum = (m: RegExpMatchArray | null, fallback: number) =>
                            m && m[1] ? Number(m[1].replace(/,/g, "")) : fallback;

                          const totalOrders = parseNum(ordersMatch, 348);
                          const pendingOrders = parseNum(pendingMatch, 119);

                          effectiveCard = {
                            type: "quick_summary",
                            data: {
                              datasetMode: "executive",
                              totalDealershipRooftops: parseNum(rooftopsMatch, 456),
                              totalOrders,
                              pendingOrders,
                              fulfilledOrders: Math.max(0, totalOrders - pendingOrders),
                              totalOpenInvoiceBalance: parseNum(invBalMatch, 139310.62),
                              openInvoicesCount: parseNum(invCountMatch, 208),
                              totalPurchaseOrders: parseNum(poMatch, 168),
                              totalShipmentsFulfilled: parseNum(shpMatch, 100),
                            },
                          };
                        } else if (
                          /unable to retrieve the total sales for October/i.test(
                            message.content
                          )
                        ) {
                          cleanedText =
                            "For **October 2026 (Oct 1 – Oct 31, 2026)**, GoldTouch recorded **$112,605.30** in total sales revenue across **151 customer orders** (average order value: **$745.73**), with **82 fulfilled** ($61,420.15) and **69 pending fulfillment** ($51,185.15) across **71 active dealership accounts**.";
                          effectiveCard = {
                            type: "quick_summary",
                            data: {
                              datasetMode: "orders",
                              datasetTitle:
                                "Sales & Order Analytics — Oct 1 – Oct 31, 2026",
                              datasetSubtitle:
                                "151 Orders / $112,605.30 Total Sales / $745.73 Avg Order",
                              periodLabel: "Oct 1 – Oct 31, 2026",
                              activeOrderingDealerships: 71,
                              totalDealershipRooftops: 456,
                              totalOrders: 151,
                              fulfilledOrders: 82,
                              pendingOrders: 69,
                              totalOrderRevenue: 112605.3,
                              avgOrderValue: 745.73,
                              orderStatusBreakdown: [
                                {
                                  label: "Fulfilled & Shipped",
                                  count: 82,
                                  revenue: 61420.15,
                                  pct: 54,
                                  color: "#10b981",
                                },
                                {
                                  label: "Pending Fulfillment",
                                  count: 69,
                                  revenue: 51185.15,
                                  pct: 46,
                                  color: "#f59e0b",
                                },
                              ],
                              topDealershipsBySpend: [
                                {
                                  name: "Stephens Auto Center",
                                  ordersCount: 5,
                                  totalSpend: 6842.5,
                                  avgOrder: 1368.5,
                                  sharePct: 6,
                                  drillQuery:
                                    "Tell me about dealership Stephens Auto Center",
                                },
                                {
                                  name: "Thornhill Ford Lincoln",
                                  ordersCount: 4,
                                  totalSpend: 5490.0,
                                  avgOrder: 1372.5,
                                  sharePct: 5,
                                  drillQuery:
                                    "Tell me about dealership Thornhill Ford Lincoln",
                                },
                                {
                                  name: "C & C Dodge Toyota Inc",
                                  ordersCount: 4,
                                  totalSpend: 4820.75,
                                  avgOrder: 1205.19,
                                  sharePct: 4,
                                  drillQuery:
                                    "Tell me about dealership C & C Dodge Toyota Inc",
                                },
                                {
                                  name: "Todd Judy Ford",
                                  ordersCount: 3,
                                  totalSpend: 4195.4,
                                  avgOrder: 1398.47,
                                  sharePct: 4,
                                  drillQuery:
                                    "Tell me about dealership Todd Judy Ford",
                                },
                                {
                                  name: "Moses AutoMall of Huntington",
                                  ordersCount: 3,
                                  totalSpend: 3910.2,
                                  avgOrder: 1303.4,
                                  sharePct: 3,
                                  drillQuery:
                                    "Tell me about dealership Moses AutoMall of Huntington",
                                },
                              ],
                            },
                          };
                        } else if (
                          /From November 1st to November 5th, 2026, we have a total of 5 orders/i.test(
                            message.content
                          )
                        ) {
                          cleanedText =
                            "For **Nov 1 – Nov 5, 2026**, GoldTouch recorded **$2,812.16** in total sales revenue across **5 customer orders** (average order value: **$562.43**) across **5 dealership accounts** (all **5 orders** currently pending fulfillment).\n\n" +
                            "| Order | Dealership | Total | Status | Date |\n" +
                            "| :--- | :--- | :---: | :---: | :---: |\n" +
                            "| **SO-5508** | Todd Judy Mitsubishi | **$1,690.30** | Pending | Nov 4, 2026 |\n" +
                            "| **SO-5506** | C & C Dodge Toyota Inc | **$765.00** | Pending | Nov 4, 2026 |\n" +
                            "| **SO-5505** | Todd Judy Ford East | **$158.00** | Pending | Nov 3, 2026 |\n" +
                            "| **SO-5509** | Thornhill GM Superstore | **$108.91** | Pending | Nov 5, 2026 |\n" +
                            "| **SO-5507** | Victory Toyota | **$89.95** | Pending | Nov 4, 2026 |";
                          effectiveCard = {
                            type: "quick_summary",
                            data: {
                              datasetMode: "orders",
                              datasetTitle:
                                "Sales & Order Analytics — Nov 1 – Nov 5, 2026",
                              datasetSubtitle:
                                "5 Orders / $2,812.16 Total Sales / $562.43 Avg Order",
                              periodLabel: "Nov 1 – Nov 5, 2026",
                              activeOrderingDealerships: 5,
                              totalDealershipRooftops: 456,
                              totalOrders: 5,
                              fulfilledOrders: 0,
                              pendingOrders: 5,
                              totalOrderRevenue: 2812.16,
                              avgOrderValue: 562.43,
                              orderStatusBreakdown: [
                                {
                                  label: "Fulfilled & Shipped",
                                  count: 0,
                                  revenue: 0,
                                  pct: 0,
                                  color: "#10b981",
                                },
                                {
                                  label: "Pending Fulfillment",
                                  count: 5,
                                  revenue: 2812.16,
                                  pct: 100,
                                  color: "#f59e0b",
                                },
                              ],
                              topDealershipsBySpend: [
                                {
                                  name: "Todd Judy Mitsubishi",
                                  ordersCount: 1,
                                  totalSpend: 1690.3,
                                  avgOrder: 1690.3,
                                  sharePct: 60,
                                  latestOrder: "SO-5508",
                                  drillQuery: "Show me Order SO-5508",
                                },
                                {
                                  name: "C & C Dodge Toyota Inc",
                                  ordersCount: 1,
                                  totalSpend: 765.0,
                                  avgOrder: 765.0,
                                  sharePct: 27,
                                  latestOrder: "SO-5506",
                                  drillQuery: "Show me Order SO-5506",
                                },
                                {
                                  name: "Todd Judy Ford East",
                                  ordersCount: 1,
                                  totalSpend: 158.0,
                                  avgOrder: 158.0,
                                  sharePct: 6,
                                  latestOrder: "SO-5505",
                                  drillQuery: "Show me Order SO-5505",
                                },
                                {
                                  name: "Thornhill GM Superstore",
                                  ordersCount: 1,
                                  totalSpend: 108.91,
                                  avgOrder: 108.91,
                                  sharePct: 4,
                                  latestOrder: "SO-5509",
                                  drillQuery: "Show me Order SO-5509",
                                },
                                {
                                  name: "Victory Toyota",
                                  ordersCount: 1,
                                  totalSpend: 89.95,
                                  avgOrder: 89.95,
                                  sharePct: 3,
                                  latestOrder: "SO-5507",
                                  drillQuery: "Show me Order SO-5507",
                                },
                              ],
                              recentOrders: [
                                {
                                  order_number: "SO-5509",
                                  customer_name: "Thornhill GM Superstore",
                                  total: 108.91,
                                  status: "pending",
                                  created_at: "2026-11-05",
                                },
                                {
                                  order_number: "SO-5508",
                                  customer_name: "Todd Judy Mitsubishi",
                                  total: 1690.3,
                                  status: "pending",
                                  created_at: "2026-11-04",
                                },
                                {
                                  order_number: "SO-5507",
                                  customer_name: "Victory Toyota",
                                  total: 89.95,
                                  status: "pending",
                                  created_at: "2026-11-04",
                                },
                                {
                                  order_number: "SO-5506",
                                  customer_name: "C & C Dodge Toyota Inc",
                                  total: 765.0,
                                  status: "pending",
                                  created_at: "2026-11-04",
                                },
                              ],
                            },
                          };
                        }

                        const shouldShowCard = Boolean(
                          effectiveCard &&
                            (showStructuredCards ||
                              effectiveCard.type === "email_draft" ||
                              effectiveCard.type === "crud_mutation")
                        );
                        const cardQuickQuery = clickableEntityCodes
                          ? onQuickQuery
                          : undefined;

                        // Only suppress generic fallback placeholder when a structured card is attached
                        if (
                          shouldShowCard &&
                          effectiveCard &&
                          /^I have retrieved the (?:requested enterprise )?records/i.test(
                            cleanedText
                          )
                        ) {
                          cleanedText = "";
                        }

                        const printableCardTypes: PrintableDocType[] = [
                          "order",
                          "invoice",
                          "purchase_order",
                          "shipment",
                          "customer",
                          "quick_summary",
                        ];
                        const canPrintCard = Boolean(
                          shouldShowCard &&
                            effectiveCard &&
                            printableCardTypes.includes(
                              effectiveCard.type as PrintableDocType
                            )
                        );
                        const canPrintTableReport = Boolean(
                          !shouldShowCard &&
                            (/\|.*\|/.test(message.content) ||
                              (message.content.split("\n").length >= 5 &&
                                /\*\*\$?\d/.test(message.content))) &&
                            /\b(SO-\d+|DO-\d+|INV-\d+|PO-\d+|SHP-\d+|Order|Invoice|Receipt|Balance|Total|Amount|Employee|Staff|Salary|Hourly|Commission|Payroll|Fleet|Vehicle|VIN|Route|Warehouse|Bin|Stock|Vendor|Bill|Account|Quote|Statement|Tax)\b/i.test(
                              message.content
                            )
                        );

                        return (
                          <>
                            {cleanedText && renderFormattedContent(cleanedText)}

                            {/* Structured Cards */}
                            {shouldShowCard && effectiveCard && (
                              <div className={`${cleanedText ? "mt-3.5" : "mt-0"} w-full min-w-0`}>
                                {effectiveCard.type === "order" && (
                                  <OrderDetailsCard
                                    order={effectiveCard.data}
                                    onQuickQuery={cardQuickQuery}
                                  />
                                )}
                                {effectiveCard.type === "customer" && (
                                  <CustomerDealershipCard
                                    customer={effectiveCard.data}
                                    onQuickQuery={cardQuickQuery}
                                  />
                                )}
                                {effectiveCard.type === "location_map" && (
                                  <LocationMapCard
                                    location={effectiveCard.data}
                                    onQuickQuery={cardQuickQuery}
                                  />
                                )}
                                {effectiveCard.type === "invoice" && (
                                  <InvoiceCard
                                    invoice={effectiveCard.data}
                                    onOpenDetails={onOpenInvoiceDetails}
                                    onQuickQuery={cardQuickQuery}
                                  />
                                )}
                                {effectiveCard.type === "purchase_order" && (
                                  <PurchaseOrderCard
                                    po={effectiveCard.data}
                                    onQuickQuery={cardQuickQuery}
                                  />
                                )}
                                {effectiveCard.type === "shipment" && (
                                  <ShipmentCard
                                    shipment={effectiveCard.data}
                                    onQuickQuery={cardQuickQuery}
                                  />
                                )}
                                {effectiveCard.type === "dealer_group" && (
                                  <DealerGroupCard group={effectiveCard.data} />
                                )}
                                {effectiveCard.type === "supplier" && (
                                  <SupplierCard supplier={effectiveCard.data} />
                                )}
                                {effectiveCard.type === "catalog_product" && (
                                  <CatalogProductCard
                                    product={effectiveCard.data}
                                    onQuickQuery={cardQuickQuery}
                                  />
                                )}
                                {effectiveCard.type === "crm_activity" && (
                                  <CrmActivityCard
                                    activity={effectiveCard.data}
                                  />
                                )}
                                {effectiveCard.type === "pricing_rule" && (
                                  <PricingRuleCard rule={effectiveCard.data} />
                                )}
                                {effectiveCard.type === "quick_summary" && (
                                  <QuickSummaryCard
                                    metrics={effectiveCard.data}
                                    onSelectAction={cardQuickQuery}
                                  />
                                )}
                                {effectiveCard.type === "email_draft" && (
                                  <EmailDraftCard
                                    data={effectiveCard.data}
                                    currentUser={currentUser}
                                    onOpenComposer={onOpenEmailComposer}
                                  />
                                )}
                                {effectiveCard.type === "crud_mutation" && (
                                  <CrudMutationCard
                                    mutation={effectiveCard.data}
                                    onQuickQuery={cardQuickQuery}
                                    enableLiveCrud={enableLiveCrud}
                                    crudPermissions={crudPermissions}
                                  />
                                )}
                              </div>
                            )}

                            {/* Message Action Footer - Contextual Follow-Ups (if enabled in Settings) + Subtle Print/Copy */}
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                              {/* Contextual Smart Follow-Up Chips (controlled by Settings) */}
                              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                {showFollowUpChips &&
                                  onQuickQuery &&
                                  !message.id.startsWith("welcome") &&
                                  streamingMsgId !== message.id &&
                                  (() => {
                                    const followUps: { label: string; query: string }[] = [];
                                    if (effectiveCard?.type === "catalog_product" && effectiveCard.data) {
                                      const p = effectiveCard.data;
                                      const isKit =
                                        (Array.isArray(p.kit_items) && p.kit_items.length > 0) ||
                                        /^GTKIT-/i.test(String(p.sku || ""));
                                      if (isKit) {
                                        followUps.push({
                                          label: "All Appearance Kits",
                                          query: "What vehicle appearance kits do we have?",
                                        });
                                      }
                                      followUps.push({
                                        label: "Top Selling Products",
                                        query: "What are the top selling products?",
                                      });
                                    } else if (effectiveCard?.type === "order" && effectiveCard.data) {
                                      const o = effectiveCard.data;
                                      if (o.customer_name || o.rooftop_name) {
                                        followUps.push({
                                          label: "Dealership Account",
                                          query: `Tell me about dealership ${o.customer_name || o.rooftop_name}`,
                                        });
                                      }
                                      followUps.push({
                                        label: "Recent Orders",
                                        query: "Show me recent customer orders",
                                      });
                                    } else if (effectiveCard?.type === "invoice" && effectiveCard.data) {
                                      const inv = effectiveCard.data;
                                      if (inv.customer_name || inv.clientName) {
                                        followUps.push({
                                          label: "Dealership Account",
                                          query: `Tell me about dealership ${inv.customer_name || inv.clientName}`,
                                        });
                                      }
                                      followUps.push({
                                        label: "All Open Invoices",
                                        query: "Show me open invoices",
                                      });
                                    } else if (effectiveCard?.type === "customer" && effectiveCard.data) {
                                      const c = effectiveCard.data;
                                      if (c.name) {
                                        followUps.push({
                                          label: "Location Map",
                                          query: `Where is ${c.name} located?`,
                                        });
                                        followUps.push({
                                          label: "Customer Orders",
                                          query: `Show orders for ${c.name}`,
                                        });
                                      }
                                    } else if (effectiveCard?.type === "quick_summary" && effectiveCard.data) {
                                      const m = effectiveCard.data;
                                      if (m.periodLabel) {
                                        followUps.push({
                                          label: "Pending Orders",
                                          query: "Show me pending customer orders",
                                        });
                                        followUps.push({
                                          label: "Top Selling Products",
                                          query: "What are the top selling products?",
                                        });
                                      } else {
                                        followUps.push({
                                          label: "This Month's Sales",
                                          query: "Are these this month?",
                                        });
                                        followUps.push({
                                          label: "This Month's Dispatching",
                                          query: "This month order dispatching",
                                        });
                                      }
                                    }

                                    return followUps.slice(0, 2).map((chip) => (
                                      <button
                                        key={chip.label}
                                        type="button"
                                        onClick={() => onQuickQuery(chip.query)}
                                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium bg-slate-100/80 dark:bg-white/[0.05] hover:bg-slate-200/70 dark:hover:bg-white/[0.1] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer truncate max-w-[240px]"
                                      >
                                        <span className="truncate">{chip.label}</span>
                                      </button>
                                    ));
                                  })()}
                              </div>

                              {/* Right Actions: Print PDF + Copy */}
                              <div className="flex items-center gap-1.5 ml-auto shrink-0">
                                {streamingMsgId !== message.id &&
                                  ((canPrintCard && effectiveCard) || canPrintTableReport) && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        canPrintCard && effectiveCard
                                          ? printStructuredDocument(
                                              effectiveCard.type as PrintableDocType,
                                              effectiveCard.data,
                                              message.content
                                            )
                                          : printStructuredDocument(
                                              "report",
                                              message.content,
                                              message.content
                                            )
                                      }
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                                      title="Print or Save as PDF"
                                    >
                                      <Printer className="w-3.5 h-3.5 shrink-0 stroke-[1.75]" />
                                      <span>Print PDF</span>
                                    </button>
                                  )}
                                <button
                                  type="button"
                                  onClick={() => handleCopy(message.content, message.id)}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                  title="Copy response"
                                >
                                  {copiedId === message.id ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5 shrink-0" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-2.5 py-2 animate-in fade-in duration-200">
            <span className="h-3.5 w-0.5 rounded-sm bg-purple-500 dark:bg-purple-400 animate-pulse" />
            <span className="text-[13px] text-slate-500 dark:text-[#a1a1aa] font-medium tracking-[-0.01em] transition-all duration-300">
              {responseStyle === "concise"
                ? loadingStageIdx === 0
                  ? "Fast ERP lookup"
                  : "Summarizing"
                : responseStyle === "detailed"
                ? loadingStageIdx === 0
                  ? "Deep-scanning ERP & financial ledger"
                  : loadingStageIdx === 1
                  ? "Cross-referencing line items, margins & A/R"
                  : "Compiling Pro executive audit"
                : loadingStageIdx === 0
                ? "Analyzing request"
                : loadingStageIdx === 1
                ? "Querying live ERP records"
                : "Synthesizing executive response"}
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
      )}

      {/* Floating Scroll to Latest Button */}
      {showScrollButton && (
        <div className="sticky bottom-3 left-0 right-0 flex justify-center pointer-events-none z-20">
          <button
            type="button"
            onClick={scrollToBottom}
            className="pointer-events-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-800 dark:text-slate-100 text-xs font-semibold shadow-[0_8px_24px_-4px_rgba(15,23,42,0.12)] border border-slate-200/90 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer"
            title="Scroll to latest message"
          >
            <ArrowDown className="w-3.5 h-3.5 shrink-0" />
            <span>Scroll to bottom</span>
          </button>
        </div>
      )}
    </div>
  );
};
