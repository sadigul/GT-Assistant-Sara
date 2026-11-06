"use client";

import React from "react";
import { PricingRuleData } from "../../types/gt-operations";
import { formatLabel } from "../../lib/formatters";
import {
  Percent,
  Tag,
  Sliders,
  CheckCircle2,
  DollarSign
} from "lucide-react";

interface PricingRuleCardProps {
  rule: PricingRuleData;
}

export const PricingRuleCard: React.FC<PricingRuleCardProps> = ({ rule }) => {
  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/90 transition-all hover:border-slate-300 dark:hover:border-slate-600 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-3.5 sm:p-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
            <Percent className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base truncate">
                {rule.name}
              </span>
              {rule.price_method && (
                <span className="inline-flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-zinc-400 shrink-0">
                  <span className="h-3 w-px bg-slate-200 dark:bg-white/[0.12]" aria-hidden="true" />
                  <span>{formatLabel(rule.price_method)}</span>
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span>Scope: <strong className="text-slate-700 dark:text-slate-300">{formatLabel(rule.scope_type || "Global")}</strong></span>
              {rule.match_type && (
                <span>Match: <strong className="text-slate-700 dark:text-slate-300">{formatLabel(rule.match_type)}</strong></span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          {rule.discount_pct !== undefined && rule.discount_pct !== null && (
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block">
                Discount
              </span>
              <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                {rule.discount_pct}% OFF
              </span>
            </div>
          )}
          {rule.fixed_price !== undefined && rule.fixed_price !== null && (
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block">
                Fixed Price
              </span>
              <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                ${Number(rule.fixed_price).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
