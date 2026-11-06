"use client";

import React from "react";
import { CrmActivityData } from "../../types/gt-operations";
import { formatLabel } from "../../lib/formatters";
import {
  MessageSquare,
  PhoneCall,
  Calendar,
  Building2,
  User,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";

interface CrmActivityCardProps {
  activity: CrmActivityData;
}

export const CrmActivityCard: React.FC<CrmActivityCardProps> = ({ activity }) => {
  const getTypeIcon = (type: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("call")) return <PhoneCall className="w-5 h-5" />;
    return <MessageSquare className="w-5 h-5" />;
  };

  const formattedDate = activity.created_at
    ? new Date(activity.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Recent";

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/90 transition-all hover:border-slate-300 dark:hover:border-slate-600 shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-3.5 sm:p-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
            {getTypeIcon(activity.type)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base truncate">
                {activity.title}
              </span>
              <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-zinc-400 shrink-0">
                <span className="h-3 w-px bg-slate-200 dark:bg-white/[0.12]" aria-hidden="true" />
                <span>{formatLabel(activity.type)}</span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {(activity.customer_name || activity.rooftop_name) && (
                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1 truncate">
                  <Building2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate">{activity.customer_name || activity.rooftop_name}</span>
                </span>
              )}
              {activity.sales_agent_name && (
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1 truncate">
                  <User className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">Rep: {activity.sales_agent_name}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Date & Priority */}
        <div className="text-right shrink-0">
          {activity.priority && (
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider block">
              Priority: {formatLabel(activity.priority)}
            </span>
          )}
          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-end gap-1 mt-0.5">
            <Calendar className="w-3 h-3 text-slate-400" />
            {formattedDate}
          </span>
        </div>
      </div>

      {/* Description */}
      {activity.description && (
        <div className="p-3.5 sm:p-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900/90">
          <p>{activity.description}</p>
        </div>
      )}
    </div>
  );
};
