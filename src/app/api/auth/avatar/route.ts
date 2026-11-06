import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = (searchParams.get("email") || "").trim().toLowerCase();

  if (!email) {
    return new NextResponse("Missing email", { status: 400 });
  }

  try {
    // 1. Check local cached high-res photo for Saad Hassan first for instant zero-latency load
    if (email === "sadigulx05@gmail.com") {
      const localPath = path.join(process.cwd(), "public", "saad-avatar.jpg");
      if (fs.existsSync(localPath)) {
        const fileBuffer = fs.readFileSync(localPath);
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            "Content-Type": "image/jpeg",
            "Cache-Control": "public, max-age=86400",
          },
        });
      }
    }

    // 2. Check `users.avatar_url` in Supabase
    const { data: userRow } = await supabaseServer
      .from("users")
      .select("id, email, avatar_url")
      .ilike("email", email)
      .maybeSingle();

    if (userRow?.avatar_url) {
      const rawUrl = String(userRow.avatar_url).trim();
      // If stored as data:image/...;base64,... decode and serve binary image directly
      if (rawUrl.startsWith("data:image/")) {
        const match = rawUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
        if (match) {
          const mimeType = match[1];
          const buffer = Buffer.from(match[2], "base64");
          return new NextResponse(buffer, {
            status: 200,
            headers: {
              "Content-Type": mimeType,
              "Cache-Control": "public, max-age=3600",
            },
          });
        }
      } else if (
        rawUrl.startsWith("http") &&
        !rawUrl.includes("dicebear.com")
      ) {
        const imgRes = await fetch(rawUrl);
        if (imgRes.ok) {
          const contentType = imgRes.headers.get("content-type") || "image/jpeg";
          const arrBuf = await imgRes.arrayBuffer();
          return new NextResponse(arrBuf, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=3600",
            },
          });
        }
      }
    }

    // 3. Check Supabase Auth user_metadata (Google / Portal avatar_url or picture)
    if (userRow?.id) {
      const { data: authUser } = await supabaseServer.auth.admin.getUserById(
        userRow.id
      );
      const meta = authUser?.user?.user_metadata || {};
      const metaAvatar = meta.avatar_url || meta.picture;
      if (
        typeof metaAvatar === "string" &&
        metaAvatar.startsWith("http") &&
        !metaAvatar.includes("dicebear.com")
      ) {
        const imgRes = await fetch(metaAvatar);
        if (imgRes.ok) {
          const contentType = imgRes.headers.get("content-type") || "image/jpeg";
          const arrBuf = await imgRes.arrayBuffer();
          return new NextResponse(arrBuf, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=3600",
            },
          });
        }
      }
    }

    // 4. Try fetching public Gmail / Google profile picture via unavatar
    const googleRes = await fetch(
      `https://unavatar.io/google/${encodeURIComponent(email)}?fallback=false`,
      { next: { revalidate: 3600 } }
    ).catch(() => null);

    if (
      googleRes &&
      googleRes.ok &&
      googleRes.headers.get("content-type")?.startsWith("image/")
    ) {
      const arrBuf = await googleRes.arrayBuffer();
      return new NextResponse(arrBuf, {
        status: 200,
        headers: {
          "Content-Type": googleRes.headers.get("content-type") || "image/jpeg",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }
  } catch {
    // Fall through to 404 so client renders clean initials fallback
  }

  return new NextResponse("No avatar found", { status: 404 });
}
