import { NextRequest, NextResponse } from "next/server";
import { askSara } from "@/lib/sara-ai-engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      query,
      history,
      activeDept,
      attachment,
      responseStyle,
      currentUser,
      enableLiveCrud,
      crudPermissions,
    } = body;

    const trimmedQuery = typeof query === "string" ? query.trim() : "";
    if (!trimmedQuery && !attachment) {
      return NextResponse.json(
        { error: "Query or attachment is required" },
        { status: 400 }
      );
    }

    const finalQuery =
      trimmedQuery ||
      (attachment
        ? `Please inspect this attached ${attachment.type?.startsWith("image/") ? "image" : "document"} (${attachment.name || "file"}), extract any key operational details such as invoice numbers, order numbers, part numbers, PO numbers, customer names, or line items, and cross-reference them with our live GoldTouch operations records.`
        : "");

    const response = await askSara(
      finalQuery,
      Array.isArray(history) ? history : [],
      activeDept || "all",
      attachment,
      responseStyle || "balanced",
      currentUser || null,
      enableLiveCrud !== false,
      crudPermissions || null
    );

    return NextResponse.json(response);
  } catch (err: any) {
    console.error("[API /api/chat] Error:", err);
    return NextResponse.json(
      {
        content:
          "I apologize, I experienced a momentary delay pulling those records from the system. Could you please ask that again or let me know which order or invoice you'd like me to look up?",
        departmentTag: "all",
        suggestedFollowUps: [],
      },
      { status: 200 }
    );
  }
}
