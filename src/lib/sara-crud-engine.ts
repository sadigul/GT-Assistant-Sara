import { supabaseServer } from "./supabaseServer";
import {
  CrudEntityTable,
  CrudFieldChange,
  CrudMutationData,
  SaraCrudPermissions,
  getCrudModuleForTable,
  isCrudTableAllowed,
} from "../types/gt-operations";
import { formatCleanEntityName, formatLabel } from "./formatters";

// Global stack of recent completed mutations shared across API routes (/api/chat and /api/crud)
const globalForCrud = globalThis as unknown as {
  __saraRecentMutationsStack?: CrudMutationData[];
};
const recentMutationsStack: CrudMutationData[] =
  globalForCrud.__saraRecentMutationsStack ||
  (globalForCrud.__saraRecentMutationsStack = []);

export function pushCompletedMutation(mutation: CrudMutationData) {
  const existingIdx = recentMutationsStack.findIndex(
    (m) => m.mutationId === mutation.mutationId
  );
  if (existingIdx !== -1) {
    recentMutationsStack[existingIdx] = mutation;
  } else {
    recentMutationsStack.unshift(mutation);
    if (recentMutationsStack.length > 50) {
      recentMutationsStack.pop();
    }
  }
}

export function getLatestUndoableMutation(): CrudMutationData | null {
  return (
    recentMutationsStack.find(
      (m) => m.status === "completed" && (m.beforeData || m.afterData)
    ) || null
  );
}

const ENTITY_TABLE_LABELS: Record<CrudEntityTable, string> = {
  rooftops: "Customer Account (Rooftop)",
  dealer_groups: "Dealer Group",
  people: "Customer Individual",
  user_invites: "Portal Invite",
  payment_terms: "Payment Term",
  contracts: "Customer Contract",
  orders: "Sales Order",
  portal_quotes: "Sales Quote",
  invoices: "Invoice",
  catalog_products: "Catalog Product",
  suppliers: "Supplier",
  purchase_orders: "Purchase Order",
  shipments: "Shipment",
  hr_employees: "Employee",
  company_assets: "Fleet Vehicle / Asset",
  delivery_routes: "Delivery Route",
  inv_bins: "Warehouse Bin",
  coupons: "Promo Coupon",
};

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  code: "Code",
  status: "Status",
  city: "City",
  state: "State",
  zip_code: "ZIP Code",
  address_line1: "Street Address",
  phone: "Phone",
  billing_email: "Billing Email",
  email: "Email Address",
  role: "Portal Role",
  invitee_type: "Invitee Type",
  access_system: "Access System",
  accepted_at: "Accepted At",
  term_value: "Term Schedule",
  description: "Description",
  pricing_tier: "Pricing Tier",
  ebms_salesman: "Assigned Rep",
  delivery_route: "Delivery Route",
  ship_via: "Dispatch Route",
  payment_terms: "Payment Terms",
  terms: "Terms",
  credit_limit: "Credit Limit",
  website_url: "Website",
  tax_exempt: "Tax Exempt",
  order_number: "Order Number",
  ebms_quote_number: "Quote Number",
  customer_name: "Dealership Customer",
  sales_rep_name: "Sales Rep",
  sales_agent_name: "Sales Rep",
  total: "Total Amount",
  total_amount: "Total Amount",
  subtotal: "Subtotal",
  tax: "Sales Tax",
  payment_status: "Payment Status",
  po_number: "PO Number",
  shipment_number: "Shipment Number",
  carrier: "Carrier",
  service: "Service Level",
  tracking_number: "Tracking Number",
  invoice_number: "Invoice Number",
  open_balance: "Open Balance",
  balance: "Balance Due",
  paid_amount: "Paid Amount",
  due_date: "Due Date",
  expected_date: "Expected Date",
  start_date: "Start Date",
  end_date: "End Date",
  title: "Title",
  scope: "Contract Scope",
  custom_sku: "SKU",
  erp_sku: "ERP SKU",
  price: "Unit Price",
  cost: "Unit Cost",
  category: "Category",
  brand: "Brand",
  inventory_qty: "Stock Qty",
  stock_status: "Stock Status",
  company_name: "Company Name",
  contact_name: "Contact Person",
  first_name: "First Name",
  last_name: "Last Name",
  employee_number: "Employee ID",
  department: "Department",
  role_title: "Job Title",
  compensation_type: "Pay Type",
  hourly_rate: "Hourly Rate",
  salary_annual: "Annual Salary",
  is_active: "Active",
  active: "Active",
  asset_number: "Asset Code",
  asset_type: "Asset Type",
  make: "Make",
  model: "Model",
  year: "Year",
  vin: "VIN",
  license_plate: "License Plate",
  mileage: "Mileage",
  assigned_driver: "Assigned Driver",
  freight_type: "Freight Type",
  freight_amount_rule: "Freight Rule",
  capacity_units: "Bin Capacity",
  prefix: "Coupon Prefix",
};

function formatFieldLabel(field: string): string {
  return FIELD_LABELS[field] || formatLabel(field);
}

function nowTimeLabel(): string {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

async function logAuditMutation(params: {
  actor?: string;
  action: string;
  entity: string;
  entityId: string;
  changes: any;
}) {
  try {
    await supabaseServer.from("audit_logs").insert({
      actor: params.actor || "SARA Live CRUD",
      action: params.action,
      entity: params.entity,
      entity_id: String(params.entityId),
      changes: params.changes,
    });
  } catch {
    // Non-blocking if audit_logs insert fails
  }
}

function computeChangesDiff(
  before: Record<string, any> | null | undefined,
  after: Record<string, any> | null | undefined,
  fieldsOfInterest?: string[]
): CrudFieldChange[] {
  const changes: CrudFieldChange[] = [];
  const ignoredKeys = new Set([
    "id",
    "created_at",
    "updated_at",
    "email_ci",
    "meta",
    "pricing_levels",
    "images",
    "fulfillment_request_json",
    "permissions",
    "notification_preferences",
    "ebms_salesperson_aliases",
    "overrides",
    "items",
  ]);

  if (!before && after) {
    // CREATE diff
    const keys = fieldsOfInterest || Object.keys(after);
    for (const k of keys) {
      if (ignoredKeys.has(k)) continue;
      const val = after[k];
      if (val !== null && val !== undefined && String(val).trim() !== "") {
        changes.push({
          field: k,
          label: formatFieldLabel(k),
          before: null,
          after: val,
        });
      }
    }
    return changes.slice(0, 10);
  }

  if (before && !after) {
    // DELETE diff
    const keys = fieldsOfInterest || Object.keys(before);
    for (const k of keys) {
      if (ignoredKeys.has(k)) continue;
      const val = before[k];
      if (val !== null && val !== undefined && String(val).trim() !== "") {
        changes.push({
          field: k,
          label: formatFieldLabel(k),
          before: val,
          after: null,
        });
      }
    }
    return changes.slice(0, 10);
  }

  if (before && after) {
    // UPDATE diff
    const keys = fieldsOfInterest || Object.keys(after);
    for (const k of keys) {
      if (ignoredKeys.has(k)) continue;
      const bVal = before[k];
      const aVal = after[k];
      if (String(bVal ?? "") !== String(aVal ?? "")) {
        changes.push({
          field: k,
          label: formatFieldLabel(k),
          before: bVal ?? "None",
          after: aVal ?? "None",
        });
      }
    }
  }

  return changes;
}

/**
 * Generates a clean rooftop code from a dealership name (e.g., "Apex Motors LLC" -> "APEX-104")
 */
function generateRooftopCode(name: string): string {
  const words = name
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const prefix =
    words.length >= 2
      ? (words[0].slice(0, 2) + words[1].slice(0, 2)).toUpperCase()
      : (words[0] || "DLR").slice(0, 4).toUpperCase();
  const suffix = String(Math.floor(100 + Math.random() * 899));
  return `${prefix}-${suffix}`;
}

/**
 * Resolve a target record in a table by ID, code/number, or name
 */
export async function findTargetRecord(
  table: CrudEntityTable,
  identifier: string
): Promise<Record<string, any> | null> {
  const cleanId = (identifier || "").trim();
  if (!cleanId) return null;

  // 1. Check UUID match first
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      cleanId
    );
  if (isUuid) {
    const { data } = await supabaseServer
      .from(table)
      .select("*")
      .eq("id", cleanId)
      .maybeSingle();
    if (data) return data;
  }

  if (table === "rooftops") {
    // Try exact/ilike code or name
    const { data: byCode } = await supabaseServer
      .from("rooftops")
      .select("*")
      .ilike("code", cleanId)
      .limit(1);
    if (byCode && byCode.length > 0) return byCode[0];

    const { data: byExactName } = await supabaseServer
      .from("rooftops")
      .select("*")
      .ilike("name", cleanId)
      .limit(1);
    if (byExactName && byExactName.length > 0) return byExactName[0];

    const { data: byFuzzyName } = await supabaseServer
      .from("rooftops")
      .select("*")
      .or(`name.ilike.%${cleanId}%,code.ilike.%${cleanId}%`)
      .order("created_at", { ascending: false })
      .limit(1);
    return byFuzzyName?.[0] || null;
  }

  if (table === "orders") {
    const stripped = cleanId.replace(/^SO-/i, "").trim();
    const { data } = await supabaseServer
      .from("orders")
      .select("*")
      .or(
        `order_number.ilike.${cleanId},order_number.ilike.SO-${stripped},order_number.ilike.${stripped},customer_name.ilike.%${cleanId}%`
      )
      .order("created_at", { ascending: false })
      .limit(1);
    return data?.[0] || null;
  }

  if (table === "invoices") {
    const stripped = cleanId.replace(/^INV-/i, "").trim();
    const { data } = await supabaseServer
      .from("invoices")
      .select("*")
      .or(
        `invoice_number.ilike.${cleanId},invoice_number.ilike.INV-${stripped},invoice_number.ilike.${stripped}`
      )
      .order("created_at", { ascending: false })
      .limit(1);
    return data?.[0] || null;
  }

  if (table === "catalog_products") {
    const { data } = await supabaseServer
      .from("catalog_products")
      .select("*")
      .or(
        `custom_sku.ilike.${cleanId},erp_sku.ilike.${cleanId},name.ilike.%${cleanId}%`
      )
      .limit(1);
    return data?.[0] || null;
  }

  if (table === "suppliers") {
    const { data } = await supabaseServer
      .from("suppliers")
      .select("*")
      .or(`name.ilike.%${cleanId}%,company_name.ilike.%${cleanId}%`)
      .limit(1);
    return data?.[0] || null;
  }

  if (table === "dealer_groups") {
    const { data } = await supabaseServer
      .from("dealer_groups")
      .select("*")
      .or(`name.ilike.%${cleanId}%,code.ilike.%${cleanId}%`)
      .limit(1);
    return data?.[0] || null;
  }

  if (table === "people") {
    const { data } = await supabaseServer
      .from("people")
      .select("*")
      .or(`email.ilike.${cleanId},name.ilike.${cleanId},name.ilike.%${cleanId}%,email.ilike.%${cleanId}%,phone.ilike.%${cleanId}%`)
      .order("created_at", { ascending: false })
      .limit(1);
    return data?.[0] || null;
  }

  if (table === "user_invites") {
    const { data } = await supabaseServer
      .from("user_invites")
      .select("*")
      .or(`email.ilike.${cleanId},email.ilike.%${cleanId}%`)
      .order("created_at", { ascending: false })
      .limit(1);
    return data?.[0] || null;
  }

  if (table === "payment_terms") {
    const { data } = await supabaseServer
      .from("payment_terms")
      .select("*")
      .or(`code.ilike.${cleanId},code.ilike.%${cleanId}%,term_value.ilike.%${cleanId}%,description.ilike.%${cleanId}%`)
      .limit(1);
    return data?.[0] || null;
  }

  if (table === "contracts") {
    const { data } = await supabaseServer
      .from("contracts")
      .select("*")
      .or(`name.ilike.%${cleanId}%,title.ilike.%${cleanId}%`)
      .order("created_at", { ascending: false })
      .limit(1);
    return data?.[0] || null;
  }

  if (table === "portal_quotes") {
    const stripped = cleanId.replace(/^QT-/i, "").trim();
    const { data } = await supabaseServer
      .from("portal_quotes")
      .select("*")
      .or(`ebms_quote_number.ilike.${cleanId},ebms_quote_number.ilike.${stripped},customer_name.ilike.%${cleanId}%`)
      .order("created_at", { ascending: false })
      .limit(1);
    return data?.[0] || null;
  }

  if (table === "purchase_orders") {
    const stripped = cleanId.replace(/^PO-/i, "").trim();
    const { data } = await supabaseServer
      .from("purchase_orders")
      .select("*")
      .or(`po_number.ilike.${cleanId},po_number.ilike.${stripped},notes.ilike.%${cleanId}%`)
      .order("created_at", { ascending: false })
      .limit(1);
    return data?.[0] || null;
  }

  if (table === "shipments") {
    const stripped = cleanId.replace(/^(?:SHP-|DS-)/i, "").trim();
    const { data } = await supabaseServer
      .from("shipments")
      .select("*")
      .or(`shipment_number.ilike.${cleanId},shipment_number.ilike.DS-${stripped},shipment_number.ilike.SHP-${stripped},tracking_number.ilike.%${cleanId}%`)
      .order("created_at", { ascending: false })
      .limit(1);
    return data?.[0] || null;
  }

  if (table === "hr_employees") {
    const parts = cleanId.split(/\s+/).filter(Boolean);
    const orClause =
      parts.length >= 2
        ? `and(first_name.ilike.%${parts[0]}%,last_name.ilike.%${parts[parts.length - 1]}%),email.ilike.%${cleanId}%,employee_number.ilike.${cleanId}`
        : `first_name.ilike.%${cleanId}%,last_name.ilike.%${cleanId}%,email.ilike.%${cleanId}%,employee_number.ilike.${cleanId}`;
    const { data } = await supabaseServer
      .from("hr_employees")
      .select("*")
      .or(orClause)
      .limit(1);
    return data?.[0] || null;
  }

  if (table === "company_assets") {
    const { data } = await supabaseServer
      .from("company_assets")
      .select("*")
      .or(`asset_number.ilike.%${cleanId}%,name.ilike.%${cleanId}%,license_plate.ilike.%${cleanId}%,vin.ilike.%${cleanId}%`)
      .limit(1);
    return data?.[0] || null;
  }

  if (table === "delivery_routes") {
    const { data } = await supabaseServer
      .from("delivery_routes")
      .select("*")
      .or(`code.ilike.%${cleanId}%,name.ilike.%${cleanId}%`)
      .limit(1);
    return data?.[0] || null;
  }

  if (table === "inv_bins") {
    if (/^\d+$/.test(cleanId)) {
      const { data: byId } = await supabaseServer
        .from("inv_bins")
        .select("*")
        .eq("id", Number(cleanId))
        .maybeSingle();
      if (byId) return byId;
    }
    const { data } = await supabaseServer
      .from("inv_bins")
      .select("*")
      .or(`code.ilike.%${cleanId}%,name.ilike.%${cleanId}%`)
      .limit(1);
    return data?.[0] || null;
  }

  if (table === "coupons") {
    const { data } = await supabaseServer
      .from("coupons")
      .select("*")
      .or(`code.ilike.%${cleanId}%,prefix.ilike.%${cleanId}%`)
      .limit(1);
    return data?.[0] || null;
  }

  return null;
}

