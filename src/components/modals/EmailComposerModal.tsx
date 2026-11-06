"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Send,
  SlidersHorizontal,
  User,
  Users,
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { EmailDraftData, EmailContactOption, AuthUser } from "@/types/gt-operations";

interface EmailComposerModalProps {
  isOpen: boolean;
  initialDraft: EmailDraftData | null;
  currentUser?: AuthUser | null;
  onClose: () => void;
  onDraftUpdated?: (updated: EmailDraftData) => void;
}

export default function EmailComposerModal({
  isOpen,
  initialDraft,
  currentUser,
  onClose,
  onDraftUpdated,
}: EmailComposerModalProps) {
  const [toEmail, setToEmail] = useState("");
  const [toName, setToName] = useState("");
  const [ccEmail, setCcEmail] = useState("");
  const [bccEmail, setBccEmail] = useState("");
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [roughContext, setRoughContext] = useState("");
  const [activeTone, setActiveTone] = useState<string>("Polish");

  const [contacts, setContacts] = useState<EmailContactOption[]>([]);
  const [showContactDropdown, setShowContactDropdown] = useState(false);

  const [refining, setRefining] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync modal state when initialDraft changes or modal opens
  useEffect(() => {
    if (isOpen && initialDraft) {
      setToEmail(initialDraft.to_email || initialDraft.to || "");
      setToName(
        initialDraft.to_name ||
          initialDraft.toName ||
          initialDraft.recipientName ||
          ""
      );
      setCcEmail(initialDraft.cc_email || initialDraft.cc || "");
      setBccEmail(initialDraft.bcc_email || initialDraft.bcc || "");
      setShowCcBcc(
        Boolean(
          initialDraft.cc_email ||
            initialDraft.cc ||
            initialDraft.bcc_email ||
            initialDraft.bcc
        )
      );
      setSubject(initialDraft.subject || "");
      setBody(initialDraft.body || "");
      setRoughContext(
        initialDraft.rough_context ||
          initialDraft.context_summary ||
          initialDraft.contextSummary ||
          ""
      );
      setSentSuccess(initialDraft.status === "sent");
      setStatusMessage(null);
      const suggested =
        initialDraft.suggested_contacts ||
        initialDraft.matchedContacts ||
        initialDraft.candidateContacts;
      if (Array.isArray(suggested) && suggested.length > 0) {
        setContacts(suggested);
      } else {
        fetchContacts("");
      }
    }
  }, [isOpen, initialDraft]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const fetchContacts = async (query: string) => {
    try {
      const res = await fetch(
        `/api/email/contacts?q=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      if (Array.isArray(data?.contacts)) {
        setContacts(data.contacts);
      }
    } catch {
      // Ignore contact autocomplete errors
    }
  };

  if (!isOpen) return null;

  const handleSelectContact = (c: EmailContactOption) => {
    setToEmail(c.email);
    setToName(c.name);
    setShowContactDropdown(false);
  };

  const handleAiRefine = async (label: string, toneInstruction: string) => {
    setActiveTone(label);
    setRefining(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/email/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_name: toName,
          to_email: toEmail,
          subject,
          current_body: body,
          rough_context: roughContext || body,
          tone: toneInstruction,
          sender_name:
            currentUser?.fullName ||
            initialDraft?.sender_name ||
            initialDraft?.senderName ||
            "GoldTouch Operations",
          context_summary:
            initialDraft?.context_summary ||
            initialDraft?.contextSummary ||
            "",
        }),
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        const nextSubject = data.subject || subject;
        const nextBody = data.body || body;
        setSubject(nextSubject);
        setBody(nextBody);
        setStatusMessage({
          type: "info",
          text: `Refined draft in ${label.toLowerCase()} tone.`,
        });
        if (onDraftUpdated) {
          onDraftUpdated({
            ...(initialDraft || {
              subject: nextSubject,
              body: nextBody,
              to_email: toEmail,
            }),
            to: toEmail,
            to_email: toEmail,
            toName,
            to_name: toName,
            cc: ccEmail,
            cc_email: ccEmail,
            bcc: bccEmail,
            bcc_email: bccEmail,
            subject: nextSubject,
            body: nextBody,
          });
        }
      } else {
        setStatusMessage({
          type: "error",
          text: data?.error || "Could not refine email draft.",
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err?.message || "Failed to connect to AI email refiner.",
      });
    } finally {
      setRefining(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toEmail.trim() || !toEmail.includes("@")) {
      setStatusMessage({
        type: "error",
        text: "Please enter or select a valid recipient email address.",
      });
      return;
    }
    if (!subject.trim()) {
      setStatusMessage({
        type: "error",
        text: "Please provide an email subject line.",
      });
      return;
    }
    if (!body.trim()) {
      setStatusMessage({
        type: "error",
        text: "Please write an email message body before sending.",
      });
      return;
    }

    setSending(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_email: toEmail.trim(),
          to_name: toName.trim() || undefined,
          cc_email: ccEmail.trim() || undefined,
          bcc_email: bccEmail.trim() || undefined,
          reply_to:
            currentUser?.email ||
            initialDraft?.sender_email ||
            initialDraft?.senderEmail ||
            undefined,
          subject: subject.trim(),
          body: body.trim(),
          sender_name:
            currentUser?.fullName ||
            initialDraft?.sender_name ||
            initialDraft?.senderName ||
            "GoldTouch Operations",
          sender_email:
            currentUser?.email ||
            initialDraft?.sender_email ||
            initialDraft?.senderEmail ||
            undefined,
          sender_user_id: currentUser?.id || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setStatusMessage({
          type: "error",
          text:
            data?.error ||
            "Failed to send email. You can also click 'Open Mail App' below.",
        });
        return;
      }

      setSentSuccess(true);
      setStatusMessage({
        type: "success",
        text: `Email dispatched to ${
          toName ? `${toName} (${toEmail.trim()})` : toEmail.trim()
        }.`,
      });
      if (onDraftUpdated) {
        onDraftUpdated({
          ...(initialDraft || { subject, body, to_email: toEmail }),
          to: toEmail.trim(),
          to_email: toEmail.trim(),
          toName: toName.trim(),
          to_name: toName.trim(),
          cc: ccEmail.trim(),
          cc_email: ccEmail.trim(),
          bcc: bccEmail.trim(),
          bcc_email: bccEmail.trim(),
          subject: subject.trim(),
          body: body.trim(),
          status: "sent",
          sent_at: data.sent_at || new Date().toISOString(),
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err?.message || "Network error while sending email.",
      });
    } finally {
      setSending(false);
    }
  };

  const handleCopyContent = () => {
    const fullText = `To: ${
      toName ? `${toName} <${toEmail}>` : toEmail
    }\nSubject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mailtoHref = `mailto:${encodeURIComponent(
    toEmail.trim()
  )}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}${
    ccEmail.trim() ? `&cc=${encodeURIComponent(ccEmail.trim())}` : ""
  }${bccEmail.trim() ? `&bcc=${encodeURIComponent(bccEmail.trim())}` : ""}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 dark:bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="sara-modal-surface relative w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh] bg-white dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 shadow-[0_24px_64px_-12px_rgba(15,23,42,0.28)] dark:shadow-[0_24px_64px_-12px_rgba(0,0,0,0.85)] ring-1 ring-slate-900/10 dark:ring-white/10 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#131c2e]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-full bg-white ring-1 ring-slate-200/90 dark:ring-slate-700 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
              <img
                src="/logo.png"
                alt=""
                className="h-full w-full object-contain rounded-full"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white truncate">
                  GoldTouch Mail
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10.5px] font-semibold uppercase tracking-wider shrink-0 ${
                    sentSuccess
                      ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-500/30"
                      : "bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-500/30"
                  }`}
                >
                  {sentSuccess ? "Sent" : "Contextual Draft"}
                </span>
              </div>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                From: Gold Touch Support &lt;support@goldtouchdealersupply.com&gt;
                {currentUser?.email ? ` · Reply-To: ${currentUser.email}` : ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSendEmail}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-3"
        >
          {statusMessage && (
            <div
              className={`px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between gap-2 ${
                statusMessage.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30"
                  : statusMessage.type === "error"
                  ? "bg-rose-50 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30"
                  : "bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30"
              }`}
            >
              <span>{statusMessage.text}</span>
              <button
                type="button"
                onClick={() => setStatusMessage(null)}
                className="text-[11px] underline opacity-75 hover:opacity-100 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Recipient (To) Field with ERP Contact Picker */}
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#151f32] border border-slate-200/90 dark:border-[#263449] focus-within:border-slate-400 dark:focus-within:border-slate-500 transition-colors">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400 w-14 shrink-0">
                To
              </span>
              {toName && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-white dark:bg-[#1e293b] text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-slate-700 shadow-2xs">
                  <User className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>{toName}</span>
                  <button
                    type="button"
                    onClick={() => setToName("")}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-white ml-0.5 cursor-pointer"
                    title="Clear recipient name"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <input
                type="email"
                value={toEmail}
                onChange={(e) => {
                  setToEmail(e.target.value);
                  fetchContacts(e.target.value);
                }}
                onFocus={() => setShowContactDropdown(true)}
                placeholder="recipient@dealership.com"
                required
                className="flex-1 min-w-[180px] bg-transparent text-[13px] font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
              />
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={() => setShowContactDropdown((prev) => !prev)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 bg-white dark:bg-[#1e293b] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/90 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  <Users className="w-3 h-3" />
                  <span>Directory</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowCcBcc((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                    showCcBcc
                      ? "bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30"
                      : "bg-white dark:bg-[#1e293b] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-slate-200/90 dark:border-slate-700"
                  }`}
                >
                  CC / BCC
                </button>
              </div>
            </div>

            {/* Live ERP Contact Directory Dropdown */}
            {showContactDropdown && contacts.length > 0 && (
              <div className="absolute left-0 right-0 mt-1.5 rounded-2xl overflow-hidden z-30 max-h-56 overflow-y-auto bg-white dark:bg-[#151f32] border border-slate-200 dark:border-[#263449] shadow-xl">
                <div className="px-3.5 py-2 text-[10.5px] font-semibold uppercase tracking-wider flex items-center justify-between bg-slate-50 dark:bg-[#111827] text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <span>GoldTouch ERP Contacts</span>
                  <button
                    type="button"
                    onClick={() => setShowContactDropdown(false)}
                    className="text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    Close
                  </button>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {contacts.map((c, idx) => (
                    <button
                      key={`${c.email}-${idx}`}
                      type="button"
                      onClick={() => handleSelectContact(c)}
                      className="w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-[#1c283e] transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {c.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {c.email}
                        </div>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-medium capitalize bg-slate-100 dark:bg-[#1e293b] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                        {String(c.role || c.source || "Contact").replace(
                          /_/g,
                          " "
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Optional CC / BCC */}
          {showCcBcc && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#151f32] border border-slate-200/90 dark:border-[#263449]">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 w-10 shrink-0">
                  CC
                </span>
                <input
                  type="text"
                  value={ccEmail}
                  onChange={(e) => setCcEmail(e.target.value)}
                  placeholder="cc@goldtouchds.com"
                  className="w-full bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#151f32] border border-slate-200/90 dark:border-[#263449]">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 w-10 shrink-0">
                  BCC
                </span>
                <input
                  type="text"
                  value={bccEmail}
                  onChange={(e) => setBccEmail(e.target.value)}
                  placeholder="bcc@goldtouchds.com"
                  className="w-full bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Subject Line */}
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#151f32] border border-slate-200/90 dark:border-[#263449] focus-within:border-slate-400 dark:focus-within:border-slate-500 transition-colors">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400 w-14 shrink-0">
              Subject
            </span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject line..."
              required
              className="w-full bg-transparent text-[13.5px] font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
            />
          </div>

          {/* Email Message Body + Sleek One-Click Tone Bar */}
          <div className="rounded-2xl bg-slate-50 dark:bg-[#151f32] border border-slate-200/90 dark:border-[#263449] overflow-hidden focus-within:border-slate-400 dark:focus-within:border-slate-500 transition-colors">
            <div className="px-3.5 py-2 border-b border-slate-200/70 dark:border-[#263449] flex flex-wrap items-center justify-between gap-2 bg-slate-100/60 dark:bg-[#111827]/60">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Tone</span>
                {refining && (
                  <RefreshCw className="w-3 h-3 text-slate-400 animate-spin ml-1" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {[
                  {
                    label: "Polish",
                    tone: "Warm, executive, and polished business tone",
                  },
                  {
                    label: "Concise",
                    tone: "Crisp, brief, direct 3-4 sentence executive summary",
                  },
                  {
                    label: "Warm",
                    tone: "Warm, personable, relationship-focused dealership partner tone",
                  },
                  {
                    label: "Executive",
                    tone: "Formal, authoritative executive business tone",
                  },
                  {
                    label: "Urgent",
                    tone: "Polite but urgent action-required operational follow-up",
                  },
                ].map((preset) => {
                  const isSelected = activeTone === preset.label;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      disabled={refining}
                      onClick={() => handleAiRefine(preset.label, preset.tone)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer disabled:opacity-50 ${
                        isSelected
                          ? "bg-white dark:bg-[#263449] text-slate-900 dark:text-white font-semibold shadow-2xs ring-1 ring-slate-200 dark:ring-slate-600"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-[#1e293b]"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={9}
              required
              placeholder="Email message body..."
              className="w-full p-3.5 bg-transparent text-[13.5px] leading-relaxed text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none resize-y"
            />
          </div>

          {/* Bottom Action Bar */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyContent}
                className="px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 bg-slate-100 dark:bg-[#151f32] text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-[#1e293b] border border-slate-200/80 dark:border-[#263449] transition-colors cursor-pointer"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>

              <a
                href={mailtoHref}
                className="px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 bg-slate-100 dark:bg-[#151f32] text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-[#1e293b] border border-slate-200/80 dark:border-[#263449] transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Mail App</span>
              </a>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-[#151f32] text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-[#1e293b] transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={sending}
                className="sara-primary-btn px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-200 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {sending
                    ? "Sending..."
                    : sentSuccess
                    ? "Send Again"
                    : "Send Email"}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
