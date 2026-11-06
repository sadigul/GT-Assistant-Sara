import { NextResponse } from "next/server";

export async function POST() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured in environment variables" },
      { status: 500 }
    );
  }

  try {
    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/auth_tokens", {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uses: 1,
        expireTime,
        newSessionExpireTime,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Live Token API] Failed to mint ephemeral token:", response.status, errorText);
      return NextResponse.json(
        { error: `Gemini API returned ${response.status}: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      token: data.name,
      success: true,
    });
  } catch (err: any) {
    console.error("[Live Token API] Error generating token:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
