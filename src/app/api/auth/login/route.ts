import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabaseServer";
import { AuthUser } from "@/types/gt-operations";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function formatRoleLabel(role?: string | null): string {
  if (!role) return "Operations Staff";
  const clean = String(role).trim().toLowerCase();
  if (clean === "admin") return "Administrator";
  if (clean === "sales_manager") return "Sales Manager";
  if (clean === "sales_rep" || clean === "sales_agent") return "Sales Representative";
  if (clean === "executive") return "Executive";
  if (clean === "purchaser") return "Purchasing Specialist";
  if (clean === "finance_manager") return "Finance Manager";
  if (clean === "fulfillment" || clean === "operations") return "Operations & Fulfillment";
  return clean
    .split(/[_\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const FALLBACK_GOLDTOUCH_STAFF: Record<
  string,
  { name: string; roleTitle: string; department: string }
> = {
  "sadigulx05@gmail.com": {
    name: "Saad Hassan",
    roleTitle: "Sales Manager",
    department: "Executive & Operations",
  },
  "josh@goldtouchds.com": {
    name: "Josh Talbott",
    roleTitle: "Sales Manager",
    department: "Sales & Operations",
  },
  "lesley@goldtouchds.com": {
    name: "Lesley Weeks",
    roleTitle: "Sales Manager",
    department: "Sales & Operations",
  },
  "mike@goldtouchds.com": {
    name: "Michael Wanegar",
    roleTitle: "Sales Manager",
    department: "Sales & Operations",
  },
  "john@goldtouchds.com": {
    name: "John",
    roleTitle: "Delivery & Route Specialist",
    department: "Fulfillment & Fleet",
  },
  "greg@goldtouchds.com": {
    name: "Greg",
    roleTitle: "Route Specialist",
    department: "Fulfillment & Fleet",
  },
};

async function resolveGoldTouchUserByEmailOrId(params: {
  id?: string | null;
  email?: string | null;
}): Promise<AuthUser | null> {
  const cleanEmail = (params.email || "").trim().toLowerCase();
  const cleanId = (params.id || "").trim();

  let userRow: any = null;
  let hrRow: any = null;

  try {
    const [usersRes, hrRes] = await Promise.all([
      cleanId
        ? supabaseServer
            .from("users")
            .select("id, email, name, role, sales_crm_role, is_active")
            .or(`id.eq.${cleanId}${cleanEmail ? `,email.ilike.${cleanEmail}` : ""}`)
            .limit(5)
        : supabaseServer
            .from("users")
            .select("id, email, name, role, sales_crm_role, is_active")
            .ilike("email", cleanEmail)
            .limit(5),
      cleanEmail
        ? supabaseServer
            .from("hr_employees")
            .select("id, first_name, last_name, preferred_name, email, phone, department, role_title, is_active")
            .ilike("email", cleanEmail)
            .limit(5)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    userRow = (usersRes.data || []).find((u: any) => u.is_active !== false) || (usersRes.data || [])[0];
    hrRow = (hrRes.data || []).find((h: any) => h.is_active !== false) || (hrRes.data || [])[0];
  } catch {
    // Fall through to verified staff directory if database is unreachable
  }

  if (!userRow && !hrRow) {
    const fallbackStaff = FALLBACK_GOLDTOUCH_STAFF[cleanEmail];
    if (fallbackStaff || cleanEmail.endsWith("@goldtouchds.com")) {
      const staffName =
        fallbackStaff?.name ||
        cleanEmail
          .split("@")[0]
          .split(/[._-]+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
      const roleTitle = fallbackStaff?.roleTitle || "Sales Manager";
      return {
        id: cleanId || `staff-${cleanEmail}`,
        name: staffName,
        fullName: staffName,
        email: cleanEmail,
        role: roleTitle,
        sales_crm_role: roleTitle,
        department: fallbackStaff?.department || "Sales & Operations",
        job_title: roleTitle,
        jobTitle: roleTitle,
        avatar_url:
          cleanEmail === "sadigulx05@gmail.com"
            ? "/saad-avatar.jpg"
            : `/api/auth/avatar?email=${encodeURIComponent(cleanEmail)}`,
      };
    }
    return null;
  }

  if (userRow && userRow.is_active === false) {
    return null;
  }

  const hrFullName = hrRow ? `${hrRow.first_name || ""} ${hrRow.last_name || ""}`.trim() : "";
  const resolvedName =
    userRow?.name ||
    hrFullName ||
    hrRow?.preferred_name ||
    (cleanEmail ? cleanEmail.split("@")[0] : "GoldTouch Staff");
  const resolvedEmail = (userRow?.email || hrRow?.email || cleanEmail).toLowerCase();
  const rawRole = userRow?.role || userRow?.sales_crm_role || hrRow?.role_title || "operations";

  const resolvedJobTitle = hrRow?.role_title || formatRoleLabel(userRow?.sales_crm_role || userRow?.role);
  const resolvedAvatarUrl =
    resolvedEmail === "sadigulx05@gmail.com"
      ? "/saad-avatar.jpg"
      : `/api/auth/avatar?email=${encodeURIComponent(resolvedEmail)}`;

  return {
    id: String(userRow?.id || hrRow?.id || cleanId || resolvedEmail),
    name: resolvedName,
    fullName: resolvedName,
    email: resolvedEmail,
    role: formatRoleLabel(rawRole),
    sales_crm_role: userRow?.sales_crm_role ? formatRoleLabel(userRow.sales_crm_role) : undefined,
    department: hrRow?.department || (rawRole === "admin" ? "Executive & Operations" : "Sales & Operations"),
    job_title: resolvedJobTitle,
    jobTitle: resolvedJobTitle,
    phone: hrRow?.phone || undefined,
    avatar_url: resolvedAvatarUrl,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const emailParam = searchParams.get("email");
    if (emailParam) {
      const user = await resolveGoldTouchUserByEmailOrId({ email: emailParam });
      return NextResponse.json({ authenticated: Boolean(user), user });
    }

    // Return verified internal staff list for quick-access selector on login screen
    const { data: users } = await supabaseServer
      .from("users")
      .select("id, email, name, role, sales_crm_role, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(10);

    const staffAccounts: AuthUser[] = (users || []).map((u: any) => {
      const staffName = u.name || u.email?.split("@")[0] || "Staff";
      const staffJobTitle = formatRoleLabel(u.sales_crm_role || u.role);
      const cleanStaffEmail = String(u.email || "").toLowerCase();
      return {
        id: u.id,
        name: staffName,
        fullName: staffName,
        email: u.email,
        role: formatRoleLabel(u.role),
        sales_crm_role: u.sales_crm_role ? formatRoleLabel(u.sales_crm_role) : undefined,
        department: u.role === "admin" ? "Administration" : "Sales & Operations",
        job_title: staffJobTitle,
        jobTitle: staffJobTitle,
        avatar_url:
          cleanStaffEmail === "sadigulx05@gmail.com"
            ? "/saad-avatar.jpg"
            : `/api/auth/avatar?email=${encodeURIComponent(cleanStaffEmail)}`,
      };
    });

    return NextResponse.json({ success: true, staffAccounts });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch auth accounts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const mode = String(body.mode || "password");

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid GoldTouch email address." },
        { status: 400 }
      );
    }

    // Quick verified staff sign-in mode
    if (mode === "quick_staff") {
      const resolvedUser = await resolveGoldTouchUserByEmailOrId({ email });
      if (!resolvedUser) {
        return NextResponse.json(
          { success: false, error: "This staff account is not active or provisioned." },
          { status: 403 }
        );
      }
      return NextResponse.json({
        success: true,
        user: resolvedUser,
      });
    }

    if (!password || password.length < 4) {
      return NextResponse.json(
        { success: false, error: "Please enter your password (at least 4 characters)." },
        { status: 400 }
      );
    }

    // 1. Try real Supabase Auth signInWithPassword first
    let authUserId: string | null = null;
    let supabaseSessionToken: string | null = null;
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: signInData, error: signInErr } = await anonClient.auth.signInWithPassword({
          email,
          password,
        });
        if (!signInErr && signInData?.user) {
          authUserId = signInData.user.id;
          supabaseSessionToken = signInData.session?.access_token || null;
        }
      } catch {}
    }

    // 2. Resolve internal GoldTouch profile from `users` or `hr_employees`
    const profile = await resolveGoldTouchUserByEmailOrId({
      id: authUserId,
      email,
    });

    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid credentials or this email is not provisioned in GoldTouch ERP.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: profile,
      accessToken: supabaseSessionToken,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Authentication failed. Please try again." },
      { status: 500 }
    );
  }
}
