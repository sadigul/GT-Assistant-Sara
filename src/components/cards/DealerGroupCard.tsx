"use client";

import React, { useState } from "react";
import { DealerGroupData } from "../../types/gt-operations";
import { formatLabel } from "../../lib/formatters";
import {
  Layers,
  Building2,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Truck,
  Globe
} from "lucide-react";

interface DealerGroupCardProps {
  group: DealerGroupData;
}

export const DealerGroupCard: React.FC<DealerGroupCardProps> = ({ group }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const rooftops = group.rooftops || [];

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/90 transition-all hover:border-slate-300 dark:hover:border-slate-600 shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-3.5 sm:p-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base truncate">
                {group.name}
              </span>
              {group.code && (
                <span className="inline-flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-zinc-400 shrink-0">
                  <span className="h-3 w-px bg-slate-200 dark:bg-white/[0.12]" aria-hidden="true" />
                  <span>{group.code}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="truncate">
                {[group.city, group.state].filter(Boolean).join(", ") || "Corporate Group"}
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                {group.rooftops_count ?? rooftops.length} Affiliated Rooftops
              </span>
            </div>
          </div>
        </div>

        {/* Credit Limit & Terms */}
        <div className="text-right shrink-0">
          {group.credit_limit ? (
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block">
                Group Credit Limit
              </span>
              <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                ${group.credit_limit.toLocaleString()}
              </span>
            </div>
          ) : null}
          {group.terms && (
            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
              Terms: {formatLabel(group.terms)}
            </div>
          )}
        </div>
      </div>

      {/* Meta Information Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-white dark:bg-slate-900/90 text-xs border-b border-slate-100 dark:border-slate-800">
        {group.phone && (
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{group.phone}</span>
          </div>
        )}
        {group.email && (
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{group.email}</span>
          </div>
        )}
        {group.website_url && (
          <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
            <Globe className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
            <a href={group.website_url} target="_blank" rel="noreferrer" className="truncate hover:underline">
              {group.website_url.replace(/^https?:\/\//i, "")}
            </a>
          </div>
        )}
      </div>

      {/* Member Rooftops List */}
      {rooftops.length > 0 && (
        <div className="p-3.5 sm:p-4 bg-slate-50/40 dark:bg-slate-800/30">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 pb-1.5 cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Member Rooftops ({rooftops.length})
            </span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {isExpanded && (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {rooftops.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/70 text-xs gap-2 min-w-0"
                >
                  <div className="font-semibold text-slate-800 dark:text-slate-200 truncate min-w-0 flex-1">{r.name}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                    {[r.city, r.state].filter(Boolean).join(", ")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
