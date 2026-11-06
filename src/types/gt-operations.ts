export type Department = 
  | "all" 
  | "orders" 
  | "invoices" 
  | "customers" 
  | "purchasing" 
  | "shipments"
  | "catalog"
  // Legacy compatibility tags
  | "crm" 
  | "lancashire_site" 
  | "inventory";

export interface OrderItem {
  id: string;
  sku: string;
  product_name: string;
  qty: number;
  unit_price: number;
  amount: number;
  line_status?: string;
  image_url?: string | null;
  images?: Array<{ url: string; sort?: number }>;
}

export interface OrderData {
  id: string;
  order_number: string;
  customer_name: string;
  rooftop_name?: string;
  status: string;
  total: number;
  subtotal?: number;
  tax?: number;
  shipping?: number;
  payment_status?: string;
  created_at: string;
  sales_rep_name?: string;
  shipping_address?: string;
  lines: OrderItem[];
  shipments?: ShipmentData[];
}

export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail?: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "overdue" | "issued" | "disputed";
  issueDate: string;
  dueDate: string;
  openBalance?: number;
  site?: string;
  items?: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  notes?: string;
}

export interface PurchaseOrder {
  id?: string;
  poNumber: string;
  supplier: string;
  category?: string;
  totalAmount: number;
  currency: string;
  status: string;
  orderDate?: string;
  expectedDelivery?: string;
  carrier?: string;
  trackingNumber?: string;
  notes?: string;
  destinationSite?: string;
  progressPercent?: number;
  requestedBy?: string;
  items?: {
    name: string;
    qty: number;
    unit: string;
    unitCost: number;
  }[];
}

export interface DealershipCustomer {
  id: string;
  name: string;
  code?: string;
  status?: string;
  city?: string;
  state?: string;
  phone?: string;
  billing_email?: string;
  address_line1?: string;
  address_line2?: string;
  zip_code?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  statement_timezone?: string;
  website_url?: string;
  pricing_tier?: string;
  terms?: string;
  payment_terms?: string;
  credit_limit?: number;
  group_name?: string;
  group_id?: string;
  delivery_route?: string;
  tax_exempt?: boolean;
  resale_certificate_number?: string;
  qbo_customer_id?: string;
  assigned_sales_rep?: string;
  total_orders_count?: number;
  lifetime_spend?: number;
  open_invoices_count?: number;
  open_invoice_balance?: number;
  departments?: Array<{
    id: string;
    name: string;
    type?: string;
    code?: string;
  }>;
  recent_orders?: Array<{
    id?: string;
    order_number: string;
    status: string;
    total: number;
    payment_status?: string;
    order_type?: string;
    ship_via?: string;
    sales_rep_name?: string;
    created_at?: string;
    items_summary?: string;
    lines?: Array<{
      sku: string;
      product_name: string;
      qty: number;
      unit_price: number;
    }>;
  }>;
  recent_invoices?: Array<{
    id?: string;
    invoice_number: string;
    order_number?: string;
    status: string;
    total: number;
    open_balance: number;
    invoice_date?: string;
    due_date?: string;
    emailed_to?: string;
  }>;
  recent_shipments?: Array<{
    id?: string;
    shipment_number: string;
    order_number?: string;
    status: string;
    carrier?: string;
    tracking_number?: string;
    shipped_at?: string;
  }>;
  recent_activities?: Array<{
    id?: string;
    type: string;
    title: string;
    status: string;
    sales_agent_name?: string;
    created_at?: string;
  }>;
}

export interface DealerGroupData {
  id: string;
  name: string;
  code?: string;
  phone?: string;
  email?: string;
  credit_limit?: number;
  terms?: string;
  city?: string;
  state?: string;
  zip?: string;
  website_url?: string;
  rooftops_count?: number;
  rooftops?: Array<{
    id: string;
    name: string;
    city?: string;
    state?: string;
  }>;
}

