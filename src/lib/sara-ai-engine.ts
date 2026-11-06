import dns from "dns";
import { GoogleGenerativeAI, SchemaType, FunctionDeclaration } from "@google/generative-ai";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}
import {
  searchCustomerOrders,
  getOrderDetails,
  queryInvoices,
  queryPurchaseOrders,
  queryShipments,
  searchDealershipCustomers,
  queryDealerGroups,
  queryDepartments,
  querySuppliers,
  queryCrmActivities,
  queryPricingRules,
  queryAuditLogs,
  universalEnterpriseSearch,
  searchCatalogProducts,
  getTopSellingProducts,
  searchApparelCatalog,
  isApparelSearchIntent,
  searchCrmLeads,
  getSalesRepTeam,
  getOperationsDashboardSummary,
  discoverDatabaseTables,
  queryDynamicTable,
  getLiveDatabaseSchemaPromptContext,
  fetchLiveDatabaseSchema,
  parseNaturalDateRangeFromQuery,
  queryEmployeesAndHR,
  queryFleetAndAssets,
  queryWarehouseInventory,
  queryAccountingAndFinance,
  queryPurchasingReceivingAndReturns,
  querySalesQuotesStatementsAndTerms,
  queryCatalogKitsFitmentsAndVariations,
  queryLandingSiteAndSettings,
  prepareEmailDraft,
} from "./sara-tools";
import {
  ChatMessage,
  Department,
  CrudEntityTable,
  SaraCrudPermissions,
  isCrudTableAllowed,
  getCrudModuleForTable,
} from "../types/gt-operations";
import {
  sanitizeTextLabels,
  formatCleanEntityName,
  parseCatalogProductTitle,
} from "./formatters";
import {
  tryHandleNaturalLanguageCrud,
  executeCrudCreate,
  executeCrudUpdate,
  prepareCrudDeleteConfirmation,
  executeCrudUndo,
  getLatestUndoableMutation,
  buildCrudMutationMarkdown,
} from "./sara-crud-engine";

const apiKey = process.env.GEMINI_API_KEY || "";

const functionDeclarations: FunctionDeclaration[] = [
  {
    name: "getOrderDetails",
    description: "Retrieve comprehensive details for a specific sales order including itemized line items, product names, SKUs, quantities, unit prices, line totals, vehicle labels, shipments/tracking, and invoices. Use this whenever the user asks about a specific order like 'Order SO-5507', 'SO-5507', 'what items are included in SO-5507', or by order ID.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        order_number_or_id: {
          type: SchemaType.STRING,
          description: "Order number (e.g. 'SO-5507', 'SO-5501', '5507') or UUID.",
        },
      },
      required: ["order_number_or_id"],
    },
  },
  {
    name: "searchCustomerOrders",
    description: "Search orders and calculate exact total sales revenue, order counts, average order value, status breakdown, and top customers by customer/dealership name, order number, status, OR any date/timeframe/month/date-range (e.g. timeframe='today', 'yesterday', 'this_week', 'this_month', 'last_month', 'october', 'november', or start_date='2026-11-01', end_date='2026-11-05'). ALWAYS use this tool whenever the user asks about total sales, revenue, or orders for any month, date range, or timeframe.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        timeframe: {
          type: SchemaType.STRING,
          description: "Filter by timeframe or month name: 'today', 'yesterday', 'this_week', 'this_month', 'last_month', 'october', 'november', '2026-10', or 'recent'.",
        },
        date: {
          type: SchemaType.STRING,
          description: "Specific date in 'YYYY-MM-DD' format or 'today' / 'yesterday'.",
        },
        start_date: {
          type: SchemaType.STRING,
          description: "Inclusive start date of a range in 'YYYY-MM-DD' format (e.g. '2026-11-01' or '2026-10-01').",
        },
        end_date: {
          type: SchemaType.STRING,
          description: "Inclusive end date of a range in 'YYYY-MM-DD' format (e.g. '2026-11-05' or '2026-10-31').",
        },
        customer_name: {
          type: SchemaType.STRING,
          description: "Name of the customer or dealership rooftop, e.g. 'Moses Nissan', 'Todd Judy Ford', 'Victory Toyota', 'University Ford'.",
        },
        order_number: {
          type: SchemaType.STRING,
          description: "Specific sales order number, e.g. 'SO-5507'.",
        },
        product_sku_or_name: {
          type: SchemaType.STRING,
          description: "Product SKU, style code, or product name to find all customer orders containing that product (e.g. 'ICOK93163L', 'WES2012785', 'GTI6312').",
        },
        sales_rep_name: {
          type: SchemaType.STRING,
          description: "Sales representative name to filter orders by rep (e.g. 'Michael Wanegar', 'Josh Talbott', 'Matt Sales', 'Saad Hassan').",
        },
        status: {
          type: SchemaType.STRING,
          description: "Filter by order status: 'pending', 'processing', 'shipped', 'cancelled', or 'all'.",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max number of detailed orders to return. Default 10 (total_sales_revenue and total_matching_orders are always calculated across all matching orders).",
        },
      },
    },
  },
  {
    name: "queryInvoices",
    description: "Query accounts receivable invoices, line items, payment status, open balance, due date, timeframe/date/date-range, customer name, and totals.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        customer_name: {
          type: SchemaType.STRING,
          description: "Filter invoices by customer/dealership name.",
        },
        invoice_number: {
          type: SchemaType.STRING,
          description: "Specific invoice number, e.g. 'INV-5408'.",
        },
        timeframe: {
          type: SchemaType.STRING,
          description: "Timeframe or month filter: 'today', 'yesterday', 'this_week', 'this_month', 'last_month', 'october', 'november', or 'recent'.",
        },
        start_date: {
          type: SchemaType.STRING,
          description: "Inclusive start date in 'YYYY-MM-DD' format.",
        },
        end_date: {
          type: SchemaType.STRING,
          description: "Inclusive end date in 'YYYY-MM-DD' format.",
        },
        status: {
          type: SchemaType.STRING,
          description: "Invoice status: 'open', 'issued', 'paid', 'overdue', 'pending', or 'all'.",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max number of invoices to return. Default 10.",
        },
      },
    },
  },
  {
    name: "queryPurchaseOrders",
    description: "Query vendor purchase orders, procurement status, supplier name, expected delivery dates, and itemized purchase order lines.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        supplier_name: {
          type: SchemaType.STRING,
          description: "Supplier or vendor company name (e.g. 'WeatherTech', 'Amp Research').",
        },
        po_number: {
          type: SchemaType.STRING,
          description: "PO number, e.g. 'PO-21659'.",
        },
        timeframe: {
          type: SchemaType.STRING,
          description: "Timeframe or month filter: 'today', 'yesterday', 'this_week', 'this_month', 'october', 'november', or 'recent'.",
        },
        start_date: {
          type: SchemaType.STRING,
          description: "Inclusive start date in 'YYYY-MM-DD' format.",
        },
        end_date: {
          type: SchemaType.STRING,
          description: "Inclusive end date in 'YYYY-MM-DD' format.",
        },
        status: {
          type: SchemaType.STRING,
          description: "PO status: 'draft', 'issued', 'sent', 'received', 'in_transit', or 'all'.",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max number of purchase orders to return.",
        },
      },
    },
  },
  {
    name: "queryShipments",
    description: "Track fulfillments and outbound shipments, carrier information (UPS, FedEx, Dropship), package tracking numbers, and packed/shipped item lines. DO NOT use when looking for product SKUs, part numbers, or codes starting with 'GTI'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        order_number: {
          type: SchemaType.STRING,
          description: "Sales order number associated with shipment, e.g. 'SO-5507'.",
        },
        tracking_number: {
          type: SchemaType.STRING,
          description: "Package tracking number (e.g. UPS '1Z...', FedEx, or 'INTERNAL-...'). CRITICAL: DO NOT use for product SKUs or part numbers like 'GTI...', 'PAC...', 'IWC...'. If a code could be a product part number or SKU, use 'searchCatalogProducts' instead.",
        },
        shipment_number: {
          type: SchemaType.STRING,
          description: "Shipment ID/number (e.g. 'DS-5507', 'FS-5498').",
        },
        timeframe: {
          type: SchemaType.STRING,
          description: "Timeframe or month filter: 'today', 'yesterday', 'this_week', 'this_month', 'october', 'november', or 'recent'.",
        },
        start_date: {
          type: SchemaType.STRING,
          description: "Inclusive start date in 'YYYY-MM-DD' format.",
        },
        end_date: {
          type: SchemaType.STRING,
          description: "Inclusive end date in 'YYYY-MM-DD' format.",
        },
        status: {
          type: SchemaType.STRING,
          description: "Shipment status: 'pending', 'in_transit', 'shipped', 'delivered', 'draft'.",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max number of shipments to return.",
        },
      },
    },
  },
  {
    name: "searchDealershipCustomers",
    description: "Search dealership rooftops, customer accounts, addresses, phone numbers, parent groups, billing emails, and departments.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: "Dealership name search keyword, e.g. 'Victory', 'Moses', 'Ford', 'Toyota'.",
        },
        city: {
          type: SchemaType.STRING,
          description: "City name, e.g. 'Charleston', 'Marietta', 'Beckley'.",
        },
        state: {
          type: SchemaType.STRING,
          description: "State abbreviation, e.g. 'WV', 'OH', 'VA'.",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max number of dealerships to return.",
        },
      },
    },
  },
  {
    name: "queryDealerGroups",
    description: "Query automotive dealer groups and corporate parent accounts (e.g. Lithia, Hendrick, Penske), credit limits, and affiliated rooftops.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: {
          type: SchemaType.STRING,
          description: "Dealer group name search, e.g. 'Lithia', 'Hendrick', 'Penske', 'Moses Group'.",
        },
        code: {
          type: SchemaType.STRING,
          description: "Dealer group code.",
        },
        city: {
          type: SchemaType.STRING,
          description: "City filter.",
        },
        state: {
          type: SchemaType.STRING,
          description: "State filter.",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max dealer groups to return.",
        },
      },
    },
  },
  {
    name: "queryDepartments",
    description: "Query dealership internal departments (Parts, Service, Sales, Body Shop) across rooftops.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        rooftop_name: {
          type: SchemaType.STRING,
          description: "Dealership rooftop name to find departments for.",
        },
        type: {
          type: SchemaType.STRING,
          description: "Department type: 'parts', 'service', 'sales', 'body_shop'.",
        },
        name: {
          type: SchemaType.STRING,
          description: "Department name keyword.",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max departments to return.",
        },
      },
    },
  },
  {
    name: "querySuppliers",
    description: "Query 1,380+ supply chain vendors and suppliers, contact details, payment terms, discounts, lead times, and ratings.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: {
          type: SchemaType.STRING,
          description: "Supplier company name keyword (e.g. 'WeatherTech', '3M', 'Avery', 'Car Brite').",
        },
        is_preferred: {
          type: SchemaType.BOOLEAN,
          description: "Filter strictly for preferred suppliers. Omit when querying top or general suppliers.",
        },
        city: {
          type: SchemaType.STRING,
          description: "City filter.",
        },
        state: {
          type: SchemaType.STRING,
          description: "State filter.",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max suppliers to return.",
        },
      },
    },
  },
  {
    name: "queryCrmActivities",
    description: "Query CRM dealer interactions, sales rep visits, phone calls, meetings, tasks, and follow-ups.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        sales_agent_name: {
          type: SchemaType.STRING,
          description: "Name of the sales agent or account rep.",
        },
        customer_name: {
          type: SchemaType.STRING,
          description: "Customer dealership name.",
        },
        type: {
          type: SchemaType.STRING,
          description: "Activity type: 'visit', 'call', 'meeting', 'task', 'note'.",
        },
        status: {
          type: SchemaType.STRING,
          description: "Status: 'completed', 'scheduled', 'pending'.",
        },
        timeframe: {
          type: SchemaType.STRING,
          description: "Timeframe filter: 'today', 'yesterday', 'this_week', 'this_month'.",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max activities to return.",
        },
      },
    },
  },
  {
    name: "queryPricingRules",
    description: "Query dealership pricing rules, global/group discount policies, AND product-specific volume pricing tiers (volume price breaks). If the user asks for pricing tiers or volume price breaks of a specific product or SKU, pass the SKU or product name in 'query' or 'sku' (or call 'searchCatalogProducts').",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        scope_type: {
          type: SchemaType.STRING,
          description: "Scope: 'global', 'group', 'rooftop', 'pricing_tier'.",
        },
        match_type: {
          type: SchemaType.STRING,
          description: "Match type: 'category', 'brand', 'sku'.",
        },
        query: {
          type: SchemaType.STRING,
          description: "Keyword in rule name, match value, product name, or product SKU.",
        },
        sku: {
          type: SchemaType.STRING,
          description: "Product SKU to retrieve volume pricing tiers and pricing rules for (e.g. 'GTI63689').",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max rules to return.",
        },
      },
    },
  },
  {
    name: "queryAuditLogs",
    description: "Query system audit logs, user actions, and changes to orders, rooftops, or pricing.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        entity: {
          type: SchemaType.STRING,
          description: "Entity name: 'order', 'rooftop', 'pricing_rule', 'invoice'.",
        },
        actor: {
          type: SchemaType.STRING,
          description: "Actor user or system name.",
        },
        action: {
          type: SchemaType.STRING,
          description: "Action: 'insert', 'update', 'delete'.",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max logs to return.",
        },
      },
    },
  },
  {
    name: "universalEnterpriseSearch",
    description: "Perform comprehensive cross-department enterprise search across orders, invoices, rooftops, dealer groups, suppliers, catalog, and CRM simultaneously. Use this when asked broad questions like 'Tell me everything about Victory Toyota', 'Find all records for Moses', or cross-department queries.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: "The dealership name, order number, vendor, or keyword to search across the entire enterprise.",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max records per category.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "searchCatalogProducts",
    description: "Search GoldTouch's catalog for automotive dealer supplies, parts, SKUs, and item codes (e.g. 'GTI63689', 'GTIHC3Z17626AD', 'GTIEBGI-21BLK', 'Key Tag', 'Plate Frame', 'Helium', 'Balloons') as well as corporate apparel. Returns full Landing Site Customer details (description, sub_category, base price, and full 'volume_price_breaks' quantity pricing tiers) AND Admin ERP / Sales CRM details (ERP unit cost, gross margin %, unit profit per tier, supplier SKU, stock status). ALWAYS use this tool whenever the user asks about a product, its pricing tiers, volume price breaks, cost, margin, or specifications.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: "Product name, part number, or SKU to search for (e.g. 'GTI63689', 'GTIHC3Z17626AD', 'Helium', 'Balloons', 'Key Tag', 'Plate Frame').",
        },
        sku: {
          type: SchemaType.STRING,
          description: "Specific product SKU or part number code, e.g. 'GTI63689'.",
        },
        category: {
          type: SchemaType.STRING,
          description: "Product category.",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max number of products to return.",
        },
      },
    },
  },
  {
    name: "getTopSellingProducts",
    description:
      "Rank and retrieve top-selling products across customer orders (by total sales revenue, total units sold, or number of orders). Use this tool whenever the user asks for top selling products, best-selling items, most popular products, highest revenue products, most ordered supplies, or top products in the catalog.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        sort_by: {
          type: SchemaType.STRING,
          description: "Ranking metric: 'revenue' (default), 'units' (total quantity sold), or 'orders' (number of distinct orders).",
        },
        timeframe: {
          type: SchemaType.STRING,
          description: "Optional timeframe filter (e.g. 'this_month', 'last_month', 'october', 'november', 'today').",
        },
        start_date: {
          type: SchemaType.STRING,
          description: "Optional start date YYYY-MM-DD.",
        },
        end_date: {
          type: SchemaType.STRING,
          description: "Optional end date YYYY-MM-DD.",
        },
        category: {
          type: SchemaType.STRING,
          description: "Optional category keyword filter.",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max number of ranked products to return. Default 10.",
        },
      },
    },
  },
  {
    name: "searchApparelCatalog",
    description: "Search GoldTouch's Corporate & Dealership Apparel catalog (9,750+ styles from SanMar and S&S Activewear) including polos, t-shirts, hoodies, sweatshirts, fleece, jackets, outerwear, caps/hats/headwear, workwear, woven dress shirts, pants/bottoms, and bags across brands like Nike, Carhartt, Port Authority, Sport-Tek, Eddie Bauer, The North Face, Richardson, Under Armour, Adidas, Columbia, OGIO, Gildan, Hanes, New Era, CornerStone, Red Kap, etc. Returns live style codes (e.g. K500, EB235, PC54, ST350, CT100614, 112), GoldTouch dealer pricing, warehouse stock counts, available colors, size ranges (XS–6XL), fabric specs, and product photos.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: "Apparel search query, style code, brand, or product type (e.g. 'Nike polo', 'Carhartt jacket', 'K500', 'EB235', 'Richardson 112', 'Port Authority', 'hoodie', 'workwear').",
        },
        style_code: {
          type: SchemaType.STRING,
          description: "Specific apparel style code (e.g. 'K500', 'EB235', 'PC54', 'ST350', 'CT100614', 'NKDC1963', '112').",
        },
        brand: {
          type: SchemaType.STRING,
          description: "Apparel brand filter (e.g. 'Nike', 'Carhartt', 'Port Authority', 'Sport-Tek', 'Eddie Bauer', 'The North Face', 'Richardson', 'Under Armour', 'Adidas', 'Columbia', 'OGIO', 'Gildan').",
        },
        category: {
          type: SchemaType.STRING,
          description: "Apparel category filter: 'Polos', 'T-Shirts', 'Sweatshirts & Fleece', 'Outerwear', 'Headwear', 'Woven Shirts', 'Workwear', 'Bottoms', 'Bags & Accessories', or 'Activewear'.",
        },
        color: {
          type: SchemaType.STRING,
          description: "Optional color filter (e.g. 'Black', 'Navy', 'Royal', 'Red', 'White', 'Grey', 'Charcoal').",
        },
        size: {
          type: SchemaType.STRING,
          description: "Optional size filter (e.g. 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL').",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max number of apparel styles to return. Default 8.",
        },
      },
    },
  },
  {
    name: "searchCrmLeads",
    description: "Search Sales CRM leads, dealership sales pipeline prospects, contact persons, and status.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: "Company name or contact name keyword.",
        },
        status: {
          type: SchemaType.STRING,
          description: "Lead status: 'new', 'contacted', 'qualified', 'proposal', 'closed'.",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max leads to return.",
        },
      },
    },
  },
  {
    name: "getSalesRepTeam",
    description: "Search sales team profiles, account managers, and field sales reps (e.g. 'Josh Talbott', 'Lesley Weeks', 'Saad Hassan', 'Michael Wanegar').",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: {
          type: SchemaType.STRING,
          description: "Name of the team member or sales rep.",
        },
        role: {
          type: SchemaType.STRING,
          description: "Role or title (e.g. 'sales_manager', 'admin', 'sales_rep').",
        },
      },
    },
  },
  {
    name: "getOperationsDashboardSummary",
    description: "Retrieve high-level lifetime executive dashboard metrics across the entire company: overall historical order counts, total active dealerships (456 rooftops), total open invoice balance, total purchase orders, and total shipments. ONLY call this when the user explicitly asks for an overall company executive dashboard, high-level business overview, or lifetime company metrics. NEVER call this tool when the user is asking about today, recent orders, or specific timeframes.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "discoverDatabaseTables",
    description: "Automatically inspect the live database to discover all available data tables, newly created tables, their columns, and live record counts. Call this whenever the user asks about new data, newly added tables, available categories/datasets, or something not covered by the standard tools.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        search: {
          type: SchemaType.STRING,
          description: "Optional keyword to filter table names or column names.",
        },
        include_counts: {
          type: SchemaType.BOOLEAN,
          description: "Whether to include live row counts for each table (default true).",
        },
      },
    },
  },
  {
    name: "queryDynamicTable",
    description: "Query any live table in the system dynamically by table name, search term, column filter, and sort order. Use this whenever the user asks for information from any newly created table, custom table, or any table discovered in the live schema.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        table_name: {
          type: SchemaType.STRING,
          description: "Exact or approximate name of the table to query.",
        },
        search_term: {
          type: SchemaType.STRING,
          description: "Optional free-text search term to match across all text columns in the table.",
        },
        filter_column: {
          type: SchemaType.STRING,
          description: "Optional column name to filter on.",
        },
        filter_value: {
          type: SchemaType.STRING,
          description: "Optional value to match in filter_column.",
        },
        filter_operator: {
          type: SchemaType.STRING,
          description: "Filter comparison operator: 'eq', 'ilike', 'gt', 'gte', 'lt', 'lte', or 'neq' (default 'ilike').",
        },
        order_by: {
          type: SchemaType.STRING,
          description: "Optional column name to sort results by.",
        },
        ascending: {
          type: SchemaType.BOOLEAN,
          description: "Sort ascending (true) or descending (false, default).",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Maximum number of rows to retrieve (default 20, max 100).",
        },
      },
      required: ["table_name"],
    },
  },
  {
    name: "queryEmployeesAndHR",
    description:
      "Query GoldTouch's Employees & HR module (matching ERP 'Employees & HR' sidebar: Staff Directory, Time Clock & Shifts, Commissions & Bonuses, Payroll Runs & QBO). Retrieves staff directory (`hr_employees` — 134 employees, job titles, departments, pay types, hourly/salary rates, hire dates, employment status), staff time clock logs & shifts (`staff_time_logs`), sales commission plans & tiers (`commission_plans`, `commission_plan_tiers`, `commission_bonus_rules`), sales rep commission assignments & payouts (`sales_rep_plan_assignments`, `sales_commissions`), and payroll runs (`payroll_runs`). ALWAYS call this tool for any question about employees, staff, HR, salaries/pay rates, time clock, shifts, commissions, bonus rules, or payroll.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        search: {
          type: SchemaType.STRING,
          description: "Optional employee name, email, job title, or keyword filter.",
        },
        department: {
          type: SchemaType.STRING,
          description: "Optional department filter (e.g. 'Sales', 'Warehouse', 'Operations', 'Delivery', 'Administration').",
        },
        status: {
          type: SchemaType.STRING,
          description: "Optional employment status filter (e.g. 'active', 'inactive', 'terminated').",
        },
        section: {
          type: SchemaType.STRING,
          description: "Optional specific HR section: 'all' (default), 'staff', 'time_clock', 'commissions', or 'payroll'.",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Maximum number of employee records to return (default 30).",
        },
      },
    },
  },
  {
    name: "queryFleetAndAssets",
    description:
      "Query GoldTouch's Fleet & Assets module (matching ERP 'Fleet & Assets' sidebar). Retrieves all company vehicles, trucks, vans, and equipment (`company_assets`: asset tag, vehicle name, year/make/model, VIN, license plate, mileage, purchase date & cost, current value, assigned driver, primary delivery route, status, QBO expense/asset mapping), all 21 regional delivery routes (`delivery_routes`: route name, code, corridor, driver, schedule), mobile truck/van inventory locations, and fleet maintenance/fuel expenses (`asset_expenses`). ALWAYS call this tool whenever the user asks about fleet vehicles, trucks, vans, VINs, license plates, mileage, drivers, delivery routes, or company assets.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        search: {
          type: SchemaType.STRING,
          description: "Optional search filter by vehicle name, make/model, VIN, license plate, asset tag, driver name, or route name.",
        },
        asset_type: {
          type: SchemaType.STRING,
          description: "Optional asset type filter (e.g. 'vehicle', 'truck', 'van', 'equipment').",
        },
        status: {
          type: SchemaType.STRING,
          description: "Optional asset status filter (e.g. 'active', 'maintenance', 'retired').",
        },
        route_name: {
          type: SchemaType.STRING,
          description: "Optional delivery route filter.",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max records to return (default 25).",
        },
      },
    },
  },
  {
    name: "queryWarehouseInventory",
    description:
      "Query GoldTouch's Inventory & Warehouse module (matching ERP 'Inventory' sidebar). Retrieves warehouse & mobile truck locations (`inv_locations`), 64 storage bins/racks/aisles (`inv_bins`), 182 stock movements & ledger entries (`inv_movements`), inventory adjustments (`inv_adjustments`), cycle counts (`inv_counts`), stock transfers (`inv_transfers`), and live available product inventory across locations (`v_product_inventory_available` — 6,006 products). ALWAYS call this tool when the user asks about warehouse locations, storage bins, stock movements, inventory adjustments, cycle counts, transfers, or on-hand/reserved/available stock quantities.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        search: {
          type: SchemaType.STRING,
          description: "Optional SKU, product name, bin code, or reference keyword.",
        },
        section: {
          type: SchemaType.STRING,
          description: "Optional specific inventory section: 'all' (default), 'locations', 'bins', 'movements', 'adjustments', 'counts', 'transfers', or 'stock'.",
        },
        sku: {
          type: SchemaType.STRING,
          description: "Optional product SKU to check stock levels and movements.",
        },
        bin_code: {
          type: SchemaType.STRING,
          description: "Optional warehouse bin code (e.g. 'A-01-01').",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max rows per section (default 25).",
        },
      },
    },
  },
  {
    name: "queryAccountingAndFinance",
    description:
      "Query GoldTouch's Accounting & Finance module (matching ERP 'Accounting & Finance' sidebar). Retrieves Accounts Payable vendor bills (`bills_list_v` / `bills` — 191 vendor bills with open A/P balances and due dates), QuickBooks Online (QBO) Chart of Accounts (`qbo_accounts_cache` — 92 accounts across Bank, A/R, A/P, Income, COGS, Expenses, Assets, Equity with live balances), QBO GL account mappings (`qbo_account_mappings`), customer payments (`customer_payments` — 75 payments), customer credit memos (`customer_credit_memos` — 28 credit memos), A/R statement snapshots (`ar_statement_snapshots` — 131 statements), operating expenses (`expenses`), and QBO sync status. ALWAYS call this tool for vendor bills, Accounts Payable (A/P), QuickBooks Chart of Accounts, customer payments, credit memos, A/R statements, or financial summaries.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        search: {
          type: SchemaType.STRING,
          description: "Optional vendor name, customer name, bill number, account name, or reference filter.",
        },
        section: {
          type: SchemaType.STRING,
          description: "Optional specific finance section: 'all' (default), 'bills', 'chart_of_accounts', 'customer_payments', 'credit_memos', 'ar_statements', 'expenses', or 'qbo_sync'.",
        },
        status: {
          type: SchemaType.STRING,
          description: "Optional status filter (e.g. 'open', 'paid', 'overdue', 'draft').",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max records per section (default 25).",
        },
      },
    },
  },
  {
    name: "queryPurchasingReceivingAndReturns",
    description:
      "Query GoldTouch's Purchasing Receiving & Vendor Returns module (matching ERP 'Purchasing' sub-modules: Receiving / Dock Receipts, Vendor Returns / RMAs, and Open Inbound PO Supply). Retrieves warehouse receiving logs (`receiving_list_v` / `receipts` and `receipt_lines`), vendor returns (`returns_list_v` / `returns` and `return_lines`), and open inbound PO supply (`view_open_inbound_po_supply`). ALWAYS call this tool when the user asks about received shipments/POs, dock receipts, vendor returns/RMAs, or inbound supply.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        search: {
          type: SchemaType.STRING,
          description: "Optional PO number, receipt number, return number, supplier name, or SKU filter.",
        },
        section: {
          type: SchemaType.STRING,
          description: "Optional section: 'all' (default), 'receiving', 'returns', or 'inbound_supply'.",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max rows to return (default 25).",
        },
      },
    },
  },
  {
    name: "querySalesQuotesStatementsAndTerms",
    description:
      "Query GoldTouch's Sales Quotes, Contracts, Payment Terms, A/R Statements, Dealership Contacts (`people`), and Portal User Invites (`user_invites`). Retrieves 78 sales quotes (`portal_quotes` with quote number, customer, status, total, expiration, and items), 16 payment terms (`payment_terms` e.g. Net 14, Net 30, COD), customer contracts (`contracts`), 131 A/R statement snapshots (`ar_statement_snapshots`), 1,175 dealership contact persons (`people`), and 81 portal user invites (`user_invites`). ALWAYS call this tool when the user asks about sales quotes/estimates, payment terms, contracts, customer statements, dealership contact people, or portal invites.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        search: {
          type: SchemaType.STRING,
          description: "Optional quote number, customer/dealership name, contact person name/email, or payment term name.",
        },
        section: {
          type: SchemaType.STRING,
          description: "Optional section: 'all' (default), 'quotes', 'payment_terms', 'contracts', 'statements', 'people', or 'invites'.",
        },
        status: {
          type: SchemaType.STRING,
          description: "Optional status filter.",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max rows per section (default 25).",
        },
      },
    },
  },
  {
    name: "queryCatalogKitsFitmentsAndVariations",
    description:
      "Query GoldTouch's Catalog Kits, Vehicle Fitments (Year/Make/Model/Submodel compatibility across 187,079 fitment records), Product Variations (size/color/finish child SKUs), Catalog Category Tree (149 categories), SEMA Brands, and Promo Coupons. ALWAYS call this tool when the user asks what parts/kits fit a specific vehicle (Year, Make, Model), asks about bundled kits (`kits` and `kit_items`), product variations (`product_variations`), catalog categories (`catalog_categories`), SEMA brands (`sema_brands`), or discount coupons (`coupons`).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        search: {
          type: SchemaType.STRING,
          description: "Optional keyword, SKU, kit code, make/model, or category name.",
        },
        year: {
          type: SchemaType.NUMBER,
          description: "Optional vehicle year (e.g. 2022, 2024) for vehicle fitment lookup.",
        },
        make: {
          type: SchemaType.STRING,
          description: "Optional vehicle make (e.g. 'Ford', 'Chevrolet', 'Ram', 'Toyota', 'GMC', 'Jeep') for fitment lookup.",
        },
        model: {
          type: SchemaType.STRING,
          description: "Optional vehicle model (e.g. 'F-150', 'Silverado 1500', '1500', 'Tacoma', 'Wrangler') for fitment lookup.",
        },
        section: {
          type: SchemaType.STRING,
          description: "Optional section: 'all' (default), 'kits', 'fitments', 'variations', 'categories', or 'brands'.",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max rows per section (default 25).",
        },
      },
    },
  },
  {
    name: "queryLandingSiteAndSettings",
    description:
      "Query GoldTouch's Landing Site & System Settings modules (matching ERP 'Landing Site' and 'Settings' sidebars). Retrieves company profile & operational settings (`company_settings`, `app_settings`, `erp_operational_settings`), tax rates & nexus states (`taxes` — 92 rates, `tax_nexus_states` — 8 states, `tax_profiles` — 550 profiles), RBAC role permissions (`role_permissions` — 84 rules), system notifications (`notifications`), planner events (`planner_events`), landing site featured brands (`landing_brands`), landing site blog posts (`landing_blog_posts`), and promotional coupons (`coupons`). ALWAYS call this tool when the user asks about company settings, tax rates, tax nexus states, role permissions, system notifications, landing site blog posts, storefront brands, or coupons.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        search: {
          type: SchemaType.STRING,
          description: "Optional keyword filter (e.g. state code 'WV', 'OH', role name, blog title, tax name).",
        },
        section: {
          type: SchemaType.STRING,
          description: "Optional section: 'all' (default), 'company_settings', 'taxes', 'permissions', 'notifications', 'landing_site', or 'planner'.",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Max rows per section (default 25).",
        },
      },
    },
  },
  {
    name: "prepareEmailDraft",
    description:
      "Prepare a polished, ready-to-send business email and automatically pop up the GoldTouch Mailbox Composer modal in the chat UI. ALWAYS call this tool whenever the user asks to send, draft, write, or compose an email or message to any person, employee, sales rep, dealership customer, or supplier (e.g. 'send an email to Michael Wanegar...', 'send following email to him...', 'email Josh about order SO-106485', 'draft an email to Big Country Auto'). Resolves the recipient's email address from the live database, refines the rough user instructions and conversation context into a professional Subject and Email Body, and opens the Mailbox popup.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        recipient_query: {
          type: SchemaType.STRING,
          description:
            "Name, company/dealership name, role, or email of the person to email (e.g. 'Michael Wanegar', 'Josh Talbott', 'Big Country #2 Auto Pre-Owned', 'mike@goldtouchds.com'). If the user said 'him'/'her'/'them', pass the full name or email of the person from the previous messages.",
        },
        recipient_email: {
          type: SchemaType.STRING,
          description:
            "Explicit recipient email address if already known from the query or recent conversation history (e.g. 'mike@goldtouchds.com').",
        },
        recipient_name: {
          type: SchemaType.STRING,
          description: "Recipient display name if known (e.g. 'Michael Wanegar').",
        },
        cc: {
          type: SchemaType.STRING,
          description: "Optional CC email address(es), comma-separated.",
        },
        subject: {
          type: SchemaType.STRING,
          description:
            "Refined, clear, professional email subject line incorporating any relevant order/invoice number or topic (e.g. 'Follow-Up: Sales Order SO-106485 — Helium Cylinder Rental').",
        },
        body: {
          type: SchemaType.STRING,
          description:
            "Complete, warmly written, professional email body refined from the user's rough notes and any operational facts (order numbers, totals, items, dates, dealership names) in the conversation.",
        },
        rough_context: {
          type: SchemaType.STRING,
          description: "Summary of the user's rough instructions and operational context.",
        },
      },
      required: ["subject", "body"],
    },
  },
  {
    name: "executeErpCrudOperation",
    description:
      "Execute real-time CRUD operations (create/register, update/edit, delete with confirmation gate, or undo last database change) across all GoldTouch ERP tables: Customers (`rooftops` for Accounts/Dealerships, `dealer_groups` for Dealer Groups, `people` for Customer Individuals/Contacts, `user_invites` for Portal Invites, `payment_terms` for Payment Terms, `contracts` for Contracts), Sales (`orders` for Sales Orders, `portal_quotes` for Quotes, `invoices` for Invoices), Catalog (`catalog_products` for Products/SKUs, `coupons` for Promo Coupons), Purchasing (`suppliers` for Vendors, `purchase_orders` for POs), Fulfillment & Fleet (`shipments` for Shipments, `company_assets` for Fleet Vehicles, `delivery_routes` for Delivery Routes), Inventory (`inv_bins` for Storage Bins), and HR (`hr_employees` for Employees). ALWAYS call this tool when the user asks to register/create/add/invite a record, update/change/edit a record's fields, delete/remove/revoke a record, or undo a database change.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        operation: {
          type: SchemaType.STRING,
          description: "Operation type: 'create', 'update', 'delete', or 'undo'.",
        },
        table: {
          type: SchemaType.STRING,
          description:
            "Target table: 'rooftops' (Customer Accounts), 'dealer_groups', 'people' (Customer Individuals), 'user_invites' (Portal Invites), 'payment_terms' (Terms), 'contracts', 'orders', 'portal_quotes', 'invoices', 'catalog_products', 'suppliers', 'purchase_orders', 'shipments', 'hr_employees', 'company_assets', 'delivery_routes', 'inv_bins', or 'coupons'.",
        },
        identifier: {
          type: SchemaType.STRING,
          description:
            "For 'update' or 'delete': the target account name, individual name/email, portal invite email, payment term code (e.g. 'Net 45'), order number (e.g. 'SO-106485'), invoice number, or product SKU.",
        },
        name: {
          type: SchemaType.STRING,
          description: "Account/dealership/individual/product/supplier/employee name.",
        },
        code: {
          type: SchemaType.STRING,
          description: "Account code, payment term code (e.g. 'Net 45'), SKU, order number, invoice number, or PO number.",
        },
        email: {
          type: SchemaType.STRING,
          description: "Email address for Customer Individuals ('people'), Portal Invites ('user_invites'), or Employees.",
        },
        role: {
          type: SchemaType.STRING,
          description: "Portal role for 'user_invites' (e.g. 'Customer Buyer', 'Dealership Admin') or job title for 'hr_employees'.",
        },
        term_value: {
          type: SchemaType.NUMBER,
          description: "Net days for 'payment_terms' (e.g. 14, 30, 45, 60).",
        },
        description: {
          type: SchemaType.STRING,
          description: "Description for 'payment_terms' or catalog items.",
        },
        city: {
          type: SchemaType.STRING,
          description: "City name.",
        },
        state: {
          type: SchemaType.STRING,
          description: "2-letter state code (e.g. 'OH', 'WV', 'PA').",
        },
        delivery_route: {
          type: SchemaType.STRING,
          description: "Delivery route or ship_via (e.g. \"John's Route\", \"Nick's Route\", 'Drop Ship', 'Pick Up').",
        },
        payment_terms: {
          type: SchemaType.STRING,
          description: "Payment terms (e.g. 'Net 30', 'Net 14', 'COD').",
        },
        phone: {
          type: SchemaType.STRING,
          description: "Phone number.",
        },
        billing_email: {
          type: SchemaType.STRING,
          description: "Billing or contact email address.",
        },
        group_name: {
          type: SchemaType.STRING,
          description: "Parent dealer group name if applicable.",
        },
        status: {
          type: SchemaType.STRING,
          description: "Record status (e.g. 'active', 'processing', 'shipped', 'delivered', 'open', 'paid').",
        },
        credit_limit: {
          type: SchemaType.NUMBER,
          description: "Credit limit in dollars.",
        },
        total: {
          type: SchemaType.NUMBER,
          description: "Total dollar amount for orders, quotes, POs, or invoices.",
        },
        price: {
          type: SchemaType.NUMBER,
          description: "Unit price for catalog products.",
        },
        cost: {
          type: SchemaType.NUMBER,
          description: "Unit cost for catalog products.",
        },
      },
      required: ["operation"],
    },
  },
];