function getRecordTitleAndCode(
  table: CrudEntityTable,
  row: Record<string, any>
): { title: string; code: string } {
  if (table === "rooftops") {
    return {
      title: formatCleanEntityName(row.name || "Customer Account"),
      code: row.code || String(row.id || "").slice(0, 8),
    };
  }
  if (table === "people") {
    return {
      title: formatCleanEntityName(row.name || row.email || "Customer Individual"),
      code: row.email || row.phone || "Individual",
    };
  }
  if (table === "user_invites") {
    return {
      title: `Portal Invite — ${row.email || "User"}`,
      code: String(row.role || "member").toUpperCase(),
    };
  }
  if (table === "payment_terms") {
    return {
      title: `Payment Term: ${row.code || row.term_value || "Standard"}`,
      code: String(row.code || "TERM").toUpperCase(),
    };
  }
  if (table === "contracts") {
    return {
      title: formatCleanEntityName(row.title || row.name || "Customer Contract"),
      code: String(row.scope || "contract").toUpperCase(),
    };
  }
  if (table === "orders") {
    const rawNo = String(row.order_number || "");
    const ordNo = rawNo.startsWith("SO-") ? rawNo : `SO-${rawNo}`;
    return {
      title: `${ordNo} (${formatCleanEntityName(row.customer_name || "Dealership Order")})`,
      code: ordNo,
    };
  }
  if (table === "portal_quotes") {
    const qNo = row.ebms_quote_number || `QT-${String(row.id || "").slice(0, 6).toUpperCase()}`;
    return {
      title: `${qNo} (${formatCleanEntityName(row.customer_name || "Sales Quote")})`,
      code: qNo,
    };
  }
  if (table === "invoices") {
    const rawInv = String(row.invoice_number || "");
    return {
      title: `Invoice ${rawInv}`,
      code: rawInv,
    };
  }
  if (table === "catalog_products") {
    return {
      title: formatCleanEntityName(row.name || "Catalog Product"),
      code: row.custom_sku || row.erp_sku || String(row.id || "").slice(0, 8),
    };
  }
  if (table === "suppliers") {
    return {
      title: formatCleanEntityName(row.name || row.company_name || "Supplier"),
      code: row.state ? `${row.city || ""} ${row.state}`.trim() : "Vendor",
    };
  }
  if (table === "purchase_orders") {
    const poNo = String(row.po_number || "").startsWith("PO-")
      ? String(row.po_number)
      : `PO-${row.po_number}`;
    return {
      title: `Purchase Order ${poNo}`,
      code: poNo,
    };
  }
  if (table === "shipments") {
    return {
      title: `Shipment ${row.shipment_number || "SHP"}`,
      code: String(row.shipment_number || "SHP"),
    };
  }
  if (table === "hr_employees") {
    const fullName = formatCleanEntityName(
      `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.email || "Employee"
    );
    return {
      title: fullName,
      code: row.employee_number || row.department || "HR",
    };
  }
  if (table === "company_assets") {
    return {
      title: formatCleanEntityName(row.name || "Fleet Asset"),
      code: row.asset_number || row.license_plate || "FLEET",
    };
  }
  if (table === "delivery_routes") {
    return {
      title: formatCleanEntityName(row.name || "Delivery Route"),
      code: row.code || "ROUTE",
    };
  }
  if (table === "inv_bins") {
    return {
      title: formatCleanEntityName(row.name || `Warehouse Bin ${row.code}`),
      code: row.code || `BIN-${row.id}`,
    };
  }
  if (table === "coupons") {
    return {
      title: `Coupon ${row.code || "PROMO"}`,
      code: row.code || "PROMO",
    };
  }
  return {
    title: formatCleanEntityName(row.name || "Dealer Group"),
    code: row.code || "Group",
  };
}

/**
 * CREATE operation across supported ERP tables
 */
export async function executeCrudCreate(params: {
  table: CrudEntityTable;
  fields: Record<string, any>;
  actor?: string;
}): Promise<{ success: boolean; mutation?: CrudMutationData; error?: string }> {
  const { table, fields, actor } = params;
  try {
    const childSnapshots: NonNullable<CrudMutationData["childSnapshots"]> = [];
    let insertPayload: Record<string, any> = {};

    if (table === "rooftops") {
      const cleanName = formatCleanEntityName(
        fields.name || fields.customer_name || "New Dealership Rooftop"
      );
      const code =
        fields.code ||
        fields.rooftop_code ||
        generateRooftopCode(cleanName);

      // Optional Dealer Group resolution or creation
      let groupId = fields.group_id || null;
      const groupName = fields.group_name || fields.dealer_group || null;
      if (!groupId && groupName) {
        const { data: existingGrp } = await supabaseServer
          .from("dealer_groups")
          .select("id, name")
          .ilike("name", `%${String(groupName).trim()}%`)
          .limit(1);
        if (existingGrp && existingGrp.length > 0) {
          groupId = existingGrp[0].id;
        } else {
          const { data: createdGrp } = await supabaseServer
            .from("dealer_groups")
            .insert({
              name: formatCleanEntityName(groupName),
              code: generateRooftopCode(groupName),
              city: fields.city || "Columbus",
              state: fields.state || "OH",
              terms: fields.payment_terms || fields.terms || "Net 30",
              credit_limit: Number(fields.credit_limit || 50000),
            })
            .select("*")
            .single();
          if (createdGrp) {
            groupId = createdGrp.id;
          }
        }
      }

      insertPayload = {
        name: cleanName,
        code: String(code).toUpperCase(),
        status: (fields.status || "active").toLowerCase(),
        city: formatCleanEntityName(fields.city || "Columbus"),
        state: String(fields.state || "OH").toUpperCase(),
        zip_code: fields.zip_code || fields.zip || "43215",
        address_line1:
          fields.address_line1 ||
          fields.address ||
          `${Math.floor(100 + Math.random() * 8900)} Auto Mall Pkwy`,
        country: fields.country || "US",
        phone: fields.phone || "614-555-0199",
        billing_email:
          fields.billing_email ||
          fields.email ||
          `ap@${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
        delivery_route: fields.delivery_route || fields.route || "John's Route",
        payment_terms: fields.payment_terms || fields.terms || "Net 30",
        terms: fields.terms || fields.payment_terms || "Net 30",
        credit_limit: Number(fields.credit_limit ?? 25000),
        tax_exempt: Boolean(fields.tax_exempt ?? false),
        website_url: fields.website_url || null,
        ...(groupId ? { group_id: groupId } : {}),
      };
    } else if (table === "orders") {
      const randOrd = `SO-${Math.floor(107000 + Math.random() * 9000)}`;
      const ordNo = fields.order_number || randOrd;
      const custName = formatCleanEntityName(
        fields.customer_name || fields.name || "GoldTouch Partner Dealership"
      );
      const matchedRoof = await findTargetRecord("rooftops", custName);
      const totalVal = Number(fields.total ?? fields.amount ?? 245.0);
      const subtotalVal = Number(
        fields.subtotal ?? (totalVal / 1.07).toFixed(2)
      );
      const taxVal = Number(
        fields.tax ?? (totalVal - subtotalVal).toFixed(2)
      );

      insertPayload = {
        order_number: ordNo,
        customer_name: matchedRoof?.name || custName,
        ...(matchedRoof?.id ? { rooftop_id: matchedRoof.id } : {}),
        status: (fields.status || "processing").toLowerCase(),
        order_type: fields.order_type || "standard",
        ship_via:
          fields.ship_via ||
          fields.delivery_route ||
          matchedRoof?.delivery_route ||
          "John's Route",
        payment_terms:
          fields.payment_terms || matchedRoof?.payment_terms || "Net 30",
        sales_rep_name: fields.sales_rep_name || "Michael Wanegar",
        total: totalVal,
        subtotal: subtotalVal,
        tax: taxVal,
        payment_status: fields.payment_status || "unpaid",
        shipping_address:
          fields.shipping_address ||
          [matchedRoof?.address_line1, matchedRoof?.city, matchedRoof?.state]
            .filter(Boolean)
            .join(", ") ||
          "Columbus, OH",
      };
    } else if (table === "invoices") {
      const randInv = `INV-${Math.floor(107000 + Math.random() * 9000)}`;
      const invNo = fields.invoice_number || randInv;
      const custName =
        fields.customer_name || fields.name || "GoldTouch Partner Dealership";
      const matchedRoof = await findTargetRecord("rooftops", custName);
      const totalVal = Number(fields.total ?? fields.amount ?? 350.0);
      const statusVal = (fields.status || "open").toLowerCase();
      const openBal =
        statusVal === "paid"
          ? 0
          : Number(fields.open_balance ?? fields.balance ?? totalVal);

      insertPayload = {
        invoice_number: invNo,
        ...(matchedRoof?.id
          ? {
              customer_id: matchedRoof.id,
              bill_to_customer_id: matchedRoof.id,
            }
          : {}),
        status: statusVal,
        total: totalVal,
        balance: openBal,
        open_balance: openBal,
        paid_amount: Math.max(0, totalVal - openBal),
        invoice_date:
          fields.invoice_date || new Date().toISOString().slice(0, 10),
        due_date:
          fields.due_date ||
          new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        billing_email_snapshot:
          fields.billing_email ||
          matchedRoof?.billing_email ||
          "ap@dealership.com",
        payment_terms_snapshot:
          fields.payment_terms || matchedRoof?.payment_terms || "Net 30",
      };
    } else if (table === "catalog_products") {
      const skuCode = String(
        fields.custom_sku ||
          fields.sku ||
          `GT-${Math.floor(1000 + Math.random() * 8999)}`
      ).toUpperCase();
      const prodName = formatCleanEntityName(
        fields.name || "GoldTouch Dealership Supply Item"
      );
      insertPayload = {
        name: prodName,
        raw_name: prodName,
        custom_sku: skuCode,
        erp_sku: fields.erp_sku || skuCode,
        price: Number(fields.price ?? 29.95),
        cost: Number(fields.cost ?? 14.5),
        category: fields.category || "Automotive Supply",
        sub_category: fields.sub_category || "Dealership Operations",
        brand: fields.brand || "GoldTouch",
        inventory_qty: Number(fields.inventory_qty ?? fields.stock ?? 100),
        stock_status: fields.stock_status || "in_stock",
        description:
          fields.description ||
          `${prodName} (${skuCode}) — Commercial dealership supply item.`,
      };
    } else if (table === "suppliers") {
      const supName = formatCleanEntityName(
        fields.name || fields.company_name || "New Supply Partner"
      );
      insertPayload = {
        name: supName,
        company_name: supName,
        contact_name: fields.contact_name || "Account Desk",
        email:
          fields.email ||
          `orders@${supName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
        phone: fields.phone || "800-555-0140",
        city: formatCleanEntityName(fields.city || "Cleveland"),
        state: String(fields.state || "OH").toUpperCase(),
        payment_terms: fields.payment_terms || "Net 30",
        average_lead_time_days: Number(fields.average_lead_time_days ?? 5),
        quality_rating: Number(fields.quality_rating ?? 4.8),
        is_active: true,
        is_preferred: Boolean(fields.is_preferred ?? true),
      };
    } else if (table === "dealer_groups") {
      const grpName = formatCleanEntityName(
        fields.name || "New Automotive Group"
      );
      insertPayload = {
        name: grpName,
        code: fields.code || generateRooftopCode(grpName),
        city: formatCleanEntityName(fields.city || "Columbus"),
        state: String(fields.state || "OH").toUpperCase(),
        phone: fields.phone || "614-555-0100",
        email:
          fields.email ||
          `corporate@${grpName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
        terms: fields.terms || fields.payment_terms || "Net 30",
        credit_limit: Number(fields.credit_limit ?? 100000),
      };
    } else if (table === "people") {
      const personName = formatCleanEntityName(
        fields.name || fields.contact_name || "New Customer Individual"
      );
      const emailAddr = (
        fields.email ||
        fields.billing_email ||
        `${personName.toLowerCase().replace(/[^a-z0-9]/g, ".")}@dealership.com`
      ).toLowerCase();
      insertPayload = {
        name: personName,
        email: emailAddr,
        phone: fields.phone || "614-555-0190",
        status: (fields.status || "active").toLowerCase(),
        city: fields.city ? formatCleanEntityName(fields.city) : "Columbus",
        state: fields.state ? String(fields.state).toUpperCase() : "OH",
        zip_code: fields.zip_code || fields.zip || "43215",
        address_line1: fields.address_line1 || fields.address || null,
        terms: fields.terms || fields.payment_terms || "Net 30",
        pricing_tier: fields.pricing_tier || "Dealer Preferred",
        delivery_route: fields.delivery_route || fields.route || "John's Route",
        ebms_salesman: fields.ebms_salesman || fields.sales_rep_name || "Michael Wanegar",
        notes: fields.notes || fields.description || null,
      };
    } else if (table === "user_invites") {
      const rawEmail = (
        fields.email ||
        fields.billing_email ||
        (fields.name && String(fields.name).includes("@") ? fields.name : "") ||
        `buyer${Math.floor(100 + Math.random() * 899)}@dealership.com`
      )
        .trim()
        .toLowerCase();
      insertPayload = {
        email: rawEmail,
        role: (fields.role || "member").toLowerCase(),
        invitee_type: fields.invitee_type || "external_customer",
        access_system: fields.access_system || "portal",
      };
    } else if (table === "payment_terms") {
      const rawCode = String(
        fields.code ||
          fields.name ||
          fields.payment_terms ||
          fields.terms ||
          `NET-${Math.floor(15 + Math.random() * 75)}`
      )
        .trim()
        .toUpperCase();
      const termValue =
        fields.term_value ||
        fields.value ||
        (rawCode.startsWith("NET")
          ? `Due in ${rawCode.replace(/[^0-9]/g, "") || "30"} days`
          : formatCleanEntityName(rawCode));
      insertPayload = {
        code: rawCode,
        term_value: termValue,
        description:
          fields.description ||
          `Payment is due according to ${termValue} terms from the invoice date.`,
      };
    } else if (table === "contracts") {
      const contractTitle = formatCleanEntityName(
        fields.title || fields.name || "Dealership Supply Master Agreement"
      );
      insertPayload = {
        name: contractTitle,
        title: contractTitle,
        scope: (fields.scope || "rooftop").toLowerCase(),
        start_date:
          fields.start_date || new Date().toISOString().slice(0, 10),
        end_date:
          fields.end_date ||
          new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
        status: (fields.status || "active").toLowerCase(),
        notes: fields.notes || fields.description || "Active dealership pricing & supply contract",
      };
    } else if (table === "portal_quotes") {
      const quoteNo =
        fields.ebms_quote_number ||
        fields.code ||
        `QT-${Math.floor(10000 + Math.random() * 89999)}`;
      const custName = formatCleanEntityName(
        fields.customer_name || fields.name || "GoldTouch Partner Dealership"
      );
      const totalVal = Number(fields.total ?? fields.amount ?? 420.0);
      insertPayload = {
        ebms_quote_number: quoteNo,
        customer_name: custName,
        sales_agent_name: fields.sales_agent_name || fields.sales_rep_name || "Michael Wanegar",
        source: "crm",
        status: (fields.status || "pending").toLowerCase(),
        currency: "USD",
        subtotal: Number((totalVal / 1.07).toFixed(2)),
        shipping_total: 0,
        tax_total: Number((totalVal - totalVal / 1.07).toFixed(2)),
        total: totalVal,
        ship_via: fields.ship_via || fields.delivery_route || "John's Route",
        notes: fields.notes || fields.description || null,
      };
    } else if (table === "purchase_orders") {
      const poNo = String(
        fields.po_number ||
          fields.code ||
          `${Math.floor(32000 + Math.random() * 7999)}`
      ).replace(/^PO-/i, "");
      const totalVal = Number(fields.total_amount ?? fields.total ?? fields.amount ?? 1250.0);
      insertPayload = {
        po_number: poNo,
        status: (fields.status || "open").toLowerCase(),
        currency: "USD",
        terms: fields.terms || fields.payment_terms || "Net 30",
        expected_date:
          fields.expected_date ||
          new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        notes: fields.notes || fields.description || fields.name || "Vendor Restock PO",
        ship_to_location_id: 3,
        subtotal: totalVal,
        total_amount: totalVal,
      };
    } else if (table === "shipments") {
      const shpNo =
        fields.shipment_number ||
        fields.code ||
        `DS-${Math.floor(3000 + Math.random() * 6999)}`;
      insertPayload = {
        shipment_number: shpNo,
        status: (fields.status || "in_transit").toLowerCase(),
        ship_date: new Date().toISOString(),
        carrier: fields.carrier || "GoldTouch Route Fleet",
        service: fields.service || fields.delivery_route || "Direct Dealer Delivery",
        tracking_number:
          fields.tracking_number || `1ZGT${Math.floor(10000000 + Math.random() * 89999999)}`,
        notes: fields.notes || fields.description || null,
      };
    } else if (table === "hr_employees") {
      const fullName = formatCleanEntityName(fields.name || "New Team Member");
      const nameParts = fullName.split(/\s+/);
      const firstName = fields.first_name || nameParts[0] || "Staff";
      const lastName =
        fields.last_name || nameParts.slice(1).join(" ") || "Member";
      const empCode =
        fields.employee_number ||
        fields.code ||
        `${lastName.slice(0, 3).toUpperCase()}${firstName.slice(0, 3).toUpperCase()}`;
      insertPayload = {
        first_name: firstName,
        last_name: lastName,
        employee_number: empCode,
        email:
          fields.email ||
          `${firstName.toLowerCase()}@goldtouchds.com`,
        phone: fields.phone || "(740) 555-0192",
        department: fields.department || "Operations",
        role_title: fields.role_title || fields.role || "Operations Specialist",
        compensation_type: fields.compensation_type || "salary",
        hourly_rate: Number(fields.hourly_rate ?? 26.5),
        salary_annual: Number(fields.salary_annual ?? 55000),
        is_active: true,
        home_address_city: fields.city || "Marietta",
        home_address_state: fields.state || "OH",
      };
    } else if (table === "company_assets") {
      const assetName = formatCleanEntityName(
        fields.name || "2025 Ford Transit 250"
      );
      insertPayload = {
        asset_number:
          fields.asset_number ||
          fields.code ||
          `VAN-${Math.floor(100 + Math.random() * 899)}`,
        name: assetName,
        asset_type: (fields.asset_type || "vehicle").toLowerCase(),
        status: (fields.status || "active").toLowerCase(),
        make: fields.make || "Ford",
        model: fields.model || "Transit",
        year: Number(fields.year ?? 2025),
        license_plate: fields.license_plate || `GT-${Math.floor(1000 + Math.random() * 8999)}`,
        mileage: Number(fields.mileage ?? 1200),
        assigned_driver: fields.assigned_driver || "Route Driver",
      };
    } else if (table === "delivery_routes") {
      const routeName = formatCleanEntityName(fields.name || "New Delivery Route");
      insertPayload = {
        code: (
          fields.code ||
          routeName.toUpperCase().replace(/[^A-Z0-9]/g, "_").slice(0, 12)
        ).toUpperCase(),
        name: routeName,
        freight_type: fields.freight_type || "ROUTE",
        freight_amount_rule: fields.freight_amount_rule || "Standard Route Delivery",
        is_active: true,
      };
    } else if (table === "inv_bins") {
      const binCode = String(
        fields.code || `BIN-${Math.floor(100 + Math.random() * 899)}`
      ).toUpperCase();
      insertPayload = {
        location_id: Number(fields.location_id ?? 3),
        code: binCode,
        name: formatCleanEntityName(fields.name || `Storage Bin ${binCode}`),
        capacity_units: Number(fields.capacity_units ?? 500),
        is_active: true,
      };
    } else if (table === "coupons") {
      const digits = String(Math.floor(100000 + Math.random() * 899999));
      const prefix = String(fields.prefix || "GOLD2026").toUpperCase();
      const couponCode = String(
        fields.code || `${prefix}-${digits}`
      ).toUpperCase();
      insertPayload = {
        code: couponCode,
        prefix,
        digits,
        active: true,
      };
    }

    const { data: createdRow, error } = await supabaseServer
      .from(table)
      .insert(insertPayload)
      .select("*")
      .single();

    if (error || !createdRow) {
      return {
        success: false,
        error: error?.message || `Failed to create ${ENTITY_TABLE_LABELS[table]}`,
      };
    }

    // If we created a rooftop, also seed default Sales & Service departments
    if (table === "rooftops" && createdRow.id) {
      const defaultDepts = [
        {
          rooftop_id: createdRow.id,
          name: "Sales & F&I Department",
          type: "sales",
          code: `${createdRow.code}-SLS`,
          status: "active",
        },
        {
          rooftop_id: createdRow.id,
          name: "Service & Parts Department",
          type: "service",
          code: `${createdRow.code}-SVC`,
          status: "active",
        },
      ];
      const { data: insertedDepts } = await supabaseServer
        .from("departments")
        .insert(defaultDepts)
        .select("*");
      if (insertedDepts && insertedDepts.length > 0) {
        childSnapshots.push({
          table: "departments",
          foreignKey: "rooftop_id",
          rows: insertedDepts,
        });
      }
    }

    const { title, code } = getRecordTitleAndCode(table, createdRow);
    const changes = computeChangesDiff(null, createdRow, Object.keys(insertPayload));

    const mutation: CrudMutationData = {
      mutationId: `mut-create-${Date.now()}`,
      operation: "create",
      status: "completed",
      table,
      entityLabel: ENTITY_TABLE_LABELS[table],
      recordId: String(createdRow.id),
      recordCode: code,
      recordTitle: title,
      beforeData: null,
      afterData: createdRow,
      childSnapshots,
      changes,
      timestamp: nowTimeLabel(),
      actor: actor || "SARA Live CRUD",
    };

    pushCompletedMutation(mutation);
    await logAuditMutation({
      actor,
      action: "CREATE",
      entity: table,
      entityId: String(createdRow.id),
      changes: insertPayload,
    });

    return { success: true, mutation };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * UPDATE operation across supported ERP tables
 */
export async function executeCrudUpdate(params: {
  table: CrudEntityTable;
  identifier: string;
  updates: Record<string, any>;
  actor?: string;
}): Promise<{ success: boolean; mutation?: CrudMutationData; error?: string }> {
  const { table, identifier, updates, actor } = params;
  try {
    const existingRow = await findTargetRecord(table, identifier);
    if (!existingRow) {
      return {
        success: false,
        error: `Could not find ${ENTITY_TABLE_LABELS[table]} matching "${identifier}".`,
      };
    }

    // Filter updates to only valid columns present on existingRow
    const validUpdates: Record<string, any> = {};
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined || k === "id" || k === "email_ci") continue;
      if (k in existingRow) {
        validUpdates[k] = v;
      } else if (k === "route" && "delivery_route" in existingRow) {
        validUpdates["delivery_route"] = v;
      } else if (k === "route" && "ship_via" in existingRow) {
        validUpdates["ship_via"] = v;
      } else if (k === "email" && "billing_email" in existingRow) {
        validUpdates["billing_email"] = v;
      } else if (k === "billing_email" && "email" in existingRow) {
        validUpdates["email"] = v;
      } else if (k === "email" && "billing_email_snapshot" in existingRow) {
        validUpdates["billing_email_snapshot"] = v;
      } else if (k === "terms" && "payment_terms" in existingRow) {
        validUpdates["payment_terms"] = v;
        if ("terms" in existingRow) validUpdates["terms"] = v;
      } else if (k === "payment_terms" && "terms" in existingRow && !("payment_terms" in existingRow)) {
        validUpdates["terms"] = v;
      } else if ((k === "value" || k === "term_value" || k === "terms") && "term_value" in existingRow) {
        validUpdates["term_value"] = v;
      } else if (k === "sku" && "custom_sku" in existingRow) {
        validUpdates["custom_sku"] = v;
      } else if (k === "stock" && "inventory_qty" in existingRow) {
        validUpdates["inventory_qty"] = Number(v);
      } else if (k === "amount" && "total" in existingRow) {
        validUpdates["total"] = Number(v);
      } else if ((k === "amount" || k === "total") && "total_amount" in existingRow) {
        validUpdates["total_amount"] = Number(v);
      } else if (k === "sales_rep_name" && "ebms_salesman" in existingRow) {
        validUpdates["ebms_salesman"] = v;
      } else if (k === "sales_rep_name" && "sales_agent_name" in existingRow) {
        validUpdates["sales_agent_name"] = v;
      }
    }

    // Special handling when marking an invoice as paid
    if (
      table === "invoices" &&
      typeof validUpdates.status === "string" &&
      validUpdates.status.toLowerCase() === "paid"
    ) {
      validUpdates.status = "paid";
      if (validUpdates.open_balance === undefined) validUpdates.open_balance = 0;
      if (validUpdates.balance === undefined) validUpdates.balance = 0;
      if (validUpdates.paid_amount === undefined) {
        validUpdates.paid_amount = Number(existingRow.total || 0);
      }
    }

    if (Object.keys(validUpdates).length === 0) {
      return {
        success: false,
        error: `No modifiable fields matched for ${ENTITY_TABLE_LABELS[table]}.`,
      };
    }

    const { data: updatedRow, error } = await supabaseServer
      .from(table)
      .update(validUpdates)
      .eq("id", existingRow.id)
      .select("*")
      .single();

    if (error || !updatedRow) {
      return {
        success: false,
        error: error?.message || `Failed to update ${ENTITY_TABLE_LABELS[table]}`,
      };
    }

    const { title, code } = getRecordTitleAndCode(table, updatedRow);
    const changes = computeChangesDiff(
      existingRow,
      updatedRow,
      Object.keys(validUpdates)
    );

    const mutation: CrudMutationData = {
      mutationId: `mut-update-${Date.now()}`,
      operation: "update",
      status: "completed",
      table,
      entityLabel: ENTITY_TABLE_LABELS[table],
      recordId: String(updatedRow.id),
      recordCode: code,
      recordTitle: title,
      beforeData: existingRow,
      afterData: updatedRow,
      changes,
      timestamp: nowTimeLabel(),
      actor: actor || "SARA Live CRUD",
    };

    pushCompletedMutation(mutation);
    await logAuditMutation({
      actor,
      action: "UPDATE",
      entity: table,
      entityId: String(updatedRow.id),
      changes: { before: existingRow, after: validUpdates },
    });

    return { success: true, mutation };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * STAGE 1 OF DELETE: Prepare Confirmation Gate (Does NOT delete from DB yet!)
 */
export async function prepareCrudDeleteConfirmation(params: {
  table: CrudEntityTable;
  identifier: string;
  actor?: string;
}): Promise<{ success: boolean; mutation?: CrudMutationData; error?: string }> {
  const { table, identifier, actor } = params;
  try {
    const existingRow = await findTargetRecord(table, identifier);
    if (!existingRow) {
      return {
        success: false,
        error: `Could not find ${ENTITY_TABLE_LABELS[table]} matching "${identifier}".`,
      };
    }

    const { title, code } = getRecordTitleAndCode(table, existingRow);
    const keyFieldsByTable: Record<CrudEntityTable, string[]> = {
      rooftops: [
        "name",
        "code",
        "city",
        "state",
        "delivery_route",
        "payment_terms",
        "phone",
        "billing_email",
      ],
      dealer_groups: ["name", "code", "city", "state", "terms", "credit_limit"],
      people: [
        "name",
        "email",
        "phone",
        "status",
        "terms",
        "delivery_route",
        "city",
        "state",
      ],
      user_invites: ["email", "role", "invitee_type", "access_system", "accepted_at"],
      payment_terms: ["code", "term_value", "description"],
      contracts: ["name", "title", "scope", "start_date", "end_date", "status"],
      orders: [
        "order_number",
        "customer_name",
        "status",
        "ship_via",
        "total",
        "sales_rep_name",
      ],
      portal_quotes: [
        "ebms_quote_number",
        "customer_name",
        "status",
        "total",
        "sales_agent_name",
      ],
      invoices: [
        "invoice_number",
        "status",
        "total",
        "open_balance",
        "due_date",
      ],
      catalog_products: [
        "name",
        "custom_sku",
        "price",
        "cost",
        "category",
        "inventory_qty",
      ],
      suppliers: ["name", "city", "state", "phone", "email", "payment_terms"],
      purchase_orders: ["po_number", "status", "terms", "total_amount", "expected_date"],
      shipments: ["shipment_number", "status", "carrier", "service", "tracking_number"],
      hr_employees: ["first_name", "last_name", "employee_number", "department", "role_title", "email"],
      company_assets: ["asset_number", "name", "asset_type", "status", "license_plate", "mileage"],
      delivery_routes: ["code", "name", "freight_type", "freight_amount_rule"],
      inv_bins: ["code", "name", "location_id", "capacity_units"],
      coupons: ["code", "prefix", "active"],
    };

    const changes = computeChangesDiff(
      existingRow,
      null,
      keyFieldsByTable[table]
    );

    const mutation: CrudMutationData = {
      mutationId: `mut-del-${Date.now()}`,
      operation: "delete",
      status: "pending_confirmation",
      table,
      entityLabel: ENTITY_TABLE_LABELS[table],
      recordId: String(existingRow.id),
      recordCode: code,
      recordTitle: title,
      beforeData: existingRow,
      afterData: null,
      changes,
      timestamp: nowTimeLabel(),
      actor: actor || "SARA Live CRUD",
    };

    return { success: true, mutation };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Strips Postgres generated columns (like `email_ci`) before `.update()` or `.upsert()`
 */
function sanitizeRowForUpsertOrUpdate(
  row: Record<string, any>,
  removeId: boolean = false
): Record<string, any> {
  const copy = { ...row };
  delete copy.email_ci;
  if (removeId) {
    delete copy.id;
  }
  return copy;
}

/**
 * STAGE 2 OF DELETE: Execute Confirmed Delete (Snapshots child rows & deletes from DB, with full Undo support)
 */
export async function executeConfirmedCrudDelete(
  pendingMutation: CrudMutationData,
  actor?: string
): Promise<{ success: boolean; mutation?: CrudMutationData; error?: string }> {
  try {
    const { table, recordId } = pendingMutation;
    const { data: currentRow } = await supabaseServer
      .from(table)
      .select("*")
      .eq("id", recordId)
      .maybeSingle();

    const rowToBackup = currentRow || pendingMutation.beforeData;
    if (!rowToBackup) {
      return {
        success: false,
        error: "Target record no longer exists in the database.",
      };
    }

    const childSnapshots: NonNullable<CrudMutationData["childSnapshots"]> = [];

    // Snapshot & remove dependent child records so FK constraints never block deletion
    // and everything can be 100% restored on Undo!
    if (table === "rooftops") {
      const { data: depts } = await supabaseServer
        .from("departments")
        .select("*")
        .eq("rooftop_id", recordId);
      if (depts && depts.length > 0) {
        childSnapshots.push({
          table: "departments",
          foreignKey: "rooftop_id",
          rows: depts,
        });
        await supabaseServer
          .from("departments")
          .delete()
          .eq("rooftop_id", recordId);
      }
    } else if (table === "orders") {
      const { data: lines } = await supabaseServer
        .from("order_lines")
        .select("*")
        .eq("order_id", recordId);
      if (lines && lines.length > 0) {
        childSnapshots.push({
          table: "order_lines",
          foreignKey: "order_id",
          rows: lines,
        });
        await supabaseServer
          .from("order_lines")
          .delete()
          .eq("order_id", recordId);
      }
    } else if (table === "invoices") {
      const { data: lines } = await supabaseServer
        .from("invoice_lines")
        .select("*")
        .eq("invoice_id", recordId);
      if (lines && lines.length > 0) {
        childSnapshots.push({
          table: "invoice_lines",
          foreignKey: "invoice_id",
          rows: lines,
        });
        await supabaseServer
          .from("invoice_lines")
          .delete()
          .eq("invoice_id", recordId);
      }
    }

    const { error } = await supabaseServer
      .from(table)
      .delete()
      .eq("id", recordId);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    const completedMutation: CrudMutationData = {
      ...pendingMutation,
      status: "completed",
      beforeData: rowToBackup,
      afterData: null,
      childSnapshots,
      timestamp: nowTimeLabel(),
    };

    pushCompletedMutation(completedMutation);
    await logAuditMutation({
      actor: actor || pendingMutation.actor,
      action: "DELETE",
      entity: table,
      entityId: recordId,
      changes: { deleted: rowToBackup },
    });

    return { success: true, mutation: completedMutation };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * ANTIGRAVITY-STYLE UNDO: Reverts any CREATE, UPDATE, or DELETE mutation in real time
 */
export async function executeCrudUndo(
  mutation: CrudMutationData,
  actor?: string
): Promise<{ success: boolean; mutation?: CrudMutationData; error?: string }> {
  try {
    const { operation, table, recordId, beforeData, childSnapshots } = mutation;

    if (operation === "create") {
      // Undo a CREATE -> Delete the created child rows & main record
      if (Array.isArray(childSnapshots)) {
        for (const snap of childSnapshots) {
          await supabaseServer
            .from(snap.table)
            .delete()
            .eq(snap.foreignKey, recordId);
        }
      }
      const { error } = await supabaseServer
        .from(table)
        .delete()
        .eq("id", recordId);
      if (error) {
        return { success: false, error: error.message };
      }
    } else if (operation === "update") {
      // Undo an UPDATE -> Restore beforeData columns
      if (!beforeData) {
        return {
          success: false,
          error: "Missing before-snapshot to undo this update.",
        };
      }
      const restorePayload = sanitizeRowForUpsertOrUpdate(beforeData, true);
      const { error } = await supabaseServer
        .from(table)
        .update(restorePayload)
        .eq("id", recordId);
      if (error) {
        return { success: false, error: error.message };
      }
    } else if (operation === "delete") {
      // Undo a DELETE -> Re-insert beforeData row and any child rows
      if (!beforeData) {
        return {
          success: false,
          error: "Missing record snapshot to restore deleted record.",
        };
      }
      const cleanBefore = sanitizeRowForUpsertOrUpdate(beforeData, false);
      const { error } = await supabaseServer
        .from(table)
        .upsert(cleanBefore, { onConflict: "id" });
      if (error) {
        return { success: false, error: error.message };
      }
      if (Array.isArray(childSnapshots)) {
        for (const snap of childSnapshots) {
          if (snap.rows && snap.rows.length > 0) {
            await supabaseServer
              .from(snap.table)
              .upsert(snap.rows, { onConflict: "id" });
          }
        }
      }
    }

    const undoneMutation: CrudMutationData = {
      ...mutation,
      status: "undone",
      timestamp: nowTimeLabel(),
    };

    pushCompletedMutation(undoneMutation);
    await logAuditMutation({
      actor: actor || mutation.actor,
      action: `UNDO_${operation.toUpperCase()}`,
      entity: table,
      entityId: recordId,
      changes: { reverted_operation: operation },
    });

    return { success: true, mutation: undoneMutation };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * ANTIGRAVITY-STYLE REDO: Re-applies an undone mutation in real time
 */
export async function executeCrudRedo(
  mutation: CrudMutationData,
  actor?: string
): Promise<{ success: boolean; mutation?: CrudMutationData; error?: string }> {
  try {
    const { operation, table, recordId, afterData, childSnapshots } = mutation;

    if (operation === "create") {
      if (!afterData) {
        return { success: false, error: "Missing snapshot to redo creation." };
      }
      const cleanAfter = sanitizeRowForUpsertOrUpdate(afterData, false);
      const { error } = await supabaseServer
        .from(table)
        .upsert(cleanAfter, { onConflict: "id" });
      if (error) return { success: false, error: error.message };

      if (Array.isArray(childSnapshots)) {
        for (const snap of childSnapshots) {
          if (snap.rows && snap.rows.length > 0) {
            await supabaseServer
              .from(snap.table)
              .upsert(snap.rows, { onConflict: "id" });
          }
        }
      }
    } else if (operation === "update") {
      if (!afterData) {
        return { success: false, error: "Missing snapshot to redo update." };
      }
      const reapplyPayload = sanitizeRowForUpsertOrUpdate(afterData, true);
      const { error } = await supabaseServer
        .from(table)
        .update(reapplyPayload)
        .eq("id", recordId);
      if (error) return { success: false, error: error.message };
    } else if (operation === "delete") {
      return await executeConfirmedCrudDelete(mutation, actor);
    }

    const redoneMutation: CrudMutationData = {
      ...mutation,
      status: "completed",
      timestamp: nowTimeLabel(),
    };
    pushCompletedMutation(redoneMutation);
    return { success: true, mutation: redoneMutation };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}


/**
 * Smart extractor for key-value pairs and natural conversational clauses
 */
export function parseNaturalCrudFields(rawText: string): Record<string, any> {
  const fields: Record<string, any> = {};
  const text = rawText.trim();

  // 1. Extract explicit key: value or key = value pairs (comma or semicolon separated)
  const kvRegex =
    /\b(name|dealer(?:\s+name)?|dealership(?:\s+name)?|rooftop(?:\s+name)?|customer(?:\s+name)?|code|rooftop\s+code|sku|custom_sku|city|state|zip|zip_code|address|address_line1|phone|email|billing_email|role|role_title|invitee_type|access_system|term_value|value|description|notes|pricing_tier|department|hourly_rate|salary_annual|asset_number|license_plate|vin|mileage|assigned_driver|make|model|year|carrier|service|tracking_number|po_number|shipment_number|capacity_units|prefix|route|delivery_route|ship_via|group|group_name|dealer_group|terms|payment_terms|credit_limit|credit|status|total|total_amount|amount|price|cost|stock|inventory_qty|category|brand|sales_rep|sales_rep_name|order_number|invoice_number|due_date)\s*(?:[:=]|\s+is\s+|\s+to\s+)\s*([^,;\n]+?)(?=\s*(?:,|;|$|\b(?:and\s+)?(?:name|code|sku|city|state|zip|address|phone|email|role|role_title|invitee_type|access_system|term_value|value|description|notes|pricing_tier|department|hourly_rate|salary_annual|asset_number|license_plate|vin|mileage|assigned_driver|make|model|year|carrier|service|tracking_number|po_number|shipment_number|capacity_units|prefix|route|delivery_route|ship_via|group|terms|payment_terms|credit_limit|credit|status|total|total_amount|amount|price|cost|stock|category|brand|sales_rep)\s*(?:[:=]|\s+is\s+|\s+to\s+)))/gi;

  let match: RegExpExecArray | null;
  while ((match = kvRegex.exec(text)) !== null) {
    const rawKey = match[1].toLowerCase().replace(/\s+/g, "_");
    const rawVal = match[2].trim().replace(/^["']|["']$/g, "");
    if (!rawVal) continue;

    if (
      ["dealer", "dealer_name", "dealership", "dealership_name", "rooftop", "rooftop_name"].includes(
        rawKey
      )
    ) {
      fields.name = rawVal;
    } else if (rawKey === "customer" || rawKey === "customer_name") {
      fields.customer_name = rawVal;
      if (!fields.name) fields.name = rawVal;
    } else if (rawKey === "rooftop_code") {
      fields.code = rawVal.toUpperCase();
    } else if (rawKey === "route" || rawKey === "delivery_route") {
      fields.delivery_route = rawVal;
      fields.ship_via = rawVal;
    } else if (rawKey === "group" || rawKey === "dealer_group") {
      fields.group_name = rawVal;
    } else if (rawKey === "terms") {
      fields.payment_terms = rawVal;
      fields.terms = rawVal;
    } else if (rawKey === "value" || rawKey === "term_value") {
      fields.term_value = rawVal;
    } else if (rawKey === "credit" || rawKey === "credit_limit") {
      fields.credit_limit = Number(rawVal.replace(/[^0-9.]/g, ""));
    } else if (rawKey === "email") {
      fields.billing_email = rawVal;
      fields.email = rawVal;
    } else if (rawKey === "address") {
      fields.address_line1 = rawVal;
    } else if (rawKey === "zip") {
      fields.zip_code = rawVal;
    } else if (["total", "total_amount", "amount", "price", "cost", "hourly_rate", "salary_annual"].includes(rawKey)) {
      const num = Number(rawVal.replace(/[^0-9.]/g, ""));
      if (!isNaN(num)) fields[rawKey] = num;
    } else if (rawKey === "stock" || rawKey === "inventory_qty") {
      const num = Number(rawVal.replace(/[^0-9]/g, ""));
      if (!isNaN(num)) fields.inventory_qty = num;
    } else if (rawKey === "mileage" || rawKey === "capacity_units" || rawKey === "year") {
      const num = Number(rawVal.replace(/[^0-9]/g, ""));
      if (!isNaN(num)) fields[rawKey] = num;
    } else if (rawKey === "sales_rep") {
      fields.sales_rep_name = rawVal;
    } else {
      fields[rawKey] = rawVal;
    }
  }

  // 2. Fallback natural patterns for email, phone, route, terms, role, city/state, price/amount
  if (!fields.billing_email) {
    const emailMatch = text.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
    if (emailMatch) {
      fields.billing_email = emailMatch[1];
      fields.email = emailMatch[1];
    }
  }

  if (!fields.role) {
    const roleMatch = text.match(/\b(?:as|role)\s*[:=]?\s*(member|admin|administrator|buyer|manager|viewer|external_customer)\b/i);
    if (roleMatch) {
      fields.role = roleMatch[1].toLowerCase() === "administrator" ? "admin" : roleMatch[1].toLowerCase();
    }
  }

  if (!fields.phone) {
    const phoneMatch = text.match(/\b(\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4})\b/);
    if (phoneMatch) {
      fields.phone = phoneMatch[1];
    }
  }

  if (!fields.delivery_route) {
    const routeMatch = text.match(
      /\b((?:john'?s|nick'?s|mike'?s|standard|route\s*\d+)\s*route|route\s+\d+|drop\s*ship|pick\s*up|ups\s+ground|fedex)\b/i
    );
    if (routeMatch) {
      const r = formatCleanEntityName(routeMatch[1]);
      fields.delivery_route = r;
      fields.ship_via = r;
    }
  }

  if (!fields.payment_terms) {
    const termsMatch = text.match(/\b(net\s*\d+(?:\s*days)?|due\s+on\s+receipt|cod|prepaid)\b/i);
    if (termsMatch) {
      const t = formatCleanEntityName(termsMatch[1]);
      fields.payment_terms = t;
      fields.terms = t;
    }
  }

  if (!fields.code) {
    const codeMatch = text.match(/\b(?:code|rooftop\s+code|term\s+code)\s*[:#=-]?\s*([A-Z0-9-]{2,16})\b/i);
    if (codeMatch) {
      fields.code = codeMatch[1].toUpperCase();
    }
  }

  if (!fields.custom_sku && !fields.sku) {
    const skuMatch = text.match(/\b(?:sku|part\s*#?)\s*[:#=-]?\s*([A-Z0-9-]{3,24})\b/i);
    if (skuMatch) {
      fields.custom_sku = skuMatch[1].toUpperCase();
      fields.sku = skuMatch[1].toUpperCase();
    }
  }

  if (!fields.city || !fields.state) {
    const locMatch = text.match(
      /\bin\s+([A-Z][a-zA-Z\s.]{2,22}?)(?:,\s*|\s+)(OH|WV|PA|KY|IN|MI|VA|NC|TX|FL|NY|IL|GA|TN|MD)\b/
    );
    if (locMatch) {
      if (!fields.city) fields.city = formatCleanEntityName(locMatch[1].trim());
      if (!fields.state) fields.state = locMatch[2].toUpperCase();
    }
  }

  if (fields.credit_limit === undefined) {
    const credMatch = text.match(/\bcredit(?:\s+limit)?\s*(?:of|to|is|:)?\s*\$?([\d,]+(?:\.\d{2})?)\b/i);
    if (credMatch) {
      fields.credit_limit = Number(credMatch[1].replace(/,/g, ""));
    }
  }

  if (fields.price === undefined) {
    const priceMatch = text.match(/\bprice\s*(?:of|to|is|:)?\s*\$?([\d,]+(?:\.\d{2})?)\b/i);
    if (priceMatch) {
      fields.price = Number(priceMatch[1].replace(/,/g, ""));
    }
  }

  if (fields.cost === undefined) {
    const costMatch = text.match(/\bcost\s*(?:of|to|is|:)?\s*\$?([\d,]+(?:\.\d{2})?)\b/i);
    if (costMatch) {
      fields.cost = Number(costMatch[1].replace(/,/g, ""));
    }
  }

  if (fields.total === undefined) {
    const totMatch = text.match(/\b(?:total|amount)\s*(?:of|to|is|:)?\s*\$?([\d,]+(?:\.\d{2})?)\b/i);
    if (totMatch) {
      fields.total = Number(totMatch[1].replace(/,/g, ""));
    }
  }

  if (!fields.status) {
    const stMatch = text.match(
      /\bstatus\s*(?:to|is|:|=)?\s*(active|inactive|on\s+hold|processing|ready\s+to\s+ship|shipped|delivered|cancelled|open|paid|overdue|pending|in\s+stock|out\s+of\s+stock)\b/i
    );
    if (stMatch) {
      fields.status = stMatch[1].toLowerCase().replace(/\s+/g, "_");
    }
  }

  return fields;
}

/**
 * Resolves any natural ERP entity phrase (Accounts, Individuals, Portal Invites, Terms, Orders, etc.) to its exact CrudEntityTable
 */
export function resolveEntityWordToCrudTable(
  rawEntityPhrase: string,
  targetIdentifier: string = ""
): CrudEntityTable {
  const w = (rawEntityPhrase || "").toLowerCase().trim();
  const id = (targetIdentifier || "").trim();

  if (
    w.includes("invite") ||
    w.includes("invitation") ||
    w.includes("portal user")
  ) {
    return "user_invites";
  }
  if (
    w.includes("individual") ||
    w.includes("person") ||
    w.includes("people") ||
    w.includes("contact") ||
    w.includes("buyer")
  ) {
    return "people";
  }
  if (
    w.includes("payment term") ||
    w.includes("customer term") ||
    w === "term" ||
    w === "terms"
  ) {
    return "payment_terms";
  }
  if (w.includes("contract")) {
    return "contracts";
  }
  if (w.includes("group")) {
    return "dealer_groups";
  }
  if (w.includes("quote") || /^QT-/i.test(id)) {
    return "portal_quotes";
  }
  if (w.includes("purchase order") || w === "po" || /^PO-\d+/i.test(id)) {
    return "purchase_orders";
  }
  if (w.includes("order") || /^SO-\d+/i.test(id)) {
    return "orders";
  }
  if (w.includes("invoice") || /^INV-\d+/i.test(id)) {
    return "invoices";
  }
  if (w.includes("shipment") || w.includes("delivery") && /^DS-|^SHP-/i.test(id)) {
    return "shipments";
  }
  if (
    w.includes("product") ||
    w.includes("sku") ||
    w.includes("item")
  ) {
    return "catalog_products";
  }
  if (w.includes("supplier") || w.includes("vendor")) {
    return "suppliers";
  }
  if (w.includes("employee") || w.includes("staff") || w.includes("team member")) {
    return "hr_employees";
  }
  if (
    w.includes("vehicle") ||
    w.includes("truck") ||
    w.includes("van") ||
    w.includes("asset") ||
    w.includes("fleet")
  ) {
    return "company_assets";
  }
  if (w.includes("route")) {
    return "delivery_routes";
  }
  if (w.includes("bin")) {
    return "inv_bins";
  }
  if (w.includes("coupon") || w.includes("promo")) {
    return "coupons";
  }
  return "rooftops";
}

const CRUD_ENTITY_REGEX_FRAGMENT =
  "customer\\s+account|account|dealer\\s+group|group|dealer|dealership|rooftop|customer\\s+individual|individual|person|customer\\s+contact|contact|buyer|portal\\s+invite|user\\s+invite|invite|invitation|payment\\s+terms?|customer\\s+terms?|terms?|customer\\s+contract|contract|purchase\\s+order|po|sales\\s+quote|portal\\s+quote|quote|sales\\s+order|order|invoice|shipment|catalog\\s+product|product|item|sku|supplier|vendor|employee|staff|fleet\\s+vehicle|vehicle|truck|van|asset|delivery\\s+route|route|warehouse\\s+bin|bin|coupon|promo|customer";

/**
 * Formats a human-readable markdown summary for any CRUD mutation response
 */
export function buildCrudMutationMarkdown(mutation: CrudMutationData): string {
  const { operation, status, entityLabel, recordTitle, recordCode, changes } =
    mutation;

  if (status === "draft_form") {
    return `Ready to register a new **${entityLabel}** in the live GoldTouch ERP database. You can switch between **Accounts**, **Individuals**, **Portal Invites**, **Terms**, and other ERP modules in the card below, or type the details directly in chat.`;
  }

  if (status === "pending_confirmation") {
    return `**Deletion Confirmation Required:** Please confirm whether you want to permanently delete **${recordTitle}** (${recordCode ? `Code: **${recordCode}**` : entityLabel}) from the live **${entityLabel}** database. Use the confirmation controls below to proceed or cancel, and remember that any confirmed database action can be undone with 1 click.`;
  }

  if (status === "undone") {
    return `**Database Action Undone:** The **${operation.toUpperCase()}** operation on **${recordTitle}** (${entityLabel}) has been reverted in real time and the previous database state is restored.`;
  }

  if (status === "cancelled") {
    return `**Deletion Cancelled:** No changes were made to **${recordTitle}** (${entityLabel}).`;
  }

  if (operation === "create") {
    const summaryParts = changes
      .slice(0, 5)
      .map((c) => `${c.label}: **${c.after}**`)
      .join(", ");
    return `**Live Database Record Created:** Registered **${recordTitle}** (${recordCode ? `Code: **${recordCode}**` : entityLabel}) in the live **${entityLabel}** table${summaryParts ? ` with ${summaryParts}` : ""}. You can inspect, edit, or undo this creation at any time below.`;
  }

  if (operation === "update") {
    const diffSummary = changes
      .map((c) => `${c.label}: **${c.before}** → **${c.after}**`)
      .join(", ");
    return `**Live Database Record Updated:** Applied real-time update to **${recordTitle}** (${entityLabel})${diffSummary ? ` — ${diffSummary}` : ""}. Click **Undo Change** below if you wish to revert to the previous snapshot.`;
  }

  return `**Live Database Record Deleted:** Removed **${recordTitle}** (${entityLabel}) from the live database. A complete snapshot has been preserved—click **Undo Delete** below to restore the record at any time.`;
}

/**
 * Retrieves read-only record(s) when a CRUD write command targets a module with write access disabled in Settings -> Permissions
 */
export async function buildReadOnlyFallbackForCrudQuery(
  table: CrudEntityTable,
  targetIdentifier?: string
): Promise<{
  handled: boolean;
  content: string;
  suggestedFollowUps: string[];
}> {
  const mod = getCrudModuleForTable(table);
  const entityLabel = ENTITY_TABLE_LABELS[table] || formatLabel(table);

  if (targetIdentifier && targetIdentifier.trim()) {
    const matched = await findTargetRecord(table, targetIdentifier.trim());
    if (matched) {
      const displayTitle =
        matched.name ||
        matched.company_name ||
        matched.order_number ||
        matched.invoice_number ||
        matched.po_number ||
        matched.shipment_number ||
        matched.email ||
        matched.code ||
        matched.custom_sku ||
        [matched.first_name, matched.last_name].filter(Boolean).join(" ") ||
        targetIdentifier;

      const diffs = computeChangesDiff(null, matched);
      const rowsMd = diffs
        .slice(0, 8)
        .map(
          (d) =>
            `| **${d.label}** | ${String(d.after ?? "—").replace(/\|/g, "/")} |`
        )
        .join("\n");

      return {
        handled: true,
        content: `**Read-Only Access (${mod.label}):** Write operations (\`Create\`, \`Update\`, \`Delete\`) are currently disabled for **${mod.label}** in **Settings → Permissions**. Below is the current read-only record for **${displayTitle}** (${entityLabel}):\n\n| Field | Current Value (Read-Only) |\n| :--- | :--- |\n${rowsMd || `| **Record** | ${displayTitle} |`}`,
        suggestedFollowUps: [
          `Show me ${displayTitle}`,
          "Show me customer accounts",
        ],
      };
    }
  }

  // Otherwise fetch up to 5 existing records from the table in read-only mode
  const { data: recentRows } = await supabaseServer
    .from(table)
    .select("*")
    .limit(5);

  let tablePreview = "";
  if (Array.isArray(recentRows) && recentRows.length > 0) {
    const lines = recentRows.map((r: any, idx: number) => {
      const title =
        r.name ||
        r.company_name ||
        r.order_number ||
        r.invoice_number ||
        r.po_number ||
        r.shipment_number ||
        r.email ||
        [r.first_name, r.last_name].filter(Boolean).join(" ") ||
        r.code ||
        r.custom_sku ||
        `Record #${idx + 1}`;
      const code =
        r.code ||
        r.custom_sku ||
        r.employee_number ||
        r.order_number ||
        r.invoice_number ||
        r.po_number ||
        r.shipment_number ||
        r.role ||
        "—";
      const statusOrDetail =
        r.status ||
        r.department ||
        r.category ||
        r.term_value ||
        r.access_system ||
        (r.is_active !== undefined ? (r.is_active ? "Active" : "Inactive") : "Active");
      return `| **${String(title).replace(/\|/g, "/")}** | \`${String(code).replace(/\|/g, "/")}\` | ${formatLabel(String(statusOrDetail))} |`;
    });
    tablePreview = `\n\n| ${entityLabel} | Identifier / Role | Status / Detail |\n| :--- | :--- | :--- |\n${lines.join("\n")}`;
  }

  return {
    handled: true,
    content: `**Read-Only Access (${mod.label}):** Write operations (\`Create\`, \`Update\`, \`Delete\`) are currently disabled for **${mod.label}** in **Settings → Permissions**. SARA can still retrieve and display all **${entityLabel}** records in read-only mode:${tablePreview}`,
    suggestedFollowUps: [
      "Show me customer accounts",
      "Show me customer individuals",
      "Show me portal invites",
    ],
  };
}

/**
 * Detects and executes natural-language CRUD & Undo commands directly from chat
 */
export async function tryHandleNaturalLanguageCrud(
  query: string,
  actor?: string,
  accessOptions?: {
    enableLiveCrud?: boolean;
    crudPermissions?: Partial<SaraCrudPermissions> | null;
  }
): Promise<{
  handled: boolean;
  content?: string;
  mutation?: CrudMutationData;
  suggestedFollowUps?: string[];
}> {
  const q = (query || "").trim();
  if (!q) return { handled: false };

  const enableLiveCrud = accessOptions?.enableLiveCrud !== false;
  const crudPermissions = accessOptions?.crudPermissions || null;

  // 1. Check for UNDO / REVERT command
  if (
    /^(?:\/undo|undo|revert|undo\s+(?:that|last|last\s+change|last\s+action|change|mutation)|revert\s+(?:that|last|last\s+change))\s*[.!?]*$/i.test(
      q
    )
  ) {
    const latest = getLatestUndoableMutation();
    if (!latest) {
      return {
        handled: true,
        content:
          "There are no recent database mutations in this session to undo. Any create, update, or delete action you perform includes an interactive **Undo Change** button right on its card.",
        suggestedFollowUps: [
          "Register a new dealer",
          "Show me customer individuals",
          "Show me portal invites",
        ],
      };
    }

    if (!isCrudTableAllowed(latest.table, enableLiveCrud, crudPermissions)) {
      return buildReadOnlyFallbackForCrudQuery(
        latest.table,
        latest.recordTitle
      );
    }

    const undoRes = await executeCrudUndo(latest, actor);
    if (!undoRes.success || !undoRes.mutation) {
      return {
        handled: true,
        content: `Unable to undo the last action on **${latest.recordTitle}**: ${undoRes.error || "Unknown error"}`,
      };
    }

    return {
      handled: true,
      content: buildCrudMutationMarkdown(undoRes.mutation),
      mutation: undoRes.mutation,
      suggestedFollowUps: [
        `Show me ${latest.recordTitle}`,
        "Register a new dealer",
      ],
    };
  }

  // 2. Check for DELETE / REMOVE / REVOKE intent (Mandatory Confirmation Gate)
  const deleteRegex = new RegExp(
    `^(?:please\\s+|can\\s+you\\s+|could\\s+you\\s+)?(?:\\/delete-record\\s+|delete|remove|drop|revoke)\\s+(?:this\\s+|the\\s+|a\\s+|an\\s+)?(?:(${CRUD_ENTITY_REGEX_REGEX_SAFE()})\\s+)?(?:named\\s+|called\\s+|for\\s+)?(.+?)(?:\\s+from\\s+(?:the\\s+)?(?:database|system|erp|portal))?\\s*[.!?]*$`,
    "i"
  );
  const deleteMatch = q.match(deleteRegex);
  if (deleteMatch) {
    const rawEntityHint = (deleteMatch[1] || "").toLowerCase().trim();
    const targetIdentifier = (deleteMatch[2] || "")
      .replace(/\b(please|sir|accordingly|accorinlgy|right\s+now|in\s+realtime|real\s+time)\b/gi, "")
      .trim();

    if (targetIdentifier) {
      const table = resolveEntityWordToCrudTable(rawEntityHint, targetIdentifier);
      if (!isCrudTableAllowed(table, enableLiveCrud, crudPermissions)) {
        return buildReadOnlyFallbackForCrudQuery(table, targetIdentifier);
      }

      const prepRes = await prepareCrudDeleteConfirmation({
        table,
        identifier: targetIdentifier,
        actor,
      });

      if (!prepRes.success || !prepRes.mutation) {
        return {
          handled: true,
          content:
            prepRes.error ||
            `Could not locate a matching ${ENTITY_TABLE_LABELS[table]} for "${targetIdentifier}".`,
          suggestedFollowUps: [
            "Show me our top dealership customers",
            "Show me customer individuals",
            "Show me portal invites",
          ],
        };
      }

      return {
        handled: true,
        content: buildCrudMutationMarkdown(prepRes.mutation),
        mutation: prepRes.mutation,
        suggestedFollowUps: [
          `Show me ${prepRes.mutation.recordTitle}`,
          "Show me our top dealership customers",
        ],
      };
    }
  }

  // 2b. Natural Portal Invite command: "Invite john@apexmotors.com to the portal as member" or "Send portal invite to john@apexmotors.com"
  const naturalInviteMatch = q.match(
    /^(?:please\s+|can\s+you\s+|could\s+you\s+)?(?:invite|send\s+(?:a\s+)?(?:portal\s+)?invite\s+to)\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(.*)$/i
  );
  if (naturalInviteMatch) {
    const inviteEmail = naturalInviteMatch[1].trim().toLowerCase();
    if (!isCrudTableAllowed("user_invites", enableLiveCrud, crudPermissions)) {
      return buildReadOnlyFallbackForCrudQuery("user_invites", inviteEmail);
    }

    const extraText = naturalInviteMatch[2] || "";
    const parsed = parseNaturalCrudFields(extraText);
    parsed.email = inviteEmail;
    const createRes = await executeCrudCreate({
      table: "user_invites",
      fields: parsed,
      actor,
    });
    if (createRes.success && createRes.mutation) {
      return {
        handled: true,
        content: buildCrudMutationMarkdown(createRes.mutation),
        mutation: createRes.mutation,
        suggestedFollowUps: [
          "Show me portal invites",
          `Delete portal invite ${inviteEmail}`,
        ],
      };
    }
  }

  // 3. Check for blank CREATE / REGISTER / ADD form opener across any ERP module
  const blankRegisterRegex = new RegExp(
    `^(?:please\\s+|can\\s+you\\s+|let'?s\\s+)?(?:\\/register-dealer|(?:register|create|add|new|invite)\\s+(?:a\\s+|an\\s+|new\\s+|this\\s+)?(${CRUD_ENTITY_REGEX_REGEX_SAFE()}))\\s*(?:please|sir|accordingly|accorinlgy)?\\s*[.!?]*$`,
    "i"
  );
  const blankMatch = q.match(blankRegisterRegex);
  if (blankMatch) {
    const table = blankMatch[1]
      ? resolveEntityWordToCrudTable(blankMatch[1])
      : "rooftops";
    if (!isCrudTableAllowed(table, enableLiveCrud, crudPermissions)) {
      return buildReadOnlyFallbackForCrudQuery(table);
    }

    const label = ENTITY_TABLE_LABELS[table];
    const draftMutation: CrudMutationData = {
      mutationId: `mut-draft-${Date.now()}`,
      operation: "create",
      status: "draft_form",
      table,
      entityLabel: label,
      recordId: "draft",
      recordCode: `NEW-${table.toUpperCase().slice(0, 8)}`,
      recordTitle: `New ${label} Registration`,
      changes: [],
      timestamp: nowTimeLabel(),
      actor: actor || "SARA Live CRUD",
    };
    return {
      handled: true,
      content: buildCrudMutationMarkdown(draftMutation),
      mutation: draftMutation,
      suggestedFollowUps: [
        "Show me customer accounts",
        "Show me customer individuals",
        "Show me portal invites",
        "Show me payment terms",
      ],
    };
  }

  // 3b. Check for CREATE / REGISTER / ADD with inline fields
  const createRegex = new RegExp(
    `^(?:please\\s+|can\\s+you\\s+|could\\s+you\\s+|let'?s\\s+)?(?:\\/register-dealer\\s+|register|create|add|insert|send)\\s+(?:a\\s+|an\\s+|new\\s+|this\\s+)?(${CRUD_ENTITY_REGEX_REGEX_SAFE()})\\b\\s*(?:to\\s+|for\\s+|named\\s+|called\\s+|[:,-])?\\s*(.+)$`,
    "i"
  );
  const createMatch = q.match(createRegex);
  if (createMatch) {
    const entityWord = createMatch[1].toLowerCase().trim();
    const restText = createMatch[2]
      .replace(/\b(please|sir|accordingly|accorinlgy|in\s+realtime|real\s+time)\b/gi, "")
      .trim();

    const table = resolveEntityWordToCrudTable(entityWord, restText);
    if (!isCrudTableAllowed(table, enableLiveCrud, crudPermissions)) {
      return buildReadOnlyFallbackForCrudQuery(table);
    }

    const parsedFields = parseNaturalCrudFields(restText);

    // If name/code wasn't explicitly labeled as "name: ...", extract the leading entity name/code before the first comma or keyword
    if (!parsedFields.name && !parsedFields.customer_name && !parsedFields.code) {
      const leadingNameMatch = restText.match(
        /^(?:named\s+|called\s+|for\s+|to\s+)?([^,:;]+?)(?=\s*(?:,|;|\b(?:code|sku|city|state|in\s+[A-Z]|on\s+(?:john|nick|drop|pick)|with\s+|route|phone|email|role|value|term_value|description|terms|credit|total|amount|price|cost|status|group|department)\b|$))/i
      );
      if (leadingNameMatch && leadingNameMatch[1].trim()) {
        const cleanLeading = leadingNameMatch[1]
          .replace(/^(?:named|called|for|to)\s+/i, "")
          .trim();
        if (table === "payment_terms") {
          parsedFields.code = cleanLeading.toUpperCase();
        } else if (table === "user_invites" && cleanLeading.includes("@")) {
          parsedFields.email = cleanLeading.toLowerCase();
        } else {
          parsedFields.name = cleanLeading;
          parsedFields.customer_name = cleanLeading;
        }
      }
    }

    const createRes = await executeCrudCreate({
      table,
      fields: parsedFields,
      actor,
    });

    if (!createRes.success || !createRes.mutation) {
      return {
        handled: true,
        content: `Unable to create ${ENTITY_TABLE_LABELS[table]}: ${createRes.error || "Invalid fields"}`,
      };
    }

    return {
      handled: true,
      content: buildCrudMutationMarkdown(createRes.mutation),
      mutation: createRes.mutation,
      suggestedFollowUps: [
        `Show me ${createRes.mutation.recordTitle}`,
        "Undo last change",
      ],
    };
  }

  // 4. Check for UPDATE / MODIFY / CHANGE / SET intent
  const updateRegex = new RegExp(
    `^(?:please\\s+|can\\s+you\\s+|could\\s+you\\s+)?(?:\\/update-record\\s+|update|edit|modify|change|set)\\s+(?:this\\s+|the\\s+|a\\s+|an\\s+)?(${CRUD_ENTITY_REGEX_REGEX_SAFE()})\\s+(.+)$`,
    "i"
  );
  const updateMatch = q.match(updateRegex);
  if (updateMatch) {
    const entityWord = updateMatch[1].toLowerCase().trim();
    const restText = updateMatch[2]
      .replace(/\b(please|sir|accordingly|accorinlgy|in\s+realtime|real\s+time)\b/gi, "")
      .trim();

    const table = resolveEntityWordToCrudTable(entityWord, restText);
    const parsedUpdates = parseNaturalCrudFields(restText);

    // Extract target identifier (everything before the first field keyword)
    const idSplitMatch = restText.match(
      /^([^,:;]+?)\s+(?:route|delivery_route|ship_via|status|role|role_title|term_value|value|description|notes|pricing_tier|department|hourly_rate|salary_annual|terms|payment_terms|credit|credit_limit|phone|email|billing_email|city|state|address|code|price|cost|stock|inventory_qty|total|total_amount|amount|open_balance|balance|name|sales_rep|mileage|assigned_driver|license_plate|carrier|tracking_number)\b/i
    );
    const targetIdentifier = (
      idSplitMatch ? idSplitMatch[1] : restText.split(/[,:;]/)[0]
    )
      .replace(/^(?:named|called|for)\s+/i, "")
      .trim();

    if (!isCrudTableAllowed(table, enableLiveCrud, crudPermissions)) {
      return buildReadOnlyFallbackForCrudQuery(table, targetIdentifier);
    }

    if (targetIdentifier && Object.keys(parsedUpdates).length > 0) {
      const updRes = await executeCrudUpdate({
        table,
        identifier: targetIdentifier,
        updates: parsedUpdates,
        actor,
      });

      if (!updRes.success || !updRes.mutation) {
        return {
          handled: true,
          content:
            updRes.error ||
            `Could not update ${ENTITY_TABLE_LABELS[table]} "${targetIdentifier}".`,
        };
      }

      return {
        handled: true,
        content: buildCrudMutationMarkdown(updRes.mutation),
        mutation: updRes.mutation,
        suggestedFollowUps: [
          `Show me ${updRes.mutation.recordTitle}`,
          "Undo last change",
        ],
      };
    }
  }

  return { handled: false };
}

function CRUD_ENTITY_REGEX_REGEX_SAFE(): string {
  return CRUD_ENTITY_REGEX_FRAGMENT;
}