export interface SupplierData {
  id: string;
  name: string;
  company_name?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  city?: string;
  state?: string;
  payment_terms?: string;
  discount_percent?: number;
  average_lead_time_days?: number;
  quality_rating?: number;
  sales_rep_name?: string;
  sales_rep_phone?: string;
  tags?: string[];
  is_preferred?: boolean;
  is_active?: boolean;
}

export interface CrmActivityData {
  id: string;
  type: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  sales_agent_name?: string;
  customer_name?: string;
  rooftop_name?: string;
  group_name?: string;
  created_at: string;
  completed_at?: string;
}

export interface PricingRuleData {
  id: string;
  name: string;
  scope_type?: string;
  match_type?: string;
  match_value?: string;
  strategy_type?: string;
  discount_pct?: number;
  fixed_price?: number;
  priority?: number;
  price_method?: string;
}

export interface ShipmentData {
  id: string;
  shipment_number: string;
  order_id?: string;
  order_number?: string;
  customer_name?: string;
  status: string;
  carrier?: string;
  service?: string;
  tracking_number?: string;
  ship_date?: string;
  shipped_at?: string;
  shipping_cost?: number;
  notes?: string;
  items?: Array<{
    sku: string;
    description: string;
    qty_shipped: number;
    unit_price?: number;
  }>;
}

export interface VolumePriceBreak {
  tier_label: string;
  min_qty: number;
  max_qty: number | null;
  unit_price: number;
  discount_pct: number;
  unit_cost?: number;
  unit_profit?: number;
  margin_pct?: number | null;
}

export interface CatalogProduct {
  id: string;
  erp_id?: string | null;
  name: string;
  sku: string;
  erp_sku?: string | null;
  supplier_sku?: string | null;
  style_code?: string;
  price: number;
  original_price?: number | null;
  msrp?: number | null;
  cost?: number;
  supplier_cost?: number | null;
  gross_margin_pct?: number | null;
  unit_profit?: number | null;
  category?: string;
  sub_category?: string | null;
  brand?: string;
  supplier?: string;
  unit?: string | null;
  is_customizable?: boolean;
  description?: string;
  stock?: number | string;
  stock_status?: string;
  colors?: string[];
  color_count?: number;
  sizes?: string[];
  size_range?: string;
  volume_price_breaks?: VolumePriceBreak[];
  pricing_levels?: Array<{ level: string; price: number }>;
  spec_sheet_url?: string | null;
  video_url?: string | null;
  image_3d_url?: string | null;
  image_url?: string | null;
  images?: Array<{ url: string; sort?: number; label?: string }>;
  kit_items?: Array<{
    product_id?: string;
    sku: string;
    erp_sku?: string | null;
    name: string;
    qty: number;
    price: number;
    cost?: number;
    image_url?: string | null;
  }>;
  order_sales_summary?: {
    total_orders_count: number;
    total_units_sold: number;
    total_revenue: number;
    recent_orders: Array<{
      order_number: string;
      customer_name: string;
      qty: number;
      unit_price: number;
      line_total: number;
      status?: string;
      sales_rep_name?: string;
      created_at?: string;
    }>;
  };
}

export interface OperationsMetrics {
  totalOrders: number;
  pendingOrders: number;
  totalOpenInvoiceBalance: number;
  openInvoicesCount: number;
  totalPurchaseOrders: number;
  totalShipmentsFulfilled: number;
  totalDealershipRooftops: number;
  lancashireFactoryEfficiency?: string;
  totalCrmPipelineValue?: number;
  activePurchaseOrdersCount?: number;
  totalOpenInvoicesAmount?: number;
  overdueInvoicesAmount?: number;
}

export interface CrmLeadDeal {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  dealValue: number;
  currency: string;
  stage: string;
  probability: number;
  salesRep: string;
  projectedClose: string;
  interestArea: string;
}

export interface InventoryItem {
  sku: string;
  name: string;
  category: string;
  currentStock: number;
  unit: string;
  reorderLevel: number;
  location: string;
  unitValue: number;
  status: "In Stock" | "Low Stock" | "Critical" | "optimal" | "low_stock" | "critical";
  lastAudited?: string;
}

