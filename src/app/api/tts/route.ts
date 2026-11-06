import { NextRequest, NextResponse } from "next/server";

// Simple in-memory cache for synthesized audio to make repeat listens instant
const ttsCache = new Map<string, { audioBase64: string; mimeType: string }>();
const MAX_CACHE_ENTRIES = 40;

/**
 * Wraps raw 16-bit signed little-endian PCM (24kHz mono) in a standard RIFF WAV header
 */
function pcm16ToWavBase64(pcmBase64: string, sampleRate = 24000): string {
  const pcmBuffer = Buffer.from(pcmBase64, "base64");
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]).toString("base64");
}

/**
 * Converts markdown responses (including tables, SKUs, and bullet points) into a natural,
 * conversational spoken script suitable for a charming, professional female assistant.
 */
export function formatTextForCharmingSpeech(rawText: string): string {
  if (!rawText) return "";

  let text = rawText;

  // 1. Remove markdown images ![alt](url) and raw URLs
  text = text.replace(/!\[[^\]]*\]\([^\)]+\)/g, "");
  text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");
  text = text.replace(/https?:\/\/[^\s)]+/g, "");

  // 2. Convert markdown tables into natural spoken summaries
  const lines = text.split("\n");
  const processedLines: string[] = [];
  let inTable = false;
  let tableHeaders: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = trimmed
        .split("|")
        .map((c) => c.trim().replace(/\*\*/g, "").replace(/`/g, ""))
        .filter((c) => c.length > 0);

      // Skip separator row like | :--- | :--- |
      if (cells.every((c) => /^[:\-]+$/.test(c))) {
        continue;
      }

      if (!inTable) {
        inTable = true;
        tableHeaders = cells;
        continue;
      }

      if (cells.length >= 2) {
        // E.g. Quantity Bracket | Storefront Unit Price | Customer Savings | ...
        const col0 = cells[0];
        const col1 = cells[1];
        const col2 = cells[2] || "";
        if (col2 && !/base price/i.test(col2)) {
          processedLines.push(`For ${col0}, the unit price is ${col1} (${col2}).`);
        } else {
          processedLines.push(`For ${col0}, the unit price is ${col1}.`);
        }
      }
      continue;
    } else {
      inTable = false;
      tableHeaders = [];
    }

    processedLines.push(line);
  }

  text = processedLines.join("\n");

  // 3. Clean markdown headings, bold/italic markers, blockquotes, and code ticks
  text = text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^[\-•*]\s+/gm, "")
    .replace(/›/g, ", ");

  // 4. Make operational abbreviations sound natural when spoken aloud
  text = text
    .replace(/\bQty\.\s*/gi, "Quantity ")
    .replace(/\bSKU:\s*/gi, "SKU ")
    .replace(/\bSO-(\d+)/g, "Sales Order $1")
    .replace(/\bINV-(\d+)/g, "Invoice $1")
    .replace(/\bPO-(\d+)/g, "Purchase Order $1")
    .replace(/\bSHP-(\d+)/g, "Shipment $1")
    .replace(/(\d+)\s*-\s*(\d+)\s*units/gi, "$1 to $2 units")
    .replace(/(\d+)\+\s*units/gi, "$1 or more units")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, ". ")
    .replace(/\.\s*\./g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();

  // Keep spoken length crisp and engaging (up to ~950 chars) so TTS generation is fast and conversational
  if (text.length > 950) {
    const truncated = text.slice(0, 950);
    const lastPeriod = truncated.lastIndexOf(".");
    text = lastPeriod > 400 ? truncated.slice(0, lastPeriod + 1) : truncated + ".";
  }

  return text;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawText = typeof body.text === "string" ? body.text.trim() : "";
    const voice = typeof body.voice === "string" && body.voice ? body.voice : "Aoede";

    if (!rawText) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const spokenText = formatTextForCharmingSpeech(rawText);
    if (!spokenText) {
      return NextResponse.json({ error: "No speakable text" }, { status: 400 });
    }

    const cacheKey = `${voice}::${spokenText}`;
    const cached = ttsCache.get(cacheKey);
    if (cached) {
      return NextResponse.json({
        audioBase64: cached.audioBase64,
        mimeType: cached.mimeType,
        spokenText,
        cached: true,
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const isMaleVoice = ["Puck", "Charon", "Fenrir", "Orus"].includes(voice);
    const styleInstruction = isMaleVoice
      ? "warm, confident, articulate, and friendly professional man speaking naturally and conversationally"
      : "warm, charming, sweet, articulate, and friendly young professional woman speaking naturally and conversationally";

    // Try Gemini 3.8 TTS models first (returns native audio/wav with speech_metadata styling)
    const ttsModels38 = ["gemini-3.8-flash-tts", "gemini-3.8-flash-lite-tts"];

    for (const modelName of ttsModels38) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: spokenText,
                      speech_metadata: {
                        style: styleInstruction,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: {
                    voice,
                  },
                },
              },
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const inlineData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
          if (inlineData?.data) {
            let audioBase64: string = inlineData.data;
            let mimeType: string = inlineData.mimeType || "audio/wav";

            if (mimeType.toLowerCase().includes("l16") || mimeType.toLowerCase().includes("pcm")) {
              audioBase64 = pcm16ToWavBase64(audioBase64, 24000);
              mimeType = "audio/wav";
            }

            if (ttsCache.size >= MAX_CACHE_ENTRIES) {
              const firstKey = ttsCache.keys().next().value;
              if (firstKey) ttsCache.delete(firstKey);
            }
            ttsCache.set(cacheKey, { audioBase64, mimeType });

            return NextResponse.json({
              audioBase64,
              mimeType,
              spokenText,
              model: modelName,
            });
          }
        }
      } catch (e) {
        console.warn(`[SARA TTS] ${modelName} attempt failed:`, e);
      }
    }

    // Fallback to gemini-2.5-flash-preview-tts if needed
    const fallbackRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: isMaleVoice
                    ? `Speak in a warm, confident, friendly, and professional man's voice: ${spokenText}`
                    : `Speak in a warm, charming, friendly, and professional young woman's voice: ${spokenText}`,
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voice,
                },
              },
            },
          },
        }),
      }
    );

    if (fallbackRes.ok) {
      const data = await fallbackRes.json();
      const inlineData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (inlineData?.data) {
        const wavBase64 = pcm16ToWavBase64(inlineData.data, 24000);
        const mimeType = "audio/wav";
        ttsCache.set(cacheKey, { audioBase64: wavBase64, mimeType });
        return NextResponse.json({
          audioBase64: wavBase64,
          mimeType,
          spokenText,
          model: "gemini-2.5-flash-preview-tts",
        });
      }
    }

    return NextResponse.json(
      { error: "Unable to synthesize studio voice at this moment" },
      { status: 502 }
    );
  } catch (err: any) {
    console.error("[API /api/tts] Error:", err);
    return NextResponse.json(
      { error: err?.message || "TTS synthesis failed" },
      { status: 500 }
    );
  }
}
