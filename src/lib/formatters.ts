/**
 * Formatters and string sanitation utilities for SARA AI Operations
 */

const LOWERCASE_WORDS = new Set([
  "to",
  "and",
  "or",
  "in",
  "of",
  "for",
  "the",
  "on",
  "a",
  "an",
  "at",
  "by",
  "with",
  "from"
]);

const PRESERVED_UPPERCASE_ACRONYMS = new Set([
  "LLC",
  "INC",
  "CORP",
  "LTD",
  "LP",
  "RV",
  "GM",
  "GMC",
  "BMW",
  "VW",
  "CJDR",
  "CDJR",
  "CHRYS",
  "RJ",
  "JC",
  "JD",
  "C&C",
  "B&B",
  "A&A",
  "USA",
  "US",
  "OEM",
  "LED",
  "HD",
  "4WD",
  "2WD",
  "AWD",
  "4X4",
  "4DR",
  "2DR",
  "F150",
  "F-150",
  "F250",
  "F-250",
  "F350",
  "F-350",
  "SUV",
  "ATV",
  "UTV",
  "II",
  "III",
  "IV",
  "BBQ",
  "XL",
  "XXL",
  "2XL",
  "3XL",
  "4XL",
  "WV",
  "OH",
  "KY",
  "PA",
  "VA",
  "NC",
  "SC",
  "TX",
  "FL",
  "GA",
  "IN",
  "IL",
  "MI",
  "TN",
  "MD",
  "NY"
]);

/**
 * Formats ALL-CAPS or all-lowercase customer/product names into natural,
 * executive-ready Title Case while preserving acronyms (LLC, RV, GM, BMW, 4WD, etc.)
 * and apostrophes ("ROY'S RV SUPERCENTER LLC" -> "Roy's RV Supercenter LLC",
 * "john grass" -> "John Grass").
 */