export interface LancashireSiteData {
  siteName: string;
  facilityCode: string;
  location: string;
  operationalStatus: string;
  dailyThroughputUnits: number;
  safetyDaysLost: number;
  shiftManager: string;
  overallEfficiency?: string;
  activeLinesCount?: number;
  activeLines: {
    id: string;
    name: string;
    status: string;
    efficiency: number;
    currentBatch: string;
    operator: string;
  }[];
  todayDispatches: {
    dispatchId: string;
    destination: string;
    carrier: string;
    status: string;
    departureTime?: string;
    palletCount?: number;
    trackingNumber?: string;
    itemCount?: number;
  }[];
}

export interface LocationMapData {
  id?: string;
  name: string;
  code?: string;
  entity_type?: "Dealership Rooftop" | "Dealer Group" | "Supplier" | "Shipping Address";
  status?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  formatted_address?: string;
  latitude?: number | null;
  longitude?: number | null;
  delivery_route?: string;
  statement_timezone?: string;
  phone?: string;
  billing_email?: string;
  website_url?: string;
  group_name?: string;
  assigned_sales_rep?: string;
  payment_terms?: string;
  pricing_tier?: string;
  total_orders_count?: number;
  lifetime_spend?: number;
  open_invoice_balance?: number;
}

export interface EmailContactOption {
  name: string;
  email: string;
  role?: string;
  company?: string;
  roleOrCompany?: string;
  source?: string;
  phone?: string;
}

export interface EmailDraftData {
  id?: string;
  to?: string;
  to_email: string;
  to_name?: string;
  toName?: string;
  toRoleOrCompany?: string;
  recipientName?: string;
  recipientRoleOrCompany?: string;
  cc?: string;
  cc_email?: string;
  bcc?: string;
  bcc_email?: string;
  subject: string;
  body: string;
  senderName?: string;
  sender_name?: string;
  senderEmail?: string;
  sender_email?: string;
  replyTo?: string;
  contextReference?: string;
  contextSummary?: string;
  context_summary?: string;
  roughPrompt?: string;
  rough_context?: string;
  status?: "draft" | "sent";
  sentAt?: string;
  sent_at?: string;
  messageId?: string;
  candidateContacts?: EmailContactOption[];
  matchedContacts?: EmailContactOption[];
  suggested_contacts?: EmailContactOption[];
}

export interface AuthUser {
  id: string;
  name: string;
  fullName?: string;
  email: string;
  role: string;
  sales_crm_role?: string;
  department?: string;
  job_title?: string;
  jobTitle?: string;
  phone?: string;
  avatar_url?: string | null;
}

export type MessageRole = "user" | "assistant" | "system";

export interface ChatAttachment {
  name: string;
  type: string;
  base64?: string;
  url?: string;
  size?: number;
}

export type CrudEntityTable =
  | "rooftops"
  | "dealer_groups"
  | "people"
  | "user_invites"
  | "payment_terms"
  | "contracts"
  | "orders"
  | "portal_quotes"
  | "invoices"
  | "catalog_products"
  | "suppliers"
  | "purchase_orders"
  | "shipments"
  | "hr_employees"
  | "company_assets"
  | "delivery_routes"
  | "inv_bins"
  | "coupons";

export type CrudModuleKey =
  | "accounts"
  | "hr"
  | "catalog"
  | "sales"
  | "billing"
  | "purchasing"
  | "fulfillment";

export interface SaraCrudPermissions {
  accounts: boolean;
  hr: boolean;
  catalog: boolean;
  sales: boolean;
  billing: boolean;
  purchasing: boolean;
  fulfillment: boolean;
}

export const DEFAULT_CRUD_PERMISSIONS: SaraCrudPermissions = {
  accounts: true,
  hr: true,
  catalog: true,
  sales: true,
  billing: true,
  purchasing: true,
  fulfillment: true,
};

