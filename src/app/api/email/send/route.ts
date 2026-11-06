import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseClient";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildBrandedHtml(params: {
  subject: string;
  bodyText: string;
  senderName?: string;
  senderEmail?: string;
  contextSummary?: string;
}) {
  const paragraphs = params.bodyText
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block
        .split("\n")
        .map((line) => escapeHtml(line))
        .join("<br />");
      return `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.65; color: #1e293b;">${lines}</p>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(params.subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="620" cellspacing="0" cellpadding="0" border="0" style="max-width: 620px; width: 100%; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);">
          <!-- Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 20px 28px; border-bottom: 3px solid #eab308;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <div style="font-size: 16px; font-weight: 800; letter-spacing: 0.04em; color: #ffffff; text-transform: uppercase;">
                      GoldTouch Dealer Supply
                    </div>
                    <div style="font-size: 12px; color: #94a3b8; margin-top: 3px;">
                      Mid-Ohio Valley &amp; Regional Distribution Network · Huntington, WV
                    </div>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 700; color: #fef08a; background-color: rgba(234, 179, 8, 0.16); border: 1px solid rgba(234, 179, 8, 0.35); border-radius: 999px; letter-spacing: 0.04em; text-transform: uppercase;">
                      Operations Dispatch
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 28px 28px 20px 28px;">
              ${paragraphs}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 16px 28px 22px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
              <div style="font-size: 12px; color: #64748b; line-height: 1.5;">
                Sent via <strong>GoldTouch Enterprise Operations</strong>${
                  params.senderName
                    ? ` on behalf of <strong>${escapeHtml(params.senderName)}</strong>`
                    : ""
                }${params.senderEmail ? ` (${escapeHtml(params.senderEmail)})` : ""}.
              </div>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
                GoldTouch Automotive Dealer Supply · Huntington, WV · support@goldtouchdealersupply.com
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const to = payload.to_email || payload.to || "";
    const toName = payload.to_name || payload.toName || "";
    const cc = payload.cc_email || payload.cc || "";
    const bcc = payload.bcc_email || payload.bcc || "";
    const replyTo = payload.reply_to || payload.replyTo || "";
    const subject = payload.subject || "";
    const body = payload.body || "";
    const senderName = payload.sender_name || payload.senderName || "";
    const senderEmail = payload.sender_email || payload.senderEmail || "";
    const contextSummary = payload.context_summary || payload.contextSummary || "";

    const toAddresses = String(to || "")
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter((s) => s.includes("@"));

    if (toAddresses.length === 0) {
      return NextResponse.json(
        { error: "Please provide at least one valid recipient email address." },
        { status: 400 }
      );
    }

    if (!subject || !String(subject).trim()) {
      return NextResponse.json(
        { error: "Please provide an email subject." },
        { status: 400 }
      );
    }

    if (!body || !String(body).trim()) {
      return NextResponse.json(
        { error: "Please provide an email message body." },
        { status: 400 }
      );
    }

    const ccAddresses = cc
      ? String(cc)
          .split(/[;,]/)
          .map((s) => s.trim())
          .filter((s) => s.includes("@"))
      : [];

    const bccAddresses = bcc
      ? String(bcc)
          .split(/[;,]/)
          .map((s) => s.trim())
          .filter((s) => s.includes("@"))
      : [];

    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    const defaultFrom =
      process.env.RESEND_FROM_EMAIL?.trim() ||
      "Gold Touch Support <support@goldtouchdealersupply.com>";

    // Format From display name if senderName is available
    let fromHeader = defaultFrom;
    const emailMatch = defaultFrom.match(/<([^>]+)>/);
    const fromEmailAddress = emailMatch ? emailMatch[1] : defaultFrom;
    if (senderName && fromEmailAddress) {
      fromHeader = `${senderName} via GoldTouch <${fromEmailAddress}>`;
    }

    const htmlContent = buildBrandedHtml({
      subject: String(subject).trim(),
      bodyText: String(body).trim(),
      senderName,
      senderEmail,
      contextSummary,
    });

    if (!resendApiKey) {
      return NextResponse.json(
        { error: "RESEND_API_KEY is not configured in environment." },
        { status: 500 }
      );
    }

    const resendBody: Record<string, unknown> = {
      from: fromHeader,
      to: toAddresses,
      subject: String(subject).trim(),
      html: htmlContent,
      text: String(body).trim(),
    };

    if (ccAddresses.length > 0) resendBody.cc = ccAddresses;
    if (bccAddresses.length > 0) resendBody.bcc = bccAddresses;
    if (replyTo || senderEmail) {
      resendBody.reply_to = (replyTo || senderEmail).trim();
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendBody),
    });

    const resData = await response.json().catch(() => ({}));

    // Log to Supabase `email_send_requests` for ERP audit trail (non-blocking)
    try {
      const supabase = getSupabaseAdmin();
      const idempotencyKey = `sara-email-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      await supabase.from("email_send_requests").insert({
        idempotency_key: idempotencyKey,
        payload: {
          to: toAddresses,
          toName,
          cc: ccAddresses,
          bcc: bccAddresses,
          subject: String(subject).trim(),
          senderName,
          senderEmail,
          source: "sara_chatbot",
        },
        provider_message_id: resData?.id || null,
        accepted_at: response.ok ? new Date().toISOString() : null,
        last_error: response.ok
          ? null
          : resData?.message || resData?.error || `HTTP ${response.status}`,
      });
    } catch (logErr) {
      console.warn("[Email Audit Log Warning]:", logErr);
    }

    if (!response.ok) {
      const errMsg =
        resData?.message ||
        resData?.error ||
        `Resend API returned status ${response.status}`;
      return NextResponse.json({ error: errMsg, details: resData }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      ok: true,
      messageId: resData?.id || `msg_${Date.now()}`,
      sentAt: new Date().toISOString(),
      to: toAddresses.join(", "),
      from: fromHeader,
    });
  } catch (err: any) {
    console.error("[Email Send API Error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to send email." },
      { status: 500 }
    );
  }
}
