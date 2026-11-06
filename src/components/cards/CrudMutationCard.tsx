"use client";

import React, { useState } from "react";
import {
  CrudEntityTable,
  CrudMutationData,
  SaraCrudPermissions,
  isCrudTableAllowed,
  getCrudModuleForTable,
} from "../../types/gt-operations";
import {
  RotateCcw,
  RotateCw,
  Trash2,
  Check,
  X,
  Pencil,
  Database,
  AlertTriangle,
  Plus,
  ArrowRight,
  ExternalLink,
  Lock,
} from "lucide-react";

interface CrudMutationCardProps {
  mutation: CrudMutationData;
  onQuickQuery?: (query: string) => void;
  onMutationUpdated?: (updated: CrudMutationData) => void;
  enableLiveCrud?: boolean;
  crudPermissions?: SaraCrudPermissions;
}

export const CrudMutationCard: React.FC<CrudMutationCardProps> = ({
  mutation: initialMutation,
  onQuickQuery,
  onMutationUpdated,
  enableLiveCrud = true,
  crudPermissions,
}) => {
  const [mutation, setMutation] = useState<CrudMutationData>(initialMutation);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isEditingInline, setIsEditingInline] = useState(false);

  // State for interactive registration form (`draft_form`)
  const [draftTable, setDraftTable] = useState<CrudEntityTable>(
    initialMutation.table || "rooftops"
  );
  const activeTable =
    mutation.status === "draft_form" ? draftTable : mutation.table;
  const isWriteAllowed = isCrudTableAllowed(
    activeTable,
    enableLiveCrud,
    crudPermissions
  );
  const activeModule = getCrudModuleForTable(activeTable);
  const [draftFields, setDraftFields] = useState<Record<string, string>>({
    name: "",
    code: "",
    group_name: "",
    delivery_route: "John's Route",
    city: "Columbus",
    state: "OH",
    phone: "614-555-0199",
    billing_email: "",
    email: "",
    role: "Customer Buyer",
    invitee_type: "Customer",
    access_system: "Customer Portal",
    term_value: "30",
    description: "Net 30 days from invoice date",
    payment_terms: "Net 30",
    credit_limit: "25000",
    price: "34.95",
    cost: "16.50",
    total: "485.00",
    status: "active",
  });

  // State for inline editing of an existing record
  const [editFields, setEditFields] = useState<Record<string, string>>({});

  const updateLocalMutation = (next: CrudMutationData) => {
    setMutation(next);
    if (onMutationUpdated) {
      onMutationUpdated(next);
    }
  };

  const startInlineEdit = () => {
    const src = mutation.afterData || mutation.beforeData || {};
    if (mutation.table === "rooftops") {
      setEditFields({
        name: String(src.name || ""),
        code: String(src.code || ""),
        delivery_route: String(src.delivery_route || "John's Route"),
        payment_terms: String(src.payment_terms || src.terms || "Net 30"),
        city: String(src.city || ""),
        state: String(src.state || ""),
        phone: String(src.phone || ""),
        billing_email: String(src.billing_email || ""),
        credit_limit: String(src.credit_limit ?? 25000),
        status: String(src.status || "active"),
      });
    } else if (mutation.table === "people") {
      setEditFields({
        name: String(src.name || ""),
        email: String(src.email || ""),
        phone: String(src.phone || ""),
        status: String(src.status || "active"),
        terms: String(src.terms || "Net 30"),
        delivery_route: String(src.delivery_route || "John's Route"),
        city: String(src.city || ""),
        state: String(src.state || ""),
      });
    } else if (mutation.table === "user_invites") {
      setEditFields({
        email: String(src.email || ""),
        role: String(src.role || "Customer Buyer"),
        invitee_type: String(src.invitee_type || "Customer"),
        access_system: String(src.access_system || "Customer Portal"),
        invited_by: String(src.invited_by || "SARA AI Operations"),
      });
    } else if (mutation.table === "payment_terms") {
      setEditFields({
        code: String(src.code || ""),
        term_value: String(src.term_value ?? 30),
        description: String(src.description || ""),
      });
    } else if (mutation.table === "orders") {
      setEditFields({
        status: String(src.status || "processing"),
        ship_via: String(src.ship_via || "John's Route"),
        payment_terms: String(src.payment_terms || "Net 30"),
        sales_rep_name: String(src.sales_rep_name || ""),
        total: String(src.total ?? 0),
      });
    } else if (mutation.table === "invoices") {
      setEditFields({
        status: String(src.status || "open"),
        open_balance: String(src.open_balance ?? src.balance ?? 0),
        total: String(src.total ?? 0),
        due_date: String(src.due_date || ""),
      });
    } else if (mutation.table === "catalog_products") {
      setEditFields({
        name: String(src.name || ""),
        custom_sku: String(src.custom_sku || ""),
        price: String(src.price ?? 0),
        cost: String(src.cost ?? 0),
        inventory_qty: String(src.inventory_qty ?? 100),
      });
    } else {
      const skipKeys = new Set([
        "id",
        "created_at",
        "updated_at",
        "email_ci",
        "group_id",
        "rooftop_id",
        "order_id",
        "customer_id",
        "supplier_id",
      ]);
      const dynamicFields: Record<string, string> = {};
      for (const [k, v] of Object.entries(src)) {
        if (skipKeys.has(k)) continue;
        if (
          typeof v === "string" ||
          typeof v === "number" ||
          typeof v === "boolean"
        ) {
          dynamicFields[k] = String(v);
        }
        if (Object.keys(dynamicFields).length >= 8) break;
      }
      setEditFields(
        Object.keys(dynamicFields).length > 0
          ? dynamicFields
          : {
              name: String(src.name || ""),
              status: String(src.status || "active"),
            }
      );
    }
    setIsEditingInline(true);
    setErrorMsg(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/crud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          table: draftTable,
          fields: draftFields,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to create record");
      } else {
        updateLocalMutation(data.mutation);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Network error");
    } finally {
      setIsBusy(false);
    }
  };

  const handleInlineUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/crud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          table: mutation.table,
          identifier: mutation.recordId,
          updates: editFields,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to update record");
      } else {
        setIsEditingInline(false);
        updateLocalMutation(data.mutation);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Network error");
    } finally {
      setIsBusy(false);
    }
  };

  const handleRequestDeleteGate = async () => {
    setIsBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/crud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "prepare_delete",
          table: mutation.table,
          identifier: mutation.recordId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to prepare deletion");
      } else {
        setIsEditingInline(false);
        updateLocalMutation(data.mutation);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Network error");
    } finally {
      setIsBusy(false);
    }
  };

  const handleConfirmDelete = async () => {
    setIsBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/crud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm_delete",
          mutation,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to delete record");
      } else {
        updateLocalMutation(data.mutation);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Network error");
    } finally {
      setIsBusy(false);
    }
  };

  const handleCancelDelete = () => {
    updateLocalMutation({
      ...mutation,
      status: "cancelled",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    });
  };

  const handleUndo = async () => {
    setIsBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/crud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "undo",
          mutation,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to undo change");
      } else {
        setIsEditingInline(false);
        updateLocalMutation(data.mutation);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Network error");
    } finally {
      setIsBusy(false);
    }
  };

  const handleRedo = async () => {
    setIsBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/crud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "redo",
          mutation,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to redo change");
      } else {
        updateLocalMutation(data.mutation);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Network error");
    } finally {
      setIsBusy(false);
    }
  };

  const renderOperationBadge = () => {
    let text = "Deleted";
    if (mutation.status === "draft_form") text = "Live Registration";
    else if (mutation.status === "pending_confirmation")
      text = "Confirm Deletion";
    else if (mutation.status === "undone") text = "Reverted";
    else if (mutation.status === "cancelled") text = "Deletion Cancelled";
    else if (mutation.operation === "create") text = "Created";
    else if (mutation.operation === "update") text = "Updated";

    return (
      <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-zinc-500 dark:text-zinc-400">
        {text}
      </span>
    );
  };

  return (
    <div className="mt-3 overflow-hidden rounded-2xl bg-white dark:bg-[#14151a] border border-zinc-200/80 dark:border-white/[0.08] shadow-[0_8px_28px_-6px_rgba(15,23,42,0.08)] dark:shadow-[0_14px_34px_-8px_rgba(0,0,0,0.55)] transition-all">
      {/* Top Antigravity-Style Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-zinc-100 dark:border-white/[0.06] bg-zinc-50/70 dark:bg-white/[0.02]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-white/[0.05] text-zinc-600 dark:text-zinc-300 ring-1 ring-inset ring-zinc-200/80 dark:ring-white/[0.08]">
            <Database className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {renderOperationBadge()}
              <span className="h-3 w-px bg-zinc-200 dark:bg-white/[0.12]" aria-hidden="true" />
              <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-400">
                {mutation.table}
              </span>
              {mutation.recordCode && mutation.status !== "draft_form" && (
                <>
                  <span className="h-3 w-px bg-zinc-200 dark:bg-white/[0.12]" aria-hidden="true" />
                  <span className="font-mono text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
                    {mutation.recordCode}
                  </span>
                </>
              )}
            </div>
            <h4 className="font-semibold text-zinc-900 dark:text-[#f4f4f5] text-sm sm:text-[15px] tracking-[-0.01em] truncate mt-0.5">
              {mutation.recordTitle}
            </h4>
          </div>
        </div>

        {/* Right-Hand Antigravity Action Controls (Undo / Redo / Edit / Delete) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {!isWriteAllowed ? (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 dark:text-zinc-500"
              title={`Write operations for ${activeModule.label} are disabled in Settings → Permissions`}
            >
              <Lock className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
              <span>Read-only ({activeModule.label})</span>
            </span>
          ) : (
            <>
              {mutation.status === "completed" && (
                <>
                  {mutation.operation !== "delete" && (
                    <>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          isEditingInline
                            ? setIsEditingInline(false)
                            : startInlineEdit()
                        }
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium bg-zinc-100 dark:bg-white/[0.05] hover:bg-zinc-200/70 dark:hover:bg-white/[0.1] text-zinc-700 dark:text-zinc-200 ring-1 ring-inset ring-zinc-300/70 dark:ring-white/[0.09] transition-colors cursor-pointer disabled:opacity-50"
                        title="Edit record fields inline in real time"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>{isEditingInline ? "Cancel Edit" : "Edit"}</span>
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={handleRequestDeleteGate}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium bg-rose-500/[0.08] hover:bg-rose-500/[0.15] text-rose-600 dark:text-rose-300 ring-1 ring-inset ring-rose-500/20 transition-colors cursor-pointer disabled:opacity-50"
                        title="Delete record (asks confirmation first)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </>
                  )}

                  {/* Antigravity 1-Click Undo Button */}
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={handleUndo}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold bg-purple-500/[0.12] hover:bg-purple-500/[0.2] text-purple-700 dark:text-purple-200 ring-1 ring-inset ring-purple-500/30 transition-all cursor-pointer disabled:opacity-50"
                    title="Undo this database change and restore previous state"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>
                      {isBusy
                        ? "Reverting..."
                        : mutation.operation === "delete"
                        ? "Undo Delete"
                        : "Undo Change"}
                    </span>
                  </button>
                </>
              )}

              {mutation.status === "undone" && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleRedo}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200/70 dark:hover:bg-white/[0.12] text-zinc-800 dark:text-zinc-200 ring-1 ring-inset ring-zinc-300/80 dark:ring-white/[0.12] transition-all cursor-pointer disabled:opacity-50"
                  title="Re-apply this database change"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>{isBusy ? "Applying..." : "Redo Change"}</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="px-5 py-2.5 bg-rose-500/10 border-b border-rose-500/20 text-xs text-rose-600 dark:text-rose-300 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-400 hover:text-rose-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* MODE 1: INTERACTIVE REGISTRATION FORM (`draft_form`) */}
      {mutation.status === "draft_form" && (
        <form onSubmit={handleCreateSubmit} className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-zinc-100 dark:border-white/[0.06]">
            {(
              [
                { id: "rooftops", label: "Accounts" },
                { id: "people", label: "Individuals" },
                { id: "user_invites", label: "Portal Invites" },
                { id: "payment_terms", label: "Terms" },
                { id: "orders", label: "Orders" },
                { id: "invoices", label: "Invoices" },
                { id: "catalog_products", label: "Products" },
                { id: "suppliers", label: "Suppliers" },
              ] as { id: CrudEntityTable; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDraftTable(tab.id)}
                className={`px-2.5 py-1 rounded-[6px] text-xs font-medium transition-colors cursor-pointer ${
                  draftTable === tab.id
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                    : "bg-zinc-100 dark:bg-white/[0.05] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {draftTable === "rooftops" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Dealership / Rooftop Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Motors LLC"
                  value={draftFields.name}
                  onChange={(e) =>
                    setDraftFields({ ...draftFields, name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-white/25"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Rooftop Code (Auto if blank)
                </label>
                <input
                  type="text"
                  placeholder="e.g. APEX-01"
                  value={draftFields.code}
                  onChange={(e) =>
                    setDraftFields({ ...draftFields, code: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:border-zinc-400 dark:focus:border-white/25"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Parent Dealer Group
                </label>
                <input
                  type="text"
                  placeholder="e.g. Buckeye Auto Group"
                  value={draftFields.group_name}
                  onChange={(e) =>
                    setDraftFields({
                      ...draftFields,
                      group_name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-white/25"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Delivery Route
                </label>
                <select
                  value={draftFields.delivery_route}
                  onChange={(e) =>
                    setDraftFields({
                      ...draftFields,
                      delivery_route: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-[#1b1c22] border border-zinc-200 dark:border-white/[0.09] text-zinc-900 dark:text-zinc-100 focus:outline-none"
                >
                  <option value="John's Route">John&apos;s Route</option>
                  <option value="Nick's Route">Nick&apos;s Route</option>
                  <option value="Drop Ship">Drop Ship</option>
                  <option value="Pick Up">Pick Up</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={draftFields.city}
                  onChange={(e) =>
                    setDraftFields({ ...draftFields, city: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={draftFields.state}
                  onChange={(e) =>
                    setDraftFields({ ...draftFields, state: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={draftFields.phone}
                  onChange={(e) =>
                    setDraftFields({ ...draftFields, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Billing Email
                </label>
                <input
                  type="email"
                  placeholder="ap@dealership.com"
                  value={draftFields.billing_email}
                  onChange={(e) =>
                    setDraftFields({
                      ...draftFields,
                      billing_email: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Payment Terms
                </label>
                <select
                  value={draftFields.payment_terms}
                  onChange={(e) =>
                    setDraftFields({
                      ...draftFields,
                      payment_terms: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-[#1b1c22] border border-zinc-200 dark:border-white/[0.09] text-zinc-900 dark:text-zinc-100 focus:outline-none"
                >
                  <option value="Net 30">Net 30</option>
                  <option value="Net 14">Net 14</option>
                  <option value="Due on Receipt">Due on Receipt</option>
                  <option value="COD">COD</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Credit Limit ($)
                </label>
                <input
                  type="number"
                  value={draftFields.credit_limit}
                  onChange={(e) =>
                    setDraftFields({
                      ...draftFields,
                      credit_limit: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none"
                />
              </div>
            </div>
          )}

          {draftTable === "people" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Individual Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Marcus Vance"
                  value={draftFields.name}
                  onChange={(e) =>
                    setDraftFields({ ...draftFields, name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. marcus.vance@dealership.com"
                  value={draftFields.email}
                  onChange={(e) =>
                    setDraftFields({ ...draftFields, email: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={draftFields.phone}
                  onChange={(e) =>
                    setDraftFields({ ...draftFields, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Delivery Route
                </label>
                <select
                  value={draftFields.delivery_route}
                  onChange={(e) =>
                    setDraftFields({
                      ...draftFields,
                      delivery_route: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-[#1b1c22] border border-zinc-200 dark:border-white/[0.09] text-zinc-900 dark:text-zinc-100 focus:outline-none"
                >
                  <option value="John's Route">John&apos;s Route</option>
                  <option value="Nick's Route">Nick&apos;s Route</option>
                  <option value="Drop Ship">Drop Ship</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={draftFields.city}
                  onChange={(e) =>
                    setDraftFields({ ...draftFields, city: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Payment Terms
                </label>
                <select
                  value={draftFields.payment_terms}
                  onChange={(e) =>
                    setDraftFields({
                      ...draftFields,
                      payment_terms: e.target.value,
                      terms: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-[#1b1c22] border border-zinc-200 dark:border-white/[0.09] text-zinc-900 dark:text-zinc-100 focus:outline-none"
                >
                  <option value="Net 30">Net 30</option>
                  <option value="Net 14">Net 14</option>
                  <option value="Due on Receipt">Due on Receipt</option>
                </select>
              </div>
            </div>
          )}

          {draftTable === "user_invites" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Invitee Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. buyer@dealership.com"
                  value={draftFields.email}
                  onChange={(e) =>
                    setDraftFields({ ...draftFields, email: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Portal Role
                </label>
                <select
                  value={draftFields.role}
                  onChange={(e) =>
                    setDraftFields({ ...draftFields, role: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-[#1b1c22] border border-zinc-200 dark:border-white/[0.09] text-zinc-900 dark:text-zinc-100 focus:outline-none"
                >
                  <option value="Customer Buyer">Customer Buyer</option>
                  <option value="Dealership Admin">Dealership Admin</option>
                  <option value="Accounts Payable">Accounts Payable</option>
                  <option value="Sales Manager">Sales Manager</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Invitee Type
                </label>
                <select
                  value={draftFields.invitee_type}
                  onChange={(e) =>
                    setDraftFields({
                      ...draftFields,
                      invitee_type: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-[#1b1c22] border border-zinc-200 dark:border-white/[0.09] text-zinc-900 dark:text-zinc-100 focus:outline-none"
                >
                  <option value="Customer">Customer</option>
                  <option value="Dealer Group">Dealer Group</option>
                  <option value="Internal Staff">Internal Staff</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Access System
                </label>
                <select
                  value={draftFields.access_system}
                  onChange={(e) =>
                    setDraftFields({
                      ...draftFields,
                      access_system: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-[#1b1c22] border border-zinc-200 dark:border-white/[0.09] text-zinc-900 dark:text-zinc-100 focus:outline-none"
                >
                  <option value="Customer Portal">Customer Portal</option>
                  <option value="ERP Admin">ERP Admin</option>
                </select>
              </div>
            </div>
          )}

          {draftTable === "payment_terms" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Terms Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Net 45"
                  value={draftFields.code}
                  onChange={(e) =>
                    setDraftFields({
                      ...draftFields,
                      code: e.target.value,
                      name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Net Days *
                </label>
                <input
                  type="number"
                  required
                  placeholder="45"
                  value={draftFields.term_value}
                  onChange={(e) =>
                    setDraftFields({
                      ...draftFields,
                      term_value: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Net 45 days from invoice date"
                  value={draftFields.description}
                  onChange={(e) =>
                    setDraftFields({
                      ...draftFields,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>
            </div>
          )}

          {draftTable !== "rooftops" &&
            draftTable !== "people" &&
            draftTable !== "user_invites" &&
            draftTable !== "payment_terms" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                    {draftTable === "catalog_products"
                      ? "Product Name *"
                      : draftTable === "suppliers"
                      ? "Supplier Name *"
                      : "Dealership Customer Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      draftTable === "catalog_products"
                        ? "e.g. Deluxe Key Tag Rack"
                        : "e.g. Roy's RV Supercenter"
                    }
                    value={draftFields.name}
                    onChange={(e) =>
                      setDraftFields({
                        ...draftFields,
                        name: e.target.value,
                        customer_name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                </div>
                {draftTable === "catalog_products" ? (
                  <>
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                        SKU Code
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. KTR-500"
                        value={draftFields.code}
                        onChange={(e) =>
                          setDraftFields({
                            ...draftFields,
                            code: e.target.value,
                            custom_sku: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                        Unit Price ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={draftFields.price}
                        onChange={(e) =>
                          setDraftFields({
                            ...draftFields,
                            price: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                        Unit Cost ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={draftFields.cost}
                        onChange={(e) =>
                          setDraftFields({
                            ...draftFields,
                            cost: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                      Total Amount ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={draftFields.total}
                      onChange={(e) =>
                        setDraftFields({
                          ...draftFields,
                          total: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.09] text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}

          <div className="flex items-center justify-end gap-2 pt-2">
            {!isWriteAllowed ? (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Write access for {activeModule.label} is disabled in Settings → Permissions (Read-only mode).
              </span>
            ) : (
              <button
                type="submit"
                disabled={isBusy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>
                  {isBusy ? "Creating in Supabase..." : "Create Live Record"}
                </span>
              </button>
            )}
          </div>
        </form>
      )}

      {/* MODE 2: MANDATORY DELETION CONFIRMATION GATE (`pending_confirmation`) */}
      {mutation.status === "pending_confirmation" && (
        <div className="p-4 sm:p-5 space-y-4 bg-rose-500/[0.03] dark:bg-rose-500/[0.04]">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 ring-1 ring-inset ring-rose-500/30">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="space-y-1 text-xs">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-[13px]">
                Confirm Permanent Deletion of {mutation.recordTitle}
              </p>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                You are about to remove this {mutation.entityLabel} record from
                the live Supabase database. Even after confirming deletion, a
                full recovery snapshot is kept so you can undo and restore it
                with 1 click.
              </p>
            </div>
          </div>

          {mutation.changes.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-white/80 dark:bg-black/25 border border-zinc-200/70 dark:border-white/[0.06] text-xs">
              {mutation.changes.slice(0, 6).map((c) => (
                <div key={c.field} className="min-w-0">
                  <span className="block text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    {c.label}
                  </span>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate block mt-0.5">
                    {String(c.before ?? "N/A")}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              disabled={isBusy}
              onClick={handleCancelDelete}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200/80 dark:hover:bg-white/[0.1] text-zinc-700 dark:text-zinc-200 ring-1 ring-inset ring-zinc-300/80 dark:ring-white/[0.1] transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
            {isWriteAllowed && (
              <button
                type="button"
                disabled={isBusy}
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {isBusy ? "Deleting Record..." : "Confirm Delete"}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* INLINE EDIT DRAWER (When user clicks "Edit" on a live record) */}
      {isEditingInline && isWriteAllowed && mutation.status === "completed" && (
        <form
          onSubmit={handleInlineUpdateSubmit}
          className="p-4 sm:p-5 bg-zinc-50/80 dark:bg-white/[0.02] border-b border-zinc-100 dark:border-white/[0.06] space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Live Field Editor — {mutation.recordTitle}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {Object.entries(editFields).map(([fieldKey, val]) => (
              <div key={fieldKey}>
                <label className="block text-[10.5px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1">
                  {fieldKey.replace(/_/g, " ")}
                </label>
                <input
                  type="text"
                  value={val}
                  onChange={(e) =>
                    setEditFields({ ...editFields, [fieldKey]: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#101014] border border-zinc-200 dark:border-white/[0.1] text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:border-zinc-400 dark:focus:border-white/25"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsEditingInline(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isBusy}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isBusy ? "Saving..." : "Save Live Changes"}</span>
            </button>
          </div>
        </form>
      )}

      {/* MODE 3: COMPLETED / UNDONE / CANCELLED DIFF & SNAPSHOT VIEW */}
      {mutation.status !== "draft_form" &&
        mutation.status !== "pending_confirmation" && (
          <div className="p-4 sm:p-5 space-y-3">
            {mutation.operation === "update" && mutation.changes.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-white/[0.07]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-white/[0.06] bg-zinc-50/80 dark:bg-white/[0.02] text-[10.5px] uppercase font-semibold tracking-wider text-zinc-400 dark:text-zinc-500">
                      <th className="py-2 px-3">Field</th>
                      <th className="py-2 px-3">Previous Value</th>
                      <th className="py-2 px-3">
                        {mutation.status === "undone"
                          ? "Restored Value"
                          : "Updated Live Value"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
                    {mutation.changes.map((c) => (
                      <tr key={c.field}>
                        <td className="py-2 px-3 font-medium text-zinc-700 dark:text-zinc-300">
                          {c.label}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`font-mono text-xs ${
                              mutation.status === "undone"
                                ? "text-zinc-900 dark:text-zinc-100 font-semibold"
                                : "text-zinc-400 dark:text-zinc-500 line-through"
                            }`}
                          >
                            {String(c.before ?? "None")}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`font-mono text-xs ${
                              mutation.status === "undone"
                                ? "text-zinc-400 dark:text-zinc-500 line-through"
                                : "text-zinc-900 dark:text-zinc-100 font-semibold"
                            }`}
                          >
                            {mutation.status === "undone"
                              ? String(c.before ?? "None")
                              : String(c.after ?? "None")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3.5 rounded-xl bg-zinc-50/70 dark:bg-white/[0.02] border border-zinc-200/70 dark:border-white/[0.06] text-xs">
                {mutation.changes.slice(0, 9).map((c) => {
                  const val =
                    mutation.operation === "delete" ? c.before : c.after;
                  return (
                    <div key={c.field} className="min-w-0">
                      <span className="block text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        {c.label}
                      </span>
                      <span
                        className={`font-medium truncate block mt-0.5 ${
                          mutation.status === "undone" &&
                          mutation.operation === "create"
                            ? "line-through text-zinc-400"
                            : "text-zinc-900 dark:text-zinc-100"
                        }`}
                      >
                        {String(val ?? "N/A")}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      {/* Footer Audit & Quick Inspection Bar */}
      <div className="px-4 sm:px-5 py-2.5 border-t border-zinc-100 dark:border-white/[0.06] bg-zinc-50/50 dark:bg-white/[0.015] flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400 dark:text-zinc-500">
        <div className="flex items-center gap-2">
          <span>
            Live Supabase Transaction ({mutation.timestamp})
          </span>
          {mutation.status === "completed" && (
            <span className="text-zinc-500 dark:text-zinc-400">
              — Reversible via 1-Click Undo or typing &ldquo;undo&rdquo;
            </span>
          )}
        </div>

        {onQuickQuery &&
          mutation.status !== "draft_form" &&
          !(mutation.status === "completed" && mutation.operation === "delete") &&
          !(mutation.status === "undone" && mutation.operation === "create") && (
            <button
              type="button"
              onClick={() => {
                if (mutation.table === "people") {
                  onQuickQuery("Show me customer individuals");
                } else if (mutation.table === "user_invites") {
                  onQuickQuery("Show me portal invites");
                } else if (mutation.table === "payment_terms") {
                  onQuickQuery("Show me payment terms");
                } else {
                  onQuickQuery(`Show me ${mutation.recordTitle}`);
                }
              }}
              className="inline-flex items-center gap-1 font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <span>Inspect Live Record</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
      </div>
    </div>
  );
};
