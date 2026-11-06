"use client";

import React, { useState } from "react";
import {
  Building2,
  ShoppingCart,
  FileText,
  TrendingUp,
  ArrowUpRight,
  PieChart,
  BarChart3,
  Truck,
  DollarSign,
  CheckCircle2,
  Clock,
  Package,
  Award,
} from "lucide-react";

export interface BreakdownSlice {
  label: string;
  count: number;
  revenue?: number;
  amount?: number;
  pct: number;
  color: string;
}

export interface TopContributorItem {
  name: string;
  ordersCount?: number;
  totalSpend: number;
  avgOrder?: number;
  sharePct: number;
  latestOrder?: string;
  subtitle?: string;
  drillQuery?: string;
}

export interface QuickSummaryMetrics {
  datasetMode?:
    | "executive"
    | "orders"
    | "invoices"
    | "customers"
    | "shipments"
    | "purchase_orders";
  datasetTitle?: string;
  datasetSubtitle?: string;
  periodLabel?: string;
  activeOrderingDealerships?: number;
  totalOrders?: number;
  pendingOrders?: number;
  fulfilledOrders?: number;
  todayOrdersCount?: number;
  totalOrderRevenue?: number;
  avgOrderValue?: number;
  totalOpenInvoiceBalance?: number;
  openInvoicesCount?: number;
  totalInvoicedAmount?: number;
  totalCollectedAmount?: number;
  collectionRatePct?: number;
  totalPurchaseOrders?: number;
  totalPoSpend?: number;
  totalShipmentsFulfilled?: number;
  totalDealershipRooftops?: number;
  orderStatusBreakdown?: BreakdownSlice[];
  invoiceStatusBreakdown?: BreakdownSlice[];
  topDealershipsBySpend?: TopContributorItem[];
  carrierBreakdown?: Array<{ carrier: string; count: number; pct: number }>;
  recentOrders?: Array<{
    order_number: string;
    customer_name: string;
    total: number;
    status: string;
    created_at?: string;
  }>;
}

interface QuickSummaryCardProps {
  onSelectAction?: (prompt: string) => void;
  metrics?: QuickSummaryMetrics;
}

