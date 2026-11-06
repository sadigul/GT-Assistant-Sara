"use client";

import React from "react";
import { CrmLeadDeal } from "../../types/gt-operations";
import { formatLabel } from "../../lib/formatters";
import { Briefcase, Calendar, User, Target } from "lucide-react";

interface CrmDealCardProps {
  deals: CrmLeadDeal[];
}

export const CrmDealCard: React.FC<CrmDealCardProps> = ({ deals }) => {
  const totalPipeline = deals.reduce((acc, d) => acc + d.dealValue, 0);

  const getStageBadge = (stage: CrmLeadDeal["stage"]) => {
    switch (stage) {
      case "Won":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Awaiting Contract":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "Negotiation":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Proposal Sent":
        return "bg-sky-50 text-sky-700 border-sky-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:border-slate-300">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 p-3.5 sm:p-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700 border border-purple-200/80">
            <Briefcase className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider truncate">GoldTouch CRM — Sales Pipeline</div>
            <div className="text-sm font-bold text-slate-900 tracking-tight truncate">Active Enterprise Opportunities</div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Pipeline</div>
          <div className="text-sm font-extrabold text-emerald-600 font-mono">£{totalPipeline.toLocaleString()} GBP</div>
        </div>
      </div>

      <div className="p-3.5 sm:p-4 space-y-3">
        {deals.map((deal) => (
          <div
            key={deal.id}
            className="rounded-xl bg-slate-50/60 p-3.5 border border-slate-200/80 hover:border-purple-200 transition-all text-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
              <div className="min-w-0 flex-1">
                <span className="font-bold text-sm text-slate-900 truncate block">{deal.companyName}</span>
                <div className="text-[11px] text-slate-500 truncate">{deal.contactPerson}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-base font-extrabold text-emerald-600 font-mono">
                  £{deal.dealValue.toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">{deal.currency}</span>
                </div>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getStageBadge(deal.stage)}`}>
                  {formatLabel(deal.stage)}
                </span>
              </div>
            </div>

            <div className="mt-2.5 text-[11px] text-slate-700 bg-white rounded-lg p-2.5 border border-slate-200/70">
              <span className="text-purple-700 font-semibold">Scope:</span> {deal.interestArea}
            </div>

            {/* Probability Progress Bar */}
            <div className="mt-2.5 flex items-center justify-between gap-2 text-[10px] text-slate-500">
              <div className="flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-purple-600" />
                <span>Win Prob: <strong className="text-slate-800 font-bold">{deal.probability}%</strong></span>
              </div>
              <div className="flex-1 max-w-[120px] h-2 bg-slate-200/80 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-emerald-500 rounded-full"
                  style={{ width: `${deal.probability}%` }}
                />
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Close: {deal.projectedClose}</span>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1"><User className="w-3 h-3 text-slate-400" /> Rep: {deal.salesRep}</span>
              <span className="font-mono text-slate-600">{deal.phone}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