export function formatCleanEntityName(val: string | null | undefined): string {
  if (!val) return "";
  const trimmed = String(val).replace(/\s+/g, " ").trim();
  if (!trimmed) return "";

  const lettersOnly = trimmed.replace(/[^a-zA-Z]/g, "");
  if (!lettersOnly) return trimmed;

  const isAllLower = lettersOnly === lettersOnly.toLowerCase();

  return trimmed
    .split(" ")
    .map((token, idx) => {
      const cleanAlphaNum = token.replace(/^[("'[]+|[)"'\],.:;]+$/g, "");
      const upperClean = cleanAlphaNum.toUpperCase();

      if (PRESERVED_UPPERCASE_ACRONYMS.has(upperClean)) {
        return token.replace(cleanAlphaNum, upperClean);
      }

      // Preserve short alphanumeric model/spec tokens like "24-C", "00-06", "2.5-3IN", "3PC"
      if (/^\d+[A-Z0-9.-]*$/i.test(cleanAlphaNum)) {
        if (/^\d+pc$/i.test(cleanAlphaNum)) {
          return token.replace(cleanAlphaNum, cleanAlphaNum.toLowerCase());
        }
        return token.replace(cleanAlphaNum, upperClean);
      }

      const tokenLetters = cleanAlphaNum.replace(/[^a-zA-Z]/g, "");
      const isTokenAllUpper = tokenLetters.length >= 2 && tokenLetters === tokenLetters.toUpperCase();

      // If neither the whole string is all-lowercase nor this token is all-uppercase, preserve existing mixed case (e.g. "McCormick", "(Cambridge,")
      if (!isAllLower && !isTokenAllUpper) {
        return token;
      }

      const lowerToken = token.toLowerCase();
      if (idx > 0 && LOWERCASE_WORDS.has(lowerToken)) {
        return lowerToken;
      }

      // Capitalize first letter of word segments (respecting hyphens/slashes, but keeping 's lowercase)
      return lowerToken
        .replace(/(^|[-/(])([a-z])/g, (_m, sep, char) => `${sep}${char.toUpperCase()}`);
    })
    .join(" ");
}

/**
 * Separates verbose ERP product/line-item descriptions (especially ALL-CAPS strings
 * with embedded rental/policy disclaimers) into a clean, human-readable product title
 * and an optional concise policy/specification note.
 */
export function parseCatalogProductTitle(
  rawTitle: string | null | undefined
): { title: string; note: string | null } {
  if (!rawTitle) {
    return { title: "Dealership Supply Product", note: null };
  }
  const cleaned = String(rawTitle)
    .replace(/DATE\s+OF\s+DELIVERY\s*:\s*_+/gi, "")
    .replace(/_+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) {
    return { title: "Dealership Supply Product", note: null };
  }

  let primaryRaw = cleaned;
  let noteRaw: string | null = null;

  const disclaimerMatch = cleaned.match(
    /^(.*?)\s+(?:-\s*)?(PRICE DOES NOT INCLUDE\b.*|DOES NOT INCLUDE\b.*|RENTAL FEE OF\b.*|AS OF \d+\/\d+\/\d+\b.*)$/i
  );
  if (disclaimerMatch && disclaimerMatch[1]?.trim()) {
    primaryRaw = disclaimerMatch[1].trim();
    noteRaw = disclaimerMatch[2].trim();
  } else if (cleaned.length > 64 && /\s+-\s*|\s+-To\s+/i.test(cleaned)) {
    const parts = cleaned.split(/\s+-\s*|\s+-To\s+/i);
    primaryRaw = parts[0].trim();
    noteRaw = parts.slice(1).join(" — ").trim();
  }

  const formattedTitle = formatCleanEntityName(primaryRaw);

  let formattedNote: string | null = null;
  if (noteRaw) {
    const cleanClause = noteRaw
      .split(/\s+-\s*|\s+-To\s+/i)[0]
      .trim()
      .toLowerCase();
    if (cleanClause) {
      formattedNote = cleanClause.charAt(0).toUpperCase() + cleanClause.slice(1);
      if (formattedNote.length > 90) {
        formattedNote =
          formattedNote.slice(0, 87).replace(/[,\s;:-]+$/, "") + "...";
      }
    }
  }

  return {
    title: formattedTitle || "Dealership Supply Product",
    note: formattedNote,
  };
}

/**
 * Strips underscores and dashes, formatting snake_case or slug strings
 * into clean, executive-ready Title Case words without any underscores.
 *
 * Example:
 *   'ready_to_order'      -> 'Ready to Order'
 *   'in_transit'          -> 'In Transit'
 *   'pending_fulfillment' -> 'Pending Fulfillment'
 *   'ready_to_install'    -> 'Ready to Install'
 *   'purchase_order'      -> 'Purchase Order'
 */
export function formatLabel(val: string | null | undefined): string {
  if (!val) return "";
  const cleaned = String(val).replace(/[_-]+/g, " ").trim();
  if (!cleaned) return "";

  return cleaned
    .split(/\s+/)
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && LOWERCASE_WORDS.has(lower)) {
        return lower;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Format currency numbers cleanly with 2 decimal places and commas
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return "$0.00";
  return `$${Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Sanitize any text output to ensure no raw snake_case database statuses leak through
 */
export function sanitizeTextLabels(text: string): string {
  if (!text) return "";
  let result = text
    .replace(/\bready_to_order\b/gi, "Ready to Order")
    .replace(/\bready_to_install\b/gi, "Ready to Install")
    .replace(/\bready_to_ship\b/gi, "Ready to Ship")
    .replace(/\bpending_fulfillment\b/gi, "Pending Fulfillment")
    .replace(/\bawaiting_fulfillment\b/gi, "Awaiting Fulfillment")
    .replace(/\bin_transit\b/gi, "In Transit")
    .replace(/\bpartially_shipped\b/gi, "Partially Shipped")
    .replace(/\bpurchase_order\b/gi, "Purchase Order")
    .replace(/\bpurchase_orders\b/gi, "Purchase Orders")
    .replace(/\bcredit_hold\b/gi, "Credit Hold")
    .replace(/\bawaiting_carrier_pickup\b/gi, "Awaiting Carrier Pickup")
    .replace(/\bbody_shop\b/gi, "Body Shop")
    .replace(/\bsales_manager\b/gi, "Sales Manager")
    .replace(/\bsales_rep\b/gi, "Sales Rep")
    .replace(/\btax_exempt\b/gi, "Tax Exempt")
    .replace(/\bcustom_design\b/gi, "Custom Design")
    .replace(/\bnet_30\b/gi, "Net 30")
    .replace(/\bnet_60\b/gi, "Net 60")
    .replace(/\bnet_90\b/gi, "Net 90")
    .replace(/\bdue_on_receipt\b/gi, "Due on Receipt")
    .replace(/\bout_of_stock\b/gi, "Out of Stock")
    .replace(/\bback_ordered\b/gi, "Back Ordered")
    .replace(/\bdrop_ship\b/gi, "Drop Ship")
    .replace(/\bin_stock\b/gi, "In Stock")
    .replace(/\bstandard_shipping\b/gi, "Standard Shipping")
    .replace(/\bexpress_shipping\b/gi, "Express Shipping")
    .replace(/\bpartially_paid\b/gi, "Partially Paid")
    .replace(/\bqc_approved\b/gi, "QC Approved")
    .replace(/\bsupplier_confirmed\b/gi, "Supplier Confirmed");

  // Also replace any isolated snake_case phrases in prose that are not URLs, paths, or code:
  // Match word_word or word_word_word surrounded by spaces or punctuation
  result = result.replace(/(?<=\s|^|\()([a-z]{2,})_([a-z]{2,}(?:_[a-z]{2,})?)(?=\s|$|[.,!?;:)])/g, (match) => {
    // Skip if it looks like an image file, extension, or URL
    if (match.endsWith(".png") || match.endsWith(".jpg") || match.startsWith("http")) return match;
    return formatLabel(match);
  });

  // Normalize any "(Order INV-xxxx-N)" in prose to its canonical Sales Order "(Order SO-xxxx)" and strip "(Order N/A)"
  result = result
    .replace(
      /\(\s*Order\s+(\*\*)?INV-(\d{3,7})(?:-[A-Za-z0-9]+)?(\*\*)?\s*\)/gi,
      (_m, b1, digits, b2) => `(Order ${b1 || ""}SO-${digits}${b2 || ""})`
    )
    .replace(/\s*\(\s*Order\s+(?:\*\*)?N\/A(?:\*\*)?\s*\)/gi, "")
    .replace(/\*{4,}/g, "")
    .replace(/^(\s*)[•·\u2022\u00b7]\s+/gm, "$1- ")
    .replace(/\s+[•·\u2022\u00b7]\s+/g, ", ")
    .replace(/[•·\u2022\u00b7]/g, "");

  return result;
}
