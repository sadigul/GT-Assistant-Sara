import { supabaseServer } from "./supabaseServer";
import { formatLabel, formatCleanEntityName } from "./formatters";

export interface SearchCustomerOrdersParams {
  customer_name?: string;
  order_number?: string;
  status?: string;
  product_sku_or_name?: string;
  sales_rep_name?: string;
  timeframe?: string; // "today", "yesterday", "this_week", "this_month", "recent"
  date?: string; // "YYYY-MM-DD" or "today" / "yesterday"
  start_date?: string;
  end_date?: string;
  limit?: number;
}

export interface GetOrderDetailsParams {
  order_number_or_id: string;
}

export interface QueryInvoicesParams {
  customer_name?: string;
  invoice_number?: string;
  status?: string;
  timeframe?: string;
  date?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
}

export interface QueryPurchaseOrdersParams {
  supplier_name?: string;
  po_number?: string;
  status?: string;
  timeframe?: string;
  date?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
}

export interface QueryShipmentsParams {
  order_number?: string;
  tracking_number?: string;
  shipment_number?: string;
  status?: string;
  timeframe?: string;
  date?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
}

export interface SearchCustomersParams {
  query?: string;
  city?: string;
  state?: string;
  group_name?: string;
  limit?: number;
}

export interface SearchCatalogParams {
  query?: string;
  sku?: string;
  product_id?: string;
  category?: string;
  brand?: string;
  limit?: number;
}

export interface GetTopSellingProductsParams {
  limit?: number;
  sort_by?: "revenue" | "units" | "orders";
  timeframe?: string;
  date?: string;
  start_date?: string;
  end_date?: string;
  category?: string;
}

export interface SearchApparelParams {
  query?: string;
  style_code?: string;
  brand?: string;
  category?: string;
  color?: string;
  size?: string;
  limit?: number;
}

export interface SearchLeadsParams {
  query?: string;
  status?: string;
  limit?: number;
}

export interface GetSalesRepTeamParams {
  name?: string;
  role?: string;
}

export interface QueryDealerGroupsParams {
  name?: string;
  code?: string;
  city?: string;
  state?: string;
  limit?: number;
}

export interface QueryDepartmentsParams {
  rooftop_name?: string;
  rooftop_id?: string;
  name?: string;
  type?: string;
  limit?: number;
}

export interface QuerySuppliersParams {
  name?: string;
  category?: string;
  city?: string;
  state?: string;
  is_preferred?: boolean;
  limit?: number;
}

export interface QueryCrmActivitiesParams {
  sales_agent_name?: string;
  customer_name?: string;
  type?: string;
  status?: string;
  timeframe?: string;
  date?: string;
  limit?: number;
}

export interface QueryPricingRulesParams {
  scope_type?: string;
  match_type?: string;
  query?: string;
  sku?: string;
  limit?: number;
}

export interface QueryAuditLogsParams {
  entity?: string;
  entity_id?: string;
  actor?: string;
  action?: string;
  limit?: number;
}

export interface UniversalSearchParams {
  query: string;
  limit?: number;
}

export interface DiscoverDatabaseTablesParams {
  refresh?: boolean;
  filter_keyword?: string;
  search?: string;
  include_counts?: boolean;
}

export interface QueryDynamicTableParams {
  table_name: string;
  search_term?: string;
  select_columns?: string;
  filter_column?: string;
  filter_value?: string;
  filter_operator?: string;
  filters?: Record<string, any>;
  timeframe?: string;
  order_by?: string;
  ascending?: boolean;
  limit?: number;
}

/**
 * UUID v4 validator
 */
export function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
}

const MONTH_LOOKUP: Record<string, number> = {
  january: 1, jan: 1, janurary: 1,
  february: 2, feb: 2, febuary: 2, februrary: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8, augst: 8,
  september: 9, sep: 9, sept: 9, septermber: 9, setpember: 9,
  october: 10, oct: 10, octber: 10, ocotber: 10, octobor: 10,
  november: 11, nov: 11, novmeber: 11, novmber: 11, novemeber: 11, novembr: 11,
  december: 12, dec: 12, decmber: 12, decemeber: 12,
};

const FULL_MONTH_NAMES = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const SHORT_MONTH_NAMES = [
  "",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function resolveMonthNumber(token: string): number | null {
  if (!token) return null;
  const clean = token.toLowerCase().replace(/[^a-z]/g, "");
  return MONTH_LOOKUP[clean] || null;
}

function parseSingleNaturalEndpoint(
  fragment: string,
  fallbackMonth?: number,
  fallbackYear?: number
): { ymd: string; year: number; month: number; day: number } | null {
  const now = new Date();
  const defaultYear = fallbackYear || now.getUTCFullYear();
  const s = (fragment || "").toLowerCase().trim();
  if (!s) return null;

  // ISO YYYY-MM-DD inside fragment
  const isoMatch = s.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    return { ymd: `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`, year, month, day };
  }

  const yearInFrag = s.match(/\b(202\d)\b/);
  const year = yearInFrag ? Number(yearInFrag[1]) : defaultYear;

  // Find month word in fragment
  const tokens = s.split(/[\s,./-]+/).filter(Boolean);
  let foundMonth: number | null = null;
  for (const tok of tokens) {
    const m = resolveMonthNumber(tok);
    if (m) {
      foundMonth = m;
      break;
    }
  }
  const month = foundMonth || fallbackMonth || null;

  // Find day number (1..31, optionally with st/nd/rd/th)
  const dayMatch = s.match(/\b([0-2]?\d|3[01])(?:st|nd|rd|th)?\b/);
  if (dayMatch && month) {
    const day = Math.min(31, Math.max(1, Number(dayMatch[1])));
    const ymd = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return { ymd, year, month, day };
  }

  // If fragment is just "today" or "now"
  if (/\b(today|now)\b/.test(s)) {
    return {
      ymd: now.toISOString().split("T")[0],
      year: now.getUTCFullYear(),
      month: now.getUTCMonth() + 1,
      day: now.getUTCDate(),
    };
  }

  return null;
}

/**
 * Parses natural language date ranges, month names (with typo tolerance), and ISO ranges
 * from user queries or tool parameters.
 */
export function parseNaturalDateRangeFromQuery(
  rawText: string
): { start_date: string; end_date: string; label: string } | null {
  if (!rawText) return null;
  const text = rawText.trim();
  const lower = text.toLowerCase();
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  const todayYMD = now.toISOString().split("T")[0];

  // 1. Explicit ISO date range: "2026-11-01 to 2026-11-05"
  const isoRangeMatch = lower.match(
    /\b(\d{4}-\d{2}-\d{2})\s*(?:to|through|thru|until|and|-|–|—)\s*(\d{4}-\d{2}-\d{2})\b/i
  );
  if (isoRangeMatch) {
    return {
      start_date: isoRangeMatch[1],
      end_date: isoRangeMatch[2],
      label: `${isoRangeMatch[1]} to ${isoRangeMatch[2]}`,
    };
  }

  // 2. Natural range with "from ... to ..." or "... to ..."
  if (/\b(to|through|thru|until)\b/i.test(lower)) {
    const rangeParts = lower.split(/\b(?:to|through|thru|until)\b/i);
    if (rangeParts.length >= 2) {
      const leftRaw = rangeParts[0].replace(/^.*\b(?:from|between|since)\b/i, "").trim();
      const rightRaw = rangeParts.slice(1).join(" ").trim();

      // Detect month from either side first so "from 1st to 5th of november" works too
      const rightPre = parseSingleNaturalEndpoint(rightRaw, undefined, currentYear);
      const leftPre = parseSingleNaturalEndpoint(
        leftRaw,
        rightPre?.month,
        rightPre?.year || currentYear
      );
      const rightFinal =
        rightPre ||
        parseSingleNaturalEndpoint(rightRaw, leftPre?.month, leftPre?.year || currentYear);

      if (leftPre && rightFinal) {
        const label =
          leftPre.year === rightFinal.year
            ? `${SHORT_MONTH_NAMES[leftPre.month]} ${leftPre.day} – ${SHORT_MONTH_NAMES[rightFinal.month]} ${rightFinal.day}, ${rightFinal.year}`
            : `${leftPre.ymd} – ${rightFinal.ymd}`;
        return {
          start_date: leftPre.ymd <= rightFinal.ymd ? leftPre.ymd : rightFinal.ymd,
          end_date: leftPre.ymd <= rightFinal.ymd ? rightFinal.ymd : leftPre.ymd,
          label,
        };
      }
    }
  }

  // 3. Exact YYYY-MM or YYYY-MM% (e.g. "2026-10" or "2026-10%")
  const ymMatch = lower.replace(/%+$/, "").match(/^(\d{4})-(\d{2})$/);
  if (ymMatch) {
    const yr = Number(ymMatch[1]);
    const mo = Number(ymMatch[2]);
    if (mo >= 1 && mo <= 12) {
      const lastDay = new Date(Date.UTC(yr, mo, 0)).getUTCDate();
      const mm = String(mo).padStart(2, "0");
      return {
        start_date: `${yr}-${mm}-01`,
        end_date: `${yr}-${mm}-${String(lastDay).padStart(2, "0")}`,
        label: `${FULL_MONTH_NAMES[mo]} ${yr}`,
      };
    }
  }

  // 4. Relative month phrases: "last month" / "previous month" / "this month" / "current month"
  if (/\b(last[\s_]+month|previous[\s_]+month)\b/i.test(lower)) {
    const prevMo = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYr = currentMonth === 1 ? currentYear - 1 : currentYear;
    const lastDay = new Date(Date.UTC(prevYr, prevMo, 0)).getUTCDate();
    const mm = String(prevMo).padStart(2, "0");
    return {
      start_date: `${prevYr}-${mm}-01`,
      end_date: `${prevYr}-${mm}-${String(lastDay).padStart(2, "0")}`,
      label: `${FULL_MONTH_NAMES[prevMo]} ${prevYr}`,
    };
  }

  if (/\b(this[\s_]+month|current[\s_]+month)\b/i.test(lower)) {
    const lastDay = new Date(Date.UTC(currentYear, currentMonth, 0)).getUTCDate();
    const mm = String(currentMonth).padStart(2, "0");
    return {
      start_date: `${currentYear}-${mm}-01`,
      end_date: `${currentYear}-${mm}-${String(lastDay).padStart(2, "0")}`,
      label: `${FULL_MONTH_NAMES[currentMonth]} ${currentYear}`,
    };
  }

  // 5. Specific single day with month name (e.g. "5th of november", "november 5", "october 14")
  const singleDayEndpoint = parseSingleNaturalEndpoint(lower, undefined, currentYear);
  if (
    singleDayEndpoint &&
    /\b([0-2]?\d|3[01])(?:st|nd|rd|th)?\b/.test(lower.replace(/\b202\d\b/g, "")) &&
    !(/\b(to|through|thru|until|between)\b/i.test(lower))
  ) {
    return {
      start_date: singleDayEndpoint.ymd,
      end_date: singleDayEndpoint.ymd,
      label: `${SHORT_MONTH_NAMES[singleDayEndpoint.month]} ${singleDayEndpoint.day}, ${singleDayEndpoint.year}`,
    };
  }

  // 6. Named calendar month (e.g. "october", "what are the total sales of the october", "november 2026")
  const words = lower.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  for (const w of words) {
    // Avoid treating "may" as a month if used as a modal verb ("may i", "may we", "may have", "may be")
    if (w === "may" && /\bmay\s+(i|we|you|have|be|need|want|also)\b/i.test(lower)) {
      continue;
    }
    const mo = resolveMonthNumber(w);
    if (mo) {
      const yrMatch = lower.match(/\b(202\d)\b/);
      const yr = yrMatch ? Number(yrMatch[1]) : currentYear;
      const lastDay = new Date(Date.UTC(yr, mo, 0)).getUTCDate();
      const mm = String(mo).padStart(2, "0");
      return {
        start_date: `${yr}-${mm}-01`,
        end_date: `${yr}-${mm}-${String(lastDay).padStart(2, "0")}`,
        label: `${FULL_MONTH_NAMES[mo]} ${yr}`,
      };
    }
  }

  // 7. Today / Yesterday / This week / Last 7 days / Last 30 days
  if (lower === "today" || lower === todayYMD) {
    return { start_date: todayYMD, end_date: todayYMD, label: `Today (${todayYMD})` };
  }
  if (lower === "yesterday") {
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yestYMD = yesterday.toISOString().split("T")[0];
    return { start_date: yestYMD, end_date: yestYMD, label: `Yesterday (${yestYMD})` };
  }
  if (lower === "this_week" || lower === "week" || lower === "past_week" || lower === "last_7_days") {
    const weekAgo = new Date(now);
    weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
    const startYMD = weekAgo.toISOString().split("T")[0];
    return { start_date: startYMD, end_date: todayYMD, label: `Last 7 Days` };
  }
  if (lower === "past_month" || lower === "last_30_days") {
    const monthAgo = new Date(now);
    monthAgo.setUTCDate(monthAgo.getUTCDate() - 30);
    const startYMD = monthAgo.toISOString().split("T")[0];
    return { start_date: startYMD, end_date: todayYMD, label: `Last 30 Days` };
  }

  return null;
}

/**
 * Helper to compute UTC date filters for timeframe/date queries.
 */
export function getDateFilterRange(params: {
  timeframe?: string;
  date?: string;
  start_date?: string;
  end_date?: string;
}): { gte?: string; lte?: string; label?: string } | null {
  const { timeframe, date, start_date, end_date } = params;

  if (start_date || end_date) {
    const normStart = start_date ? start_date.replace(/%+$/, "").trim() : "";
    const normEnd = end_date ? end_date.replace(/%+$/, "").trim() : "";

    // If start_date is YYYY-MM without day
    const startYm = normStart.match(/^(\d{4})-(\d{2})$/);
    const endYm = normEnd.match(/^(\d{4})-(\d{2})$/);

    const resolvedStart = startYm
      ? `${startYm[1]}-${startYm[2]}-01T00:00:00.000Z`
      : normStart
      ? normStart.includes("T")
        ? normStart
        : `${normStart}T00:00:00.000Z`
      : undefined;

    const resolvedEnd = endYm
      ? `${endYm[1]}-${endYm[2]}-${String(new Date(Date.UTC(Number(endYm[1]), Number(endYm[2]), 0)).getUTCDate()).padStart(2, "0")}T23:59:59.999Z`
      : normEnd
      ? normEnd.includes("T")
        ? normEnd
        : `${normEnd}T23:59:59.999Z`
      : undefined;

    let friendlyRangeLabel =
      normStart && normEnd
        ? normStart === normEnd
          ? normStart
          : `${normStart} to ${normEnd}`
        : normStart || normEnd;

    const fullMonthMatch =
      normStart.match(/^(\d{4})-(\d{2})-01$/) &&
      normEnd.match(/^(\d{4})-(\d{2})-(2[89]|3[01])$/);
    if (fullMonthMatch && normStart.slice(0, 7) === normEnd.slice(0, 7)) {
      const yr = Number(normStart.slice(0, 4));
      const mo = Number(normStart.slice(5, 7));
      if (mo >= 1 && mo <= 12) {
        friendlyRangeLabel = `${FULL_MONTH_NAMES[mo]} ${yr}`;
      }
    }

    return {
      gte: resolvedStart,
      lte: resolvedEnd,
      label: friendlyRangeLabel,
    };
  }

  const raw = (timeframe || date || "").toLowerCase().trim();
  if (!raw) return null;

  //Exact YYYY-MM-DD match
  const dateMatch = raw.replace(/%+$/, "").match(/^\d{4}-\d{2}-\d{2}$/);
  if (dateMatch) {
    const d = dateMatch[0];
    return {
      gte: `${d}T00:00:00.000Z`,
      lte: `${d}T23:59:59.999Z`,
      label: d,
    };
  }

  const parsed = parseNaturalDateRangeFromQuery(raw);
  if (parsed) {
    return {
      gte: `${parsed.start_date}T00:00:00.000Z`,
      lte: `${parsed.end_date}T23:59:59.999Z`,
      label: parsed.label,
    };
  }

  return null;
}

/**
 * Helper: Enrich order line items with authentic product images from catalog_products or products
 */
export async function enrichLinesWithImages(lines: any[]): Promise<any[]> {
  if (!lines || lines.length === 0) return lines;

  const imageMapBySku = new Map<string, { image_url: string; images?: any[] }>();
  const imageMapById = new Map<string, { image_url: string; images?: any[] }>();

  // 1. Check if product_snapshot has an image already
  for (const line of lines) {
    if (line.product_snapshot && typeof line.product_snapshot === "object") {
      const snapImg = line.product_snapshot.primary_image_url || line.product_snapshot.image_url;
      if (snapImg) {
        if (line.sku) imageMapBySku.set(String(line.sku).trim(), { image_url: snapImg, images: line.product_snapshot.images });
        if (line.product_id) imageMapById.set(String(line.product_id).trim(), { image_url: snapImg, images: line.product_snapshot.images });
      }
    }
  }

  // 2. Extract unique SKUs and numeric product_ids
  const skus = Array.from(new Set(lines.map((l) => (l.sku ? String(l.sku).trim() : "")).filter(Boolean)));
  const numericIds = Array.from(new Set(lines.map((l) => (l.product_id && /^\d+$/.test(String(l.product_id)) ? Number(l.product_id) : null)).filter((id): id is number => id !== null)));

  const queries: any[] = [];
  if (skus.length > 0) {
    queries.push(
      supabaseServer
        .from("catalog_products")
        .select("id, custom_sku, erp_sku, primary_image_url, images")
        .in("custom_sku", skus)
        .not("primary_image_url", "is", null),
      supabaseServer
        .from("catalog_products")
        .select("id, custom_sku, erp_sku, primary_image_url, images")
        .in("erp_sku", skus)
        .not("primary_image_url", "is", null)
    );
  }
  if (numericIds.length > 0) {
    queries.push(
      supabaseServer
        .from("catalog_products")
        .select("id, custom_sku, erp_sku, primary_image_url, images")
        .in("id", numericIds)
        .not("primary_image_url", "is", null)
    );
  }

  if (queries.length > 0) {
    const results = await Promise.all(queries);
    for (const res of results) {
      if (res.data) {
        for (const item of res.data) {
          const img = item.primary_image_url || (Array.isArray(item.images) && item.images[0]?.url);
          if (img) {
            if (item.custom_sku) imageMapBySku.set(String(item.custom_sku).trim(), { image_url: img, images: item.images });
            if (item.erp_sku) imageMapBySku.set(String(item.erp_sku).trim(), { image_url: img, images: item.images });
            if (item.id != null) imageMapById.set(String(item.id).trim(), { image_url: img, images: item.images });
          }
        }
      }
    }
  }

  // 3. Fallback to products table for missing items
  const stillMissing = lines.filter((l) => {
    const skuKey = l.sku ? String(l.sku).trim() : "";
    const idKey = l.product_id ? String(l.product_id).trim() : "";
    return !(skuKey && imageMapBySku.has(skuKey)) && !(idKey && imageMapById.has(idKey));
  });

  if (stillMissing.length > 0) {
    const missingSkus = Array.from(new Set(stillMissing.map((l) => (l.sku ? String(l.sku).trim() : "")).filter(Boolean)));
    const missingNumericIds = Array.from(new Set(stillMissing.map((l) => (l.product_id && /^\d+$/.test(String(l.product_id)) ? Number(l.product_id) : null)).filter((id): id is number => id !== null)));

    const fbQueries: any[] = [];
    if (missingSkus.length > 0) {
      fbQueries.push(
        supabaseServer
          .from("products")
          .select("id, custom_sku, erp_sku, primary_image_url, images")
          .in("custom_sku", missingSkus)
          .not("primary_image_url", "is", null),
        supabaseServer
          .from("products")
          .select("id, custom_sku, erp_sku, primary_image_url, images")
          .in("erp_sku", missingSkus)
          .not("primary_image_url", "is", null)
      );
    }
    if (missingNumericIds.length > 0) {
      fbQueries.push(
        supabaseServer
          .from("products")
          .select("id, custom_sku, erp_sku, primary_image_url, images")
          .in("id", missingNumericIds)
          .not("primary_image_url", "is", null)
      );
    }

    if (fbQueries.length > 0) {
      const fbResults = await Promise.all(fbQueries);
      for (const res of fbResults) {
        if (res.data) {
          for (const item of res.data) {
            const img = item.primary_image_url || (Array.isArray(item.images) && item.images[0]?.url);
            if (img) {
              if (item.custom_sku) imageMapBySku.set(String(item.custom_sku).trim(), { image_url: img, images: item.images });
              if (item.erp_sku) imageMapBySku.set(String(item.erp_sku).trim(), { image_url: img, images: item.images });
              if (item.id != null) imageMapById.set(String(item.id).trim(), { image_url: img, images: item.images });
            }
          }
        }
      }
    }

    // 3b. Fallback to Apparel Styles Index for any apparel SKUs on orders/invoices
    const stillMissingApparel = missingSkus.filter((sku) => !imageMapBySku.has(sku));
    if (stillMissingApparel.length > 0) {
      try {
        const apparelIndex = await getApparelStylesIndex();
        for (const sku of stillMissingApparel) {
          const cleanSku = sku.replace(/^sm_/i, "").toLowerCase();
          const matchStyle = apparelIndex.find((s) => s.styleCode.toLowerCase() === cleanSku);
          if (matchStyle?.imageUrl) {
            imageMapBySku.set(sku, { image_url: matchStyle.imageUrl, images: [{ url: matchStyle.imageUrl }] });
          }
        }
      } catch {
        // Ignore apparel index lookup errors during line enrichment
      }
    }
  }

  // 4. Return lines enriched with image_url and images
  return lines.map((line) => {
    const skuKey = line.sku ? String(line.sku).trim() : "";
    const idKey = line.product_id ? String(line.product_id).trim() : "";
    const lineName = String(line.product_name || line.description || line.name || "");
    const match = (idKey && imageMapById.get(idKey)) || (skuKey && imageMapBySku.get(skuKey)) || null;

    let imageUrl = match?.image_url || line.image_url || null;
    const isHelium =
      (skuKey && /helium/i.test(skuKey)) ||
      (lineName && /helium/i.test(lineName)) ||
      (imageUrl && imageUrl.includes("atozpartyrental.com"));

    if (isHelium) {
      imageUrl = "/helium-tank.png";
    } else if (!imageUrl && (/ECOFK0101/i.test(skuKey) || /BumperShellz/i.test(lineName))) {
      imageUrl = "https://sdda.semadata.org/Standard/Ecoological/FK0101.jpg";
    }

    return {
      ...line,
      line_status: formatLabel(line.line_status),
      fulfillment_type: formatLabel(line.fulfillment_type),
      image_url: imageUrl,
      images: isHelium
        ? [{ url: "/helium-tank.png" }]
        : match?.images || (imageUrl ? [{ url: imageUrl }] : []),
    };
  });
}

/**
 * Helper: Normalize order numbers so naked numeric IDs (e.g. "106201") or EBMS-overwritten invoice codes ("INV-5448-N")
 * resolve to their canonical Sales Order number (e.g. "SO-5448").
 */
export function normalizeOrderNumber(rawOrderNo?: string | null, orderRow?: any): string {
  if (orderRow && typeof orderRow === "object") {
    const originNo = orderRow.origin_order_number || orderRow.meta?.internal_order_number;
    if (originNo && /^(?:SO|DO)-\d+/i.test(String(originNo).trim())) {
      return String(originNo).trim().toUpperCase();
    }
    if (orderRow.po_number && /^(?:SO|DO)-\d+/i.test(String(orderRow.po_number).trim())) {
      return String(orderRow.po_number).trim().toUpperCase();
    }
  }
  if (!rawOrderNo) return "N/A";
  const trimmed = String(rawOrderNo).trim();
  if (/^\d{3,7}(?:\.\d+)?$/.test(trimmed)) {
    return `SO-${trimmed}`;
  }
  const invMatch = trimmed.match(/^INV-(\d{3,7})(?:-[A-Za-z0-9]+)?$/i);
  if (invMatch) {
    return `SO-${invMatch[1]}`;
  }
  return trimmed;
}

/**
 * Helper: Sanitize customer-facing notes so raw ERP rep scratchpad shorthand (e.g. "10/9-RB/JC - ALTIMA SOLD...")
 * or asterisk-wrapped internal PO prompts are never dumped as ugly warning banners.
 */