export const CRUD_MODULE_DEFINITIONS: Array<{
  key: CrudModuleKey;
  label: string;
  description: string;
  tables: CrudEntityTable[];
}> = [
  {
    key: "accounts",
    label: "Customers & Accounts",
    description: "Dealership accounts, groups, individuals, portal invites, and terms",
    tables: [
      "rooftops",
      "dealer_groups",
      "people",
      "user_invites",
      "payment_terms",
      "contracts",
    ],
  },
  {
    key: "hr",
    label: "Employees & HR",
    description: "Staff directory, job titles, departments, and compensation",
    tables: ["hr_employees"],
  },
  {
    key: "catalog",
    label: "Catalog & Promotions",
    description: "Products, SKUs, pricing, stock levels, and promo coupons",
    tables: ["catalog_products", "coupons"],
  },
  {
    key: "sales",
    label: "Sales Orders & Quotes",
    description: "Customer sales orders, order statuses, and sales quotes",
    tables: ["orders", "portal_quotes"],
  },
  {
    key: "billing",
    label: "Billing & Invoices",
    description: "Accounts receivable invoices, open balances, and payment statuses",
    tables: ["invoices"],
  },
  {
    key: "purchasing",
    label: "Purchasing & Suppliers",
    description: "Vendor directory, supplier terms, and purchase orders",
    tables: ["suppliers", "purchase_orders"],
  },
  {
    key: "fulfillment",
    label: "Fulfillment, Fleet & Warehouse",
    description: "Shipments, delivery routes, fleet vehicles, and storage bins",
    tables: ["shipments", "delivery_routes", "company_assets", "inv_bins"],
  },
];

export function getCrudModuleForTable(table: CrudEntityTable): {
  key: CrudModuleKey;
  label: string;
  description: string;
} {
  for (const mod of CRUD_MODULE_DEFINITIONS) {
    if (mod.tables.includes(table)) {
      return {
        key: mod.key,
        label: mod.label,
        description: mod.description,
      };
    }
  }
  return {
    key: "accounts",
    label: "Customers & Accounts",
    description: "Dealership accounts, groups, individuals, portal invites, and terms",
  };
}

export function isCrudTableAllowed(
  table: CrudEntityTable,
  enableLiveCrud: boolean = true,
  crudPermissions?: Partial<SaraCrudPermissions> | null
): boolean {
  if (!enableLiveCrud) return false;
  if (!crudPermissions) return true;
  const mod = getCrudModuleForTable(table);
  return crudPermissions[mod.key] !== false;
}

export interface CrudFieldChange {
  field: string;
  label: string;
  before: any;
  after: any;
}

export interface CrudMutationData {
  mutationId: string;
  operation: "create" | "update" | "delete";
  status: "pending_confirmation" | "completed" | "undone" | "cancelled" | "draft_form";
  table: CrudEntityTable;
  entityLabel: string;
  recordId: string;
  recordCode?: string;
  recordTitle: string;
  summaryText?: string;
  beforeData?: Record<string, any> | null;
  afterData?: Record<string, any> | null;
  childSnapshots?: {
    table: string;
    foreignKey: string;
    rows: Record<string, any>[];
  }[];
  changes: CrudFieldChange[];
  timestamp: string;
  actor?: string;
  entityCard?: {
    type: "customer" | "order" | "invoice" | "catalog_product" | "supplier" | "dealer_group";
    data: any;
  } | null;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  departmentTag?: Department;
  structuredCard?: {
    type:
      | "order"
      | "invoice"
      | "purchase_order"
      | "customer"
      | "shipment"
      | "catalog_product"
      | "quick_summary"
      | "crm_deals"
      | "inventory"
      | "lancashire_site"
      | "supplier"
      | "dealer_group"
      | "crm_activity"
      | "pricing_rule"
      | "location_map"
      | "email_draft"
      | "crud_mutation";
    data: any;
  };
  suggestedFollowUps?: string[];
  attachment?: ChatAttachment;
}
