"use client";

import React from "react";
import { InventoryItem } from "../../types/gt-operations";
import { Layers, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";

interface InventoryCardProps {
  items: InventoryItem[];
}

export const InventoryCard: React.FC<InventoryCardProps> = ({ items }) => {
  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:border-slate-300">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 p-3.5 sm:p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 text-teal-700 border border-teal-200">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">ERP Warehousing — Inventory Status</div>
            <div className="text-sm font-bold text-slate-900 tracking-tight">Lancashire Central Vault & Storage</div>
          </div>
        </div>
        <span className="text-xs text-slate-500 font-mono font-medium">5 Monitored SKUs</span>
      </div>

      <div className="p-3 sm:p-4 overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="border-b border-slate-200 text-[10px] uppercase text-slate-400 bg-slate-50/60">
            <tr>
              <th className="py-2 px-2.5 font-semibold">SKU / Material</th>
              <th className="py-2 px-2.5 font-semibold">Location</th>
              <th className="py-2 px-2.5 font-semibold text-right">Stock Level</th>
              <th className="py-2 px-2.5 font-semibold text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.sku} className="hover:bg-slate-50 transition-colors">
                <td className="py-2.5 px-2.5">
                  <div className="font-semibold text-slate-900">{item.name}</div>
                  <div className="text-[10px] font-mono text-slate-400">{item.sku} / {item.category}</div>
                </td>
                <td className="py-2.5 px-2.5 text-slate-500 text-[11px] whitespace-nowrap">
                  {item.location}
                </td>
                <td className="py-2.5 px-2.5 text-right font-mono whitespace-nowrap">
                  <span className="font-bold text-slate-900">{item.currentStock}</span>{" "}
                  <span className="text-slate-400 text-[10px]">{item.unit}</span>
                  <div className="text-[9px] text-slate-400">Min: {item.reorderLevel} {item.unit}</div>
                </td>
                <td className="py-2.5 px-2.5 text-right whitespace-nowrap">
                  {item.status === "In Stock" && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Normal
                    </span>
                  )}
                  {item.status === "Low Stock" && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      Low
                    </span>
                  )}
                  {item.status === "Critical" && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                      Critical
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span>Raw Material Valuation: ~<strong className="text-emerald-600 font-mono font-extrabold">£146,200 GBP</strong></span>
        <span className="text-slate-400">Inventory Status Logged</span>
      </div>
    </div>
  );
};