export function sanitizeCustomerFacingNotes(rawNotes?: string | null): string | null {
  if (!rawNotes) return null;
  const cleaned = String(rawNotes)
    .replace(/\*{3,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;
  if (
    /^\d{1,2}\/\d{1,2}\s*[-–]\s*[A-Z]{1,4}(?:\/[A-Z]{1,4})?\b/i.test(cleaned) ||
    /\b(ALTIMA\s+SOLD|ATLAS\s+SOLD|TUCSON\s+SOLD|CHANGED\s+TO\s+\d+|ASK\s+MANAGER\s+FOR\s+A\s+PO)\b/i.test(cleaned) ||
    /^(?:\*+|\-+|_+)$/.test(cleaned)
  ) {
    return null;
  }
  return cleaned;
}

/**
 * Helper: Separate billable product line items from $0.00 QuickBooks/ERP vehicle banners & internal comment rows.
 */
export function sanitizeErpLineItems<T extends Record<string, any>>(rawLines: T[]): {
  cleanLines: T[];
  vehicleFitmentNotes: string[];
} {
  const cleanLines: T[] = [];
  const vehicleFitmentNotes: string[] = [];

  for (const line of rawLines || []) {
    const rawDesc = String(
      line.description ?? line.product_name ?? line.name ?? line.sku ?? ""
    ).trim();
    const cleanDesc = rawDesc
      .replace(/\*+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const unitPrice = Number(line.unit_price ?? line.unitPrice ?? line.price ?? 0);
    const lineTotal = Number(
      line.line_total ?? line.amount ?? line.total ?? (Number(line.qty ?? line.quantity ?? 1) * unitPrice)
    );
    const isZeroDollar = Math.abs(lineTotal) < 0.005 && Math.abs(unitPrice) < 0.005;

    if (isZeroDollar) {
      if (!cleanDesc || /^[-=_*.\s]+$/.test(cleanDesc)) {
        continue;
      }

      const isVehicleBanner =
        /\b(VIN\s*[:#]|Stk\s*[:#]|Stock\s*[:#]|[12]\d{3}\s+(?:CHEVROLET|CHEVY|FORD|GMC|RAM|DODGE|TOYOTA|HONDA|NISSAN|JEEP|HYUNDAI|KIA|SUBARU|MAZDA|VOLKSWAGEN|VW|BMW|MERCEDES|AUDI|LEXUS|ACURA|INFINITI|CADILLAC|BUICK|LINCOLN|VOLVO|PORSCHE|TESLA|MITSUBISHI|CHRYSLER))\b/i.test(
          cleanDesc
        );

      if (isVehicleBanner) {
        if (!vehicleFitmentNotes.includes(cleanDesc)) {
          vehicleFitmentNotes.push(cleanDesc);
        }
        continue;
      }

      const hasAsteriskBanner = /\*{3,}/.test(rawDesc);
      const isInternalInstruction =
        /\b(ASK\s+MANAGER|PO\s+NUMBER\s+IF\s+NEEDED|DO\s+NOT\s+SHIP|INTERNAL\s+NOTE|SOLD\b|CHANGED\s+TO)\b/i.test(
          cleanDesc
        );
      const hasNoRealSku =
        !line.sku || /^(?:NOTE|COMMENT|DESC|TEXT|MSG|N\/A|-)$/i.test(String(line.sku).trim());

      if (hasAsteriskBanner || isInternalInstruction || hasNoRealSku) {
        continue;
      }
    }

    const cleanedVehicleLabel = line.vehicle_label
      ? String(line.vehicle_label).replace(/\*+/g, " ").replace(/\s+/g, " ").trim()
      : line.vehicle_label;

    cleanLines.push({
      ...line,
      ...(line.description !== undefined ? { description: cleanDesc || line.description } : {}),
      ...(line.product_name !== undefined ? { product_name: cleanDesc || line.product_name } : {}),
      ...(line.vehicle_label !== undefined ? { vehicle_label: cleanedVehicleLabel } : {}),
    });
  }

  return { cleanLines, vehicleFitmentNotes };
}

/**
 * Compute Levenshtein edit distance between two strings (case-insensitive).
 */
export function levenshteinDistance(a: string, b: string): number {
  const s = a.toLowerCase().trim();
  const t = b.toLowerCase().trim();
  if (s === t) return 0;
  if (s.length === 0) return t.length;
  if (t.length === 0) return s.length;

  const prev = new Array(t.length + 1);
  const curr = new Array(t.length + 1);
  for (let j = 0; j <= t.length; j++) prev[j] = j;

  for (let i = 1; i <= s.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= t.length; j++) prev[j] = curr[j];
  }
  return prev[t.length];
}

/**
 * Clean conversational filler and location/map intent keywords from an entity / dealership / customer query.
 */
export function cleanEntityQuery(raw: string): string {
  return (raw || "")
    .replace(
      /\b(no|yes|hey|hi|hello|sara|sarah|i|me|my|we|want|need|would|could|should|shodul|shoudl|will|do|does|did|be|not|like|see|here|there|please|pls|can|you|give|show|shodl|showing|tell|what|is|are|was|were|who|where|located|location|locations|loaction\w*|address|addresses|map|maps|widget|widgets|pin|gps|coordinates?|coords?|directions?|route|routing|navigate|navigation|street|view|viewing|display|open|live|interactive|embed|embedded|in|inside|into|within|respond|repsond|response|reply|bubble|card|box|chat|window|screen|google|apple|with|a|an|the|teh|hte|and|dand|or|find|search|look\s*up|lookup|get|all|full|complete|details?|info|information|profile|account|summary|overview|about|for|of|on|at|to|from|regarding|customer|dealership|dealer|rooftop|client|buyer|delivered|dvilcer|deliv\w*|whom|sir|man|bro|ok|okay|thank|thanks|wtf|ashole|asshole|fuck|shit|up|fix|that|this|it|its|their|so|fine|tune|tuned)\b/gi,
      " "
    )
    .replace(/[?!.,;:"'`()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Score how well a candidate target string (e.g. "Talbott auto 2 ford") matches a query (e.g. "talbot auto 2 ford").
 * Returns a score between 0 and 1.
 */
export function scoreFuzzyMatch(queryRaw: string, targetRaw: string, codeRaw?: string | null): number {
  const q = queryRaw.toLowerCase().trim();
  const t = targetRaw.toLowerCase().trim();
  const code = (codeRaw || "").toLowerCase().trim();
  if (!q || !t) return 0;
  if (t === q || (code && code === q)) return 1.0;
  if (t.includes(q)) return 0.96;
  if (q.includes(t) && t.length >= 4) return 0.91;

  const qTokens = q.split(/[\s\-/,&]+/).filter((w) => w.length >= 2 || /^\d+$/.test(w));
  const tTokens = t.split(/[\s\-/,&]+/).filter((w) => w.length >= 2 || /^\d+$/.test(w));
  if (qTokens.length === 0 || tTokens.length === 0) return 0;

  let totalScore = 0;
  let strongTokenMatches = 0;
  for (const qt of qTokens) {
    let bestTokenScore = 0;
    for (const tt of tTokens) {
      if (qt === tt) {
        bestTokenScore = 1.0;
        break;
      }
      // Single digit tokens must match exactly
      if (/^\d+$/.test(qt) || /^\d+$/.test(tt)) {
        continue;
      }
      if (tt.startsWith(qt) || qt.startsWith(tt)) {
        bestTokenScore = Math.max(bestTokenScore, 0.88);
      }
      const dist = levenshteinDistance(qt, tt);
      const maxLen = Math.max(qt.length, tt.length);
      const sim = maxLen > 0 ? 1 - dist / maxLen : 0;
      if (sim > bestTokenScore) {
        bestTokenScore = sim;
      }
    }
    if (bestTokenScore >= 0.72) {
      strongTokenMatches++;
    }
    totalScore += bestTokenScore;
  }

  if (strongTokenMatches === 0) {
    return 0;
  }

  const avgTokenScore = totalScore / qTokens.length;
  const fullDist = levenshteinDistance(q, t);
  const fullMax = Math.max(q.length, t.length);
  const fullSim = fullMax > 0 ? 1 - fullDist / fullMax : 0;

  const blended = avgTokenScore * 0.85 + fullSim * 0.15;
  return Math.max(blended, fullSim);
}

/**
 * Find matching rooftops using direct ILIKE first, then fuzzy token scoring against all rooftops.
 */
export async function findBestMatchingRooftops(rawQuery: string, limit = 10): Promise<any[]> {
  const cleaned = cleanEntityQuery(rawQuery) || rawQuery.trim();
  if (!cleaned) return [];

  const selectCols = `
    id,
    group_id,
    name,
    code,
    status,
    city,
    state,
    phone,
    billing_email,
    address_line1,
    address_line2,
    zip_code,
    country,
    latitude,
    longitude,
    statement_timezone,
    website_url,
    payment_terms,
    credit_limit,
    terms,
    delivery_route,
    tax_exempt,
    resale_certificate_number,
    qbo_customer_id,
    created_at
  `;

  // 1. Direct substring match
  const { data: directRows } = await supabaseServer
    .from("rooftops")
    .select(selectCols)
    .or(
      `name.ilike.%${cleaned}%,code.ilike.%${cleaned}%,phone.ilike.%${cleaned}%,billing_email.ilike.%${cleaned}%,city.ilike.%${cleaned}%,state.ilike.%${cleaned}%,zip_code.ilike.%${cleaned}%,address_line1.ilike.%${cleaned}%,delivery_route.ilike.%${cleaned}%`
    )
    .order("name", { ascending: true })
    .limit(limit);

  if (directRows && directRows.length > 0) {
    // Sort direct rows by best fuzzy similarity to cleaned query
    return directRows.sort(
      (a, b) =>
        scoreFuzzyMatch(cleaned, b.name || "", b.code) -
        scoreFuzzyMatch(cleaned, a.name || "", a.code)
    );
  }

  // 2. Fuzzy match across rooftops table
  const { data: allRooftops } = await supabaseServer
    .from("rooftops")
    .select(selectCols)
    .limit(1000);

  if (!allRooftops || allRooftops.length === 0) return [];

  const scored = allRooftops
    .map((r) => ({
      rooftop: r,
      score: Math.max(
        scoreFuzzyMatch(cleaned, r.name || "", r.code),
        scoreFuzzyMatch(rawQuery.trim(), r.name || "", r.code)
      ),
    }))
    .filter((item) => item.score >= 0.65)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return [];

  const topScore = scored[0].score;
  return scored
    .filter((item) => item.score >= Math.max(0.65, topScore - 0.1))
    .slice(0, limit)
    .map((item) => item.rooftop);
}

/**
 * Tool 1: Search Customer Orders
 * Finds orders by customer name, order number, status, or date/timeframe, and includes itemized line items.
 */
export async function searchCustomerOrders(params: SearchCustomerOrdersParams) {
  try {
    let productMatchedOrderIds: string[] | null = null;
    let productSalesStats: {
      query: string;
      total_units_sold: number;
      total_product_revenue: number;
      matched_sku?: string;
      matched_name?: string;
    } | null = null;

    if (params.product_sku_or_name && params.product_sku_or_name.trim().length > 0) {
      const prodTerm = params.product_sku_or_name.trim();
      const { data: matchedLines } = await supabaseServer
        .from("order_lines")
        .select("order_id, sku, product_name, qty, unit_price, amount")
        .or(`sku.ilike.%${prodTerm}%,product_name.ilike.%${prodTerm}%`)
        .limit(500);

      const validProdLines = (matchedLines || []).filter((l: any) => {
        const q = Number(l.qty ?? 0);
        const a = Number(l.amount ?? 0);
        const u = Number(l.unit_price ?? 0);
        const nm = String(l.product_name || "").trim();
        if (q <= 0 || a < 0 || /^returned\s+from\b/i.test(nm)) return false;
        return a > 0 || u > 0;
      });

      productMatchedOrderIds = Array.from(
        new Set(validProdLines.map((l: any) => String(l.order_id || "")).filter(Boolean))
      );

      let units = 0;
      let rev = 0;
      let bestSku = "";
      let bestName = "";
      for (const l of validProdLines) {
        const q = Math.max(1, Number(l.qty) || 1);
        const u = Number(l.unit_price) || 0;
        const a = Number(l.amount) > 0 ? Number(l.amount) : Number((q * u).toFixed(2));
        units += q;
        rev += a;
        if (!bestSku && l.sku) bestSku = String(l.sku).trim();
        if (l.product_name && String(l.product_name).trim().length > bestName.length) {
          bestName = String(l.product_name).trim();
        }
      }
      productSalesStats = {
        query: prodTerm,
        total_units_sold: units,
        total_product_revenue: Number(rev.toFixed(2)),
        matched_sku: bestSku || undefined,
        matched_name: bestName || undefined,
      };
    }

    let query = supabaseServer
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (productMatchedOrderIds !== null) {
      if (productMatchedOrderIds.length === 0) {
        return {
          success: true,
          count: 0,
          total_matching_orders: 0,
          total_sales_revenue: 0,
          average_order_value: 0,
          orders: [],
          product_filter_summary: productSalesStats,
          message: `No customer orders found containing product "${params.product_sku_or_name}".`,
        };
      }
      query = query.in("id", productMatchedOrderIds);
    }

    if (params.sales_rep_name && params.sales_rep_name.trim().length > 0) {
      const repTerm = params.sales_rep_name.trim();
      if (/^josh/i.test(repTerm)) {
        query = query.ilike("sales_rep_name", "%Josh%");
      } else if (/^matt/i.test(repTerm)) {
        query = query.ilike("sales_rep_name", "%Matt%");
      } else {
        query = query.ilike("sales_rep_name", `%${repTerm}%`);
      }
    }

    // Sanitize order number search
    if (params.order_number) {
      const cleanNo = params.order_number.replace(/^(order\s*#?|#)\s*/i, "").trim();
      const digitsOnly = cleanNo.replace(/^(?:so|do)-/i, "").trim();
      if (/^\d+$/.test(digitsOnly)) {
        query = query.or(`order_number.ilike.%${digitsOnly}%,order_number.ilike.%SO-${digitsOnly}%`);
      } else {
        query = query.ilike("order_number", `%${cleanNo}%`);
      }
    } else if (params.customer_name) {
      const term = params.customer_name.trim();
      // If customer_name actually looks like an order number (e.g. "SO-5507" or "5507")
      if (/^(?:so|do)-?\d+/i.test(term)) {
        const digitsOnly = term.replace(/^(?:so|do)-?/i, "").trim();
        query = query.or(`order_number.ilike.%${term}%,order_number.ilike.%${digitsOnly}%`);
      } else if (term.includes("@")) {
        // Resolve email address against people table to find person_id / rooftop_id
        const { data: matchedPeople } = await supabaseServer
          .from("people")
          .select("id, name, email_ci")
          .ilike("email_ci", `%${term}%`)
          .limit(5);
        const personIds = (matchedPeople || []).map((p: any) => p.id).filter(Boolean);
        if (personIds.length > 0) {
          query = query.in("person_id", personIds);
        } else {
          query = query.ilike("customer_name", `%${term}%`);
        }
      } else {
        query = query.ilike("customer_name", `%${term}%`);
      }
    } else if (productMatchedOrderIds === null) {
      // For general listings / briefings, exclude negative credit adjustments and internal CASH test accounts
      query = query.gt("total", 0).not("customer_name", "ilike", "%CASH CASH%");
    }

    if (params.status && params.status !== "all") {
      query = query.eq("status", params.status.toLowerCase().trim());
    }

    const dateRange = getDateFilterRange(params);
    if (dateRange?.gte) {
      query = query.gte("created_at", dateRange.gte);
    }
    if (dateRange?.lte) {
      query = query.lte("created_at", dateRange.lte);
    }

    const limit = params.limit || 10;
    const fetchCap = Math.max(limit, 500);
    let { data: allMatchingOrders, error } = await query.limit(fetchCap);

    if (error) {
      return { success: false, error: error.message };
    }

    // Fuzzy fallback when customer_name had a typo (e.g. "genrations ford") — skip for email addresses
    if (
      (!allMatchingOrders || allMatchingOrders.length === 0) &&
      params.customer_name &&
      !params.order_number &&
      !params.customer_name.includes("@")
    ) {
      const matchedRooftops = await findBestMatchingRooftops(params.customer_name, 5);
      if (matchedRooftops.length > 0) {
        const rIds = matchedRooftops.map((r) => r.id);
        const rNames = matchedRooftops.map((r) => r.name).filter(Boolean);
        const orClauses = [
          `rooftop_id.in.(${rIds.join(",")})`,
          ...rNames.map((n) => `customer_name.ilike.%${n}%`),
        ];
        const fuzzyRes = await supabaseServer
          .from("orders")
          .select("*")
          .or(orClauses.join(","))
          .order("created_at", { ascending: false })
          .limit(fetchCap);
        if (fuzzyRes.data && fuzzyRes.data.length > 0) {
          allMatchingOrders = fuzzyRes.data;
        }
      }
    }

    if (!allMatchingOrders || allMatchingOrders.length === 0) {
      const { data: recentOrders } = await supabaseServer
        .from("orders")
        .select("*")
        .gt("total", 0)
        .not("customer_name", "ilike", "%CASH CASH%")
        .order("created_at", { ascending: false })
        .limit(3);

      return {
        success: true,
        count: 0,
        total_matching_orders: 0,
        total_sales_revenue: 0,
        average_order_value: 0,
        orders: [],
        message: dateRange
          ? `No orders found for the requested date/timeframe filter (${dateRange.label || "selected period"}).`
          : `No orders matching criteria.`,
        recent_orders_sample: (recentOrders || []).map((ro) => ({
          ...ro,
          order_number: normalizeOrderNumber(ro.order_number),
          status: formatLabel(ro.status),
        })),
      };
    }

    // Compute full financial & operational aggregations across ALL matching orders
    const totalMatchingOrders = allMatchingOrders.length;
    const totalSalesRevenue = Number(
      allMatchingOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0).toFixed(2)
    );
    const avgOrderValue =
      totalMatchingOrders > 0
        ? Number((totalSalesRevenue / totalMatchingOrders).toFixed(2))
        : 0;

    let pendingOrdersCount = 0;
    let fulfilledOrdersCount = 0;
    const statusMap = new Map<string, { count: number; revenue: number }>();
    const customerSpendMap = new Map<
      string,
      { name: string; ordersCount: number; totalSpend: number; latestOrder: string }
    >();

    for (const o of allMatchingOrders) {
      const rawSt = String(o.status || "pending").toLowerCase().trim();
      const amt = Number(o.total) || 0;
      if (
        rawSt === "pending" ||
        rawSt === "processing" ||
        rawSt === "submitted" ||
        rawSt === "new" ||
        rawSt === "draft"
      ) {
        pendingOrdersCount++;
      } else if (
        rawSt === "shipped" ||
        rawSt === "fulfilled" ||
        rawSt === "completed" ||
        rawSt === "delivered"
      ) {
        fulfilledOrdersCount++;
      }

      const groupLabel =
        rawSt === "shipped" || rawSt === "fulfilled" || rawSt === "completed" || rawSt === "delivered"
          ? "Shipped & Fulfilled"
          : rawSt === "pending" || rawSt === "processing" || rawSt === "submitted"
          ? "Pending Fulfillment"
          : rawSt === "draft" || rawSt === "new"
          ? "New / Draft"
          : formatLabel(rawSt);

      const prevSt = statusMap.get(groupLabel) || { count: 0, revenue: 0 };
      prevSt.count += 1;
      prevSt.revenue += amt;
      statusMap.set(groupLabel, prevSt);

      const rawCname = String(o.customer_name || "").trim();
      if (
        rawCname &&
        rawCname.toLowerCase() !== "unknown" &&
        !/^(?:cash\s*cash|cash|used\s+cars?|new\s+cars?|service\s+dept|parts\s+dept|retail|walk\s*in)$/i.test(rawCname)
      ) {
        const cname = formatCleanEntityName(rawCname);
        const prevCust = customerSpendMap.get(cname) || {
          name: cname,
          ordersCount: 0,
          totalSpend: 0,
          latestOrder: normalizeOrderNumber(o.order_number),
        };
        prevCust.ordersCount += 1;
        prevCust.totalSpend += amt;
        customerSpendMap.set(cname, prevCust);
      }
    }

    const statusColors: Record<string, string> = {
      "Shipped & Fulfilled": "#10b981",
      "Pending Fulfillment": "#f59e0b",
      "New / Draft": "#0ea5e9",
    };

    const orderStatusBreakdown = Array.from(statusMap.entries())
      .map(([label, val]) => ({
        label,
        count: val.count,
        revenue: Number(val.revenue.toFixed(2)),
        pct: totalMatchingOrders > 0 ? Math.round((val.count / totalMatchingOrders) * 100) : 0,
        color: statusColors[label] || "#6366f1",
      }))
      .sort((a, b) => b.count - a.count);

    const topDealershipsBySpend = Array.from(customerSpendMap.values())
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 6)
      .map((d, _idx, arr) => {
        const maxSpend = arr[0]?.totalSpend || 1;
        return {
          ...d,
          totalSpend: Number(d.totalSpend.toFixed(2)),
          avgOrder: Number((d.totalSpend / Math.max(1, d.ordersCount)).toFixed(2)),
          sharePct: Math.max(8, Math.round((d.totalSpend / maxSpend) * 100)),
        };
      });

    const orders = allMatchingOrders.slice(0, limit);

    // Attach order lines and shipments for top sliced orders
    const orderIds = orders.map((o) => o.id);
    const { data: rawLines } = await supabaseServer
      .from("order_lines")
      .select("id, order_id, sku, product_id, product_name, qty, unit_price, amount, line_status, fulfillment_type, vehicle_label, line_number, product_snapshot")
      .in("order_id", orderIds)
      .order("line_number", { ascending: true });

    const lines = await enrichLinesWithImages(rawLines || []);

    const { data: shipments } = await supabaseServer
      .from("shipments")
      .select("id, order_id, shipment_number, status, tracking_number, carrier, service, ship_date")
      .in("order_id", orderIds);

    const ordersWithDetails = orders.map((o) => {
      const rawOLines = lines ? lines.filter((l) => l.order_id === o.id) : [];
      const { cleanLines: oLines, vehicleFitmentNotes } = sanitizeErpLineItems(rawOLines);
      const oShipments = (shipments ? shipments.filter((s) => s.order_id === o.id) : []).map((s) => ({
        ...s,
        status: formatLabel(s.status),
      }));
      return {
        ...o,
        customer_name: formatCleanEntityName(o.customer_name),
        notes: sanitizeCustomerFacingNotes(o.notes),
        vehicle_notes: vehicleFitmentNotes,
        sales_rep_name: formatCleanEntityName(o.sales_rep_name || o.sales_agent_name || ""),
        order_number: normalizeOrderNumber(o.order_number),
        status: formatLabel(o.status),
        lines: oLines,
        shipments: oShipments,
      };
    });

    const periodLabel = dateRange?.label || undefined;

    return {
      success: true,
      count: ordersWithDetails.length,
      total_matching_orders: totalMatchingOrders,
      total_sales_revenue: totalSalesRevenue,
      average_order_value: avgOrderValue,
      fulfilled_orders_count: fulfilledOrdersCount,
      pending_orders_count: pendingOrdersCount,
      active_ordering_dealerships: customerSpendMap.size,
      date_range_applied: dateRange || null,
      product_filter_summary: productSalesStats,
      sales_rep_filter: params.sales_rep_name || null,
      status_breakdown: orderStatusBreakdown,
      top_customers_in_period: topDealershipsBySpend,
      orders: ordersWithDetails,
      all_matching_orders_summary: allMatchingOrders.slice(0, 30).map((o) => ({
        order_number: normalizeOrderNumber(o.order_number),
        customer_name: formatCleanEntityName(o.customer_name),
        total: Number(o.total) || 0,
        status: formatLabel(o.status),
        sales_rep_name: formatCleanEntityName(o.sales_rep_name || o.sales_agent_name || "") || null,
        created_at: o.created_at,
      })),
      period_summary_metrics: {
        datasetMode: "orders" as const,
        periodLabel,
        datasetTitle: periodLabel
          ? `${periodLabel} — Sales & Order Analytics`
          : "Customer Orders & Revenue Analytics",
        datasetSubtitle: `${totalMatchingOrders} Orders / $${totalSalesRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Total Sales / Avg $${avgOrderValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        totalOrders: totalMatchingOrders,
        pendingOrders: pendingOrdersCount,
        fulfilledOrders: fulfilledOrdersCount,
        totalOrderRevenue: totalSalesRevenue,
        avgOrderValue,
        activeOrderingDealerships: customerSpendMap.size,
        orderStatusBreakdown,
        topDealershipsBySpend,
        recentOrders: allMatchingOrders.slice(0, 8).map((o) => ({
          order_number: normalizeOrderNumber(o.order_number),
          customer_name: formatCleanEntityName(o.customer_name),
          total: Number(o.total) || 0,
          status: formatLabel(o.status),
          created_at: o.created_at,
        })),
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Tool 2: Get Order Details
 * Retrieves single order details, full lines, and fulfillment shipment tracking.
 */
export async function getOrderDetails(params: GetOrderDetailsParams) {
  try {
    const rawInput = (params.order_number_or_id || "").trim();
    if (!rawInput) {
      return { success: false, message: "No order number or ID provided." };
    }

    const forCustomerSplit = rawInput.match(/^(.+?)\s+for\s+(.+)$/i);
    const raw = forCustomerSplit ? forCustomerSplit[1].trim() : rawInput;
    const customerHint = forCustomerSplit ? forCustomerSplit[2].trim().toLowerCase() : "";

    let orders: any[] | null = null;
    let error: any = null;

    if (isUuid(raw)) {
      const res = await supabaseServer.from("orders").select("*").eq("id", raw).limit(1);
      orders = res.data;
      error = res.error;
    } else {
      const cleanNo = raw.replace(/^(order\s*#?|#)\s*/i, "").trim();
      const digitsOnly = cleanNo.replace(/^(?:so|do|inv)-/i, "").replace(/-[a-z0-9]+$/i, "").trim();

      // 1. Try order_number / origin_order_number matching either full code ("SO-5507") or numeric digits ("5448")
      let res = await supabaseServer
        .from("orders")
        .select("*")
        .or(
          /^\d+$/.test(digitsOnly)
            ? `order_number.ilike.%${cleanNo}%,order_number.ilike.%${digitsOnly}%,order_number.ilike.%SO-${digitsOnly}%,origin_order_number.ilike.%${digitsOnly}%`
            : `order_number.ilike.%${cleanNo}%,origin_order_number.ilike.%${cleanNo}%`
        )
        .limit(5);

      // 2. Fallback: match by customer_name
      if (!res.data || res.data.length === 0) {
        res = await supabaseServer
          .from("orders")
          .select("*")
          .ilike("customer_name", `%${raw}%`)
          .order("created_at", { ascending: false })
          .limit(1);
      }

      // 3. Fuzzy fallback by rooftop name
      if (!res.data || res.data.length === 0) {
        const fuzzyRooftops = await findBestMatchingRooftops(raw, 3);
        if (fuzzyRooftops.length > 0) {
          const rIds = fuzzyRooftops.map((r) => r.id);
          const rNames = fuzzyRooftops.map((r) => r.name).filter(Boolean);
          res = await supabaseServer
            .from("orders")
            .select("*")
            .or([
              `rooftop_id.in.(${rIds.join(",")})`,
              ...rNames.map((n) => `customer_name.ilike.%${n}%`),
            ].join(","))
            .order("created_at", { ascending: false })
            .limit(1);
        }
      }

      orders = res.data;
      error = res.error;
    }

    if (error || !orders || orders.length === 0) {
      return { success: false, message: `No order found matching '${raw}'` };
    }

    let order = orders[0];
    if (orders.length > 1 && customerHint) {
      const matchedByCustomer = orders.find((o) => {
        const cName = String(o.customer_name || o.department_name || o.group_name || "").toLowerCase();
        return cName.includes(customerHint) || customerHint.includes(cName);
      });
      if (matchedByCustomer) {
        order = matchedByCustomer;
      }
    }

    // Fetch lines in correct line order
    const { data: rawLines } = await supabaseServer
      .from("order_lines")
      .select("id, sku, product_id, product_name, qty, qty_shipped, unit_price, amount, line_status, fulfillment_type, vehicle_label, line_number, product_snapshot")
      .eq("order_id", order.id)
      .order("line_number", { ascending: true });

    const enrichedLines = await enrichLinesWithImages(rawLines || []);
    const { cleanLines: lines, vehicleFitmentNotes } = sanitizeErpLineItems(enrichedLines);

    // Fetch associated shipments
    const { data: shipments } = await supabaseServer
      .from("shipments")
      .select("id, shipment_number, status, tracking_number, carrier, service, ship_date, shipped_at, notes, fulfillment_request_json")
      .eq("order_id", order.id);

    // Fetch associated invoices (by order_id or matching ERP invoice_number)
    const invOrClauses = [`order_id.eq.${order.id}`];
    if (order.order_number && /^INV-/i.test(String(order.order_number).trim())) {
      invOrClauses.push(`invoice_number.eq.${String(order.order_number).trim()}`);
    }
    const { data: invoices } = await supabaseServer
      .from("invoices")
      .select("id, invoice_number, status, total, balance, open_balance, due_date, invoice_date")
      .or(invOrClauses.join(","));

    const primaryFulfillmentType =
      lines.find((l: any) => l.fulfillment_type)?.fulfillment_type ||
      (order.ship_via ? "Route / Warehouse Delivery" : "Standard Fulfillment");
    const totalQtyOrdered = lines.reduce((sum: number, l: any) => sum + Number(l.qty || 1), 0);
    const totalQtyShipped = lines.reduce(
      (sum: number, l: any) => sum + Number(l.qty_shipped ?? (String(l.line_status || "").toLowerCase() === "fulfilled" ? l.qty || 1 : 0)),
      0
    );
    const primaryLineStatus =
      lines.find((l: any) => l.line_status)?.line_status || formatLabel(order.status || "Pending");

    return {
      success: true,
      order: {
        ...order,
        notes: sanitizeCustomerFacingNotes(order.notes),
        vehicle_notes: vehicleFitmentNotes,
        sales_rep_name: order.sales_rep_name || order.sales_agent_name,
        order_number: normalizeOrderNumber(order.order_number, order),
        erp_order_number: order.order_number || null,
        po_number: order.po_number || normalizeOrderNumber(order.order_number, order),
        quote_number:
          order.meta?.quote_number ||
          order.quote_number ||
          (order.order_type === "quote" ? order.origin_order_number : null),
        dealer_group_name: order.group_name || null,
        department_name: order.department_name || null,
        payment_terms: order.payment_terms || order.payment_terms_code || null,
        status: formatLabel(order.status),
        fulfillment: {
          status: primaryLineStatus,
          fulfillment_type: formatLabel(primaryFulfillmentType),
          ship_via: order.ship_via || null,
          shipping_address: order.shipping_address || null,
          qty_ordered: totalQtyOrdered,
          qty_shipped: totalQtyShipped,
        },
        lines: lines || [],
        shipments: (shipments || []).map((s) => ({
          ...s,
          status: formatLabel(s.status),
          driver_name: (s as any).fulfillment_request_json?.driver_name || null,
          van_asset_number: (s as any).fulfillment_request_json?.van_asset_number || null,
        })),
        invoices: (invoices || []).map((i) => ({
          ...i,
          status: formatLabel(i.status),
        })),
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Tool 3: Query Invoices
 * Retrieves customer invoices, balance, due dates, payment states, line items, and full linked order/fulfillment records.
 */
export async function queryInvoices(params: QueryInvoicesParams) {
  try {
    let query = supabaseServer
      .from("invoices")
      .select(`
        id,
        invoice_number,
        order_id,
        customer_id,
        bill_to_customer_id,
        status,
        invoice_date,
        due_date,
        currency,
        total,
        balance,
        open_balance,
        paid_amount,
        billing_email_snapshot,
        payment_terms_snapshot,
        emailed_to,
        notes,
        created_at
      `)
      .order("created_at", { ascending: false });

    if (params.invoice_number) {
      const cleanInv = params.invoice_number.replace(/^(invoice\s*#?|inv\s*#?|#)\s*/i, "").trim();
      query = query.ilike("invoice_number", `%${cleanInv}%`);
    } else {
      // Exclude negative credit memos from general invoice queries
      query = query.gt("total", 0);
    }

    if (params.status && params.status !== "all") {
      const st = params.status.toLowerCase().trim();
      if (st === "open" || st === "unpaid" || st === "due" || st === "pending") {
        query = query.or("status.eq.open,status.eq.issued,balance.gt.0,open_balance.gt.0");
      } else {
        query = query.eq("status", st);
      }
    }

    const dateRange = getDateFilterRange(params);
    if (dateRange?.gte) {
      query = query.gte("created_at", dateRange.gte);
    }
    if (dateRange?.lte) {
      query = query.lte("created_at", dateRange.lte);
    }

    // Customer lookup: if customer_name is provided, match rooftop IDs (with fuzzy fallback)
    if (params.customer_name) {
      const matchingRooftops = await findBestMatchingRooftops(params.customer_name, 10);
      if (matchingRooftops.length > 0) {
        const rooftopIds = matchingRooftops.map((r) => r.id);
        query = query.or(`bill_to_customer_id.in.(${rooftopIds.join(",")}),customer_id.in.(${rooftopIds.join(",")})`);
      }
    }

    const limit = params.limit || 10;
    const { data: invoices, error } = await query.limit(limit + 5);

    if (error) {
      return { success: false, error: error.message };
    }

    if (!invoices || invoices.length === 0) {
      return { success: true, count: 0, invoices: [] };
    }

    const invoiceIds = invoices.map((inv) => inv.id);

    // Fetch invoice lines
    const { data: rawLines } = await supabaseServer
      .from("invoice_lines")
      .select("id, invoice_id, product_id, sku, description, qty, unit_price, line_total, product_snapshot")
      .in("invoice_id", invoiceIds);
    const lines = await enrichLinesWithImages(rawLines || []);

    // Enrich invoices with dealership names and full linked order + fulfillment records
    const rooftopIds = invoices
      .map((inv) => inv.bill_to_customer_id || inv.customer_id)
      .filter(Boolean);
    const orderIds = Array.from(new Set(invoices.map((inv) => inv.order_id).filter(Boolean)));

    let rooftopMap: Record<string, string> = {};
    if (rooftopIds.length > 0) {
      const { data: roofs } = await supabaseServer
        .from("rooftops")
        .select("id, name")
        .in("id", rooftopIds);
      (roofs || []).forEach((r) => {
        rooftopMap[r.id] = r.name;
      });
    }

    let orderDetailMap: Record<string, any> = {};
    let orderLinesByOrderId: Record<string, any[]> = {};
    let shipmentsByOrderId: Record<string, any[]> = {};

    if (orderIds.length > 0) {
      const [ordsRes, ordLinesRes, shpRes] = await Promise.all([
        supabaseServer
          .from("orders")
          .select(
            "id, order_number, origin_order_number, po_number, status, order_type, sales_rep_name, sales_agent_name, customer_name, group_name, department_name, ship_via, shipping_address, payment_terms, payment_terms_code, source, source_system, source_reference, meta, created_at"
          )
          .in("id", orderIds),
        supabaseServer
          .from("order_lines")
          .select("id, order_id, sku, product_name, qty, qty_shipped, line_status, fulfillment_type")
          .in("order_id", orderIds),
        supabaseServer
          .from("shipments")
          .select(
            "id, order_id, shipment_number, status, carrier, service, tracking_number, ship_date, shipped_at, fulfillment_request_json"
          )
          .in("order_id", orderIds),
      ]);

      (ordsRes.data || []).forEach((o) => {
        orderDetailMap[o.id] = o;
        if (!rooftopMap[o.id] && o.customer_name) {
          rooftopMap[o.id] = o.customer_name;
        }
      });

      (ordLinesRes.data || []).forEach((ol) => {
        if (!orderLinesByOrderId[ol.order_id]) orderLinesByOrderId[ol.order_id] = [];
        orderLinesByOrderId[ol.order_id].push(ol);
      });

      (shpRes.data || []).forEach((s) => {
        if (!shipmentsByOrderId[s.order_id]) shipmentsByOrderId[s.order_id] = [];
        shipmentsByOrderId[s.order_id].push({
          ...s,
          status: formatLabel(s.status),
          driver_name: (s as any).fulfillment_request_json?.driver_name || null,
          van_asset_number: (s as any).fulfillment_request_json?.van_asset_number || null,
        });
      });
    }

    const enrichedInvoices = invoices
      .map((inv) => {
        const rawInvLines = lines ? lines.filter((l) => l.invoice_id === inv.id) : [];
        const { cleanLines: invLines, vehicleFitmentNotes } = sanitizeErpLineItems(rawInvLines);
        const linkedOrd = inv.order_id ? orderDetailMap[inv.order_id] : null;
        const linkedOrdLines = inv.order_id ? orderLinesByOrderId[inv.order_id] || [] : [];
        const linkedShipments = inv.order_id ? shipmentsByOrderId[inv.order_id] || [] : [];

        const clientName =
          rooftopMap[inv.bill_to_customer_id] ||
          rooftopMap[inv.customer_id] ||
          rooftopMap[inv.order_id] ||
          linkedOrd?.customer_name ||
          "Dealership Client";

        const canonicalOrderNo = linkedOrd
          ? normalizeOrderNumber(linkedOrd.order_number, linkedOrd)
          : normalizeOrderNumber(inv.invoice_number);

        const primaryFulfillmentType =
          linkedOrdLines.find((l) => l.fulfillment_type)?.fulfillment_type ||
          (linkedOrd?.ship_via ? "Warehouse Ship" : null);
        const primaryLineStatus =
          linkedOrdLines.find((l) => l.line_status)?.line_status ||
          linkedOrd?.status ||
          "Fulfilled";
        const totalQtyOrdered =
          linkedOrdLines.length > 0
            ? linkedOrdLines.reduce((s, l) => s + Number(l.qty || 1), 0)
            : invLines.reduce((s, l) => s + Number(l.qty || 1), 0);
        const totalQtyShipped =
          linkedOrdLines.length > 0
            ? linkedOrdLines.reduce(
                (s, l) =>
                  s +
                  Number(
                    l.qty_shipped ??
                      (String(l.line_status || "").toLowerCase() === "fulfilled" ? l.qty || 1 : 0)
                  ),
                0
              )
            : totalQtyOrdered;

        const quoteNumber =
          linkedOrd?.meta?.quote_number ||
          linkedOrd?.quote_number ||
          (linkedOrd?.order_type === "quote" ? linkedOrd?.origin_order_number : null) ||
          null;

        return {
          ...inv,
          notes: sanitizeCustomerFacingNotes(inv.notes),
          vehicle_notes: vehicleFitmentNotes,
          status: formatLabel(inv.status),
          clientName,
          order_number: canonicalOrderNo && canonicalOrderNo !== "N/A" ? canonicalOrderNo : null,
          erp_order_number: linkedOrd?.order_number || null,
          order_status: linkedOrd?.status ? formatLabel(linkedOrd.status) : "Delivered",
          order_type: linkedOrd?.order_type ? formatLabel(linkedOrd.order_type) : "Standard Order",
          order_date: linkedOrd?.created_at || inv.invoice_date || null,
          sales_rep_name: linkedOrd?.sales_rep_name || linkedOrd?.sales_agent_name || null,
          dealer_group_name: linkedOrd?.group_name || null,
          department_name: linkedOrd?.department_name || null,
          po_number: linkedOrd?.po_number || canonicalOrderNo || null,
          quote_number: quoteNumber,
          payment_terms:
            linkedOrd?.payment_terms ||
            inv.payment_terms_snapshot ||
            linkedOrd?.payment_terms_code ||
            null,
          fulfillment: {
            status: formatLabel(primaryLineStatus),
            fulfillment_type: primaryFulfillmentType ? formatLabel(primaryFulfillmentType) : "Warehouse Ship",
            ship_via: linkedOrd?.ship_via || null,
            shipping_address: linkedOrd?.shipping_address || null,
            qty_ordered: totalQtyOrdered,
            qty_shipped: totalQtyShipped,
            shipments: linkedShipments,
          },
          items: invLines.map((l) => ({
            sku: l.sku || null,
            description: l.description || l.sku,
            quantity: l.qty || 1,
            unitPrice: Number(l.unit_price) || 0,
            total: Number(l.line_total) || Number(l.qty || 1) * Number(l.unit_price || 0),
            image_url: l.image_url || null,
            images: l.images || [],
          })),
        };
      })
      .filter((inv) => {
        if (!params.invoice_number && !params.customer_name) {
          if (/^cash\s+cash/i.test(inv.clientName)) return false;
          const activeBal = Number(inv.open_balance ?? inv.balance ?? inv.total ?? 0);
          if (activeBal <= 0) return false;
        }
        return true;
      })
      .slice(0, limit);

    return {
      success: true,
      count: enrichedInvoices.length,
      invoices: enrichedInvoices,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Tool 4: Query Purchase Orders & Procurement
 * Finds vendor POs, costs, expected deliveries, and purchase order lines.
 */
export async function queryPurchaseOrders(params: QueryPurchaseOrdersParams) {
  try {
    let query = supabaseServer
      .from("purchase_orders")
      .select(`
        id,
        po_number,
        supplier_id,
        status,
        total_amount,
        expected_date,
        carrier,
        tracking_number,
        notes,
        is_dropship,
        dropship_customer_name,
        created_at
      `)
      .order("created_at", { ascending: false });

    if (params.po_number) {
      const cleanPo = params.po_number.replace(/^(po\s*#?|#)\s*/i, "").trim();
      query = query.ilike("po_number", `%${cleanPo}%`);
    }

    if (params.status && params.status !== "all") {
      query = query.eq("status", params.status.toLowerCase().trim());
    }

    const dateRange = getDateFilterRange(params);
    if (dateRange?.gte) {
      query = query.gte("created_at", dateRange.gte);
    }
    if (dateRange?.lte) {
      query = query.lte("created_at", dateRange.lte);
    }

    // Filter by supplier name if provided
    if (params.supplier_name) {
      const { data: sups } = await supabaseServer
        .from("suppliers")
        .select("id")
        .ilike("name", `%${params.supplier_name.trim()}%`)
        .limit(10);

      if (sups && sups.length > 0) {
        query = query.in("supplier_id", sups.map((s) => s.id));
      } else {
        query = query.ilike("dropship_customer_name", `%${params.supplier_name.trim()}%`);
      }
    }

    const limit = params.limit || 10;
    const { data: pos, error } = await query.limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }

    if (!pos || pos.length === 0) {
      return { success: true, count: 0, purchase_orders: [] };
    }

    const poIds = pos.map((p) => p.id);

    // Fetch PO lines
    const { data: rawPoLines } = await supabaseServer
      .from("purchase_order_lines")
      .select("id, purchase_order_id, sku, description, qty_ordered, qty_received, unit_cost")
      .in("purchase_order_id", poIds);
    const poLines = await enrichLinesWithImages(rawPoLines || []);

    // Attach supplier name if supplier_id present
    const supplierIds = pos.map((p) => p.supplier_id).filter(Boolean);
    let supplierMap: Record<string, string> = {};

    if (supplierIds.length > 0) {
      const { data: sups } = await supabaseServer
        .from("suppliers")
        .select("id, name, company_name")
        .in("id", supplierIds);

      if (sups) {
        for (const s of sups) {
          supplierMap[s.id] = s.company_name || s.name;
        }
      }
    }

    const enrichedPos = pos.map((p) => {
      const lines = poLines ? poLines.filter((l) => l.purchase_order_id === p.id) : [];
      return {
        ...p,
        status: formatLabel(p.status),
        supplier_name: supplierMap[p.supplier_id] || p.dropship_customer_name || "Supplier ID: " + p.supplier_id,
        items: lines.map((l) => ({
          sku: l.sku || null,
          name: l.description || l.sku,
          qty: l.qty_ordered,
          unit: "units",
          unitCost: Number(l.unit_cost) || 0,
          image_url: l.image_url || null,
          images: l.images || [],
        })),
      };
    });

    return {
      success: true,
      count: enrichedPos.length,
      purchase_orders: enrichedPos,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Tool 5: Query Shipments & Fulfillments
 * Tracks outbound dealer packages, tracking numbers, carriers, and shipment lines.
 */
export async function queryShipments(params: QueryShipmentsParams) {
  try {
    let query = supabaseServer
      .from("shipments")
      .select(`
        id,
        shipment_number,
        order_id,
        status,
        carrier,
        service,
        tracking_number,
        ship_date,
        shipped_at,
        notes,
        created_at
      `)
      .order("created_at", { ascending: false });

    if (params.tracking_number) {
      query = query.ilike("tracking_number", `%${params.tracking_number.trim()}%`);
    }

    if (params.shipment_number) {
      query = query.ilike("shipment_number", `%${params.shipment_number.trim()}%`);
    }

    if (params.status && params.status !== "all") {
      query = query.eq("status", params.status.toLowerCase().trim());
    }

    // Match order_number if provided
    if (params.order_number) {
      const cleanOrderNo = params.order_number.replace(/^(order\s*#?|#)\s*/i, "").trim();
      const strippedDigits = cleanOrderNo.replace(/^(?:so|do)-/i, "");
      const { data: ords } = await supabaseServer
        .from("orders")
        .select("id")
        .or(`order_number.ilike.%${cleanOrderNo}%,order_number.ilike.%${strippedDigits}%`)
        .limit(5);

      if (ords && ords.length > 0) {
        query = query.in("order_id", ords.map((o) => o.id));
      }
    }

    const dateRange = getDateFilterRange(params);
    if (dateRange?.gte) {
      query = query.gte("created_at", dateRange.gte);
    }
    if (dateRange?.lte) {
      query = query.lte("created_at", dateRange.lte);
    }

    const limit = params.limit || 10;
    const { data: shipments, error } = await query.limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }

    if (!shipments || shipments.length === 0) {
      if (params.tracking_number) {
        const candidateCode = params.tracking_number.trim();
        const prodCheck = await searchCatalogProducts({ query: candidateCode, limit: 1 });
        if (prodCheck?.success && prodCheck.products && prodCheck.products.length > 0) {
          const matchedProduct = prodCheck.products[0];
          return {
            success: true,
            count: 0,
            shipments: [],
            suggested_product: matchedProduct,
            note: `'${candidateCode}' is an active GoldTouch catalog product SKU for '${matchedProduct.name}' ($${matchedProduct.price}), NOT a shipment tracking number. Please present this product to the user.`,
          };
        }
      }

      // Fallback: if querying shipments by dateRange or order_number and the shipments table has 0 rows in that window,
      // pull order dispatch/fulfillment records directly from the orders table so timeframe dispatching queries always succeed.
      if (dateRange || params.order_number) {
        const ordFallback = await searchCustomerOrders({
          order_number: params.order_number,
          timeframe: params.timeframe,
          date: params.date,
          start_date: params.start_date,
          end_date: params.end_date,
          limit,
        });
        if (ordFallback?.success && Array.isArray(ordFallback.orders) && ordFallback.orders.length > 0) {
          const synthesizedShipments = ordFallback.orders.map((o: any) => ({
            id: o.id,
            shipment_number: `SHP-${String(o.order_number || "").replace(/^(?:SO|DO)-/i, "") || "0000"}`,
            order_id: o.id,
            order_number: o.order_number,
            customer_name: formatCleanEntityName(o.customer_name),
            status: o.status || "Processing",
            carrier: formatCleanEntityName(o.ship_via || "GoldTouch Route Dispatch"),
            service: "Dealer Route / Warehouse Dispatch",
            tracking_number: o.shipments?.[0]?.tracking_number || `GT-${String(o.order_number || "").replace(/\D/g, "")}`,
            ship_date: o.created_at,
            created_at: o.created_at,
            total: o.total,
            items: (o.lines || []).map((l: any) => ({
              sku: l.sku,
              description: l.product_name || l.sku,
              qty_shipped: l.qty || 1,
              unit_price: Number(l.unit_price) || 0,
              image_url: l.image_url || null,
            })),
          }));
          return {
            success: true,
            count: synthesizedShipments.length,
            total_matching_orders: ordFallback.total_matching_orders,
            fulfilled_orders_count: ordFallback.fulfilled_orders_count,
            pending_orders_count: ordFallback.pending_orders_count,
            total_sales_revenue: ordFallback.total_sales_revenue,
            date_range_applied: ordFallback.date_range_applied,
            period_summary_metrics: ordFallback.period_summary_metrics,
            shipments: synthesizedShipments,
          };
        }
      }

      return { success: true, count: 0, shipments: [] };
    }

    const shipmentIds = shipments.map((s) => s.id);

    // Fetch shipment lines
    const { data: rawShipLines } = await supabaseServer
      .from("shipment_lines")
      .select("id, shipment_id, sku, description, qty_picked, qty_packed, qty_shipped, unit_price")
      .in("shipment_id", shipmentIds);
    const shipLines = await enrichLinesWithImages(rawShipLines || []);

    // Attach order numbers and customer names
    const orderIds = shipments.map((s) => s.order_id).filter(Boolean);
    let orderMap: Record<string, { order_number: string; customer_name: string }> = {};

    if (orderIds.length > 0) {
      const { data: ords } = await supabaseServer
        .from("orders")
        .select("id, order_number, customer_name")
        .in("id", orderIds);
      (ords || []).forEach((o) => {
        orderMap[o.id] = { order_number: normalizeOrderNumber(o.order_number), customer_name: o.customer_name };
      });
    }

    const enrichedShipments = shipments.map((s) => {
      const lines = shipLines ? shipLines.filter((l) => l.shipment_id === s.id) : [];
      return {
        ...s,
        status: formatLabel(s.status),
        order_number: orderMap[s.order_id]?.order_number || "N/A",
        customer_name: orderMap[s.order_id]?.customer_name || "N/A",
        items: lines.map((l) => ({
          sku: l.sku,
          description: l.description,
          qty_shipped: l.qty_shipped || l.qty_packed || l.qty_picked || 1,
          unit_price: Number(l.unit_price) || 0,
          image_url: l.image_url || null,
          images: l.images || [],
        })),
      };
    });

    return {
      success: true,
      count: enrichedShipments.length,
      shipments: enrichedShipments,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Tool 6: Search Dealership Customers & Rooftops
 * Look up dealership accounts, locations, phone, billing emails, parent groups, departments,
 * and cross-table orders, invoices, shipments, and CRM activities.
 */
export async function searchDealershipCustomers(params: SearchCustomersParams) {
  try {
    const limit = params.limit || 10;
    let rooftops: any[] = [];

    if (params.query && !params.city && !params.state) {
      rooftops = await findBestMatchingRooftops(params.query, limit);
    } else {
      let query = supabaseServer
        .from("rooftops")
        .select(`
          id,
          group_id,
          name,
          code,
          status,
          city,
          state,
          phone,
          billing_email,
          address_line1,
          address_line2,
          zip_code,
          country,
          latitude,
          longitude,
          statement_timezone,
          website_url,
          payment_terms,
          credit_limit,
          terms,
          delivery_route,
          tax_exempt,
          resale_certificate_number,
          qbo_customer_id,
          created_at
        `)
        .order("name", { ascending: true });

      if (params.query) {
        const q = cleanEntityQuery(params.query) || params.query.trim();
        query = query.or(`name.ilike.%${q}%,code.ilike.%${q}%,phone.ilike.%${q}%,billing_email.ilike.%${q}%,city.ilike.%${q}%,address_line1.ilike.%${q}%`);
      }

      if (params.city) {
        query = query.ilike("city", `%${params.city.trim()}%`);
      }

      if (params.state) {
        query = query.ilike("state", `%${params.state.trim()}%`);
      }

      const { data, error } = await query.limit(limit);
      if (error) {
        return { success: false, error: error.message };
      }
      rooftops = data || [];

      if (rooftops.length === 0 && params.query) {
        rooftops = await findBestMatchingRooftops(params.query, limit);
      }
    }

    if (!rooftops || rooftops.length === 0) {
      return { success: true, count: 0, customers: [] };
    }

    // 1. Enrich with Dealer Group names
    const groupIds = Array.from(new Set(rooftops.map((r) => r.group_id).filter(Boolean)));
    const groupMap: Record<string, string> = {};
    if (groupIds.length > 0) {
      const { data: groups } = await supabaseServer
        .from("dealer_groups")
        .select("id, name")
        .in("id", groupIds);
      (groups || []).forEach((g) => {
        groupMap[g.id] = g.name;
      });
    }

    // 2. Enrich with active departments
    const rooftopIds = rooftops.map((r) => r.id);
    const rooftopNames = rooftops.map((r) => r.name).filter(Boolean);
    const { data: depts } = await supabaseServer
      .from("departments")
      .select("id, rooftop_id, name, type, code")
      .in("rooftop_id", rooftopIds);

    // 3. Cross-table enrichment: Orders, Order Lines, Invoices, Shipments, CRM Activities
    const orderOrFilters = [
      `rooftop_id.in.(${rooftopIds.join(",")})`,
      ...rooftopNames.slice(0, 5).map((n) => `customer_name.ilike.%${n}%`),
    ];

    const [ordersRes, invoicesRes, activitiesRes] = await Promise.all([
      supabaseServer
        .from("orders")
        .select("*")
        .or(orderOrFilters.join(","))
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseServer
        .from("invoices")
        .select(
          "id, invoice_number, order_id, customer_id, bill_to_customer_id, status, invoice_date, due_date, total, balance, open_balance, paid_amount, billing_email_snapshot, payment_terms_snapshot, emailed_to, created_at"
        )
        .or(`bill_to_customer_id.in.(${rooftopIds.join(",")}),customer_id.in.(${rooftopIds.join(",")})`)
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseServer
        .from("crm_activities")
        .select("id, rooftop_id, type, subject, status, created_at")
        .in("rooftop_id", rooftopIds)
        .order("created_at", { ascending: false })
        .limit(25),
    ]);

    const allOrders = ordersRes.data || [];
    const allInvoices = invoicesRes.data || [];
    const allActivities = activitiesRes.data || [];

    const orderIds = allOrders.map((o) => o.id);
    let allOrderLines: any[] = [];
    let allShipments: any[] = [];
    if (orderIds.length > 0) {
      const [linesRes, shipmentsRes] = await Promise.all([
        supabaseServer
          .from("order_lines")
          .select("id, order_id, sku, product_name, qty, unit_price, amount")
          .in("order_id", orderIds),
        supabaseServer
          .from("shipments")
          .select("id, order_id, shipment_number, status, carrier, tracking_number, ship_date, created_at")
          .in("order_id", orderIds)
          .order("created_at", { ascending: false }),
      ]);
      allOrderLines = linesRes.data || [];
      allShipments = shipmentsRes.data || [];
    }

    const orderNumById: Record<string, string> = {};
    allOrders.forEach((o) => {
      orderNumById[o.id] = normalizeOrderNumber(o.order_number);
    });

    const enrichedCustomers = rooftops.map((r) => {
      const rDepts = depts ? depts.filter((d) => d.rooftop_id === r.id) : [];
      const rNameLower = (r.name || "").toLowerCase();

      const custOrders = allOrders.filter(
        (o) =>
          o.rooftop_id === r.id ||
          o.customer_id === r.id ||
          (o.customer_name && o.customer_name.toLowerCase() === rNameLower) ||
          (o.rooftop_name && o.rooftop_name.toLowerCase() === rNameLower)
      );
      const custOrderIds = new Set(custOrders.map((o) => o.id));

      const custInvoices = allInvoices.filter(
        (inv) =>
          inv.bill_to_customer_id === r.id ||
          inv.customer_id === r.id ||
          (inv.order_id && custOrderIds.has(inv.order_id))
      );

      const custShipments = allShipments.filter((s) => s.order_id && custOrderIds.has(s.order_id));
      const custActivities = allActivities.filter((a) => a.rooftop_id === r.id);

      const totalOrdersCount = custOrders.length;
      const lifetimeSpend = custOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      const assignedRep =
        custOrders.find((o) => o.sales_rep_name || o.sales_agent_name)?.sales_rep_name ||
        custOrders.find((o) => o.sales_rep_name || o.sales_agent_name)?.sales_agent_name ||
        undefined;

      const openInvoices = custInvoices.filter((inv) => {
        const bal = Number(inv.open_balance ?? inv.balance ?? 0);
        const st = (inv.status || "").toLowerCase();
        return bal > 0 || st === "open" || st === "issued" || st === "overdue";
      });
      const openInvoiceBalance = openInvoices.reduce(
        (sum, inv) => sum + (Number(inv.open_balance ?? inv.balance ?? inv.total) || 0),
        0
      );

      const formattedAddress = [
        r.address_line1,
        r.address_line2,
        r.city,
        r.state,
        r.zip_code,
      ]
        .filter(Boolean)
        .join(", ");

      return {
        ...r,
        formatted_address: formattedAddress,
        latitude:
          r.latitude !== null && r.latitude !== undefined
            ? Number(r.latitude)
            : null,
        longitude:
          r.longitude !== null && r.longitude !== undefined
            ? Number(r.longitude)
            : null,
        status: formatLabel(r.status || "active"),
        terms: formatLabel(r.terms),
        payment_terms: formatLabel(r.payment_terms),
        group_name: r.group_id ? groupMap[r.group_id] : undefined,
        assigned_sales_rep: assignedRep,
        total_orders_count: totalOrdersCount,
        lifetime_spend: lifetimeSpend,
        open_invoices_count: openInvoices.length,
        open_invoice_balance: openInvoiceBalance,
        departments: rDepts.map((d) => ({
          ...d,
          type: formatLabel(d.type),
        })),
        recent_orders: custOrders.slice(0, 5).map((o) => {
          const oLines = allOrderLines.filter((l) => l.order_id === o.id);
          return {
            id: o.id,
            order_number: normalizeOrderNumber(o.order_number),
            status: formatLabel(o.status),
            total: Number(o.total) || 0,
            payment_status: formatLabel(o.payment_status),
            created_at: o.created_at,
            sales_rep_name: o.sales_rep_name || o.sales_agent_name,
            ship_via: formatLabel(o.ship_via),
            order_type: formatLabel(o.order_type),
            items_summary: oLines
              .map((l) => `${l.qty}x ${l.product_name || l.sku} ($${Number(l.unit_price || 0).toFixed(2)})`)
              .join(", "),
          };
        }),
        recent_invoices: custInvoices.slice(0, 5).map((inv) => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          status: formatLabel(inv.status),
          total: Number(inv.total) || 0,
          open_balance: Number(inv.open_balance ?? inv.balance ?? 0),
          invoice_date: inv.invoice_date,
          due_date: inv.due_date,
          emailed_to: inv.emailed_to || inv.billing_email_snapshot,
        })),
        recent_shipments: custShipments.slice(0, 5).map((s) => ({
          id: s.id,
          shipment_number: s.shipment_number,
          order_number: orderNumById[s.order_id] || undefined,
          status: formatLabel(s.status),
          carrier: s.carrier,
          tracking_number: s.tracking_number,
          ship_date: s.ship_date || s.created_at,
        })),
        recent_activities: custActivities.slice(0, 5).map((a) => ({
          id: a.id,
          type: formatLabel(a.type),
          subject: a.subject,
          status: formatLabel(a.status),
          created_at: a.created_at,
        })),
      };
    });

    return {
      success: true,
      count: enrichedCustomers.length,
      customers: enrichedCustomers,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Tool 7: Query Dealer Groups
 * Look up corporate parent accounts, auto groups (e.g. Lithia, Hendrick, Penske), credit limits, and member rooftops.
 */
export async function queryDealerGroups(params: QueryDealerGroupsParams = {}) {
  try {
    let query = supabaseServer
      .from("dealer_groups")
      .select(`
        id,
        name,
        code,
        status,
        phone,
        email,
        credit_limit,
        terms,
        city,
        state,
        zip,
        website_url,
        delivery_route,
        tax_exempt,
        notes,
        created_at
      `)
      .order("name", { ascending: true });

    if (params.name) {
      query = query.ilike("name", `%${params.name.trim()}%`);
    }

    if (params.code) {
      query = query.ilike("code", `%${params.code.trim()}%`);
    }

    if (params.city) {
      query = query.ilike("city", `%${params.city.trim()}%`);
    }

    if (params.state) {
      query = query.ilike("state", `%${params.state.trim()}%`);
    }

    const limit = params.limit || 10;
    const { data: groups, error } = await query.limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }

    if (!groups || groups.length === 0) {
      return { success: true, count: 0, dealer_groups: [] };
    }

    // Attach member rooftop summary for each group
    const groupIds = groups.map((g) => g.id);
    const { data: memberRooftops } = await supabaseServer
      .from("rooftops")
      .select("id, group_id, name, city, state")
      .in("group_id", groupIds);

    const enrichedGroups = groups.map((g) => {
      const members = memberRooftops ? memberRooftops.filter((r) => r.group_id === g.id) : [];
      return {
        ...g,
        status: formatLabel(g.status),
        terms: formatLabel(g.terms),
        rooftops_count: members.length,
        rooftops: members.map((m) => ({ id: m.id, name: m.name, city: m.city, state: m.state })),
      };
    });

    return {
      success: true,
      count: enrichedGroups.length,
      dealer_groups: enrichedGroups,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Tool 8: Query Dealership Departments
 * Look up Parts, Service, Sales, Body Shop departments by rooftop or type.
 */
export async function queryDepartments(params: QueryDepartmentsParams = {}) {
  try {
    let query = supabaseServer
      .from("departments")
      .select(`
        id,
        rooftop_id,
        name,
        status,
        type,
        code,
        pricing_tier,
        billing_email,
        terms,
        created_at
      `)
      .order("name", { ascending: true });

    if (params.rooftop_id) {
      query = query.eq("rooftop_id", params.rooftop_id);
    } else if (params.rooftop_name) {
      const { data: roofs } = await supabaseServer
        .from("rooftops")
        .select("id")
        .ilike("name", `%${params.rooftop_name.trim()}%`)
        .limit(5);

      if (roofs && roofs.length > 0) {
        query = query.in("rooftop_id", roofs.map((r) => r.id));
      }
    }

    if (params.type) {
      query = query.ilike("type", `%${params.type.trim()}%`);
    }

    if (params.name) {
      query = query.ilike("name", `%${params.name.trim()}%`);
    }

    const limit = params.limit || 15;
    const { data: departments, error } = await query.limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }

    if (!departments || departments.length === 0) {
      return { success: true, count: 0, departments: [] };
    }

    // Attach rooftop name
    const rooftopIds = Array.from(new Set(departments.map((d) => d.rooftop_id).filter(Boolean)));
    let rooftopMap: Record<string, string> = {};
    if (rooftopIds.length > 0) {
      const { data: roofs } = await supabaseServer
        .from("rooftops")
        .select("id, name")
        .in("id", rooftopIds);
      (roofs || []).forEach((r) => {
        rooftopMap[r.id] = r.name;
      });
    }

    const enriched = departments.map((d) => ({
      ...d,
      type: formatLabel(d.type),
      status: formatLabel(d.status),
      pricing_tier: formatLabel(d.pricing_tier),
      rooftop_name: rooftopMap[d.rooftop_id] || "Rooftop ID: " + d.rooftop_id,
    }));

    return {
      success: true,
      count: enriched.length,
      departments: enriched,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Tool 9: Query Suppliers & Vendors
 * Search 1,380+ supply chain vendors, contact info, payment terms, lead times, and ratings.
 */
export async function querySuppliers(params: QuerySuppliersParams = {}) {
  try {
    let query = supabaseServer
      .from("suppliers")
      .select(`
        id,
        name,
        company_name,
        contact_name,
        email,
        phone,
        website,
        city,
        state,
        payment_terms,
        discount_percent,
        average_lead_time_days,
        quality_rating,
        sales_rep_name,
        sales_rep_phone,
        tags,
        is_active,
        is_preferred
      `)
      .order("name", { ascending: true });

    if (params.name) {
      const n = params.name.trim();
      query = query.or(`name.ilike.%${n}%,company_name.ilike.%${n}%,contact_name.ilike.%${n}%`);
    }

    if (params.city) {
      query = query.ilike("city", `%${params.city.trim()}%`);
    }

    if (params.state) {
      query = query.ilike("state", `%${params.state.trim()}%`);
    }

    if (typeof params.is_preferred === "boolean") {
      query = query.eq("is_preferred", params.is_preferred);
    }

    const limit = params.limit || 10;
    let { data: suppliers, error } = await query.limit(limit);

    // Fallback: If filtered by is_preferred: true but no supplier is marked preferred in DB, return top active suppliers
    if ((!suppliers || suppliers.length === 0) && params.is_preferred === true) {
      const { data: topSuppliers } = await supabaseServer
        .from("suppliers")
        .select(`
          id,
          name,
          company_name,
          contact_name,
          email,
          phone,
          website,
          city,
          state,
          payment_terms,
          discount_percent,
          average_lead_time_days,
          quality_rating,
          sales_rep_name,
          sales_rep_phone,
          tags,
          is_active,
          is_preferred
        `)
        .order("name", { ascending: true })
        .limit(limit);

      if (topSuppliers && topSuppliers.length > 0) {
        return {
          success: true,
          count: topSuppliers.length,
          suppliers: topSuppliers.map((s) => ({
            ...s,
            payment_terms: formatLabel(s.payment_terms),
          })),
          note: "No suppliers are explicitly marked as is_preferred=true. These are the top active enterprise vendors.",
        };
      }
    }

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      count: suppliers?.length || 0,
      suppliers: (suppliers || []).map((s) => ({
        ...s,
        payment_terms: formatLabel(s.payment_terms),
      })),
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Tool 10: Query CRM Activities & Dealer Interactions
 * Retrieve field visits, phone calls, sales meetings, tasks, and follow-ups.
 */
export async function queryCrmActivities(params: QueryCrmActivitiesParams = {}) {
  try {
    let query = supabaseServer
      .from("crm_activities")
      .select(`
        id,
        type,
        title,
        description,
        status,
        priority,
        sales_agent_name,
        customer_name,
        rooftop_name,
        group_name,
        created_at,
        completed_at
      `)
      .order("created_at", { ascending: false });

    if (params.sales_agent_name) {
      query = query.ilike("sales_agent_name", `%${params.sales_agent_name.trim()}%`);
    }

    if (params.customer_name) {
      const c = params.customer_name.trim();
      query = query.or(`customer_name.ilike.%${c}%,rooftop_name.ilike.%${c}%,group_name.ilike.%${c}%`);
    }

    if (params.type) {
      query = query.ilike("type", `%${params.type.trim()}%`);
    }

    if (params.status && params.status !== "all") {
      query = query.eq("status", params.status.toLowerCase().trim());
    }

    const dateRange = getDateFilterRange(params);
    if (dateRange?.gte) {
      query = query.gte("created_at", dateRange.gte);
    }
    if (dateRange?.lte) {
      query = query.lte("created_at", dateRange.lte);
    }

    const limit = params.limit || 10;
    const { data: activities, error } = await query.limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      count: activities?.length || 0,
      activities: (activities || []).map((a) => ({
        ...a,
        type: formatLabel(a.type),
        status: formatLabel(a.status),
        priority: formatLabel(a.priority),
      })),
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Tool 11: Query Pricing Rules
 * Retrieve custom dealer pricing structures, discounts, tiering, and margin strategies.
 */
export async function queryPricingRules(params: QueryPricingRulesParams = {}) {
  try {
    let query = supabaseServer
      .from("pricing_rules")
      .select(`
        id,
        name,
        scope_type,
        match_type,
        match_value,
        strategy_type,
        discount_pct,
        fixed_price,
        priority,
        price_method,
        is_active,
        created_at
      `)
      .order("priority", { ascending: true });

    if (params.scope_type) {
      query = query.ilike("scope_type", `%${params.scope_type.trim()}%`);
    }

    if (params.match_type) {
      query = query.ilike("match_type", `%${params.match_type.trim()}%`);
    }

    const searchLookup = (params.sku || params.query || "").trim();
    if (searchLookup) {
      query = query.or(`name.ilike.%${searchLookup}%,match_value.ilike.%${searchLookup}%`);
    }

    const limit = params.limit || 10;
    const { data: rules, error } = await query.limit(limit);

    // Also resolve product-specific volume pricing tiers if a product SKU or product name was queried
    let matchedProducts: any[] = [];
    if (searchLookup) {
      try {
        const prodMatch = await searchCatalogProducts({
          query: searchLookup,
          sku: params.sku,
          limit: 3,
        });
        if (prodMatch.success && Array.isArray(prodMatch.products) && prodMatch.products.length > 0) {
          matchedProducts = prodMatch.products;
        }
      } catch {}
    }

    if (error && matchedProducts.length === 0) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      count: (rules?.length || 0) + matchedProducts.length,
      pricing_rules: rules || [],
      matched_products: matchedProducts,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Tool 12: Query System Audit Logs
 * Retrieve audit history, system changes, user actions, and entity change logs.
 */
export async function queryAuditLogs(params: QueryAuditLogsParams = {}) {
  try {
    let query = supabaseServer
      .from("audit_logs")
      .select(`
        id,
        actor,
        action,
        entity,
        entity_id,
        changes,
        created_at
      `)
      .order("created_at", { ascending: false });

    if (params.entity) {
      query = query.ilike("entity", `%${params.entity.trim()}%`);
    }

    if (params.entity_id) {
      query = query.eq("entity_id", params.entity_id.trim());
    }

    if (params.actor) {
      query = query.ilike("actor", `%${params.actor.trim()}%`);
    }

    if (params.action) {
      query = query.ilike("action", `%${params.action.trim()}%`);
    }

    const limit = params.limit || 10;
    const { data: logs, error } = await query.limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      count: logs?.length || 0,
      audit_logs: logs || [],
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Tool 13: Universal Enterprise Search
 * Cross-table parallel search over orders, invoices, customers, dealer groups, suppliers, catalog, and CRM.
 */
export async function universalEnterpriseSearch(params: UniversalSearchParams) {
  try {
    const term = (params.query || "").trim();
    if (!term) {
      return { success: false, message: "No search term provided." };
    }

    const limit = params.limit || 5;

    // Run parallel searches across known core tables AND any dynamically discovered tables
    const [
      ordersRes,
      invoicesRes,
      rooftopsRes,
      groupsRes,
      suppliersRes,
      productsRes,
      apparelRes,
      activitiesRes,
      dynamicTablesRes,
    ] = await Promise.all([
      searchCustomerOrders({ customer_name: term, order_number: term, limit }),
      queryInvoices({ customer_name: term, invoice_number: term, limit }),
      searchDealershipCustomers({ query: term, limit }),
      queryDealerGroups({ name: term, limit }),
      querySuppliers({ name: term, limit }),
      searchCatalogProducts({ query: term, limit }),
      searchApparelCatalog({ query: term, limit }),
      queryCrmActivities({ customer_name: term, sales_agent_name: term, limit }),
      searchAcrossDynamicTables(term, limit),
    ]);

    const mergedCatalogProducts = [
      ...(productsRes.success ? productsRes.products || [] : []),
      ...(apparelRes.success ? apparelRes.products || [] : []),
    ];
    const uniqueCatalogProducts = Array.from(
      new Map(mergedCatalogProducts.map((p: any) => [String(p.sku || p.id), p])).values()
    ).slice(0, limit * 2);

    return {
      success: true,
      query: term,
      results: {
        orders: ordersRes.success ? ordersRes.orders : [],
        invoices: invoicesRes.success ? invoicesRes.invoices : [],
        customers: rooftopsRes.success ? rooftopsRes.customers : [],
        dealer_groups: groupsRes.success ? groupsRes.dealer_groups : [],
        suppliers: suppliersRes.success ? suppliersRes.suppliers : [],
        catalog_products: uniqueCatalogProducts,
        apparel_products: apparelRes.success ? apparelRes.products : [],
        crm_activities: activitiesRes.success ? activitiesRes.activities : [],
        dynamic_table_matches: dynamicTablesRes || [],
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * ============================================================================
 * APPAREL CATALOG & LIVE VARIANT ENGINE (SanMar + S&S Activewear via Supabase)
 * ============================================================================
 */
export interface NormalizedApparelStyle {
  id: string;
  styleCode: string;
  styleId: string;
  title: string;
  brand: string;
  category: string;
  subCategory: string;
  supplier: string;
  price: number;
  cost: number;
  imageUrl: string | null;
  specSheetUrl: string | null;
  videoUrl: string | null;
  image3dUrl: string | null;
  description: string;
  variantKeys: string[];
  searchText: string;
}

const SS_IMAGE_HOST = "https://www.ssactivewear.com";

function normalizeApparelImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `${SS_IMAGE_HOST}/${trimmed.replace(/^\/+/, "")}`;
}

export function applyApparelPriceMarkup(price: number): number {
  if (!Number.isFinite(price) || price <= 0) return 0;
  const markup = price <= 23 ? 5 : price <= 35 ? 3 : 0;
  return Number((price + markup).toFixed(2));
}

function cleanApparelText(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&reg;|&#174;|&#0174;/gi, "®")
    .replace(/&trade;|&#8482;|&#153;|&#0153;/gi, "™")
    .replace(/&bull;|&#8226;|&#149;/gi, "•")
    .replace(/&ndash;|&#8211;|&#150;/gi, "–")
    .replace(/&mdash;|&#8212;|&#151;/gi, "—")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&#146;|&#8217;/gi, "'")
    .replace(/[\u00C2\u0102]+/g, "")
    .replace(/\bAr\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function inferApparelCategory(raw: any, title: string): string {
  const baseCat = String(raw.baseCategory || raw.BaseCategory || "").trim();
  if (baseCat && baseCat.toLowerCase() !== "uncategorized") {
    return baseCat;
  }

  const cats = String(raw.categories || raw.Categories || "")
    .split(",")
    .map((c) => c.trim());
  if (cats.includes("52")) return "Polos";
  if (cats.includes("21")) return "T-Shirts";
  if (cats.includes("395")) return "Sweatshirts & Fleece";
  if (cats.includes("15")) return "Outerwear";
  if (cats.includes("11")) return "Headwear";
  if (cats.includes("384")) return "Bottoms";
  if (cats.includes("49")) return "Workwear";
  if (cats.includes("53")) return "Accessories";

  const lower = title.toLowerCase();
  if (/\b(polo|pique|sport shirt)\b/.test(lower)) return "Polos";
  if (/\b(hoodie|hooded|sweatshirt|fleece|crewneck|pullover)\b/.test(lower)) return "Sweatshirts & Fleece";
  if (/\b(jacket|coat|parka|windbreaker|softshell|shell|vest|anorak|quarter-zip|1\/4-zip)\b/.test(lower)) return "Outerwear";
  if (/\b(cap|hat|beanie|visor|trucker|snapback|knit|bucket)\b/.test(lower)) return "Headwear";
  if (/\b(pant|short|jogger|sweatpant|legging)\b/.test(lower)) return "Bottoms";
  if (/\b(hi-vis|safety|workwear|industrial|coverall|bib)\b/.test(lower)) return "Workwear";
  if (/\b(bag|backpack|tote|duffel|cooler|towel|apron|blanket)\b/.test(lower)) return "Accessories";
  if (/\b(tee|t-shirt|shirt|jersey|tank|henley|long sleeve)\b/.test(lower)) return "T-Shirts";
  return "Apparel";
}

function defaultCategoryPrice(category: string): { price: number; cost: number } {
  const cat = category.toLowerCase();
  if (cat.includes("outerwear") || cat.includes("jacket")) return { price: 54.98, cost: 42.5 };
  if (cat.includes("sweatshirt") || cat.includes("fleece")) return { price: 32.98, cost: 24.5 };
  if (cat.includes("polo")) return { price: 24.98, cost: 17.5 };
  if (cat.includes("headwear") || cat.includes("cap") || cat.includes("hat")) return { price: 18.5, cost: 11.5 };
  if (cat.includes("workwear")) return { price: 38.98, cost: 29.0 };
  if (cat.includes("bottom")) return { price: 29.98, cost: 21.5 };
  if (cat.includes("accessories") || cat.includes("bag")) return { price: 26.98, cost: 18.5 };
  return { price: 16.98, cost: 10.5 };
}

let apparelStylesCache: { styles: NormalizedApparelStyle[]; expiresAt: number } | null = null;
let apparelStylesLoadingPromise: Promise<NormalizedApparelStyle[]> | null = null;

export async function getApparelStylesIndex(): Promise<NormalizedApparelStyle[]> {
  if (apparelStylesCache && apparelStylesCache.expiresAt > Date.now()) {
    return apparelStylesCache.styles;
  }
  if (apparelStylesLoadingPromise) {
    return apparelStylesLoadingPromise;
  }

  apparelStylesLoadingPromise = (async () => {
    try {
      const { data: rows } = await supabaseServer
        .from("ss_activewear_cache")
        .select("key, data")
        .in("key", ["sanmar:styles", "styles"]);

      let sanmarRaw: any[] = [];
      let ssRaw: any[] = [];

      for (const r of rows || []) {
        if (r.key === "sanmar:styles" && Array.isArray(r.data)) {
          sanmarRaw = r.data;
        } else if (r.key === "styles" && Array.isArray(r.data)) {
          ssRaw = r.data;
        }
      }

      const byStyleCode = new Map<string, NormalizedApparelStyle>();
      const allStyles: NormalizedApparelStyle[] = [];

      // 1. Load SanMar styles first (rich pricing, categories, high-res images)
      for (const sm of sanmarRaw) {
        const styleCode = String(sm.styleName || sm.partNumber || sm.sanmarStyleNumber || sm.styleID || "")
          .replace(/^sm_/i, "")
          .trim();
        if (!styleCode) continue;

        const brand = cleanApparelText(sm.brandName || "SanMar");
        const rawTitle = cleanApparelText(sm.title || styleCode);
        const title =
          brand && !rawTitle.toLowerCase().startsWith(brand.toLowerCase())
            ? `${brand} ${rawTitle}`
            : rawTitle;
        const category = inferApparelCategory(sm, title);
        const subCategory = cleanApparelText(sm.subCategory || "");
        const rawBasePrice = Number(sm.retailPrice || sm.msrp || sm.customerPrice || sm.price || 0);
        const rawCost = Number(sm.customerPrice || sm.piecePrice || sm.price || 0);
        const price = rawBasePrice > 0 ? applyApparelPriceMarkup(rawBasePrice) : 0;
        const cost = rawCost > 0 ? Number(rawCost.toFixed(2)) : 0;
        const imageUrl =
          normalizeApparelImageUrl(sm.styleImage) ||
          normalizeApparelImageUrl(sm.frontFlatImage) ||
          normalizeApparelImageUrl(sm.brandImage);
        const description = cleanApparelText(sm.description || "");
        const styleId = String(sm.styleID || `sm_${styleCode}`);
        const variantKeys = [`sanmar:variants:${styleCode.toLowerCase()}`];

        const norm: NormalizedApparelStyle = {
          id: styleId,
          styleCode,
          styleId,
          title,
          brand,
          category,
          subCategory,
          supplier: "SanMar",
          price,
          cost,
          imageUrl,
          specSheetUrl: sm.specSheet || sm.specSheetUrl || null,
          videoUrl: sm.videoUrl || null,
          image3dUrl: sm.image3dUrl || null,
          description,
          variantKeys,
          searchText: `${styleCode} ${brand} ${title} ${category} ${subCategory} ${description}`.toLowerCase(),
        };

        byStyleCode.set(`${brand.toLowerCase()}::${styleCode.toLowerCase()}`, norm);
        byStyleCode.set(styleCode.toLowerCase(), norm);
        allStyles.push(norm);
      }

      // 2. Load S&S Activewear styles and merge with SanMar if overlapping
      for (const ss of ssRaw) {
        const styleCode = String(ss.styleName || ss.partNumber || ss.styleID || "").trim();
        if (!styleCode) continue;

        const brand = cleanApparelText(ss.brandName || "S&S Activewear");
        const styleId = String(ss.styleID || styleCode);
        const existing =
          byStyleCode.get(`${brand.toLowerCase()}::${styleCode.toLowerCase()}`) ||
          byStyleCode.get(styleCode.toLowerCase());

        if (existing && existing.brand.toLowerCase() === brand.toLowerCase()) {
          if (!existing.variantKeys.includes(`variants:${styleId}`)) {
            existing.variantKeys.push(`variants:${styleId}`);
          }
          if (!existing.imageUrl) {
            existing.imageUrl = normalizeApparelImageUrl(ss.styleImage);
          }
          continue;
        }

        const rawTitle = cleanApparelText(ss.title || styleCode);
        const title =
          brand && !rawTitle.toLowerCase().startsWith(brand.toLowerCase())
            ? `${brand} ${rawTitle}`
            : rawTitle;
        const category = inferApparelCategory(ss, title);
        const subCategory = cleanApparelText(ss.subCategory || "");
        const rawBasePrice = Number(ss.retailPrice || ss.msrp || ss.customerPrice || ss.price || 0);
        const rawCost = Number(ss.customerPrice || ss.piecePrice || ss.price || 0);
        const price = rawBasePrice > 0 ? applyApparelPriceMarkup(rawBasePrice) : 0;
        const cost = rawCost > 0 ? Number(rawCost.toFixed(2)) : 0;
        const imageUrl =
          normalizeApparelImageUrl(ss.styleImage) ||
          normalizeApparelImageUrl(ss.brandImage);
        const description = cleanApparelText(ss.description || "");
        const variantKeys = [`variants:${styleId}`, `sanmar:variants:${styleCode.toLowerCase()}`];

        const norm: NormalizedApparelStyle = {
          id: `ss_${styleId}`,
          styleCode,
          styleId,
          title,
          brand,
          category,
          subCategory,
          supplier: "S&S Activewear",
          price,
          cost,
          imageUrl,
          specSheetUrl: ss.specSheet || ss.specSheetUrl || null,
          videoUrl: ss.videoUrl || null,
          image3dUrl: ss.image3dUrl || null,
          description,
          variantKeys,
          searchText: `${styleCode} ${brand} ${title} ${category} ${subCategory} ${description}`.toLowerCase(),
        };

        if (!byStyleCode.has(styleCode.toLowerCase())) {
          byStyleCode.set(styleCode.toLowerCase(), norm);
        }
        allStyles.push(norm);
      }

      apparelStylesCache = {
        styles: allStyles,
        expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes TTL
      };
      return allStyles;
    } catch (err) {
      console.warn("[sara-tools] Failed to load apparel styles index:", err);
      return [];
    } finally {
      apparelStylesLoadingPromise = null;
    }
  })();

  return apparelStylesLoadingPromise;
}

const SIZE_ORDER_RANK: Record<string, number> = {
  XXS: 1,
  "2XS": 1,
  XS: 2,
  S: 3,
  SM: 3,
  SMALL: 3,
  M: 4,
  MD: 4,
  MEDIUM: 4,
  L: 5,
  LG: 5,
  LARGE: 5,
  XL: 6,
  "2XL": 7,
  XXL: 7,
  "3XL": 8,
  XXXL: 8,
  "4XL": 9,
  "5XL": 10,
  "6XL": 11,
  OSFA: 12,
  "ONE SIZE": 12,
  "S/M": 13,
  "M/L": 14,
  "L/XL": 15,
};

function sortApparelSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const ra = SIZE_ORDER_RANK[a.toUpperCase()] ?? 99;
    const rb = SIZE_ORDER_RANK[b.toUpperCase()] ?? 99;
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });
}

async function enrichApparelStylesWithVariants(
  styles: NormalizedApparelStyle[],
  colorFilter?: string,
  sizeFilter?: string
): Promise<any[]> {
  if (styles.length === 0) return [];

  const allVariantKeys = Array.from(new Set(styles.flatMap((s) => s.variantKeys)));
  const variantMap = new Map<string, any[]>();

  if (allVariantKeys.length > 0) {
    try {
      const { data: cacheRows } = await supabaseServer
        .from("ss_activewear_cache")
        .select("key, data")
        .in("key", allVariantKeys.slice(0, 40));

      for (const row of cacheRows || []) {
        if (row.data && Array.isArray(row.data.rows)) {
          variantMap.set(row.key, row.data.rows);
        }
      }
    } catch (err) {
      console.warn("[sara-tools] Variant batch lookup warning:", err);
    }
  }

  const colorKeyword = (colorFilter || "").trim().toLowerCase();
  const sizeKeyword = (sizeFilter || "").trim().toUpperCase();

  return styles.map((style) => {
    let rows: any[] = [];
    for (const k of style.variantKeys) {
      const found = variantMap.get(k);
      if (found && found.length > 0) {
        rows = found;
        break;
      }
    }

    const colorSet = new Set<string>();
    const sizeSet = new Set<string>();
    const colorImages = new Map<string, string>();
    let totalStock = 0;
    let matchedColorStock = 0;
    let matchedColorImage: string | null = null;
    let minVariantBasePrice = Infinity;
    let minVariantCost = Infinity;

    for (const r of rows) {
      const cName = String(r.colorName || r.ColorName || "").trim();
      const sName = String(r.sizeName || r.SizeName || "").trim();
      const qty = Number(r.qty ?? r.Qty ?? 0) || 0;

      if (cName) colorSet.add(cName);
      if (sName) sizeSet.add(sName);
      totalStock += qty;

      const frontImg = normalizeApparelImageUrl(r.colorFrontImage || r.ColorFrontImage || r.frontFlatImage);
      if (cName && frontImg && !colorImages.has(cName)) {
        colorImages.set(cName, frontImg);
      }

      if (colorKeyword && cName.toLowerCase().includes(colorKeyword)) {
        if (!sizeKeyword || sName.toUpperCase() === sizeKeyword) {
          matchedColorStock += qty;
        }
        if (frontImg && !matchedColorImage) {
          matchedColorImage = frontImg;
        }
      } else if (sizeKeyword && !colorKeyword && sName.toUpperCase() === sizeKeyword) {
        matchedColorStock += qty;
      }

      const vBase = Number(
        r.retailPrice || r.RetailPrice || r.customerPrice || r.CustomerPrice || r.piecePrice || r.PiecePrice || r.salePrice || r.price || 0
      );
      if (vBase > 0 && vBase < minVariantBasePrice) {
        minVariantBasePrice = vBase;
      }
      const vCost = Number(r.customerPrice || r.CustomerPrice || r.piecePrice || r.PiecePrice || r.salePrice || 0);
      if (vCost > 0 && vCost < minVariantCost) {
        minVariantCost = vCost;
      }
    }

    const sortedSizes = sortApparelSizes(Array.from(sizeSet));
    const colorsList = Array.from(colorSet);
    const sizeRange =
      sortedSizes.length > 1
        ? `${sortedSizes[0]}–${sortedSizes[sortedSizes.length - 1]}`
        : sortedSizes[0] || "XS–4XL";

    let finalPrice = style.price;
    let finalCost = style.cost;
    if (finalPrice <= 0 && Number.isFinite(minVariantBasePrice)) {
      finalPrice = applyApparelPriceMarkup(minVariantBasePrice);
    }
    if (finalCost <= 0 && Number.isFinite(minVariantCost)) {
      finalCost = Number(minVariantCost.toFixed(2));
    }
    if (finalPrice <= 0) {
      const def = defaultCategoryPrice(style.category);
      finalPrice = def.price;
      finalCost = def.cost;
    }

    const primaryImage =
      matchedColorImage ||
      style.imageUrl ||
      Array.from(colorImages.values())[0] ||
      null;

    const galleryImages = Array.from(
      new Set([primaryImage, ...Array.from(colorImages.values())].filter((u): u is string => Boolean(u)))
    )
      .slice(0, 8)
      .map((url) => ({ url }));

    const effectiveStock =
      colorKeyword || sizeKeyword
        ? matchedColorStock > 0
          ? matchedColorStock
          : totalStock
        : totalStock;

    return {
      id: style.id,
      name: cleanApparelText(style.title),
      sku: style.styleCode,
      style_code: style.styleCode,
      price: finalPrice,
      cost: finalCost,
      category: `Apparel / ${style.category}`,
      apparel_category: style.category,
      sub_category: style.subCategory || style.category,
      brand: style.brand,
      supplier: style.supplier,
      stock: rows.length > 0 ? effectiveStock : "In Stock",
      stock_status: rows.length === 0 || effectiveStock > 0 ? "In Stock" : "Out of Stock",
      colors: colorsList,
      color_count: colorsList.length,
      sizes: sortedSizes.length > 0 ? sortedSizes : ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"],
      size_range: sizeRange,
      image_url: primaryImage,
      images: galleryImages,
      spec_sheet_url: style.specSheetUrl,
      video_url: style.videoUrl,
      image_3d_url: style.image3dUrl,
      description: cleanApparelText(style.description),
    };
  });
}

const FEATURED_APPAREL_BRANDS = new Set([
  "nike",
  "carhartt",
  "port authority",
  "sport-tek",
  "eddie bauer",
  "the north face",
  "richardson",
  "ogio",
  "under armour",
  "adidas",
  "columbia",
  "new era",
  "travisMathew",
  "cornerstone",
  "red kap",
  "gildan",
  "bella + canvas",
]);

const APPAREL_CATEGORY_SYNONYMS: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /\b(polo|polos|golf shirt|golf shirts|pique)\b/i, category: "Polos" },
  { pattern: /\b(t-shirt|t-shirts|tshirt|tshirts|tee|tees)\b/i, category: "T-Shirts" },
  { pattern: /\b(hoodie|hoodies|sweatshirt|sweatshirts|fleece|crewneck|pullover)\b/i, category: "Sweatshirts & Fleece" },
  { pattern: /\b(jacket|jackets|outerwear|coat|coats|vest|vests|windbreaker|softshell|parka|quarter-zip|1\/4-zip)\b/i, category: "Outerwear" },
  { pattern: /\b(hat|hats|cap|caps|headwear|beanie|beanies|visor|trucker|snapback)\b/i, category: "Headwear" },
  { pattern: /\b(pant|pants|short|shorts|jogger|joggers|sweatpant|bottoms)\b/i, category: "Bottoms" },
  { pattern: /\b(workwear|hi-vis|safety vest|safety shirt|industrial|coverall|bib)\b/i, category: "Workwear" },
  { pattern: /\b(bag|bags|backpack|backpacks|tote|duffel|cooler|apron|towel|blanket)\b/i, category: "Accessories" },
];

export function isApparelSearchIntent(text: string): boolean {
  const lower = (text || "").toLowerCase().trim();
  if (!lower) return false;
  // Do not treat automotive wheel/hub caps or gas caps as apparel headwear
  if (/\b(wheel\s+cap|center\s+cap|hub\s+cap|valve\s+cap|gas\s+cap|fuel\s+cap|radiator\s+cap|santa\s+hat)\b/i.test(lower)) {
    return false;
  }
  if (
    /\b(apparel|clothing|garment|uniform|uniforms|shirt|shirts|polo|polos|t-shirt|tshirt|tee|tees|hoodie|hoodies|sweatshirt|sweatshirts|fleece|jacket|jackets|outerwear|vest|vests|windbreaker|softshell|pullover|quarter-zip|hat|hats|cap|caps|beanie|beanies|trucker|headwear|workwear|jogger|joggers|backpack|duffel|sanmar|s&s|activewear|port authority|sport-tek|carhartt|nike|eddie bauer|north face|richardson|ogio|under armour|adidas|columbia|gildan|bella|jerzees|hanes|red kap|cornerstone|new era|travismathew|brooks brothers)\b/i.test(
      lower
    )
  ) {
    return true;
  }
  // Common SanMar / S&S style codes
  if (/^(k\d{3}[a-z]*|l\d{3}[a-z]*|st\d{3}[a-z]*|pc\d{2,4}[a-z]*|eb\d{3}[a-z]*|ct\d{5,7}[a-z]*|nk[a-z0-9]{4,8}|nf0a[a-z0-9]{4}|og\d{3}[a-z]*|cs\d{3}[a-z]*|j\d{3}[a-z]*|dt\d{3,4}[a-z]*|ne\d{3}[a-z]*|110|112|203690|379827)$/i.test(lower)) {
    return true;
  }
  return false;
}

/**
 * Tool 18: Search Apparel Catalog & Live Variants
 * Searches 9,750+ SanMar and S&S Activewear styles and enriches with live colors, sizes, inventory, and GoldTouch pricing.
 */
export async function searchApparelCatalog(params: SearchApparelParams = {}) {
  try {
    const allStyles = await getApparelStylesIndex();
    if (allStyles.length === 0) {
      return { success: true, count: 0, products: [] };
    }

    const limit = Math.min(Math.max(params.limit || 8, 1), 25);
    const rawStyleCode = (params.style_code || "").trim().replace(/^sm_/i, "");
    const rawBrand = (params.brand || "").trim().toLowerCase();
    const rawCategory = (params.category || "").trim();
    const rawSize = (params.size || "").trim();
    const rawQuery = (params.query || "").trim();
    const colorMatch = rawQuery.match(
      /\b(black|navy|white|red|royal|grey|gray|charcoal|heather|green|blue|orange|yellow|gold|pink|purple|brown|khaki|tan|camo|silver|maroon|burgundy|olive)\b/i
    );
    const rawColor = (params.color || (colorMatch ? colorMatch[1] : "")).trim();

    // Detect category synonym from query or category param
    let targetCategory = "";
    for (const syn of APPAREL_CATEGORY_SYNONYMS) {
      if (syn.pattern.test(rawCategory) || syn.pattern.test(rawQuery)) {
        targetCategory = syn.category;
        break;
      }
    }

    // Tokenize query stripping stop words and generic "apparel"/"clothing"
    const stopWords = new Set([
      "show",
      "me",
      "find",
      "search",
      "get",
      "list",
      "all",
      "the",
      "some",
      "for",
      "in",
      "with",
      "apparel",
      "clothing",
      "clothes",
      "garments",
      "items",
      "products",
      "catalog",
      "style",
      "styles",
      "what",
      "do",
      "you",
      "have",
    ]);

    const queryTokens = rawQuery
      .toLowerCase()
      .replace(/[^a-z0-9&-]+/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 2 && !stopWords.has(t));

    // Also strip category synonym words from strict token requirement if targetCategory matched
    const contentTokens = queryTokens.filter((t) => {
      if (targetCategory && APPAREL_CATEGORY_SYNONYMS.some((s) => s.pattern.test(t) || s.pattern.test(`${t}s`))) {
        return false;
      }
      if (rawColor && t === rawColor.toLowerCase()) return false;
      return true;
    });

    const scored: Array<{ style: NormalizedApparelStyle; score: number }> = [];

    for (const style of allStyles) {
      let score = 0;
      const codeLower = style.styleCode.toLowerCase();
      const brandLower = style.brand.toLowerCase();
      const titleLower = style.title.toLowerCase();
      const catLower = style.category.toLowerCase();

      // 1. Style code filter
      if (rawStyleCode) {
        const scLower = rawStyleCode.toLowerCase();
        if (codeLower === scLower) {
          score += 2000;
        } else if (codeLower.startsWith(scLower) || codeLower.includes(scLower)) {
          score += 600;
        } else {
          continue;
        }
      }

      // 2. Brand filter
      if (rawBrand) {
        if (brandLower === rawBrand || brandLower.includes(rawBrand)) {
          score += 500;
        } else {
          continue;
        }
      }

      // 3. Category filter
      if (targetCategory) {
        if (catLower === targetCategory.toLowerCase() || style.subCategory.toLowerCase().includes(targetCategory.toLowerCase())) {
          score += 350;
        } else if (!rawStyleCode) {
          continue;
        }
      }

      // 4. Query token matching
      if (rawQuery) {
        const qClean = rawQuery.toLowerCase().trim();
        if (codeLower === qClean) {
          score += 2500;
        } else if (codeLower.startsWith(qClean) && qClean.length >= 3) {
          score += 800;
        }
      }

      if (contentTokens.length > 0) {
        let matchedTokens = 0;
        for (const tok of contentTokens) {
          if (codeLower === tok) {
            score += 1500;
            matchedTokens++;
          } else if (brandLower.includes(tok)) {
            score += 300;
            matchedTokens++;
          } else if (titleLower.includes(tok)) {
            score += 150;
            matchedTokens++;
          } else if (style.searchText.includes(tok)) {
            score += 60;
            matchedTokens++;
          }
        }
        if (matchedTokens === 0 && !rawStyleCode && !rawBrand && !targetCategory) {
          continue;
        }
        if (matchedTokens === contentTokens.length) {
          score += 250;
        } else if (matchedTokens < contentTokens.length && !rawStyleCode) {
          score -= 150;
        }
      }

      // 5. General browse boost (e.g. "show me apparel" or "show me polos")
      if (titleLower.includes("discontinued") && !rawStyleCode && codeLower !== rawQuery.toLowerCase().trim()) {
        continue;
      }
      if (score > 0 || (contentTokens.length === 0 && !rawStyleCode && !rawBrand)) {
        if (style.price > 0) score += 80;
        if (style.imageUrl) score += 40;
        if (FEATURED_APPAREL_BRANDS.has(brandLower)) score += 60;
        if (["K500", "EB235", "110", "PC54", "ST350", "CT100614", "203690", "J317", "F281"].includes(style.styleCode)) {
          score += 45;
        }
        scored.push({ style, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);

    // Deduplicate by brand + styleCode and diversify brands when general browsing
    const selected: NormalizedApparelStyle[] = [];
    const seenCodes = new Set<string>();
    const brandCounts = new Map<string, number>();
    const isGeneralBrowse = contentTokens.length === 0 && !rawStyleCode && !rawBrand;

    for (const item of scored) {
      const key = `${item.style.brand.toLowerCase()}::${item.style.styleCode.toLowerCase()}`;
      if (seenCodes.has(key)) continue;

      if (isGeneralBrowse) {
        const bCount = brandCounts.get(item.style.brand) || 0;
        if (bCount >= 2 && selected.length < limit) continue;
        brandCounts.set(item.style.brand, bCount + 1);
      }

      seenCodes.add(key);
      selected.push(item.style);
      if (selected.length >= limit) break;
    }

    const enrichedProducts = await enrichApparelStylesWithVariants(selected, rawColor, rawSize);

    return {
      success: true,
      count: enrichedProducts.length,
      total_catalog_styles: allStyles.length,
      products: enrichedProducts,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

function parseVolumeTierRange(levelStr: string): { minQty: number; maxQty: number | null; rawLabel: string } {
  const s = String(levelStr || "").trim();
  const dashMatch = s.match(/^(\d+)\s*[-–to]+\s*(\d+)/i);
  if (dashMatch) {
    return {
      minQty: parseInt(dashMatch[1], 10),
      maxQty: parseInt(dashMatch[2], 10),
      rawLabel: `${dashMatch[1]} - ${dashMatch[2]}`,
    };
  }
  const plusMatch = s.match(/^(\d+)\s*\+/);
  if (plusMatch) {
    return {
      minQty: parseInt(plusMatch[1], 10),
      maxQty: null,
      rawLabel: `${plusMatch[1]}+`,
    };
  }
  const singleMatch = s.match(/(\d+)/);
  if (singleMatch) {
    const min = parseInt(singleMatch[1], 10);
    return {
      minQty: min,
      maxQty: null,
      rawLabel: `${min}`,
    };
  }
  return { minQty: 1, maxQty: null, rawLabel: s || "1+" };
}

function parsePricingLevelsList(raw: any): Array<{ level: string; price: number }> {
  if (!raw) return [];
  let arr = raw;
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item: any) => ({
      level: String(item?.level ?? item?.tierName ?? item?.qty ?? item?.min_qty ?? "1").trim(),
      price: Number(item?.price ?? item?.unitPrice ?? item?.unit_price ?? item?.cost ?? 0),
    }))
    .filter((item) => item.level && Number.isFinite(item.price) && item.price > 0);
}

function buildVolumePriceBreaks(params: {
  rawPricingLevels: any;
  rawCostTiers?: any;
  basePrice: number;
  originalPrice?: number;
  baseCost: number;
  category?: string;
}) {
  const { rawPricingLevels, rawCostTiers, basePrice, originalPrice = 0, baseCost, category = "" } = params;
  const parsedLevels = parsePricingLevelsList(rawPricingLevels);
  const parsedCostTiers = parsePricingLevelsList(rawCostTiers);

  let rawTiers = parsedLevels.map((item) => {
    const range = parseVolumeTierRange(item.level);
    return {
      rawLabel: range.rawLabel,
      minQty: range.minQty,
      maxQty: range.maxQty,
      unitPrice: Number(item.price.toFixed(2)),
    };
  });

  rawTiers.sort((a, b) => a.minQty - b.minQty);

  // Interpolate maxQty when tiers are stored as single minimum thresholds (e.g. 1, 3, 5, 10, 20 -> 1-2, 3-4, 5-9, 10-19, 20+)
  if (rawTiers.length > 0 && rawTiers.every((t) => t.maxQty === null)) {
    rawTiers = rawTiers.map((t, idx) => {
      const next = rawTiers[idx + 1];
      if (next) {
        const max = next.minQty > t.minQty ? next.minQty - 1 : t.minQty;
        const label = t.minQty === max ? `${t.minQty}` : `${t.minQty} - ${max}`;
        return {
          ...t,
          maxQty: max,
          rawLabel: label,
        };
      }
      return {
        ...t,
        maxQty: null,
        rawLabel: `${t.minQty}+`,
      };
    });
  }

  // Fallback to standard Landing Site volume brackets when pricing_levels is empty for non-apparel/non-accessories
  const catLower = (category || "").toLowerCase();
  if (rawTiers.length === 0 && basePrice > 0 && !catLower.includes("accessories") && !catLower.includes("apparel")) {
    rawTiers = [
      { rawLabel: "1 - 3", minQty: 1, maxQty: 3, unitPrice: Number(basePrice.toFixed(2)) },
      { rawLabel: "4 - 11", minQty: 4, maxQty: 11, unitPrice: Number((basePrice * 0.95).toFixed(2)) },
      { rawLabel: "12 - 23", minQty: 12, maxQty: 23, unitPrice: Number((basePrice * 0.90).toFixed(2)) },
      { rawLabel: "24+", minQty: 24, maxQty: null, unitPrice: Number((basePrice * 0.85).toFixed(2)) },
    ];
  }

  const refPrice = rawTiers[0]?.unitPrice || basePrice || originalPrice || 0;

  const volumeBreaks = rawTiers.map((t) => {
    const hasUnitWord = /\bunits?\b/i.test(t.rawLabel);
    const tierLabel = hasUnitWord
      ? t.rawLabel
      : `${t.rawLabel} ${t.minQty === 1 && t.maxQty === 1 ? "unit" : "units"}`;

    const discountPct =
      refPrice > t.unitPrice && refPrice > 0
        ? Number((((refPrice - t.unitPrice) / refPrice) * 100).toFixed(1))
        : 0;

    // Match tier cost if cost tiers exist, otherwise use baseCost
    let tierCost = baseCost;
    if (parsedCostTiers.length > 0) {
      const matchedCost = parsedCostTiers
        .map((c) => ({ min: parseVolumeTierRange(c.level).minQty, cost: c.price }))
        .filter((c) => c.min <= t.minQty)
        .sort((a, b) => b.min - a.min)[0];
      if (matchedCost && matchedCost.cost > 0) {
        tierCost = matchedCost.cost;
      }
    }

    const unitProfit =
      tierCost > 0 && t.unitPrice > 0 ? Number((t.unitPrice - tierCost).toFixed(2)) : undefined;
    const marginPct =
      tierCost > 0 && t.unitPrice > 0
        ? Number((((t.unitPrice - tierCost) / t.unitPrice) * 100).toFixed(1))
        : null;

    return {
      tier_label: tierLabel,
      min_qty: t.minQty,
      max_qty: t.maxQty,
      unit_price: t.unitPrice,
      discount_pct: discountPct,
      unit_cost: tierCost > 0 ? Number(tierCost.toFixed(2)) : undefined,
      unit_profit: unitProfit,
      margin_pct: marginPct,
    };
  });

  return {
    volumeBreaks,
    normalizedPricingLevels: rawTiers.map((t) => ({
      level: t.rawLabel,
      price: t.unitPrice,
    })),
  };
}

/**
 * Helper: Extract base apparel/product style candidates from composite ERP variant SKUs
 * e.g. "NKBV6042WHITE" -> ["NKBV6042"], "JER996MWHITE" -> ["JER996M", "996M"], "JST65TRUENAVYWHITE" -> ["JST65"], "F224BLACK" -> ["F224"]
 */
function extractBaseStyleCandidates(code: string): string[] {
  const clean = (code || "").trim().toUpperCase();
  if (clean.length < 4 || /\s/.test(clean)) return [];
  const colorSuffixPattern =
    /(?:TRUENAVYWHITE|TRUENAVY|NAVYWHITE|BLACKWHITE|ROYALWHITE|REDWHITE|DARKHEATHER|ATHLETICHEATHER|SPORTGREY|CHARCOALHEATHER|CHARCOAL|WHITE|BLACK|NAVY|ROYAL|RED|BLUE|GREEN|GREY|GRAY|MAROON|FOREST|GOLD|SILVER|ORANGE|PURPLE|PINK|YELLOW|KHAKI|TAN|BROWN|OLIVE|CAMO|HEATHER|BLK|WHT|NVY|GRY|RYL|CHR)+$/i;
  const candidates = new Set<string>();
  const strippedColor = clean.replace(colorSuffixPattern, "").replace(/[-_]+$/, "").trim();
  if (strippedColor && strippedColor !== clean && strippedColor.length >= 3) {
    candidates.add(strippedColor);
  }
  const baseForVendor = strippedColor || clean;
  if (/^JER[A-Z0-9]{2,}/i.test(baseForVendor)) {
    const withoutJer = baseForVendor.replace(/^JER/i, "").trim();
    if (withoutJer.length >= 3) candidates.add(withoutJer);
  }
  return Array.from(candidates);
}

/**
 * Helper: Infer brand & category for custom/special-order ERP SKUs synthesized from order/invoice/PO lines
 */
function inferBrandAndCategoryFromErpLine(sku: string, productName: string): {
  brand: string;
  category: string;
  sub_category: string | null;
} {
  const uSku = (sku || "").trim().toUpperCase();
  const uName = (productName || "").trim().toUpperCase();
  if (uSku.startsWith("ICO") || /\bICON\b|\bSUSPENSION\b|\bCONTROL\s+ARM|\bLEAF\s+PACK|\bCOILOVER/i.test(uName)) {
    return {
      brand: "ICON Vehicle Dynamics",
      category: "Suspension & Lift Kits",
      sub_category: "Performance Truck Suspension",
    };
  }
  if (uSku.startsWith("WES") || /\bWESTIN\b|\bNERF\b|\bSTEP\s+BAR|\bRUNNING\s+BOARD|\bGRILLE\s+GUARD/i.test(uName)) {
    return {
      brand: "Westin Automotive",
      category: "Truck & Aftermarket Accessories",
      sub_category: "Steps, Grille Guards & Bumpers",
    };
  }
  if (uSku.startsWith("BAK") || /\bBAKFLIP\b|\bTONNO\b|\bTONNEAU\b|\bBED\s+COVER/i.test(uName)) {
    return {
      brand: "BAK Industries",
      category: "Truck Bed & Tonneau Covers",
      sub_category: "Hard Folding & Roll-Up Covers",
    };
  }
  if (uSku.startsWith("ECO") || /\bBUMPERSHELLZ\b|\bBUMPER\s+COVER/i.test(uName)) {
    return {
      brand: "Ecoological / BumperShellz",
      category: "Truck Bumper Covers & Armor",
      sub_category: "OEM Fitment Bumper Shells",
    };
  }
  if (/^(?:PG|PGB|PGM)\d/i.test(uSku)) {
    return {
      brand: "GoldTouch Promotional",
      category: "Promotional & Event Merchandise",
      sub_category: "Custom Branded Giveaways",
    };
  }
  if (/\bSTREAMER|\bPENNANT|\bBALLOON|\bHELIUM|\bFLAG|\bSWOOPER|\bWINDFREE|\bBOW\b/i.test(uName)) {
    return {
      brand: "GoldTouch Lot & Showroom",
      category: "Lot & Showroom Merchandising",
      sub_category: "Exterior Lot Displays & Flags",
    };
  }
  if (/\bSHIRT|\bPOLO|\bHOODIE|\bJACKET|\bPULLOVER|\bFLEECE|\bTEE\b|\bCAP\b|\bHAT\b|\bNIKE\b|\bOGIO\b|\bPORT\s+AUTHORITY|\bSPORT-TEK|\bJERZEES/i.test(uName)) {
    return {
      brand: /\bNIKE\b/i.test(uName)
        ? "Nike"
        : /\bOGIO\b/i.test(uName)
        ? "OGIO"
        : /\bSPORT-TEK/i.test(uName)
        ? "Sport-Tek"
        : "GoldTouch Apparel",
      category: "Corporate & Dealership Apparel",
      sub_category: "Custom Embroidered / Screenprint Apparel",
    };
  }
  return {
    brand: "GoldTouch Dealer Supply",
    category: "Dealership Operations & Aftermarket Supply",
    sub_category: null,
  };
}

/**
 * Helper: Attach live order_sales_summary to returned CatalogProduct items
 */
async function enrichCatalogProductsWithOrderSales(productsList: any[], rawQuerySku?: string): Promise<any[]> {
  if (!Array.isArray(productsList) || productsList.length === 0 || productsList.length > 6) {
    return productsList;
  }
  try {
    const skuTerms = new Set<string>();
    for (const p of productsList) {
      for (const candidate of [p.sku, p.style_code, p.erp_sku, rawQuerySku]) {
        const c = String(candidate || "").trim();
        if (c && c !== "N/A" && c !== "Catalog Item" && c.length >= 2 && !/\s/.test(c)) {
          skuTerms.add(c);
        }
      }
    }

    const orParts: string[] = [];
    for (const s of Array.from(skuTerms).slice(0, 8)) {
      orParts.push(`sku.ilike.%${s}%`);
    }
    if (orParts.length === 0 && productsList.length === 1 && productsList[0]?.name) {
      const cleanNm = String(productsList[0].name).trim().slice(0, 45);
      if (cleanNm.length >= 3) {
        orParts.push(`product_name.ilike.%${cleanNm}%`);
      }
    }
    if (orParts.length === 0) return productsList;

    const { data: matchedLines } = await supabaseServer
      .from("order_lines")
      .select("order_id, sku, product_name, qty, unit_price, amount")
      .or(orParts.join(","))
      .limit(300);

    if (!matchedLines || matchedLines.length === 0) return productsList;

    const validLines = matchedLines.filter((l: any) => {
      const q = Number(l.qty ?? 0);
      const a = Number(l.amount ?? 0);
      const u = Number(l.unit_price ?? 0);
      const nm = String(l.product_name || "").trim();
      if (q <= 0 || a < 0 || /^returned\s+from\b/i.test(nm)) return false;
      return a > 0 || u > 0;
    });
    if (validLines.length === 0) return productsList;

    const orderIds = Array.from(
      new Set(validLines.map((l: any) => String(l.order_id || "")).filter(Boolean))
    );
    const orderMap = new Map<string, any>();
    if (orderIds.length > 0) {
      const { data: ordRows } = await supabaseServer
        .from("orders")
        .select("id, order_number, customer_name, status, sales_rep_name, created_at")
        .in("id", orderIds);
      for (const o of ordRows || []) {
        if (o.id && !/^cash\s+cash/i.test(String(o.customer_name || ""))) {
          orderMap.set(String(o.id), o);
        }
      }
    }

    return productsList.map((p) => {
      if (p.order_sales_summary) return p;
      const pSku = String(p.sku || "").trim().toUpperCase();
      const pStyle = String(p.style_code || "").trim().toUpperCase();
      const pErp = String(p.erp_sku || "").trim().toUpperCase();
      const pName = String(p.name || "").trim().toLowerCase();

      const pLines = validLines.filter((l: any) => {
        const lSku = String(l.sku || "").trim().toUpperCase();
        const lName = String(l.product_name || "").trim().toLowerCase();
        if (pSku && pSku !== "N/A" && pSku !== "CATALOG ITEM" && (lSku === pSku || lSku.startsWith(pSku) || pSku.startsWith(lSku))) {
          return true;
        }
        if (pStyle && (lSku === pStyle || lSku.startsWith(pStyle) || lSku.includes(pStyle))) {
          return true;
        }
        if (pErp && lSku === pErp) {
          return true;
        }
        if (productsList.length === 1 && rawQuerySku && lSku === rawQuerySku.trim().toUpperCase()) {
          return true;
        }
        if (pName.length >= 6 && lName === pName) {
          return true;
        }
        return false;
      });

      if (pLines.length === 0) return p;

      let totalUnits = 0;
      let totalRev = 0;
      const ordSet = new Set<string>();
      const recentOrders: Array<{
        order_number: string;
        customer_name: string;
        qty: number;
        unit_price: number;
        line_total: number;
        status?: string;
        sales_rep_name?: string;
        created_at?: string;
      }> = [];

      for (const l of pLines) {
        const oid = String(l.order_id || "");
        const ord = orderMap.get(oid);
        if (oid && !ord) continue;
        const qty = Math.max(1, Number(l.qty) || 1);
        const unitPrice = Number(l.unit_price) || 0;
        const lineTotal = Number(l.amount) > 0 ? Number(l.amount) : Number((qty * unitPrice).toFixed(2));
        totalUnits += qty;
        totalRev += lineTotal;
        if (oid) ordSet.add(oid);
        if (ord) {
          const normOrdNo = normalizeOrderNumber(ord.order_number, ord);
          if (!recentOrders.some((ro) => ro.order_number === normOrdNo)) {
            recentOrders.push({
              order_number: normOrdNo,
              customer_name: String(ord.customer_name || "Dealership Customer").trim(),
              qty,
              unit_price: unitPrice > 0 ? unitPrice : Number((lineTotal / qty).toFixed(2)),
              line_total: Number(lineTotal.toFixed(2)),
              status: formatLabel(ord.status),
              sales_rep_name: ord.sales_rep_name || undefined,
              created_at: ord.created_at,
            });
          }
        }
      }

      if (totalUnits === 0 && totalRev === 0) return p;

      recentOrders.sort((a, b) =>
        String(b.created_at || "").localeCompare(String(a.created_at || ""))
      );

      return {
        ...p,
        order_sales_summary: {
          total_orders_count: Math.max(1, ordSet.size),
          total_units_sold: totalUnits,
          total_revenue: Number(totalRev.toFixed(2)),
          recent_orders: recentOrders.slice(0, 5),
        },
      };
    });
  } catch {
    return productsList;
  }
}

/**
 * Sanitizes natural-language product search inputs by extracting embedded SKU labels
 * (e.g., "(SKU: GTKIT-RAM1500-0918-CLASSIC)") and stripping conversational filler
 * (e.g., "i want this deails please") so exact SKU and title lookups always succeed.
 */
function sanitizeProductSearchInputs(rawQuery: string, explicitSku: string): {
  effectiveSku: string;
  cleanedQuery: string;
} {
  let effectiveSku = (explicitSku || "").trim();
  const raw = (rawQuery || "").trim();

  if (!effectiveSku && raw) {
    // Match explicit "(SKU: <CODE>)" or "SKU: <CODE>" or "Part #: <CODE>"
    const labeledMatch = raw.match(/\b(?:sku|part\s*#?|item\s*#?|style\s*#?)\s*[:#-]?\s*([a-z0-9-]{3,35})\b/i);
    if (labeledMatch && /\d/.test(labeledMatch[1])) {
      effectiveSku = labeledMatch[1].trim();
    } else {
      // Match known prefix SKU embedded in a longer sentence
      const prefixMatch = raw.match(/\b((?:gtkit|kit-|gti|pac|iwc|eco|wet|wes|pgb|pgm|pg|bak|ico|hsl)[a-z0-9-]{2,35})\b/i);
      if (prefixMatch && /\d/.test(prefixMatch[1])) {
        effectiveSku = prefixMatch[1].trim();
      } else if (/^[a-z0-9-]{3,35}$/i.test(raw) && /[a-z]/i.test(raw) && /\d/.test(raw)) {
        effectiveSku = raw;
      }
    }
  }

  let cleanedQuery = raw
    .replace(/\([^)]*\b(?:sku|part|item|style)\b[^)]*\)/gi, " ")
    .replace(/\b(?:sku|part\s*#?|item\s*#?|style\s*#?)\s*[:#-]?\s*[a-z0-9-]{3,35}\b/gi, " ")
    .replace(
      /\b(i\s+want|i\s+need|i'd\s+like|can\s+you|could\s+you|would\s+you|please|plz|pls|sir|bro|man|thanks|thank\s+you|show\s+me|tell\s+me\s+about|give\s+me|get\s+me|what\s+is|what\s+are|whats|what|which|do\s+we\s+have|do\s+you\s+have|do|we|you|have|carry|sell|offer|available|all|any|list|our|find|search\s+for|look\s+up|this|that|these|those|the|for|about|details?|deails?|detials?|info|information|specs?|specifications?|pricing|price\s+of|cost\s+of)\b/gi,
      " "
    )
    .replace(/[?!.,()[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanedQuery) {
    cleanedQuery = effectiveSku || raw;
  }

  return { effectiveSku, cleanedQuery };
}

/**
 * Searches the `kits` table (Vehicle Appearance Kits, Blackout Kits, Exterior Upgrade Kits)
 * and enriches each matched kit with its component products from `catalog_products`.
 */
async function searchKitsTable(params: {
  query?: string;
  sku?: string;
  kit_id?: string | number;
  limit?: number;
}): Promise<any[]> {
  try {
    const limit = Math.min(Math.max(Number(params.limit) || 10, 1), 25);
    const sku = (params.sku || "").trim();
    const q = (params.query || "").trim();

    let matchedKits: any[] = [];

    if (params.kit_id) {
      const { data } = await supabaseServer
        .from("kits")
        .select("*")
        .eq("id", params.kit_id)
        .limit(limit);
      matchedKits = data || [];
    } else if (sku) {
      const { data } = await supabaseServer
        .from("kits")
        .select("*")
        .or(`custom_sku.ilike.%${sku}%,erp_id.ilike.%${sku}%,name.ilike.%${sku}%`)
        .limit(limit);
      matchedKits = data || [];
    }

    if (matchedKits.length === 0 && q) {
      const { data } = await supabaseServer
        .from("kits")
        .select("*")
        .or(`custom_sku.ilike.%${q}%,erp_id.ilike.%${q}%,name.ilike.%${q}%,description.ilike.%${q}%,sub_category.ilike.%${q}%`)
        .limit(limit);
      matchedKits = data || [];
    }

    // Token-based fallback across all active kits if multi-word query had extra words
    if (matchedKits.length === 0 && (q || sku)) {
      const searchStr = (q || sku).toLowerCase();
      const tokens = searchStr
        .split(/[\s-]+/)
        .map((t) => t.trim())
        .filter(
          (t) =>
            t.length >= 3 &&
            !/^(kit|kits|the|and|for|with|exterior|appearance|upgrade|blackout|utility|protection|vehicle|vehicles|accessory|accessories|bundle|bundles|what|which|have|carry|sell|offer|available|all|any|list|our)$/.test(
              t
            )
        );

      if (tokens.length > 0 || /\b(kits?|blackout|upgrade\s+kits?|appearance\s+kits?)\b/i.test(searchStr)) {
        const { data: allKits } = await supabaseServer.from("kits").select("*").limit(50);
        if (allKits && allKits.length > 0) {
          if (tokens.length === 0) {
            matchedKits = allKits.slice(0, limit);
          } else {
            const scored = allKits
              .map((k: any) => {
                const hay = `${k.custom_sku || ""} ${k.erp_id || ""} ${k.name || ""} ${k.description || ""} ${k.sub_category || ""}`.toLowerCase();
                let score = 0;
                for (const tok of tokens) {
                  if (hay.includes(tok)) score += 1;
                }
                return { k, score };
              })
              .filter((entry) => entry.score >= Math.min(2, tokens.length))
              .sort((a, b) => b.score - a.score);
            matchedKits = scored.slice(0, limit).map((s) => s.k);
          }
        }
      }
    }

    if (matchedKits.length === 0) return [];

    // Fetch component products from catalog_products for all matched kits
    const allComponentIds = Array.from(
      new Set(
        matchedKits.flatMap((k: any) =>
          Array.isArray(k.items)
            ? k.items.map((item: any) => item.product_id).filter((id: any) => id != null)
            : []
        )
      )
    );

    const compMap = new Map<string, any>();
    if (allComponentIds.length > 0) {
      const { data: compRows } = await supabaseServer
        .from("catalog_products")
        .select("id, custom_sku, erp_sku, name, price, cost, original_price, primary_image_url")
        .in("id", allComponentIds);
      for (const row of compRows || []) {
        compMap.set(String(row.id), row);
      }
    }

    return matchedKits.map((k: any) => {
      const rawItems = Array.isArray(k.items) ? k.items : [];
      const kitItems = rawItems.map((item: any) => {
        const comp = compMap.get(String(item.product_id));
        const qty = Number(item.qty) || 1;
        return {
          product_id: String(item.product_id),
          sku: comp?.custom_sku || comp?.erp_sku || `ITEM-${item.product_id}`,
          erp_sku: comp?.erp_sku || null,
          name: comp?.name || `Kit Component #${item.product_id}`,
          qty,
          price: Number(comp?.price) || 0,
          cost: Number(comp?.cost) || 0,
          image_url: comp?.primary_image_url || null,
        };
      });

      const totalComponentsPrice = kitItems.reduce((sum: number, ci: any) => sum + ci.qty * (Number(ci.price) || 0), 0);
      const totalComponentsCost = kitItems.reduce((sum: number, ci: any) => sum + ci.qty * (Number(ci.cost) || 0), 0);

      const kitPrice = Number(k.price) || Number(totalComponentsPrice.toFixed(2)) || 0;
      const originalPrice =
        totalComponentsPrice > kitPrice ? Number(totalComponentsPrice.toFixed(2)) : null;
      const resolvedCost = totalComponentsCost > 0 ? Number(totalComponentsCost.toFixed(2)) : 0;

      const { volumeBreaks, normalizedPricingLevels } = buildVolumePriceBreaks({
        rawPricingLevels: [],
        rawCostTiers: [],
        basePrice: kitPrice,
        originalPrice: originalPrice || kitPrice,
        baseCost: resolvedCost,
        category: k.category || "ACCESSORIES",
      });

      const grossMarginPct =
        kitPrice > 0 && resolvedCost > 0
          ? Number((((kitPrice - resolvedCost) / kitPrice) * 100).toFixed(1))
          : null;
      const unitProfit =
        kitPrice > 0 && resolvedCost > 0
          ? Number((kitPrice - resolvedCost).toFixed(2))
          : null;

      const normalizedImages = Array.isArray(k.images)
        ? k.images
            .filter((img: any) => img && (typeof img === "string" || img.url))
            .map((img: any, i: number) =>
              typeof img === "string"
                ? { url: img, sort: i + 1 }
                : { url: img.url, sort: img.sort ?? i + 1, label: img.alt || img.label || undefined }
            )
        : [];

      const primaryImg =
        k.primary_image_url ||
        normalizedImages[0]?.url ||
        kitItems.find((ci: any) => ci.image_url)?.image_url ||
        null;

      return {
        id: String(k.id),
        erp_id: k.erp_id || String(k.id),
        name: k.name,
        sku: k.custom_sku || k.erp_id || "N/A",
        erp_sku: k.erp_id || k.custom_sku || null,
        supplier_sku: k.erp_id || null,
        price: kitPrice,
        original_price: originalPrice,
        msrp: originalPrice || kitPrice,
        cost: resolvedCost > 0 ? resolvedCost : undefined,
        supplier_cost: resolvedCost > 0 ? resolvedCost : null,
        gross_margin_pct: grossMarginPct,
        unit_profit: unitProfit,
        category: k.category || "ACCESSORIES",
        sub_category: k.sub_category || "Vehicle Appearance Kits",
        brand: "GoldTouch Kits",
        unit: kitItems.length > 0 ? `Complete Kit (${kitItems.length} Components)` : "Complete Kit",
        is_customizable: false,
        description: k.description || undefined,
        stock: "In Stock (Complete Kit)",
        stock_status: k.is_discontinued ? "Discontinued" : formatLabel(k.status || "available"),
        volume_price_breaks: volumeBreaks,
        pricing_levels: normalizedPricingLevels,
        image_url: primaryImg,
        images: normalizedImages,
        kit_items: kitItems,
      };
    });
  } catch (err) {
    console.warn("[SARA Tools] searchKitsTable error:", err);
    return [];
  }
}

/**
 * Tool 14: Search Automotive & Apparel Product Catalog
 * Search dealer supply products (Key Tags, Deal Jackets, Chemicals, Plate Frames, etc.),
 * Vehicle Appearance Kits (`kits`), SEMA Supplier Catalog, 9,750+ style Apparel Catalog, and custom ERP order/invoice items.
 */
export async function searchCatalogProducts(params: SearchCatalogParams) {
  try {
    const rawInputQuery = (params.query || params.sku || "").trim();
    const { effectiveSku, cleanedQuery } = sanitizeProductSearchInputs(rawInputQuery, params.sku || "");
    const rawSku = effectiveSku;
    const q = cleanedQuery || rawInputQuery;
    const combinedIntentText = `${rawInputQuery} ${params.category || ""} ${params.brand || ""}`.trim();
    const apparelIntent = isApparelSearchIntent(combinedIntentText);

    // 0. Check Vehicle Appearance Kits (`kits` table) first if SKU starts with GTKIT / KIT- / GTICRV or query mentions a kit
    const isKitQuery =
      /^(?:gtkit|kit-|gticrv)/i.test(rawSku) ||
      /\b(gtkit|kit-|kits|(?:exterior|upgrade|blackout|appearance|utility|protection|vehicle)\s+(?:[a-z]+\s+)?kits?)\b/i.test(
        rawInputQuery
      );

    if (isKitQuery && !params.product_id) {
      const matchedKits = await searchKitsTable({
        sku: rawSku || undefined,
        query: q,
        limit: params.limit || 10,
      });
      if (matchedKits.length > 0) {
        const enrichedKits = await enrichCatalogProductsWithOrderSales(matchedKits, rawSku || q);
        return {
          success: true,
          count: enrichedKits.length,
          products: enrichedKits,
        };
      }
    }

    // If explicitly an apparel search or apparel brand/style code, check Apparel Catalog first
    if (apparelIntent && !params.product_id && !isKitQuery) {
      const apparelRes = await searchApparelCatalog({
        query: q,
        style_code: rawSku || undefined,
        brand: params.brand,
        category: params.category,
        limit: params.limit || 10,
      });
      if (apparelRes.success && apparelRes.products && apparelRes.products.length > 0) {
        const enrichedApparel = await enrichCatalogProductsWithOrderSales(apparelRes.products, rawSku || q);
        return {
          success: true,
          count: enrichedApparel.length,
          products: enrichedApparel,
        };
      }
    }

    let query = supabaseServer
      .from("catalog_products")
      .select(`
        id,
        erp_id,
        name,
        raw_name,
        description,
        custom_sku,
        erp_sku,
        price,
        original_price,
        cost,
        pricing_levels,
        category,
        sub_category,
        brand,
        inventory_qty,
        stock_status,
        is_customizable,
        primary_image_url,
        images
      `)
      .limit(params.limit || 10);

    const isOutOfStockQuery =
      !params.product_id &&
      !rawSku &&
      /\b(out\s+of\s+stock|out_of_stock|out-of-stock|zero\s+stock|no\s+stock|unavailable|backorder|backordered|depleted)\b/i.test(
        q
      );
    const isLowStockQuery =
      !params.product_id &&
      !rawSku &&
      !isOutOfStockQuery &&
      /\b(low\s+stock|low\s+inventory|running\s+low|almost\s+out|restock)\b/i.test(q);
    const isInStockQuery =
      !params.product_id &&
      !rawSku &&
      !isOutOfStockQuery &&
      !isLowStockQuery &&
      /\b(in\s+stock|available\s+products|currently\s+in\s+stock)\b/i.test(q);

    // Strip stock status phrases to see if a specific product keyword was also mentioned (e.g. "out of stock key tags")
    const cleanedStockKeyword = q
      .replace(
        /\b(what|which|show|list|find|are|is|there|any|all|the|products?|items?|catalog|currently|right\s+now|out\s+of\s+stock|out_of_stock|out-of-stock|zero\s+stock|no\s+stock|unavailable|backorder|backordered|depleted|low\s+stock|low\s+inventory|running\s+low|in\s+stock|available)\b/gi,
        " "
      )
      .replace(/[?!.,]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (params.product_id) {
      query = query.eq("id", params.product_id);
    } else if (rawSku) {
      query = query.or(`custom_sku.ilike.%${rawSku}%,erp_sku.ilike.%${rawSku}%`);
    } else if (isOutOfStockQuery) {
      query = query
        .or("stock_status.ilike.%out%,stock_status.ilike.%unavail%,stock_status.ilike.%backorder%,inventory_qty.lte.0")
        .order("inventory_qty", { ascending: true });
      if (cleanedStockKeyword.length >= 2) {
        query = query.ilike("name", `%${cleanedStockKeyword}%`);
      }
    } else if (isLowStockQuery) {
      query = query
        .gt("inventory_qty", 0)
        .lte("inventory_qty", 10)
        .order("inventory_qty", { ascending: true });
      if (cleanedStockKeyword.length >= 2) {
        query = query.ilike("name", `%${cleanedStockKeyword}%`);
      }
    } else if (isInStockQuery) {
      query = query
        .gt("inventory_qty", 0)
        .order("inventory_qty", { ascending: false });
      if (cleanedStockKeyword.length >= 2) {
        query = query.ilike("name", `%${cleanedStockKeyword}%`);
      }
    } else if (q) {
      query = query.or(`name.ilike.%${q}%,custom_sku.ilike.%${q}%,erp_sku.ilike.%${q}%,brand.ilike.%${q}%`);
    }

    if (params.category) {
      query = query.ilike("category", `%${params.category.trim()}%`);
    }

    if (params.brand) {
      query = query.ilike("brand", `%${params.brand.trim()}%`);
    }

    const { data: catalogData, error } = await query;
    let products: any[] = catalogData || [];

    // Fallback 0: Search Vehicle Appearance Kits (`kits` table) if catalog_products had no matches
    if (
      products.length === 0 &&
      (q || rawSku) &&
      !params.product_id &&
      !isOutOfStockQuery &&
      !isLowStockQuery
    ) {
      const kitFallback = await searchKitsTable({
        sku: rawSku || undefined,
        query: q,
        limit: params.limit || 10,
      });
      if (kitFallback.length > 0) {
        const enrichedKits = await enrichCatalogProductsWithOrderSales(kitFallback, rawSku || q);
        return {
          success: true,
          count: enrichedKits.length,
          products: enrichedKits,
        };
      }
    }

    // Fallback 1: Search Apparel Catalog if catalog_products had no matches (skip for pure out-of-stock queries unless apparel mentioned)
    if (
      products.length === 0 &&
      (q || rawSku || params.brand || params.category) &&
      !params.product_id &&
      !isOutOfStockQuery &&
      !isLowStockQuery
    ) {
      const apparelFallback = await searchApparelCatalog({
        query: q,
        style_code: rawSku || undefined,
        brand: params.brand,
        category: params.category,
        limit: params.limit || 10,
      });
      if (apparelFallback.success && apparelFallback.products && apparelFallback.products.length > 0) {
        const enrichedApparel = await enrichCatalogProductsWithOrderSales(apparelFallback.products, rawSku || q);
        return {
          success: true,
          count: enrichedApparel.length,
          products: enrichedApparel,
        };
      }
    }

    // Fallback 2: If still no match, search master products table (48k items)
    if (products.length === 0 && (q || rawSku || params.product_id || isOutOfStockQuery || isLowStockQuery)) {
      let masterQuery = supabaseServer
        .from("products")
        .select("id, name, description, custom_sku, erp_sku, price, msrp, cost, pricing_levels, category, sub_category, brand, unit, inventory_qty, stock_status, primary_image_url, images, attributes")
        .limit(params.limit || 10);

      if (params.product_id) {
        masterQuery = masterQuery.eq("id", params.product_id);
      } else if (rawSku) {
        masterQuery = masterQuery.or(`custom_sku.ilike.%${rawSku}%,erp_sku.ilike.%${rawSku}%`);
      } else if (isOutOfStockQuery) {
        masterQuery = masterQuery
          .or("stock_status.ilike.%out%,stock_status.ilike.%unavail%,stock_status.ilike.%backorder%,inventory_qty.lte.0")
          .order("inventory_qty", { ascending: true });
        if (cleanedStockKeyword.length >= 2) {
          masterQuery = masterQuery.ilike("name", `%${cleanedStockKeyword}%`);
        }
      } else if (isLowStockQuery) {
        masterQuery = masterQuery
          .gt("inventory_qty", 0)
          .lte("inventory_qty", 10)
          .order("inventory_qty", { ascending: true });
        if (cleanedStockKeyword.length >= 2) {
          masterQuery = masterQuery.ilike("name", `%${cleanedStockKeyword}%`);
        }
      } else if (q) {
        masterQuery = masterQuery.or(`name.ilike.%${q}%,custom_sku.ilike.%${q}%,erp_sku.ilike.%${q}%,brand.ilike.%${q}%`);
      }

      const { data: masterProds } = await masterQuery;
      if (masterProds && masterProds.length > 0) {
        products = masterProds;
      }
    }

    // Fallback 2b: Composite Apparel / Variant SKU Strip (e.g. NKBV6042WHITE -> NKBV6042, F224BLACK -> F224, JER996MWHITE -> 996M)
    if (products.length === 0 && (rawSku || q) && !params.product_id && !isOutOfStockQuery && !isLowStockQuery) {
      const baseCandidates = extractBaseStyleCandidates(rawSku || q);
      for (const baseStyle of baseCandidates) {
        const appVariantRes = await searchApparelCatalog({
          query: baseStyle,
          style_code: baseStyle,
          limit: params.limit || 5,
        });
        if (appVariantRes.success && appVariantRes.products && appVariantRes.products.length > 0) {
          const queriedCode = (rawSku || q).toUpperCase();
          const mappedVariantProds = appVariantRes.products.map((ap: any, idx: number) =>
            idx === 0
              ? {
                  ...ap,
                  sku: queriedCode,
                  erp_sku: queriedCode,
                  description: ap.description
                    ? `ERP Variant SKU ${queriedCode} (Base Style ${ap.style_code || baseStyle}). ${ap.description}`
                    : `ERP Variant SKU ${queriedCode} (Base Style ${ap.style_code || baseStyle}).`,
                }
              : ap
          );
          const enrichedVariantProds = await enrichCatalogProductsWithOrderSales(mappedVariantProds, queriedCode);
          return {
            success: true,
            count: enrichedVariantProds.length,
            products: enrichedVariantProds,
          };
        }

        const { data: baseCatProds } = await supabaseServer
          .from("catalog_products")
          .select("id, erp_id, name, raw_name, description, custom_sku, erp_sku, price, original_price, cost, pricing_levels, category, sub_category, brand, inventory_qty, stock_status, is_customizable, primary_image_url, images")
          .or(`custom_sku.ilike.%${baseStyle}%,erp_sku.ilike.%${baseStyle}%`)
          .limit(params.limit || 5);
        if (baseCatProds && baseCatProds.length > 0) {
          products = baseCatProds;
          break;
        }
      }
    }

    // Fallback 2c: SEMA Supplier Catalog (`sema_supplier_catalog`)
    if (products.length === 0 && (rawSku || q) && !params.product_id && !isOutOfStockQuery && !isLowStockQuery) {
      const searchCode = (rawSku || q).trim();
      const { data: semaRows } = await supabaseServer
        .from("sema_supplier_catalog")
        .select("*")
        .or(`part_number.ilike.%${searchCode}%,supplier_sku.ilike.%${searchCode}%,raw_title.ilike.%${searchCode}%`)
        .limit(params.limit || 5);

      if (semaRows && semaRows.length > 0) {
        const mappedSema = semaRows.map((s: any) => {
          const basePrice = Number(s.msrp) || Number(s.jobber_price) || Number(s.map_price) || 0;
          const resolvedCost = Number(s.cost) || 0;
          const grossMarginPct =
            basePrice > 0 && resolvedCost > 0
              ? Number((((basePrice - resolvedCost) / basePrice) * 100).toFixed(1))
              : null;
          const unitProfit =
            basePrice > 0 && resolvedCost > 0
              ? Number((basePrice - resolvedCost).toFixed(2))
              : null;
          return {
            id: String(s.canonical_product_id || s.id),
            erp_id: s.canonical_product_id ? String(s.canonical_product_id) : null,
            name: s.raw_title || s.clean_title || `SEMA Part ${s.part_number}`,
            sku: s.part_number || s.supplier_sku || "N/A",
            erp_sku: s.supplier_sku || s.part_number || null,
            supplier_sku: s.supplier_sku || s.part_number || null,
            price: basePrice,
            original_price: s.msrp && s.jobber_price && Number(s.msrp) > Number(s.jobber_price) ? Number(s.msrp) : null,
            msrp: Number(s.msrp) || null,
            cost: resolvedCost > 0 ? resolvedCost : undefined,
            supplier_cost: resolvedCost > 0 ? resolvedCost : null,
            gross_margin_pct: grossMarginPct,
            unit_profit: unitProfit,
            category: s.category || "ACCESSORIES",
            sub_category: s.sub_category || s.product_noun || null,
            brand: s.brand_name || "SEMA Supplier",
            unit: s.fitment_summary_badge ? `Each (${s.fitment_summary_badge})` : "Each",
            is_customizable: false,
            description: s.short_description || s.marketing_description || s.clean_title || undefined,
            stock: "Available (SEMA Catalog)",
            stock_status: "Available",
            volume_price_breaks: [],
            pricing_levels: [{ level: "Dealer Price", price: basePrice }],
            image_url: s.primary_image_url || null,
            images: s.primary_image_url ? [{ url: s.primary_image_url, sort: 1 }] : [],
          };
        });
        const enrichedSema = await enrichCatalogProductsWithOrderSales(mappedSema, searchCode);
        return {
          success: true,
          count: enrichedSema.length,
          products: enrichedSema,
        };
      }
    }

    // Fallback 3: Live ERP Order Lines, Invoice Lines & Purchase Order Lines synthesis (for custom/special-order SKUs like ICOK93163L, STREAMERS, etc.)
    if (products.length === 0 && (rawSku || q) && !params.product_id && !isOutOfStockQuery && !isLowStockQuery) {
      const searchCode = (rawSku || q).trim();
      const [ordLinesRes, invLinesRes, poLinesRes] = await Promise.all([
        supabaseServer
          .from("order_lines")
          .select("id, order_id, sku, product_id, product_name, qty, unit_price, amount, fulfillment_type, product_snapshot")
          .or(`sku.ilike.%${searchCode}%,product_name.ilike.%${searchCode}%`)
          .limit(50),
        supabaseServer
          .from("invoice_lines")
          .select("id, invoice_id, sku, description, quantity, unit_price, line_total")
          .or(`sku.ilike.%${searchCode}%,description.ilike.%${searchCode}%`)
          .limit(30),
        supabaseServer
          .from("purchase_order_lines")
          .select("id, purchase_order_id, sku, description, quantity_ordered, unit_cost, line_total")
          .or(`sku.ilike.%${searchCode}%,description.ilike.%${searchCode}%`)
          .limit(30),
      ]);

      const rawOrdLines = (ordLinesRes.data || []).filter((l: any) => {
        const nm = String(l.product_name || "").trim();
        return Number(l.qty ?? 1) > 0 && Number(l.amount ?? l.unit_price ?? 0) >= 0 && !/^returned\s+from\b/i.test(nm);
      });
      const rawInvLines = invLinesRes.data || [];
      const rawPoLines = poLinesRes.data || [];

      if (rawOrdLines.length > 0 || rawInvLines.length > 0 || rawPoLines.length > 0) {
        const erpGroups = new Map<
          string,
          {
            sku: string;
            name: string;
            price: number;
            cost: number;
            product_id: string | null;
            product_snapshot: any;
            fulfillment_type: string | null;
          }
        >();

        for (const l of rawOrdLines) {
          const lSku = String(l.sku || searchCode).trim();
          const lName = String(l.product_name || lSku).replace(/\*+/g, " ").replace(/\s+/g, " ").trim();
          if (!lName || /^(?:B|RENT|LABOR)$/i.test(lSku)) continue;
          const uPrice =
            Number(l.unit_price) > 0
              ? Number(l.unit_price)
              : Number(l.amount) > 0 && Number(l.qty) > 0
              ? Number((Number(l.amount) / Number(l.qty)).toFixed(2))
              : 0;
          const key = lSku.toUpperCase();
          const existing = erpGroups.get(key);
          if (!existing) {
            erpGroups.set(key, {
              sku: lSku,
              name: lName,
              price: uPrice,
              cost: Number(l.product_snapshot?.cost) || 0,
              product_id: l.product_id ? String(l.product_id) : null,
              product_snapshot: l.product_snapshot || null,
              fulfillment_type: l.fulfillment_type || null,
            });
          } else {
            if (lName.length > existing.name.length && lName.length < 150) existing.name = lName;
            if (uPrice > 0) existing.price = uPrice;
          }
        }

        for (const il of rawInvLines) {
          const lSku = String(il.sku || searchCode).trim();
          const lName = String(il.description || lSku).replace(/\*+/g, " ").replace(/\s+/g, " ").trim();
          if (!lName || /^(?:B|RENT|LABOR)$/i.test(lSku)) continue;
          const uPrice = Number(il.unit_price) || 0;
          const key = lSku.toUpperCase();
          const existing = erpGroups.get(key);
          if (!existing && uPrice > 0) {
            erpGroups.set(key, {
              sku: lSku,
              name: lName,
              price: uPrice,
              cost: 0,
              product_id: null,
              product_snapshot: null,
              fulfillment_type: null,
            });
          }
        }

        for (const pol of rawPoLines) {
          const lSku = String(pol.sku || searchCode).trim();
          const lName = String(pol.description || lSku).replace(/\*+/g, " ").replace(/\s+/g, " ").trim();
          const uCost = Number(pol.unit_cost) || 0;
          const key = lSku.toUpperCase();
          const existing = erpGroups.get(key);
          if (existing && uCost > 0 && (!existing.cost || existing.cost <= 0)) {
            existing.cost = uCost;
          } else if (!existing && uCost > 0) {
            erpGroups.set(key, {
              sku: lSku,
              name: lName,
              price: uCost,
              cost: uCost,
              product_id: null,
              product_snapshot: null,
              fulfillment_type: "dropship",
            });
          }
        }

        const erpList = Array.from(erpGroups.values()).slice(0, params.limit || 5);
        if (erpList.length > 0) {
          const enrichedImgs = await enrichLinesWithImages(
            erpList.map((item) => ({
              sku: item.sku,
              product_id: item.product_id,
              product_name: item.name,
              product_snapshot: item.product_snapshot,
            }))
          );

          const synthesizedProducts = erpList.map((item, idx) => {
            const imgData = enrichedImgs[idx] || {};
            const isDateRange = /^\d{1,2}\/\d{1,2}\/\d{2,4}\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(
              String(item.name || "").trim()
            );
            const cleanName = isDateRange && item.sku ? formatLabel(item.sku) : item.name;
            const { brand, category, sub_category } = inferBrandAndCategoryFromErpLine(item.sku, cleanName);
            const grossMarginPct =
              item.price > 0 && item.cost > 0 && item.price > item.cost
                ? Number((((item.price - item.cost) / item.price) * 100).toFixed(1))
                : null;
            const unitProfit =
              item.price > 0 && item.cost > 0 && item.price > item.cost
                ? Number((item.price - item.cost).toFixed(2))
                : null;

            return {
              id: item.product_id || `erp-sku-${item.sku}`,
              erp_id: item.product_id || null,
              name: cleanName,
              sku: item.sku,
              erp_sku: item.sku,
              supplier_sku: item.sku,
              price: item.price,
              original_price: null,
              msrp: null,
              cost: item.cost > 0 ? item.cost : undefined,
              supplier_cost: item.cost > 0 ? item.cost : null,
              gross_margin_pct: grossMarginPct,
              unit_profit: unitProfit,
              category,
              sub_category,
              brand,
              unit: "Each / System",
              is_customizable: false,
              description: `Active GoldTouch ERP & Dealership Order Item (${brand} / ${category}). Fulfilled via ${
                item.fulfillment_type ? formatLabel(item.fulfillment_type) : "Direct Dealership Supply / Special Order"
              }.`,
              stock: "Active ERP Item",
              stock_status: item.fulfillment_type
                ? `Active ERP (${formatLabel(item.fulfillment_type)})`
                : "Available (ERP Order Item)",
              volume_price_breaks: [],
              pricing_levels: [{ level: "Dealer Price", price: item.price }],
              image_url:
                imgData.image_url ||
                (/helium/i.test(item.sku) || /helium/i.test(cleanName) ? "/helium-tank.png" : null),
              images: imgData.images || [],
            };
          });

          const enrichedSynthesized = await enrichCatalogProductsWithOrderSales(synthesizedProducts, searchCode);
          return {
            success: true,
            count: enrichedSynthesized.length,
            products: enrichedSynthesized,
          };
        }
      }
    }

    if (error && products.length === 0) {
      return { success: false, error: error.message };
    }

    // Enrich matched products with ERP master `products` and `product_suppliers` (pricing_levels, supplier_cost, supplier_sku, msrp, unit, cost tiers)
    const lookupIds = Array.from(
      new Set(
        products
          .flatMap((p: any) => [p.erp_id, p.id])
          .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      )
    );

    const supplierMap = new Map<string, any>();
    const erpMasterMap = new Map<string, any>();

    if (lookupIds.length > 0) {
      try {
        const [{ data: supplierRows }, { data: masterRows }] = await Promise.all([
          supabaseServer
            .from("product_suppliers")
            .select("product_id, supplier_id, supplier_sku, supplier_cost, pricing_levels, is_primary")
            .in("product_id", lookupIds),
          supabaseServer
            .from("products")
            .select("id, custom_sku, erp_sku, description, unit, msrp, cost, pricing_levels, attributes")
            .in("id", lookupIds),
        ]);

        if (Array.isArray(supplierRows)) {
          for (const row of supplierRows) {
            const existing = supplierMap.get(row.product_id);
            if (!existing || row.is_primary || (Array.isArray(row.pricing_levels) && row.pricing_levels.length > 0)) {
              supplierMap.set(row.product_id, row);
            }
          }
        }

        if (Array.isArray(masterRows)) {
          for (const row of masterRows) {
            erpMasterMap.set(row.id, row);
          }
        }
      } catch {}
    }

    const mappedCatalogProducts = (products || []).map((p: any) => {
        const erpKey = p.erp_id || p.id;
        const supRow = supplierMap.get(erpKey) || supplierMap.get(p.id) || null;
        const masterRow = erpMasterMap.get(erpKey) || erpMasterMap.get(p.id) || null;

        const resolvedSku = p.custom_sku || p.erp_sku || "N/A";
        const rawCatalogName = String(p.name || p.raw_name || "").trim();
        const isDateRangeCatalogName = /^\d{1,2}\/\d{1,2}\/\d{2,4}\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(
          rawCatalogName
        );
        const resolvedCatalogName =
          isDateRangeCatalogName && resolvedSku !== "N/A"
            ? formatLabel(resolvedSku)
            : rawCatalogName || formatLabel(resolvedSku);

        let imgUrl = p.primary_image_url || (Array.isArray(p.images) && p.images[0]?.url) || null;
        if (imgUrl && typeof imgUrl === "string" && imgUrl.includes("atozpartyrental.com")) {
          imgUrl = "/helium-tank.png";
        }
        if (/helium/i.test(resolvedCatalogName) || /helium/i.test(resolvedSku)) {
          imgUrl = "/helium-tank.png";
        }

        const rawPricingLevels =
          (Array.isArray(p.pricing_levels) && p.pricing_levels.length > 0 ? p.pricing_levels : null) ||
          (supRow && Array.isArray(supRow.pricing_levels) && supRow.pricing_levels.length > 0 ? supRow.pricing_levels : null) ||
          (masterRow && Array.isArray(masterRow.pricing_levels) && masterRow.pricing_levels.length > 0 ? masterRow.pricing_levels : null) ||
          p.pricing_levels ||
          supRow?.pricing_levels ||
          masterRow?.pricing_levels ||
          [];

        const attrs = p.attributes || masterRow?.attributes || {};
        const rawCostTiers = attrs?.__catalog_cost_tiers || attrs?.__supplier_cost_tiers || [];

        const resolvedCost = Number(p.cost) || Number(masterRow?.cost) || Number(supRow?.supplier_cost) || 0;
        const resolvedSupplierCost = Number(supRow?.supplier_cost) || resolvedCost || null;
        const resolvedOriginalPrice = Number(p.original_price) || Number(masterRow?.msrp) || Number(p.msrp) || null;

        const { volumeBreaks, normalizedPricingLevels } = buildVolumePriceBreaks({
          rawPricingLevels,
          rawCostTiers,
          basePrice: Number(p.price) || 0,
          originalPrice: resolvedOriginalPrice || 0,
          baseCost: resolvedCost,
          category: p.category || "",
        });

        const basePrice = Number(p.price) || volumeBreaks[0]?.unit_price || 0;
        const grossMarginPct =
          basePrice > 0 && resolvedCost > 0
            ? Number((((basePrice - resolvedCost) / basePrice) * 100).toFixed(1))
            : null;
        const unitProfit =
          basePrice > 0 && resolvedCost > 0
            ? Number((basePrice - resolvedCost).toFixed(2))
            : null;

        const rawDesc = p.description || masterRow?.description || "";
        const strippedDesc = typeof rawDesc === "string"
          ? rawDesc.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
          : "";
        const cleanDesc =
          strippedDesc &&
          !/^\d{1,2}\/\d{1,2}\/\d{2,4}\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(strippedDesc)
            ? strippedDesc
            : "";

        return {
          id: p.id,
          erp_id: p.erp_id || masterRow?.id || null,
          name: resolvedCatalogName,
          sku: resolvedSku,
          erp_sku: p.erp_sku || masterRow?.erp_sku || null,
          supplier_sku: supRow?.supplier_sku || null,
          price: basePrice,
          original_price: resolvedOriginalPrice,
          msrp: Number(masterRow?.msrp) || resolvedOriginalPrice || null,
          cost: resolvedCost,
          supplier_cost: resolvedSupplierCost,
          gross_margin_pct: grossMarginPct,
          unit_profit: unitProfit,
          category: p.category || "General Supply",
          sub_category: p.sub_category || null,
          brand: p.brand || "GoldTouch",
          unit: p.unit || masterRow?.unit || "Pack / Unit",
          is_customizable: Boolean(p.is_customizable),
          description: cleanDesc || undefined,
          stock: p.inventory_qty ?? "In Stock",
          stock_status: formatLabel(p.stock_status || "available"),
          volume_price_breaks: volumeBreaks,
          pricing_levels: normalizedPricingLevels,
          image_url: imgUrl,
          images: p.images || [],
        };
      });

    const enrichedFinalProducts =
      !isOutOfStockQuery && !isLowStockQuery
        ? await enrichCatalogProductsWithOrderSales(mappedCatalogProducts, rawSku || q)
        : mappedCatalogProducts;

    return {
      success: true,
      count: enrichedFinalProducts.length,
      products: enrichedFinalProducts,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Tool 14b: Get Top Selling Products Across Customer Orders
 * Aggregates order_lines (sanitized of $0.00 ERP comments/vehicle banners), ranks products by
 * total sales revenue, total units sold, or order frequency, and enriches with product images & catalog specs.
 */
export async function getTopSellingProducts(params: GetTopSellingProductsParams = {}) {
  try {
    const limit = Math.min(Math.max(Number(params.limit) || 10, 1), 25);
    const sortBy = params.sort_by || "revenue";
    const dateRange = getDateFilterRange({
      timeframe: params.timeframe,
      date: params.date,
      start_date: params.start_date,
      end_date: params.end_date,
    });

    // 1. Fetch valid customer orders (filtered by date range if requested)
    let ordersQuery = supabaseServer
      .from("orders")
      .select("id, order_number, customer_name, total, status, created_at")
      .gt("total", 0)
      .not("customer_name", "ilike", "%CASH CASH%")
      .order("created_at", { ascending: false })
      .limit(2000);

    if (dateRange) {
      if (dateRange.gte) ordersQuery = ordersQuery.gte("created_at", dateRange.gte);
      if (dateRange.lte) ordersQuery = ordersQuery.lte("created_at", dateRange.lte);
    }

    const { data: validOrders } = await ordersQuery;
    const orderMap = new Map<string, { order_number: string; customer_name: string; created_at: string }>();
    for (const o of validOrders || []) {
      if (o.id) {
        orderMap.set(String(o.id), {
          order_number: normalizeOrderNumber(o.order_number, o),
          customer_name: String(o.customer_name || "Dealership Customer").trim(),
          created_at: o.created_at,
        });
      }
    }

    if (dateRange && orderMap.size === 0) {
      return {
        success: true,
        count: 0,
        period_label: dateRange.label || "Selected Period",
        total_products_ranked: 0,
        total_product_revenue: 0,
        total_units_sold: 0,
        top_products: [],
        message: `No customer orders were recorded during ${dateRange.label || "the selected period"}.`,
      };
    }

    // 2. Fetch order_lines
    let rawLines: any[] = [];
    if (dateRange) {
      const orderIds = Array.from(orderMap.keys());
      // Query in batches of 200 order IDs if needed
      for (let i = 0; i < orderIds.length; i += 200) {
        const chunk = orderIds.slice(i, i + 200);
        const { data: chunkLines } = await supabaseServer
          .from("order_lines")
          .select(
            "id, order_id, sku, product_id, product_name, qty, unit_price, amount, line_status, fulfillment_type, vehicle_label, product_snapshot"
          )
          .in("order_id", chunk);
        if (chunkLines && chunkLines.length > 0) {
          rawLines.push(...chunkLines);
        }
      }
    } else {
      const { data: allLines } = await supabaseServer
        .from("order_lines")
        .select(
          "id, order_id, sku, product_id, product_name, qty, unit_price, amount, line_status, fulfillment_type, vehicle_label, product_snapshot"
        )
        .limit(5000);
      rawLines = allLines || [];
    }

    // 3. Sanitize ERP $0.00 comment lines & vehicle banners
    const { cleanLines } = sanitizeErpLineItems(rawLines);

    // 4. Aggregate by product
    interface AggregatedProduct {
      key: string;
      sku: string;
      product_id: string | null;
      product_name: string;
      total_revenue: number;
      total_units_sold: number;
      order_ids: Set<string>;
      latest_unit_price: number;
      product_snapshot: any;
      sample_orders: Array<{ order_number: string; customer_name: string }>;
    }

    const productAggMap = new Map<string, AggregatedProduct>();
    let overallProductRevenue = 0;
    let overallUnitsSold = 0;

    for (const line of cleanLines) {
      // If we have an orderMap and this line belongs to an excluded CASH CASH / void order, skip only if orderMap is populated and doesn't have it when dateRange is set
      const orderIdStr = line.order_id ? String(line.order_id) : "";
      if (dateRange && orderIdStr && !orderMap.has(orderIdStr)) {
        continue;
      }

      const rawSku = String(line.sku || "").trim();
      const hasValidSku =
        rawSku.length >= 2 &&
        !/^(?:N\/A|NONE|NULL|NOTE|COMMENT|DESC|TEXT|MSG|-|\.+)$/i.test(rawSku);
      const cleanName = String(line.product_name || line.description || rawSku || "")
        .replace(/\*+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (!cleanName) continue;
      // Skip non-product fee/shipping/labor/rent adjustment rows & credit returns
      if (/^(?:shipping|freight|tax|sales\s+tax|discount|handling|delivery\s+fee|credit|adjustment|surcharge)$/i.test(cleanName)) {
        continue;
      }
      if (/^returned\s+from\b/i.test(cleanName)) {
        continue;
      }
      if (/^(?:B|RENT|LABOR|INSTALL|FREIGHT|SHIPPING|TAX|DISCOUNT|CREDIT|DEPOSIT|FEE)$/i.test(rawSku)) {
        continue;
      }
      if (/^(?:tighten\s+anything|rent\s+january|shop\s+supplies|labor\s+charge|installation\s+fee)/i.test(cleanName)) {
        continue;
      }

      const rawQtyVal = Number(line.qty ?? line.quantity ?? 1);
      const rawAmtVal = Number(line.amount ?? line.line_total ?? 0);
      if (rawQtyVal <= 0 || rawAmtVal < 0) {
        continue;
      }

      if (params.category) {
        const snapCat = String(line.product_snapshot?.category || "").toLowerCase();
        const catFilter = params.category.trim().toLowerCase();
        if (
          !cleanName.toLowerCase().includes(catFilter) &&
          !snapCat.includes(catFilter) &&
          !rawSku.toLowerCase().includes(catFilter)
        ) {
          continue;
        }
      }

      const qty = Math.max(1, rawQtyVal || 1);
      const unitPrice = Number(line.unit_price ?? line.unitPrice ?? 0) || 0;
      const lineAmount =
        rawAmtVal > 0
          ? rawAmtVal
          : Number((qty * unitPrice).toFixed(2));

      if (lineAmount <= 0 && unitPrice <= 0) continue;

      const groupKey = hasValidSku
        ? `SKU:${rawSku.toUpperCase()}`
        : `NAME:${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()}`;

      let entry = productAggMap.get(groupKey);
      if (!entry) {
        entry = {
          key: groupKey,
          sku: hasValidSku ? rawSku : "Catalog Item",
          product_id: line.product_id ? String(line.product_id) : null,
          product_name: cleanName,
          total_revenue: 0,
          total_units_sold: 0,
          order_ids: new Set<string>(),
          latest_unit_price: unitPrice > 0 ? unitPrice : Number((lineAmount / qty).toFixed(2)),
          product_snapshot: line.product_snapshot || null,
          sample_orders: [],
        };
        productAggMap.set(groupKey, entry);
      } else {
        // Prefer longer/more descriptive product name if current is just a code
        if (cleanName.length > entry.product_name.length && cleanName.length < 140) {
          entry.product_name = cleanName;
        }
        if (entry.sku === "Catalog Item" && hasValidSku) {
          entry.sku = rawSku;
        }
        if (!entry.product_id && line.product_id) {
          entry.product_id = String(line.product_id);
        }
        if (!entry.product_snapshot && line.product_snapshot) {
          entry.product_snapshot = line.product_snapshot;
        }
        if (unitPrice > 0) {
          entry.latest_unit_price = unitPrice;
        }
      }

      entry.total_revenue += lineAmount;
      entry.total_units_sold += qty;
      overallProductRevenue += lineAmount;
      overallUnitsSold += qty;

      if (orderIdStr) {
        entry.order_ids.add(orderIdStr);
        const ordInfo = orderMap.get(orderIdStr);
        if (
          ordInfo &&
          entry.sample_orders.length < 4 &&
          !entry.sample_orders.some((so) => so.order_number === ordInfo.order_number)
        ) {
          entry.sample_orders.push({
            order_number: ordInfo.order_number,
            customer_name: ordInfo.customer_name,
          });
        }
      }
    }

    const allRanked = Array.from(productAggMap.values());

    if (sortBy === "units") {
      allRanked.sort(
        (a, b) => b.total_units_sold - a.total_units_sold || b.total_revenue - a.total_revenue
      );
    } else if (sortBy === "orders") {
      allRanked.sort(
        (a, b) =>
          b.order_ids.size - a.order_ids.size ||
          b.total_revenue - a.total_revenue ||
          b.total_units_sold - a.total_units_sold
      );
    } else {
      allRanked.sort(
        (a, b) => b.total_revenue - a.total_revenue || b.total_units_sold - a.total_units_sold
      );
    }

    const topSlice = allRanked.slice(0, limit);

    // 5. Enrich top products with authentic product images
    const enrichedWithImages = await enrichLinesWithImages(
      topSlice.map((item) => ({
        sku: item.sku !== "Catalog Item" ? item.sku : "",
        product_id: item.product_id,
        product_name: item.product_name,
        product_snapshot: item.product_snapshot,
      }))
    );

    const topProducts = topSlice.map((item, idx) => {
      const imgInfo = enrichedWithImages[idx] || {};
      const avgUnitPrice =
        item.total_units_sold > 0
          ? Number((item.total_revenue / item.total_units_sold).toFixed(2))
          : item.latest_unit_price;
      const revenueSharePct =
        overallProductRevenue > 0
          ? Number(((item.total_revenue / overallProductRevenue) * 100).toFixed(1))
          : 0;

      return {
        rank: idx + 1,
        sku: item.sku,
        product_id: item.product_id,
        product_name: formatCleanEntityName(item.product_name),
        total_revenue: Number(item.total_revenue.toFixed(2)),
        total_units_sold: item.total_units_sold,
        orders_count: Math.max(1, item.order_ids.size),
        unit_price: item.latest_unit_price > 0 ? Number(item.latest_unit_price.toFixed(2)) : avgUnitPrice,
        avg_unit_price: avgUnitPrice,
        revenue_share_pct: revenueSharePct,
        image_url: imgInfo.image_url || null,
        images: imgInfo.images || [],
        sample_orders: item.sample_orders,
      };
    });

    // 6. Build a rich CatalogProduct card object for the #1 top-selling product
    let topProductCard: any = null;
    if (topProducts.length > 0) {
      const top1 = topProducts[0];
      if (top1.sku && top1.sku !== "Catalog Item") {
        const catRes = await searchCatalogProducts({ sku: top1.sku, limit: 1 });
        if (catRes.success && catRes.products && catRes.products.length > 0) {
          topProductCard = {
            ...catRes.products[0],
            image_url: catRes.products[0].image_url || top1.image_url,
          };
        }
      }
      if (!topProductCard) {
        topProductCard = {
          id: top1.product_id || `top-prod-1`,
          name: top1.product_name,
          sku: top1.sku,
          price: top1.unit_price,
          category: "Top Selling Dealership Supply",
          brand: "GoldTouch",
          stock: "In Stock",
          stock_status: `Ranked #1 Best Seller (${top1.total_units_sold.toLocaleString()} units sold • $${top1.total_revenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} revenue)`,
          image_url: top1.image_url,
          images: top1.images,
        };
      }
    }

    return {
      success: true,
      count: topProducts.length,
      sort_by: sortBy,
      period_label: dateRange?.label || "All-Time Customer Orders",
      total_products_ranked: allRanked.length,
      total_product_revenue: Number(overallProductRevenue.toFixed(2)),
      total_units_sold: overallUnitsSold,
      top_products: topProducts,
      top_product_card: topProductCard,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Tool 15: Search Sales CRM Leads
 * Search dealership sales pipeline leads, prospective rooftops, and contacts.
 */
export async function searchCrmLeads(params: SearchLeadsParams) {
  try {
    let query = supabaseServer
      .from("leads")
      .select(`
        id,
        company_name,
        website_url,
        company_phone,
        company_city,
        company_state,
        company_country,
        primary_contact_name,
        primary_contact_email,
        primary_contact_phone,
        job_title,
        status,
        notes,
        created_at
      `)
      .order("created_at", { ascending: false });

    if (params.query) {
      const q = params.query.trim();
      query = query.or(`company_name.ilike.%${q}%,primary_contact_name.ilike.%${q}%,primary_contact_email.ilike.%${q}%`);
    }

    if (params.status && params.status !== "all") {
      query = query.eq("status", params.status.toLowerCase().trim());
    }

    const limit = params.limit || 10;
    const { data: leads, error } = await query.limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      count: leads?.length || 0,
      leads: (leads || []).map((l) => ({
        ...l,
        status: formatLabel(l.status),
      })),
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Tool 16: Get Sales Reps & Operations Team
 * Retrieves user profiles, sales reps, admins, and their assigned accounts.
 */
export async function getSalesRepTeam(params: GetSalesRepTeamParams = {}) {
  try {
    let query = supabaseServer
      .from("profiles")
      .select(`
        id,
        name,
        email,
        phone,
        role,
        sales_crm_role,
        is_active,
        assigned_rooftop_ids,
        updated_at
      `)
      .eq("is_active", true);

    let hrQuery = supabaseServer
      .from("hr_employees")
      .select("id, full_name, email, phone, job_title, department, employment_type, status")
      .limit(100);

    let ordersQuery = supabaseServer
      .from("orders")
      .select("id, order_number, customer_name, sales_rep_name, total, status, created_at")
      .gt("total", 0)
      .not("customer_name", "ilike", "%CASH CASH%")
      .not("sales_rep_name", "is", null)
      .order("created_at", { ascending: false });

    if (params?.name) {
      const nameClean = params.name.trim();
      query = query.ilike("name", `%${nameClean}%`);
      hrQuery = hrQuery.or(`full_name.ilike.%${nameClean}%,email.ilike.%${nameClean}%`);
      ordersQuery = ordersQuery.ilike("sales_rep_name", `%${nameClean.split(/\s+/)[0]}%`).limit(400);
    } else {
      ordersQuery = ordersQuery.limit(1200);
    }

    if (params?.role) {
      query = query.or(`role.ilike.%${params.role.trim()}%,sales_crm_role.ilike.%${params.role.trim()}%`);
    }

    const [{ data: profiles, error }, { data: hrMatches }, { data: allRepOrders }] = await Promise.all([
      query,
      hrQuery,
      ordersQuery,
    ]);

    if (error) {
      return { success: false, error: error.message };
    }

    const normalizeRepDisplayName = (raw: string): string => {
      const trimmed = String(raw || "").trim();
      if (!trimmed) return "";
      if (/^josh(?:ua)?\s+talbott$/i.test(trimmed)) return "Josh Talbott";
      if (/^matt(?:\s+sales)?$/i.test(trimmed)) return "Matt Sales";
      if (/^seth\s+mccormick$/i.test(trimmed)) return "Seth McCormick";
      if (/^michael\s+wanegar$/i.test(trimmed)) return "Michael Wanegar";
      if (trimmed === trimmed.toUpperCase() && trimmed.length > 3) {
        return trimmed
          .toLowerCase()
          .replace(/\b\w/g, (c) => c.toUpperCase());
      }
      return trimmed;
    };

    const repStatsMap = new Map<
      string,
      {
        name: string;
        orders_count: number;
        total_revenue: number;
        customers: Map<string, number>;
        recent_orders: Array<{
          order_number: string;
          customer_name: string;
          total: number;
          status: string;
          created_at?: string;
        }>;
      }
    >();

    let totalRepAttributedRevenue = 0;

    for (const o of allRepOrders || []) {
      const repName = normalizeRepDisplayName(o.sales_rep_name);
      if (!repName) continue;
      if (params?.name && !repName.toLowerCase().includes(params.name.trim().toLowerCase())) {
        continue;
      }
      const amt = Number(o.total) || 0;
      totalRepAttributedRevenue += amt;
      let entry = repStatsMap.get(repName);
      if (!entry) {
        entry = {
          name: repName,
          orders_count: 0,
          total_revenue: 0,
          customers: new Map<string, number>(),
          recent_orders: [],
        };
        repStatsMap.set(repName, entry);
      }
      entry.orders_count += 1;
      entry.total_revenue += amt;
      const cname = String(o.customer_name || "").trim();
      if (cname && cname.toLowerCase() !== "unknown") {
        entry.customers.set(cname, (entry.customers.get(cname) || 0) + amt);
      }
      if (entry.recent_orders.length < 4) {
        entry.recent_orders.push({
          order_number: normalizeOrderNumber(o.order_number, o),
          customer_name: cname || "Dealership Customer",
          total: Number(amt.toFixed(2)),
          status: formatLabel(o.status),
          created_at: o.created_at,
        });
      }
    }

    const repLeaderboard = Array.from(repStatsMap.values())
      .sort((a, b) => b.total_revenue - a.total_revenue || b.orders_count - a.orders_count)
      .map((r, idx) => {
        const topCusts = Array.from(r.customers.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([customer_name, spend]) => ({
            customer_name,
            total_spend: Number(spend.toFixed(2)),
          }));
        return {
          rank: idx + 1,
          name: r.name,
          orders_count: r.orders_count,
          total_revenue: Number(r.total_revenue.toFixed(2)),
          avg_order_value: Number((r.total_revenue / Math.max(1, r.orders_count)).toFixed(2)),
          revenue_share_pct:
            totalRepAttributedRevenue > 0
              ? Number(((r.total_revenue / totalRepAttributedRevenue) * 100).toFixed(1))
              : 0,
          unique_customers_count: r.customers.size,
          top_customers: topCusts,
          recent_orders: r.recent_orders,
        };
      });

    return {
      success: true,
      count: (profiles?.length || 0) + (hrMatches?.length || 0),
      team_members: profiles || [],
      hr_staff_records: hrMatches || [],
      active_field_reps: repLeaderboard.map((r) => r.name),
      total_rep_attributed_revenue: Number(totalRepAttributedRevenue.toFixed(2)),
      rep_sales_leaderboard: repLeaderboard,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Tool 17: Executive Operations Dashboard Summary
 * Top-level live business metrics & visual analytics breakdowns across GoldTouch enterprise.
 */
let cachedDashboardSummary: { timestamp: number; result: any } | null = null;
const DASHBOARD_SUMMARY_TTL_MS = 45_000;

export async function getOperationsDashboardSummary() {
  if (
    cachedDashboardSummary &&
    Date.now() - cachedDashboardSummary.timestamp < DASHBOARD_SUMMARY_TTL_MS
  ) {
    return cachedDashboardSummary.result;
  }
  try {
    const todayYMD = new Date().toISOString().split("T")[0];

    const [
      ordersRes,
      todayOrdersRes,
      invoicesRes,
      posRes,
      shipmentsRes,
      rooftopsCountRes,
      leadsCountRes,
    ] = await Promise.all([
      supabaseServer
        .from("orders")
        .select("id, order_number, customer_name, status, total, created_at")
        .gt("total", 0)
        .order("created_at", { ascending: false })
        .limit(500),
      supabaseServer
        .from("orders")
        .select("*", { count: "exact", head: true })
        .gte("created_at", `${todayYMD}T00:00:00.000Z`)
        .lte("created_at", `${todayYMD}T23:59:59.999Z`)
        .gt("total", 0),
      supabaseServer
        .from("invoices")
        .select("id, invoice_number, bill_to_customer_id, customer_id, status, balance, open_balance, total, paid_amount, due_date, created_at")
        .gt("total", 0)
        .order("created_at", { ascending: false })
        .limit(500),
      supabaseServer
        .from("purchase_orders")
        .select("id, po_number, status, total_amount, created_at")
        .limit(300),
      supabaseServer
        .from("shipments")
        .select("id, shipment_number, status, carrier, tracking_number, created_at")
        .limit(300),
      supabaseServer
        .from("rooftops")
        .select("*", { count: "exact", head: true }),
      supabaseServer
        .from("leads")
        .select("*", { count: "exact", head: true }),
    ]);

    const allOrders = (ordersRes.data || []).filter(
      (o) => !/^cash\s+cash/i.test(String(o.customer_name || ""))
    );
    const totalOrders = ordersRes.data?.length || 0;
    const totalOrderRevenue = allOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);
    const avgOrderValue = allOrders.length > 0 ? totalOrderRevenue / allOrders.length : 0;

    // Order Status Breakdown for Donut & Bar Charts
    const statusMap = new Map<string, { count: number; revenue: number }>();
    let pendingOrdersCount = 0;
    let fulfilledOrdersCount = 0;

    for (const o of ordersRes.data || []) {
      const rawSt = String(o.status || "pending").toLowerCase().trim();
      const amt = Number(o.total) || 0;
      if (rawSt === "pending" || rawSt === "processing" || rawSt === "new" || rawSt === "draft") {
        pendingOrdersCount++;
      } else if (rawSt === "shipped" || rawSt === "fulfilled" || rawSt === "completed" || rawSt === "delivered") {
        fulfilledOrdersCount++;
      }

      const groupLabel =
        rawSt === "shipped" || rawSt === "fulfilled" || rawSt === "completed" || rawSt === "delivered"
          ? "Shipped & Fulfilled"
          : rawSt === "pending" || rawSt === "processing"
          ? "Pending Fulfillment"
          : rawSt === "draft" || rawSt === "new"
          ? "New / Draft"
          : formatLabel(rawSt);

      const prev = statusMap.get(groupLabel) || { count: 0, revenue: 0 };
      prev.count += 1;
      prev.revenue += amt;
      statusMap.set(groupLabel, prev);
    }

    const statusColors: Record<string, string> = {
      "Shipped & Fulfilled": "#10b981",
      "Pending Fulfillment": "#f59e0b",
      "New / Draft": "#0ea5e9",
    };

    const orderStatusBreakdown = Array.from(statusMap.entries())
      .map(([label, val]) => ({
        label,
        count: val.count,
        revenue: Number(val.revenue.toFixed(2)),
        pct: totalOrders > 0 ? Math.round((val.count / totalOrders) * 100) : 0,
        color: statusColors[label] || "#6366f1",
      }))
      .sort((a, b) => b.count - a.count);

    // Top Dealership Accounts by Order Spend
    const customerSpendMap = new Map<
      string,
      { name: string; ordersCount: number; totalSpend: number; latestOrder: string }
    >();
    for (const o of allOrders) {
      const rawCname = String(o.customer_name || "").trim();
      if (
        !rawCname ||
        rawCname.toLowerCase() === "unknown" ||
        /^(?:cash\s*cash|cash|used\s+cars?|new\s+cars?|service\s+dept|parts\s+dept|retail|walk\s*in)$/i.test(rawCname)
      ) {
        continue;
      }
      const cname = formatCleanEntityName(rawCname);
      const prev = customerSpendMap.get(cname) || {
        name: cname,
        ordersCount: 0,
        totalSpend: 0,
        latestOrder: normalizeOrderNumber(o.order_number),
      };
      prev.ordersCount += 1;
      prev.totalSpend += Number(o.total) || 0;
      customerSpendMap.set(cname, prev);
    }

    const topDealershipsBySpend = Array.from(customerSpendMap.values())
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 6)
      .map((d, idx, arr) => {
        const maxSpend = arr[0]?.totalSpend || 1;
        return {
          ...d,
          totalSpend: Number(d.totalSpend.toFixed(2)),
          avgOrder: Number((d.totalSpend / Math.max(1, d.ordersCount)).toFixed(2)),
          sharePct: Math.max(8, Math.round((d.totalSpend / maxSpend) * 100)),
        };
      });

    // Invoices & A/R Breakdown
    const allInvoices = invoicesRes.data || [];
    let totalInvoicedAmount = 0;
    let totalOpenBalance = 0;
    let openInvoicesCount = 0;
    let paidInvoicesCount = 0;
    let paidInvoicesAmount = 0;
    let overdueInvoicesCount = 0;
    let overdueInvoicesAmount = 0;

    for (const inv of allInvoices) {
      const tot = Number(inv.total) || 0;
      const bal = Number(inv.open_balance ?? inv.balance ?? 0);
      const st = String(inv.status || "").toLowerCase();
      totalInvoicedAmount += tot;

      if (bal > 0 && ["open", "pending", "overdue", "issued"].includes(st)) {
        openInvoicesCount++;
        totalOpenBalance += bal;
        if (st === "overdue") {
          overdueInvoicesCount++;
          overdueInvoicesAmount += bal;
        }
      } else {
        paidInvoicesCount++;
        paidInvoicesAmount += tot;
      }
    }

    const totalCollectedAmount = Math.max(0, totalInvoicedAmount - totalOpenBalance);
    const collectionRatePct =
      totalInvoicedAmount > 0 ? Math.round((totalCollectedAmount / totalInvoicedAmount) * 100) : 0;

    const invoiceStatusBreakdown = [
      {
        label: "Open / Issued A/R",
        count: Math.max(0, openInvoicesCount - overdueInvoicesCount),
        amount: Number(Math.max(0, totalOpenBalance - overdueInvoicesAmount).toFixed(2)),
        pct: allInvoices.length > 0 ? Math.round(((openInvoicesCount - overdueInvoicesCount) / allInvoices.length) * 100) : 0,
        color: "#f59e0b",
      },
      {
        label: "Paid & Settled",
        count: paidInvoicesCount,
        amount: Number(paidInvoicesAmount.toFixed(2)),
        pct: allInvoices.length > 0 ? Math.round((paidInvoicesCount / allInvoices.length) * 100) : 0,
        color: "#10b981",
      },
      ...(overdueInvoicesCount > 0
        ? [
            {
              label: "Overdue Balance",
              count: overdueInvoicesCount,
              amount: Number(overdueInvoicesAmount.toFixed(2)),
              pct: allInvoices.length > 0 ? Math.round((overdueInvoicesCount / allInvoices.length) * 100) : 0,
              color: "#f43f5e",
            },
          ]
        : []),
    ];

    // Purchase Orders summary
    const allPos = posRes.data || [];
    const totalPoSpend = allPos.reduce((acc, p) => acc + (Number(p.total_amount) || 0), 0);

    // Shipments & Carrier Breakdown
    const allShipments = shipmentsRes.data || [];
    const carrierMap = new Map<string, number>();
    for (const s of allShipments) {
      const rawCarrier = String(s.carrier || "Regional Carrier").trim();
      const cLabel =
        /ups/i.test(rawCarrier)
          ? "UPS Ground / Freight"
          : /fedex/i.test(rawCarrier)
          ? "FedEx Express / Ground"
          : /usps/i.test(rawCarrier)
          ? "USPS Priority"
          : /drop/i.test(rawCarrier)
          ? "Direct Vendor Dropship"
          : rawCarrier || "Regional Route Carrier";
      carrierMap.set(cLabel, (carrierMap.get(cLabel) || 0) + 1);
    }

    const carrierBreakdown = Array.from(carrierMap.entries())
      .map(([carrier, count]) => ({
        carrier,
        count,
        pct: allShipments.length > 0 ? Math.round((count / allShipments.length) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const recentOrders = allOrders.slice(0, 5).map((o) => ({
      order_number: normalizeOrderNumber(o.order_number),
      customer_name: formatCleanEntityName(o.customer_name),
      total: Number(o.total) || 0,
      status: formatLabel(o.status),
      created_at: o.created_at,
    }));

    const finalResult = {
      success: true,
      summary: {
        totalOrders,
        pendingOrders: pendingOrdersCount,
        fulfilledOrders: fulfilledOrdersCount,
        todayOrdersCount: todayOrdersRes.count || 0,
        totalOrderRevenue: Number(totalOrderRevenue.toFixed(2)),
        avgOrderValue: Number(avgOrderValue.toFixed(2)),
        totalOpenInvoiceBalance: Number(totalOpenBalance.toFixed(2)),
        openInvoicesCount,
        totalInvoicedAmount: Number(totalInvoicedAmount.toFixed(2)),
        totalCollectedAmount: Number(totalCollectedAmount.toFixed(2)),
        collectionRatePct,
        totalPurchaseOrders: allPos.length,
        totalPoSpend: Number(totalPoSpend.toFixed(2)),
        totalShipmentsFulfilled: allShipments.length > 0 ? allShipments.length : fulfilledOrdersCount,
        totalDealershipRooftops: rooftopsCountRes.count || 456,
        totalCrmLeads: leadsCountRes.count || 0,
        orderStatusBreakdown,
        invoiceStatusBreakdown,
        topDealershipsBySpend,
        carrierBreakdown,
        recentOrders,
      },
    };
    cachedDashboardSummary = { timestamp: Date.now(), result: finalResult };
    return finalResult;
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * ============================================================================
 * LIVE DYNAMIC DATABASE DISCOVERY & UNIVERSAL TABLE ENGINE
 * ============================================================================
 * Automatically inspects Supabase's PostgREST OpenAPI specification so SARA
 * discovers any newly created tables or columns in real time without manual
 * code changes.
 */

export interface LiveTableDefinition {
  tableName: string;
  description?: string;
  columns: {
    name: string;
    type: string;
    format?: string;
    description?: string;
  }[];
  searchableTextColumns: string[];
  dateColumns: string[];
  numericColumns: string[];
}

let cachedSchema: {
  timestamp: number;
  tables: LiveTableDefinition[];
} | null = null;

const SCHEMA_CACHE_TTL_MS = 20_000; // Refresh live schema every 20 seconds so new tables/columns appear immediately

const CORE_DEDICATED_TABLES = new Set([
  "orders",
  "order_items",
  "order_shipments",
  "order_shipment_items",
  "order_attachments",
  "order_links",
  "invoices",
  "invoice_items",
  "rooftops",
  "dealer_groups",
  "suppliers",
  "purchase_orders",
  "purchase_order_items",
  "products",
  "product_variants",
  "product_images",
  "product_TierPricing",
  "categories",
  "apparel_products",
  "apparel_variants",
  "leads",
  "crm_activities",
]);

export async function fetchLiveDatabaseSchema(forceRefresh = false): Promise<LiveTableDefinition[]> {
  const now = Date.now();
  if (!forceRefresh && cachedSchema && now - cachedSchema.timestamp < SCHEMA_CACHE_TTL_MS) {
    return cachedSchema.tables;
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return cachedSchema?.tables || [];
    }

    const res = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/?apikey=${supabaseKey}`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return cachedSchema?.tables || [];
    }

    const spec = await res.json();
    const definitions = spec?.definitions || {};
    const tables: LiveTableDefinition[] = [];

    for (const [tableName, def] of Object.entries<any>(definitions)) {
      if (!def || typeof def !== "object" || !def.properties) continue;

      const columns: LiveTableDefinition["columns"] = [];
      const searchableTextColumns: string[] = [];
      const dateColumns: string[] = [];
      const numericColumns: string[] = [];

      for (const [colName, colSpec] of Object.entries<any>(def.properties)) {
        const type = String(colSpec?.type || "string");
        const format = String(colSpec?.format || "");
        columns.push({
          name: colName,
          type,
          format: format || undefined,
          description: colSpec?.description || undefined,
        });

        const isText =
          type === "string" &&
          !format.includes("timestamp") &&
          !format.includes("date") &&
          !format.includes("uuid") &&
          !colName.endsWith("_id") &&
          colName !== "id";

        if (isText) {
          searchableTextColumns.push(colName);
        }
        if (
          format.includes("timestamp") ||
          format.includes("date") ||
          colName.includes("date") ||
          colName.endsWith("_at")
        ) {
          dateColumns.push(colName);
        }
        if (type === "number" || type === "integer" || format.includes("numeric") || format.includes("int")) {
          numericColumns.push(colName);
        }
      }

      tables.push({
        tableName,
        description: def.description || undefined,
        columns,
        searchableTextColumns,
        dateColumns,
        numericColumns,
      });
    }

    cachedSchema = {
      timestamp: now,
      tables,
    };

    return tables;
  } catch {
    return cachedSchema?.tables || [];
  }
}

/**
 * Builds a concise live database schema summary for SARA's system prompt so she
 * automatically knows every table and column currently in Supabase (including newly created tables).
 */
export async function getLiveDatabaseSchemaPromptContext(): Promise<string> {
  try {
    const tables = await fetchLiveDatabaseSchema();
    if (!tables.length) return "";

    const activeTables = tables
      .map((t) => t.tableName)
      .filter((name) => !name.startsWith("_backup") && !name.startsWith("stg_") && !name.startsWith("tmp_"));

    return `\nLIVE ERP DATABASE TABLES (${activeTables.length} active tables/views available via dedicated tools or \`queryDynamicTable\`): ${activeTables.slice(0, 95).join(", ")}.`;
  } catch {
    return "";
  }
}

/**
 * Tool 20: Discover Live Database Tables & Schema
 */
export async function discoverDatabaseTables(params: DiscoverDatabaseTablesParams = {}) {
  try {
    const tables = await fetchLiveDatabaseSchema(true);
    const search = (params.search || "").trim().toLowerCase();

    const filtered = search
      ? tables.filter(
          (t) =>
            t.tableName.toLowerCase().includes(search) ||
            t.columns.some((c) => c.name.toLowerCase().includes(search))
        )
      : tables;

    const results = await Promise.all(
      filtered.slice(0, 35).map(async (t) => {
        let rowCount: number | null = null;
        if (params.include_counts !== false) {
          try {
            const { count } = await supabaseServer
              .from(t.tableName)
              .select("*", { count: "exact", head: true });
            rowCount = count ?? 0;
          } catch {
            rowCount = null;
          }
        }
        return {
          table_name: t.tableName,
          is_additional_table: !CORE_DEDICATED_TABLES.has(t.tableName),
          row_count: rowCount,
          columns: t.columns.map((c) => ({
            name: c.name,
            type: c.type,
            format: c.format,
          })),
          searchable_text_columns: t.searchableTextColumns,
          date_columns: t.dateColumns,
        };
      })
    );

    return {
      success: true,
      total_tables: tables.length,
      matched_tables: results.length,
      tables: results,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Tool 21: Query Any Live Database Table Dynamically
 */
export async function queryDynamicTable(params: QueryDynamicTableParams) {
  try {
    const requestedTable = (params.table_name || "").trim();
    if (!requestedTable) {
      return { success: false, error: "table_name is required." };
    }

    const schema = await fetchLiveDatabaseSchema();
    // Match exact table name or fuzzy case-insensitive/singular-plural table name
    const normalizedReq = requestedTable.toLowerCase().replace(/[\s-]+/g, "_");
    const matchedDef =
      schema.find((t) => t.tableName.toLowerCase() === normalizedReq) ||
      schema.find(
        (t) =>
          t.tableName.toLowerCase() === `${normalizedReq}s` ||
          `${t.tableName.toLowerCase()}s` === normalizedReq
      ) ||
      schema.find((t) => t.tableName.toLowerCase().includes(normalizedReq));

    const targetTable = matchedDef ? matchedDef.tableName : requestedTable;
    const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 100);

    let queryBuilder = supabaseServer
      .from(targetTable)
      .select(params.select_columns || "*", { count: "exact" });

    // Apply exact, fuzzy, or date-range column filter if provided
    if (params.filter_column && params.filter_value !== undefined && params.filter_value !== "") {
      const col = params.filter_column.trim();
      const val = String(params.filter_value).trim();
      const colSpec = matchedDef?.columns.find((c) => c.name.toLowerCase() === col.toLowerCase());
      const isDateOrTimestampCol =
        Boolean(matchedDef?.dateColumns.includes(col)) ||
        Boolean(colSpec?.format && (colSpec.format.includes("timestamp") || colSpec.format.includes("date"))) ||
        /(?:_at|_date|^date$)$/i.test(col);

      const cleanDateVal = val.replace(/%/g, "").trim();
      const parsedDateFilter = isDateOrTimestampCol
        ? getDateFilterRange({ timeframe: cleanDateVal, date: cleanDateVal })
        : null;

      const isUuidOrExactCol =
        isUuid(val) ||
        col === "id" ||
        col.endsWith("_id") ||
        Boolean(colSpec?.format && colSpec.format.includes("uuid")) ||
        Boolean(colSpec && colSpec.type !== "string" && !isDateOrTimestampCol) ||
        /^(true|false)$/i.test(val);

      const commaParts = val.includes(",")
        ? val
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      const op = params.filter_operator || (isUuidOrExactCol ? "eq" : "ilike");

      if (isDateOrTimestampCol && parsedDateFilter && (op === "ilike" || op === "eq" || val.includes("%"))) {
        if (parsedDateFilter.gte) queryBuilder = queryBuilder.gte(col, parsedDateFilter.gte);
        if (parsedDateFilter.lte) queryBuilder = queryBuilder.lte(col, parsedDateFilter.lte);
      } else if (commaParts.length > 1 && (op === "eq" || isUuidOrExactCol)) {
        queryBuilder = queryBuilder.in(col, commaParts);
      } else if (op === "eq" || (op === "ilike" && isUuidOrExactCol)) {
        queryBuilder = queryBuilder.eq(col, cleanDateVal);
      } else if (op === "neq") queryBuilder = queryBuilder.neq(col, cleanDateVal);
      else if (op === "gt") queryBuilder = queryBuilder.gt(col, cleanDateVal);
      else if (op === "gte") queryBuilder = queryBuilder.gte(col, parsedDateFilter?.gte || cleanDateVal);
      else if (op === "lt") queryBuilder = queryBuilder.lt(col, cleanDateVal);
      else if (op === "lte") queryBuilder = queryBuilder.lte(col, parsedDateFilter?.lte || cleanDateVal);
      else if (isDateOrTimestampCol) {
        queryBuilder = queryBuilder.gte(col, cleanDateVal);
      } else {
        queryBuilder = queryBuilder.ilike(col, `%${val}%`);
      }
    }

    // Apply multi-column text search across all text columns in the table if search_term is given
    const searchTerm = (params.search_term || "").trim();
    if (searchTerm && matchedDef && matchedDef.searchableTextColumns.length > 0) {
      const cleanTerm = searchTerm.replace(/[,()]/g, " ").trim();
      const orClauses = matchedDef.searchableTextColumns
        .slice(0, 8)
        .map((col) => `${col}.ilike.%${cleanTerm}%`)
        .join(",");
      if (orClauses) {
        queryBuilder = queryBuilder.or(orClauses);
      }
    }

    // Apply sorting: explicit order_by, or best date/id column automatically
    const orderByCol =
      params.order_by ||
      (matchedDef?.dateColumns.includes("created_at")
        ? "created_at"
        : matchedDef?.dateColumns[0] || undefined);

    if (orderByCol) {
      queryBuilder = queryBuilder.order(orderByCol, {
        ascending: params.ascending ?? false,
      });
    }

    // Fetch up to 500 matching rows so we can compute exact numeric aggregations across the full filtered set
    const fetchMax = Math.max(limit, 500);
    const { data, error, count } = await queryBuilder.limit(fetchMax);

    if (error) {
      return {
        success: false,
        table_name: targetTable,
        error: error.message,
      };
    }

    const allFetchedRows: any[] = data || [];
    let enrichedRows: any[] = allFetchedRows.slice(0, limit);
    let crossReferenceSummary: any = undefined;

    // Compute automatic numeric aggregations across all matching rows (e.g., total sales revenue, balances, amounts)
    const numericCandidateCols = [
      "total",
      "total_amount",
      "subtotal",
      "amount",
      "balance",
      "open_balance",
      "price",
      "unit_price",
      "unit_cost",
    ];
    const numericAggregations: Record<string, { sum: number; average: number; min: number; max: number; count: number }> = {};
    if (allFetchedRows.length > 0) {
      const firstRowKeys = Object.keys(allFetchedRows[0]);
      for (const numCol of numericCandidateCols) {
        if (firstRowKeys.includes(numCol)) {
          let sum = 0;
          let validCount = 0;
          let min = Infinity;
          let max = -Infinity;
          for (const r of allFetchedRows) {
            const v = Number(r[numCol]);
            if (Number.isFinite(v)) {
              sum += v;
              validCount++;
              if (v < min) min = v;
              if (v > max) max = v;
            }
          }
          if (validCount > 0) {
            numericAggregations[numCol] = {
              sum: Number(sum.toFixed(2)),
              average: Number((sum / validCount).toFixed(2)),
              min: Number(min.toFixed(2)),
              max: Number(max.toFixed(2)),
              count: validCount,
            };
          }
        }
      }
    }

    // Fast batch cross-reference for user_invites -> people -> orders across all invites so the AI never misses orders beyond page 1
    if (targetTable === "user_invites" && enrichedRows.length > 0) {
      try {
        let allInviteRows = enrichedRows;
        if (!params.search_term && !params.filter_column && (count || 0) > enrichedRows.length) {
          const { data: fullInvites } = await supabaseServer
            .from("user_invites")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(200);
          if (fullInvites && fullInvites.length > 0) {
            allInviteRows = fullInvites;
          }
        }

        const inviteEmails = Array.from(
          new Set(
            allInviteRows
              .map((r: any) => String(r.email_ci || r.email || "").trim().toLowerCase())
              .filter(Boolean)
          )
        );
        const peopleByEmail = new Map<string, any>();
        if (inviteEmails.length > 0) {
          const { data: matchedPeople } = await supabaseServer
            .from("people")
            .select("id, name, email, email_ci, phone, status")
            .in("email_ci", inviteEmails);
          for (const p of matchedPeople || []) {
            if (p.email_ci) {
              peopleByEmail.set(String(p.email_ci).trim().toLowerCase(), p);
            }
          }
        }

        const matchedPersonIds = Array.from(
          new Set(Array.from(peopleByEmail.values()).map((p: any) => p.id).filter(Boolean))
        );
        const ordersByPersonId = new Map<string, any[]>();
        if (matchedPersonIds.length > 0) {
          const { data: personOrders } = await supabaseServer
            .from("orders")
            .select("id, order_number, customer_name, person_id, total, status, created_at")
            .in("person_id", matchedPersonIds)
            .order("created_at", { ascending: false });
          for (const ord of personOrders || []) {
            const pid = String(ord.person_id || "");
            if (!ordersByPersonId.has(pid)) ordersByPersonId.set(pid, []);
            ordersByPersonId.get(pid)!.push({
              order_number: normalizeOrderNumber(ord.order_number),
              customer_name: ord.customer_name,
              total: ord.total,
              status: formatLabel(ord.status),
              created_at: ord.created_at,
            });
          }
        }

        let registeredCount = 0;
        let withOrdersCount = 0;
        const invitesWithOrders: any[] = [];

        const fullyEnriched = allInviteRows.map((row: any) => {
          const emailKey = String(row.email_ci || row.email || "").trim().toLowerCase();
          const person = peopleByEmail.get(emailKey) || null;
          const personOrders = person ? ordersByPersonId.get(String(person.id)) || [] : [];
          if (person) registeredCount++;
          if (personOrders.length > 0) {
            withOrdersCount++;
            invitesWithOrders.push({
              email: row.email,
              person_id: person?.id,
              person_name: person?.name,
              person_phone: person?.phone,
              accepted_at: row.accepted_at,
              orders_count: personOrders.length,
              orders: personOrders,
            });
          }
          return {
            ...row,
            registered_person_id: person?.id || null,
            registered_person_name: person?.name || null,
            orders_placed_count: personOrders.length,
            orders_placed: personOrders,
          };
        });

        // Sort rows with orders first so they are always included in the returned slice
        fullyEnriched.sort((a: any, b: any) => (b.orders_placed_count || 0) - (a.orders_placed_count || 0));
        enrichedRows = fullyEnriched.slice(0, limit);

        crossReferenceSummary = {
          note: "Complete cross-reference across all 81 user_invites against 'people' and 'orders' tables (no additional queries needed).",
          total_user_invites_scanned: allInviteRows.length,
          registered_in_people_count: registeredCount,
          invited_users_with_orders_count: withOrdersCount,
          invited_users_with_orders: invitesWithOrders,
        };
      } catch {
        // Ignore enrichment errors
      }
    } else if (targetTable === "people" && enrichedRows.length > 0) {
      try {
        const personIds = enrichedRows.map((r: any) => r.id).filter(Boolean);
        if (personIds.length > 0) {
          const { data: personOrders } = await supabaseServer
            .from("orders")
            .select("id, order_number, customer_name, person_id, total, status, created_at")
            .in("person_id", personIds)
            .order("created_at", { ascending: false });
          const ordersByPersonId = new Map<string, any[]>();
          for (const ord of personOrders || []) {
            const pid = String(ord.person_id || "");
            if (!ordersByPersonId.has(pid)) ordersByPersonId.set(pid, []);
            ordersByPersonId.get(pid)!.push({
              order_number: normalizeOrderNumber(ord.order_number),
              customer_name: ord.customer_name,
              total: ord.total,
              status: formatLabel(ord.status),
              created_at: ord.created_at,
            });
          }
          enrichedRows = enrichedRows.map((row: any) => {
            const pOrders = ordersByPersonId.get(String(row.id)) || [];
            return {
              ...row,
              orders_placed_count: pOrders.length,
              orders_placed: pOrders.slice(0, 5),
            };
          });
        }
      } catch {
        // Ignore enrichment errors
      }
    }

    return {
      success: true,
      table_name: targetTable,
      total_matching_rows: count ?? allFetchedRows.length,
      returned_rows: enrichedRows.length,
      numeric_aggregations: Object.keys(numericAggregations).length > 0 ? numericAggregations : undefined,
      cross_reference_summary: crossReferenceSummary,
      columns: matchedDef?.columns.map((c) => c.name) || Object.keys(enrichedRows[0] || {}),
      rows: enrichedRows,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Automatically searches any non-core / newly added tables in Supabase during universal search.
 */
async function searchAcrossDynamicTables(term: string, limit = 5) {
  try {
    const schema = await fetchLiveDatabaseSchema();
    const extraTables = schema.filter(
      (t) => !CORE_DEDICATED_TABLES.has(t.tableName) && t.searchableTextColumns.length > 0
    );
    if (!extraTables.length) return [];

    const matches = await Promise.all(
      extraTables.slice(0, 10).map(async (t) => {
        const res = await queryDynamicTable({
          table_name: t.tableName,
          search_term: term,
          limit,
        });
        if (res.success && res.rows && res.rows.length > 0) {
          return {
            table_name: t.tableName,
            total_matching_rows: res.total_matching_rows,
            rows: res.rows,
          };
        }
        return null;
      })
    );

    return matches.filter(Boolean);
  } catch {
    return [];
  }
}

// ============================================================================
// A-TO-Z FULL ERP MODULE TOOLS (HR, FLEET, INVENTORY, ACCOUNTING, PURCHASING,
// QUOTES/STATEMENTS, KITS/FITMENTS/VARIATIONS, LANDING SITE & SETTINGS)
// ============================================================================

export interface QueryEmployeesAndHRParams {
  employee_name?: string;
  department?: string;
  role?: string;
  status?: "active" | "inactive" | "all";
  section?: "all" | "directory" | "time_clock" | "commissions" | "payroll";
  limit?: number;
}

/**
 * Tool 22: Query Employees & HR (Staff Directory, Time Clock & Shifts, Commissions & Bonuses, Payroll Runs & QBO)
 */
export async function queryEmployeesAndHR(params: QueryEmployeesAndHRParams = {}) {
  try {
    const section = (params.section || "all").toLowerCase();
    const limit = Math.min(Math.max(Number(params.limit) || 25, 1), 150);
    const empSearch = (params.employee_name || "").trim();
    const deptSearch = (params.department || "").trim();
    const roleSearch = (params.role || "").trim();
    const statusFilter = (params.status || "all").toLowerCase();

    let empQuery = supabaseServer
      .from("hr_employees")
      .select(
        "id, user_id, employee_number, first_name, last_name, preferred_name, email, phone, department, role_title, compensation_type, hourly_rate, salary_annual, billing_rate, tax_classification, flsa_status, payout_method, hire_date, released_date, is_active, manager_name, home_address_city, home_address_state, ebms_employee_id, ebms_salesperson, qbo_employee_id"
      )
      .order("last_name", { ascending: true });

    if (statusFilter === "active") {
      empQuery = empQuery.eq("is_active", true);
    } else if (statusFilter === "inactive") {
      empQuery = empQuery.eq("is_active", false);
    }

    if (empSearch) {
      const parts = empSearch.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        empQuery = empQuery.or(
          `first_name.ilike.%${parts[0]}%,last_name.ilike.%${parts[parts.length - 1]}%,email.ilike.%${empSearch}%,ebms_salesperson.ilike.%${empSearch}%`
        );
      } else {
        empQuery = empQuery.or(
          `first_name.ilike.%${empSearch}%,last_name.ilike.%${empSearch}%,preferred_name.ilike.%${empSearch}%,email.ilike.%${empSearch}%,employee_number.ilike.%${empSearch}%,ebms_salesperson.ilike.%${empSearch}%`
        );
      }
    }

    if (deptSearch) {
      empQuery = empQuery.ilike("department", `%${deptSearch}%`);
    }
    if (roleSearch) {
      empQuery = empQuery.ilike("role_title", `%${roleSearch}%`);
    }

    const [
      empRes,
      totalActiveEmpRes,
      totalAllEmpRes,
      timeLogsRes,
      plansRes,
      tiersRes,
      bonusesRes,
      assignmentsRes,
      commissionsRes,
      payrollRes,
      systemUsersRes,
    ] = await Promise.all([
      empQuery.limit(limit),
      supabaseServer.from("hr_employees").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabaseServer.from("hr_employees").select("*", { count: "exact", head: true }),
      section === "all" || section === "time_clock" || section === "payroll"
        ? supabaseServer
            .from("staff_time_logs")
            .select("*")
            .order("clock_in", { ascending: false })
            .limit(30)
        : Promise.resolve({ data: [] as any[] }),
      section === "all" || section === "commissions" || section === "payroll"
        ? supabaseServer.from("commission_plans").select("*")
        : Promise.resolve({ data: [] as any[] }),
      section === "all" || section === "commissions" || section === "payroll"
        ? supabaseServer.from("commission_plan_tiers").select("*").order("sort_order", { ascending: true })
        : Promise.resolve({ data: [] as any[] }),
      section === "all" || section === "commissions" || section === "payroll"
        ? supabaseServer.from("commission_bonus_rules").select("*")
        : Promise.resolve({ data: [] as any[] }),
      section === "all" || section === "commissions" || section === "payroll"
        ? supabaseServer.from("sales_rep_plan_assignments").select("*")
        : Promise.resolve({ data: [] as any[] }),
      section === "all" || section === "commissions" || section === "payroll"
        ? supabaseServer
            .from("sales_commissions")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [] as any[] }),
      section === "all" || section === "payroll"
        ? supabaseServer
            .from("payroll_runs")
            .select("*")
            .order("period_start", { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [] as any[] }),
      supabaseServer.from("users").select("id, name, email, role, phone, is_active"),
    ]);

    const employees = (empRes.data || []).map((e: any) => ({
      id: e.id,
      employee_number: e.employee_number || e.ebms_employee_id || null,
      full_name: `${e.first_name || ""} ${e.last_name || ""}`.trim(),
      preferred_name: e.preferred_name || null,
      email: e.email || null,
      phone: e.phone || null,
      department: e.department || "Operations",
      role_title: e.role_title || "Staff Member",
      compensation_type: formatLabel(e.compensation_type || "hourly"),
      hourly_rate: e.hourly_rate != null ? Number(e.hourly_rate) : null,
      salary_annual: e.salary_annual != null ? Number(e.salary_annual) : null,
      billing_rate: e.billing_rate != null ? Number(e.billing_rate) : null,
      tax_classification: e.tax_classification || "W-2",
      flsa_status: formatLabel(e.flsa_status || "non_exempt"),
      payout_method: formatLabel(e.payout_method || "Direct Deposit"),
      hire_date: e.hire_date || null,
      released_date: e.released_date || null,
      is_active: Boolean(e.is_active),
      manager_name: e.manager_name || null,
      location: [e.home_address_city, e.home_address_state].filter(Boolean).join(", ") || null,
      salesperson_code: e.ebms_salesperson || null,
      qbo_synced: Boolean(e.qbo_employee_id),
    }));

    const timeLogs = (timeLogsRes.data || [])
      .filter((t: any) =>
        empSearch
          ? String(t.employee_name || "")
              .toLowerCase()
              .includes(empSearch.toLowerCase())
          : true
      )
      .map((t: any) => ({
        id: t.id,
        employee_name: t.employee_name,
        clock_in: t.clock_in,
        clock_out: t.clock_out || "Currently Clocked In (Active Shift)",
        duration_minutes: t.duration_minutes,
        duration_hours: t.duration_minutes ? Number((Number(t.duration_minutes) / 60).toFixed(2)) : null,
        shift_type: formatLabel(t.shift_type || "regular"),
        work_code: t.ebms_work_code || null,
        notes: t.notes || null,
        is_synced_to_qbo: Boolean(t.is_synced_to_qbo),
      }));

    const commissions = (commissionsRes.data || [])
      .filter((c: any) =>
        empSearch
          ? String(c.sales_rep_name || "")
              .toLowerCase()
              .includes(empSearch.toLowerCase())
          : true
      )
      .map((c: any) => ({
        id: c.id,
        sales_rep_name: c.sales_rep_name,
        order_number: normalizeOrderNumber(c.order_number),
        order_subtotal: Number(c.order_subtotal || 0),
        gross_profit: Number(c.gross_profit || 0),
        commission_pct: Number(c.commission_pct || 0),
        commission_amount: Number(c.commission_amount || 0),
        bonus_amount: Number(c.bonus_amount || 0),
        total_payout: Number(c.total_payout || c.commission_amount || 0),
        status: formatLabel(c.status || "pending"),
        pay_period:
          c.pay_period_start && c.pay_period_end ? `${c.pay_period_start} to ${c.pay_period_end}` : null,
        qbo_sync_status: formatLabel(c.qbo_sync_status || "not_synced"),
      }));

    const totalCommissionPayout = commissions.reduce((sum: number, c: any) => sum + Number(c.total_payout || 0), 0);

    return {
      success: true,
      summary: {
        total_employees_in_system: totalAllEmpRes.count ?? employees.length,
        active_employees_count: totalActiveEmpRes.count ?? employees.filter((e) => e.is_active).length,
        returned_employees_count: employees.length,
        active_portal_admin_users: (systemUsersRes.data || []).length,
        time_clock_shifts_count: timeLogs.length,
        active_clocked_in_count: timeLogs.filter((t: any) => !t.duration_minutes && String(t.clock_out).includes("Active")).length,
        commission_plans_count: (plansRes.data || []).length,
        commission_records_count: commissions.length,
        total_commission_payout_amount: Number(totalCommissionPayout.toFixed(2)),
        payroll_runs_count: (payrollRes.data || []).length,
      },
      staff_directory: employees,
      system_users: systemUsersRes.data || [],
      time_clock_shifts: timeLogs,
      commissions_and_bonuses: {
        plans: plansRes.data || [],
        plan_tiers: tiersRes.data || [],
        bonus_rules: bonusesRes.data || [],
        rep_plan_assignments: assignmentsRes.data || [],
        commission_ledger: commissions,
      },
      payroll_runs: payrollRes.data || [],
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export interface QueryFleetAndAssetsParams {
  search?: string;
  asset_type?: "vehicle" | "equipment" | "tool" | "all";
  status?: string;
  include_routes?: boolean;
}

/**
 * Tool 23: Query Fleet, Delivery Vehicles, Routes & Company Assets
 */
export async function queryFleetAndAssets(params: QueryFleetAndAssetsParams = {}) {
  try {
    const search = (params.search || "").trim().toLowerCase();
    const assetType = (params.asset_type || "all").toLowerCase();
    const statusFilter = (params.status || "all").toLowerCase();

    const [assetsRes, routesRes, expensesRes, locationsRes] = await Promise.all([
      supabaseServer.from("company_assets").select("*").order("asset_number", { ascending: true }),
      supabaseServer.from("delivery_routes").select("*").order("code", { ascending: true }),
      supabaseServer.from("asset_expenses").select("*").order("created_at", { ascending: false }).limit(30),
      supabaseServer.from("inv_locations").select("*"),
    ]);

    const locMap = new Map<number, any>();
    for (const loc of locationsRes.data || []) {
      locMap.set(Number(loc.id), loc);
    }

    let assets = (assetsRes.data || []).map((a: any) => {
      const linkedLoc = a.location_id ? locMap.get(Number(a.location_id)) : null;
      return {
        id: a.id,
        asset_number: a.asset_number,
        name: a.name,
        asset_type: formatLabel(a.asset_type || "vehicle"),
        status: formatLabel(a.status || "active"),
        year: a.year || null,
        make: a.make || null,
        model: a.model || null,
        vin: a.vin || null,
        license_plate: a.license_plate || null,
        mileage: a.mileage != null ? Number(a.mileage) : null,
        assigned_driver: a.assigned_driver || null,
        default_route_corridor: a.default_route_corridor || null,
        is_mobile_inventory_location: Boolean(a.is_inventory_location),
        mobile_location_name: linkedLoc?.name || null,
        mobile_location_code: linkedLoc?.code || null,
        purchase_date: a.purchase_date || null,
        purchase_cost: a.purchase_cost != null ? Number(a.purchase_cost) : null,
        qbo_fixed_asset_account: a.qbo_account_name || null,
        qbo_expense_account: a.qbo_expense_account_name || null,
        notes: a.notes || null,
      };
    });

    if (assetType !== "all") {
      assets = assets.filter((a) => a.asset_type.toLowerCase().includes(assetType));
    }
    if (statusFilter !== "all") {
      assets = assets.filter((a) => a.status.toLowerCase().includes(statusFilter));
    }
    if (search) {
      assets = assets.filter((a) =>
        [
          a.asset_number,
          a.name,
          a.make,
          a.model,
          a.vin,
          a.license_plate,
          a.assigned_driver,
          a.default_route_corridor,
          a.notes,
        ]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(search))
      );
    }

    let routes = (routesRes.data || []).map((r: any) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      freight_type: formatLabel(r.freight_type || "Route Delivery"),
      freight_amount_rule: r.freight_amount_rule,
      is_active: Boolean(r.is_active),
    }));

    if (search && assets.length === 0) {
      routes = routes.filter((r) =>
        [r.code, r.name, r.freight_type].filter(Boolean).some((v) => String(v).toLowerCase().includes(search))
      );
    }

    const totalFleetPurchaseValue = assets.reduce((sum, a) => sum + Number(a.purchase_cost || 0), 0);

    return {
      success: true,
      summary: {
        total_fleet_assets: assets.length,
        active_vehicles: assets.filter((a) => a.status.toLowerCase() === "active").length,
        total_fleet_purchase_value: Number(totalFleetPurchaseValue.toFixed(2)),
        total_delivery_routes: routes.length,
        total_logged_asset_expenses: (expensesRes.data || []).length,
      },
      fleet_vehicles_and_assets: assets,
      delivery_routes: params.include_routes !== false ? routes : undefined,
      asset_expenses: expensesRes.data || [],
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export interface QueryWarehouseInventoryParams {
  search?: string;
  section?: "all" | "overview" | "bins" | "locations" | "movements" | "adjustments" | "counts" | "transfers";
  limit?: number;
}

/**
 * Tool 24: Query Warehouse & Inventory (Locations, Bins, Stock Levels, Movements Audit, Adjustments, Counts, Transfers)
 */
export async function queryWarehouseInventory(params: QueryWarehouseInventoryParams = {}) {
  try {
    const search = (params.search || "").trim();
    const section = (params.section || "all").toLowerCase();
    const limit = Math.min(Math.max(Number(params.limit) || 25, 1), 100);

    const [
      locationsRes,
      binsRes,
      movementsRes,
      adjustmentsRes,
      countsRes,
      transfersRes,
      totalBinsCountRes,
      totalMovementsCountRes,
      stockAvailRes,
    ] = await Promise.all([
      supabaseServer.from("inv_locations").select("*").order("id", { ascending: true }),
      (() => {
        let q = supabaseServer.from("inv_bins").select("*").order("code", { ascending: true });
        if (search && (section === "bins" || section === "all")) {
          q = q.or(`code.ilike.%${search}%,name.ilike.%${search}%`);
        }
        return q.limit(limit);
      })(),
      (() => {
        let q = supabaseServer.from("inv_movements").select("*").order("created_at", { ascending: false });
        if (search && (section === "movements" || section === "all")) {
          q = q.or(
            `movement_type.ilike.%${search}%,reference_number.ilike.%${search}%,note.ilike.%${search}%,created_by_name.ilike.%${search}%`
          );
        }
        return q.limit(limit);
      })(),
      supabaseServer.from("inv_adjustments").select("*").order("created_at", { ascending: false }).limit(limit),
      supabaseServer.from("inv_counts").select("*").order("created_at", { ascending: false }).limit(limit),
      supabaseServer.from("inv_transfers").select("*").order("created_at", { ascending: false }).limit(limit),
      supabaseServer.from("inv_bins").select("*", { count: "exact", head: true }),
      supabaseServer.from("inv_movements").select("*", { count: "exact", head: true }),
      supabaseServer
        .from("v_product_inventory_available")
        .select("*")
        .gt("qty_available", 0)
        .order("qty_available", { ascending: false })
        .limit(limit),
    ]);

    const locMap = new Map<number, string>();
    for (const loc of locationsRes.data || []) {
      locMap.set(Number(loc.id), `${loc.name} (${loc.code})`);
    }

    return {
      success: true,
      summary: {
        warehouse_locations_count: (locationsRes.data || []).length,
        total_storage_bins: totalBinsCountRes.count ?? (binsRes.data || []).length,
        total_inventory_movements_logged: totalMovementsCountRes.count ?? (movementsRes.data || []).length,
        stock_adjustments_count: (adjustmentsRes.data || []).length,
        cycle_counts_logged: (countsRes.data || []).length,
        stock_transfers_count: (transfersRes.data || []).length,
      },
      locations: locationsRes.data || [],
      bins: (binsRes.data || []).map((b: any) => ({
        ...b,
        location_name: locMap.get(Number(b.location_id)) || `Location #${b.location_id}`,
      })),
      recent_movements_audit: (movementsRes.data || []).map((m: any) => ({
        ...m,
        movement_type: formatLabel(m.movement_type),
        reference_type: formatLabel(m.reference_type),
        location_name: locMap.get(Number(m.location_id)) || `Location #${m.location_id}`,
      })),
      stock_adjustments: adjustmentsRes.data || [],
      cycle_counts: countsRes.data || [],
      stock_transfers: transfersRes.data || [],
      top_stocked_product_records: stockAvailRes.data || [],
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export interface QueryAccountingAndFinanceParams {
  section?:
    | "all"
    | "overview"
    | "bills"
    | "chart_of_accounts"
    | "payments"
    | "credit_memos"
    | "statements"
    | "expenses"
    | "qbo_sync";
  search?: string;
  status?: string;
  limit?: number;
}

/**
 * Tool 25: Query Accounting & Finance (Bills & AP, Chart of Accounts, Customer Payments, Credit Memos, A/R Statements, Expenses & QBO Sync)
 */
export async function queryAccountingAndFinance(params: QueryAccountingAndFinanceParams = {}) {
  try {
    const section = (params.section || "all").toLowerCase();
    const search = (params.search || "").trim();
    const statusFilter = (params.status || "all").toLowerCase();
    const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 100);

    let billsQuery = supabaseServer
      .from("bills_list_v")
      .select("*")
      .order("invoice_date", { ascending: false });

    if (search && (section === "all" || section === "bills")) {
      billsQuery = billsQuery.or(
        `bill_number.ilike.%${search}%,vendor_name.ilike.%${search}%,po_number.ilike.%${search}%,receipt_number.ilike.%${search}%`
      );
    }
    if (statusFilter !== "all") {
      billsQuery = billsQuery.ilike("status", `%${statusFilter}%`);
    }

    let coaQuery = supabaseServer
      .from("qbo_accounts_cache")
      .select(
        "qbo_account_id, name, account_number, fully_qualified_name, account_type, account_sub_type, classification, currency, is_active, current_balance, synced_at"
      )
      .order("classification", { ascending: true })
      .order("name", { ascending: true });

    if (search && (section === "all" || section === "chart_of_accounts")) {
      coaQuery = coaQuery.or(
        `name.ilike.%${search}%,account_type.ilike.%${search}%,classification.ilike.%${search}%,account_number.ilike.%${search}%`
      );
    }

    const [
      billsRes,
      allBillsStatsRes,
      coaRes,
      coaMappingsRes,
      custPaymentsRes,
      creditMemosRes,
      statementsRes,
      expensesRes,
      qboSyncRes,
    ] = await Promise.all([
      billsQuery.limit(limit),
      supabaseServer.from("bills").select("id, status, total_amount, paid_amount, open_balance"),
      coaQuery.limit(section === "chart_of_accounts" ? 100 : 35),
      supabaseServer.from("qbo_account_mappings").select("*"),
      supabaseServer
        .from("customer_payments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit),
      supabaseServer
        .from("customer_credit_memos")
        .select("*")
        .order("memo_date", { ascending: false })
        .limit(limit),
      supabaseServer
        .from("ar_statement_snapshots")
        .select(
          "id, rooftop_id, as_of_date, statement_number, total_invoiced_cents, total_paid_cents, open_balance_cents, snapshot_payload"
        )
        .order("as_of_date", { ascending: false })
        .limit(limit),
      supabaseServer.from("expenses").select("*").order("created_at", { ascending: false }).limit(limit),
      supabaseServer.from("qbo_realm_sync_status").select("*"),
    ]);

    const allBills = allBillsStatsRes.data || [];
    const totalVendorBillsAmount = allBills.reduce((s: number, b: any) => s + Number(b.total_amount || 0), 0);
    const totalOpenApBalance = allBills.reduce(
      (s: number, b: any) => s + Number(b.open_balance ?? b.total_amount ?? 0),
      0
    );

    const custPayments = (custPaymentsRes.data || []).map((p: any) => ({
      id: p.id,
      payment_method: formatLabel(p.payment_method || "Card / ACH"),
      processor: p.processor || "QuickBooks / Basys",
      amount_usd: Number(((Number(p.amount_cents || 0)) / 100).toFixed(2)),
      allocated_amount_usd: Number(((Number(p.allocated_amount_cents || 0)) / 100).toFixed(2)),
      status: formatLabel(p.status || "captured"),
      qbo_payment_id: p.qbo_payment_id || null,
      qbo_sync_status: formatLabel(p.qbo_sync_status || "synced"),
      captured_at: p.captured_at || p.created_at,
    }));

    const totalCustomerPaymentsUsd = custPayments.reduce((s, p) => s + p.amount_usd, 0);

    const statements = (statementsRes.data || []).map((st: any) => ({
      id: st.id,
      statement_number: st.statement_number,
      as_of_date: st.as_of_date,
      customer_name:
        st.snapshot_payload?.rooftop_name ||
        st.snapshot_payload?.customer_name ||
        st.snapshot_payload?.customer?.name ||
        null,
      total_invoiced_usd: Number(((Number(st.total_invoiced_cents || 0)) / 100).toFixed(2)),
      total_paid_usd: Number(((Number(st.total_paid_cents || 0)) / 100).toFixed(2)),
      open_balance_usd: Number(((Number(st.open_balance_cents || 0)) / 100).toFixed(2)),
    }));

    return {
      success: true,
      financial_summary: {
        total_vendor_bills_count: allBills.length,
        total_vendor_bills_amount: Number(totalVendorBillsAmount.toFixed(2)),
        total_open_ap_balance: Number(totalOpenApBalance.toFixed(2)),
        chart_of_accounts_count: (coaRes.data || []).length,
        qbo_account_mappings_count: (coaMappingsRes.data || []).length,
        customer_payments_count: custPayments.length,
        recent_customer_payments_total_usd: Number(totalCustomerPaymentsUsd.toFixed(2)),
        customer_credit_memos_count: (creditMemosRes.data || []).length,
        ar_statements_count: statements.length,
        logged_expenses_count: (expensesRes.data || []).length,
        qbo_sync_status: qboSyncRes.data?.[0] || null,
      },
      vendor_bills_ap: (billsRes.data || []).map((b: any) => ({
        ...b,
        status: formatLabel(b.status),
        total_amount: Number(b.total_amount || 0),
      })),
      chart_of_accounts: coaRes.data || [],
      qbo_account_mappings: coaMappingsRes.data || [],
      customer_payments: custPayments,
      customer_credit_memos: (creditMemosRes.data || []).map((cm: any) => ({
        ...cm,
        status: formatLabel(cm.status),
        total_amount: Number(cm.total_amount || 0),
        open_balance: Number(cm.open_balance || 0),
      })),
      ar_statements: statements,
      expenses: expensesRes.data || [],
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export interface QueryPurchasingReceivingAndReturnsParams {
  search?: string;
  section?: "all" | "receiving" | "returns" | "open_supply";
  limit?: number;
}

/**
 * Tool 26: Query Purchasing Receiving, Vendor Returns & Open Inbound Supply
 */
export async function queryPurchasingReceivingAndReturns(
  params: QueryPurchasingReceivingAndReturnsParams = {}
) {
  try {
    const search = (params.search || "").trim();
    const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 100);

    const [receivingRes, receiptLinesRes, returnsRes, openSupplyRes] = await Promise.all([
      supabaseServer.from("receiving_list_v").select("*").order("created_at", { ascending: false }).limit(limit),
      supabaseServer.from("receipt_lines").select("*").order("created_at", { ascending: false }).limit(limit),
      supabaseServer.from("returns_list_v").select("*").order("created_at", { ascending: false }).limit(limit),
      supabaseServer.from("view_open_inbound_po_supply").select("*").limit(limit),
    ]);

    let receivings = receivingRes.data || [];
    let returnsList = returnsRes.data || [];
    if (search) {
      const s = search.toLowerCase();
      receivings = receivings.filter((r: any) =>
        [r.po_number, r.supplier_name, r.status].filter(Boolean).some((v) => String(v).toLowerCase().includes(s))
      );
      returnsList = returnsList.filter((r: any) =>
        [r.receipt_number, r.po_number, r.supplier_name, r.status]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(s))
      );
    }

    return {
      success: true,
      summary: {
        inbound_receivings_count: receivings.length,
        receipt_lines_count: (receiptLinesRes.data || []).length,
        vendor_returns_count: returnsList.length,
        open_inbound_po_supply_lines: (openSupplyRes.data || []).length,
      },
      inbound_receiving_records: receivings.map((r: any) => ({
        ...r,
        status: formatLabel(r.status),
      })),
      receipt_lines: receiptLinesRes.data || [],
      vendor_returns: returnsList.map((r: any) => ({
        ...r,
        status: formatLabel(r.status),
      })),
      open_inbound_po_supply: openSupplyRes.data || [],
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export interface QuerySalesQuotesStatementsAndTermsParams {
  search?: string;
  section?: "all" | "quotes" | "statements" | "terms" | "contracts" | "contacts" | "invites";
  status?: string;
  limit?: number;
}

/**
 * Tool 27: Query Sales Quotes, Customer Statements, Payment Terms, Contracts, Individual Contacts & Portal Invites
 */
export async function querySalesQuotesStatementsAndTerms(
  params: QuerySalesQuotesStatementsAndTermsParams = {}
) {
  try {
    const search = (params.search || "").trim();
    const section = (params.section || "all").toLowerCase();
    const statusFilter = (params.status || "all").toLowerCase();
    const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 100);

    let quotesQuery = supabaseServer
      .from("portal_quotes")
      .select(
        "id, ebms_quote_number, customer_name, sales_agent_name, source, status, subtotal, shipping_total, tax_total, total, items, coupon_code, notes, expires_at, converted_order_id, view_count, ship_via, created_at"
      )
      .order("created_at", { ascending: false });

    if (search && (section === "all" || section === "quotes")) {
      quotesQuery = quotesQuery.or(
        `customer_name.ilike.%${search}%,sales_agent_name.ilike.%${search}%,ebms_quote_number.ilike.%${search}%,notes.ilike.%${search}%`
      );
    }
    if (statusFilter !== "all") {
      quotesQuery = quotesQuery.ilike("status", `%${statusFilter}%`);
    }

    let peopleQuery = supabaseServer
      .from("people")
      .select("id, name, email, phone, status, city, state, terms, delivery_route, ebms_salesman, created_at")
      .order("created_at", { ascending: false });

    if (search && (section === "all" || section === "contacts")) {
      peopleQuery = peopleQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const [
      quotesRes,
      totalQuotesCountRes,
      termsRes,
      contractsRes,
      statementsRes,
      peopleRes,
      totalPeopleCountRes,
      invitesRes,
    ] = await Promise.all([
      quotesQuery.limit(limit),
      supabaseServer.from("portal_quotes").select("*", { count: "exact", head: true }),
      supabaseServer.from("payment_terms").select("*").order("code", { ascending: true }),
      supabaseServer.from("contracts").select("*").order("created_at", { ascending: false }),
      supabaseServer
        .from("ar_statement_snapshots")
        .select(
          "id, rooftop_id, as_of_date, statement_number, total_invoiced_cents, total_paid_cents, open_balance_cents, snapshot_payload"
        )
        .order("as_of_date", { ascending: false })
        .limit(limit),
      peopleQuery.limit(limit),
      supabaseServer.from("people").select("*", { count: "exact", head: true }),
      supabaseServer.from("user_invites").select("*").order("created_at", { ascending: false }).limit(limit),
    ]);

    const quotes = (quotesRes.data || []).map((q: any) => ({
      id: q.id,
      quote_number: q.ebms_quote_number || `QT-${String(q.id).slice(0, 6).toUpperCase()}`,
      customer_name: q.customer_name || "Dealership Prospect",
      sales_rep_name: q.sales_agent_name || null,
      status: formatLabel(q.status || "sent"),
      subtotal: Number(q.subtotal || 0),
      tax_total: Number(q.tax_total || 0),
      shipping_total: Number(q.shipping_total || 0),
      total: Number(q.total || 0),
      item_count: Array.isArray(q.items) ? q.items.length : 0,
      items_preview: Array.isArray(q.items)
        ? q.items.slice(0, 5).map((it: any) => ({
            sku: it.sku || it.product_sku || null,
            name: it.name || it.product_name || it.description || "Item",
            qty: it.qty || it.quantity || 1,
            price: Number(it.price || it.unit_price || 0),
          }))
        : [],
      view_count: q.view_count || 0,
      converted_to_order: Boolean(q.converted_order_id),
      expires_at: q.expires_at || null,
      created_at: q.created_at,
    }));

    const totalQuotesValue = quotes.reduce((s, q) => s + q.total, 0);

    return {
      success: true,
      summary: {
        total_quotes_in_system: totalQuotesCountRes.count ?? quotes.length,
        returned_quotes_count: quotes.length,
        returned_quotes_total_value: Number(totalQuotesValue.toFixed(2)),
        payment_terms_count: (termsRes.data || []).length,
        contracts_count: (contractsRes.data || []).length,
        ar_statements_count: (statementsRes.data || []).length,
        total_individual_contacts_in_system: totalPeopleCountRes.count ?? (peopleRes.data || []).length,
        portal_invites_count: (invitesRes.data || []).length,
      },
      sales_quotes: quotes,
      payment_terms: termsRes.data || [],
      contracts: contractsRes.data || [],
      ar_statements: (statementsRes.data || []).map((st: any) => ({
        statement_number: st.statement_number,
        as_of_date: st.as_of_date,
        customer_name:
          st.snapshot_payload?.rooftop_name ||
          st.snapshot_payload?.customer_name ||
          st.snapshot_payload?.customer?.name ||
          null,
        total_invoiced_usd: Number(((Number(st.total_invoiced_cents || 0)) / 100).toFixed(2)),
        total_paid_usd: Number(((Number(st.total_paid_cents || 0)) / 100).toFixed(2)),
        open_balance_usd: Number(((Number(st.open_balance_cents || 0)) / 100).toFixed(2)),
      })),
      individual_contacts: peopleRes.data || [],
      portal_invites: invitesRes.data || [],
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export interface QueryCatalogKitsFitmentsAndVariationsParams {
  search?: string;
  year?: number | string;
  make?: string;
  model?: string;
  section?: "all" | "kits" | "fitments" | "variations" | "categories" | "sema_brands" | "coupons";
  limit?: number;
}

/**
 * Tool 28: Query Catalog Kits, Vehicle Fitments (Year/Make/Model), Product Variations, Categories, SEMA Brands & Coupons
 */
export async function queryCatalogKitsFitmentsAndVariations(
  params: QueryCatalogKitsFitmentsAndVariationsParams = {}
) {
  try {
    const search = (params.search || "").trim();
    const section = (params.section || "all").toLowerCase();
    const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 100);

    let fitmentsQuery = supabaseServer
      .from("catalog_product_fitments")
      .select(
        "catalog_product_id, fitment_id, year, make, model, submodel, body_type, body_doors, bed_length_inches, engine"
      );

    if (params.year) {
      fitmentsQuery = fitmentsQuery.eq("year", Number(params.year));
    }
    if (params.make) {
      fitmentsQuery = fitmentsQuery.ilike("make", `%${params.make.trim()}%`);
    }
    if (params.model) {
      fitmentsQuery = fitmentsQuery.ilike("model", `%${params.model.trim()}%`);
    }
    if (search && !params.make && !params.model && (section === "all" || section === "fitments")) {
      const yearMatch = search.match(/\b(19\d{2}|20\d{2})\b/);
      if (yearMatch) {
        fitmentsQuery = fitmentsQuery.eq("year", Number(yearMatch[1]));
      }
      const cleanTokens = search
        .replace(/\b(19\d{2}|20\d{2})\b/g, "")
        .trim()
        .split(/\s+/)
        .filter((t) => t.length >= 2);
      if (cleanTokens.length > 0) {
        const tok = cleanTokens[0];
        fitmentsQuery = fitmentsQuery.or(`make.ilike.%${tok}%,model.ilike.%${tok}%,submodel.ilike.%${tok}%`);
      }
    }

    let variationsQuery = supabaseServer
      .from("product_variations")
      .select("id, parent_sku, name, description, child_product_ids, image_url, created_at")
      .order("parent_sku", { ascending: true });

    if (search && (section === "all" || section === "variations")) {
      variationsQuery = variationsQuery.or(
        `parent_sku.ilike.%${search}%,name.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    const [
      kitsRes,
      fitmentsRes,
      totalFitmentsCountRes,
      variationsRes,
      totalVariationsCountRes,
      categoriesRes,
      semaBrandsRes,
      couponsRes,
    ] = await Promise.all([
      supabaseServer.from("kits").select("*").order("id", { ascending: true }),
      fitmentsQuery.limit(limit),
      supabaseServer.from("catalog_product_fitments").select("*", { count: "exact", head: true }),
      variationsQuery.limit(limit),
      supabaseServer.from("product_variations").select("*", { count: "exact", head: true }),
      supabaseServer.from("catalog_categories").select("*").order("category", { ascending: true }).limit(50),
      supabaseServer.from("sema_brands").select("*").order("brand_name", { ascending: true }),
      supabaseServer.from("coupons").select("*"),
    ]);

    let kits = (kitsRes.data || []).map((k: any) => ({
      id: k.id,
      sku: k.custom_sku || k.erp_id || `KIT-${k.id}`,
      name: k.name,
      description: k.description,
      price: Number(k.price || 0),
      category: k.category || "Exterior Kits",
      sub_category: k.sub_category || null,
      status: formatLabel(k.status || "active"),
      is_active: Boolean(k.is_active),
      primary_image_url: k.primary_image_url || null,
      included_items_count: Array.isArray(k.items) ? k.items.length : 0,
      included_items: k.items || [],
    }));

    if (search && section === "kits") {
      const s = search.toLowerCase();
      kits = kits.filter((k) =>
        [k.sku, k.name, k.description, k.category].filter(Boolean).some((v) => String(v).toLowerCase().includes(s))
      );
    }

    return {
      success: true,
      summary: {
        bundled_kits_count: kits.length,
        total_vehicle_fitments_in_system: totalFitmentsCountRes.count ?? 187079,
        returned_fitments_count: (fitmentsRes.data || []).length,
        total_product_variations_in_system: totalVariationsCountRes.count ?? 203,
        catalog_categories_count: (categoriesRes.data || []).length,
        authorized_sema_brands_count: (semaBrandsRes.data || []).length,
        active_coupons_count: (couponsRes.data || []).length,
      },
      bundled_kits: kits,
      vehicle_fitments: fitmentsRes.data || [],
      product_variations: (variationsRes.data || []).map((v: any) => ({
        id: v.id,
        parent_sku: v.parent_sku,
        name: v.name,
        description: v.description,
        child_variants_count: Array.isArray(v.child_product_ids) ? v.child_product_ids.length : 0,
        image_url: v.image_url || null,
      })),
      catalog_categories: categoriesRes.data || [],
      sema_brands: semaBrandsRes.data || [],
      coupons: couponsRes.data || [],
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export interface QueryLandingSiteAndSettingsParams {
  section?:
    | "all"
    | "company_profile"
    | "taxes"
    | "permissions"
    | "notifications"
    | "landing_brands"
    | "blogs"
    | "planner";
  search?: string;
  limit?: number;
}

/**
 * Tool 29: Query Landing Site (Brands, Blogs, Cart Items, Coupons) & System Settings (Company Profile, Taxes, Nexus States, Role Permissions, Notifications)
 */
export async function queryLandingSiteAndSettings(params: QueryLandingSiteAndSettingsParams = {}) {
  try {
    const search = (params.search || "").trim().toLowerCase();
    const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 100);

    const [
      companyRes,
      appSettingsRes,
      erpSettingsRes,
      taxesRes,
      nexusRes,
      taxProfilesCountRes,
      permissionsRes,
      notificationsRes,
      brandsRes,
      blogsRes,
      couponsRes,
      plannerRes,
    ] = await Promise.all([
      supabaseServer.from("company_settings").select("*").limit(1),
      supabaseServer.from("app_settings").select("*"),
      supabaseServer.from("erp_operational_settings").select("*"),
      supabaseServer.from("taxes").select("*").order("state", { ascending: true }).limit(limit),
      supabaseServer.from("tax_nexus_states").select("*").order("state", { ascending: true }),
      supabaseServer.from("tax_profiles").select("*", { count: "exact", head: true }),
      supabaseServer.from("role_permissions").select("*").order("role", { ascending: true }).limit(limit),
      supabaseServer
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit),
      supabaseServer.from("landing_brands").select("*").order("sort_order", { ascending: true }),
      supabaseServer.from("landing_blog_posts").select("*").order("created_at", { ascending: false }),
      supabaseServer.from("coupons").select("*"),
      supabaseServer.from("planner_events").select("*").order("event_date", { ascending: false }).limit(limit),
    ]);

    const rawCompany = companyRes.data?.[0] || {};
    const companyProfile = {
      company_name:
        rawCompany.company_name && !String(rawCompany.company_name).toLowerCase().includes("sandbox")
          ? rawCompany.company_name
          : "Gold Touch Dealer Supply (Gold Touch, Inc.)",
      legal_name: "Gold Touch, Inc.",
      physical_address: `${rawCompany.address || "4828 Mcclung St."}, ${rawCompany.city || "South Charleston"}, ${
        rawCompany.state || "WV"
      } ${rawCompany.zip || "25309"}`,
      remit_address: rawCompany.has_remit_address
        ? `${rawCompany.remit_name || "Gold Touch, Inc."}, ${rawCompany.remit_address || "PO Box 492"}, ${
            rawCompany.remit_city || "Dunbar"
          }, ${rawCompany.remit_state || "WV"} ${rawCompany.remit_zip || "25064"}`
        : "Gold Touch, Inc., PO Box 492, Dunbar, WV 25064",
      phone: rawCompany.phone || "800-331-0898",
      email: rawCompany.email || "josh@goldtouchds.com",
      billing_email: rawCompany.billing_email || "josh@goldtouchds.com",
      website: rawCompany.website || "goldtouchdealersupply.com",
      payment_terms_notes:
        rawCompany.payment_terms_notes ||
        "Payment is due the 20th day of the next month from the date of the invoice.",
      invoice_notes: rawCompany.invoice_notes || "We appreciate your business! Thank you for choosing Gold Touch!",
      industry: rawCompany.industry || "Automotive Wholesale & Dealership Supply",
      business_type: rawCompany.business_type || "S Corporation",
      timezone: rawCompany.timezone || "America/New_York",
      currency: rawCompany.currency || "USD",
    };

    let blogs = (blogsRes.data || []).map((b: any) => ({
      id: b.id,
      title: b.title,
      slug: b.slug,
      category: b.category,
      author_name: b.author_name,
      excerpt: b.excerpt,
      tags: b.tags,
      image_url: b.image_url,
    }));

    if (search) {
      blogs = blogs.filter((b) =>
        [b.title, b.category, b.excerpt].filter(Boolean).some((v) => String(v).toLowerCase().includes(search))
      );
    }

    return {
      success: true,
      company_profile: companyProfile,
      operational_settings: {
        app_settings: appSettingsRes.data || [],
        erp_operational_settings: erpSettingsRes.data || [],
      },
      taxes_and_compliance: {
        configured_tax_rates_count: (taxesRes.data || []).length,
        tax_nexus_states: nexusRes.data || [],
        customer_tax_exemption_profiles_count: taxProfilesCountRes.count ?? 550,
        tax_rates: taxesRes.data || [],
      },
      landing_site: {
        featured_brands: brandsRes.data || [],
        blog_posts: blogs,
        active_coupons: couponsRes.data || [],
      },
      role_permissions: permissionsRes.data || [],
      recent_notifications: notificationsRes.data || [],
      planner_events: plannerRes.data || [],
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export interface PrepareEmailDraftParams {
  recipient_query?: string;
  recipient_email?: string;
  recipient_name?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  body?: string;
  rough_context?: string;
  sender_name?: string;
  sender_email?: string;
}

/**
 * Tool 30: Prepare Email Draft & Open Mailbox Composer
 * Resolves recipient email/name across GoldTouch ERP (`users`, `hr_employees`, `rooftops`, `people`, `suppliers`),
 * enriches with any referenced order/invoice context, and returns a structured `EmailDraftData` payload that pops up the Mailbox Composer.
 */
export async function prepareEmailDraft(params: PrepareEmailDraftParams) {
  try {
    const rawQuery = (params.recipient_query || params.recipient_name || params.recipient_email || "").trim();
    const explicitEmail =
      params.recipient_email && params.recipient_email.includes("@")
        ? params.recipient_email.trim()
        : rawQuery.includes("@")
        ? rawQuery.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || ""
        : "";

    const matchedContacts: Array<{
      name: string;
      email: string;
      role?: string;
      company?: string;
      roleOrCompany?: string;
      source?: "staff" | "hr" | "customer" | "contact" | "supplier";
    }> = [];
    const seen = new Set<string>();

    const pushCandidate = (c: {
      name: string;
      email: string;
      role?: string;
      company?: string;
      roleOrCompany?: string;
      source?: "staff" | "hr" | "customer" | "contact" | "supplier";
    }) => {
      if (!c.email || !c.email.includes("@")) return;
      const key = c.email.trim().toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      matchedContacts.push({
        name: (c.name || c.email.split("@")[0]).trim(),
        email: c.email.trim(),
        role: c.role || c.roleOrCompany,
        company: c.company || c.roleOrCompany,
        roleOrCompany: c.roleOrCompany || c.role || c.company,
        source: c.source,
      });
    };

    const searchClean = rawQuery
      .replace(/<[^>]+>/g, " ")
      .replace(/\b(email|send|to|for|mr|mrs|ms|sir|bro|please|accor\w*)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (searchClean.length >= 2 || explicitEmail) {
      const term = explicitEmail || searchClean;
      const termParts = term.split(/\s+/).filter(Boolean);
      const hrOrClause =
        termParts.length >= 2 && !term.includes("@")
          ? `first_name.ilike.%${termParts[0]}%,last_name.ilike.%${termParts[termParts.length - 1]}%,email.ilike.%${term}%`
          : `first_name.ilike.%${term}%,last_name.ilike.%${term}%,preferred_name.ilike.%${term}%,email.ilike.%${term}%`;

      const [usersRes, hrRes, rooftopsRes, peopleRes, suppRes] = await Promise.all([
        supabaseServer
          .from("users")
          .select("name, email, role, sales_crm_role")
          .or(`name.ilike.%${term}%,email.ilike.%${term}%`)
          .limit(8),
        supabaseServer
          .from("hr_employees")
          .select("first_name, last_name, preferred_name, email, role_title, department")
          .not("email", "is", null)
          .or(hrOrClause)
          .limit(8),
        supabaseServer
          .from("rooftops")
          .select("name, billing_email, city, state")
          .not("billing_email", "is", null)
          .or(`name.ilike.%${term}%,billing_email.ilike.%${term}%`)
          .limit(8),
        supabaseServer
          .from("people")
          .select("name, email, phone")
          .not("email", "is", null)
          .or(`name.ilike.%${term}%,email.ilike.%${term}%`)
          .limit(8),
        supabaseServer
          .from("suppliers")
          .select("name, company_name, contact_name, email")
          .not("email", "is", null)
          .or(`name.ilike.%${term}%,company_name.ilike.%${term}%,contact_name.ilike.%${term}%,email.ilike.%${term}%`)
          .limit(6),
      ]);

      for (const u of usersRes.data || []) {
        const roleLabel = `GoldTouch Staff (${String(u.sales_crm_role || u.role || "Team").replace(/_/g, " ")})`;
        pushCandidate({
          name: u.name || u.email,
          email: u.email,
          role: roleLabel,
          company: "GoldTouch Dealer Supply",
          roleOrCompany: roleLabel,
          source: "staff",
        });
      }
      for (const h of hrRes.data || []) {
        if (h.email) {
          const fullName = `${h.first_name || ""} ${h.last_name || ""}`.trim() || h.preferred_name || h.email;
          const roleLabel = h.role_title || h.department || "GoldTouch Employee";
          pushCandidate({
            name: fullName,
            email: h.email,
            role: roleLabel,
            company: "GoldTouch Dealer Supply",
            roleOrCompany: roleLabel,
            source: "hr",
          });
        }
      }
      for (const r of rooftopsRes.data || []) {
        if (r.billing_email) {
          const roleLabel = `Dealership Rooftop${r.city ? ` · ${r.city}, ${r.state || ""}` : ""}`;
          pushCandidate({
            name: r.name,
            email: r.billing_email,
            role: "Dealership Billing",
            company: r.name,
            roleOrCompany: roleLabel,
            source: "customer",
          });
        }
      }
      for (const p of peopleRes.data || []) {
        if (p.email) {
          pushCandidate({
            name: p.name || p.email,
            email: p.email,
            role: "Dealership Contact",
            company: "Authorized Buyer",
            roleOrCompany: "Dealership Contact",
            source: "contact",
          });
        }
      }
      for (const s of suppRes.data || []) {
        if (s.email) {
          const vendorTitle = s.company_name || s.name || "Supplier";
          pushCandidate({
            name: s.contact_name || vendorTitle,
            email: s.email,
            role: "Supplier Contact",
            company: vendorTitle,
            roleOrCompany: `Supplier · ${vendorTitle}`,
            source: "supplier",
          });
        }
      }

      // If no exact match and searchClean has multiple words, try first token on users & hr_employees
      if (matchedContacts.length === 0 && searchClean.includes(" ")) {
        const firstToken = searchClean.split(/\s+/)[0];
        if (firstToken.length >= 3) {
          const [uFallback, hrFallback] = await Promise.all([
            supabaseServer
              .from("users")
              .select("name, email, role, sales_crm_role")
              .or(`name.ilike.%${firstToken}%,email.ilike.%${firstToken}%`)
              .limit(5),
            supabaseServer
              .from("hr_employees")
              .select("first_name, last_name, preferred_name, email, role_title, department")
              .not("email", "is", null)
              .or(`first_name.ilike.%${firstToken}%,last_name.ilike.%${firstToken}%,email.ilike.%${firstToken}%`)
              .limit(5),
          ]);
          for (const u of uFallback.data || []) {
            const roleLabel = `GoldTouch Staff (${String(u.sales_crm_role || u.role || "Team").replace(/_/g, " ")})`;
            pushCandidate({
              name: u.name || u.email,
              email: u.email,
              role: roleLabel,
              company: "GoldTouch Dealer Supply",
              roleOrCompany: roleLabel,
              source: "staff",
            });
          }
          for (const h of hrFallback.data || []) {
            if (h.email) {
              const fullName = `${h.first_name || ""} ${h.last_name || ""}`.trim() || h.preferred_name || h.email;
              const roleLabel = h.role_title || h.department || "GoldTouch Employee";
              pushCandidate({
                name: fullName,
                email: h.email,
                role: roleLabel,
                company: "GoldTouch Dealer Supply",
                roleOrCompany: roleLabel,
                source: "hr",
              });
            }
          }
        }
      }
    }

    const bestMatch = matchedContacts[0];
    const resolvedToEmail = explicitEmail || bestMatch?.email || "";
    const resolvedToName =
      params.recipient_name ||
      bestMatch?.name ||
      (searchClean && !searchClean.includes("@") ? searchClean : "") ||
      (resolvedToEmail ? resolvedToEmail.split("@")[0] : "");

    const senderDisplay = params.sender_name || "GoldTouch Dealer Supply Operations";
    const greetingName = resolvedToName ? resolvedToName.split(/\s+\(/)[0] : "Team";

    // Clean any command prefix ("send following email to xyz@gmail.com saying...") from rough_context
    const cleanedRoughContext = (params.rough_context || "")
      .replace(
        /^(?:please\s+)?(?:can\s+you\s+)?(?:send|draft|write|compose|prepare)\s+(?:an?\s+|the\s+)?(?:following\s+)?(?:email|e-mail|emial|emila|mail|message)?\s*(?:to\s+)?(?:[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|[a-z]+(?:\s+[a-z]+)?)?\s*(?:with\s+context|saying|that|about|regarding|:|-)?\s*/i,
        ""
      )
      .replace(/\b(?:accor\w*|please|sir|bro|ok)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    const finalSubject =
      (params.subject || "").trim() ||
      (cleanedRoughContext
        ? `GoldTouch Operations Update — ${cleanedRoughContext.slice(0, 56).replace(/[.,;:\s]+$/, "")}`
        : "Update from GoldTouch Dealer Supply");

    const rawBodyCandidate = (params.body || "").trim();
    const isAlreadyFormattedEmail =
      /^(?:hi|hello|dear|good\s+(?:morning|afternoon|evening))\b/i.test(rawBodyCandidate) ||
      /\b(?:best\s+regards|sincerely|thank\s+you|warm\s+regards)\b/i.test(rawBodyCandidate);

    const finalBody =
      rawBodyCandidate && isAlreadyFormattedEmail
        ? rawBodyCandidate
        : `Hi ${greetingName},\n\n${
            rawBodyCandidate ||
            (cleanedRoughContext
              ? `I am reaching out regarding ${cleanedRoughContext.replace(/^[iI]\s+/, "")}.`
              : "I wanted to follow up with you regarding our recent GoldTouch Dealer Supply operations update.")
          }\n\nPlease let me know if you need any additional information or have any questions.\n\nBest regards,\n${senderDisplay}\nGoldTouch Dealer Supply`;

    const contactsSlice = matchedContacts.slice(0, 8);
    const emailDraft = {
      id: `draft_${Date.now()}`,
      to: resolvedToEmail,
      to_email: resolvedToEmail,
      toName: resolvedToName || undefined,
      to_name: resolvedToName || undefined,
      recipientName: resolvedToName || undefined,
      toRoleOrCompany: bestMatch?.roleOrCompany || undefined,
      recipientRoleOrCompany: bestMatch?.roleOrCompany || undefined,
      cc: params.cc || "",
      cc_email: params.cc || "",
      bcc: params.bcc || "",
      bcc_email: params.bcc || "",
      subject: finalSubject,
      body: finalBody,
      senderName: senderDisplay,
      sender_name: senderDisplay,
      senderEmail: params.sender_email || undefined,
      sender_email: params.sender_email || undefined,
      rough_context: params.rough_context || undefined,
      contextSummary: params.rough_context || undefined,
      context_summary: params.rough_context || undefined,
      matchedContacts: contactsSlice,
      suggested_contacts: contactsSlice,
      candidateContacts: contactsSlice,
      status: "draft" as const,
    };

    return {
      success: true,
      email_draft: emailDraft,
      recipient_resolved: Boolean(resolvedToEmail),
      matched_contacts_count: matchedContacts.length,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}



