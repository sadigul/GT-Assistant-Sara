"use client";

import React, { useState } from "react";
import {
  MOCK_INVOICES,
  MOCK_PURCHASE_ORDERS,
  MOCK_LANCASHIRE_SITE,
  MOCK_CRM_DEALS,
  MOCK_INVENTORY
} from "../../data/mock-gt-operations";
import { X, Database, FileText, Package, Factory, Briefcase, Layers, Search } from "lucide-react";
import { Department } from "../../types/gt-operations";

interface DataExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: Department;
}

export const DataExplorerModal: React.FC<DataExplorerModalProps> = ({
  isOpen,
  onClose,
  initialTab = "invoices"
}) => {
  const [activeTab, setActiveTab] = useState<Department>(initialTab === "all" ? "invoices" : initialTab);
  const [searchTerm, setSearchTerm] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[85vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-700 text-slate-100 overflow-hidden">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">GoldTouch Central ERP Explorer</div>
              <div className="text-sm font-bold text-white">Live Operations Data Engine</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector & Search bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-slate-800 bg-slate-900/60">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveTab("invoices")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "invoices"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" /> Invoices ({MOCK_INVOICES.length})
            </button>

            <button
              onClick={() => setActiveTab("purchasing")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "purchasing"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Package className="w-3.5 h-3.5 text-sky-400" /> Purchasing ({MOCK_PURCHASE_ORDERS.length})
            </button>

            <button
              onClick={() => setActiveTab("lancashire_site")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "lancashire_site"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Factory className="w-3.5 h-3.5 text-emerald-400" /> Lancashire Site (4 Lines)
            </button>

            <button
              onClick={() => setActiveTab("crm")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "crm"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 text-purple-400" /> CRM Deals ({MOCK_CRM_DEALS.length})
            </button>

            <button
              onClick={() => setActiveTab("inventory")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "inventory"
                  ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-teal-400" /> Stock Vault ({MOCK_INVENTORY.length})
            </button>
          </div>

          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 text-xs">
          {/* Invoices Tab */}
          {activeTab === "invoices" && (
            <div className="space-y-3">
              <table className="w-full text-left">
                <thead className="border-b border-slate-800 text-[10px] uppercase text-slate-400">
                  <tr>
                    <th className="py-2.5 px-2">Invoice #</th>
                    <th className="py-2.5 px-2">Client</th>
                    <th className="py-2.5 px-2">Issue / Due</th>
                    <th className="py-2.5 px-2 text-right">Amount</th>
                    <th className="py-2.5 px-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {MOCK_INVOICES.filter(
                    (i) =>
                      i.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      i.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
                  ).map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-2 font-mono font-semibold text-amber-400">{inv.invoiceNumber}</td>
                      <td className="py-3 px-2">
                        <div className="font-semibold text-slate-200">{inv.clientName}</div>
                        <div className="text-[10px] text-slate-500">{inv.clientEmail}</div>
                      </td>
                      <td className="py-3 px-2 text-slate-400">
                        <div>Issued: {inv.issueDate}</div>
                        <div className="text-slate-300 font-medium">Due: {inv.dueDate}</div>
                      </td>
                      <td className="py-3 px-2 text-right font-mono font-extrabold text-emerald-400">
                        £{inv.amount.toLocaleString()} GBP
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            inv.status === "paid"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : inv.status === "overdue"
                              ? "bg-rose-500/20 text-rose-400 animate-pulse"
                              : "bg-amber-500/20 text-amber-400"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Purchasing Tab */}
          {activeTab === "purchasing" && (
            <div className="space-y-3">
              <table className="w-full text-left">
                <thead className="border-b border-slate-800 text-[10px] uppercase text-slate-400">
                  <tr>
                    <th className="py-2.5 px-2">PO #</th>
                    <th className="py-2.5 px-2">Supplier & Category</th>
                    <th className="py-2.5 px-2">Destination</th>
                    <th className="py-2.5 px-2 text-right">Value</th>
                    <th className="py-2.5 px-2 text-right">Stage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {MOCK_PURCHASE_ORDERS.filter(
                    (p) =>
                      p.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      p.poNumber.toLowerCase().includes(searchTerm.toLowerCase())
                  ).map((po) => (
                    <tr key={po.poNumber} className="hover:bg-slate-800/40">
                      <td className="py-3 px-2 font-mono font-semibold text-sky-400">{po.poNumber}</td>
                      <td className="py-3 px-2">
                        <div className="font-semibold text-slate-200">{po.supplier}</div>
                        <div className="text-[10px] text-slate-400">{po.category} • ETA: {po.expectedDelivery}</div>
                      </td>
                      <td className="py-3 px-2 text-slate-300 text-[11px]">{po.destinationSite}</td>
                      <td className="py-3 px-2 text-right font-mono font-extrabold text-emerald-400">
                        £{po.totalAmount.toLocaleString()} GBP
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-sky-500/20 text-sky-300">
                          {po.status.replace(/_/g, " ")} ({po.progressPercent}%)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Lancashire Site Tab */}
          {activeTab === "lancashire_site" && (
            <div className="space-y-4">
              <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-white text-sm">{MOCK_LANCASHIRE_SITE.siteName}</h4>
                  <p className="text-slate-400 text-xs mt-0.5">{MOCK_LANCASHIRE_SITE.location}</p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 font-semibold text-xs">
                    {MOCK_LANCASHIRE_SITE.operationalStatus}
                  </span>
                  <div className="text-[10px] text-slate-400 mt-1">Lead: {MOCK_LANCASHIRE_SITE.shiftManager}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {MOCK_LANCASHIRE_SITE.activeLines.map((line: any) => (
                  <div key={line.id} className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-200">{line.name}</span>
                      <span className="font-mono text-emerald-400 font-bold">{line.efficiency}%</span>
                    </div>
                    <div className="text-[11px] text-amber-400 font-mono mt-1">Batch: {line.currentBatch}</div>
                    <div className="text-[10px] text-slate-400 mt-1">Operator: {line.operator}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CRM Tab */}
          {activeTab === "crm" && (
            <div className="space-y-3">
              <table className="w-full text-left">
                <thead className="border-b border-slate-800 text-[10px] uppercase text-slate-400">
                  <tr>
                    <th className="py-2.5 px-2">Account</th>
                    <th className="py-2.5 px-2">Project Scope</th>
                    <th className="py-2.5 px-2 text-right">Value</th>
                    <th className="py-2.5 px-2 text-right">Stage & Win Prob</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {MOCK_CRM_DEALS.filter(
                    (d) =>
                      d.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      d.salesRep.toLowerCase().includes(searchTerm.toLowerCase())
                  ).map((deal) => (
                    <tr key={deal.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-2">
                        <div className="font-semibold text-slate-200">{deal.companyName}</div>
                        <div className="text-[10px] text-slate-400">{deal.contactPerson} ({deal.salesRep})</div>
                      </td>
                      <td className="py-3 px-2 text-slate-300 text-[11px] max-w-xs truncate">{deal.interestArea}</td>
                      <td className="py-3 px-2 text-right font-mono font-extrabold text-emerald-400">
                        £{deal.dealValue.toLocaleString()} GBP
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300">
                          {deal.stage} ({deal.probability}%)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Inventory Tab */}
          {activeTab === "inventory" && (
            <div className="space-y-3">
              <table className="w-full text-left">
                <thead className="border-b border-slate-800 text-[10px] uppercase text-slate-400">
                  <tr>
                    <th className="py-2.5 px-2">SKU & Material</th>
                    <th className="py-2.5 px-2">Storage Location</th>
                    <th className="py-2.5 px-2 text-right">Current Stock</th>
                    <th className="py-2.5 px-2 text-right">Unit Value</th>
                    <th className="py-2.5 px-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {MOCK_INVENTORY.filter(
                    (i) =>
                      i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      i.sku.toLowerCase().includes(searchTerm.toLowerCase())
                  ).map((item) => (
                    <tr key={item.sku} className="hover:bg-slate-800/40">
                      <td className="py-3 px-2">
                        <div className="font-semibold text-slate-200">{item.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{item.sku}</div>
                      </td>
                      <td className="py-3 px-2 text-slate-300 text-[11px]">{item.location}</td>
                      <td className="py-3 px-2 text-right font-mono font-bold text-slate-100">
                        {item.currentStock} {item.unit}
                      </td>
                      <td className="py-3 px-2 text-right font-mono font-extrabold text-emerald-400">
                        £{item.unitValue}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            item.status === "In Stock"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : item.status === "Low Stock"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-rose-500/20 text-rose-400 animate-pulse"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/60 text-xs text-slate-400">
          <span>Synced with GoldTouch On-Prem ERP & Cloud CRM</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Close Explorer
          </button>
        </div>
      </div>
    </div>
  );
};