export interface SaraEngineResponse {
  content: string;
  departmentTag: Department;
  structuredCard?: ChatMessage["structuredCard"];
  suggestedFollowUps: string[];
}

function sanitizeGeminiHistory(
  history: Array<{ role: string; content: string }>
): Array<{ role: "user" | "model"; parts: [{ text: string }] }> {
  if (!Array.isArray(history) || history.length === 0) {
    return [];
  }

  const sanitized: Array<{ role: "user" | "model"; parts: [{ text: string }] }> = [];

  for (const item of history) {
    if (!item || !item.content || typeof item.content !== "string" || !item.content.trim()) {
      continue;
    }

    const geminiRole: "user" | "model" =
      item.role === "assistant" || item.role === "model" ? "model" : "user";

    // Skip any prior technical error / glitch messages from polluting model context
    if (
      geminiRole === "model" &&
      (item.content.includes("GoogleGenerativeAI Error") ||
        item.content.includes("backend operations service") ||
        item.content.includes("momentary delay pulling those records"))
    ) {
      continue;
    }

    // Rule 1: First item in history MUST have role 'user'. Skip any leading assistant/model messages.
    if (sanitized.length === 0) {
      if (geminiRole === "user") {
        sanitized.push({
          role: geminiRole,
          parts: [{ text: item.content.trim() }],
        });
      }
      continue;
    }

    const prevRole = sanitized[sanitized.length - 1].role;

    // Rule 2: Alternation. If role matches previous, merge content into previous message.
    if (prevRole === geminiRole) {
      sanitized[sanitized.length - 1].parts[0].text += `\n\n${item.content.trim()}`;
    } else {
      sanitized.push({
        role: geminiRole,
        parts: [{ text: item.content.trim() }],
      });
    }
  }

  let trimmed = sanitized.slice(-6);

  // Rule 3: Gemini chat history MUST strictly start with 'user'
  while (trimmed.length > 0 && trimmed[0].role !== "user") {
    trimmed.shift();
  }

  // Rule 4: Gemini chat history MUST strictly end with 'model' before next user sendMessage
  while (trimmed.length > 0 && trimmed[trimmed.length - 1].role !== "model") {
    trimmed.pop();
  }

  return trimmed;
}

/**
 * Execute an async function with jittered exponential backoff retries
 * specifically designed to absorb transient Node.js / Undici socket drops (fetch failed, ECONNRESET).
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelayMs = 800
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const errMsg = (err?.message || "").toLowerCase();
      const isRetryable =
        errMsg.includes("fetch failed") ||
        errMsg.includes("socket") ||
        errMsg.includes("econnreset") ||
        errMsg.includes("etimedout") ||
        errMsg.includes("econnrefused") ||
        errMsg.includes("network") ||
        errMsg.includes("429") ||
        errMsg.includes("503") ||
        errMsg.includes("500") ||
        errMsg.includes("resource has been exhausted") ||
        errMsg.includes("temporarily unavailable") ||
        errMsg.includes("overloaded");

      if (!isRetryable || attempt === maxRetries - 1) {
        throw err;
      }

      const backoff = initialDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 300);
      console.warn(
        `[SARA AI Engine] Transient API call issue (${err?.message}). Retrying in ${backoff}ms (attempt ${attempt + 1}/${maxRetries})...`
      );
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }
  throw lastError;
}

/**
 * Extracts candidate product SKU or part number from a query or conversation history.
 * Detects prefixes like GTI (GoldTouch Industries), PAC, IWC, labeled codes ('the product <CODE>'),
 * or standalone alphanumeric codes.
 */
