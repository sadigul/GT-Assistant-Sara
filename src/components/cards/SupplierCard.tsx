"use client";

import React from "react";
import { SupplierData } from "../../types/gt-operations";
import { formatLabel } from "../../lib/formatters";
import {
  Factory,
  MapPin,
  Phone,
  Mail,
  Clock,
  Star,
  Award,
  CreditCard,
  Percent,
  UserCheck
} from "lucide-react";

interface SupplierCardProps {
  supplier: SupplierData;
}

export const SupplierCard: React.FC<SupplierCardProps> = ({ supplier }) => {
  const rating = supplier.quality_rating;
  const leadTime = supplier.average_lead_time_days;

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/90 transition-all hover:border-slate-300 dark:hover:border-slate-600 shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-3.5 sm:p-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30">
            <Factory className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base truncate">
                {supplier.company_name || supplier.name}
              </span>
              {supplier.is_preferred && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-zinc-400 shrink-0">
                  <span className="h-3 w-px bg-slate-200 dark:bg-white/[0.12]" aria-hidden="true" />
                  <Award className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400" />
                  <span>Preferred</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
              <span className="truncate">
                {[supplier.city, supplier.state].filter(Boolean).join(", ") || "Domestic Supplier"}
              </span>
              {supplier.contact_name && (
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1 truncate">
                  <UserCheck className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{supplier.contact_name}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Lead Time & Rating */}
        <div className="flex items-center gap-4 text-right shrink-0">
          {leadTime !== undefined && leadTime !== null && (
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block">
                Avg Lead Time
              </span>
              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-end gap-1">
                <Clock className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                {leadTime} Days
              </span>
            </div>
          )}
          {rating !== undefined && rating !== null && (
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block">
                Quality Rating
              </span>
              <span className="text-xs font-semibold tabular-nums text-slate-900 dark:text-zinc-100 flex items-center justify-end gap-1">
                <Star className="w-3 h-3 text-slate-400 dark:text-zinc-400" />
                {rating}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Meta Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3.5 text-xs bg-white dark:bg-slate-900/90">
        {supplier.phone && (
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{supplier.phone}</span>
          </div>
        )}
        {supplier.email && (
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{supplier.email}</span>
          </div>
        )}
        {supplier.payment_terms && (
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Terms: <strong className="text-slate-900 dark:text-slate-100">{formatLabel(supplier.payment_terms)}</strong></span>
          </div>
        )}
        {supplier.discount_percent !== undefined && supplier.discount_percent > 0 && (
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Percent className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Discount: <strong className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{supplier.discount_percent}%</strong></span>
          </div>
        )}
      </div>
    </div>
  );
};
