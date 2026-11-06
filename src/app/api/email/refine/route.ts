import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const toName = body.to_name || body.toName || "";
    const toEmail = body.to_email || body.toEmail || "";
    const subject = body.subject || "";
    const currentBody = body.current_body || body.currentBody || body.body || "";
    const roughContext = body.rough_context || body.roughContext || "";
    const tone = body.tone || "professional";
    const senderName =
      body.sender_name || body.senderName || "GoldTouch Dealer Supply Operations";
    const senderRole =
      body.sender_role || body.senderRole || "Operations & Sales Support";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "GEMINI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.25,
        responseMimeType: "application/json",
      },
    });

    const prompt = `You are SARA, the Executive Operations AI Assistant at GoldTouch Automotive Dealer Supply (Huntington, WV).
Your job is to refine or draft a polished, accurate, ready-to-send business email based on the user's rough instructions, current draft, and operational context.

RECIPIENT:
- Name: ${toName || "Valued Partner"}
- Email: ${toEmail || "Not specified"}

SENDER:
- Name: ${senderName}
- Title/Department: ${senderRole}, GoldTouch Dealer Supply

REQUESTED TONE / INSTRUCTION:
- Tone / Instruction: ${tone}

CURRENT SUBJECT:
${subject || "(None yet)"}

CURRENT DRAFT BODY:
${currentBody || "(None yet)"}

ROUGH CONTEXT / ADDITIONAL NOTES:
${roughContext || "(None provided)"}

STRICT RULES:
1. Return ONLY a valid JSON object with two keys: "subject" and "body". Do NOT wrap in markdown code fences.
2. Preserve all exact order numbers (e.g., SO-106485), invoice numbers (e.g., INV-106485), dollar amounts, dates, SKUs, dealership names, and tracking/delivery details mentioned in the current draft or rough context.
3. Make the email sound natural, warm, executive, and clear — never robotic or generic.
4. Sign off cleanly with the sender's name (${senderName}) and "GoldTouch Dealer Supply".`;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text()?.trim() || "{}";

    let parsed: { subject?: string; body?: string } = {};
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const cleaned = rawText
        .replace(/^```json\s*/i, "")
        .replace(/```$/i, "")
        .trim();
      parsed = JSON.parse(cleaned);
    }

    return NextResponse.json({
      success: true,
      subject: parsed.subject || subject || "Update from GoldTouch Dealer Supply",
      body: parsed.body || currentBody || "",
    });
  } catch (err: any) {
    console.error("[Email Refine API Error]:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to refine email draft." },
      { status: 500 }
    );
  }
}