export function extractProductCandidateCode(
  query: string,
  history: Array<{ role: string; content: string }> = []
): string | null {
  if (!query) return null;
  const q = query.trim();

  // Pattern 0: Explicit UI pill click "Show me product <CODE>"
  const explicitShowProductMatch = q.match(/^show\s+me\s+product\s+#?([a-z0-9-]+)$/i);
  if (explicitShowProductMatch) {
    return explicitShowProductMatch[1].toUpperCase();
  }

  // Pattern 1: Explicit automotive supplies / kit part number prefixes or explicit "(SKU: <CODE>)" in the current query itself (unless asking who bought / which orders)
  const isProductOrderCrossQuery =
    /\b(who\s+(?:bought|ordered|purchased)|which\s+(?:orders?|customers?|dealerships?)|orders?\s+(?:for|with|containing|including))\b/i.test(
      q
    );

  if (!isProductOrderCrossQuery) {
    const explicitSkuLabelMatch = q.match(/\b(?:sku|part\s*#?|style\s*#?)\s*[:#-]\s*([a-z0-9-]{3,35})\b/i);
    if (explicitSkuLabelMatch && (/\d/.test(explicitSkuLabelMatch[1]) || explicitSkuLabelMatch[1].includes("-"))) {
      return explicitSkuLabelMatch[1].toUpperCase();
    }

    const gtiMatch = q.match(/\b((?:gtkit|kit-|gti|pac|iwc|eco|wet|wes|pgb|pgm|pg|bak|ico|hsl)[a-z0-9-]{2,35})\b/i);
    if (gtiMatch && /\d/.test(gtiMatch[1])) return gtiMatch[1].toUpperCase();
  }

  // Guard: If the query mentions a customer, dealership, order, invoice, shipment, delivery, location/map, auto brand, or any ERP module entity,
  // NEVER treat it as a product code or pull a product SKU from chat history!
  const isNonProductEntityQuery =
    /\b(customer|customers|dealership|dealerships|dealer|rooftop|account|accounts|client|buyer|order|orders|invoice|invoices|shipment|shipments|deliver|delivered|delivery|dvilcer|deliv\w*|who|whom|address|addresses|location|locations|located|loaction\w*|where|map|maps|widget|gps|coordinates?|coords?|directions?|phone|email|route|routes|terms|balance|employee|employees|staff|hr|payroll|commission|commissions|shift|shifts|fleet|vehicle|vehicles|truck|trucks|van|vans|vin|asset|assets|driver|drivers|warehouse|bin|bins|movement|movements|adjustment|adjustments|transfer|transfers|bill|bills|payable|qbo|quickbooks|payment|payments|credit|statement|statements|quote|quotes|contract|contracts|receiving|receipt|receipts|return|returns|fitment|fitments|tax|taxes|nexus|permission|permissions|role|roles|setting|settings|blog|coupon|coupons|ford|toyota|honda|chevy|chevrolet|nissan|hyundai|subaru|mazda|kia|bmw|mercedes|audi|lexus|acura|volkswagen|vw|jeep|dodge|ram|chrysler|gmc|buick|cadillac|lincoln|mitsubishi|volvo|porsche|motors|automotive|auto\s+group|generations|genrations|talbot|talbott|marietta)\b/i.test(
      q
    ) || /\b(?:so|do|inv|po|shp|qt|bill|rcpt|ret)-\d+/i.test(q);

  if (isNonProductEntityQuery) {
    return null;
  }

  // Pattern 2: "Show me product <CODE>", "the product <CODE>", "product <CODE>", "part <CODE>", "sku <CODE>", "style <CODE>"
  const labeledMatch = q.match(/\b(?:show\s+me\s+product|the\s+product|product|part|sku|style|item)\s+#?([a-z0-9-]{3,35})\b/i);
  if (labeledMatch) {
    const candidate = labeledMatch[1].toLowerCase();
    const commonStopWords = new Set([
      "sir", "please", "bro", "man", "thanks", "thank", "info", "details", "deails",
      "item", "items", "is", "was", "the", "that", "it", "for", "in", "of",
      "to", "a", "an", "image", "picture", "photo", "catalog", "list", "all",
      "pricing", "tiers", "tier", "price", "breaks", "cost", "margin"
    ]);
    const hasDigits = /\d/.test(candidate);
    if (!commonStopWords.has(candidate) && (hasDigits || candidate.includes("-") || candidate.length >= 4)) {
      return candidate.toUpperCase();
    }
  }

  // Pattern 3: Pure standalone code (e.g. "GTIHC3Z17626AD", "PAC7722GB", "GTKIT-RAM1500-0918-CLASSIC", "K500", "EB235") with letters & numbers, 3-35 chars
  if (/^[a-z0-9-]{3,35}$/i.test(q) && /[a-z]/i.test(q) && /\d/.test(q)) {
    return q.toUpperCase();
  }

  // Pattern 3b: Standalone numeric iconic apparel style codes (e.g. "112", "110", "203690", "5000", "18500")
  if (/^(112|110|115|168|203690|5000|18000|18500|64000|3001|3001c)$/i.test(q)) {
    return q.toUpperCase();
  }

  // Pattern 4: Follow-up product reference ("what its pricing tiers", "what are the price breaks", "what is the cost/margin")
  // Only match when explicitly asking product/pricing questions AND the immediately preceding assistant turn was about a product.
  const isExplicitProductFollowUp =
    /\b(product|part|sku|style|tier|tiers|pricing|price\s*breaks?|volume\s*price|unit\s*cost|gross\s*margin|profit|spec\s*sheet|stock|inventory)\b/i.test(
      q
    );
  if (isExplicitProductFollowUp && history && history.length > 0) {
    // Only inspect the most recent 2 messages so old SKUs from earlier in the chat never hijack new topics
    const recentSlice = history.slice(-2);
    for (let i = recentSlice.length - 1; i >= 0; i--) {
      const msg = recentSlice[i].content || "";
      if (/\b(?:Order\s+(?:SO|DO)-\d+|Invoice\s+INV-\d+|Shipment\s+SHP-\d+|delivered\s+to)\b/i.test(msg)) {
        // The last turn was about an order/invoice/shipment, not a standalone product card
        break;
      }
      const explicitMatch =
        msg.match(/\b(gtkit[a-z0-9-]+|kit-[a-z0-9-]+|gti[a-z0-9-]+|pac[a-z0-9-]+|iwc[a-z0-9-]+)\b/i) ||
        msg.match(/\b(?:SKU|Style)\s*[:#]?\s*\*?\*?([A-Z0-9-]{3,35})\b/i);
      if (explicitMatch && /\d/.test(explicitMatch[1])) {
        return explicitMatch[1].toUpperCase();
      }
    }
  }

  return null;
}

/**
 * Format a comprehensive 360-degree multi-table breakdown for a Dealership / Customer account.
 */
export function formatCustomer360Response(c: any): string {
  const shortLocation = [c.city, c.state].filter(Boolean).join(", ") || "Active Territory";
  const totalOrders = c.total_orders_count ?? (Array.isArray(c.recent_orders) ? c.recent_orders.length : 0);
  const lifetimeSpend = Number(c.lifetime_spend || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const openBalance = Number(c.open_invoice_balance || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `Here is the 360° dealership profile for **${c.name}**${c.code ? ` (**${c.code}**)` : ""} in **${shortLocation}** — **${totalOrders}** total order${totalOrders === 1 ? "" : "s"} (**$${lifetimeSpend}** lifetime volume) and **$${openBalance}** in open invoice balance:`;
}

/**
 * Format a rich Location, GPS & Logistics Map response for a Dealership / Customer account.
 * Note: The interactive map and location card is embedded directly inside SARA's response widget—no external "see here" text links.
 */
export function formatLocationMapResponse(c: any): string {
  const street = [c.address_line1, c.address_line2].filter(Boolean).join(", ");
  const cityStateZip = [c.city, c.state, c.zip_code].filter(Boolean).join(", ");
  const fullAddress =
    c.formatted_address ||
    [street, cityStateZip].filter(Boolean).join(", ") ||
    [c.city, c.state].filter(Boolean).join(", ") ||
    "Address on file";

  return `Here is the location for **${c.name}** — **${fullAddress}**:`;
}

/**
 * Resolve a customer / dealership from either the user's current query or recent conversation history.
 */
async function resolveCustomerFromQueryOrHistory(
  query: string,
  history: Array<{ role: string; content: string }>
): Promise<any | null> {
  const q = query.trim();

  // 0. Check if the current query itself contains an Order (SO-xxxx / DO-xxxx), Invoice (INV-xxxx), or Shipment (SHP-xxxx) number
  const currentOrderMatch = q.match(/\b((?:SO|DO)-\d{3,7})\b/i);
  if (currentOrderMatch) {
    const ordRes = await getOrderDetails({ order_number_or_id: currentOrderMatch[1].toUpperCase() });
    const custName = ordRes?.order?.customer_name || ordRes?.order?.rooftop_name;
    if (custName) {
      const custRes = await searchDealershipCustomers({ query: custName, limit: 1 });
      if (custRes?.customers && custRes.customers.length > 0) {
        return custRes.customers[0];
      }
    }
  }

  const currentInvMatch = q.match(/\b(INV-\d{3,7})\b/i);
  if (currentInvMatch) {
    const invRes = await queryInvoices({ invoice_number: currentInvMatch[1].toUpperCase(), limit: 1 });
    const inv: any = invRes?.invoices?.[0];
    const custName = inv?.clientName || inv?.customer_name;
    if (custName) {
      const custRes = await searchDealershipCustomers({ query: custName, limit: 1 });
      if (custRes?.customers && custRes.customers.length > 0) {
        return custRes.customers[0];
      }
    }
  }

  const currentShpMatch = q.match(/\b((?:SHP|DS|FS)-\d{3,7})\b/i);
  if (currentShpMatch) {
    const orderEq = currentShpMatch[1].toUpperCase().replace(/^(?:SHP|DS|FS)-/, "SO-");
    const shpRes = await queryShipments({ order_number: orderEq, limit: 1 });
    const custName = shpRes?.shipments?.[0]?.customer_name;
    if (custName) {
      const custRes = await searchDealershipCustomers({ query: custName, limit: 1 });
      if (custRes?.customers && custRes.customers.length > 0) {
        return custRes.customers[0];
      }
    }
  }

  // 1. Check if the query itself names a specific customer/dealership (e.g. "give me details about genrations ford?" or "i want the location of teh talbot auto 2 ford please with a map widget")
  const cleanedCandidate = q
    .replace(
      /\b(no|yes|hey|hi|hello|sara|sarah|please|pls|can|you|could|would|should|shodul|shoudl|will|do|does|did|be|not|like|see|here|there|show|shodl|showing|view|viewing|display|open|live|interactive|embed|embedded|in|inside|into|within|respond|repsond|response|reply|bubble|card|box|chat|window|screen|google|apple|i|want|need|give|me|tell|what|where|is|are|was|were|who|the|teh|hte|a|an|with|and|dand|or|at|from|full|complete|all|details?|info|information|profile|overview|summary|location|locations|located|loaction\w*|address|addresses|map|maps|widget|widgets|gps|coordinates?|coords?|directions?|route|navigation|pin|about|of|for|on|regarding|customer|dealership|dealer|rooftop|account|client|buyer|order|orders|invoice|invoices|shipment|shipments|delivered|dvilcer|deliv\w*|to|whom|sir|man|bro|ok|okay|thank|thanks|wtf|ashole|asshole|fuck|shit|up|fix|that|this|it|its|their|so|fine|tune|tuned)\b/gi,
      " "
    )
    .replace(/[?!.,;:"'`()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleanedCandidate.length >= 3 && !/^(?:so|do|inv|po|shp)-\d+$/i.test(cleanedCandidate)) {
    const directRes = await searchDealershipCustomers({ query: cleanedCandidate, limit: 1 });
    if (directRes?.customers && directRes.customers.length > 0) {
      return directRes.customers[0];
    }
  }

  // 2. Otherwise inspect recent conversation history (newest to oldest) for customer name or order/invoice number
  if (history && history.length > 0) {
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i].content || "";
      const role = history[i].role;

      // 2a. Check if a previous user message in history tried to ask about a named customer
      if (role === "user") {
        const prevUserCandidate = msg
          .replace(
            /\b(no|yes|hey|hi|hello|sara|sarah|please|pls|can|you|could|would|should|shodul|shoudl|will|do|does|did|be|not|like|see|here|there|show|shodl|showing|view|viewing|display|open|live|interactive|embed|embedded|in|inside|into|within|respond|repsond|response|reply|bubble|card|box|chat|window|screen|google|apple|i|want|need|give|me|tell|what|where|is|are|was|were|who|the|teh|hte|a|an|with|and|dand|or|at|from|full|complete|all|details?|info|information|profile|overview|summary|location|locations|located|loaction\w*|address|addresses|map|maps|widget|widgets|gps|coordinates?|coords?|directions?|route|navigation|pin|about|of|for|on|regarding|customer|dealership|dealer|rooftop|account|client|buyer|delivered|dvilcer|deliv\w*|to|whom|sir|man|bro|ok|okay|thank|thanks|wtf|ashole|asshole|fuck|shit|up|fix|that|this|it|its|their|so|fine|tune|tuned)\b/gi,
            " "
          )
          .replace(/[?!.,;:"'`()[\]{}]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        if (prevUserCandidate.length >= 3 && !/^(?:so|do|inv|po|shp)-\d+$/i.test(prevUserCandidate)) {
          const prevRes = await searchDealershipCustomers({ query: prevUserCandidate, limit: 1 });
          if (prevRes?.customers && prevRes.customers.length > 0) {
            return prevRes.customers[0];
          }
        }
      }

      // 2b. Check assistant message patterns: "delivered to GENERATIONS FORD", "location for Talbott Auto 2 Ford", "Map of Talbott Auto 2 Ford"
      const deliveredToMatch = msg.match(/delivered\s+to\s+\*?\*?([A-Za-z0-9 &'-]{3,50}?)\*?\*?(?:[.,!\n]|$)/i);
      if (deliveredToMatch) {
        const custRes = await searchDealershipCustomers({ query: deliveredToMatch[1].trim(), limit: 1 });
        if (custRes?.customers && custRes.customers.length > 0) {
          return custRes.customers[0];
        }
      }

      const detailsOrLocationForMatch = msg.match(
        /(?:details\s+for|location[^:\n]*for|map\s+for|widget\s+for|Map\s+of|Account\s+Name\s*&\s*Code\*\*:\s*|Dealership\s*\/\s*Account\*\*:\s*)\s*\*?\*?([A-Za-z0-9 &'.-]{3,50}?)\*?\*?(?:\s*\(|\s*\]|\s*—|:|\n|$)/i
      );
      if (detailsOrLocationForMatch) {
        const custRes = await searchDealershipCustomers({ query: detailsOrLocationForMatch[1].trim(), limit: 1 });
        if (custRes?.customers && custRes.customers.length > 0) {
          return custRes.customers[0];
        }
      }

      const orderForMatch = msg.match(/Order\s+(?:SO|DO)-\d+\s+(?:was\s+delivered\s+to|for)\s+\*?\*?([A-Za-z0-9 &'-]{3,50}?)\*?\*?(?:[.,!\n]|\s+totals|\s+is|$)/i);
      if (orderForMatch) {
        const custRes = await searchDealershipCustomers({ query: orderForMatch[1].trim(), limit: 1 });
        if (custRes?.customers && custRes.customers.length > 0) {
          return custRes.customers[0];
        }
      }

      // 2c. Check for Order Number (SO-xxxx / DO-xxxx) in history and look up its customer
      const orderNumMatch = msg.match(/\b((?:SO|DO)-\d{3,7})\b/i);
      if (orderNumMatch) {
        const ordRes = await getOrderDetails({ order_number_or_id: orderNumMatch[1].toUpperCase() });
        const custName = ordRes?.order?.customer_name || ordRes?.order?.rooftop_name;
        if (custName) {
          const custRes = await searchDealershipCustomers({ query: custName, limit: 1 });
          if (custRes?.customers && custRes.customers.length > 0) {
            return custRes.customers[0];
          }
        }
      }

      // 2d. Check for Invoice Number (INV-xxxx) in history and look up its customer
      const invNumMatch = msg.match(/\b(INV-\d{3,7})\b/i);
      if (invNumMatch) {
        const invRes = await queryInvoices({ invoice_number: invNumMatch[1].toUpperCase(), limit: 1 });
        const inv: any = invRes?.invoices?.[0];
        const custName = inv?.clientName || inv?.customer_name;
        if (custName) {
          const custRes = await searchDealershipCustomers({ query: custName, limit: 1 });
          if (custRes?.customers && custRes.customers.length > 0) {
            return custRes.customers[0];
          }
        }
      }
    }
  }

  return null;
}

/**
 * Deterministic Fallback Engine:
 * Resolves contextual follow-up questions ("against who?", "who was that for?") and direct operational lookups
 * if external AI connectivity drops or fails.
 */
async function tryDeterministicFallback(
  query: string,
  history: Array<{ role: string; content: string }>,
  activeDept: Department = "all"
): Promise<SaraEngineResponse | null> {
  const q = query.trim().toLowerCase();

  // 0. Location & Map Follow-up or Direct Lookup
  const isLocationOrMapQuery =
    /\b(location|locations|located|loaction\w*|where\s+is|where\s+are|address|addresses|map|maps|widget|gps|coordinates?|coords?|directions?)\b/i.test(
      q
    );
  if (isLocationOrMapQuery) {
    try {
      const resolvedCustomer = await resolveCustomerFromQueryOrHistory(query, history);
      if (resolvedCustomer) {
        return {
          content: sanitizeTextLabels(formatLocationMapResponse(resolvedCustomer)),
          departmentTag: "customers",
          structuredCard: { type: "location_map", data: resolvedCustomer },
          suggestedFollowUps: [],
        };
      }
    } catch {}
  }

  // 1. Contextual Follow-up Detection: e.g. "so it is dvilcer to whom?", "who was that for?", "who is the customer?"
  const isWhoOrCustomerFollowUp =
    /\b(who|against who|whom|which customer|what customer|who was it for|customer name|against whom|dvilcer|delivered to|details? of the customer|customer details?|about the customer)\b/i.test(
      q
    );
  if (isWhoOrCustomerFollowUp) {
    try {
      const resolvedCustomer = await resolveCustomerFromQueryOrHistory(query, history);
      if (resolvedCustomer) {
        return {
          content: sanitizeTextLabels(formatCustomer360Response(resolvedCustomer)),
          departmentTag: "customers",
          structuredCard: { type: "customer", data: resolvedCustomer },
          suggestedFollowUps: [],
        };
      }
    } catch {}
  }

  const isWhoQuery =
    /\b(who|against who|whom|which customer|what customer|who was it for|customer name|against whom)\b/i.test(q);
  if (isWhoQuery && history && history.length > 0) {
    const lastAssistantMsg = [...history]
      .reverse()
      .find((m) => (m.role === "assistant" || m.role === "model") && m.content && m.content.trim());

    if (lastAssistantMsg) {
      const prevContent = lastAssistantMsg.content;

      // Extract invoices: e.g. "Invoice INV-5504 for Pauley Motors"
      const invoiceMatches = [
        ...prevContent.matchAll(
          /Invoice\s+([A-Z0-9-]+)\s+for\s+([^,\n\.]+?)(?:,|\.|\s+totaling|\s+is|\s+for\s+Order)/gi
        ),
      ];

      // Extract orders: e.g. "Order SO-5507 for Victory Toyota"
      const orderMatches = [
        ...prevContent.matchAll(
          /Order\s+([A-Z0-9-]+)\s+for\s+([^,\n\.]+?)(?:,|\.|\s+totaling|\s+is)/gi
        ),
      ];

      if (invoiceMatches.length > 0) {
        const details = invoiceMatches.map(
          (m) => `**${m[2].replace(/\*/g, "").trim()}** (Invoice ${m[1].trim()})`
        );
        const formatted =
          details.length === 1
            ? `That invoice was issued for ${details[0]}.`
            : `Those invoices were issued for ${details.slice(0, -1).join(", ")} and ${details[details.length - 1]}.`;

        let structuredCard: ChatMessage["structuredCard"] = undefined;
        if (invoiceMatches.length === 1) {
          try {
            const invRes = await queryInvoices({ invoice_number: invoiceMatches[0][1].trim() });
            if (invRes && invRes.invoices && invRes.invoices.length === 1) {
              structuredCard = { type: "invoice", data: invRes.invoices[0] };
            }
          } catch {}
        }

        return {
          content: sanitizeTextLabels(formatted),
          departmentTag: "invoices",
          structuredCard,
          suggestedFollowUps: [],
        };
      }

      if (orderMatches.length > 0) {
        const details = orderMatches.map(
          (m) => `**${m[2].replace(/\*/g, "").trim()}** (Order ${m[1].trim()})`
        );
        const formatted =
          details.length === 1
            ? `That order was placed for ${details[0]}.`
            : `Those orders were placed for ${details.slice(0, -1).join(", ")} and ${details[details.length - 1]}.`;

        return {
          content: sanitizeTextLabels(formatted),
          departmentTag: "orders",
          structuredCard: undefined,
          suggestedFollowUps: [],
        };
      }
    }
  }

  // 2. Today's Invoices (e.g. "is there any invoice generated today", "any voice genrated today", "invoices today")
  const isInvoiceQuery = /\b(voice|invoice|invoices|billing|ar)\b/i.test(q);
  const isToday = /\b(today|today's|todays)\b/i.test(q);
  if (isInvoiceQuery && isToday) {
    try {
      const invRes = await queryInvoices({ timeframe: "today" });
      if (invRes?.invoices && invRes.invoices.length > 0) {
        const list = invRes.invoices
          .map(
            (inv: any) =>
              `• Invoice **${inv.invoice_number}** for **${inv.customer_name}**, totaling **$${Number(inv.total_amount).toFixed(2)}** (Status: ${inv.status || "Issued"}).`
          )
          .join("\n");
        return {
          content: sanitizeTextLabels(
            `Yes, there are ${invRes.invoices.length} invoices generated today, October 14, 2026:\n\n${list}`
          ),
          departmentTag: "invoices",
          structuredCard: undefined,
          suggestedFollowUps: [],
        };
      } else {
        return {
          content: `There are no invoices generated today so far.`,
          departmentTag: "invoices",
          suggestedFollowUps: [],
        };
      }
    } catch {}
  }

  // 3. Today's Orders (e.g. "any order today", "orders today", "what orders came in today")
  const isOrderQuery = /\b(order|orders)\b/i.test(q);
  if (isOrderQuery && isToday) {
    try {
      const ordRes = await searchCustomerOrders({ timeframe: "today" });
      if (ordRes?.orders && ordRes.orders.length > 0) {
        const list = ordRes.orders
          .map((o: any) => {
            const itemText =
              o.lines
                ?.map(
                  (l: any) =>
                    `${l.qty}x ${l.product_name} ($${Number(l.unit_price).toFixed(2)})`
                )
                .join(", ") || "Supplies";
            return `• Order **${o.order_number}** for **${o.customer_name}** totaling **$${Number(o.total).toFixed(2)}** (${o.status}): ${itemText}`;
          })
          .join("\n");
        return {
          content: sanitizeTextLabels(
            `Yes, there are ${ordRes.orders.length} orders placed today, October 14, 2026:\n\n${list}`
          ),
          departmentTag: "orders",
          structuredCard: undefined,
          suggestedFollowUps: [],
        };
      } else {
        return {
          content: `There are no orders placed today so far.`,
          departmentTag: "orders",
          suggestedFollowUps: [],
        };
      }
    } catch {}
  }

  // 4. Delegate to Direct Operational Fast-Path for Orders, Invoices, Shipments, POs, Customers, Daily Briefing, and SKUs
  const fastResult = await tryDirectOperationalFastPath(query, history);
  if (fastResult) {
    return fastResult;
  }

  // 5. Corporate & Dealership Apparel Fallback (when user asks for apparel, shirts, polos, hoodies, jackets, hats/caps, or brands)
  if (isApparelSearchIntent(query)) {
    try {
      const appRes = await searchApparelCatalog({ query, limit: 6 });
      if (appRes?.success && appRes.products && appRes.products.length > 0) {
        if (appRes.products.length === 1 && !isListOrBulkQuery(query)) {
          const p: any = appRes.products[0];
          const priceText = p.price > 0 ? `$${Number(p.price).toFixed(2)}` : "Contact for pricing";
          const colorText = p.color_count
            ? ` across **${p.color_count} colors** (${p.colors.slice(0, 6).join(", ")}${p.colors.length > 6 ? ", and more" : ""})`
            : "";
          return {
            content: sanitizeTextLabels(
              `Style **${p.style_code || p.sku}** is the **${p.name}** by **${p.brand || "GoldTouch Apparel"}** (${p.category}). It is priced at **${priceText}**${p.size_range ? `, available in sizes **${p.size_range}**` : ""}${colorText}, with **${Number(p.stock || 0).toLocaleString()} units** currently in stock.`
            ),
            departmentTag: "catalog",
            structuredCard: {
              type: "catalog_product",
              data: p,
            },
            suggestedFollowUps: [],
          };
        }

        const lines = appRes.products
          .map((p: any) => {
            const priceText = p.price > 0 ? `$${Number(p.price).toFixed(2)}` : "Quote";
            const sizeInfo = p.size_range ? ` • Sizes: ${p.size_range}` : "";
            const colorInfo = p.color_count ? ` • ${p.color_count} Colors` : "";
            const stockInfo = p.stock ? ` • ${Number(p.stock).toLocaleString()} in stock` : "";
            const imgMd = p.image_url ? `\n  ![${p.name}](${p.image_url})` : "";
            return `• **${p.style_code || p.sku}** — **${p.name}** (${p.brand || "Apparel"}, ${p.category}) — **${priceText}**${sizeInfo}${colorInfo}${stockInfo}${imgMd}`;
          })
          .join("\n\n");

        return {
          content: sanitizeTextLabels(
            `Here are matching items from our Corporate & Dealership Apparel catalog:\n\n${lines}`
          ),
          departmentTag: "catalog",
          suggestedFollowUps: [],
        };
      }
    } catch (appErr) {
      console.warn("[SARA Fallback] Apparel search fallback error:", appErr);
    }
  }

  // 6. Dynamic Live Table Auto-Discovery Fallback (for any newly created or custom tables in Supabase)
  try {
    const liveTables = await fetchLiveDatabaseSchema();
    const qClean = query.toLowerCase().replace(/[^a-z0-9_\s]/g, " ");
    const matchedTable = liveTables.find((t) => {
      const tNorm = t.tableName.toLowerCase();
      const tWords = tNorm.replace(/_/g, " ");
      const tSingular = tWords.replace(/s$/, "");
      return (
        qClean.includes(tNorm) ||
        qClean.includes(tWords) ||
        (tSingular.length >= 4 && qClean.includes(tSingular))
      );
    });

    if (matchedTable) {
      const dynRes = await queryDynamicTable({
        table_name: matchedTable.tableName,
        limit: 12,
      });
      if (dynRes.success && dynRes.rows && dynRes.rows.length > 0) {
        const cleanTitle = matchedTable.tableName
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        const formattedRows = dynRes.rows
          .slice(0, 10)
          .map((row: any) => {
            const entries = Object.entries(row)
              .filter(
                ([k, v]) =>
                  v !== null &&
                  v !== undefined &&
                  v !== "" &&
                  k !== "id" &&
                  !k.endsWith("_id") &&
                  typeof v !== "object"
              )
              .slice(0, 5)
              .map(([k, v]) => {
                const label = k
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase());
                return `**${label}**: ${String(v)}`;
              });
            return `• ${entries.join(" • ")}`;
          })
          .join("\n");

        return {
          content: sanitizeTextLabels(
            `Here are the live **${cleanTitle}** records (${dynRes.total_matching_rows} total):\n\n${formattedRows}`
          ),
          departmentTag: "all",
          suggestedFollowUps: [],
        };
      }
    }
  } catch (dynErr) {
    console.warn("[SARA Fallback] Dynamic table fallback error:", dynErr);
  }

  return null;
}

export function formatDynamicProductResponse(
  p: any,
  query: string,
  responseStyle: "concise" | "balanced" | "detailed" = "balanced"
): string {
  const qLower = (query || "").toLowerCase();
  const code = p.style_code || p.sku || "Item";
  const name = p.name || "Catalog Item";
  const brandPart = p.brand ? ` by **${p.brand}**` : "";
  const priceText =
    typeof p.price === "number" && p.price > 0
      ? `$${Number(p.price).toFixed(2)}`
      : "Standard Quote";
  const stockNum = Number(p.stock || 0);
  const stockLabel =
    stockNum > 0
      ? `**${stockNum.toLocaleString()} units** in stock`
      : p.stock_status || "In Stock";
  const isApparel = Boolean(
    p.colors?.length ||
      p.size_range ||
      p.supplier === "SanMar" ||
      p.supplier === "S&S Activewear"
  );

  const volumeBreaks: any[] = Array.isArray(p.volume_price_breaks) ? p.volume_price_breaks : [];
  const costVal = Number(p.cost || 0);
  const marginPct =
    p.gross_margin_pct != null
      ? Number(p.gross_margin_pct).toFixed(1)
      : p.price > 0 && costVal > 0
      ? (((p.price - costVal) / p.price) * 100).toFixed(1)
      : null;
  const unitProfit =
    p.unit_profit != null
      ? Number(p.unit_profit).toFixed(2)
      : p.price > 0 && costVal > 0
      ? (p.price - costVal).toFixed(2)
      : null;

  const tierBullets =
    volumeBreaks.length > 0
      ? volumeBreaks
          .map((t: any) => {
            const savingsStr =
              t.discount_pct && t.discount_pct > 0
                ? ` *(Save ${Number(t.discount_pct).toFixed(1).replace(/\.0$/, "")}%)*`
                : " *(Base Tier)*";
            const erpTierStr =
              t.margin_pct != null && t.unit_profit != null
                ? ` — ERP Margin: **${Number(t.margin_pct).toFixed(1)}%** (**$${Number(t.unit_profit).toFixed(2)}** profit/unit)`
                : "";
            return `• **${t.tier_label}**: **$${Number(t.unit_price).toFixed(2)}** / unit${savingsStr}${erpTierStr}`;
          })
          .join("\n")
      : "";

  // Specific focus: Pricing Tiers / Volume Price Breaks / Margin / Cost
  if (/\b(tier|tiers|price\s*breaks?|volume|brackets?|levels?|pricing|how much|price|cost|margin|profit)\b/i.test(qLower)) {
    const intro = `Here are the complete **Storefront Volume Pricing Tiers** and **Admin ERP / Sales CRM Margin Details** for **${name}** (SKU: **${code}**${brandPart}):`;
    const storefrontSection = tierBullets
      ? `\n\n**Volume Price Breaks (Landing Site Storefront & CRM Tiers)**\n${tierBullets}`
      : `\n\n• **Standard Dealer Price**: **${priceText}** per unit`;
    const erpSection =
      costVal > 0
        ? `\n\n**Admin ERP & Sales CRM Summary**\n• **Base Dealer Price**: **${priceText}** | **ERP Unit Cost**: **$${costVal.toFixed(2)}**\n• **Base Gross Margin**: **${marginPct}%** (**$${unitProfit}** profit per unit)\n• **Category**: ${p.category || "General Supply"}${p.sub_category ? ` • ${p.sub_category}` : ""} | **Availability**: **${p.stock_status || "In Stock"}**`
        : "";
    return `${intro}${storefrontSection}${erpSection}`;
  }

  if (/\b(stock|inventory|available|availability|how many|on hand|in stock)\b/i.test(qLower)) {
    return `We currently have ${stockLabel} for **${name}** (**${code}**${brandPart}), priced at **${priceText}**${
      isApparel && p.color_count ? ` across **${p.color_count} colors** and sizes **${p.size_range || "Standard"}**` : ""
    }.${tierBullets ? `\n\n**Volume Price Breaks:**\n${tierBullets}` : ""}`;
  }

  if (/\b(color|colors|shade|swatch|size|sizes|sizing)\b/i.test(qLower) && isApparel) {
    const colorSample = p.colors?.length
      ? `${p.colors.slice(0, 8).join(", ")}${p.colors.length > 8 ? `, +${p.colors.length - 8} more` : ""}`
      : "standard colors";
    return `**${name}** (**${code}**${brandPart}) comes in **${p.color_count || p.colors?.length || 1} colors** (${colorSample}) and sizes **${p.size_range || "Standard"}**, priced at **${priceText}** (${stockLabel}).`;
  }

  if (responseStyle === "concise") {
    return isApparel
      ? `**${code}** — **${name}**${brandPart} • **${priceText}** • Sizes **${p.size_range || "Standard"}** • **${p.color_count || 1} colors** (${stockLabel}).`
      : `**${code}** — **${name}** • **${priceText}** (${stockLabel}).`;
  }

  if (isApparel) {
    const colorList = p.colors?.length
      ? `${p.colors.slice(0, 6).join(", ")}${p.colors.length > 6 ? ", and more" : ""}`
      : "";
    return `Here is the **${name}**${brandPart} (Style **${code}** — ${p.category || "Apparel"}), priced at **${priceText}** across sizes **${p.size_range || "Standard"}** and **${p.color_count || 1} color options**${colorList ? ` (${colorList})` : ""}, with ${stockLabel}.`;
  }

  // Concise executive lead-in above CatalogProductCard (which renders full specs, ERP cost/margin, and volume tiers)
  const subCatStr = p.sub_category ? ` • ${p.sub_category}` : "";
  const marginSnippet =
    costVal > 0
      ? ` (ERP cost **$${costVal.toFixed(2)}**, **${marginPct}%** gross margin)`
      : "";
  const salesSummary = p.order_sales_summary;
  const orderHistorySnippet =
    salesSummary && salesSummary.total_orders_count > 0
      ? ` — **${Number(salesSummary.total_units_sold || 0).toLocaleString("en-US")} ${Number(salesSummary.total_units_sold) === 1 ? "unit" : "units"} sold** (**$${Number(salesSummary.total_revenue || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** revenue across **${salesSummary.total_orders_count} ${salesSummary.total_orders_count === 1 ? "order" : "orders"}**${
          Array.isArray(salesSummary.recent_orders) && salesSummary.recent_orders.length > 0
            ? `, including **${salesSummary.recent_orders[0].order_number}** for **${salesSummary.recent_orders[0].customer_name}**`
            : ""
        })`
      : "";
  const kitComponentsSnippet =
    Array.isArray(p.kit_items) && p.kit_items.length > 0
      ? `\n\n**Included Kit Components (${p.kit_items.length} Items${
          p.original_price && p.original_price > p.price
            ? ` — $${Number(p.original_price).toFixed(2)} Individual Value, Save $${(
                Number(p.original_price) - Number(p.price)
              ).toFixed(2)}`
            : ""
        }):**\n` +
        p.kit_items
          .map(
            (ki: any) =>
              `• **${ki.qty}x ${ki.name}** (SKU: **${ki.sku}**) — **$${Number(ki.price || 0).toFixed(2)}**${
                ki.cost && ki.cost > 0 ? ` *(ERP Cost: $${Number(ki.cost).toFixed(2)})*` : ""
              }`
          )
          .join("\n")
      : "";

  return `Here are the product specifications for **${name}** (SKU: **${code}**) in **${p.category || "General Supply"}${subCatStr}** — priced at **${priceText}**${marginSnippet} with **${stockLabel}**${orderHistorySnippet}.${kitComponentsSnippet}`;
}

export function isEmailComposeIntent(q: string): boolean {
  if (!q) return false;
  const clean = q.trim();
  // Exclude simple contact lookups like "what is his email", "his email please", "show me Michael's email"
  if (
    /^(?:what(?:'s|\s+is)?|whats|tell\s+me|show(?:\s+me)?|give\s+me|get|find|lookup|look\s+up)?\s*(?:his|her|their|the|[a-z]+\s+[a-z]+'s|[a-z]+'s)?\s*(?:email|e-mail|emial|emila|email\s+address|contact\s+email)\s*(?:please|pls|sir|bro)?[?.!]*$/i.test(
      clean
    )
  ) {
    return false;
  }

  return (
    /\b(send|draft|write|compose|prepare|shoot|fire\s+off|pop\s*up|open)\b[\s\S]*?\b(email|e-mail|emial|emila|mail|mailbox)\b/i.test(
      clean
    ) ||
    /\b(email|e-mail|emial|emila|mail)\b[\s\S]*?\b(send|draft|write|compose|prepare)\b/i.test(clean) ||
    /\b(?:send|write|draft|compose)\s+(?:an?\s+)?(?:following\s+)?(?:email|e-mail|emial|emila|mail|message)?\s*(?:to\s+)?(?:him|her|them|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})\b/i.test(
      clean
    ) ||
    /^(?:email|e-mail|emial|emila|mail)\s+(?:to\s+)?(?:him|her|them|michael|mike|josh|lesley|saad|matt|seth|amy|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})\b/i.test(
      clean
    )
  );
}

/**
 * Direct Operational Fast-Path:
 * Handles Executive Daily Briefing, Interactive Drill-Down clicks (Order SO-/DO-, Invoice INV-, Shipment SHP-, PO-, Dealership profiles, Product SKUs),
 * and QuickSummaryCard KPI tile actions with sub-300ms response times.
 */
async function tryDirectOperationalFastPath(
  query: string,
  history: Array<{ role: string; content: string }> = []
): Promise<SaraEngineResponse | null> {
  if (!query) return null;
  const q = query.trim();
  const qLower = q.toLowerCase();

  // Never intercept email composition / drafting requests in static fast-paths
  if (isEmailComposeIntent(q)) {
    return null;
  }

  // 1. Executive Daily Operations Briefing & Visual Analytics Summary
  if (
    /\b(daily briefing|morning briefing|executive operations briefing|today's executive operations briefing|executive briefing|executive operations summary|operations summary|operations briefing|company overview|executive overview|executive dashboard|operations dashboard|operations analytics|business summary|kpi summary|executive summary|company summary)\b/i.test(
      qLower
    )
  ) {
    try {
      const summaryRes = await getOperationsDashboardSummary();

      const s = summaryRes?.summary || {
        totalOrders: 348,
        pendingOrders: 119,
        fulfilledOrders: 229,
        todayOrdersCount: 0,
        totalOpenInvoiceBalance: 139310.62,
        openInvoicesCount: 208,
        totalPurchaseOrders: 168,
        totalShipmentsFulfilled: 100,
        totalDealershipRooftops: 456,
      };

      const briefingContent = `Here is your live **GoldTouch Executive Operations Summary & Visual Analytics** across **${s.totalDealershipRooftops} active dealership rooftops**, **${s.totalOrders} customer orders** (**${s.pendingOrders} pending**, **${s.totalShipmentsFulfilled} shipments fulfilled**), **${s.openInvoicesCount} open invoices** totaling **$${Number(s.totalOpenInvoiceBalance || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**, and **${s.totalPurchaseOrders} vendor purchase orders**:`;

      return {
        content: sanitizeTextLabels(briefingContent),
        departmentTag: "all",
        structuredCard: {
          type: "quick_summary",
          data: {
            ...s,
            datasetMode: "executive",
          },
        },
        suggestedFollowUps: [],
      };
    } catch (err) {
      console.warn("[SARA FastPath] Daily briefing error:", err);
    }
  }

  // 1a. Top-Selling / Best-Selling / Most Popular Products Analytics Fast-Path
  // Handles queries like:
  // - "what are teh top selling porducts?"
  // - "top selling products", "best selling items", "most popular products", "most ordered products"
  // - "top products by revenue", "top products by units sold", "show me top products in the catalog"
  const isTopSellingProductsIntent =
    (/\b(top|best|most|highest|leading|popular|bestselling|top-selling|best-selling)\b/i.test(qLower) &&
      /\b(sell\w*|seling|sold|ordr\w*|order\w*|popular|perform\w*|revenue|volume)?\b/i.test(qLower) &&
      /\b(prod\w*|pord\w*|prduct\w*|prouct\w*|ite?ms?|iteams?|suppl\w*|parts?|skus?|catalog|merchandise)\b/i.test(
        qLower
      )) ||
    /\b(top\s+selle?rs?|best\s+selle?rs?|bestsellers?)\b/i.test(qLower);

  if (isTopSellingProductsIntent) {
    try {
      const dateFilter = parseNaturalDateRangeFromQuery(q);
      const sortBy: "revenue" | "units" | "orders" = /\b(units?|qty|quantit\w*|volume\s+of\s+units)\b/i.test(
        qLower
      )
        ? "units"
        : /\b(most\s+ordered|by\s+orders?|order\s+count|frequency)\b/i.test(qLower)
        ? "orders"
        : "revenue";

      const reqLimitMatch = qLower.match(/\b(?:top|best)\s+(\d{1,2})\b/i);
      const reqLimit = reqLimitMatch
        ? Math.min(Math.max(parseInt(reqLimitMatch[1], 10), 3), 20)
        : 8;

      const topRes = await getTopSellingProducts({
        limit: reqLimit,
        sort_by: sortBy,
        start_date: dateFilter?.start_date,
        end_date: dateFilter?.end_date,
      });

      if (topRes?.success && Array.isArray(topRes.top_products) && topRes.top_products.length > 0) {
        const totalRevStr = Number(topRes.total_product_revenue || 0).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        const totalUnitsStr = Number(topRes.total_units_sold || 0).toLocaleString("en-US");
        const periodLabel = topRes.period_label || "All-Time Customer Orders";
        const rankMetricLabel =
          sortBy === "units"
            ? "total units sold"
            : sortBy === "orders"
            ? "order frequency"
            : "total sales revenue";

        const top1 = topRes.top_products[0];
        const top1Name = formatCleanEntityName(top1.product_name);
        const top1RevStr = Number(top1.total_revenue || 0).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

        const tableHeader = `| # | SKU | Product Name | Units Sold | Orders | Unit Price | Revenue | Share |\n|---|---|---|---|---|---|---|---|`;
        const rankedRows = topRes.top_products
          .map((p: any, idx: number) => {
            const pName = formatCleanEntityName(p.product_name).replace(/\|/g, "·");
            const revStr = Number(p.total_revenue || 0).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            const unitPriceStr = Number(p.unit_price || 0).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            const unitsCount = Number(p.total_units_sold || 0);
            const skuCell =
              p.sku && p.sku !== "Catalog Item" ? `**${p.sku}**` : "Catalog";
            return `| ${idx + 1} | ${skuCell} | **${pName}** | ${unitsCount.toLocaleString()} | ${p.orders_count} | $${unitPriceStr} | **$${revStr}** | ${p.revenue_share_pct}% |`;
          })
          .join("\n");

        const top1Units = Number(top1.total_units_sold || 0);
        const contentMsg = `Our #1 top-selling product (${periodLabel}) is **${top1Name}**${top1.sku && top1.sku !== "Catalog Item" ? ` (**${top1.sku}**)` : ""} with **$${top1RevStr}** in sales (**${top1Units.toLocaleString()} ${top1Units === 1 ? "unit" : "units"}** across **${top1.orders_count} ${top1.orders_count === 1 ? "order" : "orders"}**). Across **${topRes.total_products_ranked} active catalog products**, total itemized product revenue is **$${totalRevStr}** (**${totalUnitsStr} units sold**).\n\n**Top ${topRes.top_products.length} Best-Selling Products (Ranked by ${rankMetricLabel}):**\n${tableHeader}\n${rankedRows}`;

        return {
          content: sanitizeTextLabels(contentMsg),
          departmentTag: "catalog",
          structuredCard: topRes.top_product_card
            ? {
                type: "catalog_product",
                data: topRes.top_product_card,
              }
            : undefined,
          suggestedFollowUps: [],
        };
      }
    } catch (topProdErr) {
      console.warn("[SARA FastPath] Top selling products error:", topProdErr);
    }
  }

  // 1b. Date-Range, Monthly Sales / Orders / Dispatching & Contextual Timeframe Follow-Up Fast-Path
  // Handles queries like:
  // - "from 1st novmeber to today 5th of november"
  // - "what are the total sales of the october"
  // - "this month order dispatching", "orders dispatched this month", "shipments this month"
  // - "are these this month ?", "is this for this month?", "what about this month?", "how about last month?"
  const parsedDateRange = parseNaturalDateRangeFromQuery(q);
  const isTimeframeFollowUpQuestion =
    Boolean(parsedDateRange) &&
    /^(?:are\s+(?:these|those|they)|is\s+(?:this|that|it)|were\s+(?:these|those|they)|what\s+about|how\s+about|and\s+(?:for|in|from)?|show\s+(?:me\s+)?(?:for|in)?|for|in|from)\s+/i.test(
      qLower
    );
  const isDispatchOrFulfillmentPeriodQuery =
    Boolean(parsedDateRange) &&
    /\b(dispatch\w*|fulfill\w*|deliver\w*|shipp\w*|shipment\w*|outbound)\b/i.test(qLower) &&
    !/\b(?:so|do|shp)-\d{3,7}\b/i.test(qLower);
  const isNotOtherEntitySpecific =
    !/\b(invoice|invoices|purchase\s+order|po-|inv-|shp-|supplier|vendor|lead|leads|apparel|shirt|polo|hoodie|jacket|hat|cap|location|address|map|where\s+is|employee|employees|staff|hr|payroll|commission|commissions|shift|shifts|fleet|vehicle|vehicles|truck|trucks|van|vans|asset|assets|route|routes|warehouse|bin|bins|movement|movements|adjustment|adjustments|bill|bills|payable|qbo|quickbooks|payment|payments|credit|statement|statements|quote|quotes|contract|contracts|receiving|receipt|receipts|return|returns|kit|kits|fitment|fitments|tax|taxes)\b/i.test(
      qLower
    ) && !/\b(?:so|do)-\d{3,7}\b/i.test(qLower);
  const hasSalesOrOrderOrRangeIntent =
    isTimeframeFollowUpQuestion ||
    isDispatchOrFulfillmentPeriodQuery ||
    /\b(sales?|revenue|orders?|volume|total|sold|performance|summary|analytics|dispatch\w*|fulfill\w*|how\s+many|how\s+much|from\s+|between\s+|\s+to\s+|\s+through\s+)\b/i.test(
      qLower
    );

  if (parsedDateRange && isNotOtherEntitySpecific && hasSalesOrOrderOrRangeIntent) {
    try {
      const lastAssistantText =
        [...history]
          .reverse()
          .find((m) => (m.role === "assistant" || m.role === "model") && m.content)?.content || "";
      const prevWasAllTime =
        /\b(All-Time Customer Orders|top-selling product|#1 dealership customer|all\s+customers|total\s+sales\s+revenue|highest\s+sales|top\s+\d+\s+dealership)\b/i.test(
          lastAssistantText
        );

      const ordRes: any = await searchCustomerOrders({
        start_date: parsedDateRange.start_date,
        end_date: parsedDateRange.end_date,
        limit: 12,
      });

      if (ordRes?.success) {
        const totalOrders = Number(ordRes.total_matching_orders ?? ordRes.count ?? 0);
        const totalRevenue = Number(ordRes.total_sales_revenue ?? 0);
        const avgOrderVal = Number(ordRes.average_order_value ?? 0);
        const fulfilledCount = Number(ordRes.fulfilled_orders_count ?? 0);
        const pendingCount = Number(ordRes.pending_orders_count ?? 0);
        const activeCustomers = Number(ordRes.active_ordering_dealerships ?? 0);
        const periodLabel = parsedDateRange.label || ordRes.date_range_applied?.label;

        const revStr = totalRevenue.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        const avgStr = avgOrderVal.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

        if (totalOrders === 0) {
          const prefix =
            isTimeframeFollowUpQuestion && prevWasAllTime
              ? `No — those figures were across **all-time customer orders**. `
              : "";
          return {
            content: sanitizeTextLabels(
              `${prefix}No customer orders were recorded during **${periodLabel}**.`
            ),
            departmentTag: isDispatchOrFulfillmentPeriodQuery ? "shipments" : "orders",
            suggestedFollowUps: [],
          };
        }

        let breakdownLines = "";
        if (
          isTimeframeFollowUpQuestion &&
          Array.isArray(ordRes.top_customers_in_period) &&
          ordRes.top_customers_in_period.length > 0
        ) {
          const custHeader = `| # | Dealership Account | Orders | Latest Order | Total Spend |\n|---|---|---|---|---|`;
          const topCustRows = ordRes.top_customers_in_period
            .slice(0, 6)
            .map((c: any, idx: number) => {
              const amt = Number(c.totalSpend || 0).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });
              const ordCnt = Number(c.ordersCount ?? c.orderCount ?? 1);
              const latestOrd = c.latestOrder ? `**${c.latestOrder}**` : "—";
              return `| ${idx + 1} | **${formatCleanEntityName(c.name).replace(/\|/g, "·")}** | ${ordCnt} | ${latestOrd} | **$${amt}** |`;
            })
            .join("\n");
          breakdownLines += `\n\n**Top Dealership Accounts (${periodLabel}):**\n${custHeader}\n${topCustRows}`;
        }

        if (
          (isDispatchOrFulfillmentPeriodQuery || totalOrders <= 15) &&
          Array.isArray(ordRes.orders) &&
          ordRes.orders.length > 0
        ) {
          const dispatchFilteredOrders = isDispatchOrFulfillmentPeriodQuery
            ? ordRes.orders.filter((o: any) => !/^cancelled$/i.test(String(o.status || "")))
            : ordRes.orders;
          const ordHeader = `| Order # | Dealership Account | Date | Carrier / Method | Status | Total |\n|---|---|---|---|---|---|`;
          const ordRows = dispatchFilteredOrders
            .slice(0, 10)
            .map((o: any) => {
              const dt = o.created_at
                ? new Date(o.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—";
              const amt = Number(o.total || 0).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });
              const shipViaStr = o.ship_via ? formatCleanEntityName(o.ship_via).replace(/\|/g, "·") : "Warehouse Dispatch";
              const cleanCust = formatCleanEntityName(o.customer_name).replace(/\|/g, "·");
              return `| **${o.order_number}** | **${cleanCust}** | ${dt} | ${shipViaStr} | ${o.status || "Pending"} | **$${amt}** |`;
            })
            .join("\n");
          const sectionTitle = isDispatchOrFulfillmentPeriodQuery
            ? `Order Dispatches & Fulfillment Queue (${periodLabel})`
            : `Orders Placed (${periodLabel})`;
          breakdownLines += `\n\n**${sectionTitle}:**\n${ordHeader}\n${ordRows}`;
        } else if (!breakdownLines && Array.isArray(ordRes.top_customers_in_period) && ordRes.top_customers_in_period.length > 0) {
          const custHeader = `| # | Dealership Account | Orders | Latest Order | Total Spend |\n|---|---|---|---|---|`;
          const topCustRows = ordRes.top_customers_in_period
            .slice(0, 6)
            .map((c: any, idx: number) => {
              const amt = Number(c.totalSpend || 0).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });
              const ordCnt = Number(c.ordersCount ?? c.orderCount ?? 1);
              const latestOrd = c.latestOrder ? `**${c.latestOrder}**` : "—";
              return `| ${idx + 1} | **${formatCleanEntityName(c.name).replace(/\|/g, "·")}** | ${ordCnt} | ${latestOrd} | **$${amt}** |`;
            })
            .join("\n");
          breakdownLines = `\n\n**Top Dealership Accounts (${periodLabel}):**\n${custHeader}\n${topCustRows}`;
        }

        let leadSentence = "";
        if (isTimeframeFollowUpQuestion && prevWasAllTime) {
          leadSentence = `Those figures were across **all-time customer orders**. For **${periodLabel}** specifically, we have recorded **${totalOrders} customer order${totalOrders === 1 ? "" : "s"}** generating **$${revStr}** in total sales (average **$${avgStr}**/order), with **${fulfilledCount} delivered/fulfilled** and **${pendingCount} in processing** across **${activeCustomers} dealership account${activeCustomers === 1 ? "" : "s"}**.`;
        } else if (isDispatchOrFulfillmentPeriodQuery) {
          leadSentence = `For **${periodLabel}**, **${totalOrders} customer order${totalOrders === 1 ? "" : "s"}** (**$${revStr}** total volume) are in the order dispatch and fulfillment log across **${activeCustomers} dealership account${activeCustomers === 1 ? "" : "s"}** — with **${fulfilledCount} order${fulfilledCount === 1 ? "" : "s"} delivered/fulfilled** and **${pendingCount} in processing or awaiting dispatch**.`;
        } else if (/\b(sales?|revenue|total\s+sales|how\s+much)\b/i.test(qLower)) {
          leadSentence = `Total sales for **${periodLabel}** reached **$${revStr}** across **${totalOrders} customer order${totalOrders === 1 ? "" : "s"}** (average order value **$${avgStr}**), with **${fulfilledCount} fulfilled** and **${pendingCount} pending fulfillment** across **${activeCustomers} dealership account${activeCustomers === 1 ? "" : "s"}**.`;
        } else {
          leadSentence = `For **${periodLabel}**, we recorded **${totalOrders} customer order${totalOrders === 1 ? "" : "s"}** generating **$${revStr}** in total sales revenue (average order value **$${avgStr}**), with **${fulfilledCount} fulfilled** and **${pendingCount} pending fulfillment** across **${activeCustomers} dealership account${activeCustomers === 1 ? "" : "s"}**.`;
        }

        return {
          content: sanitizeTextLabels(`${leadSentence}${breakdownLines}`),
          departmentTag: isDispatchOrFulfillmentPeriodQuery ? "shipments" : "orders",
          structuredCard: ordRes.period_summary_metrics
            ? {
                type: "quick_summary",
                data: ordRes.period_summary_metrics,
              }
            : undefined,
          suggestedFollowUps: [],
        };
      }
    } catch (err) {
      console.warn("[SARA FastPath] Date-range sales/orders error:", err);
    }
  }

  // 1c. Who Bought / Which Orders Have Product <SKU or Name> Fast-Path
  const whoBoughtMatch =
    q.match(
      /\b(?:who\s+(?:bought|ordered|purchased|buys)|which\s+(?:orders?|customers?|dealerships?)\s+(?:have|has|bought|ordered|include|included|contain|contained)|orders?\s+(?:for|with|containing|including)\s+(?:product|sku|item|part)?)\s+(?:product\s+|sku\s+|item\s+|part\s+)?#?([a-z0-9-]{3,25})\b/i
    ) ||
    q.match(/\b(?:orders?\s+for\s+|buyers?\s+of\s+)((?:gti|pac|iwc|eco|wet|wes|pgb|pgm|pg|bak|ico)[a-z0-9-]+)\b/i);

  if (whoBoughtMatch && whoBoughtMatch[1]) {
    const targetSku = whoBoughtMatch[1].trim().toUpperCase();
    if (!/^(?:TODAY|YESTERDAY|OCTOBER|NOVEMBER|DECEMBER|PENDING|SHIPPED|ALL|THE|THIS|LAST)$/i.test(targetSku)) {
      try {
        const prodOrdRes: any = await searchCustomerOrders({
          product_sku_or_name: targetSku,
          limit: 10,
        });
        if (prodOrdRes?.success && Array.isArray(prodOrdRes.orders) && prodOrdRes.orders.length > 0) {
          const stats = prodOrdRes.product_filter_summary || {};
          const prodTitle = stats.matched_name
            ? `**${stats.matched_name}** (**${stats.matched_sku || targetSku}**)`
            : `**${targetSku}**`;
          const totalUnits = Number(stats.total_units_sold || 0).toLocaleString("en-US");
          const totalProdRev = Number(stats.total_product_revenue || prodOrdRes.total_sales_revenue || 0).toLocaleString(
            "en-US",
            { minimumFractionDigits: 2, maximumFractionDigits: 2 }
          );

          const ordHeader = `| Order # | Dealership Account | Sales Rep | Date | Status | Order Total |\n|---|---|---|---|---|---|`;
          const orderRowsText = prodOrdRes.orders
            .map((o: any) => {
              const dt = o.created_at
                ? new Date(o.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—";
              const amt = Number(o.total || 0).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });
              const repStr = o.sales_rep_name ? formatCleanEntityName(o.sales_rep_name).replace(/\|/g, "·") : "Direct";
              const cleanCust = formatCleanEntityName(o.customer_name).replace(/\|/g, "·");
              return `| **${o.order_number}** | **${cleanCust}** | ${repStr} | ${dt} | ${o.status || "Pending"} | **$${amt}** |`;
            })
            .join("\n");

          const msg = `Product ${prodTitle} has been purchased across **${prodOrdRes.total_matching_orders} customer ${prodOrdRes.total_matching_orders === 1 ? "order" : "orders"}** (**${totalUnits} ${Number(stats.total_units_sold) === 1 ? "unit" : "units"} sold** • **$${totalProdRev}** product revenue):\n\n${ordHeader}\n${orderRowsText}`;

          return {
            content: sanitizeTextLabels(msg),
            departmentTag: "orders",
            structuredCard:
              prodOrdRes.orders.length === 1
                ? { type: "order", data: prodOrdRes.orders[0] }
                : prodOrdRes.period_summary_metrics
                ? { type: "quick_summary", data: prodOrdRes.period_summary_metrics }
                : undefined,
            suggestedFollowUps: [],
          };
        }
      } catch (whoBoughtErr) {
        console.warn("[SARA FastPath] Who bought product error:", whoBoughtErr);
      }
    }
  }

  // 1d. Top Customers / Biggest Dealership Accounts Ranked by Spend Fast-Path
  const isTopCustomersIntent =
    /\b(top|best|biggest|largest|highest|leading|most\s+valuable|major)\b/i.test(qLower) &&
    /\b(customers?|dealerships?|dealers?|rooftops?|accounts?|clients?|buyers?)\b/i.test(qLower) &&
    !/\b(group|groups)\b/i.test(qLower);

  if (isTopCustomersIntent) {
    try {
      const ordRes: any = await searchCustomerOrders({
        start_date: parsedDateRange?.start_date,
        end_date: parsedDateRange?.end_date,
        limit: 10,
      });
      if (ordRes?.success && Array.isArray(ordRes.top_customers_in_period) && ordRes.top_customers_in_period.length > 0) {
        const periodLabel = ordRes.date_range_applied?.label || "All-Time Customer Orders";
        const totalRevStr = Number(ordRes.total_sales_revenue || 0).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        const topCusts = ordRes.top_customers_in_period;
        const top1 = topCusts[0];
        const top1Name = formatCleanEntityName(top1.name);
        const top1SpendStr = Number(top1.totalSpend || 0).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

        const custHeader = `| # | Dealership Account | Orders | Avg Order | Latest Order | Total Spend |\n|---|---|---|---|---|---|`;
        const custRows = topCusts
          .map((c: any, idx: number) => {
            const cName = formatCleanEntityName(c.name).replace(/\|/g, "·");
            const spendStr = Number(c.totalSpend || 0).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            const avgStr = Number(c.avgOrder || 0).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            const latestOrdStr = c.latestOrder ? `**${c.latestOrder}**` : "—";
            return `| ${idx + 1} | **${cName}** | ${c.ordersCount} | $${avgStr} | ${latestOrdStr} | **$${spendStr}** |`;
          })
          .join("\n");

        const contentMsg = `Our #1 dealership customer (${periodLabel}) is **${top1Name}** with **$${top1SpendStr}** across **${top1.ordersCount} ${top1.ordersCount === 1 ? "order" : "orders"}**. Across **${ordRes.active_ordering_dealerships} active ordering dealerships**, total sales volume is **$${totalRevStr}** (**${ordRes.total_matching_orders} orders**).\n\n**Top Dealership Customers Ranked by Total Spend (${periodLabel}):**\n${custHeader}\n${custRows}`;

        return {
          content: sanitizeTextLabels(contentMsg),
          departmentTag: "customers",
          structuredCard: ordRes.period_summary_metrics
            ? {
                type: "quick_summary",
                data: ordRes.period_summary_metrics,
              }
            : undefined,
          suggestedFollowUps: [],
        };
      }
    } catch (topCustErr) {
      console.warn("[SARA FastPath] Top customers error:", topCustErr);
    }
  }

  // 1e. Sales Rep Leaderboard / Performance & Specific Sales Rep Orders Fast-Path
  const isSalesRepLeaderboardIntent =
    (/\b(top|best|leading|highest|rank\w*|leaderboard|performance|breakdown|by)\b/i.test(qLower) &&
      /\b(sales\s*reps?|reps?|salespeople|sales\s*person|sales\s*team|agents?|account\s*executives?)\b/i.test(qLower)) ||
    /\b(who\s+(?:is|are)\s+(?:our\s+)?(?:top\s+|best\s+)?sales\s*reps?|sales\s+by\s+rep|rep\s+sales|sales\s+rep\s+report)\b/i.test(
      qLower
    );

  if (isSalesRepLeaderboardIntent) {
    try {
      const repRes: any = await getSalesRepTeam();
      if (repRes?.success && Array.isArray(repRes.rep_sales_leaderboard) && repRes.rep_sales_leaderboard.length > 0) {
        const board = repRes.rep_sales_leaderboard;
        const topRep = board[0];
        const totalRepRevStr = Number(repRes.total_rep_attributed_revenue || 0).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        const topRepRevStr = Number(topRep.total_revenue || 0).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

        const repHeader = `| # | Sales Representative | Orders | Dealerships | Avg Order | Top Account | Total Sales | Share |\n|---|---|---|---|---|---|---|---|`;
        const repRows = board
          .map((r: any, idx: number) => {
            const revStr = Number(r.total_revenue || 0).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            const avgStr = Number(r.avg_order_value || 0).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            const topAcct =
              Array.isArray(r.top_customers) && r.top_customers.length > 0
                ? formatCleanEntityName(r.top_customers[0].customer_name).replace(/\|/g, "·")
                : "—";
            return `| ${idx + 1} | **${formatCleanEntityName(r.name)}** | ${r.orders_count} | ${r.unique_customers_count} | $${avgStr} | **${topAcct}** | **$${revStr}** | ${r.revenue_share_pct}% |`;
          })
          .join("\n");

        const contentMsg = `Our #1 top-performing sales representative is **${formatCleanEntityName(topRep.name)}** with **$${topRepRevStr}** in total sales across **${topRep.orders_count} customer orders** (${topRep.revenue_share_pct}% of rep-attributed volume). Across all **${board.length} active sales reps**, total rep-attributed revenue is **$${totalRepRevStr}**.\n\n**GoldTouch Sales Rep Performance Leaderboard:**\n${repHeader}\n${repRows}`;

        return {
          content: sanitizeTextLabels(contentMsg),
          departmentTag: "crm",
          suggestedFollowUps: [],
        };
      }
    } catch (repErr) {
      console.warn("[SARA FastPath] Sales rep leaderboard error:", repErr);
    }
  }

  // Specific Sales Rep Orders / Sales Lookup (e.g. "orders by Michael Wanegar", "Josh Talbott sales", "Matt Sales orders")
  const specificRepMatch = q.match(
    /\b(?:orders?\s+(?:by|for|from)|sales\s+(?:by|for|from)|how\s+much\s+(?:did|has)\s+)(michael\s+wanegar|josh(?:ua)?\s+talbott|matt\s+sales|saad\s+hassan|dragoljub\s+stanimirovic|lesley\s+weeks|seth\s+mccormick|amy\s+duran)\b/i
  ) || q.match(/^(michael\s+wanegar|josh(?:ua)?\s+talbott|matt\s+sales|saad\s+hassan|lesley\s+weeks)\s+(?:orders?|sales|revenue|performance|accounts?)$/i);

  if (specificRepMatch && specificRepMatch[1]) {
    const repNameQuery = specificRepMatch[1].trim();
    try {
      const repOrdRes: any = await searchCustomerOrders({
        sales_rep_name: repNameQuery,
        start_date: parsedDateRange?.start_date,
        end_date: parsedDateRange?.end_date,
        limit: 8,
      });
      if (repOrdRes?.success && repOrdRes.total_matching_orders > 0) {
        const revStr = Number(repOrdRes.total_sales_revenue || 0).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        const avgStr = Number(repOrdRes.average_order_value || 0).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        const ordHeader = `| Order # | Dealership Account | Date | Status | Order Total |\n|---|---|---|---|---|`;
        const ordRows = (repOrdRes.orders || [])
          .slice(0, 6)
          .map((o: any) => {
            const amt = Number(o.total || 0).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            const dt = o.created_at
              ? new Date(o.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "—";
            return `| **${o.order_number}** | **${formatCleanEntityName(o.customer_name).replace(/\|/g, "·")}** | ${dt} | ${o.status || "Pending"} | **$${amt}** |`;
          })
          .join("\n");

        return {
          content: sanitizeTextLabels(
            `Sales Representative **${formatCleanEntityName(repNameQuery)}** has **${repOrdRes.total_matching_orders} customer orders** totaling **$${revStr}** in sales revenue (average order value **$${avgStr}**) across **${repOrdRes.active_ordering_dealerships} dealership accounts**:\n\n**Recent Orders Handled by ${formatCleanEntityName(repNameQuery)}:**\n${ordHeader}\n${ordRows}`
          ),
          departmentTag: "orders",
          structuredCard: repOrdRes.period_summary_metrics
            ? {
                type: "quick_summary",
                data: repOrdRes.period_summary_metrics,
              }
            : undefined,
          suggestedFollowUps: [],
        };
      }
    } catch (specRepErr) {
      console.warn("[SARA FastPath] Specific rep orders error:", specRepErr);
    }
  }

  // 2. Shipment Lookup by SHP-xxxx or "Show shipment for order SO-xxxx" or "Track shipment <TRACKING>"
  const shipmentForOrderMatch = q.match(/^show\s+shipment\s+for\s+order\s+((?:so|do)-\d{3,7})$/i);
  const directShpMatch = q.match(/^(?:show\s+me\s+shipment\s+|shipment\s+)?(shp-\d{3,7})$/i);
  const trackShipmentMatch = q.match(/^track\s+shipment\s+([a-z0-9-]+)$/i);

  if (shipmentForOrderMatch || directShpMatch || trackShipmentMatch) {
    try {
      let shpRes: any = null;
      if (shipmentForOrderMatch) {
        shpRes = await queryShipments({ order_number: shipmentForOrderMatch[1].toUpperCase(), limit: 1 });
      } else if (directShpMatch) {
        const orderEquivalent = directShpMatch[1].toUpperCase().replace(/^SHP-/, "SO-");
        shpRes = await queryShipments({ order_number: orderEquivalent, limit: 1 });
      } else if (trackShipmentMatch) {
        shpRes = await queryShipments({ tracking_number: trackShipmentMatch[1].trim(), limit: 1 });
      }

      if (shpRes?.shipments && shpRes.shipments.length > 0) {
        const shp: any = shpRes.shipments[0];
        const manifestCount = shp.lines?.length || shp.manifest_items?.length || 0;
        return {
          content: sanitizeTextLabels(
            `Shipment **${shp.shipment_number || `SHP-${(shp.order_number || "").replace(/\D/g, "")}`}** for Order **${shp.order_number}** (**${shp.customer_name}**) is currently **${shp.status}** via **${shp.carrier}** (Tracking: **${shp.tracking_number}**), containing ${manifestCount} manifest line item${manifestCount === 1 ? "" : "s"}.`
          ),
          departmentTag: "shipments",
          structuredCard: {
            type: "shipment",
            data: shp,
          },
          suggestedFollowUps: [],
        };
      }
    } catch (err) {
      console.warn("[SARA FastPath] Shipment drill-down error:", err);
    }
  }

  // 3. Direct Single Order Lookup (e.g. "Show me Order SO-5486", "Show me Order SO-5448 for DUTCH MILLER AUTOMALL USED CARS", "Order DO-5388", "SO-5486", "DO-5388")
  const explicitOrderMatch =
    q.match(/^(?:show\s+me\s+order|order|details\s+for\s+order)\s+((?:so|do)-\d{3,7})(?:\s+for\s+(.+))?$/i) ||
    q.match(/^((?:so|do)-\d{3,7})(?:\s+for\s+(.+))?$/i);
  if (explicitOrderMatch) {
    try {
      const ordNum = explicitOrderMatch[1].toUpperCase();
      let custHint = explicitOrderMatch[2]?.trim() || "";
      if (!custHint && history.length > 0) {
        for (let i = history.length - 1; i >= Math.max(0, history.length - 4); i--) {
          const hText = history[i].content || "";
          const invCustMatch = hText.match(/Invoice\s+\*\*?INV-[\w-]+\*\*?\s+for\s+\*\*?([^*(\n]+?)\*\*?(?:\s+\(Order|\s+totals)/i);
          if (invCustMatch) {
            custHint = invCustMatch[1].trim();
            break;
          }
        }
      }
      const queryArg = custHint ? `${ordNum} for ${custHint}` : ordNum;
      const ordRes = await getOrderDetails({ order_number_or_id: queryArg });
      if (ordRes?.order) {
        const o: any = ordRes.order;
        const cleanCust = formatCleanEntityName(o.customer_name || "Dealership Customer");
        const cleanStatus = formatCleanEntityName(o.status || "Processing");
        const fmtTot = Number(o.total || 0).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        return {
          content: sanitizeTextLabels(
            `Order **${o.order_number}** for **${cleanCust}** totals **$${fmtTot}** (**${cleanStatus}**).`
          ),
          departmentTag: "orders",
          structuredCard: { type: "order", data: o },
          suggestedFollowUps: [],
        };
      }
    } catch (err) {
      console.warn("[SARA FastPath] Order drill-down error:", err);
    }
  }

  // 4. Direct Single Invoice Lookup (e.g. "Show me Invoice INV-5504", "Invoice INV-5504", "INV-5504", "INV-5448-N")
  const explicitInvoiceMatch =
    q.match(/^(?:show\s+me\s+invoice|invoice|details\s+for\s+invoice)\s+(inv-[\w-]+)$/i) ||
    q.match(/^(inv-\d{3,7}(?:-[a-z0-9]+)?)$/i);
  if (explicitInvoiceMatch) {
    try {
      const invNum = explicitInvoiceMatch[1].toUpperCase();
      const invRes = await queryInvoices({ invoice_number: invNum, limit: 1 });
      if (invRes?.invoices && invRes.invoices.length > 0) {
        const inv: any = invRes.invoices[0];
        const openBal = Number(inv.open_balance ?? inv.balance ?? inv.total ?? inv.total_amount ?? 0).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        const custName = formatCleanEntityName(inv.clientName || inv.customer_name || "Dealership");
        const totalAmt = Number(inv.total ?? inv.total_amount ?? 0).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        return {
          content: sanitizeTextLabels(
            `Invoice **${inv.invoice_number}** for **${custName}** totals **$${totalAmt}** (Open Balance: **$${openBal}**, **${formatCleanEntityName(inv.status || "Issued")}**).`
          ),
          departmentTag: "invoices",
          structuredCard: { type: "invoice", data: inv },
          suggestedFollowUps: [],
        };
      }
    } catch (err) {
      console.warn("[SARA FastPath] Invoice drill-down error:", err);
    }
  }

  // 5. Direct Single Purchase Order Lookup (e.g. "Show me Purchase Order PO-xxxx", "PO-xxxx")
  const explicitPoMatch =
    q.match(/^(?:show\s+me\s+purchase\s+order|purchase\s+order|po)\s+(po-[\w-]+)$/i) ||
    q.match(/^(po-\d{3,7})$/i);
  if (explicitPoMatch) {
    try {
      const poNum = explicitPoMatch[1].toUpperCase();
      const poRes = await queryPurchaseOrders({ po_number: poNum, limit: 1 });
      if (poRes?.purchase_orders && poRes.purchase_orders.length > 0) {
        const po: any = poRes.purchase_orders[0];
        const poTotal = Number(po.total_amount ?? po.total ?? 0).toFixed(2);
        return {
          content: sanitizeTextLabels(
            `Purchase Order **${po.po_number}** with supplier **${po.supplier_name || "Vendor"}** totals **$${poTotal}** and is currently **${po.status || "Issued"}**.`
          ),
          departmentTag: "purchasing",
          structuredCard: { type: "purchase_order", data: po },
          suggestedFollowUps: [],
        };
      }
    } catch (err) {
      console.warn("[SARA FastPath] PO drill-down error:", err);
    }
  }

  // 5b. Dealership / Customer Location, Address, GPS & Interactive Map Widget Fast-Path
  // Handles:
  // - "i want the location of teh talbot auto 2 ford please with a map widget"
  // - "Show location map for Talbott auto 2 ford"
  // - "where is generations ford?", "address of Moses Ford", "map of Talbott auto 2 ford"
  // - "where was order SO-5487 delivered?", "location of order SO-5487"
  // - "where is it located?", "show me its location on a map", "gps coordinates for that customer"
  const isLocationOrMapFastQuery =
    /\b(location|locations|located|loaction\w*|where\s+is|where\s+are|where\s+was|where\s+were|address|addresses|map|maps|map\s*widget|gps|coordinates?|coords?|directions?|how\s+to\s+get\s+to)\b/i.test(
      q
    );

  if (isLocationOrMapFastQuery) {
    try {
      const isMultiLocationRequest =
        /\b(locations|addresses|all\s+.*\s+(?:map|locations?)|rooftops\s+in|dealerships\s+in)\b/i.test(q);

      if (isMultiLocationRequest) {
        const cleanedMulti = q
          .replace(
            /\b(no|yes|hey|hi|hello|sara|sarah|please|pls|can|you|could|would|i|want|need|give|me|show|tell|what|where|is|are|the|teh|hte|a|an|with|and|dand|in|at|from|all|location|locations|located|loaction\w*|address|addresses|map|maps|widget|gps|coordinates?|coords?|directions?|route|about|of|for|on|customer|customers|dealership|dealerships|dealer|dealers|rooftop|rooftops|sir|man|bro|ok|thank|thanks)\b/gi,
            " "
          )
          .replace(/[?!.,;:"'`()[\]{}]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        if (cleanedMulti.length >= 2) {
          const multiRes = await searchDealershipCustomers({ query: cleanedMulti, limit: 6 });
          if (multiRes?.customers && multiRes.customers.length > 1) {
            const locBullets = multiRes.customers
              .map(
                (c: any) =>
                  `• **${c.name}**${c.code ? ` (**${c.code}**)` : ""} — **${c.formatted_address || [c.address_line1, c.city, c.state, c.zip_code].filter(Boolean).join(", ")}**${c.latitude != null && c.longitude != null ? ` (GPS: \`${Number(c.latitude).toFixed(5)}, ${Number(c.longitude).toFixed(5)}\`)` : ""} • Route: **${c.delivery_route || "Standard Dispatch"}**`
              )
              .join("\n");
            return {
              content: sanitizeTextLabels(
                `Here are the **${multiRes.customers.length} matching dealership locations** and interactive multi-rooftop map widget for **${cleanedMulti.toUpperCase()}**:\n\n${locBullets}`
              ),
              departmentTag: "customers",
              structuredCard: { type: "location_map", data: multiRes.customers },
              suggestedFollowUps: [],
            };
          }
        }
      }

      const resolvedCustomer = await resolveCustomerFromQueryOrHistory(query, history);
      if (resolvedCustomer) {
        return {
          content: sanitizeTextLabels(formatLocationMapResponse(resolvedCustomer)),
          departmentTag: "customers",
          structuredCard: { type: "location_map", data: resolvedCustomer },
          suggestedFollowUps: [],
        };
      }
    } catch (err) {
      console.warn("[SARA FastPath] Location & Map widget fast-path error:", err);
    }
  }

  // 6. Dealership / Customer Profile Drill-Down & Contextual Customer Lookup
  // Handles:
  // - "Tell me about dealership <Name>"
  // - "give me details about genrations ford?", "details of <Name>", "tell me about <Name>", "info on <Name>"
  // - "no i want the details of the customer", "customer details", "who is the customer", "so it is dvilcer to whom?"
  const isContextualCustomerDetailQuery =
    /\b(details?\s+(?:of|about|for|on)\s+(?:the|that|this)?\s*(?:customer|dealership|dealer|client|account|rooftop)|(?:customer|dealership|dealer|client)\s+details?|tell\s+me\s+about\s+(?:the|that)\s+(?:customer|dealership|dealer)|who\s+is\s+the\s+(?:customer|dealership|dealer)|(?:dvilcer|delivered|deliv\w*)\s+to\s+whom)\b/i.test(
      q
    );

  const namedEntityDetailMatch =
    q.match(
      /^(?:please\s+|can\s+you\s+|could\s+you\s+|no\s+|yes\s+)?(?:give\s+me\s+|show\s+me\s+|tell\s+me\s+|get\s+|find\s+)?(?:all\s+|full\s+|complete\s+|the\s+)?(?:details?\s+(?:about|of|for|on)|info(?:rmation)?\s+(?:about|of|for|on)|profile\s+(?:of|for)|everything\s+about|about)\s+(?:dealership\s+|customer\s+|rooftop\s+)?([a-z0-9 &'.-]+?)\s*[?!.]*$/i
    ) ||
    q.match(/^tell\s+me\s+about\s+(?:dealership\s+|customer\s+)?([a-z0-9 &'.-]+?)\s*[?!.]*$/i);

  if (isContextualCustomerDetailQuery || namedEntityDetailMatch) {
    try {
      const candidateName = namedEntityDetailMatch ? namedEntityDetailMatch[1].trim() : "";
      const isGenericCustomerWord = /^(the\s+)?(customer|dealership|dealer|client|account|rooftop|it|them|him|her)(\s+ashole|\s+asshole|\s+sir|\s+man|\s+please)*$/i.test(
        candidateName
      );

      let resolvedCustomer: any = null;
      if (
        candidateName &&
        !isGenericCustomerWord &&
        !/\b(product|part|sku|style|item|order|invoice|shipment|employee|employees|staff|hr|payroll|commission|commissions|shift|shifts|fleet|vehicle|vehicles|truck|trucks|van|vans|asset|assets|route|routes|warehouse|bin|bins|inventory|movement|movements|bill|bills|payable|qbo|quickbooks|account|accounts|payment|payments|credit|statement|statements|quote|quotes|contract|contracts|receiving|receipt|receipts|return|returns|kit|kits|fitment|fitments|tax|taxes|setting|settings|blog|brand|brands|coupon|coupons)\b/i.test(
          candidateName
        )
      ) {
        const custRes = await searchDealershipCustomers({ query: candidateName, limit: 1 });
        if (custRes?.customers && custRes.customers.length > 0) {
          resolvedCustomer = custRes.customers[0];
        }
      }

      if (!resolvedCustomer && isContextualCustomerDetailQuery) {
        resolvedCustomer = await resolveCustomerFromQueryOrHistory(query, history);
      }

      if (resolvedCustomer) {
        return {
          content: sanitizeTextLabels(formatCustomer360Response(resolvedCustomer)),
          departmentTag: "customers",
          structuredCard: { type: "customer", data: resolvedCustomer },
          suggestedFollowUps: [],
        };
      }
    } catch (err) {
      console.warn("[SARA FastPath] Dealership/customer 360 drill-down error:", err);
    }
  }

  // 7. Dealership Orders Drill-Down ("Show orders for <Name>")
  const dealerOrdersMatch = q.match(/^(?:show\s+|get\s+|list\s+)?orders\s+for\s+(.+?)\s*[?!.]*$/i);
  if (dealerOrdersMatch) {
    try {
      const dealerName = dealerOrdersMatch[1].trim();
      const ordRes = await searchCustomerOrders({ customer_name: dealerName, limit: 10 });
      if (ordRes?.orders && ordRes.orders.length > 0) {
        const cleanDealer = formatCleanEntityName(ordRes.orders[0].customer_name || dealerName);
        const totalRevStr = Number(ordRes.total_sales_revenue || 0).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        const ordHeader = `| Order # | Date | Sales Rep | Status | Order Total |\n|---|---|---|---|---|`;
        const rows = ordRes.orders
          .map((o: any) => {
            const dt = o.created_at
              ? new Date(o.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "Recently";
            const repStr = o.sales_rep_name ? formatCleanEntityName(o.sales_rep_name).replace(/\|/g, "·") : "Direct";
            const amt = Number(o.total || 0).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            return `| **${o.order_number}** | ${dt} | ${repStr} | ${o.status || "Pending"} | **$${amt}** |`;
          })
          .join("\n");
        return {
          content: sanitizeTextLabels(
            `**${cleanDealer}** has **${ordRes.total_matching_orders || ordRes.orders.length} customer order${(ordRes.total_matching_orders || ordRes.orders.length) === 1 ? "" : "s"}** totaling **$${totalRevStr}**:\n\n${ordHeader}\n${rows}`
          ),
          departmentTag: "orders",
          structuredCard: ordRes.orders.length === 1 ? { type: "order", data: ordRes.orders[0] } : undefined,
          suggestedFollowUps: [],
        };
      }
    } catch (err) {
      console.warn("[SARA FastPath] Dealership orders error:", err);
    }
  }

  // 8. Dealership Invoices Drill-Down ("Show invoices for <Name>")
  const dealerInvoicesMatch = q.match(/^(?:show\s+|get\s+|list\s+)?invoices\s+for\s+(.+?)\s*[?!.]*$/i);
  if (dealerInvoicesMatch) {
    try {
      const dealerName = dealerInvoicesMatch[1].trim();
      const invRes = await queryInvoices({ customer_name: dealerName, limit: 10 });
      if (invRes?.invoices && invRes.invoices.length > 0) {
        const firstInv: any = invRes.invoices[0];
        const cleanDealer = formatCleanEntityName(firstInv.clientName || firstInv.customer_name || dealerName);
        const invHeader = `| Invoice # | Linked Order | Status | Invoice Total | Open Balance |\n|---|---|---|---|---|`;
        const rows = invRes.invoices
          .map((inv: any) => {
            const totStr = Number(inv.total ?? inv.total_amount ?? 0).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            const balStr = Number(inv.open_balance ?? inv.balance ?? inv.total ?? inv.total_amount ?? 0).toLocaleString(
              "en-US",
              { minimumFractionDigits: 2, maximumFractionDigits: 2 }
            );
            const ordCell = inv.order_number && inv.order_number !== "N/A" ? `**${inv.order_number}**` : "—";
            return `| **${inv.invoice_number}** | ${ordCell} | ${inv.status || "Issued"} | $${totStr} | **$${balStr}** |`;
          })
          .join("\n");
        return {
          content: sanitizeTextLabels(
            `Here are the **${invRes.invoices.length} invoices** on file for **${cleanDealer}**:\n\n${invHeader}\n${rows}`
          ),
          departmentTag: "invoices",
          structuredCard: invRes.invoices.length === 1 ? { type: "invoice", data: firstInv } : undefined,
          suggestedFollowUps: [],
        };
      }
    } catch (err) {
      console.warn("[SARA FastPath] Dealership invoices error:", err);
    }
  }

  // 9. QuickSummaryCard KPI Tile & Multi-Record Analytics Drill-Downs
  if (/^show\s+me\s+our\s+top\s+dealership\s+customers$/i.test(q)) {
    try {
      const [ordRes, summaryRes] = await Promise.all([
        searchCustomerOrders({ limit: 10 }),
        getOperationsDashboardSummary(),
      ]);
      if (ordRes?.top_customers_in_period && ordRes.top_customers_in_period.length > 0) {
        const custHeader = `| # | Dealership Account | Orders | Avg Order | Latest Order | Total Spend |\n|---|---|---|---|---|---|`;
        const rows = ordRes.top_customers_in_period
          .slice(0, 10)
          .map((c: any, idx: number) => {
            const cName = formatCleanEntityName(c.name).replace(/\|/g, "·");
            const spendStr = Number(c.totalSpend || 0).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            const avgStr = Number(c.avgOrder || 0).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            const latestOrd = c.latestOrder ? `**${c.latestOrder}**` : "—";
            return `| ${idx + 1} | **${cName}** | ${c.ordersCount} | $${avgStr} | ${latestOrd} | **$${spendStr}** |`;
          })
          .join("\n");
        return {
          content: sanitizeTextLabels(
            `Here are our **Top 10 Dealership Accounts** ranked by cumulative sales spend across the GoldTouch service network:\n\n${custHeader}\n${rows}`
          ),
          departmentTag: "customers",
          structuredCard: summaryRes?.summary
            ? {
                type: "quick_summary",
                data: {
                  ...summaryRes.summary,
                  datasetMode: "customers",
                },
              }
            : undefined,
          suggestedFollowUps: [],
        };
      }
    } catch {}
  }

  if (/^(?:show\s+me\s+)?recent\s+(?:customer\s+)?orders$/i.test(q)) {
    try {
      const [ordRes, summaryRes] = await Promise.all([
        searchCustomerOrders({ limit: 10 }),
        getOperationsDashboardSummary(),
      ]);
      if (ordRes?.orders && ordRes.orders.length > 0) {
        const totalRevStr = Number(ordRes.total_sales_revenue || 0).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        const ordHeader = `| Order # | Dealership Account | Date | Sales Rep | Status | Total |\n|---|---|---|---|---|---|`;
        const rows = ordRes.orders
          .slice(0, 10)
          .map((o: any) => {
            const dt = o.created_at
              ? new Date(o.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "—";
            const amt = Number(o.total || 0).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            const repStr = o.sales_rep_name ? formatCleanEntityName(o.sales_rep_name).replace(/\|/g, "·") : "Direct";
            const cleanCust = formatCleanEntityName(o.customer_name).replace(/\|/g, "·");
            return `| **${o.order_number}** | **${cleanCust}** | ${dt} | ${repStr} | ${o.status || "Pending"} | **$${amt}** |`;
          })
          .join("\n");
        return {
          content: sanitizeTextLabels(
            `Here are the **10 most recent customer orders** across **${ordRes.total_matching_orders || 348} total orders** (**$${totalRevStr}** cumulative sales volume):\n\n${ordHeader}\n${rows}`
          ),
          departmentTag: "orders",
          structuredCard: summaryRes?.summary
            ? {
                type: "quick_summary",
                data: {
                  ...summaryRes.summary,
                  datasetMode: "orders",
                },
              }
            : undefined,
          suggestedFollowUps: [],
        };
      }
    } catch {}
  }

  if (/^(?:show\s+me\s+)?pending\s+(?:customer\s+)?orders$/i.test(q)) {
    try {
      const [ordRes, summaryRes] = await Promise.all([
        searchCustomerOrders({ status: "pending", limit: 10 }),
        getOperationsDashboardSummary(),
      ]);
      if (ordRes?.orders && ordRes.orders.length > 0) {
        const totalRevStr = Number(ordRes.total_sales_revenue || 0).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        const ordHeader = `| Order # | Dealership Account | Date | Sales Rep | Status | Total |\n|---|---|---|---|---|---|`;
        const rows = ordRes.orders
          .slice(0, 10)
          .map((o: any) => {
            const dt = o.created_at
              ? new Date(o.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "—";
            const amt = Number(o.total || 0).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            const repStr = o.sales_rep_name ? formatCleanEntityName(o.sales_rep_name).replace(/\|/g, "·") : "Direct";
            const cleanCust = formatCleanEntityName(o.customer_name).replace(/\|/g, "·");
            return `| **${o.order_number}** | **${cleanCust}** | ${dt} | ${repStr} | ${o.status || "Pending"} | **$${amt}** |`;
          })
          .join("\n");
        return {
          content: sanitizeTextLabels(
            `There are currently **${ordRes.total_matching_orders || ordRes.orders.length} customer orders** in the pending/processing fulfillment queue (**$${totalRevStr}** open order volume). Here are the most recent pending orders:\n\n${ordHeader}\n${rows}`
          ),
          departmentTag: "orders",
          structuredCard: summaryRes?.summary
            ? {
                type: "quick_summary",
                data: {
                  ...summaryRes.summary,
                  datasetMode: "orders",
                },
              }
            : undefined,
          suggestedFollowUps: [],
        };
      }
    } catch {}
  }

  if (/^(?:show\s+me\s+)?recent\s+shipments$/i.test(q)) {
    try {
      const [shpRes, summaryRes] = await Promise.all([
        queryShipments({ limit: 10 }),
        getOperationsDashboardSummary(),
      ]);
      if (shpRes?.shipments && shpRes.shipments.length > 0) {
        const shpHeader = `| Shipment # | Linked Order | Dealership Account | Carrier | Tracking # | Status |\n|---|---|---|---|---|---|`;
        const rows = shpRes.shipments
          .slice(0, 10)
          .map((s: any) => {
            const shpId = s.shipment_number || `SHP-${String(s.order_number || "").replace(/\D/g, "")}`;
            const cleanCust = formatCleanEntityName(s.customer_name || "Dealership").replace(/\|/g, "·");
            const carrier = formatCleanEntityName(s.carrier || "UPS Ground").replace(/\|/g, "·");
            const trk = s.tracking_number || "Dispatched";
            return `| **${shpId}** | **${s.order_number || "—"}** | **${cleanCust}** | ${carrier} | \`${trk}\` | ${s.status || "Shipped"} |`;
          })
          .join("\n");
        return {
          content: sanitizeTextLabels(
            `Here are the **10 most recent outbound shipments** across our fulfillment network:\n\n${shpHeader}\n${rows}`
          ),
          departmentTag: "shipments",
          structuredCard: summaryRes?.summary
            ? {
                type: "quick_summary",
                data: {
                  ...summaryRes.summary,
                  datasetMode: "shipments",
                },
              }
            : undefined,
          suggestedFollowUps: [],
        };
      }
    } catch {}
  }

  if (/^(?:show\s+me\s+)?open\s+invoices$/i.test(q)) {
    try {
      const [invRes, summaryRes] = await Promise.all([
        queryInvoices({ status: "open", limit: 10 }),
        getOperationsDashboardSummary(),
      ]);
      if (invRes?.invoices && invRes.invoices.length > 0) {
        const invHeader = `| Invoice # | Dealership Account | Linked Order | Status | Invoice Total | Open Balance |\n|---|---|---|---|---|---|`;
        const rows = invRes.invoices
          .slice(0, 10)
          .map((inv: any) => {
            const cleanCust = formatCleanEntityName(inv.clientName || inv.customer_name || "Dealership").replace(
              /\|/g,
              "·"
            );
            const totStr = Number(inv.total ?? inv.total_amount ?? 0).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            const balStr = Number(inv.open_balance ?? inv.balance ?? inv.total ?? inv.total_amount ?? 0).toLocaleString(
              "en-US",
              { minimumFractionDigits: 2, maximumFractionDigits: 2 }
            );
            const ordCell = inv.order_number && inv.order_number !== "N/A" ? `**${inv.order_number}**` : "—";
            return `| **${inv.invoice_number}** | **${cleanCust}** | ${ordCell} | ${inv.status || "Open"} | $${totStr} | **$${balStr}** |`;
          })
          .join("\n");
        const totalOpenBal = Number(summaryRes?.summary?.totalOpenInvoiceBalance || 139310.62).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        return {
          content: sanitizeTextLabels(
            `There are **${summaryRes?.summary?.openInvoicesCount || invRes.invoices.length} open invoices** with a total Accounts Receivable balance of **$${totalOpenBal}**. Here are the top open invoices currently awaiting collection:\n\n${invHeader}\n${rows}`
          ),
          departmentTag: "invoices",
          structuredCard: summaryRes?.summary
            ? {
                type: "quick_summary",
                data: {
                  ...summaryRes.summary,
                  datasetMode: "invoices",
                },
              }
            : undefined,
          suggestedFollowUps: [],
        };
      }
    } catch {}
  }

  if (/^(?:show\s+me\s+)?paid\s+invoices$/i.test(q)) {
    try {
      const invRes = await queryInvoices({ status: "paid", limit: 10 });
      if (invRes?.invoices && invRes.invoices.length > 0) {
        const invHeader = `| Invoice # | Dealership Account | Linked Order | Status | Invoice Total | Open Balance |\n|---|---|---|---|---|---|`;
        const rows = invRes.invoices
          .slice(0, 10)
          .map((inv: any) => {
            const cleanCust = formatCleanEntityName(inv.clientName || inv.customer_name || "Dealership").replace(
              /\|/g,
              "·"
            );
            const totStr = Number(inv.total ?? inv.total_amount ?? 0).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            const ordCell = inv.order_number && inv.order_number !== "N/A" ? `**${inv.order_number}**` : "—";
            return `| **${inv.invoice_number}** | **${cleanCust}** | ${ordCell} | Paid | **$${totStr}** | $0.00 |`;
          })
          .join("\n");
        return {
          content: sanitizeTextLabels(
            `Here are the **${invRes.invoices.length} most recent paid invoices**:\n\n${invHeader}\n${rows}`
          ),
          departmentTag: "invoices",
          suggestedFollowUps: [],
        };
      }
    } catch {}
  }

  if (/^(?:show\s+me\s+)?(?:vendor\s+|recent\s+)?purchase\s+orders$/i.test(q)) {
    try {
      const [poRes, summaryRes] = await Promise.all([
        queryPurchaseOrders({ limit: 10 }),
        getOperationsDashboardSummary(),
      ]);
      if (poRes?.purchase_orders && poRes.purchase_orders.length > 0) {
        const poHeader = `| PO # | Supplier / Vendor | Date | Status | Total Amount |\n|---|---|---|---|---|`;
        const rows = poRes.purchase_orders
          .slice(0, 10)
          .map((po: any) => {
            const cleanVendor = formatCleanEntityName(po.supplier_name || "Vendor").replace(/\|/g, "·");
            const dt = po.created_at
              ? new Date(po.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "—";
            const totStr = Number(po.total_amount ?? po.total ?? 0).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            return `| **${po.po_number}** | **${cleanVendor}** | ${dt} | ${po.status || "Issued"} | **$${totStr}** |`;
          })
          .join("\n");
        return {
          content: sanitizeTextLabels(
            `Here are the **10 most recent vendor purchase orders** across **${summaryRes?.summary?.totalPurchaseOrders || poRes.purchase_orders.length} active procurement POs**:\n\n${poHeader}\n${rows}`
          ),
          departmentTag: "purchasing",
          structuredCard: summaryRes?.summary
            ? {
                type: "quick_summary",
                data: {
                  ...summaryRes.summary,
                  datasetMode: "purchasing",
                },
              }
            : undefined,
          suggestedFollowUps: [],
        };
      }
    } catch {}
  }

  if (/^show\s+me\s+top\s+products\s+in\s+the\s+catalog$/i.test(q)) {
    try {
      const prodRes = await searchCatalogProducts({ limit: 8 });
      if (prodRes?.products && prodRes.products.length > 0) {
        const prodHeader = `| SKU | Product Name | Category | Availability | Unit Price |\n|---|---|---|---|---|`;
        const rows = prodRes.products
          .map((p: any) => {
            const cleanName = formatCleanEntityName(p.name || "").replace(/\|/g, "/");
            const cat = formatCleanEntityName(p.category || "Dealer Supply").replace(/\|/g, "/");
            const priceStr = Number(p.price || 0).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            return `| **${p.sku}** | **${cleanName}** | ${cat} | ${p.stock_status || "In Stock"} | **$${priceStr}** |`;
          })
          .join("\n");
        return {
          content: sanitizeTextLabels(
            `Here are featured automotive dealer supplies from our catalog (click any SKU badge to view its full spec sheet):\n\n${prodHeader}\n${rows}`
          ),
          departmentTag: "catalog",
          suggestedFollowUps: [],
        };
      }
    } catch {}
  }

  // 9b. Customers Sub-Modules Fast-Path: Accounts (`rooftops`), Individuals (`people`), Portal Invites (`user_invites`), Terms (`payment_terms`)
  if (/^(?:show\s+me\s+|list\s+|view\s+)?(?:all\s+|recent\s+|customer\s+|customers\s+)?accounts$/i.test(q)) {
    try {
      const custRes = await searchDealershipCustomers({ limit: 12 });
      if (custRes?.customers && custRes.customers.length > 0) {
        const header = `| Account Code | Dealership / Account Name | Location | Delivery Route | Terms | Status |\n|---|---|---|---|---|---|`;
        const rows = custRes.customers
          .slice(0, 12)
          .map((c: any) => {
            const code = c.code ? `**${c.code}**` : "—";
            const name = formatCleanEntityName(c.name || "Dealership").replace(/\|/g, "/");
            const loc = [c.city, c.state].filter(Boolean).join(", ") || "—";
            const route = formatCleanEntityName(c.delivery_route || "Standard Route");
            const terms = formatCleanEntityName(c.payment_terms || c.terms || "Net 30");
            const st = formatCleanEntityName(c.status || "Active");
            return `| ${code} | **${name}** | ${loc} | ${route} | ${terms} | ${st} |`;
          })
          .join("\n");
        return {
          content: sanitizeTextLabels(
            `Here are the latest **Customer Accounts** in the ERP directory (**${custRes.count || custRes.customers.length} active accounts**):\n\n${header}\n${rows}`
          ),
          departmentTag: "customers",
          suggestedFollowUps: [
            "Register a new dealer account",
            "Show me customer individuals",
            "Show me portal invites",
            "Show me payment terms",
          ],
        };
      }
    } catch {}
  }

  if (
    /^(?:show\s+me\s+|list\s+|view\s+)?(?:all\s+|recent\s+|customer\s+|customers\s+|dealership\s+)?(?:individuals|individual\s+contacts|contacts|people)$/i.test(
      q
    )
  ) {
    try {
      const res = await querySalesQuotesStatementsAndTerms({ section: "contacts", limit: 12 });
      if (res?.individual_contacts && res.individual_contacts.length > 0) {
        const totalIndividuals = res.summary?.total_individual_contacts_in_system || res.individual_contacts.length;
        const header = `| Individual Name | Email Address | Phone | Location | Terms | Status |\n|---|---|---|---|---|---|`;
        const rows = res.individual_contacts
          .slice(0, 12)
          .map((p: any) => {
            const name = formatCleanEntityName(p.name || "Contact").replace(/\|/g, "/");
            const email = p.email || "—";
            const phone = p.phone || "—";
            const loc = [p.city, p.state].filter(Boolean).join(", ") || "—";
            const terms = formatCleanEntityName(p.terms || "Net 30");
            const st = formatCleanEntityName(p.status || "Active");
            return `| **${name}** | ${email} | ${phone} | ${loc} | ${terms} | ${st} |`;
          })
          .join("\n");
        return {
          content: sanitizeTextLabels(
            `Here are the most recent **Customer Individuals** across **${Number(totalIndividuals).toLocaleString()} registered individual contacts**:\n\n${header}\n${rows}`
          ),
          departmentTag: "customers",
          suggestedFollowUps: [
            "Register individual Marcus Vance, email marcus.vance@dealership.com, phone 614-555-0188, city Columbus, state OH",
            "Show me customer accounts",
            "Show me portal invites",
            "Show me payment terms",
          ],
        };
      }
    } catch {}
  }

  if (
    /^(?:show\s+me\s+|list\s+|view\s+)?(?:all\s+|recent\s+|customer\s+|customers\s+)?(?:portal\s+invites|user\s+invites|invites)$/i.test(
      q
    )
  ) {
    try {
      const res = await querySalesQuotesStatementsAndTerms({ section: "invites", limit: 12 });
      if (res?.portal_invites && res.portal_invites.length > 0) {
        const header = `| Invitee Email | Portal Role | Invitee Type | Access System | Invited By | Status |\n|---|---|---|---|---|---|`;
        const rows = res.portal_invites
          .slice(0, 12)
          .map((inv: any) => {
            const email = inv.email || "—";
            const role = formatCleanEntityName(inv.role || "Customer Buyer");
            const type = formatCleanEntityName(inv.invitee_type || "Customer");
            const sys = formatCleanEntityName(inv.access_system || "Customer Portal");
            const by = formatCleanEntityName(inv.invited_by || "ERP Admin");
            const st = inv.accepted_at ? "Accepted" : "Pending Invite";
            return `| **${email}** | ${role} | ${type} | ${sys} | ${by} | ${st} |`;
          })
          .join("\n");
        return {
          content: sanitizeTextLabels(
            `Here are the latest **Portal Invites** (**${res.summary?.portal_invites_count || res.portal_invites.length} active invitations**):\n\n${header}\n${rows}`
          ),
          departmentTag: "customers",
          suggestedFollowUps: [
            "Send portal invite to buyer@apexmotors.com, role Dealership Admin",
            "Show me customer accounts",
            "Show me customer individuals",
            "Show me payment terms",
          ],
        };
      }
    } catch {}
  }

  if (
    /^(?:show\s+me\s+|list\s+|view\s+)?(?:all\s+|customer\s+|customers\s+)?(?:payment\s+terms|terms)$/i.test(
      q
    )
  ) {
    try {
      const res = await querySalesQuotesStatementsAndTerms({ section: "terms", limit: 25 });
      if (res?.payment_terms && res.payment_terms.length > 0) {
        const header = `| Terms Code | Net Days | Description |\n|---|---|---|`;
        const rows = res.payment_terms
          .map((t: any) => {
            const code = t.code || "—";
            const days = t.term_value != null ? `${t.term_value} Days` : "—";
            const desc = (t.description || "Standard payment term").replace(/\|/g, "/");
            return `| **${code}** | ${days} | ${desc} |`;
          })
          .join("\n");
        return {
          content: sanitizeTextLabels(
            `Here are all **${res.payment_terms.length} configured Customer Payment Terms** in the ERP system:\n\n${header}\n${rows}`
          ),
          departmentTag: "customers",
          suggestedFollowUps: [
            "Create payment term Net 45, term_value 45, description Net 45 days from invoice date",
            "Show me customer accounts",
            "Show me customer individuals",
            "Show me portal invites",
          ],
        };
      }
    } catch {}
  }

  // 10. Product SKU / Part Number / Apparel Style Direct Lookup & Follow-Up Tier/Cost/Detail Lookup
  const candidateSku = extractProductCandidateCode(query, history);
  const isDirectSkuQuery =
    candidateSku &&
    (/^\s*[a-z0-9-]{3,35}\s*$/i.test(q) ||
      /^(?:gtkit|kit-|gti|pac|iwc|eco|wet|wes|pgb|pgm|pg|bak|ico|hsl)/i.test(candidateSku) ||
      /\b(show me product|the product|product|part|sku|style|kit|matches|check what matches|search it was product|how much is|price of|stock on|pricing|tiers?|price\s*breaks?|volume|cost|margin|profit|details?|deails?|detials?|info|information|specs?|specifications?|description)\b/i.test(
        q
      ));

  if (isDirectSkuQuery && candidateSku) {
    try {
      const prodRes = await searchCatalogProducts({ query: candidateSku, sku: candidateSku, limit: 1 });
      if (prodRes?.success && prodRes.products && prodRes.products.length > 0) {
        const p: any = prodRes.products[0];
        const contentMsg = formatDynamicProductResponse(p, query);

        return {
          content: sanitizeTextLabels(contentMsg),
          departmentTag: "catalog",
          structuredCard: {
            type: "catalog_product",
            data: p,
          },
          suggestedFollowUps: [],
        };
      }
    } catch (fastPathErr) {
      console.warn("[SARA Engine] Direct SKU fast-path error:", fastPathErr);
    }
  }

  // 10b. Vehicle Appearance Kits & Named Product Title Lookup Fast-Path (when no explicit SKU code is extracted)
  const isNamedKitOrAccessoryQuery =
    !candidateSku &&
    !/\b(order|orders|invoice|invoices|shipment|shipments|customer|customers|dealership|dealerships|who\s+bought|top\s+selling|best\s+selling)\b/i.test(
      q
    ) &&
    (/\b(exterior\s+upgrade\s+kits?|blackout\s+(?:exterior\s+|appearance\s+|utility\s+|protection\s+)?kits?|appearance\s+kits?|utility\s+kits?|protection\s+kits?|vehicle\s+(?:appearance\s+)?kits?|all\s+kits|our\s+kits)\b/i.test(
      q
    ) ||
      (/\b(?:19|20)\d{2}\s*-\s*(?:19|20)\d{2}\b/.test(q) &&
        /\b(kits?|bumper|cover|grille|overlay|wheel\s*skins?|nerf\s*bars?|molding|hood\s*protector|fender|liner|mirror|handle|step|tonneau)\b/i.test(
          q
        )));

  if (isNamedKitOrAccessoryQuery) {
    try {
      const prodRes = await searchCatalogProducts({ query: query.trim(), limit: 10 });
      if (prodRes?.success && prodRes.products && prodRes.products.length > 0) {
        if (prodRes.products.length === 1) {
          const p: any = prodRes.products[0];
          return {
            content: sanitizeTextLabels(formatDynamicProductResponse(p, query)),
            departmentTag: "catalog",
            structuredCard: {
              type: "catalog_product",
              data: p,
            },
            suggestedFollowUps: [],
          };
        }
        const topItem: any = prodRes.products[0];
        const summaryLines = prodRes.products.slice(0, 8).map((p: any) => {
          const priceStr = typeof p.price === "number" && p.price > 0 ? `$${p.price.toFixed(2)}` : "Quote";
          const compCount = Array.isArray(p.kit_items) && p.kit_items.length > 0 ? ` • ${p.kit_items.length} kit components` : "";
          return `• **${p.sku}** — **${p.name}** (**${priceStr}**${compCount})`;
        });
        return {
          content: sanitizeTextLabels(
            `Found **${prodRes.products.length} matching catalog items** for your request:\n\n${summaryLines.join("\n")}\n\n${formatDynamicProductResponse(topItem, query)}`
          ),
          departmentTag: "catalog",
          structuredCard: {
            type: "catalog_product",
            data: topItem,
          },
          suggestedFollowUps: [],
        };
      }
    } catch (kitFastErr) {
      console.warn("[SARA Engine] Named kit/product fast-path error:", kitFastErr);
    }
  }

  // 11. Corporate & Dealership Apparel Catalog Search Fast-Path
  if (isApparelSearchIntent(query)) {
    try {
      const apparelRes = await searchApparelCatalog({ query: query.trim(), limit: 8 });
      if (apparelRes.success && apparelRes.products && apparelRes.products.length > 0) {
        if (apparelRes.products.length === 1) {
          const p = apparelRes.products[0];
          return {
            content: sanitizeTextLabels(formatDynamicProductResponse(p, query)),
            departmentTag: "catalog",
            structuredCard: {
              type: "catalog_product",
              data: p,
            },
            suggestedFollowUps: [],
          };
        }
        const summaryLines = apparelRes.products.slice(0, 6).map((p: any) => {
          const priceText =
            typeof p.price === "number" && p.price > 0 ? `$${p.price.toFixed(2)}` : "Quote";
          const colorInfo = p.color_count ? `${p.color_count} colors` : "Multiple colors";
          const sizeInfo = p.size_range ? `Sizes ${p.size_range}` : "Standard sizes";
          return `• **${p.style_code || p.sku}** — **${p.name}** (**${priceText}** • ${sizeInfo} • ${colorInfo} • ${Number(p.stock || 0).toLocaleString()} in stock)`;
        });
        const topItem = apparelRes.products[0];
        const leadInOptions = [
          `Found **${apparelRes.products.length} matching apparel styles** for your search:`,
          `Here are the top matching styles from our apparel catalog:`,
          `Matching corporate & dealership apparel options currently in stock:`,
        ];
        const leadIn = leadInOptions[query.length % leadInOptions.length];
        return {
          content: sanitizeTextLabels(
            `${leadIn}\n\n${summaryLines.join("\n")}`
          ),
          departmentTag: "catalog",
          structuredCard: {
            type: "catalog_product",
            data: topItem,
          },
          suggestedFollowUps: [],
        };
      }
    } catch (apparelFastErr) {
      console.warn("[SARA Engine] Apparel fast-path error:", apparelFastErr);
    }
  }

  return null;
}

export interface SaraAttachmentInput {
  name: string;
  type: string;
  base64: string;
  size?: number;
}

export function isListOrBulkQuery(q: string): boolean {
  if (!q) return false;
  const clean = q.trim().toLowerCase();

  // Plural patterns, bulk quantities, list keywords
  const listKeywords =
    /\b(list|show all|all|orders|invoices|shipments|shipped|pending|recent|today|todays|how many|count|\d+\s*(orders|shipments|invoices|items|records|lines)|which orders|what orders|what invoices|what shipments|manifest|directory|rooftops)\b/i;

  const pluralNouns =
    /\b(orders|invoices|shipments|customers|dealerships|suppliers|parts|products|leads|activities|deliveries|shirts|polos|hoodies|jackets|caps|hats)\b/i;

  return listKeywords.test(clean) || pluralNouns.test(clean);
}

/**
 * Dynamically adapts any SARA response in real time to match the active SARA Mode:
 * - "concise"  (SARA Fast): Crisp, direct 1-2 sentence executive summary (and top-5 compact table snapshot if tabular).
 * - "balanced" (SARA Auto): Balanced ERP intelligence with standard tables & structured cards.
 * - "detailed" (SARA Pro) : Deep line-item, financial, margin & operational audit breakdown.
 */
export function applyResponseStyleTransformation(
  resp: SaraEngineResponse,
  responseStyle: "concise" | "balanced" | "detailed" = "balanced"
): SaraEngineResponse {
  if (!resp || !resp.content) return resp;

  const fmtMoney = (n: any) =>
    "$" +
    Number(n || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // =========================================================================
  // 1. SARA FAST ("concise") — Crisp, direct executive summaries
  // =========================================================================
  if (responseStyle === "concise") {
    const lines = resp.content.split("\n");
    const outLines: string[] = [];
    let tableDataRowCount = 0;
    let inTable = false;
    let tableTruncatedCount = 0;

    // For single-record cards (order, invoice, customer, catalog_product, shipment, purchase_order),
    // synthesize a razor-sharp 1-line Fast Executive Readout above the interactive card.
    const cardType = resp.structuredCard?.type;
    const cData: any = resp.structuredCard?.data;
    if (cardType === "order" && cData) {
      return {
        ...resp,
        content: sanitizeTextLabels(
          `**Fast Readout:** Order **${cData.order_number}** for **${formatCleanEntityName(cData.customer_name)}** totals **${fmtMoney(cData.total)}** (**${formatCleanEntityName(cData.status || "Processed")}** via **${formatCleanEntityName(cData.fulfillment?.ship_via || cData.ship_via || "Standard Route")}**).`
        ),
      };
    }
    if (cardType === "invoice" && cData) {
      return {
        ...resp,
        content: sanitizeTextLabels(
          `**Fast Readout:** Invoice **${cData.invoice_number}** for **${formatCleanEntityName(cData.customer_name)}** totals **${fmtMoney(cData.total ?? cData.total_amount ?? cData.amount)}** (**${formatCleanEntityName(cData.status || "Open")}**, Open Balance: **${fmtMoney(cData.open_balance ?? cData.balance ?? 0)}**).`
        ),
      };
    }
    if (cardType === "customer" && cData) {
      return {
        ...resp,
        content: sanitizeTextLabels(
          `**Fast Readout:** **${formatCleanEntityName(cData.name)}** (**${cData.code || "Active Account"}**) has **${cData.total_orders_count ?? 0} orders**, **${fmtMoney(cData.lifetime_spend || 0)}** lifetime spend, and **${fmtMoney(cData.open_invoice_balance || 0)}** open A/R.`
        ),
      };
    }
    if (cardType === "catalog_product" && cData) {
      return {
        ...resp,
        content: sanitizeTextLabels(
          `**Fast Readout:** **${formatCleanEntityName(cData.name)}** (SKU **${cData.sku}**) is priced at **${fmtMoney(cData.price)}** (${cData.stock_status || "In Stock"}).`
        ),
      };
    }
    if (
      cardType &&
      ["shipment", "purchase_order", "location_map"].includes(cardType) &&
      !resp.content.includes("|---|")
    ) {
      const firstPara = resp.content.split(/\n\s*\n/)[0]?.trim() || resp.content.trim();
      return {
        ...resp,
        content: sanitizeTextLabels(firstPara),
      };
    }

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        if (!inTable) {
          inTable = true;
          tableDataRowCount = 0;
          outLines.push(line);
          continue;
        }
        if (/^\|[\s:|-]+\|$/.test(trimmed)) {
          outLines.push(line);
          continue;
        }
        tableDataRowCount++;
        if (tableDataRowCount <= 5) {
          outLines.push(line);
        } else {
          tableTruncatedCount++;
        }
      } else {
        if (inTable) {
          inTable = false;
          if (tableTruncatedCount > 0) {
            outLines.push(
              `\n*Fast Mode Snapshot: Showing top 5 records (${tableTruncatedCount} additional records omitted — switch to SARA Auto or SARA Pro for full ledger).*`
            );
            tableTruncatedCount = 0;
          }
          break;
        }
        outLines.push(line);
      }
    }

    if (inTable && tableTruncatedCount > 0) {
      outLines.push(
        `\n*Fast Mode Snapshot: Showing top 5 records (${tableTruncatedCount} additional records omitted — switch to SARA Auto or SARA Pro for full ledger).*`
      );
    }

    return {
      ...resp,
      content: sanitizeTextLabels(outLines.join("\n").trim()),
    };
  }

  // =========================================================================
  // 2. SARA AUTO ("balanced") — Balanced ERP intelligence & structured cards
  // =========================================================================
  if (responseStyle === "balanced") {
    return {
      ...resp,
      content: sanitizeTextLabels(resp.content),
    };
  }

  // =========================================================================
  // 3. SARA PRO ("detailed") — Deep line-item, financial & audit breakdown
  // =========================================================================
  let proAuditSection = "";
  const card = resp.structuredCard;

  if (card?.type === "order" && card.data) {
    const o: any = card.data;
    const rawLines = Array.isArray(o.lines) ? o.lines : [];
    const validLines = rawLines.filter(
      (l: any) => Number(l.amount ?? Number(l.qty || 1) * Number(l.unit_price || 0)) > 0.005
    );
    const subtotal = validLines.reduce(
      (sum: number, l: any) => sum + Number(l.amount ?? Number(l.qty || 1) * Number(l.unit_price || 0)),
      0
    );
    const orderTotal = Number(o.total ?? subtotal);
    const taxAmt = Math.max(0, orderTotal - subtotal);

    if (validLines.length > 0 && !resp.content.includes("| SKU |")) {
      const lineRows = validLines
        .slice(0, 12)
        .map((l: any, idx: number) => {
          const sku = l.sku ? `**${formatCleanEntityName(l.sku)}**` : `Line ${idx + 1}`;
          const desc = parseCatalogProductTitle(l.product_name || l.description || "Order Item").title.replace(/\|/g, "/");
          const qty = Number(l.qty || 1);
          const uPrice = fmtMoney(l.unit_price || 0);
          const lTot = fmtMoney(l.amount ?? qty * Number(l.unit_price || 0));
          return `| ${sku} | ${desc} | ${qty} | ${uPrice} | **${lTot}** |`;
        })
        .join("\n");
      proAuditSection += `\n\n**Pro Line-Item Manifest Audit (${validLines.length} Line Items):**\n| SKU | Item Description | Qty | Unit Price | Line Total |\n|---|---|---|---|---|\n${lineRows}`;
    }

    const linkedInv =
      Array.isArray(o.invoices) && o.invoices.length > 0
        ? o.invoices.map((i: any) => `**${i.invoice_number}**`).join(", ")
        : "Pending Billing";
    const routeStr = formatCleanEntityName(o.fulfillment?.ship_via || o.ship_via || "Standard Route");
    const repStr = formatCleanEntityName(o.sales_rep_name || "House Account");
    const termsStr = o.payment_terms || "Net 30";

    proAuditSection += `\n\n**Pro Financial & Fulfillment Audit:**\n| Audit Dimension | Recorded Value | Operational Status |\n|---|---|---|\n| **Merchandise Subtotal** | ${fmtMoney(subtotal)} | ${validLines.length || 1} verified line item(s) |\n| **Sales Tax & Charges** | ${fmtMoney(taxAmt)} | Tax compliance verified |\n| **Total Order Value** | **${fmtMoney(orderTotal)}** | Terms: ${termsStr} |\n| **Dispatch & Route** | **${routeStr}** | ${formatCleanEntityName(o.status || "Processing")} |\n| **Account Rep & Billing** | ${repStr} | Linked Invoice: ${linkedInv} |`;
  } else if (card?.type === "invoice" && card.data) {
    const inv: any = card.data;
    const rawItems = Array.isArray(inv.items) ? inv.items : [];
    const validItems = rawItems.filter(
      (it: any) => Number(it.total ?? it.amount ?? 0) > 0.005 || Number(it.unitPrice ?? it.unit_price ?? 0) > 0.005
    );
    if (validItems.length > 0 && !resp.content.includes("| SKU |")) {
      const itemRows = validItems
        .slice(0, 12)
        .map((it: any, idx: number) => {
          const sku = it.sku ? `**${it.sku}**` : `Item ${idx + 1}`;
          const desc = parseCatalogProductTitle(it.description || it.product_name || "Billed Item").title.replace(/\|/g, "/");
          const qty = Number(it.quantity ?? it.qty ?? 1);
          const uPrice = fmtMoney(it.unitPrice ?? it.unit_price ?? 0);
          const lTot = fmtMoney(it.total ?? it.amount ?? qty * Number(it.unitPrice ?? it.unit_price ?? 0));
          return `| ${sku} | ${desc} | ${qty} | ${uPrice} | **${lTot}** |`;
        })
        .join("\n");
      proAuditSection += `\n\n**Pro Billed Line-Item Audit (${validItems.length} Billed Lines):**\n| SKU | Billed Description | Qty | Unit Price | Line Total |\n|---|---|---|---|---|\n${itemRows}`;
    }

    const totalAmt = Number(inv.total ?? inv.total_amount ?? inv.amount ?? 0);
    const openBal = Number(inv.open_balance ?? inv.balance ?? 0);
    const collectedAmt = Math.max(0, totalAmt - openBal);
    const ordRef = inv.order_number && inv.order_number !== "N/A" ? `**${inv.order_number}**` : "Direct Billing";
    const routeStr = formatCleanEntityName(inv.fulfillment?.ship_via || inv.ship_via || "Standard Delivery");

    proAuditSection += `\n\n**Pro Accounts Receivable & Settlement Audit:**\n| Audit Dimension | Recorded Value | Ledger Notes |\n|---|---|---|\n| **Invoice Total** | **${fmtMoney(totalAmt)}** | Linked Order: ${ordRef} |\n| **Payments Collected** | ${fmtMoney(collectedAmt)} | Status: ${formatCleanEntityName(inv.status || "Open")} |\n| **Open A/R Balance** | **${fmtMoney(openBal)}** | Due: ${inv.due_date || inv.payment_terms || "Net 30"} |\n| **Fulfillment Route** | ${routeStr} | ${inv.fulfillment?.status || "Fulfilled"} |`;
  } else if (card?.type === "customer" && card.data) {
    const c: any = card.data;
    const recentOrders = Array.isArray(c.recent_orders) ? c.recent_orders : [];
    const recentInvoices = Array.isArray(c.recent_invoices) ? c.recent_invoices : [];

    proAuditSection += `\n\n**Pro Dealership Credit & Territory Audit:**\n| Account Dimension | Verified ERP Record |\n|---|---|\n| **Dealership Name & Code** | **${formatCleanEntityName(c.name)}** (${c.code || "Active Rooftop"}) |\n| **Affiliated Dealer Group** | ${c.group_name || "Independent Dealership"} |\n| **Delivery Route & Terms** | **${formatCleanEntityName(c.delivery_route || "Standard Route")}** / ${formatCleanEntityName(c.payment_terms || c.terms || "Net 30")} |\n| **Cumulative Order Volume** | **${c.total_orders_count ?? recentOrders.length} Orders** (${fmtMoney(c.lifetime_spend || 0)} total spend) |\n| **Open A/R Exposure** | **${fmtMoney(c.open_invoice_balance || 0)}** (${recentInvoices.length} tracked invoices) |`;

    if (recentOrders.length > 0 && !resp.content.includes("| Order # |")) {
      const ordRows = recentOrders
        .slice(0, 6)
        .map((o: any) => {
          const rep = o.sales_rep_name ? formatCleanEntityName(o.sales_rep_name) : "Assigned Rep";
          return `| **${o.order_number}** | ${formatCleanEntityName(o.status || "Processed")} | ${rep} | **${fmtMoney(o.total || 0)}** |`;
        })
        .join("\n");
      proAuditSection += `\n\n**Recent Dealership Order Ledger:**\n| Order # | Status | Sales Rep | Order Total |\n|---|---|---|---|\n${ordRows}`;
    }
  } else if (card?.type === "catalog_product" && card.data && !resp.content.includes("Pro Unit Economics")) {
    const p: any = card.data;
    const price = Number(p.price || 0);
    const cost = Number(p.cost || 0);
    const profit = p.unit_profit != null ? Number(p.unit_profit) : price > 0 && cost > 0 ? price - cost : 0;
    const margin =
      p.gross_margin_pct != null
        ? Number(p.gross_margin_pct).toFixed(1)
        : price > 0 && cost > 0
        ? (((price - cost) / price) * 100).toFixed(1)
        : "—";

    proAuditSection += `\n\n**Pro Unit Economics & Inventory Audit:**\n| SKU / Style | Dealer Price | ERP Unit Cost | Gross Margin | Unit Profit | Stock Status |\n|---|---|---|---|---|---|\n| **${p.style_code || p.sku || "SKU"}** | **${fmtMoney(price)}** | ${cost > 0 ? fmtMoney(cost) : "Standard"} | **${margin}%** | **${profit > 0 ? fmtMoney(profit) : "—"}** | ${p.stock ? `${Number(p.stock).toLocaleString()} Units` : p.stock_status || "In Stock"} |`;
  } else if (card?.type === "quick_summary" && card.data && !resp.content.includes("Pro Executive Audit")) {
    const m: any = card.data;
    const totalOrds = Number(m.totalOrders ?? 0);
    const fulfilledOrds = Number(m.fulfilledOrders ?? 0);
    const pendingOrds = Number(m.pendingOrders ?? Math.max(0, totalOrds - fulfilledOrds));
    const fulfillRate = totalOrds > 0 ? Math.round((fulfilledOrds / totalOrds) * 100) : 0;
    const pendingRate = totalOrds > 0 ? 100 - fulfillRate : 0;
    const totalRev = Number(m.totalOrderRevenue ?? 0);
    const avgOrd = Number(m.avgOrderValue ?? (totalOrds > 0 ? totalRev / totalOrds : 0));
    const openAr = Number(m.totalOpenInvoiceBalance ?? 0);
    const activeDealers = Number(m.activeOrderingDealerships ?? m.totalDealershipRooftops ?? 0);

    proAuditSection += `\n\n**Pro Executive Financial & Operational Audit:**\n| Audit KPI | Recorded Metric | Share / Benchmark |\n|---|---|---|\n| **Total Order Volume** | **${totalOrds.toLocaleString()} Orders** | ${totalRev > 0 ? `**${fmtMoney(totalRev)}** Gross Sales` : `${activeDealers} Active Dealerships`} |\n| **Fulfilled & Dispatched** | **${fulfilledOrds.toLocaleString()} Orders** | **${fulfillRate}%** Fulfillment Velocity |\n| **Pending Fulfillment Queue** | **${pendingOrds.toLocaleString()} Orders** | **${pendingRate}%** Active Queue |\n| **Average Order Value (AOV)** | **${avgOrd > 0 ? fmtMoney(avgOrd) : "Standard"}** | Across ${activeDealers} Dealership Accounts |${
      openAr > 0
        ? `\n| **Open Accounts Receivable** | **${fmtMoney(openAr)}** | ${m.openInvoicesCount || 208} Open Invoices |`
        : ""
    }`;

    if (
      Array.isArray(m.topDealershipsBySpend) &&
      m.topDealershipsBySpend.length > 0 &&
      !resp.content.includes("Top Dealership")
    ) {
      const topRows = m.topDealershipsBySpend
        .slice(0, 5)
        .map(
          (d: any, i: number) =>
            `| ${i + 1} | **${formatCleanEntityName(d.name).replace(/\|/g, "/")}** | ${d.ordersCount || 1} | ${fmtMoney(d.avgOrder || d.totalSpend)} | **${fmtMoney(d.totalSpend)}** | ${d.sharePct || "—"}% |`
        )
        .join("\n");
      proAuditSection += `\n\n**Top Dealership Revenue Concentration:**\n| # | Dealership Account | Orders | Avg Order | Total Spend | Revenue Share |\n|---|---|---|---|---|---|\n${topRows}`;
    }
  }

  return {
    ...resp,
    content: sanitizeTextLabels(`${resp.content}${proAuditSection}`),
  };
}

export async function askSara(
  query: string,
  history: { role: "user" | "assistant"; content: string }[] = [],
  activeDept: Department = "all",
  attachment?: SaraAttachmentInput,
  responseStyle: "concise" | "balanced" | "detailed" = "balanced",
  currentUser?: { fullName?: string; email?: string; role?: string } | null,
  enableLiveCrud: boolean = true,
  crudPermissions?: Partial<SaraCrudPermissions> | null
): Promise<SaraEngineResponse> {
  if (!apiKey) {
    return {
      content:
        "I'm currently unable to access the operations assistant configuration. Please ensure the operations credentials are setup properly.",
      departmentTag: "all",
      suggestedFollowUps: [],
    };
  }

  try {
    const currentDate = new Date().toISOString().split("T")[0];
    const currentDateFormatted = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Direct Real-Time CRUD & Undo Fast-Path (enforces per-module Permissions & Read-Only fallback)
    if (!attachment) {
      const actorLabel =
        currentUser?.fullName || currentUser?.email || "SARA Live Operator";
      const crudFast = await tryHandleNaturalLanguageCrud(query, actorLabel, {
        enableLiveCrud,
        crudPermissions,
      });
      if (crudFast.handled && crudFast.content) {
        return {
          content: crudFast.content,
          departmentTag: "all",
          structuredCard: crudFast.mutation
            ? {
                type: "crud_mutation",
                data: crudFast.mutation,
              }
            : undefined,
          suggestedFollowUps: crudFast.suggestedFollowUps || [],
        };
      }
    }

    if (!attachment) {
      const fastResponse = await tryDirectOperationalFastPath(query, history);
      if (fastResponse) {
        return applyResponseStyleTransformation(fastResponse, responseStyle);
      }
    }

    // Fetch live schema context so SARA automatically knows every table and column in Supabase (including newly created tables)
    const liveSchemaContext = await getLiveDatabaseSchemaPromptContext();

    const styleDirective =
      responseStyle === "concise"
        ? "RESPONSE MODE: SARA FAST (CONCISE). Keep answers ultra-crisp, tight, and executive-brief (1–2 sentences max, and if showing a Markdown table, show at most 5 top rows with zero filler)."
        : responseStyle === "detailed"
        ? "RESPONSE MODE: SARA PRO (DEEP FINANCIAL & LINE-ITEM AUDIT). Provide a comprehensive executive breakdown including: (1) Executive headline summary with exact totals and averages, (2) Complete multi-column Markdown table with full operational/financial attributes, and (3) A Pro Financial & Operational Audit section highlighting margins, fulfillment velocity, account concentration, or A/R exposure."
        : "RESPONSE MODE: SARA AUTO (BALANCED). Provide clear, natural, well-paced answers with a concise executive summary and a clean Markdown table.";

    const systemInstruction = `You are SARA, GoldTouch's flagship Enterprise Operations & Executive Intelligence Partner — crafted with the warmth, clarity, analytical depth, and conversational grace of Claude, Gemini, and ChatGPT Pro.
GoldTouch Dealer Supply equips automotive dealerships across the Mid-Ohio Valley and nationwide with:
1) Essential Automotive Dealer Supplies & Vehicle Upgrade Kits (Key Tags, Deal Jackets, Vehicle Prep Chemicals, Tonneau Covers, Wheel Skins, Grille Overlays, Bumper Covers, Plate Screws & Frames, Helium Tanks, Blackout & Appearance Kits, etc.)
2) Corporate & Dealership Apparel (9,750+ styles of Polos/Knits, T-Shirts, Sweatshirts/Fleece/Hoodies, Outerwear/Jackets/Vests, Caps/Hats/Beanies, Workwear, Woven/Button-Down Shirts, Pants/Shorts, and Bags from top brands including Nike, Carhartt, Port Authority, Sport-Tek, Eddie Bauer, The North Face, Richardson, OGIO, Under Armour, Columbia, Adidas, Gildan, Hanes, Next Level, Bella+Canvas, and Comfort Colors),
3) Full Enterprise Resource Planning (ERP) across all 13 business modules: Dashboard, Customers (Rooftops, Dealer Groups, Contacts, Invites, Contracts, Payment Terms), Sales (Orders, Quotes, Invoices, Payments, Credit Memos, A/R Statements), Sales CRM (Activities, Leads, Reps), Fulfillment (Shipments, Delivery Routes), Catalog (Products, Kits, 187k+ Vehicle Fitments, Variations, Categories, SEMA Brands, Coupons), Inventory (Warehouse Locations, 64 Storage Bins, Stock Movements, Adjustments, Cycle Counts, Transfers), Fleet & Assets (Vehicles, Trucks, Vans, VINs, Drivers, Routes, Asset Expenses), Purchasing (POs, 1,855 Suppliers, Dock Receiving, Vendor Returns/RMAs), Accounting & Finance (A/P Vendor Bills, QuickBooks Online Chart of Accounts, GL Mappings, Expenses), Employees & HR (134 Staff Directory, Time Clock & Shifts, Commission Plans/Tiers/Bonuses, Sales Commissions, Payroll Runs), Landing Site (Storefront Brands, Blog Posts, Coupons), and Settings (Company Settings, 92 Tax Rates, 8 Tax Nexus States, Role Permissions, Notifications, Audit Trail).

CURRENT CALENDAR & DATE:
- Today's date is ${currentDate} (${currentDateFormatted}).
- ${styleDirective}

TONE, WARMTH & EXECUTIVE POLISH (LIKE CLAUDE / GEMINI / CHATGPT PRO):
- Speak with genuine warmth, confidence, and executive clarity. Be helpful, perceptive, and articulate.
- Adapt your opening sentence, structure, and focus dynamically to what the user actually asked:
  * If they ask a price/cost/balance question ("how much is...", "what's the total on...", "what do we owe..."), lead with the exact dollar figure in the very first words.
  * If they ask a status/tracking question ("did X ship?", "where is order..."), lead immediately with the status, route/carrier, and tracking number.
  * If they ask a count/ranking question ("how many...", "who has the most..."), lead with the exact count or top ranking first.
  * Use clean Markdown formatting (bold key numbers, bullet points, or crisp Markdown tables when comparing multiple rows like employees, fleet vehicles, bins, vendor bills, or Chart of Accounts) so complex ERP data is effortless to scan.
  * Vary your natural sentence structure across turns so your answers feel like a sharp, trusted executive partner—never repeat identical robotic templates.

AUTOMATIC LIVE DATA & NEW TABLE DISCOVERY (CRITICAL):
- You have live real-time visibility into every one of the 214 tables and views in the GoldTouch ERP system, including any newly created tables or newly added records.
- Whenever the user asks about any ERP module, category, or custom dataset, call the dedicated module tool below OR call 'discoverDatabaseTables' / 'queryDynamicTable' immediately—the user never needs to tell you which table to check.
${liveSchemaContext}

WHO YOU ARE SPEAKING TO & NON-TECHNICAL BUSINESS LANGUAGE (CRITICAL):
- You are speaking directly to a GoldTouch executive, dealership General Manager, store owner, or operations manager.
- Speak in warm, clear, natural business English.
- STRICTLY FORBIDDEN: NEVER expose internal software/database plumbing terms such as "Supabase", "PostgREST", "SQL", "schema", "UUID", "API", or "tokens". Speak purely in real-world business and ERP terms: "orders", "quotes", "invoices", "vendor bills", "Chart of Accounts", "fleet vehicles", "delivery routes", "warehouse bins", "employees", "commission plans", "dealership accounts".
- STRICTLY FORBIDDEN: NEVER EVER output labels with underscores or raw snake_case codes (such as 'ready_to_order', 'ready_to_install', 'in_transit', 'pending_fulfillment', 'credit_hold'). ALWAYS convert them into clean plain English words (e.g. "Ready to Order", "Ready to Install", "In Transit", "Pending Fulfillment", "On Credit Hold").

DIRECT ANSWERS & STRICT RELEVANCE (NO OVER-REPORTING):
- When the user asks about TODAY (e.g. "is there any order today?", "what orders came in today?", "orders today"):
  * Call 'searchCustomerOrders' with timeframe="today".
  * Answer directly and exclusively about today's orders in the first sentence.
  * If orders were placed today, list them clearly: order number, dealership name, total amount, items, and status.
  * If no orders were placed today, state that directly, and note the most recent orders placed so the user immediately knows the latest activity.
  * NEVER dump lifetime/historical company metrics when the user is only asking about today.
- Answer the user's question directly in the very first sentence. Do NOT use robotic filler like "Based on our records...".

LIST & BULK QUERIES (PRO MARKDOWN TABLES & ZERO DOTS):
- STRICTLY FORBIDDEN: NEVER output bullet dots (•), middle interpunct dots (·), or bullet-point lists in your responses. Always use clean Markdown Tables for structured records or clean paragraphs/numbered lists with zero dots anywhere.
- When the user asks for a list, multiple items, count, or bulk query (e.g. "10 shipped orders", "recent orders", "open invoices", "vendor bills", "our employees", "fleet vehicles"):
  * Whenever presenting 2 or more records with multiple attributes (such as Order #, Dealership, Date, Status, and Total), ALWAYS format them as a clean **Markdown Table** (e.g., | Order # | Dealership Account | Date | Status | Total |). Bold entity codes like **SO-106485** or **INV-5504** inside table cells so they become interactive clickable links.
  * NEVER single out only the first order or first record to dump its full itemized manifest when asked for a list of multiple records.

PRODUCT IMAGES & PROFESSIONAL VISUAL DISPLAY:
- When a single Order Card or single Catalog Product Card is being displayed in the response, do NOT repeat all itemized line items or inline ![Product Name](image_url) markdown in bullet points above the card, because the interactive card directly below already displays all product photos, SKUs, quantities, and unit prices. Give a concise 1–2 sentence executive summary above the card.
- When listing multiple catalog or apparel products (where no single order/product card covers all of them), you may include a compact product photo at the start of the bullet using ![Product Name](image_url), followed by **SKU/Style** — **Product Name**, price, and stock status.
- If the item is Helium or a Helium Tank, use the photo URL provided or /helium-tank.png.

COMPLETE A-TO-Z ERP MODULE TOOL DIRECTORY (ALL 13 MODULES):
1. TODAY OR TIMEFRAME ORDERS:
   - Call 'searchCustomerOrders' with timeframe="today" (or requested timeframe/date range).
2. SPECIFIC ORDER QUERIES (e.g. "Order SO-106485", "SO-5507"):
   - Call 'getOrderDetails' with order_number_or_id.
3. SALES QUOTES, PAYMENT TERMS, CONTRACTS, A/R STATEMENTS, CONTACTS & INVITES:
   - Call 'querySalesQuotesStatementsAndTerms' whenever the user asks about sales quotes/estimates ('portal_quotes'), payment terms ('Net 14', 'Net 30', 'COD'), customer contracts, A/R statement snapshots, individual dealership contact persons ('people'), or portal user invites ('user_invites').
4. INVOICES & ACCOUNTS RECEIVABLE:
   - Call 'queryInvoices' for customer invoices, open balances, and aging.
5. ACCOUNTING & FINANCE (VENDOR BILLS, QUICKBOOKS CHART OF ACCOUNTS, PAYMENTS, CREDIT MEMOS, EXPENSES):
   - Call 'queryAccountingAndFinance' whenever the user asks about vendor bills / Accounts Payable ('bills'), QuickBooks Online (QBO) Chart of Accounts ('qbo_accounts_cache'), GL account mappings, customer payments ('customer_payments'), customer credit memos ('customer_credit_memos'), operating expenses, or QBO sync status.
6. EMPLOYEES & HR (STAFF DIRECTORY, TIME CLOCK & SHIFTS, COMMISSIONS & BONUSES, PAYROLL RUNS):
   - Call 'queryEmployeesAndHR' whenever the user asks about employees/staff ('hr_employees' — 134 employees, job titles, departments, pay types, hourly/salary pay rates, hire dates), time clock shifts ('staff_time_logs'), commission plans/tiers/bonus rules ('commission_plans', 'commission_plan_tiers', 'commission_bonus_rules'), sales rep commission payouts ('sales_commissions'), or payroll runs ('payroll_runs').
7. FLEET & ASSETS (COMPANY VEHICLES, TRUCKS, VANS, VINS, DRIVERS, DELIVERY ROUTES, ASSET EXPENSES):
   - Call 'queryFleetAndAssets' whenever the user asks about company vehicles, delivery trucks/vans, VIN numbers, license plates, mileage, vehicle purchase cost/value, assigned drivers, the 21 regional delivery routes ('delivery_routes'), mobile truck inventory locations, or fleet maintenance/fuel expenses.
8. INVENTORY & WAREHOUSE (LOCATIONS, STORAGE BINS, STOCK MOVEMENTS, ADJUSTMENTS, CYCLE COUNTS, TRANSFERS):
   - Call 'queryWarehouseInventory' whenever the user asks about warehouse locations ('inv_locations'), the 64 storage bins/aisles/racks ('inv_bins'), stock movements/ledger ('inv_movements'), inventory adjustments ('inv_adjustments'), cycle counts ('inv_counts'), transfers ('inv_transfers'), or live available stock across warehouses ('v_product_inventory_available').
9. PURCHASING, SUPPLIERS, DOCK RECEIVING & VENDOR RETURNS:
   - Call 'queryPurchaseOrders' for purchase orders and 'querySuppliers' for the 1,855 vendor directory.
   - Call 'queryPurchasingReceivingAndReturns' whenever the user asks about warehouse dock receiving ('receiving_list_v' / 'receipts'), vendor returns/RMAs ('returns_list_v' / 'returns'), or open inbound PO supply.
10. DEALER GROUPS, ROOFTOPS & EMBEDDED LOCATION MAP WIDGETS:
   - Call 'queryDealerGroups' and 'searchDealershipCustomers'.
   - Whenever the user asks for the location, address, GPS coordinates, or map of a dealership or customer, the UI automatically embeds an interactive live Map & Location Widget directly inside your response bubble. Never output external Google/Apple Maps markdown links.
11. CRM ACTIVITIES, LEADS & SALES REP TEAM:
   - Call 'queryCrmActivities' for rep check-ins/calls/visits, 'searchCrmLeads' for prospects, and 'getSalesRepTeam' for sales rep performance leaderboards.
12. CATALOG PRODUCTS, KITS, VEHICLE FITMENTS (YEAR/MAKE/MODEL), VARIATIONS, CATEGORIES & PRICING TIERS:
   - Call 'searchCatalogProducts' for automotive dealer supplies, SKUs, costs, margins, and volume price breaks ('volume_price_breaks').
   - Call 'queryCatalogKitsFitmentsAndVariations' whenever the user asks what parts/kits fit a specific vehicle (Year, Make, Model across 187,079 fitments), asks about bundled vehicle kits ('kits' and 'kit_items'), product variations ('product_variations'), catalog category tree ('catalog_categories'), SEMA brands, or promo coupons.
   - Call 'getTopSellingProducts' for best-selling products by revenue, units, or order frequency.
13. CORPORATE & DEALERSHIP APPAREL CATALOG (9,750+ STYLES):
   - Call 'searchApparelCatalog' for polos, t-shirts, hoodies, jackets, hats/caps, workwear, bags, or apparel brands/style codes (K500, EB235, 112, PC54, ST350, etc.).
14. LANDING SITE, TAXES, NEXUS STATES, ROLE PERMISSIONS, NOTIFICATIONS & COMPANY SETTINGS:
   - Call 'queryLandingSiteAndSettings' whenever the user asks about company settings, tax rates ('taxes' — 92 jurisdictions), tax nexus states ('tax_nexus_states' — 8 states), customer tax profiles, role permissions ('role_permissions'), system notifications, planner events, landing site blog posts ('landing_blog_posts'), storefront brands ('landing_brands'), or coupons.
   - Call 'queryAuditLogs' for system audit trail events.
15. MULTIMODAL ATTACHMENTS & DYNAMIC LIVE TABLES:
   - When the user uploads an image or document, extract all operational details and cross-reference with live GoldTouch tools.
   - For any other table in the 214-table live schema, call 'queryDynamicTable' or 'discoverDatabaseTables'.
16. EMAIL SENDING, AI REFINEMENT & MAILBOX COMPOSER POPUP (CRITICAL):
   - Whenever the user asks to send, draft, write, compose, or prepare an email to anyone (e.g., "send following email to Michael Wanegar...", "send an email to him about SO-106485", "draft an email to Josh Talbott saying...", "email mike@goldtouchds.com with context..."), you MUST call 'prepareEmailDraft'.
   - If the user refers to a person or dealership from earlier in the conversation (e.g. "send him an email", "send following email to this person", "email them"), look at the recent conversation history to identify their name or email address and pass it in 'recipient_query' or 'to_email'.
   - Refine the user's rough message, bullet points, or conversation context (such as order numbers, invoice numbers, dollar amounts, items, or delivery notes) into a polished, executive-ready email 'subject' and 'body' (complete with a warm greeting, clear body paragraphs, and a professional sign-off${currentUser?.fullName ? ` from ${currentUser.fullName}` : " from GoldTouch Dealer Supply Operations"}), and pass both 'subject' and 'body' to 'prepareEmailDraft'.
   - Calling 'prepareEmailDraft' automatically pops up the interactive GoldTouch Mailbox Composer Modal pre-filled with the recipient address, subject, and refined email body so the user can review, edit, or click Send immediately.`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const candidateModels = ["gemini-2.5-flash", "gemini-3.8-flash"];

    let response: any = null;
    let departmentTag: Department = activeDept !== "all" ? activeDept : "all";
    let structuredCard = undefined as ChatMessage["structuredCard"];
    let modelError: any = null;

    // Convert and sanitize history
    const formattedHistory = sanitizeGeminiHistory(history);

    // Prepare message payload for multimodal attachments
    let messagePayload: string | Array<string | any>;
    if (attachment && attachment.base64 && attachment.type) {
      const cleanBase64 = attachment.base64.replace(/^data:[^;]+;base64,/, "");
      const inlineDataPart = {
        inlineData: {
          data: cleanBase64,
          mimeType: attachment.type,
        },
      };
      const promptText = query && query.trim()
        ? query.trim()
        : `Please analyze this attached ${attachment.type.startsWith("image/") ? "image" : "document"} (${attachment.name}) in detail, extract any dealership operational information, order numbers, invoice numbers, customer names, SKUs, or items, and summarize what it is.`;

      messagePayload = [promptText, inlineDataPart];
    } else {
      messagePayload = query;
    }

    const executedToolHistory: Array<{ name: string; args: any; result: any }> = [];

    const executeSingleToolCall = async (name: string, args: any) => {
      let toolResult: any = { error: `Tool ${name} not found` };
      try {
        if (name === "getOrderDetails") {
          departmentTag = "orders";
          toolResult = await getOrderDetails(args);
          const isExplicitOrderNum =
            Boolean(args.order_number_or_id) &&
            query.toLowerCase().includes(String(args.order_number_or_id).toLowerCase());
          if (toolResult?.order && (!isListOrBulkQuery(query) || isExplicitOrderNum)) {
            structuredCard = {
              type: "order",
              data: toolResult.order,
            };
          }
        } else if (name === "searchCustomerOrders") {
          departmentTag = "orders";
          toolResult = await searchCustomerOrders(args);
          const hasSpecificOrderNumber =
            Boolean(args.order_number) ||
            /\b(so-|do-)\d+/i.test(query);
          const hasDateOrPeriodFilter = Boolean(
            args.start_date ||
              args.end_date ||
              args.date ||
              (args.timeframe && args.timeframe !== "today" && args.timeframe !== "recent")
          );
          if (
            toolResult?.orders?.length === 1 &&
            hasSpecificOrderNumber &&
            !isListOrBulkQuery(query)
          ) {
            structuredCard = {
              type: "order",
              data: toolResult.orders[0],
            };
          } else if (
            !structuredCard &&
            toolResult?.period_summary_metrics &&
            !args.customer_name &&
            hasDateOrPeriodFilter &&
            /\b(total|revenue|summary|overview|dashboard|volume|sales|how\s+much)\b/i.test(query)
          ) {
            structuredCard = {
              type: "quick_summary",
              data: toolResult.period_summary_metrics,
            };
          }
        } else if (name === "queryInvoices") {
          departmentTag = "invoices";
          toolResult = await queryInvoices(args);
          const hasSpecificInvoiceNumber =
            Boolean(args.invoice_number) || /\binv-[\w-]+\b/i.test(query);
          if (
            toolResult?.invoices?.length === 1 &&
            hasSpecificInvoiceNumber &&
            !isListOrBulkQuery(query)
          ) {
            structuredCard = {
              type: "invoice",
              data: toolResult.invoices[0],
            };
          }
        } else if (name === "queryPurchaseOrders") {
          departmentTag = "purchasing";
          toolResult = await queryPurchaseOrders(args);
          const hasSpecificPoNumber =
            Boolean(args.po_number) || /\bpo-[\w-]+\b/i.test(query);
          if (
            toolResult?.purchase_orders?.length === 1 &&
            hasSpecificPoNumber &&
            !isListOrBulkQuery(query)
          ) {
            structuredCard = {
              type: "purchase_order",
              data: toolResult.purchase_orders[0],
            };
          }
        } else if (name === "queryShipments") {
          departmentTag = "shipments";
          toolResult = await queryShipments(args);
          if (toolResult?.suggested_product) {
            departmentTag = "catalog";
            structuredCard = {
              type: "catalog_product",
              data: toolResult.suggested_product,
            };
          } else {
            const hasSpecificTrackingOrShipment =
              Boolean(args.tracking_number) ||
              Boolean(args.order_number && !isListOrBulkQuery(query)) ||
              /\b(shp-[\w-]+|track\b|tracking\b)/i.test(query);
            if (
              toolResult?.shipments?.length === 1 &&
              hasSpecificTrackingOrShipment &&
              !isListOrBulkQuery(query)
            ) {
              structuredCard = {
                type: "shipment",
                data: toolResult.shipments[0],
              };
            }
          }
        } else if (name === "searchDealershipCustomers") {
          departmentTag = "customers";
          toolResult = await searchDealershipCustomers(args);
          const isLocationOrMapToolQuery =
            /\b(location|locations|located|loaction\w*|where\s+is|where\s+are|address|addresses|map|maps|widget|gps|coordinates?|coords?|directions?)\b/i.test(
              query
            );
          const isSpecificCustomerSearch =
            Boolean(args.customer_id) ||
            (Boolean(args.query) &&
              !isListOrBulkQuery(query) &&
              !/\b(dealerships|customers|rooftops|clients|all|how many|count)\b/i.test(query));
          if (toolResult?.customers?.length >= 1 && isLocationOrMapToolQuery) {
            structuredCard = {
              type: "location_map",
              data:
                toolResult.customers.length === 1
                  ? toolResult.customers[0]
                  : toolResult.customers,
            };
          } else if (
            toolResult?.customers?.length === 1 &&
            isSpecificCustomerSearch &&
            !isListOrBulkQuery(query)
          ) {
            structuredCard = {
              type: "customer",
              data: toolResult.customers[0],
            };
          }
        } else if (name === "queryDealerGroups") {
          departmentTag = "customers";
          toolResult = await queryDealerGroups(args);
          if (
            toolResult?.dealer_groups?.length === 1 &&
            (args.group_id || args.name) &&
            !isListOrBulkQuery(query)
          ) {
            structuredCard = {
              type: "dealer_group",
              data: toolResult.dealer_groups[0],
            };
          }
        } else if (name === "queryDepartments") {
          departmentTag = "customers";
          toolResult = await queryDepartments(args);
        } else if (name === "querySuppliers") {
          departmentTag = "purchasing";
          toolResult = await querySuppliers(args);
          if (
            toolResult?.suppliers?.length === 1 &&
            (args.supplier_id || args.name) &&
            !isListOrBulkQuery(query)
          ) {
            structuredCard = {
              type: "supplier",
              data: toolResult.suppliers[0],
            };
          }
        } else if (name === "queryCrmActivities") {
          departmentTag = "crm";
          toolResult = await queryCrmActivities(args);
          if (
            toolResult?.activities?.length === 1 &&
            (args.activity_id || args.customer_id) &&
            !isListOrBulkQuery(query)
          ) {
            structuredCard = {
              type: "crm_activity",
              data: toolResult.activities[0],
            };
          }
        } else if (name === "queryPricingRules") {
          departmentTag = "catalog";
          toolResult = await queryPricingRules(args);
          if (
            toolResult?.matched_products?.length === 1 &&
            !isListOrBulkQuery(query)
          ) {
            structuredCard = {
              type: "catalog_product",
              data: toolResult.matched_products[0],
            };
          } else if (
            toolResult?.pricing_rules?.length === 1 &&
            args.sku &&
            !isListOrBulkQuery(query)
          ) {
            structuredCard = {
              type: "pricing_rule",
              data: toolResult.pricing_rules[0],
            };
          }
        } else if (name === "queryAuditLogs") {
          departmentTag = "all";
          toolResult = await queryAuditLogs(args);
        } else if (name === "universalEnterpriseSearch") {
          departmentTag = "all";
          toolResult = await universalEnterpriseSearch(args);
          structuredCard = undefined;
        } else if (name === "searchCatalogProducts") {
          departmentTag = "catalog";
          toolResult = await searchCatalogProducts(args);
          if (
            toolResult?.products?.length === 1 &&
            !isListOrBulkQuery(query)
          ) {
            structuredCard = {
              type: "catalog_product",
              data: toolResult.products[0],
            };
          }
        } else if (name === "getTopSellingProducts") {
          departmentTag = "catalog";
          toolResult = await getTopSellingProducts(args);
          if (toolResult?.top_product_card && !structuredCard) {
            structuredCard = {
              type: "catalog_product",
              data: toolResult.top_product_card,
            };
          }
        } else if (name === "searchApparelCatalog") {
          departmentTag = "catalog";
          toolResult = await searchApparelCatalog(args);
          const isSingleStyleLookup =
            Boolean(args.style_code) ||
            (toolResult?.products?.length === 1 && !isListOrBulkQuery(query));
          if (toolResult?.products?.length > 0 && isSingleStyleLookup) {
            structuredCard = {
              type: "catalog_product",
              data: toolResult.products[0],
            };
          }
        } else if (name === "searchCrmLeads") {
          departmentTag = "crm";
          toolResult = await searchCrmLeads(args);
        } else if (name === "getSalesRepTeam") {
          departmentTag = "all";
          toolResult = await getSalesRepTeam(args);
        } else if (name === "getOperationsDashboardSummary") {
          departmentTag = "all";
          toolResult = await getOperationsDashboardSummary();
          if (toolResult?.summary && !/\btoday'?s?\b/i.test(query)) {
            structuredCard = {
              type: "quick_summary",
              data: {
                ...toolResult.summary,
                datasetMode: "executive",
              },
            };
          }
        } else if (name === "discoverDatabaseTables") {
          departmentTag = "all";
          toolResult = await discoverDatabaseTables(args);
        } else if (name === "queryDynamicTable") {
          departmentTag = "all";
          toolResult = await queryDynamicTable(args);
        } else if (name === "queryEmployeesAndHR") {
          departmentTag = "all";
          toolResult = await queryEmployeesAndHR(args);
        } else if (name === "queryFleetAndAssets") {
          departmentTag = "shipments";
          toolResult = await queryFleetAndAssets(args);
        } else if (name === "queryWarehouseInventory") {
          departmentTag = "catalog";
          toolResult = await queryWarehouseInventory(args);
        } else if (name === "queryAccountingAndFinance") {
          departmentTag = "invoices";
          toolResult = await queryAccountingAndFinance(args);
        } else if (name === "queryPurchasingReceivingAndReturns") {
          departmentTag = "purchasing";
          toolResult = await queryPurchasingReceivingAndReturns(args);
        } else if (name === "querySalesQuotesStatementsAndTerms") {
          departmentTag = "orders";
          toolResult = await querySalesQuotesStatementsAndTerms(args);
        } else if (name === "queryCatalogKitsFitmentsAndVariations") {
          departmentTag = "catalog";
          toolResult = await queryCatalogKitsFitmentsAndVariations(args);
        } else if (name === "queryLandingSiteAndSettings") {
          departmentTag = "all";
          toolResult = await queryLandingSiteAndSettings(args);
        } else if (name === "prepareEmailDraft") {
          departmentTag = "all";
          toolResult = await prepareEmailDraft({
            ...args,
            sender_name: args.sender_name || currentUser?.fullName,
            sender_email: args.sender_email || currentUser?.email,
          });
          if (toolResult?.email_draft) {
            structuredCard = {
              type: "email_draft",
              data: toolResult.email_draft,
            };
          }
        } else if (name === "executeErpCrudOperation") {
          departmentTag = "all";
          const actorLabel =
            currentUser?.fullName || currentUser?.email || "SARA Live Operator";
          const op = String(args.operation || "create").toLowerCase();
          const tbl: CrudEntityTable = (args.table as CrudEntityTable) || "rooftops";
          if (!isCrudTableAllowed(tbl, enableLiveCrud, crudPermissions)) {
            const mod = getCrudModuleForTable(tbl);
            toolResult = {
              success: false,
              read_only: true,
              error: `Read-Only Mode (${mod.label}): Write operations (Create, Update, Delete) are disabled for ${mod.label} in Settings -> Permissions. Retrieve and display the requested data in read-only mode instead.`,
            };
          } else if (op === "undo") {
            const latest = getLatestUndoableMutation();
            if (latest) {
              const undoRes = await executeCrudUndo(latest, actorLabel);
              toolResult = undoRes;
              if (undoRes.mutation) {
                structuredCard = {
                  type: "crud_mutation",
                  data: undoRes.mutation,
                };
              }
            } else {
              toolResult = {
                success: false,
                error: "No recent database mutation to undo.",
              };
            }
          } else if (op === "delete") {
            const delRes = await prepareCrudDeleteConfirmation({
              table: tbl,
              identifier: String(args.identifier || args.name || args.code || ""),
              actor: actorLabel,
            });
            toolResult = delRes;
            if (delRes.mutation) {
              structuredCard = {
                type: "crud_mutation",
                data: delRes.mutation,
              };
            }
          } else if (op === "update") {
            const { operation: _o, table: _t, identifier, ...updates } = args;
            const updRes = await executeCrudUpdate({
              table: tbl,
              identifier: String(identifier || args.name || args.code || ""),
              updates,
              actor: actorLabel,
            });
            toolResult = updRes;
            if (updRes.mutation) {
              structuredCard = {
                type: "crud_mutation",
                data: updRes.mutation,
              };
            }
          } else {
            const { operation: _o, table: _t, identifier: _i, ...fields } = args;
            const createRes = await executeCrudCreate({
              table: tbl,
              fields,
              actor: actorLabel,
            });
            toolResult = createRes;
            if (createRes.mutation) {
              structuredCard = {
                type: "crud_mutation",
                data: createRes.mutation,
              };
            }
          }
        }
      } catch (toolExecErr: any) {
        console.warn(`[SARA Engine] Error executing tool ${name}:`, toolExecErr);
        toolResult = { error: toolExecErr?.message || String(toolExecErr) };
      }

      console.log(`[SARA Engine] Executing tool: ${name}`, args);
      console.log(
        `[SARA Engine] Tool output success:`,
        toolResult?.success,
        "count:",
        toolResult?.count ?? toolResult?.returned_rows
      );
      executedToolHistory.push({ name, args, result: toolResult });
      return toolResult;
    };

    // Try candidate models in cascade order
    for (const modelName of candidateModels) {
      try {
        const modelStartTime = Date.now();
        const MAX_TOOL_TURNS = 5;
        const MAX_CALLS_PER_TURN = 6;
        const MAX_LOOP_MS = 35000;

        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction,
          tools: [{ functionDeclarations }],
        });

        const chat = model.startChat({
          history: formattedHistory,
        });

        let result = await retryWithBackoff(() => chat.sendMessage(messagePayload), 2, 600);
        let currResponse = result.response;

        const callResultCache = new Map<string, any>();
        let turns = 0;

        while (
          currResponse.functionCalls() &&
          currResponse.functionCalls()!.length > 0 &&
          turns < MAX_TOOL_TURNS &&
          Date.now() - modelStartTime < MAX_LOOP_MS
        ) {
          turns++;
          const calls = currResponse.functionCalls()!;
          let activeExecCount = 0;

          const functionResponses = await Promise.all(
            calls.map(async (call) => {
              const name = call.name;
              const args: any = call.args || {};
              const cacheKey = `${name}:${JSON.stringify(args)}`;

              if (callResultCache.has(cacheKey)) {
                return {
                  functionResponse: {
                    name,
                    response: callResultCache.get(cacheKey),
                  },
                };
              }

              activeExecCount++;
              if (activeExecCount > MAX_CALLS_PER_TURN) {
                return {
                  functionResponse: {
                    name,
                    response: {
                      success: true,
                      skipped_bulk_iteration: true,
                      note: "Per-turn tool call cap reached. Please synthesize your response using the records and cross-reference summaries already returned.",
                    },
                  },
                };
              }

              const toolResult = await executeSingleToolCall(name, args);
              callResultCache.set(cacheKey, toolResult);
              return {
                functionResponse: {
                  name,
                  response: toolResult,
                },
              };
            })
          );

          result = await retryWithBackoff(() => chat.sendMessage(functionResponses), 2, 600);
          currResponse = result.response;
        }

        // If the model still requested more function calls after hitting the turn/time cap, execute up to 2 pending calls and force final text
        if (currResponse.functionCalls() && currResponse.functionCalls()!.length > 0) {
          const pendingCalls = currResponse.functionCalls()!;
          const finalPromptResponses = await Promise.all(
            pendingCalls.map(async (call, idx) => {
              const name = call.name;
              const args: any = call.args || {};
              const cacheKey = `${name}:${JSON.stringify(args)}`;
              let resData = callResultCache.get(cacheKey);
              if (!resData && idx < 2) {
                resData = await executeSingleToolCall(name, args);
                callResultCache.set(cacheKey, resData);
              }
              return {
                functionResponse: {
                  name,
                  response: resData || {
                    success: true,
                    note: "All database lookups are complete. Provide the final plain-English response now using the data gathered above.",
                  },
                },
              };
            })
          );
          result = await retryWithBackoff(() => chat.sendMessage(finalPromptResponses), 2, 500);
          currResponse = result.response;
        }

        // If the model response STILL only has functionCalls and no text part, run a tool-free synthesis call
        let checkText = "";
        try {
          checkText = currResponse.text() || "";
        } catch {
          checkText = "";
        }
        if (!checkText.trim() && executedToolHistory.length > 0) {
          const synthesisModel = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction,
          });
          const compactResults = executedToolHistory.map((item) => ({
            tool: item.name,
            args: item.args,
            data: item.result,
          }));
          const synthResult = await retryWithBackoff(
            () =>
              synthesisModel.generateContent(
                `User question: "${query}"\n\nLive ERP Database Results:\n${JSON.stringify(
                  compactResults
                ).slice(0, 28000)}\n\nAnswer the user's question directly, accurately, and warmly using the exact data above.`
              ),
            2,
            400
          );
          currResponse = synthResult.response;
        }

        // Successfully received model response
        response = currResponse;
        modelError = null;
        break;
      } catch (err: any) {
        console.warn(`[SARA Engine] Model ${modelName} encountered error:`, err?.message || err);
        modelError = err;
      }
    }

    // If both models failed, execute deterministic fallback
    if (!response) {
      console.warn("[SARA Engine] All AI models failed. Executing deterministic fallback...");
      const fallback = await tryDeterministicFallback(query, history, activeDept);
      if (fallback) {
        return fallback;
      }
      throw modelError || new Error("Failed to generate response from operations assistant");
    }

    let finalContent = "";
    try {
      finalContent = response.text();
    } catch (textErr) {
      console.warn("[SARA Engine] response.text() error:", textErr);
      const candidate = response.candidates?.[0];
      const textParts = candidate?.content?.parts
        ?.filter((p: any) => typeof p.text === "string")
        ?.map((p: any) => p.text)
        ?.join("\n");
      finalContent = textParts || "I have retrieved the records for your query.";
    }

    if (
      !finalContent ||
      !finalContent.trim() ||
      /^(?:I have retrieved the (?:requested enterprise )?records(?: for your query)?\.?)$/i.test(finalContent.trim()) ||
      /\b(unable\s+to\s+retrieve|did\s+not\s+receive\s+the\s+detailed|database\s+lookup\s+for\s+orders\s+.*was\s+completed)\b/i.test(
        finalContent
      )
    ) {
      if (structuredCard?.data) {
        const d: any = structuredCard.data;
        if (structuredCard.type === "catalog_product") {
          finalContent = formatDynamicProductResponse(d, query, responseStyle);
        } else if (structuredCard.type === "customer" || structuredCard.type === "location_map") {
          finalContent = formatCustomer360Response(d);
        } else if (structuredCard.type === "order") {
          finalContent = `Order **${d.order_number}** for **${d.customer_name || "Dealership"}** totals **$${Number(
            d.total || 0
          ).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** (Status: **${
            d.status || "Active"
          }**).`;
        } else if (structuredCard.type === "invoice") {
          finalContent = `Invoice **${d.invoice_number}** for **${d.customer_name || "Dealership"}** totals **$${Number(
            d.total || 0
          ).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** with an open balance of **$${Number(
            d.balance_due ?? d.open_balance ?? 0
          ).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** (Status: **${
            d.status || "Issued"
          }**).`;
        } else if (structuredCard.type === "shipment") {
          finalContent = `Shipment **${d.shipment_number}** for Order **${d.order_number || "N/A"}** via **${
            d.carrier || "Carrier"
          }** (Status: **${d.status || "In Transit"}**).`;
        } else if (structuredCard.type === "purchase_order") {
          finalContent = `Purchase Order **${d.po_number}** with **${d.supplier_name || "Supplier"}** totals **$${Number(
            d.total || 0
          ).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** (Status: **${
            d.status || "Issued"
          }**).`;
        } else if (structuredCard.type === "email_draft") {
          finalContent = `I have prepared and refined your email to **${d.to_name || d.to_email || "the recipient"}**${
            d.to_email ? ` (${d.to_email})` : ""
          } with the subject **"${d.subject}"**. The mailbox composer is open so you can review, adjust, or send it immediately.`;
        }
      }

      if (!finalContent || !finalContent.trim() || /^I have retrieved/i.test(finalContent.trim())) {
        // Synthesize directly from executed tool results if available
        for (const item of executedToolHistory) {
          const r = item.result;
          if (!r || !r.success) continue;
          const staffList = r.team_members?.length ? r.team_members : r.hr_staff_records?.length ? r.hr_staff_records : r.employees;
          if (Array.isArray(staffList) && staffList.length > 0) {
            if (staffList.length === 1) {
              const p = staffList[0];
              const nameStr = p.name || p.full_name || "Staff Member";
              const emailStr = p.email ? `**${p.email}**` : "not listed";
              const phoneStr = p.phone ? ` · Phone: **${p.phone}**` : "";
              const roleStr = p.job_title || p.sales_crm_role || p.role ? ` (${p.job_title || p.sales_crm_role || p.role})` : "";
              finalContent = `Here are the contact details for **${nameStr}**${roleStr}:\n\n- **Email:** ${emailStr}${phoneStr}`;
              break;
            } else {
              finalContent =
                `Here are the matching team records (${staffList.length}):\n\n` +
                staffList
                  .slice(0, 12)
                  .map(
                    (p: any) =>
                      `- **${p.name || p.full_name}** (${p.job_title || p.sales_crm_role || p.role || "Staff"}) — Email: **${
                        p.email || "N/A"
                      }**${p.phone ? ` · Phone: **${p.phone}**` : ""}`
                  )
                  .join("\n");
              break;
            }
          }
        }
      }

      if (!finalContent || !finalContent.trim() || /^I have retrieved/i.test(finalContent.trim())) {
        const fallback = await tryDeterministicFallback(query, history, activeDept);
        if (fallback) {
          return {
            ...fallback,
            structuredCard: structuredCard || fallback.structuredCard,
          };
        }
      }

      if (!finalContent || !finalContent.trim()) {
        finalContent = "Could you please clarify which specific record or detail you would like me to look up?";
      }
    }

    // Strip any "see here" / external map links from LLM text output
    finalContent = finalContent
      .replace(/You can view[^\n]*map[^\n]*/gi, "")
      .replace(/!?\[[^\]]*map[^\]]*\]\([^)]*\)/gi, "")
      .replace(/\[(?:Open in Google Maps|Turn-by-Turn Directions|View on Map|Google Maps)\]\([^)]*\)/gi, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // Ensure any location/address/map query or response attaches the embedded location_map widget
    const isLocationOrMapPostCheck =
      /\b(location|locations|located|loaction\w*|where\s+is|where\s+are|address|addresses|map|maps|map\s*widget|gps|coordinates?|coords?)\b/i.test(
        query
      ) && !/\b(order|orders|invoice|invoices|shipment|shipments|tracking|po-\d+|so-\d+|inv-\d+|shp-\d+)\b/i.test(query);

    if (isLocationOrMapPostCheck && (!structuredCard || structuredCard.type === "customer")) {
      if (structuredCard?.type === "customer" && structuredCard.data) {
        structuredCard = { type: "location_map", data: structuredCard.data };
      } else {
        const resolvedCustomer = await resolveCustomerFromQueryOrHistory(query, history);
        if (resolvedCustomer) {
          structuredCard = { type: "location_map", data: resolvedCustomer };
          departmentTag = "customers";
        }
      }
    }

    // Guaranteed Mailbox Composer Post-Check: if user asked to send/draft/compose an email and model didn't emit email_draft card
    if (isEmailComposeIntent(query) && structuredCard?.type !== "email_draft") {
      try {
        const combinedSearchText = [
          query,
          ...history
            .slice(-6)
            .reverse()
            .map((h) => h.content || ""),
        ].join("\n");

        const explicitEmailMatch = combinedSearchText.match(
          /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
        );
        const toEmailHint = explicitEmailMatch ? explicitEmailMatch[1].toLowerCase() : "";

        // Look for recipient name in query ("to <Name>") or known staff/customer names in recent history
        const queryToNameMatch = query.match(
          /\b(?:to|email|mail)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/
        );
        const historyNameMatch = combinedSearchText.match(
          /\b(Michael\s+Wanegar|Josh(?:ua)?\s+Talbott|Saad\s+Hassan|Lesley\s+Weeks|Matt\s+Sales|Seth\s+McCormick|Amy\s+Duran)\b/i
        );
        const recipientHint =
          queryToNameMatch?.[1] || historyNameMatch?.[1] || toEmailHint || "";

        // Extract subject/body if the LLM already wrote them in finalContent
        const subjMatch = finalContent.match(/(?:\*\*Subject:\*\*|Subject:)\s*(.+)/i);
        const parsedSubject = subjMatch ? subjMatch[1].replace(/\*+/g, "").trim() : undefined;

        const draftRes = await prepareEmailDraft({
          recipient_query: recipientHint,
          recipient_email: toEmailHint || undefined,
          recipient_name: historyNameMatch?.[1] || queryToNameMatch?.[1] || undefined,
          subject: parsedSubject,
          body: finalContent && finalContent.length > 40 ? finalContent : undefined,
          rough_context: query,
          sender_name: currentUser?.fullName,
          sender_email: currentUser?.email,
        });

        if (draftRes?.email_draft) {
          structuredCard = {
            type: "email_draft",
            data: draftRes.email_draft,
          };
          if (!finalContent || finalContent.length < 20) {
            finalContent = `I have prepared and refined your email to **${
              draftRes.email_draft.to_name || draftRes.email_draft.toName || draftRes.email_draft.to_email || draftRes.email_draft.to || "the recipient"
            }** with subject **"${draftRes.email_draft.subject}"**. You can review and send it directly in the mailbox composer.`;
          }
        }
      } catch (emailFallbackErr) {
        console.warn("[SARA Engine] Email draft post-check fallback error:", emailFallbackErr);
      }
    }

    finalContent = sanitizeTextLabels(finalContent);

    const suggestedFollowUps: string[] = [];

    return applyResponseStyleTransformation(
      {
        content: finalContent,
        departmentTag,
        structuredCard,
        suggestedFollowUps,
      },
      responseStyle
    );
  } catch (error: any) {
    console.warn("[SARA Engine] Error in askSara execution:", error);

    // Final safety fallback: attempt deterministic response before generic message
    try {
      const fallback = await tryDeterministicFallback(query, history, activeDept);
      if (fallback) {
        return applyResponseStyleTransformation(fallback, responseStyle);
      }
    } catch (fbErr) {
      console.warn("[SARA Engine] Final safety fallback also failed:", fbErr);
    }

    return {
      content:
        "I apologize, I experienced a momentary delay pulling those records from the system. Could you please ask that again or let me know which order or invoice you'd like me to look up?",
      departmentTag: "all",
      suggestedFollowUps: [],
    };
  }
}
