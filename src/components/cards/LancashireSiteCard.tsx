"use client";

import React, { useState } from "react";
import { LancashireSiteData } from "../../types/gt-operations";
import { formatLabel } from "../../lib/formatters";
import { Factory, ShieldCheck, Activity, Gauge, Truck, Zap, User } from "lucide-react";

interface LancashireSiteCardProps {
  site: LancashireSiteData;
}

export const LancashireSiteCard: React.FC<LancashireSiteCardProps> = ({ site }) => {
  const [activeTab, setActiveTab] = useState<"lines" | "dispatches">("lines");

  return (
    <div className="my-3 overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:border-slate-300">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 p-3.5 sm:p-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <Factory className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider truncate">Facility Operations • Live Site Feed</div>
            <div className="text-sm font-bold text-slate-900 tracking-tight truncate">{site.siteName}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Activity className="w-3.5 h-3.5 text-emerald-600 animate-pulse" /> {formatLabel(site.operationalStatus)}
          </span>
          <span className="text-xs font-mono text-slate-500">{site.facilityCode}</span>
        </div>
      </div>

      <div className="p-3.5 sm:p-4">
        {/* KPI Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          <div className="rounded-xl bg-slate-50/70 p-2.5 border border-slate-200/70">
            <div className="text-slate-500 text-[10px] uppercase font-semibold">Daily Output</div>
            <div className="text-base font-bold text-emerald-700 flex items-center justify-center gap-1 mt-0.5">
              <Gauge className="w-3.5 h-3.5 text-emerald-600" /> {site.dailyThroughputUnits} <span className="text-[10px] font-normal text-slate-500">units</span>
            </div>
          </div>
          <div className="rounded-xl bg-slate-50/70 p-2.5 border border-slate-200/70">
            <div className="text-slate-500 text-[10px] uppercase font-semibold">Active Lines</div>
            <div className="text-base font-bold text-sky-700 flex items-center justify-center gap-1 mt-0.5">
              <Zap className="w-3.5 h-3.5 text-sky-600" /> 4 / 4
            </div>
          </div>
          <div className="rounded-xl bg-slate-50/70 p-2.5 border border-slate-200/70">
            <div className="text-slate-500 text-[10px] uppercase font-semibold">Outbound Dispatches</div>
            <div className="text-base font-bold text-sky-700 flex items-center justify-center gap-1 mt-0.5">
              <Truck className="w-3.5 h-3.5 text-sky-600" /> {site.todayDispatches.length} Today
            </div>
          </div>
          <div className="rounded-xl bg-slate-50/70 p-2.5 border border-slate-200/70">
            <div className="text-slate-500 text-[10px] uppercase font-semibold">Safety Record</div>
            <div className="text-base font-bold text-emerald-700 flex items-center justify-center gap-1 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> {site.safetyDaysLost}d Lost-free
            </div>
          </div>
        </div>

        {/* Navigation tabs */}
        <div className="mt-4 flex items-center gap-2 border-b border-slate-200 pb-2 text-xs">
          <button
            onClick={() => setActiveTab("lines")}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              activeTab === "lines"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Production Lines (4)
          </button>
          <button
            onClick={() => setActiveTab("dispatches")}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              activeTab === "dispatches"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Today&apos;s Dispatches ({site.todayDispatches.length})
          </button>
        </div>

        {/* Tab content */}
        {activeTab === "lines" ? (
          <div className="mt-3 space-y-2.5">
            {site.activeLines.map((line: any) => (
              <div
                key={line.id}
                className="rounded-xl bg-slate-50/60 p-3 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:border-slate-300 transition-all"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{line.name.split(":")[0]}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        line.status === "running"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {formatLabel(line.status)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 truncate max-w-sm">
                    {line.name.split(":")[1] || line.name}
                  </div>
                  <div className="text-[10px] text-slate-700 font-mono font-medium">
                    Current: {line.currentBatch}
                  </div>
                </div>

                <div className="sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-0 border-slate-200 pt-1.5 sm:pt-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500">Efficiency</span>
                    <span className="font-mono font-bold text-emerald-700 text-xs">{line.efficiency}%</span>
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <User className="w-3 h-3 text-slate-400" /> {line.operator}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 space-y-2.5">
            {site.todayDispatches.map((dispatch: any) => (
              <div
                key={dispatch.dispatchId}
                className="rounded-xl bg-slate-50/60 p-3 border border-slate-200/70 flex items-center justify-between gap-2 text-xs hover:border-slate-300 transition-all"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sky-700 font-mono">{dispatch.dispatchId}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        dispatch.status === "delivered"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : dispatch.status === "dispatched"
                          ? "bg-sky-50 text-sky-700 border-sky-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {formatLabel(dispatch.status)}
                    </span>
                  </div>
                  <div className="text-slate-900 text-xs mt-0.5 font-medium">{dispatch.destination}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Carrier: {dispatch.carrier} • {dispatch.palletCount} Pallets
                  </div>
                </div>
                <div className="text-right text-[11px] font-mono text-slate-700 shrink-0">
                  <div className="text-slate-500 text-[10px]">Departed</div>
                  {dispatch.departureTime}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-slate-50/70 border-t border-slate-100 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <span>Lead Ops: <strong className="text-slate-800">{site.shiftManager}</strong></span>
        <span>Lancashire Site PR6 7BX</span>
      </div>
    </div>
  );
};

