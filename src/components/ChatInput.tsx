"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ArrowUp,
  Plus,
  X,
  FileText,
  ArrowUpRight,
  BarChart3,
  TrendingUp,
  Car,
  Receipt,
  Package,
  Building2,
  Truck,
  Shirt,
  ClipboardList,
  Users,
  Warehouse,
  Landmark,
  ChevronDown,
  Mic,
  MicOff,
  Check,
  Database,
  RotateCcw,
} from "lucide-react";
import { ChatAttachment } from "../types/gt-operations";
import { ResponseStyleMode } from "./SaraSettingsModal";

interface QuickCommandItem {
  id: string;
  category: string;
  label: string;
  description: string;
  query: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const QUICK_COMMANDS: QuickCommandItem[] = [
  {
    id: "register-dealer",
    category: "Live CRUD",
    label: "Register New Dealership Rooftop",
    description: "Open interactive registration form or create a dealership in real time",
    query: "Register a new dealer",
    Icon: Database,
  },
  {
    id: "undo-mutation",
    category: "Live CRUD",
    label: "Undo Last Database Change",
    description: "Revert the most recent create, update, or delete action in real time",
    query: "Undo last change",
    Icon: RotateCcw,
  },
  {
    id: "exec-summary",
    category: "Dashboard",
    label: "Executive Operations Briefing",
    description: "Full KPI dashboard across 476 rooftops, orders & A/R",
    query: "Executive operations summary",
    Icon: BarChart3,
  },
  {
    id: "top-products",
    category: "Analytics",
    label: "Top Selling Products",
    description: "Best-selling catalog items ranked by revenue & units",
    query: "What are the top selling products?",
    Icon: TrendingUp,
  },
  {
    id: "all-kits",
    category: "Catalog",
    label: "All Vehicle Appearance Kits",
    description: "Browse all 7 Ram, F-150, Silverado & Jeep bundles",
    query: "What vehicle appearance kits do we have?",
    Icon: Car,
  },
  {
    id: "open-invoices",
    category: "Sales & A/R",
    label: "Open Invoices & Receivables",
    description: "Review active open balances, due dates & terms",
    query: "Show me open invoices",
    Icon: Receipt,
  },
  {
    id: "recent-orders",
    category: "Sales",
    label: "Recent Customer Orders",
    description: "Latest dealership sales orders & fulfillment status",
    query: "Show me recent customer orders",
    Icon: Package,
  },
  {
    id: "top-dealers",
    category: "Customers",
    label: "Top Dealership Accounts",
    description: "Dealership customers ranked by total spend & orders",
    query: "Show me our top dealership customers",
    Icon: Building2,
  },
  {
    id: "fleet-routes",
    category: "Fleet & Assets",
    label: "Fleet Vehicles & Delivery Routes",
    description: "All company trucks, VINs, drivers & 21 route corridors",
    query: "Show me all fleet vehicles, drivers, and delivery routes",
    Icon: Truck,
  },
  {
    id: "warehouse-bins",
    category: "Inventory",
    label: "Warehouse Locations, Bins & Movements",
    description: "Inspect warehouse storage bins, counts & stock ledger",
    query: "Show me our warehouse locations, storage bins, and recent inventory movements",
    Icon: Warehouse,
  },
  {
    id: "accounting-bills",
    category: "Accounting & Finance",
    label: "Vendor Bills, Payments & QBO Accounts",
    description: "Accounts payable bills, customer payments & QuickBooks COA",
    query: "Show me our accounting overview including open vendor bills, recent customer payments, and QuickBooks accounts",
    Icon: Landmark,
  },
  {
    id: "employees-hr",
    category: "Employees & HR",
    label: "Staff Directory & Sales Commissions",
    description: "Active staff directory, commission plans & rep payouts",
    query: "Show me our staff directory Overview and sales commission plans",
    Icon: Users,
  },
  {
    id: "purchase-orders",
    category: "Purchasing",
    label: "Purchase Orders, Receiving & Returns",
    description: "Inspect supplier POs, warehouse receipts & vendor returns",
    query: "Show me open purchase orders",
    Icon: ClipboardList,
  },
  {
    id: "apparel-catalog",
    category: "Catalog",
    label: "Corporate Apparel & Polos",
    description: "SanMar apparel styles, sizes, colors & volume tiers",
    query: "Show me corporate apparel catalog items",
    Icon: Shirt,
  },
];

interface ChatInputProps {
  onSendMessage: (
    message: string,
    attachment?: ChatAttachment
  ) => void;
  isLoading: boolean;
  sendOnEnter?: boolean;
  variant?: "centered" | "docked";
  responseStyle?: ResponseStyleMode;
  onChangeResponseStyle?: (style: ResponseStyleMode) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  sendOnEnter = true,
  variant = "docked",
  responseStyle = "balanced",
  onChangeResponseStyle,
}) => {
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [selectedCmdIdx, setSelectedCmdIdx] = useState(0);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Filter commands when user types "/" at start of input
  const isSlashMode = input.startsWith("/");
  const slashFilter = isSlashMode ? input.slice(1).trim().toLowerCase() : "";

  const filteredCommands = QUICK_COMMANDS.filter((cmd) => {
    if (!slashFilter) return true;
    return (
      cmd.label.toLowerCase().includes(slashFilter) ||
      cmd.category.toLowerCase().includes(slashFilter) ||
      cmd.description.toLowerCase().includes(slashFilter) ||
      cmd.query.toLowerCase().includes(slashFilter)
    );
  });

  const showPalette =
    (isPaletteOpen || isSlashMode) && filteredCommands.length > 0 && !isLoading;

  useEffect(() => {
    setSelectedCmdIdx(0);
  }, [slashFilter, isPaletteOpen]);

  // Close palette or mode menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        paletteRef.current &&
        !paletteRef.current.contains(e.target as Node)
      ) {
        setIsPaletteOpen(false);
      }
      if (
        modeMenuRef.current &&
        !modeMenuRef.current.contains(e.target as Node)
      ) {
        setShowModeMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleVoiceDictation = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      inputRef.current?.focus();
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
          inputRef.current?.focus();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const processFile = (file: File) => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      alert("File is too large. Please select an image or document under 15MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setAttachment({
        name: file.name,
        type: file.type || "application/octet-stream",
        base64,
        size: file.size,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (
        items[i].type.startsWith("image/") ||
        items[i].type === "application/pdf"
      ) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          processFile(file);
          break;
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSelectCommand = (cmd: QuickCommandItem) => {
    setIsPaletteOpen(false);
    setInput("");
    if (!isLoading) {
      onSendMessage(cmd.query, attachment || undefined);
      setAttachment(null);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (
      showPalette &&
      isSlashMode &&
      filteredCommands[selectedCmdIdx]
    ) {
      handleSelectCommand(filteredCommands[selectedCmdIdx]);
      return;
    }
    if ((input.trim() || attachment) && !isLoading) {
      setIsPaletteOpen(false);
      onSendMessage(input.trim(), attachment || undefined);
      setInput("");
      setAttachment(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showPalette) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedCmdIdx((prev) => (prev + 1) % filteredCommands.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedCmdIdx(
          (prev) =>
            (prev - 1 + filteredCommands.length) % filteredCommands.length
        );
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setIsPaletteOpen(false);
        if (isSlashMode) setInput("");
        return;
      }
      if (
        e.key === "Enter" &&
        !e.shiftKey &&
        isSlashMode &&
        filteredCommands[selectedCmdIdx]
      ) {
        e.preventDefault();
        handleSelectCommand(filteredCommands[selectedCmdIdx]);
        return;
      }
    }

    if (!sendOnEnter) {
      if (e.key === "Enter" && !(e.ctrlKey || e.metaKey)) {
        e.preventDefault();
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSubmit();
      }
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isCentered = variant === "centered";
  const hasPayload = Boolean(input.trim() || attachment);

  const modeShortLabel =
    responseStyle === "concise"
      ? "Fast"
      : responseStyle === "detailed"
      ? "Pro"
      : "Auto";

  const modeOptions: Array<{
    id: ResponseStyleMode;
    title: string;
    badge: string;
    desc: string;
  }> = [
    {
      id: "balanced",
      title: "SARA Auto",
      badge: "Auto",
      desc: "Balanced ERP intelligence & structured cards",
    },
    {
      id: "concise",
      title: "SARA Fast",
      badge: "Fast",
      desc: "Crisp, direct executive summaries",
    },
    {
      id: "detailed",
      title: "SARA Pro",
      badge: "Pro",
      desc: "Deep line-item, financial & audit breakdown",
    },
  ];

  return (
    <div
      className={
        isCentered
          ? "w-full relative"
          : "sara-input-dock bg-gradient-to-t from-[#fcfcfd] via-[#fcfcfd]/95 to-transparent dark:from-[#08090d] dark:via-[#08090d]/95 dark:to-transparent px-4 sm:px-6 pt-2 pb-4 sm:pb-5 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))] [scrollbar-gutter:stable]"
      }
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        ref={paletteRef}
        className={`${
          isCentered ? "max-w-[540px]" : "max-w-3xl"
        } w-full mx-auto relative`}
      >
        {/* Quick Command Palette Popover */}
        {showPalette && (
          <div
            className={`absolute left-0 right-0 ${
              isCentered ? "top-full mt-2.5" : "bottom-full mb-3"
            } rounded-2xl ring-1 ring-slate-900/[0.08] dark:ring-white/[0.09] bg-white/98 dark:bg-[#18191e]/98 backdrop-blur-xl shadow-[0_16px_40px_-8px_rgba(15,23,42,0.14)] dark:shadow-[0_16px_40px_-8px_rgba(0,0,0,0.75)] overflow-hidden z-30 animate-in fade-in duration-150`}
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/60 dark:bg-white/[0.02]">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <span>ERP Quick Commands</span>
                {slashFilter && (
                  <span className="font-mono text-slate-700 dark:text-slate-200 lowercase">
                    &ldquo;/{slashFilter}&rdquo;
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500">
                <span className="hidden sm:inline">
                  ↑↓ Navigate / ↵ Run / Esc
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsPaletteOpen(false);
                    if (isSlashMode) setInput("");
                  }}
                  className="p-0.5 rounded-full hover:bg-slate-200/70 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                  title="Close command menu"
                >
                  <X className="w-3.5 h-3.5 shrink-0 stroke-[1.75]" />
                </button>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5">
              {filteredCommands.map((cmd, idx) => {
                const CmdIcon = cmd.Icon;
                const isSelected = idx === selectedCmdIdx;
                return (
                  <button
                    key={cmd.id}
                    type="button"
                    onMouseEnter={() => setSelectedCmdIdx(idx)}
                    onClick={() => handleSelectCommand(cmd)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-slate-100/90 dark:bg-white/[0.08] text-slate-950 dark:text-white"
                        : "hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                          isSelected
                            ? "bg-slate-900 dark:bg-white text-white dark:text-slate-950"
                            : "bg-slate-100/80 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        <CmdIcon className="w-4 h-4 shrink-0 stroke-[1.75]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold truncate">
                            {cmd.label}
                          </span>
                          <span className="text-[9.5px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 shrink-0">
                            {cmd.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                          {cmd.description}
                        </p>
                      </div>
                    </div>
                    <ArrowUpRight
                      className={`w-3.5 h-3.5 shrink-0 stroke-[1.75] transition-transform ${
                        isSelected
                          ? "text-slate-700 dark:text-slate-200 translate-x-0.5 -translate-y-0.5"
                          : "text-slate-300 dark:text-slate-600"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Attachment Preview Pill */}
        {attachment && (
          <div className="mb-2.5 flex items-center gap-2.5 p-2 rounded-2xl bg-white dark:bg-[#1b1c22] ring-1 ring-slate-900/[0.08] dark:ring-white/[0.08] shadow-xs w-fit max-w-full animate-in fade-in duration-150">
            {attachment.type.startsWith("image/") ? (
              <div className="h-11 w-11 rounded-xl overflow-hidden bg-slate-100 dark:bg-black/40 shrink-0">
                <img
                  src={attachment.base64}
                  alt={attachment.name}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                <FileText className="w-5 h-5 shrink-0 stroke-[1.75]" />
              </div>
            )}
            <div className="min-w-0 pr-1">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px] sm:max-w-[260px]">
                {attachment.name}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                {attachment.type.startsWith("image/") ? "Image" : "Document"}
                {attachment.size ? ` (${formatFileSize(attachment.size)})` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              title="Remove attachment"
            >
              <X className="w-4 h-4 shrink-0 stroke-[1.75]" />
            </button>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className={`sara-chat-input-box relative flex items-center gap-2.5 rounded-full px-4 h-[48px] transition-all duration-200 ${
            isDragging
              ? "ring-2 ring-blue-500 bg-blue-50/40 dark:bg-blue-950/30"
              : "ring-1 ring-slate-900/[0.08] dark:ring-white/[0.07] bg-white/95 dark:bg-[#1c1d22]/90 backdrop-blur-xl shadow-[0_8px_30px_-4px_rgba(15,23,42,0.08)] dark:shadow-[0_12px_40px_-4px_rgba(0,0,0,0.6)] focus-within:ring-slate-900/[0.15] dark:focus-within:ring-white/[0.14]"
          }`}
        >
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,.csv,.txt,.json,.doc,.docx,.xls,.xlsx"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Minimalist Plus (+) Icon Button — exact 20px box aligned with suggestion icons */}
          <button
            type="button"
            disabled={isLoading}
            onClick={() => fileInputRef.current?.click()}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-500 dark:text-[#a1a1aa] hover:text-slate-900 dark:hover:text-white focus:outline-none focus-visible:outline-none transition-colors cursor-pointer disabled:opacity-40"
            title="Attach file or image"
          >
            <Plus className="w-[18px] h-[18px] shrink-0 stroke-[1.75]" />
          </button>

          {/* True single-line <input type="text"> guarantees 100% browser-native vertical center alignment */}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={isLoading}
            placeholder={
              attachment
                ? "Add a question about this file..."
                : sendOnEnter
                ? "Ask SARA or type / for commands"
                : "Ask SARA or type / (Ctrl+Enter)"
            }
            className="flex-1 min-w-0 w-full h-full bg-transparent border-0 p-0 m-0 text-[16px] sm:text-[13.5px] leading-[48px] text-slate-900 dark:text-[#f4f4f5] placeholder-slate-400 dark:placeholder-[#8e8ea0] focus:outline-none"
          />

          {/* Right Side: SARA Mode Selector ("SARA Auto v") + Mic / Send Button */}
          <div className="flex items-center gap-1 shrink-0 h-full" ref={modeMenuRef}>
            <div className="relative flex items-center h-full">
              <button
                type="button"
                onClick={() => setShowModeMenu((prev) => !prev)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[12px] leading-none text-slate-600 dark:text-[#a1a1aa] hover:text-slate-900 dark:hover:text-white focus:outline-none focus-visible:outline-none transition-colors cursor-pointer select-none"
                title="Switch SARA response mode"
              >
                <span className="font-semibold text-slate-900 dark:text-[#e4e4e7]">
                  SARA
                </span>
                <span className="font-normal text-slate-500 dark:text-[#8e8ea0]">
                  {modeShortLabel}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 dark:text-[#8e8ea0] ml-0.5 stroke-[1.75]" />
              </button>

              {showModeMenu && (
                <div
                  className={`absolute right-0 ${
                    isCentered ? "top-full mt-2" : "bottom-full mb-2"
                  } w-[260px] sm:w-72 max-w-[calc(100vw-2rem)] rounded-2xl p-1.5 bg-white dark:bg-[#1c1d22] ring-1 ring-slate-900/10 dark:ring-white/10 shadow-2xl z-40 animate-in fade-in zoom-in-95 duration-150`}
                >
                  {modeOptions.map((opt) => {
                    const active = responseStyle === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          onChangeResponseStyle?.(opt.id);
                          setShowModeMenu(false);
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left focus:outline-none transition-colors cursor-pointer ${
                          active
                            ? "bg-slate-100 dark:bg-white/[0.08] text-slate-900 dark:text-white"
                            : "hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold">
                            {opt.title}
                          </div>
                          <div className="text-[10.5px] text-slate-500 dark:text-[#8e8ea0] truncate">
                            {opt.desc}
                          </div>
                        </div>
                        {active && (
                          <Check className="w-3.5 h-3.5 text-slate-900 dark:text-white shrink-0 stroke-[2.25]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {hasPayload ? (
              <button
                type="submit"
                disabled={isLoading}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-200 focus:outline-none transition-all duration-150 cursor-pointer disabled:opacity-40"
                title="Send message"
              >
                <ArrowUp className="w-3.5 h-3.5 shrink-0 stroke-[2.25]" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isLoading}
                onClick={toggleVoiceDictation}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full focus:outline-none transition-colors cursor-pointer ${
                  isListening
                    ? "bg-rose-500/20 text-rose-400 animate-pulse"
                    : "text-slate-500 dark:text-[#a1a1aa] hover:text-slate-900 dark:hover:text-white"
                }`}
                title={isListening ? "Stop voice input" : "Voice input"}
              >
                {isListening ? (
                  <MicOff className="w-4 h-4 shrink-0 stroke-[1.75]" />
                ) : (
                  <Mic className="w-4 h-4 shrink-0 stroke-[1.75]" />
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
