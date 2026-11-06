"use client";

import React, { useState } from "react";
import { Mail, Send, Edit3, Check, ExternalLink } from "lucide-react";
import { EmailDraftData, AuthUser } from "@/types/gt-operations";

interface EmailDraftCardProps {
  data: EmailDraftData;
  currentUser?: AuthUser | null;
  onOpenComposer?: (draft: EmailDraftData) => void;
}

export default function EmailDraftCard({
  data,
  currentUser,
  onOpenComposer,
}: EmailDraftCardProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(data.status === "sent");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const recipientEmail = data.to_email || data.to || "";
  const recipientName =
    data.to_name || data.toName || data.recipientName || "";

  const handleDirectSend = async () => {
    if (!recipientEmail || !recipientEmail.includes("@")) {
      if (onOpenComposer) onOpenComposer(data);
      return;
    }
    setSending(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_email: recipientEmail,
          to_name: recipientName || undefined,
          cc_email: data.cc_email || data.cc || undefined,
          bcc_email: data.bcc_email || data.bcc || undefined,
          reply_to:
            currentUser?.email ||
            data.sender_email ||
            data.senderEmail ||
            undefined,
          subject: data.subject,
          body: data.body,
          sender_name:
            currentUser?.fullName ||
            data.sender_name ||
            data.senderName ||
            "GoldTouch Operations",
          sender_email:
            currentUser?.email ||
            data.sender_email ||
            data.senderEmail ||
            undefined,
          sender_user_id: currentUser?.id,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setErrorMsg(
          json?.error || "Could not send directly. Open Mailbox to adjust."
        );
        return;
      }
      setSent(true);
    } catch (err: any) {
      setErrorMsg(err?.message || "Network error while sending.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="sara-card-surface mt-3 rounded-2xl overflow-hidden bg-white dark:bg-[#151f32] border border-slate-200/90 dark:border-[#263449] shadow-[0_2px_12px_-3px_rgba(15,23,42,0.06)] transition-all">
      {/* Header */}
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 bg-slate-50/80 dark:bg-[#172133] border-b border-slate-200/80 dark:border-[#263449]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-500/30">
            <Mail className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-[13px] font-semibold text-slate-900 dark:text-white truncate">
              {recipientName
                ? `${recipientName}${
                    recipientEmail ? ` <${recipientEmail}>` : ""
                  }`
                : recipientEmail || "Select Recipient in Mailbox"}
            </div>
            <div className="text-[11.5px] text-slate-500 dark:text-slate-400 truncate">
              Subject:{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {data.subject}
              </span>
            </div>
          </div>
        </div>

        <span
          className={`px-2 py-[2px] rounded-[5px] text-[10.5px] leading-[1.2] font-medium tracking-[0.01em] shrink-0 ${
            sent
              ? "bg-emerald-500/[0.07] dark:bg-emerald-400/[0.07] text-emerald-700 dark:text-emerald-300/95 ring-1 ring-inset ring-emerald-600/15 dark:ring-emerald-400/20"
              : "bg-slate-100/90 dark:bg-white/[0.05] text-slate-600 dark:text-zinc-300 ring-1 ring-inset ring-slate-300/70 dark:ring-white/[0.1]"
          }`}
        >
          {sent ? "Email Sent" : "Ready in Mailbox"}
        </span>
      </div>

      {/* Email Body Preview */}
      <div className="p-4">
        <div className="text-xs sm:text-[13px] whitespace-pre-wrap leading-relaxed rounded-xl p-3.5 max-h-56 overflow-y-auto bg-slate-50/70 dark:bg-[#111827] border border-slate-200/80 dark:border-[#263449] text-slate-800 dark:text-slate-200">
          {data.body}
        </div>

        {errorMsg && (
          <div className="mt-2.5 px-3 py-2 rounded-xl text-xs font-medium bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {onOpenComposer && (
              <button
                type="button"
                onClick={() => onOpenComposer(data)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-slate-100 dark:bg-[#1e293b] hover:bg-slate-200/80 dark:hover:bg-[#283548] text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Open Mailbox</span>
              </button>
            )}

            {recipientEmail && (
              <a
                href={`mailto:${encodeURIComponent(
                  recipientEmail
                )}?subject=${encodeURIComponent(
                  data.subject || ""
                )}&body=${encodeURIComponent(data.body || "")}`}
                className="px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 bg-slate-100 dark:bg-[#1e293b] hover:bg-slate-200/80 dark:hover:bg-[#283548] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Mail App</span>
              </a>
            )}
          </div>

          <button
            type="button"
            disabled={sending}
            onClick={handleDirectSend}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${
              sent
                ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-500/30"
                : "sara-primary-btn bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-200 shadow-2xs"
            }`}
          >
            {sent ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>
              {sending
                ? "Sending..."
                : sent
                ? "Sent via GoldTouch"
                : recipientEmail
                ? "Send Email Now"
                : "Select Recipient & Send"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
