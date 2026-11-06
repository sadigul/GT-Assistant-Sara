import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { EmailContactOption } from "@/types/gt-operations";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || "").trim();
    const limit = Math.min(Number(searchParams.get("limit") || 25), 50);

    const contacts: EmailContactOption[] = [];
    const seenEmails = new Set<string>();

    const addContact = (c: EmailContactOption) => {
      if (!c.email || !c.email.includes("@")) return;
      const key = c.email.trim().toLowerCase();
      if (seenEmails.has(key)) return;
      seenEmails.add(key);
      contacts.push({
        ...c,
        email: c.email.trim(),
        name: (c.name || c.email.split("@")[0]).trim(),
        role: c.role || c.roleOrCompany,
        company: c.company || c.roleOrCompany,
        roleOrCompany: c.roleOrCompany || c.role || c.company,
      });
    };

    // 1. Search ERP Staff Users (`users`: id, email, name, role, sales_crm_role, is_active)
    let usersQuery = supabaseServer
      .from("users")
      .select("id, email, name, role, sales_crm_role")
      .eq("is_active", true)
      .limit(15);

    if (query) {
      usersQuery = usersQuery.or(
        `name.ilike.%${query}%,email.ilike.%${query}%,role.ilike.%${query}%`
      );
    }

    const { data: usersData } = await usersQuery;
    for (const u of usersData || []) {
      const roleLabel = `GoldTouch Staff (${String(u.sales_crm_role || u.role || "Team").replace(/_/g, " ")})`;
      addContact({
        name: u.name || u.email,
        email: u.email,
        role: roleLabel,
        company: "GoldTouch Dealer Supply",
        roleOrCompany: roleLabel,
        source: "staff",
      });
    }

    // 2. Search HR Employees (`hr_employees`: id, first_name, last_name, preferred_name, email, phone, department, role_title)
    let hrQuery = supabaseServer
      .from("hr_employees")
      .select("id, first_name, last_name, preferred_name, email, phone, department, role_title")
      .not("email", "is", null)
      .limit(15);

    if (query) {
      const parts = query.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        hrQuery = hrQuery.or(
          `first_name.ilike.%${parts[0]}%,last_name.ilike.%${parts[parts.length - 1]}%,email.ilike.%${query}%`
        );
      } else {
        hrQuery = hrQuery.or(
          `first_name.ilike.%${query}%,last_name.ilike.%${query}%,preferred_name.ilike.%${query}%,email.ilike.%${query}%,role_title.ilike.%${query}%,department.ilike.%${query}%`
        );
      }
    }

    const { data: hrData } = await hrQuery;
    for (const h of hrData || []) {
      if (h.email) {
        const fullName = `${h.first_name || ""} ${h.last_name || ""}`.trim() || h.preferred_name || h.email;
        const roleLabel = h.role_title || h.department || "GoldTouch Employee";
        addContact({
          name: fullName,
          email: h.email,
          role: roleLabel,
          company: "GoldTouch Dealer Supply",
          roleOrCompany: roleLabel,
          phone: h.phone || undefined,
          source: "hr",
        });
      }
    }

    // 3. Search Dealership Rooftops (`rooftops`: id, name, billing_email, city, state)
    let rooftopsQuery = supabaseServer
      .from("rooftops")
      .select("id, name, billing_email, city, state")
      .not("billing_email", "is", null)
      .limit(15);

    if (query) {
      rooftopsQuery = rooftopsQuery.or(
        `name.ilike.%${query}%,billing_email.ilike.%${query}%`
      );
    }

    const { data: rooftopsData } = await rooftopsQuery;
    for (const r of rooftopsData || []) {
      if (r.billing_email) {
        const roleLabel = `Dealership Account${r.city ? ` · ${r.city}, ${r.state || ""}` : ""}`;
        addContact({
          name: r.name,
          email: r.billing_email,
          role: "Dealership Billing",
          company: r.name,
          roleOrCompany: roleLabel,
          source: "customer",
        });
      }
    }

    // 4. Search People / Dealership Contacts (`people`: id, name, email, phone)
    let peopleQuery = supabaseServer
      .from("people")
      .select("id, name, email, phone")
      .not("email", "is", null)
      .limit(15);

    if (query) {
      peopleQuery = peopleQuery.or(
        `name.ilike.%${query}%,email.ilike.%${query}%`
      );
    }

    const { data: peopleData } = await peopleQuery;
    for (const p of peopleData || []) {
      if (p.email) {
        addContact({
          name: p.name || p.email,
          email: p.email,
          role: "Dealership Contact",
          company: "Authorized Buyer",
          roleOrCompany: "Dealership Contact",
          phone: p.phone || undefined,
          source: "contact",
        });
      }
    }

    // 5. Search Suppliers (`suppliers`: id, name, company_name, contact_name, email, city, state)
    let suppQuery = supabaseServer
      .from("suppliers")
      .select("id, name, company_name, contact_name, email, city, state")
      .not("email", "is", null)
      .limit(10);

    if (query) {
      suppQuery = suppQuery.or(
        `name.ilike.%${query}%,company_name.ilike.%${query}%,contact_name.ilike.%${query}%,email.ilike.%${query}%`
      );
    }

    const { data: suppData } = await suppQuery;
    for (const s of suppData || []) {
      if (s.email) {
        const vendorTitle = s.company_name || s.name || "Supplier";
        addContact({
          name: s.contact_name ? `${s.contact_name} (${vendorTitle})` : vendorTitle,
          email: s.email,
          role: "Vendor Contact",
          company: vendorTitle,
          roleOrCompany: `Supplier · ${vendorTitle}`,
          source: "supplier",
        });
      }
    }

    return NextResponse.json({
      success: true,
      contacts: contacts.slice(0, limit),
    });
  } catch (err: any) {
    console.error("[Email Contacts API Error]:", err);
    return NextResponse.json(
      { success: false, contacts: [], error: err?.message || "Failed to load contacts" },
      { status: 500 }
    );
  }
}