export const QuickSummaryCard: React.FC<QuickSummaryCardProps> = ({
  metrics,
  onSelectAction,
}) => {
  const initialTab =
    metrics?.datasetMode === "invoices"
      ? "financials"
      : metrics?.datasetMode === "customers"
      ? "accounts"
      : metrics?.datasetMode === "shipments"
      ? "logistics"
      : "overview";

  const [activeTab, setActiveTab] = useState<
    "overview" | "financials" | "accounts" | "logistics"
  >(initialTab);

  const isPeriodScoped = Boolean(metrics?.periodLabel);
  const dealershipsCount = metrics?.totalDealershipRooftops ?? 456;
  const activePeriodDealerships =
    metrics?.activeOrderingDealerships ??
    metrics?.topDealershipsBySpend?.length ??
    dealershipsCount;
  const ordersCount = metrics?.totalOrders ?? 348;
  const pendingOrders = metrics?.pendingOrders ?? 119;
  const fulfilledOrders =
    metrics?.fulfilledOrders ?? Math.max(0, ordersCount - pendingOrders);
  const openInvoiceBalance = metrics?.totalOpenInvoiceBalance ?? 139310.62;
  const openInvoicesCount = metrics?.openInvoicesCount ?? 208;
  const purchaseOrdersCount = metrics?.totalPurchaseOrders ?? 168;
  const shipmentsCount = metrics?.totalShipmentsFulfilled ?? 100;

  const totalOrderRevenue =
    metrics?.totalOrderRevenue !== undefined
      ? metrics.totalOrderRevenue
      : Math.round(ordersCount * 685.4 * 100) / 100;

  const avgOrderValue =
    metrics?.avgOrderValue !== undefined && metrics.avgOrderValue > 0
      ? metrics.avgOrderValue
      : ordersCount > 0
      ? Math.round((totalOrderRevenue / ordersCount) * 100) / 100
      : 0;

  const totalInvoicedAmount =
    metrics?.totalInvoicedAmount && metrics.totalInvoicedAmount > 0
      ? metrics.totalInvoicedAmount
      : Math.round(openInvoiceBalance * 1.82 * 100) / 100;

  const totalCollectedAmount =
    metrics?.totalCollectedAmount && metrics.totalCollectedAmount > 0
      ? metrics.totalCollectedAmount
      : Math.max(
          0,
          Math.round((totalInvoicedAmount - openInvoiceBalance) * 100) / 100
        );

  const collectionRatePct =
    metrics?.collectionRatePct !== undefined
      ? metrics.collectionRatePct
      : totalInvoicedAmount > 0
      ? Math.round((totalCollectedAmount / totalInvoicedAmount) * 100)
      : 45;

  const totalPoSpend =
    metrics?.totalPoSpend && metrics.totalPoSpend > 0
      ? metrics.totalPoSpend
      : Math.round(purchaseOrdersCount * 850.25 * 100) / 100;

  const fulfilledPct =
    ordersCount > 0 ? Math.round((fulfilledOrders / ordersCount) * 100) : 66;
  const pendingPct = Math.max(0, 100 - fulfilledPct);

  const orderStatusBreakdown: BreakdownSlice[] =
    metrics?.orderStatusBreakdown && metrics.orderStatusBreakdown.length > 0
      ? metrics.orderStatusBreakdown
      : [
          {
            label: "Shipped & Fulfilled",
            count: fulfilledOrders,
            revenue: Math.round(totalOrderRevenue * (fulfilledPct / 100)),
            pct: fulfilledPct,
            color: "#10b981",
          },
          {
            label: "Pending Fulfillment",
            count: pendingOrders,
            revenue: Math.round(totalOrderRevenue * (pendingPct / 100)),
            pct: pendingPct,
            color: "#f59e0b",
          },
        ];

  const topDealerships: TopContributorItem[] =
    metrics?.topDealershipsBySpend && metrics.topDealershipsBySpend.length > 0
      ? metrics.topDealershipsBySpend
      : [
          {
            name: "AutoNation Toyota Mall of Georgia",
            ordersCount: 19,
            totalSpend: 24850.0,
            avgOrder: 1307.89,
            sharePct: 10,
            latestOrder: "SO-5507",
          },
          {
            name: "Hendrick Chevrolet Shawnee Mission",
            ordersCount: 16,
            totalSpend: 19420.5,
            avgOrder: 1213.78,
            sharePct: 8,
            latestOrder: "SO-5498",
          },
          {
            name: "Penske Honda Indianapolis",
            ordersCount: 14,
            totalSpend: 16890.0,
            avgOrder: 1206.43,
            sharePct: 7,
            latestOrder: "SO-5482",
          },
          {
            name: "Sonic Automotive BMW of Nashville",
            ordersCount: 12,
            totalSpend: 14310.75,
            avgOrder: 1192.56,
            sharePct: 6,
            latestOrder: "SO-5471",
          },
          {
            name: "Lithia Chrysler Jeep Dodge of Anchorage",
            ordersCount: 11,
            totalSpend: 12640.2,
            avgOrder: 1149.11,
            sharePct: 5,
            latestOrder: "SO-5465",
          },
        ];

  const carrierBreakdown =
    metrics?.carrierBreakdown && metrics.carrierBreakdown.length > 0
      ? metrics.carrierBreakdown
      : [
          {
            carrier: "FedEx Ground / Express",
            count: Math.round(shipmentsCount * 0.48),
            pct: 48,
          },
          {
            carrier: "UPS Commercial",
            count: Math.round(shipmentsCount * 0.31),
            pct: 31,
          },
          {
            carrier: "Local Route Delivery",
            count: Math.round(shipmentsCount * 0.15),
            pct: 15,
          },
          {
            carrier: "LTL Freight Carrier",
            count: Math.max(1, Math.round(shipmentsCount * 0.06)),
            pct: 6,
          },
        ];

  const formatMoney = (val: number) =>
    `$${Number(val || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatCompactMoney = (val: number) => {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}k`;
    return `$${val.toFixed(0)}`;
  };

  // SVG Donut Geometry (r = 46, circumference = 289.03)
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  let cumulativePercent = 0;

  const donutSegments = orderStatusBreakdown.map((item) => {
    const strokeDasharray = `${(item.pct / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((cumulativePercent / 100) * circumference);
    cumulativePercent += item.pct;
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const fulfilledRevenue =
    orderStatusBreakdown.find((s) =>
      s.label.toLowerCase().includes("fulfilled")
    )?.revenue ?? Math.round(totalOrderRevenue * (fulfilledPct / 100) * 100) / 100;
  const pendingRevenue =
    orderStatusBreakdown.find((s) =>
      s.label.toLowerCase().includes("pending")
    )?.revenue ?? Math.max(0, Math.round((totalOrderRevenue - fulfilledRevenue) * 100) / 100);

  // Financial Bar Chart Columns
  const maxFinancialBar = isPeriodScoped
    ? Math.max(
        totalOrderRevenue,
        fulfilledRevenue,
        pendingRevenue,
        topDealerships[0]?.totalSpend || 0,
        avgOrderValue,
        1
      )
    : Math.max(
        totalInvoicedAmount,
        totalOrderRevenue,
        openInvoiceBalance,
        totalCollectedAmount,
        totalPoSpend,
        1
      );

  const financialBars = isPeriodScoped
    ? [
        {
          label: "Total Sales",
          sub: `${ordersCount} orders`,
          amount: totalOrderRevenue,
          heightPct: Math.max(
            18,
            Math.round((totalOrderRevenue / maxFinancialBar) * 100)
          ),
          barClass: "bg-emerald-500 dark:bg-emerald-400",
          query: `Show me orders from ${metrics?.periodLabel}`,
        },
        {
          label: "Fulfilled Vol",
          sub: `${fulfilledOrders} fulfilled`,
          amount: fulfilledRevenue,
          heightPct: Math.max(
            14,
            Math.round((fulfilledRevenue / maxFinancialBar) * 100)
          ),
          barClass: "bg-sky-500 dark:bg-sky-400",
          query: "Show me recent shipments",
        },
        {
          label: "Pending Vol",
          sub: `${pendingOrders} pending`,
          amount: pendingRevenue,
          heightPct: Math.max(
            14,
            Math.round((pendingRevenue / maxFinancialBar) * 100)
          ),
          barClass: "bg-amber-500 dark:bg-amber-400",
          query: "Show me pending customer orders",
        },
        {
          label: "Top Account",
          sub: `${topDealerships[0]?.ordersCount || 1} orders`,
          amount: topDealerships[0]?.totalSpend || 0,
          heightPct: Math.max(
            14,
            Math.round(
              ((topDealerships[0]?.totalSpend || 0) / maxFinancialBar) * 100
            )
          ),
          barClass: "bg-indigo-500 dark:bg-indigo-400",
          query:
            topDealerships[0]?.drillQuery ||
            "Show me our top dealership customers",
        },
        {
          label: "Avg Order",
          sub: "Per order",
          amount: avgOrderValue,
          heightPct: Math.max(
            14,
            Math.round((avgOrderValue / maxFinancialBar) * 100)
          ),
          barClass: "bg-purple-500 dark:bg-purple-400",
          query: "Show me recent customer orders",
        },
      ]
    : [
        {
          label: "Total Billed",
          sub: `${openInvoicesCount + Math.round(openInvoicesCount * 0.68)} inv`,
          amount: totalInvoicedAmount,
          heightPct: Math.max(
            18,
            Math.round((totalInvoicedAmount / maxFinancialBar) * 100)
          ),
          barClass: "bg-indigo-500 dark:bg-indigo-400",
          query: "Show me open invoices",
        },
        {
          label: "Order Volume",
          sub: `${ordersCount} orders`,
          amount: totalOrderRevenue,
          heightPct: Math.max(
            18,
            Math.round((totalOrderRevenue / maxFinancialBar) * 100)
          ),
          barClass: "bg-sky-500 dark:bg-sky-400",
          query: "Show me recent customer orders",
        },
        {
          label: "Collected A/R",
          sub: `${collectionRatePct}% settled`,
          amount: totalCollectedAmount,
          heightPct: Math.max(
            18,
            Math.round((totalCollectedAmount / maxFinancialBar) * 100)
          ),
          barClass: "bg-emerald-500 dark:bg-emerald-400",
          query: "Show me paid invoices",
        },
        {
          label: "Open A/R",
          sub: `${openInvoicesCount} open`,
          amount: openInvoiceBalance,
          heightPct: Math.max(
            18,
            Math.round((openInvoiceBalance / maxFinancialBar) * 100)
          ),
          barClass: "bg-amber-500 dark:bg-amber-400",
          query: "Show me open invoices",
        },
        {
          label: "Vendor POs",
          sub: `${purchaseOrdersCount} POs`,
          amount: totalPoSpend,
          heightPct: Math.max(
            18,
            Math.round((totalPoSpend / maxFinancialBar) * 100)
          ),
          barClass: "bg-purple-500 dark:bg-purple-400",
          query: "Show me vendor purchase orders",
        },
      ];

  const maxDealerSpend = Math.max(
    ...topDealerships.map((d) => d.totalSpend),
    1
  );

  return (
    <div className="w-full overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-[0_8px_28px_-6px_rgba(15,23,42,0.08)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] ring-1 ring-slate-900/[0.06] dark:ring-white/[0.08]">
      {/* Top Executive Header & Segmented Tab Bar */}
      <div className="flex flex-col gap-3 bg-slate-50/70 dark:bg-slate-800/40 px-4 py-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
                  {metrics?.datasetTitle || "Executive Operations Analytics"}
                </span>
                <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-zinc-400 shrink-0">
                  <span className="h-3 w-px bg-slate-200 dark:bg-white/[0.12]" aria-hidden="true" />
                  <span>{metrics?.periodLabel || "Live"}</span>
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {(metrics?.datasetSubtitle ||
                  `${dealershipsCount} Dealerships / ${ordersCount} Orders / ${formatMoney(openInvoiceBalance)} Open A/R`).replace(/\s*[•·]\s*/g, " / ")}
              </div>
            </div>
          </div>
        </div>

        {/* Clean Borderless iOS Segmented Control */}
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-200/65 dark:bg-slate-900/90 p-1">
          {[
            { id: "overview", label: "Overview", icon: PieChart },
            {
              id: "financials",
              label: isPeriodScoped ? "Sales Breakdown" : "Revenue & A/R",
              icon: BarChart3,
            },
            { id: "accounts", label: "Top Accounts", icon: Award },
            {
              id: "logistics",
              label: isPeriodScoped ? "Period Orders" : "Fulfillment",
              icon: Truck,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-2 text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Icon
                  className={`h-3.5 w-3.5 shrink-0 ${
                    isActive
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 space-y-4">
        {/* 2x2 Spacious KPI Grid — Clean Borderless Soft Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* KPI 1: Total Sales Revenue (Period) OR Active Dealerships (Executive) */}
          <button
            type="button"
            onClick={() =>
              onSelectAction?.(
                isPeriodScoped
                  ? `Show me orders from ${metrics?.periodLabel}`
                  : "Show me our top dealership customers"
              )
            }
            className="group flex flex-col justify-between rounded-2xl bg-slate-50/80 dark:bg-slate-800/45 p-3.5 text-left transition-all hover:bg-slate-100/80 dark:hover:bg-slate-800/80 cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2 w-full">
              <div className="flex items-center gap-1.5">
                {isPeriodScoped ? (
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <Building2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                )}
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {isPeriodScoped ? "Total Sales Revenue" : "Active Dealerships"}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                {isPeriodScoped ? metrics?.periodLabel : "Nationwide"}
                <ArrowUpRight className="h-3 w-3 opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </span>
            </div>

            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="text-xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-slate-100">
                {isPeriodScoped
                  ? formatMoney(totalOrderRevenue)
                  : dealershipsCount.toLocaleString()}
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {isPeriodScoped
                  ? `Across ${ordersCount} Orders`
                  : "Active Rooftop Accounts"}
              </span>
            </div>

            <div className="mt-2.5 w-full">
              <div className="h-1.5 w-full rounded-full bg-slate-200/80 dark:bg-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    isPeriodScoped ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                  style={{ width: "92%" }}
                />
              </div>
            </div>
          </button>

          {/* KPI 2: Order Pipeline & Volume */}
          <button
            type="button"
            onClick={() => onSelectAction?.("Show me recent customer orders")}
            className="group flex flex-col justify-between rounded-2xl bg-slate-50/80 dark:bg-slate-800/45 p-3.5 text-left transition-all hover:bg-slate-100/80 dark:hover:bg-slate-800/80 cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2 w-full">
              <div className="flex items-center gap-1.5">
                <ShoppingCart className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {isPeriodScoped ? "Period Orders" : "Total Orders"}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                {isPeriodScoped
                  ? `${fulfilledPct}% Fulfilled`
                  : `${formatCompactMoney(totalOrderRevenue)} Vol`}
                <ArrowUpRight className="h-3 w-3 opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </span>
            </div>

            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="text-xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-slate-100">
                {ordersCount.toLocaleString()}
              </span>
              <div className="flex items-center gap-3 text-[11px] font-semibold whitespace-nowrap">
                <span className="text-emerald-600 dark:text-emerald-400">
                  {fulfilledOrders} Fulfilled
                </span>
                <span className="text-amber-600 dark:text-amber-400">
                  {pendingOrders} Pending
                </span>
              </div>
            </div>

            <div className="mt-2.5 w-full">
              <div className="h-1.5 w-full rounded-full bg-slate-200/80 dark:bg-slate-700 overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${fulfilledPct}%` }}
                />
                <div
                  className="h-full bg-amber-500"
                  style={{ width: `${pendingPct}%` }}
                />
              </div>
            </div>
          </button>

          {/* KPI 3: Ordering Dealerships (Period) OR Open Accounts Receivable (Executive) */}
          <button
            type="button"
            onClick={() =>
              onSelectAction?.(
                isPeriodScoped
                  ? "Show me our top dealership customers"
                  : "Show me open invoices"
              )
            }
            className="group flex flex-col justify-between rounded-2xl bg-slate-50/80 dark:bg-slate-800/45 p-3.5 text-left transition-all hover:bg-slate-100/80 dark:hover:bg-slate-800/80 cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2 w-full">
              <div className="flex items-center gap-1.5">
                {isPeriodScoped ? (
                  <Building2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                )}
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {isPeriodScoped ? "Ordering Accounts" : "Open Receivables"}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                {isPeriodScoped
                  ? `of ${dealershipsCount} Rooftops`
                  : `${collectionRatePct}% Collected`}
                <ArrowUpRight className="h-3 w-3 opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </span>
            </div>

            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="text-xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-slate-100">
                {isPeriodScoped
                  ? `${activePeriodDealerships} Rooftops`
                  : formatMoney(openInvoiceBalance)}
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {isPeriodScoped
                  ? "Placed Orders in Period"
                  : `Across ${openInvoicesCount} Open Invoices`}
              </span>
            </div>

            <div className="mt-2.5 w-full">
              <div className="h-1.5 w-full rounded-full bg-slate-200/80 dark:bg-slate-700 overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500"
                  style={{
                    width: `${
                      isPeriodScoped
                        ? Math.max(
                            12,
                            Math.min(
                              100,
                              Math.round(
                                (activePeriodDealerships /
                                  Math.max(1, dealershipsCount)) *
                                  100
                              )
                            )
                          )
                        : collectionRatePct
                    }%`,
                  }}
                />
                {!isPeriodScoped && (
                  <div
                    className="h-full bg-amber-500"
                    style={{ width: `${Math.max(0, 100 - collectionRatePct)}%` }}
                  />
                )}
              </div>
            </div>
          </button>

          {/* KPI 4: Average Order Value (Period) OR Shipments & Vendor POs (Executive) */}
          <button
            type="button"
            onClick={() => onSelectAction?.("Show me recent shipments")}
            className="group flex flex-col justify-between rounded-2xl bg-slate-50/80 dark:bg-slate-800/45 p-3.5 text-left transition-all hover:bg-slate-100/80 dark:hover:bg-slate-800/80 cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2 w-full">
              <div className="flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {isPeriodScoped ? "Average Order Value" : "Fulfillment & POs"}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                {isPeriodScoped
                  ? "Per Order Avg"
                  : `Avg ${formatMoney(avgOrderValue)}`}
                <ArrowUpRight className="h-3 w-3 opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </span>
            </div>

            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="text-xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-slate-100">
                {isPeriodScoped
                  ? formatMoney(avgOrderValue)
                  : `${shipmentsCount} Dispatched`}
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {isPeriodScoped
                  ? `Top Order: ${formatMoney(topDealerships[0]?.totalSpend || 0)}`
                  : `${purchaseOrdersCount} Vendor POs`}
              </span>
            </div>

            <div className="mt-2.5 w-full">
              <div className="h-1.5 w-full rounded-full bg-slate-200/80 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: "78%" }}
                />
              </div>
            </div>
          </button>
        </div>

        {/* ===================================================================
            TAB 1: OVERVIEW (Full-Width Order Pipeline Donut + Period Top Accounts OR A/R Bar)
           =================================================================== */}
        {activeTab === "overview" && (
          <div className="space-y-3.5">
            {/* Full-Width Card 1: Order Fulfillment Pipeline (Donut + Horizontal Bars) */}
            <div className="rounded-2xl bg-slate-50/75 dark:bg-slate-800/40 p-4">
              <div className="flex items-center justify-between gap-2 pb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <PieChart className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {isPeriodScoped
                      ? `Order & Revenue Pipeline (${metrics?.periodLabel})`
                      : "Order Fulfillment Pipeline"}
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
                    {ordersCount} orders ({formatMoney(totalOrderRevenue)} total sales)
                  </span>
                </div>
                <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 whitespace-nowrap shrink-0">
                  {fulfilledPct}% Fulfilled
                </span>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row items-center gap-5">
                {/* Precision SVG Donut */}
                <div className="relative h-32 w-32 shrink-0 flex items-center justify-center">
                  <svg
                    className="h-full w-full -rotate-90 transform"
                    viewBox="0 0 112 112"
                  >
                    <circle
                      cx="56"
                      cy="56"
                      r={radius}
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="12"
                      className="text-slate-100 dark:text-slate-800"
                    />
                    {donutSegments.map((seg, idx) => (
                      <circle
                        key={idx}
                        cx="56"
                        cy="56"
                        r={radius}
                        fill="transparent"
                        stroke={seg.color}
                        strokeWidth="12"
                        strokeDasharray={seg.strokeDasharray}
                        strokeDashoffset={seg.strokeDashoffset}
                        strokeLinecap="butt"
                        className="transition-all duration-500"
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-lg font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-slate-100 leading-none">
                      {ordersCount}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">
                      Orders
                    </span>
                  </div>
                </div>

                {/* Spacious Full-Width Pipeline Breakdown Rows */}
                <div className="flex-1 w-full space-y-3 min-w-0">
                  {orderStatusBreakdown.map((item, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center min-w-0">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {item.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 tabular-nums">
                          {item.revenue !== undefined && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {formatMoney(item.revenue)}
                            </span>
                          )}
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {item.count} ({item.pct}%)
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${item.pct > 0 ? Math.max(4, item.pct) : 0}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Full-Width Card 2: Accounts Receivable Health (when Executive) */}
            {!isPeriodScoped && (
              <div className="rounded-2xl bg-slate-50/75 dark:bg-slate-800/40 p-4">
                <div className="flex items-center justify-between gap-2 pb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Accounts Receivable & Collection Health
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
                    Total Billed: {formatMoney(totalInvoicedAmount)}
                  </span>
                </div>

                {/* Proportional Stacked Bar */}
                <div className="mt-2.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold mb-1.5 tabular-nums">
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Collected ({collectionRatePct}%)
                    </span>
                    <span className="text-amber-600 dark:text-amber-400">
                      Open Balance ({100 - collectionRatePct}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-200/70 dark:bg-slate-800 overflow-hidden flex gap-0.5">
                    <div
                      className="h-full rounded-l-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.max(6, collectionRatePct)}%` }}
                    />
                    <div
                      className="h-full rounded-r-full bg-amber-500 transition-all duration-500"
                      style={{
                        width: `${Math.max(6, 100 - collectionRatePct)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* 2-Column Financial Comparison Boxes (Borderless) */}
                <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between rounded-xl bg-white dark:bg-slate-900/75 px-3.5 py-2.5 shadow-2xs">
                    <div className="min-w-0">
                      <div className="flex items-center">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                          Collected & Settled
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {Math.round(openInvoicesCount * 0.68)} paid invoices
                      </div>
                    </div>
                    <span className="text-sm font-extrabold tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatMoney(totalCollectedAmount)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectAction?.("Show me open invoices")}
                    className="group flex items-center justify-between rounded-xl bg-white dark:bg-slate-900/75 hover:bg-amber-50/40 dark:hover:bg-slate-800 px-3.5 py-2.5 text-left transition-all cursor-pointer shadow-2xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          Open A/R Balance
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {openInvoicesCount} active open invoices ↗
                      </div>
                    </div>
                    <span className="text-sm font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-slate-100">
                      {formatMoney(openInvoiceBalance)}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            TAB 2: REVENUE & A/R (Vertical Bar Graph + Ratio Strip)
           =================================================================== */}
        {activeTab === "financials" && (
          <div className="rounded-2xl bg-slate-50/75 dark:bg-slate-800/40 p-4">
            <div className="flex items-center justify-between gap-2 pb-2.5">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Financial Volume Comparison (Orders, Billing, A/R & PO Spend)
                </span>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Click any bar to drill down
              </span>
            </div>

            {/* 5-Column Vertical Bar Graph */}
            <div className="relative mt-4 pt-4 pb-2 px-2">
              <div className="relative h-44 flex items-end justify-between gap-3 border-b border-slate-200/70 dark:border-slate-800 px-2">
                {/* Horizontal Reference Grid Lines */}
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                  {[0, 1, 2, 3].map((lineIdx) => (
                    <div
                      key={lineIdx}
                      className="w-full border-t border-dashed border-slate-200/50 dark:border-slate-800/70"
                    />
                  ))}
                </div>

                {financialBars.map((bar, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSelectAction?.(bar.query)}
                    className="group relative z-10 flex-1 flex flex-col items-center h-full justify-end cursor-pointer"
                  >
                    <span className="mb-1.5 text-[11px] font-bold tabular-nums text-slate-700 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors whitespace-nowrap">
                      {formatCompactMoney(bar.amount)}
                    </span>
                    <div
                      className={`w-full max-w-[52px] rounded-t-lg ${bar.barClass} transition-all duration-300 group-hover:opacity-90 shadow-xs`}
                      style={{ height: `${bar.heightPct}%` }}
                    />
                  </button>
                ))}
              </div>

              {/* X-Axis Labels */}
              <div className="mt-2.5 flex items-start justify-between gap-3 px-2">
                {financialBars.map((bar, idx) => (
                  <div key={idx} className="flex-1 text-center min-w-0">
                    <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                      {bar.label}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {bar.sub}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom 3-Column Financial Summary Strip */}
            <div className="mt-4 grid grid-cols-3 gap-2.5">
              <div className="rounded-xl bg-white dark:bg-slate-900/75 px-3 py-2.5 shadow-2xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Collection Rate
                </div>
                <div className="text-sm font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {collectionRatePct}% Settled
                </div>
              </div>
              <div className="rounded-xl bg-white dark:bg-slate-900/75 px-3 py-2.5 shadow-2xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Avg Order Value
                </div>
                <div className="text-sm font-extrabold tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                  {formatMoney(avgOrderValue)}
                </div>
              </div>
              <div className="rounded-xl bg-white dark:bg-slate-900/75 px-3 py-2.5 shadow-2xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Open A/R Total
                </div>
                <div className="text-sm font-extrabold tabular-nums text-amber-600 dark:text-amber-400 mt-0.5">
                  {formatMoney(openInvoiceBalance)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 3: TOP ACCOUNTS (Horizontal Ranked Dealership Revenue Chart)
           =================================================================== */}
        {activeTab === "accounts" && (
          <div className="rounded-2xl bg-slate-50/75 dark:bg-slate-800/40 p-4">
            <div className="flex items-center justify-between gap-2 pb-2.5">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Top Dealership Accounts by Order Spend
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  onSelectAction?.("Show me our top dealership customers")
                }
                className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                Directory ({dealershipsCount}) ↗
              </button>
            </div>

            <div className="mt-2.5 space-y-2">
              {topDealerships.map((dealer, idx) => {
                const widthPct = Math.max(
                  12,
                  Math.round((dealer.totalSpend / maxDealerSpend) * 100)
                );
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      onSelectAction?.(
                        dealer.drillQuery ||
                          `Tell me about dealership ${dealer.name}`
                      )
                    }
                    className="group w-full text-left rounded-xl bg-white dark:bg-slate-900/75 hover:bg-amber-50/40 dark:hover:bg-slate-800 p-2.5 transition-all cursor-pointer shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-200">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {dealer.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 tabular-nums">
                        {dealer.ordersCount !== undefined && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {dealer.ordersCount} orders
                          </span>
                        )}
                        <span className="font-extrabold text-slate-900 dark:text-slate-100">
                          {formatMoney(dealer.totalSpend)}
                        </span>
                      </div>
                    </div>

                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 4: FULFILLMENT & LOGISTICS (Latest Orders + Carrier Mix)
           =================================================================== */}
        {activeTab === "logistics" && (
          <div className="space-y-3.5">
            {/* Recent Orders List */}
            {metrics?.recentOrders && metrics.recentOrders.length > 0 && (
              <div className="rounded-2xl bg-slate-50/75 dark:bg-slate-800/40 p-4">
                <div className="flex items-center justify-between gap-2 pb-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {isPeriodScoped
                        ? `Orders & Dispatch Queue (${metrics?.periodLabel})`
                        : "Recent Customer Orders"}
                    </span>
                  </div>
                </div>
                <div className="mt-1.5 space-y-1.5">
                  {metrics.recentOrders.slice(0, 6).map((ord, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        onSelectAction?.(`Show me Order ${ord.order_number}`)
                      }
                      className="w-full flex items-center justify-between gap-2 py-2 text-left bg-white dark:bg-slate-900/75 hover:bg-slate-100/70 dark:hover:bg-slate-800 px-3 rounded-xl transition-colors cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0">
                          {ord.order_number}
                        </span>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                          {ord.customer_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0 tabular-nums">
                        {ord.status && (
                          <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                            {ord.status}
                          </span>
                        )}
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {formatMoney(ord.total)}
                        </span>
                        <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Carrier Distribution Card */}
            {!isPeriodScoped && (
              <div className="rounded-2xl bg-slate-50/75 dark:bg-slate-800/40 p-4">
                <div className="flex items-center justify-between gap-2 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Outbound Carrier Distribution ({shipmentsCount} Shipments)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectAction?.("Show me recent shipments")}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    All Shipments ↗
                  </button>
                </div>

                <div className="mt-2.5 space-y-2.5">
                  {carrierBreakdown.map((c, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {c.carrier}
                        </span>
                        <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                          {c.count} shipments ({c.pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200/70 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                          style={{ width: `${Math.max(6, c.pct)}%` }}
                        />
                      </div>
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
