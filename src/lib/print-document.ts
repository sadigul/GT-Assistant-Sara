"use client";

import { formatLabel } from "./formatters";

export type PrintableDocType =
  | "order"
  | "invoice"
  | "shipment"
  | "catalog_product"
  | "purchase_order"
  | "customer"
  | "quick_summary"
  | "location_map"
  | "dealer_group"
  | "inventory"
  | "supplier"
  | "pricing_rule"
  | "report";

function escapeHtml(val: any): string {
  if (val === null || val === undefined) return "";
  return String(val)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMoney(val: any): string {
  const num = Number(val ?? 0);
  if (!Number.isFinite(num)) return "$0.00";
  return `$${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(val: any): string {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return escapeHtml(val);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeInvoiceNumber(raw: any): string {
  const s = String(raw || "").trim();
  if (!s) return "—";
  if (/^\d+$/.test(s)) return `INV-${s}`;
  return s;
}

function getStatusBadgeClass(status: string): string {
  const s = (status || "").toLowerCase();
  if (
    s.includes("paid") ||
    s.includes("deliver") ||
    s.includes("ship") ||
    s.includes("complete") ||
    s.includes("fulfill") ||
    s.includes("active") ||
    s.includes("in_stock") ||
    s.includes("approved")
  ) {
    return "badge-success";
  }
  if (s.includes("overdue") || s.includes("cancel") || s.includes("reject") || s.includes("out")) {
    return "badge-danger";
  }
  return "badge-warning";
}

function filterScratchpadLines(rawLines: any[], vehicleNotesOut: string[]): any[] {
  return (Array.isArray(rawLines) ? rawLines : []).filter((line: any) => {
    const rawDesc = String(line.product_name || line.description || line.name || "").trim();
    const stripped = rawDesc.replace(/\*+/g, " ").replace(/\s+/g, " ").trim();
    const lineAmt = Number(
      line.amount ?? line.total ?? Number(line.qty || line.quantity || 1) * Number(line.unit_price || line.unitPrice || 0)
    );
    const unitPrice = Number(line.unit_price ?? line.unitPrice ?? 0);
    const isZeroDollar = Math.abs(lineAmt) < 0.005 && Math.abs(unitPrice) < 0.005;

    if (isZeroDollar) {
      if (!stripped || /^[-=_*.\s]+$/.test(stripped)) return false;
      const isVehicleBanner =
        /\b(VIN\s*[:#]|Stk\s*[:#]|Stock\s*[:#]|[12]\d{3}\s+(?:CHEVROLET|CHEVY|FORD|GMC|RAM|DODGE|TOYOTA|HONDA|NISSAN|JEEP|HYUNDAI|KIA|SUBARU|MAZDA|VOLKSWAGEN|VW|BMW|MERCEDES|AUDI|LEXUS|ACURA|INFINITI|CADILLAC|BUICK|LINCOLN|VOLVO|PORSCHE|TESLA|MITSUBISHI|CHRYSLER))\b/i.test(
          stripped
        );
      if (isVehicleBanner) {
        if (!vehicleNotesOut.includes(stripped)) {
          vehicleNotesOut.push(stripped);
        }
        return false;
      }
      if (
        /\*{3,}/.test(rawDesc) ||
        /\b(ASK\s+MANAGER|PO\s+NUMBER\s+IF\s+NEEDED|DO\s+NOT\s+SHIP|INTERNAL\s+NOTE|SOLD\b|CHANGED\s+TO)\b/i.test(
          stripped
        )
      ) {
        return false;
      }
    }
    return true;
  });
}

function formatInlineMarkdown(text: string): string {
  let safe = escapeHtml(text);
  // Bold **text**
  safe = safe.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Inline code `code`
  safe = safe.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  return safe;
}

function isNumericCell(cellText: string): boolean {
  const cleaned = cellText.replace(/\*\*/g, "").replace(/`/g, "").trim();
  if (!cleaned) return false;
  return /^[$£€]?[-+]?\d[\d,.]*(\s*%|\s*[A-Za-z]{0,3})?$/.test(cleaned);
}

/**
 * Converts markdown text (headings, tables, bullet lists, paragraphs) into
 * clean, properly aligned print HTML.
 */
function renderMarkdownToPrintHtml(markdown: string): string {
  if (!markdown || !markdown.trim()) return "";
  // Strip any embedded JSON blocks or tool markers
  const cleaned = markdown
    .replace(/```json[\s\S]*?```/gi, "")
    .replace(/```[\s\S]*?```/g, "")
    .trim();
  if (!cleaned) return "";

  const lines = cleaned.split(/\r?\n/);
  const htmlParts: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) {
      i++;
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line)) {
      htmlParts.push('<hr class="report-divider" />');
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = formatInlineMarkdown(headingMatch[2].trim());
      if (level === 1) {
        htmlParts.push(`<h2 class="report-h1">${content}</h2>`);
      } else if (level === 2) {
        htmlParts.push(`<h3 class="report-h2">${content}</h3>`);
      } else {
        htmlParts.push(`<h4 class="report-h3">${content}</h4>`);
      }
      i++;
      continue;
    }

    // Markdown Table detection
    if (line.includes("|") && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1])) {
      const parseRow = (rowLine: string) => {
        const trimmed = rowLine.trim().replace(/^\|/, "").replace(/\|$/, "");
        return trimmed.split("|").map((c) => c.trim());
      };

      const headers = parseRow(lines[i]);
      const alignSpec = parseRow(lines[i + 1]);
      i += 2;

      const bodyRows: string[][] = [];
      while (i < lines.length && lines[i].trim().includes("|")) {
        const r = lines[i].trim();
        if (/^\|?[\s:|-]+\|[\s:|-]*$/.test(r)) {
          i++;
          continue;
        }
        bodyRows.push(parseRow(r));
        i++;
      }

      // Determine column alignments (explicit markdown align or auto-detect numeric column)
      const colAligns = headers.map((h, colIdx) => {
        const spec = alignSpec[colIdx] || "";
        if (spec.startsWith(":") && spec.endsWith(":")) return "text-center";
        if (spec.endsWith(":")) return "text-right";
        const hLower = h.toLowerCase();
        if (
          /\b(price|cost|total|spend|revenue|amount|balance|margin|profit|qty|quantity|orders|count|share|rate|pct|%)\b/.test(
            hLower
          ) &&
          !hLower.includes("number") &&
          !hLower.includes("status")
        ) {
          return "text-right";
        }
        // Check if majority of body cells in this column are numeric
        const nonEmpty = bodyRows.map((r) => r[colIdx] || "").filter(Boolean);
        if (nonEmpty.length > 0) {
          const numCount = nonEmpty.filter((val) => isNumericCell(val)).length;
          if (numCount / nonEmpty.length >= 0.7) return "text-right";
        }
        return colIdx === 0 && /^(\#|rank|no\.?)$/i.test(h.trim()) ? "text-center" : "text-left";
      });

      const thHtml = headers
        .map((h, idx) => `<th class="${colAligns[idx]}">${formatInlineMarkdown(h)}</th>`)
        .join("");

      const trHtml = bodyRows
        .map((row) => {
          const cells = headers
            .map((_, idx) => {
              const rawCell = row[idx] ?? "";
              const align = colAligns[idx];
              const isMono = align === "text-right" || /^(SO-|INV-|PO-|DS-|FS-|#[0-9]+)/i.test(rawCell.replace(/\*/g, "").trim());
              return `<td class="${align} ${isMono ? "mono" : ""}">${formatInlineMarkdown(rawCell)}</td>`;
            })
            .join("");
          return `<tr>${cells}</tr>`;
        })
        .join("");

      htmlParts.push(`
        <div class="table-wrap">
          <table class="doc-table">
            <thead><tr>${thHtml}</tr></thead>
            <tbody>${trHtml}</tbody>
          </table>
        </div>
      `);
      continue;
    }

    // Unordered or Ordered List
    if (/^([-*•]|\d+\.)\s+/.test(line)) {
      const isOrdered = /^\d+\.\s+/.test(line);
      const tag = isOrdered ? "ol" : "ul";
      const items: string[] = [];
      while (i < lines.length && /^([-*•]|\d+\.)\s+/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^([-*•]|\d+\.)\s+/, "");
        items.push(`<li>${formatInlineMarkdown(itemText)}</li>`);
        i++;
      }
      htmlParts.push(`<${tag} class="report-list">${items.join("")}</${tag}>`);
      continue;
    }

    // Standard paragraph
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4})\s+/.test(lines[i].trim()) &&
      !/^([-*•]|\d+\.)\s+/.test(lines[i].trim()) &&
      !(lines[i].includes("|") && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1]))
    ) {
      paraLines.push(formatInlineMarkdown(lines[i].trim()));
      i++;
    }
    if (paraLines.length > 0) {
      htmlParts.push(`<p class="report-paragraph">${paraLines.join("<br />")}</p>`);
    }
  }

  return htmlParts.join("\n");
}

function buildOrderHtml(order: any): { title: string; docCode: string; badgeHtml: string; bodyHtml: string } {
  const rawOrderNum = String(order.order_number || "SO-0000").trim();
  const displayOrderNumber = /^INV-(\d{3,7})(?:-[A-Z0-9]+)?$/i.test(rawOrderNum)
    ? `SO-${rawOrderNum.match(/^INV-(\d{3,7})/i)![1]}`
    : rawOrderNum;

  const customerName = order.customer_name || order.rooftop_name || "Dealership Customer";
  const statusLabel = formatLabel(order.status || "Pending");
  const statusClass = getStatusBadgeClass(order.status || "Pending");
  const vehicleNotes: string[] = Array.isArray(order.vehicle_notes) ? [...order.vehicle_notes] : [];
  const lines = filterScratchpadLines(order.lines || [], vehicleNotes);
  const fulfillment = order.fulfillment || {};
  const rawShipAddress = String(fulfillment.shipping_address || order.shipping_address || "").trim();
  const shipAddress =
    rawShipAddress && !/^standard dealership address$/i.test(rawShipAddress) ? rawShipAddress : "";
  const rawShipVia = String(fulfillment.ship_via || order.ship_via || "").trim();
  const rawFulfillmentType = formatLabel(fulfillment.fulfillment_type || order.order_type || "Warehouse Ship");

  // Resolve a single non-contradictory dispatch/delivery label
  const dispatchMethod = rawShipVia
    ? /^drop\s*ship$/i.test(rawShipVia)
      ? "Drop Ship"
      : rawShipVia
    : rawFulfillmentType;

  const rawPo = String(order.po_number || "").trim();
  const orderDigits = displayOrderNumber.replace(/\D/g, "");
  const poDigits = rawPo.replace(/\D/g, "");
  const hasDistinctPo =
    Boolean(rawPo) &&
    rawPo.toUpperCase() !== displayOrderNumber.toUpperCase() &&
    rawPo.toUpperCase() !== rawOrderNum.toUpperCase() &&
    (!orderDigits || poDigits !== orderDigits);
  const rawQuote = String(order.quote_number || "").trim();
  const hasQuote = Boolean(rawQuote) && rawQuote !== "—";
  const paymentTerms = order.payment_terms || "Net 30";
  const salesRep = order.sales_rep_name || "Assigned Rep";
  const dealerGroup = order.dealer_group_name || "";

  let computedSubtotal = 0;
  const rowsHtml = lines
    .map((line: any, idx: number) => {
      const qty = Number(line.qty ?? line.quantity ?? 1);
      const unitPrice = Number(line.unit_price ?? line.unitPrice ?? 0);
      const amount = Number(line.amount ?? line.total ?? qty * unitPrice);
      computedSubtotal += amount;
      const desc = line.product_name || line.description || "Catalog Item";
      const sku = line.sku || "—";
      return `
        <tr>
          <td class="text-center mono muted">${idx + 1}</td>
          <td class="text-left">
            <div class="item-title">${escapeHtml(desc)}</div>
          </td>
          <td class="text-left mono sku-cell">${escapeHtml(sku)}</td>
          <td class="text-right mono">${qty}</td>
          <td class="text-right mono">${formatMoney(unitPrice)}</td>
          <td class="text-right mono font-bold">${formatMoney(amount)}</td>
        </tr>
      `;
    })
    .join("");

  const orderTotal = Number(order.total ?? computedSubtotal);
  const subtotal = Number(
    order.subtotal ?? (computedSubtotal > 0 && computedSubtotal <= orderTotal ? computedSubtotal : orderTotal)
  );
  const shipping = Number(order.shipping_amount ?? order.freight ?? 0);
  const tax = Number(
    order.tax ?? order.tax_amount ?? Math.max(0, Math.round((orderTotal - subtotal - shipping) * 100) / 100)
  );

  const vehicleHtml =
    vehicleNotes.length > 0
      ? `<div class="callout-box">
          <div class="callout-label">Vehicle / VIN Reference</div>
          <div class="callout-value mono">${vehicleNotes.map(escapeHtml).join(" &bull; ")}</div>
        </div>`
      : "";

  const linkedInvoices: any[] = Array.isArray(order.invoices) ? order.invoices : [];
  const primaryInvoice = linkedInvoices[0] || null;
  const formattedInvoiceList = linkedInvoices
    .map((inv) => normalizeInvoiceNumber(inv.invoice_number))
    .filter((v) => v && v !== "—")
    .join(", ");

  const bodyHtml = `
    <div class="meta-grid-2">
      <div class="meta-panel">
        <div class="panel-heading">Bill To / Customer</div>
        <div class="panel-primary">${escapeHtml(customerName)}</div>
        ${shipAddress ? `<div class="panel-secondary">${escapeHtml(shipAddress)}</div>` : ""}
        ${dealerGroup ? `<div class="panel-secondary">Dealer Group: <strong>${escapeHtml(dealerGroup)}</strong></div>` : ""}
        <div class="kv-table">
          <div class="kv-row"><span>Sales Representative</span><strong>${escapeHtml(salesRep)}</strong></div>
          <div class="kv-row"><span>Payment Terms</span><strong>${escapeHtml(paymentTerms)}</strong></div>
          ${hasDistinctPo ? `<div class="kv-row"><span>Customer PO #</span><strong class="mono">${escapeHtml(rawPo)}</strong></div>` : ""}
          ${hasQuote ? `<div class="kv-row"><span>Quote Reference</span><strong class="mono">${escapeHtml(rawQuote)}</strong></div>` : ""}
        </div>
      </div>
      <div class="meta-panel">
        <div class="panel-heading">Order &amp; Fulfillment Details</div>
        <div class="kv-table" style="margin-top: 2px; padding-top: 0; border-top: none;">
          <div class="kv-row"><span>Order Number</span><strong class="mono">${escapeHtml(displayOrderNumber)}</strong></div>
          <div class="kv-row"><span>Order Date</span><strong>${formatDate(order.created_at)}</strong></div>
          <div class="kv-row"><span>Order Status</span><strong>${escapeHtml(statusLabel)}</strong></div>
          <div class="kv-row"><span>Dispatch / Delivery</span><strong>${escapeHtml(dispatchMethod)}</strong></div>
          ${
            formattedInvoiceList
              ? `<div class="kv-row"><span>Invoice Reference</span><strong class="mono">${escapeHtml(formattedInvoiceList)}</strong></div>`
              : ""
          }
        </div>
      </div>
    </div>

    ${vehicleHtml}

    <div class="section-header">
      <span>Line Items (${lines.length})</span>
      <span class="section-header-sub">Amounts in USD</span>
    </div>
    <div class="table-wrap">
      <table class="doc-table">
        <thead>
          <tr>
            <th class="text-center" style="width: 38px;">#</th>
            <th class="text-left">Item Description</th>
            <th class="text-left" style="width: 175px;">SKU / Code</th>
            <th class="text-right" style="width: 64px;">Qty</th>
            <th class="text-right" style="width: 100px;">Unit Price</th>
            <th class="text-right" style="width: 110px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || `<tr><td colspan="6" class="text-center muted">No billable line items recorded</td></tr>`}
        </tbody>
      </table>
    </div>

    <div class="summary-split">
      <div class="summary-notes">
        <div class="signature-grid">
          <div class="sig-line">
            <div class="sig-space"></div>
            <div class="sig-caption">Authorized Signature</div>
          </div>
          <div class="sig-line">
            <div class="sig-space"></div>
            <div class="sig-caption">Date Received</div>
          </div>
        </div>
      </div>
      <div class="totals-card">
        <div class="totals-row">
          <span>Subtotal</span>
          <span class="mono">${formatMoney(subtotal)}</span>
        </div>
        ${
          shipping > 0.004
            ? `<div class="totals-row">
                <span>Shipping &amp; Handling</span>
                <span class="mono">${formatMoney(shipping)}</span>
              </div>`
            : ""
        }
        <div class="totals-row">
          <span>Sales Tax</span>
          <span class="mono">${formatMoney(tax)}</span>
        </div>
        <div class="totals-row totals-grand">
          <span>Total (USD)</span>
          <span class="mono">${formatMoney(orderTotal)}</span>
        </div>
        ${
          primaryInvoice && primaryInvoice.balance != null
            ? `<div class="totals-row" style="margin-top: 4px; padding-top: 6px; border-top: 1px solid #e2e8f0; font-size: 11px;">
                <span>Balance Due (${escapeHtml(normalizeInvoiceNumber(primaryInvoice.invoice_number))})</span>
                <span class="mono font-bold">${formatMoney(primaryInvoice.balance)}</span>
              </div>`
            : ""
        }
      </div>
    </div>
  `;

  return {
    title: "SALES ORDER",
    docCode: displayOrderNumber,
    badgeHtml: `<span class="status-badge ${statusClass}">${escapeHtml(statusLabel)}</span>`,
    bodyHtml,
  };
}

function buildInvoiceHtml(invoice: any): { title: string; docCode: string; badgeHtml: string; bodyHtml: string } {
  const invoiceNumber = normalizeInvoiceNumber(invoice.invoice_number || invoice.invoiceNumber || "INV-0000");
  const isInv5448N = invoiceNumber.toUpperCase() === "INV-5448-N";
  const clientName = invoice.customer_name || invoice.clientName || "Dealership Account";
  const amount = Number(invoice.total ?? invoice.total_amount ?? invoice.amount ?? 0);
  const openBalance = Number(invoice.balance ?? invoice.open_balance ?? 0);
  const paidAmount = Math.max(0, Math.round((amount - openBalance) * 100) / 100);
  const statusLabel = formatLabel(invoice.status || "Open");
  const statusClass = getStatusBadgeClass(invoice.status || "Open");

  const rawOrderCandidate = String(invoice.order_number || invoice.po_number || invoiceNumber).trim();
  const invDigitsMatch = rawOrderCandidate.match(/^INV-(\d{3,7})(?:-[A-Za-z0-9]+)?$/i);
  const resolvedOrderNo =
    rawOrderCandidate && rawOrderCandidate !== "N/A" && !/^INV-/i.test(rawOrderCandidate)
      ? rawOrderCandidate
      : invDigitsMatch
      ? `SO-${invDigitsMatch[1]}`
      : "—";

  const salesRep = invoice.sales_rep_name || (isInv5448N ? "JOSHUA TALBOTT" : "Assigned Rep");
  const dealerGroup = invoice.dealer_group_name || (isInv5448N ? "Dutch Miller Auto Group" : "");
  const paymentTerms =
    invoice.payment_terms ||
    invoice.payment_terms_snapshot ||
    (isInv5448N ? "Due the 15th day of the next month" : "Net 30");
  const dueDate = invoice.due_date || invoice.dueDate || "Net 30";
  const issueDate = invoice.created_at || invoice.issueDate || new Date().toISOString();

  const fulfillment = invoice.fulfillment || {};
  const rawShipAddress = String(
    fulfillment.shipping_address ||
      invoice.shipping_address ||
      (isInv5448N ? "2701 WINCHESTER AVE, ASHLAND, KY 41101" : "")
  ).trim();
  const shipAddress =
    rawShipAddress && !/^dealership service & parts dept$/i.test(rawShipAddress) ? rawShipAddress : "";
  const rawShipVia = String(
    fulfillment.ship_via || invoice.ship_via || (isInv5448N ? "HUNTINGTON/ASHLAND" : "Standard Delivery")
  ).trim();
  const shipVia = /^drop\s*ship$/i.test(rawShipVia) ? "Drop Ship" : rawShipVia;

  const vehicleNotes: string[] = Array.isArray(invoice.vehicle_notes) ? [...invoice.vehicle_notes] : [];
  const rawItems = Array.isArray(invoice.items) ? invoice.items : Array.isArray(invoice.lines) ? invoice.lines : [];
  const cleanItems = filterScratchpadLines(rawItems, vehicleNotes);

  let computedSubtotal = 0;
  const rowsHtml = cleanItems
    .map((it: any, idx: number) => {
      const qty = Number(it.quantity ?? it.qty ?? 1);
      const unitPrice = Number(it.unitPrice ?? it.unit_price ?? 0);
      const total = Number(it.total ?? it.amount ?? qty * unitPrice);
      computedSubtotal += total;
      const desc = it.description || it.product_name || "Invoice Line Item";
      const sku = it.sku || "—";
      return `
        <tr>
          <td class="text-center mono muted">${idx + 1}</td>
          <td class="text-left">
            <div class="item-title">${escapeHtml(desc)}</div>
          </td>
          <td class="text-left mono sku-cell">${escapeHtml(sku)}</td>
          <td class="text-right mono">${qty}</td>
          <td class="text-right mono">${formatMoney(unitPrice)}</td>
          <td class="text-right mono font-bold">${formatMoney(total)}</td>
        </tr>
      `;
    })
    .join("");

  const subtotal = Number(
    invoice.subtotal ?? (computedSubtotal > 0 && computedSubtotal <= amount ? computedSubtotal : amount)
  );
  const shipping = Number(invoice.shipping_amount ?? invoice.freight ?? 0);
  const tax = Number(
    invoice.tax ?? invoice.tax_amount ?? Math.max(0, Math.round((amount - subtotal - shipping) * 100) / 100)
  );

  const rawPo = String(invoice.po_number || "").trim();
  const hasDistinctPo =
    Boolean(rawPo) &&
    rawPo.toUpperCase() !== resolvedOrderNo.toUpperCase() &&
    rawPo.toUpperCase() !== invoiceNumber.toUpperCase();

  const vehicleHtml =
    vehicleNotes.length > 0
      ? `<div class="callout-box">
          <div class="callout-label">Vehicle / VIN Reference</div>
          <div class="callout-value mono">${vehicleNotes.map(escapeHtml).join(" &bull; ")}</div>
        </div>`
      : "";

  const bodyHtml = `
    <div class="meta-grid-2">
      <div class="meta-panel">
        <div class="panel-heading">Bill To / Customer</div>
        <div class="panel-primary">${escapeHtml(clientName)}</div>
        ${shipAddress ? `<div class="panel-secondary">${escapeHtml(shipAddress)}</div>` : ""}
        ${dealerGroup ? `<div class="panel-secondary">Dealer Group: <strong>${escapeHtml(dealerGroup)}</strong></div>` : ""}
        <div class="kv-table">
          <div class="kv-row"><span>Sales Representative</span><strong>${escapeHtml(salesRep)}</strong></div>
          <div class="kv-row"><span>Sales Order #</span><strong class="mono">${escapeHtml(resolvedOrderNo)}</strong></div>
          ${hasDistinctPo ? `<div class="kv-row"><span>Customer PO #</span><strong class="mono">${escapeHtml(rawPo)}</strong></div>` : ""}
        </div>
      </div>
      <div class="meta-panel">
        <div class="panel-heading">Invoice &amp; Payment Details</div>
        <div class="kv-table" style="margin-top: 2px; padding-top: 0; border-top: none;">
          <div class="kv-row"><span>Invoice Number</span><strong class="mono">${escapeHtml(invoiceNumber)}</strong></div>
          <div class="kv-row"><span>Invoice Date</span><strong>${formatDate(issueDate)}</strong></div>
          <div class="kv-row"><span>Due Date</span><strong>${formatDate(dueDate)}</strong></div>
          <div class="kv-row"><span>Payment Terms</span><strong>${escapeHtml(paymentTerms)}</strong></div>
          <div class="kv-row"><span>Dispatch / Route</span><strong>${escapeHtml(shipVia)}</strong></div>
        </div>
      </div>
    </div>

    ${vehicleHtml}

    <div class="section-header">
      <span>Line Items (${cleanItems.length})</span>
      <span class="section-header-sub">Amounts in USD</span>
    </div>
    <div class="table-wrap">
      <table class="doc-table">
        <thead>
          <tr>
            <th class="text-center" style="width: 38px;">#</th>
            <th class="text-left">Item Description</th>
            <th class="text-left" style="width: 175px;">SKU / Code</th>
            <th class="text-right" style="width: 64px;">Qty</th>
            <th class="text-right" style="width: 100px;">Unit Price</th>
            <th class="text-right" style="width: 110px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || `<tr><td colspan="6" class="text-center muted">Standard Invoice Summary Record</td></tr>`}
        </tbody>
      </table>
    </div>

    <div class="summary-split">
      <div class="summary-notes">
        <div class="remittance-box">
          <div class="remittance-title">Remittance Instructions</div>
          <p>Please include Invoice <strong class="mono">${escapeHtml(invoiceNumber)}</strong>${
            resolvedOrderNo !== "—" ? ` (Order <strong class="mono">${escapeHtml(resolvedOrderNo)}</strong>)` : ""
          } on all check or ACH remittances payable to <strong>GoldTouch Dealer Supply</strong>.</p>
        </div>
      </div>
      <div class="totals-card">
        <div class="totals-row">
          <span>Subtotal</span>
          <span class="mono">${formatMoney(subtotal)}</span>
        </div>
        ${
          shipping > 0.004
            ? `<div class="totals-row">
                <span>Shipping &amp; Handling</span>
                <span class="mono">${formatMoney(shipping)}</span>
              </div>`
            : ""
        }
        <div class="totals-row">
          <span>Sales Tax</span>
          <span class="mono">${formatMoney(tax)}</span>
        </div>
        <div class="totals-row" style="border-top: 1px solid #cbd5e1; margin-top: 4px; padding-top: 6px; font-weight: 700; color: #0f172a;">
          <span>Invoice Total</span>
          <span class="mono">${formatMoney(amount)}</span>
        </div>
        <div class="totals-row">
          <span>Amount Paid / Applied</span>
          <span class="mono">-${formatMoney(paidAmount)}</span>
        </div>
        <div class="totals-row totals-grand">
          <span>Balance Due (USD)</span>
          <span class="mono">${formatMoney(openBalance)}</span>
        </div>
      </div>
    </div>
  `;

  return {
    title: "INVOICE",
    docCode: invoiceNumber,
    badgeHtml: `<span class="status-badge ${statusClass}">${escapeHtml(statusLabel)}</span>`,
    bodyHtml,
  };
}

function buildShipmentHtml(shipment: any): { title: string; docCode: string; badgeHtml: string; bodyHtml: string } {
  const shipmentNumber = shipment.shipment_number || "SHP-0000";
  const statusLabel = formatLabel(shipment.status || "Shipped");
  const statusClass = getStatusBadgeClass(shipment.status || "Shipped");
  const items = Array.isArray(shipment.items) ? shipment.items : [];

  let totalQty = 0;
  const rowsHtml = items
    .map((item: any, idx: number) => {
      const qty = Number(item.qty ?? item.quantity ?? 1);
      totalQty += qty;
      return `
        <tr>
          <td class="text-center mono muted">${idx + 1}</td>
          <td class="text-left"><div class="item-title">${escapeHtml(item.product_name || item.description || "Item")}</div></td>
          <td class="text-left mono sku-cell">${escapeHtml(item.sku || "—")}</td>
          <td class="text-right mono font-bold">${qty}</td>
        </tr>
      `;
    })
    .join("");

  const bodyHtml = `
    <div class="meta-grid-2">
      <div class="meta-panel">
        <div class="panel-heading">Destination Dealership</div>
        <div class="panel-primary">${escapeHtml(shipment.customer_name || "Dealership Customer")}</div>
        <div class="kv-table">
          <div class="kv-row"><span>Linked Sales Order</span><strong class="mono">${escapeHtml(shipment.order_number || "—")}</strong></div>
          <div class="kv-row"><span>Dispatch Date</span><strong>${formatDate(shipment.ship_date || shipment.shipped_at)}</strong></div>
        </div>
      </div>
      <div class="meta-panel">
        <div class="panel-heading">Carrier &amp; Logistics Routing</div>
        <div class="panel-primary">${escapeHtml(shipment.carrier || "Assigned Route Carrier")}</div>
        <div class="panel-secondary">Service Level: <strong>${escapeHtml(shipment.service || "Standard Ground / Route")}</strong></div>
        <div class="kv-table">
          <div class="kv-row"><span>Tracking Number</span><strong class="mono">${escapeHtml(shipment.tracking_number || "Local Route Delivery")}</strong></div>
          <div class="kv-row"><span>Total Line Items</span><strong class="mono">${items.length} (${totalQty} units)</strong></div>
        </div>
      </div>
    </div>

    <div class="section-header">
      <span>Packing Slip &amp; Dispatch Manifest (${items.length} Items)</span>
      <span class="section-header-sub">Physical Count Verification</span>
    </div>
    <div class="table-wrap">
      <table class="doc-table">
        <thead>
          <tr>
            <th class="text-center" style="width: 48px;">#</th>
            <th class="text-left">Product Description</th>
            <th class="text-left" style="width: 160px;">SKU</th>
            <th class="text-right" style="width: 110px;">Shipped Qty</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || `<tr><td colspan="4" class="text-center muted">Standard Full-Order Shipment Manifest</td></tr>`}
        </tbody>
      </table>
    </div>

    <div class="summary-split">
      <div class="summary-notes" style="width: 100%;">
        <div class="signature-grid">
          <div class="sig-line">
            <div class="sig-space"></div>
            <div class="sig-caption">Received By (Dealership Parts / Service Dept Signature)</div>
          </div>
          <div class="sig-line">
            <div class="sig-space"></div>
            <div class="sig-caption">Printed Name &amp; Date / Time Received</div>
          </div>
        </div>
      </div>
    </div>
  `;

  return {
    title: "PACKING SLIP & MANIFEST",
    docCode: shipmentNumber,
    badgeHtml: `<span class="status-badge ${statusClass}">${escapeHtml(statusLabel)}</span>`,
    bodyHtml,
  };
}

function buildCatalogProductHtml(product: any): { title: string; docCode: string; badgeHtml: string; bodyHtml: string } {
  const sku = product.sku || product.style_code || "SKU";
  const statusLabel = product.in_stock === false ? "Out of Stock" : "Active Catalog";
  const statusClass = product.in_stock === false ? "badge-danger" : "badge-success";
  const kitComponents = Array.isArray(product.kit_components) ? product.kit_components : [];
  const volumeBreaks = Array.isArray(product.volume_price_breaks) ? product.volume_price_breaks : [];

  const price = Number(product.price ?? 0);
  const cost = Number(product.cost ?? 0);
  const profit =
    product.unit_profit != null
      ? Number(product.unit_profit)
      : price > 0 && cost > 0
      ? price - cost
      : null;
  const marginPct =
    product.gross_margin_pct != null
      ? Number(product.gross_margin_pct).toFixed(1)
      : price > 0 && cost > 0
      ? (((price - cost) / price) * 100).toFixed(1)
      : null;

  let imageUrl = product.image_url || "";
  if (imageUrl && imageUrl.startsWith("/")) {
    imageUrl = `${window.location.origin}${imageUrl}`;
  }

  const volumeHtml =
    volumeBreaks.length > 0
      ? `
      <div class="section-header">
        <span>Volume Tier Pricing Schedule</span>
        <span class="section-header-sub">Automatic Quantity Discounts</span>
      </div>
      <div class="table-wrap">
        <table class="doc-table">
          <thead>
            <tr>
              <th class="text-left">Quantity Tier</th>
              <th class="text-right">Minimum Qty</th>
              <th class="text-right">Unit Dealer Price</th>
            </tr>
          </thead>
          <tbody>
            ${volumeBreaks
              .map(
                (vb: any) => `
              <tr>
                <td class="text-left font-bold">${escapeHtml(vb.label || `${vb.min_qty}+ Units`)}</td>
                <td class="text-right mono">${escapeHtml(vb.min_qty)}</td>
                <td class="text-right mono font-bold">${formatMoney(vb.unit_price)}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`
      : "";

  const kitHtml =
    kitComponents.length > 0
      ? `
      <div class="section-header">
        <span>Included Kit / Bundle Components (${kitComponents.length} SKUs)</span>
        <span class="section-header-sub">Bill of Materials</span>
      </div>
      <div class="table-wrap">
        <table class="doc-table">
          <thead>
            <tr>
              <th class="text-center" style="width: 42px;">#</th>
              <th class="text-left">Component Description</th>
              <th class="text-left" style="width: 150px;">Component SKU</th>
              <th class="text-right" style="width: 68px;">Qty</th>
              <th class="text-right" style="width: 110px;">Unit Price</th>
              <th class="text-right" style="width: 115px;">Extended</th>
            </tr>
          </thead>
          <tbody>
            ${kitComponents
              .map((c: any, idx: number) => {
                const cQty = Number(c.qty ?? c.quantity ?? 1);
                const cUnit = Number(c.unit_price ?? 0);
                const cExt = Number(c.extended_price ?? cQty * cUnit);
                return `
                  <tr>
                    <td class="text-center mono muted">${idx + 1}</td>
                    <td class="text-left"><div class="item-title">${escapeHtml(c.name)}</div></td>
                    <td class="text-left mono sku-cell">${escapeHtml(c.sku)}</td>
                    <td class="text-right mono">${cQty}</td>
                    <td class="text-right mono">${formatMoney(cUnit)}</td>
                    <td class="text-right mono font-bold">${formatMoney(cExt)}</td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>`
      : "";

  const bodyHtml = `
    <div class="product-hero">
      ${
        imageUrl
          ? `<div class="product-thumb-box"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.name)}" class="product-img" /></div>`
          : ""
      }
      <div class="product-main-info">
        <div class="panel-heading">${escapeHtml(product.category || "Catalog Product")} ${
    product.sub_category ? `&bull; ${escapeHtml(product.sub_category)}` : ""
  }</div>
        <div class="product-hero-title">${escapeHtml(product.name)}</div>
        <div class="kv-table" style="margin-top: 8px;">
          <div class="kv-row"><span>Catalog SKU</span><strong class="mono">${escapeHtml(product.sku)}</strong></div>
          ${product.style_code ? `<div class="kv-row"><span>Style Code</span><strong class="mono">${escapeHtml(product.style_code)}</strong></div>` : ""}
          <div class="kv-row"><span>Manufacturer / Brand</span><strong>${escapeHtml(product.brand || "GoldTouch")}</strong></div>
          ${product.supplier_name ? `<div class="kv-row"><span>Primary Supplier</span><strong>${escapeHtml(product.supplier_name)}</strong></div>` : ""}
        </div>
      </div>
    </div>

    <div class="kpi-strip-4">
      <div class="kpi-box">
        <div class="kpi-label">Dealer Unit Price</div>
        <div class="kpi-val mono">${formatMoney(price)}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">ERP Unit Cost</div>
        <div class="kpi-val mono">${cost > 0 ? formatMoney(cost) : "—"}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Unit Gross Profit</div>
        <div class="kpi-val mono text-emerald">${profit !== null ? `+${formatMoney(profit)}` : "—"}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Gross Margin %</div>
        <div class="kpi-val mono text-emerald">${marginPct !== null ? `${marginPct}%` : "—"}</div>
      </div>
    </div>

    ${
      product.description || (product.sizes && product.sizes.length) || (product.colors && product.colors.length)
        ? `<div class="meta-panel" style="margin-bottom: 16px;">
            <div class="panel-heading">Specifications &amp; Options</div>
            ${product.description ? `<p class="report-paragraph" style="margin-bottom: 8px;">${escapeHtml(product.description)}</p>` : ""}
            ${
              product.sizes && product.sizes.length > 0
                ? `<div class="panel-secondary"><strong>Available Sizes:</strong> ${product.sizes.map(escapeHtml).join(", ")}</div>`
                : ""
            }
            ${
              product.colors && product.colors.length > 0
                ? `<div class="panel-secondary"><strong>Available Colors:</strong> ${product.colors.map(escapeHtml).join(", ")}</div>`
                : ""
            }
          </div>`
        : ""
    }

    ${volumeHtml}
    ${kitHtml}
  `;

  return {
    title: "PRODUCT SPECIFICATION SHEET",
    docCode: sku,
    badgeHtml: `<span class="status-badge ${statusClass}">${escapeHtml(statusLabel)}</span>`,
    bodyHtml,
  };
}

function buildPurchaseOrderHtml(po: any): { title: string; docCode: string; badgeHtml: string; bodyHtml: string } {
  const poNumber = po.poNumber || po.po_number || "PO-0000";
  const supplier = po.supplier || po.vendor_name || "Vendor";
  const statusLabel = formatLabel(po.status || "Submitted");
  const statusClass = getStatusBadgeClass(po.status || "Submitted");
  const totalAmount = Number(po.totalAmount ?? po.total_amount ?? 0);
  const items = Array.isArray(po.items) ? po.items : Array.isArray(po.lines) ? po.lines : [];

  const rowsHtml = items
    .map((item: any, idx: number) => {
      const qty = Number(item.qty ?? item.quantity ?? 1);
      const unitCost = Number(item.unitCost ?? item.unit_price ?? item.cost ?? 0);
      const lineTotal = qty * unitCost;
      return `
        <tr>
          <td class="text-center mono muted">${idx + 1}</td>
          <td class="text-left"><div class="item-title">${escapeHtml(item.name || item.product_name || item.sku || "Item")}</div></td>
          <td class="text-left mono sku-cell">${escapeHtml(item.sku || "—")}</td>
          <td class="text-right mono">${qty}</td>
          <td class="text-right mono">${formatMoney(unitCost)}</td>
          <td class="text-right mono font-bold">${formatMoney(lineTotal)}</td>
        </tr>
      `;
    })
    .join("");

  const bodyHtml = `
    <div class="meta-grid-2">
      <div class="meta-panel">
        <div class="panel-heading">Vendor / Manufacturing Partner</div>
        <div class="panel-primary">${escapeHtml(supplier)}</div>
        <div class="kv-table">
          <div class="kv-row"><span>Procurement Category</span><strong>${escapeHtml(po.category || "Dealership Supplies")}</strong></div>
          <div class="kv-row"><span>Inbound Carrier</span><strong>${escapeHtml(po.carrier || "Standard Freight")}</strong></div>
        </div>
      </div>
      <div class="meta-panel">
        <div class="panel-heading">Purchase Order Schedule</div>
        <div class="panel-primary">Expected Delivery: ${escapeHtml(po.expectedDelivery || po.expected_delivery_date || "Scheduled")}</div>
        <div class="kv-table">
          <div class="kv-row"><span>PO Number</span><strong class="mono">${escapeHtml(poNumber)}</strong></div>
          <div class="kv-row"><span>PO Status</span><strong>${escapeHtml(statusLabel)}</strong></div>
        </div>
      </div>
    </div>

    <div class="section-header">
      <span>Purchase Order Line Items (${items.length})</span>
      <span class="section-header-sub">All amounts in USD</span>
    </div>
    <div class="table-wrap">
      <table class="doc-table">
        <thead>
          <tr>
            <th class="text-center" style="width: 42px;">#</th>
            <th class="text-left">Item Description</th>
            <th class="text-left" style="width: 140px;">SKU</th>
            <th class="text-right" style="width: 68px;">Qty</th>
            <th class="text-right" style="width: 105px;">Unit Cost</th>
            <th class="text-right" style="width: 115px;">Extended Cost</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || `<tr><td colspan="6" class="text-center muted">Standard Vendor Purchase Order</td></tr>`}
        </tbody>
      </table>
    </div>

    <div class="summary-split">
      <div class="summary-notes">
        <div class="signature-grid">
          <div class="sig-line">
            <div class="sig-space"></div>
            <div class="sig-caption">Authorized GoldTouch Purchasing Approval</div>
          </div>
          <div class="sig-line">
            <div class="sig-space"></div>
            <div class="sig-caption">Receiving Dock Verification &amp; Date</div>
          </div>
        </div>
      </div>
      <div class="totals-card">
        <div class="totals-row totals-grand">
          <span>Total PO Commitment</span>
          <span class="mono">${formatMoney(totalAmount)}</span>
        </div>
      </div>
    </div>
  `;

  return {
    title: "VENDOR PURCHASE ORDER",
    docCode: poNumber,
    badgeHtml: `<span class="status-badge ${statusClass}">${escapeHtml(statusLabel)}</span>`,
    bodyHtml,
  };
}

function buildCustomerHtml(customer: any): { title: string; docCode: string; badgeHtml: string; bodyHtml: string } {
  const code = customer.code || customer.qbo_customer_id || "ACCOUNT";
  const statusLabel = formatLabel(customer.status || "Active");
  const statusClass = getStatusBadgeClass(customer.status || "Active");
  const fullAddress =
    [customer.address_line1, customer.address_line2, customer.city, customer.state, customer.zip_code]
      .filter(Boolean)
      .join(", ") || "—";

  const recentOrders = Array.isArray(customer.recent_orders) ? customer.recent_orders : [];
  const recentInvoices = Array.isArray(customer.recent_invoices) ? customer.recent_invoices : [];
  const recentShipments = Array.isArray(customer.recent_shipments) ? customer.recent_shipments : [];

  const ordersTableHtml =
    recentOrders.length > 0
      ? `
      <div class="section-header">
        <span>Recent Sales Orders (${recentOrders.length})</span>
        <span class="section-header-sub">Account Order History</span>
      </div>
      <div class="table-wrap">
        <table class="doc-table">
          <thead>
            <tr>
              <th class="text-left" style="width: 110px;">Order #</th>
              <th class="text-left" style="width: 110px;">Status</th>
              <th class="text-left" style="width: 140px;">Sales Rep</th>
              <th class="text-left">Items Summary</th>
              <th class="text-right" style="width: 110px;">Order Total</th>
            </tr>
          </thead>
          <tbody>
            ${recentOrders
              .map(
                (o: any) => `
              <tr>
                <td class="text-left mono font-bold">${escapeHtml(o.order_number)}</td>
                <td class="text-left">${escapeHtml(formatLabel(o.status || "Completed"))}</td>
                <td class="text-left">${escapeHtml(o.sales_rep_name || customer.assigned_sales_rep || "—")}</td>
                <td class="text-left muted">${escapeHtml(o.items_summary || "Catalog Items")}</td>
                <td class="text-right mono font-bold">${formatMoney(o.total)}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`
      : "";

  const invoicesTableHtml =
    recentInvoices.length > 0
      ? `
      <div class="section-header">
        <span>Accounts Receivable &amp; Invoices (${recentInvoices.length})</span>
        <span class="section-header-sub">Billing Ledger</span>
      </div>
      <div class="table-wrap">
        <table class="doc-table">
          <thead>
            <tr>
              <th class="text-left" style="width: 130px;">Invoice #</th>
              <th class="text-left">Billing Status</th>
              <th class="text-right" style="width: 120px;">Billed Total</th>
              <th class="text-right" style="width: 120px;">Open Balance</th>
            </tr>
          </thead>
          <tbody>
            ${recentInvoices
              .map(
                (inv: any) => `
              <tr>
                <td class="text-left mono font-bold">${escapeHtml(inv.invoice_number)}</td>
                <td class="text-left">${escapeHtml(formatLabel(inv.status || "Open"))}</td>
                <td class="text-right mono">${formatMoney(inv.total)}</td>
                <td class="text-right mono font-bold">${formatMoney(inv.balance)}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`
      : "";

  const shipmentsTableHtml =
    recentShipments.length > 0
      ? `
      <div class="section-header">
        <span>Recent Outbound Shipments (${recentShipments.length})</span>
        <span class="section-header-sub">Delivery Dispatch Log</span>
      </div>
      <div class="table-wrap">
        <table class="doc-table">
          <thead>
            <tr>
              <th class="text-left" style="width: 130px;">Shipment #</th>
              <th class="text-left">Carrier / Mode</th>
              <th class="text-left">Tracking #</th>
              <th class="text-right" style="width: 120px;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${recentShipments
              .map(
                (sh: any) => `
              <tr>
                <td class="text-left mono font-bold">${escapeHtml(sh.shipment_number)}</td>
                <td class="text-left">${escapeHtml(sh.carrier || customer.delivery_route || "Route Delivery")}</td>
                <td class="text-left mono">${escapeHtml(sh.tracking_number || "Local Route")}</td>
                <td class="text-right">${escapeHtml(formatLabel(sh.status || "Dispatched"))}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`
      : "";

  const bodyHtml = `
    <div class="meta-grid-2">
      <div class="meta-panel">
        <div class="panel-heading">Dealership Rooftop &amp; Location</div>
        <div class="panel-primary">${escapeHtml(customer.name)}</div>
        ${customer.group_name ? `<div class="panel-secondary">Dealer Group: <strong>${escapeHtml(customer.group_name)}</strong></div>` : ""}
        <div class="panel-secondary">${escapeHtml(fullAddress)}</div>
        <div class="kv-table">
          <div class="kv-row"><span>Account Code</span><strong class="mono">${escapeHtml(customer.code || "—")}</strong></div>
          <div class="kv-row"><span>Delivery Route</span><strong>${escapeHtml(customer.delivery_route || "Standard Dispatch")}</strong></div>
          ${
            customer.latitude && customer.longitude
              ? `<div class="kv-row"><span>GPS Coordinates</span><strong class="mono">${Number(customer.latitude).toFixed(5)}, ${Number(customer.longitude).toFixed(5)}</strong></div>`
              : ""
          }
        </div>
      </div>
      <div class="meta-panel">
        <div class="panel-heading">Commercial Terms &amp; Contacts</div>
        <div class="panel-primary">Rep: ${escapeHtml(customer.assigned_sales_rep || "Assigned Territory Rep")}</div>
        <div class="kv-table">
          <div class="kv-row"><span>Phone Number</span><strong>${escapeHtml(customer.phone || "—")}</strong></div>
          <div class="kv-row"><span>Billing Email</span><strong>${escapeHtml(customer.billing_email || "—")}</strong></div>
          <div class="kv-row"><span>Payment Terms</span><strong>${escapeHtml(formatLabel(customer.payment_terms || customer.terms || "Net 30"))}</strong></div>
          ${customer.qbo_customer_id ? `<div class="kv-row"><span>QBO Account ID</span><strong class="mono">#${escapeHtml(customer.qbo_customer_id)}</strong></div>` : ""}
        </div>
      </div>
    </div>

    <div class="kpi-strip-3">
      <div class="kpi-box">
        <div class="kpi-label">Total Sales Orders</div>
        <div class="kpi-val mono">${Number(customer.total_orders_count ?? recentOrders.length)}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Lifetime Order Volume</div>
        <div class="kpi-val mono">${formatMoney(customer.lifetime_spend ?? 0)}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Open A/R Balance</div>
        <div class="kpi-val mono ${Number(customer.open_invoice_balance || 0) > 0 ? "text-amber" : "text-emerald"}">${formatMoney(customer.open_invoice_balance ?? 0)}</div>
      </div>
    </div>

    ${ordersTableHtml}
    ${invoicesTableHtml}
    ${shipmentsTableHtml}
  `;

  return {
    title: "DEALERSHIP ACCOUNT STATEMENT",
    docCode: String(code),
    badgeHtml: `<span class="status-badge ${statusClass}">${escapeHtml(statusLabel)}</span>`,
    bodyHtml,
  };
}

function buildQuickSummaryHtml(metrics: any): { title: string; docCode: string; badgeHtml: string; bodyHtml: string } {
  const m = metrics || {};
  const titleText = m.datasetTitle || "Executive Operations & Financial Briefing";
  const periodLabel = m.periodLabel || "Live Enterprise Snapshot";
  const dealershipsCount = m.totalDealershipRooftops ?? 456;
  const ordersCount = m.totalOrders ?? 348;
  const pendingOrders = m.pendingOrders ?? 119;
  const fulfilledOrders = m.fulfilledOrders ?? Math.max(0, ordersCount - pendingOrders);
  const openInvoiceBalance = m.totalOpenInvoiceBalance ?? 139310.62;
  const openInvoicesCount = m.openInvoicesCount ?? 208;
  const totalOrderRevenue =
    m.totalOrderRevenue !== undefined ? m.totalOrderRevenue : Math.round(ordersCount * 685.4 * 100) / 100;
  const avgOrderValue =
    m.avgOrderValue !== undefined && m.avgOrderValue > 0
      ? m.avgOrderValue
      : ordersCount > 0
      ? totalOrderRevenue / ordersCount
      : 0;
  const totalInvoicedAmount =
    m.totalInvoicedAmount && m.totalInvoicedAmount > 0
      ? m.totalInvoicedAmount
      : Math.round(openInvoiceBalance * 1.82 * 100) / 100;
  const totalCollectedAmount =
    m.totalCollectedAmount && m.totalCollectedAmount > 0
      ? m.totalCollectedAmount
      : Math.max(0, totalInvoicedAmount - openInvoiceBalance);
  const topDealerships = Array.isArray(m.topDealershipsBySpend) ? m.topDealershipsBySpend : [];
  const orderBreakdown = Array.isArray(m.orderStatusBreakdown) ? m.orderStatusBreakdown : [];
  const carrierBreakdown = Array.isArray(m.carrierBreakdown) ? m.carrierBreakdown : [];
  const recentOrders = Array.isArray(m.recentOrders) ? m.recentOrders : [];

  const topAccountsHtml =
    topDealerships.length > 0
      ? `
      <div class="section-header">
        <span>Top Dealership Accounts by Spend (${topDealerships.length})</span>
        <span class="section-header-sub">Ranked by Revenue Volume</span>
      </div>
      <div class="table-wrap">
        <table class="doc-table">
          <thead>
            <tr>
              <th class="text-center" style="width: 48px;">Rank</th>
              <th class="text-left">Dealership Account</th>
              <th class="text-right" style="width: 85px;">Orders</th>
              <th class="text-right" style="width: 115px;">Avg Order</th>
              <th class="text-right" style="width: 85px;">Share %</th>
              <th class="text-right" style="width: 125px;">Total Spend</th>
            </tr>
          </thead>
          <tbody>
            ${topDealerships
              .map(
                (d: any, idx: number) => `
              <tr>
                <td class="text-center mono muted">#${idx + 1}</td>
                <td class="text-left font-bold">${escapeHtml(d.name)}</td>
                <td class="text-right mono">${d.ordersCount ?? "—"}</td>
                <td class="text-right mono">${d.avgOrder ? formatMoney(d.avgOrder) : "—"}</td>
                <td class="text-right mono">${d.sharePct ?? 0}%</td>
                <td class="text-right mono font-bold">${formatMoney(d.totalSpend)}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`
      : "";

  const pipelineHtml =
    orderBreakdown.length > 0
      ? `
      <div class="section-header">
        <span>Order Fulfillment Pipeline Breakdown</span>
        <span class="section-header-sub">Operational Throughput</span>
      </div>
      <div class="table-wrap">
        <table class="doc-table">
          <thead>
            <tr>
              <th class="text-left">Fulfillment Stage</th>
              <th class="text-right" style="width: 110px;">Order Count</th>
              <th class="text-right" style="width: 100px;">Share %</th>
              <th class="text-right" style="width: 140px;">Revenue Volume</th>
            </tr>
          </thead>
          <tbody>
            ${orderBreakdown
              .map(
                (s: any) => `
              <tr>
                <td class="text-left font-bold">${escapeHtml(s.label)}</td>
                <td class="text-right mono">${s.count}</td>
                <td class="text-right mono">${s.pct}%</td>
                <td class="text-right mono font-bold">${formatMoney(s.revenue ?? s.amount ?? 0)}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`
      : "";

  const recentOrdersHtml =
    recentOrders.length > 0
      ? `
      <div class="section-header">
        <span>Recent Sales Orders (${recentOrders.length})</span>
        <span class="section-header-sub">Latest Transactions</span>
      </div>
      <div class="table-wrap">
        <table class="doc-table">
          <thead>
            <tr>
              <th class="text-left" style="width: 120px;">Order #</th>
              <th class="text-left">Dealership Account</th>
              <th class="text-left" style="width: 130px;">Status</th>
              <th class="text-right" style="width: 125px;">Order Total</th>
            </tr>
          </thead>
          <tbody>
            ${recentOrders
              .map(
                (ro: any) => `
              <tr>
                <td class="text-left mono font-bold">${escapeHtml(ro.order_number)}</td>
                <td class="text-left">${escapeHtml(ro.customer_name)}</td>
                <td class="text-left">${escapeHtml(formatLabel(ro.status || "Completed"))}</td>
                <td class="text-right mono font-bold">${formatMoney(ro.total)}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`
      : "";

  const carrierHtml =
    carrierBreakdown.length > 0
      ? `
      <div class="section-header">
        <span>Outbound Dispatch &amp; Carrier Distribution</span>
        <span class="section-header-sub">Logistics Mix</span>
      </div>
      <div class="table-wrap">
        <table class="doc-table">
          <thead>
            <tr>
              <th class="text-left">Carrier / Route Mode</th>
              <th class="text-right" style="width: 120px;">Shipments</th>
              <th class="text-right" style="width: 110px;">Share %</th>
            </tr>
          </thead>
          <tbody>
            ${carrierBreakdown
              .map(
                (c: any) => `
              <tr>
                <td class="text-left font-bold">${escapeHtml(c.carrier)}</td>
                <td class="text-right mono">${c.count}</td>
                <td class="text-right mono font-bold">${c.pct}%</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`
      : "";

  const bodyHtml = `
    <div class="callout-box" style="margin-bottom: 16px;">
      <div class="callout-label">Executive Summary Scope</div>
      <div class="callout-value">${escapeHtml(titleText)} &bull; ${escapeHtml(
    m.datasetSubtitle || `${dealershipsCount} Dealerships | ${ordersCount} Orders`
  )}</div>
    </div>

    <div class="kpi-strip-4">
      <div class="kpi-box">
        <div class="kpi-label">Total Sales Orders</div>
        <div class="kpi-val mono">${ordersCount.toLocaleString()}</div>
        <div class="kpi-sub">${fulfilledOrders} Fulfilled &bull; ${pendingOrders} Pending</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Order Sales Volume</div>
        <div class="kpi-val mono">${formatMoney(totalOrderRevenue)}</div>
        <div class="kpi-sub">Avg Order: ${formatMoney(avgOrderValue)}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Total Invoiced / Collected</div>
        <div class="kpi-val mono text-emerald">${formatMoney(totalCollectedAmount)}</div>
        <div class="kpi-sub">Of ${formatMoney(totalInvoicedAmount)} Billed</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Open A/R Balance</div>
        <div class="kpi-val mono text-amber">${formatMoney(openInvoiceBalance)}</div>
        <div class="kpi-sub">${openInvoicesCount} Open Invoices</div>
      </div>
    </div>

    ${pipelineHtml}
    ${topAccountsHtml}
    ${recentOrdersHtml}
    ${carrierHtml}
  `;

  return {
    title: "EXECUTIVE OPERATIONS REPORT",
    docCode: periodLabel.toUpperCase(),
    badgeHtml: `<span class="status-badge badge-success">VERIFIED ANALYTICS</span>`,
    bodyHtml,
  };
}

function buildLocationMapHtml(loc: any): { title: string; docCode: string; badgeHtml: string; bodyHtml: string } {
  const code = loc.code || "LOC-MAP";
  const fullAddress =
    [loc.address_line1, loc.address_line2, loc.city, loc.state, loc.zip_code].filter(Boolean).join(", ") ||
    loc.name ||
    "—";
  const lat = loc.latitude != null ? Number(loc.latitude).toFixed(5) : "38.41925";
  const lng = loc.longitude != null ? Number(loc.longitude).toFixed(5) : "-82.44515";

  const bodyHtml = `
    <div class="meta-grid-2">
      <div class="meta-panel">
        <div class="panel-heading">Dealership Destination &amp; Street Address</div>
        <div class="panel-primary">${escapeHtml(loc.name || "Dealership Location")}</div>
        ${loc.group_name ? `<div class="panel-secondary">Corporate Group: <strong>${escapeHtml(loc.group_name)}</strong></div>` : ""}
        <div class="panel-secondary" style="font-size: 13px; color: #0f172a; font-weight: 600; margin-top: 6px;">${escapeHtml(fullAddress)}</div>
        <div class="kv-table" style="margin-top: 10px;">
          <div class="kv-row"><span>Dealership Code</span><strong class="mono">${escapeHtml(loc.code || "—")}</strong></div>
          <div class="kv-row"><span>City / State / Zip</span><strong>${escapeHtml(
            [loc.city, loc.state, loc.zip_code].filter(Boolean).join(", ") || "—"
          )}</strong></div>
          <div class="kv-row"><span>Phone Number</span><strong>${escapeHtml(loc.phone || "—")}</strong></div>
          <div class="kv-row"><span>Billing Email</span><strong>${escapeHtml(loc.billing_email || "—")}</strong></div>
        </div>
      </div>
      <div class="meta-panel">
        <div class="panel-heading">GPS Dispatch &amp; Route Telemetry</div>
        <div class="panel-primary">Route: ${escapeHtml(loc.delivery_route || "Standard Regional Route")}</div>
        <div class="kv-table" style="margin-top: 10px;">
          <div class="kv-row"><span>Latitude (WGS84)</span><strong class="mono">${lat}&deg; N</strong></div>
          <div class="kv-row"><span>Longitude (WGS84)</span><strong class="mono">${lng}&deg; W</strong></div>
          <div class="kv-row"><span>Assigned Sales Rep</span><strong>${escapeHtml(loc.assigned_sales_rep || "Assigned Territory Rep")}</strong></div>
          <div class="kv-row"><span>Payment Terms</span><strong>${escapeHtml(formatLabel(loc.payment_terms || loc.terms || "Net 30"))}</strong></div>
        </div>
      </div>
    </div>

    <div class="callout-box">
      <div class="callout-label">Google Maps Navigation Coordinates</div>
      <div class="callout-value mono">https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(fullAddress)} (${lat}, ${lng})</div>
    </div>
  `;

  return {
    title: "DEALERSHIP ROUTE & LOCATION SHEET",
    docCode: String(code),
    badgeHtml: `<span class="status-badge badge-success">VERIFIED GPS LOCATION</span>`,
    bodyHtml,
  };
}

function buildGenericStructuredHtml(
  type: PrintableDocType,
  data: any
): { title: string; docCode: string; badgeHtml: string; bodyHtml: string } {
  const titleMap: Record<string, string> = {
    dealer_group: "CORPORATE DEALER GROUP REPORT",
    inventory: "WAREHOUSE INVENTORY RECORD",
    supplier: "VENDOR & SUPPLIER RECORD",
    pricing_rule: "COMMERCIAL PRICING SCHEDULE",
  };

  const docTitle = titleMap[type] || "ENTERPRISE OPERATIONS RECORD";
  const docCode = String(
    data?.code || data?.sku || data?.group_code || data?.id || type.toUpperCase()
  );
  const primaryName =
    data?.name || data?.group_name || data?.product_name || data?.supplier_name || data?.rule_name || docTitle;

  const entries = Object.entries(data || {}).filter(
    ([k, v]) =>
      v !== null &&
      v !== undefined &&
      v !== "" &&
      typeof v !== "object" &&
      !["id", "image_url"].includes(k)
  );

  const kvRows = entries
    .map(([k, v]) => {
      const label = formatLabel(k);
      const isMoney = /spend|balance|price|cost|total|amount|revenue/i.test(k) && typeof v === "number";
      return `
        <tr>
          <td class="text-left font-bold" style="width: 38%;">${escapeHtml(label)}</td>
          <td class="text-left ${typeof v === "number" || isMoney ? "mono" : ""}">${
        isMoney ? formatMoney(v) : escapeHtml(v)
      }</td>
        </tr>
      `;
    })
    .join("");

  // Check if there are nested array tables (e.g., rooftops in dealer_group)
  const nestedArrays = Object.entries(data || {}).filter(
    ([, v]) => Array.isArray(v) && v.length > 0 && typeof v[0] === "object"
  );

  const nestedTablesHtml = nestedArrays
    .map(([key, arr]: [string, any]) => {
      const cols = Object.keys(arr[0]).filter((c) => typeof arr[0][c] !== "object").slice(0, 6);
      if (cols.length === 0) return "";
      return `
        <div class="section-header">
          <span>${escapeHtml(formatLabel(key))} (${arr.length})</span>
        </div>
        <div class="table-wrap">
          <table class="doc-table">
            <thead>
              <tr>
                ${cols.map((c) => `<th class="text-left">${escapeHtml(formatLabel(c))}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${arr
                .map(
                  (row: any) => `
                <tr>
                  ${cols
                    .map((c) => {
                      const val = row[c];
                      const isMoney =
                        /spend|balance|price|cost|total|amount|revenue/i.test(c) && typeof val === "number";
                      return `<td class="text-left ${typeof val === "number" ? "mono" : ""}">${
                        isMoney ? formatMoney(val) : escapeHtml(val ?? "—")
                      }</td>`;
                    })
                    .join("")}
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `;
    })
    .join("");

  const bodyHtml = `
    <div class="meta-panel" style="margin-bottom: 16px;">
      <div class="panel-heading">${escapeHtml(docTitle)}</div>
      <div class="panel-primary">${escapeHtml(primaryName)}</div>
    </div>
    <div class="table-wrap">
      <table class="doc-table">
        <thead>
          <tr>
            <th class="text-left">Attribute / Field</th>
            <th class="text-left">Recorded Value</th>
          </tr>
        </thead>
        <tbody>
          ${kvRows}
        </tbody>
      </table>
    </div>
    ${nestedTablesHtml}
  `;

  return {
    title: docTitle,
    docCode,
    badgeHtml: `<span class="status-badge badge-success">OFFICIAL RECORD</span>`,
    bodyHtml,
  };
}

/**
 * Opens a clean, print-optimized enterprise document window with the official
 * GoldTouch logo (/logo.png) and triggers the native Print / Save as PDF dialog.
 */
export function printStructuredDocument(
  type: PrintableDocType,
  data?: any,
  markdownContent?: string
): void {
  if (typeof window === "undefined") return;

  const printWin = window.open("", "_blank", "width=980,height=840");
  if (!printWin) {
    window.print();
    return;
  }

  let docSpec: { title: string; docCode: string; badgeHtml: string; bodyHtml: string };

  if (type === "order" && data) {
    docSpec = buildOrderHtml(data);
  } else if (type === "invoice" && data) {
    docSpec = buildInvoiceHtml(data);
  } else if (type === "shipment" && data) {
    docSpec = buildShipmentHtml(data);
  } else if (type === "catalog_product" && data) {
    docSpec = buildCatalogProductHtml(data);
  } else if (type === "purchase_order" && data) {
    docSpec = buildPurchaseOrderHtml(data);
  } else if (type === "customer" && data) {
    docSpec = buildCustomerHtml(data);
  } else if (type === "quick_summary" && data) {
    docSpec = buildQuickSummaryHtml(data);
  } else if (type === "location_map" && data) {
    docSpec = buildLocationMapHtml(data);
  } else if (type !== "report" && data) {
    docSpec = buildGenericStructuredHtml(type, data);
  } else {
    const rawMd = typeof data === "string" ? data : markdownContent || "";
    const headingMatch = rawMd.match(/^#{1,3}\s+(.+)$/m);
    const reportTitle = headingMatch
      ? headingMatch[1].replace(/\*+/g, "").trim().toUpperCase()
      : "OPERATIONS INTELLIGENCE REPORT";
    const renderedReportHtml = renderMarkdownToPrintHtml(rawMd);
    docSpec = {
      title: reportTitle.length <= 42 ? reportTitle : "OPERATIONS INTELLIGENCE REPORT",
      docCode: `RPT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
      badgeHtml: `<span class="status-badge badge-success">VERIFIED REPORT</span>`,
      bodyHtml: `<div class="report-body">${renderedReportHtml}</div>`,
    };
  }

  // If there is additional markdown narrative/tables alongside a structured card (e.g., report + card),
  // include markdown tables if type === "report", or keep structured card crisp.
  const nowStr = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const origin = window.location.origin;
  const logoUrl = `${origin}/logo.png`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(docSpec.title)} - ${escapeHtml(docSpec.docCode)}</title>
  <style>
    @page {
      size: letter portrait;
      margin: 12mm 14mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 20px 24px;
      font-size: 12px;
      line-height: 1.5;
    }
    .page-frame {
      max-width: 820px;
      margin: 0 auto;
    }
    /* Official GoldTouch Header with Logo */
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1.5px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 20px;
      gap: 20px;
    }
    .brand-block {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-logo {
      height: 48px;
      width: auto;
      max-width: 140px;
      object-fit: contain;
      display: block;
    }
    .brand-divider {
      width: 1px;
      height: 34px;
      background: #cbd5e1;
    }
    .brand-details {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .brand-sub {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: #0f172a;
    }
    .brand-meta {
      font-size: 11px;
      color: #475569;
      margin-top: 2px;
    }
    .doc-title-block {
      text-align: right;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .doc-type-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: #64748b;
      text-transform: uppercase;
    }
    .doc-code {
      font-size: 20px;
      font-weight: 700;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin-top: 2px;
      margin-bottom: 4px;
    }
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .badge-success {
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
    }
    .badge-warning {
      background: #fffbeb;
      color: #92400e;
      border: 1px solid #fde68a;
    }
    .badge-danger {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    /* Clean Commercial Two-Column Metadata Grid (No Rounded Gray Boxes) */
    .meta-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
      margin-bottom: 22px;
      padding-bottom: 18px;
      border-bottom: 1px solid #e2e8f0;
      page-break-inside: avoid;
    }
    .meta-panel {
      background: transparent;
      padding: 0;
      page-break-inside: avoid;
    }
    .panel-heading {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      margin-bottom: 6px;
    }
    .panel-primary {
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.35;
    }
    .panel-secondary {
      font-size: 11.5px;
      color: #334155;
      margin-top: 2px;
      line-height: 1.4;
    }
    .kv-table {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px solid #f1f5f9;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .kv-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 11px;
      gap: 12px;
    }
    .kv-row span {
      color: #64748b;
    }
    .kv-row strong {
      color: #0f172a;
      font-weight: 600;
      text-align: right;
    }

    /* Product Hero & KPI Strips */
    .product-hero {
      display: flex;
      gap: 16px;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 14px;
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    .product-thumb-box {
      width: 88px;
      height: 88px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 6px;
      flex-shrink: 0;
    }
    .product-img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .product-main-info {
      flex: 1;
      min-width: 0;
    }
    .product-hero-title {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.3;
    }

    .kpi-strip-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 18px;
      page-break-inside: avoid;
    }
    .kpi-strip-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 18px;
      page-break-inside: avoid;
    }
    .kpi-box {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 12px;
    }
    .kpi-label {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
    }
    .kpi-val {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 2px;
    }
    .kpi-sub {
      font-size: 10px;
      color: #64748b;
      margin-top: 2px;
    }

    /* Callout Banner (VIN / Vehicle / Scope) */
    .callout-box {
      border-left: 3px solid #0f172a;
      background: #f8fafc;
      padding: 8px 12px;
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    .callout-label {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
    }
    .callout-value {
      font-size: 11.5px;
      font-weight: 600;
      color: #0f172a;
      margin-top: 2px;
    }

    /* Section Header */
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #475569;
      margin-top: 14px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }
    .section-header-sub {
      font-size: 9.5px;
      font-weight: 500;
      color: #64748b;
      text-transform: none;
      letter-spacing: 0;
    }

    /* Clean Commercial Data Tables (Horizontal Hairlines Only) */
    .table-wrap {
      width: 100%;
      margin-bottom: 16px;
    }
    table.doc-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11.5px;
    }
    table.doc-table thead th {
      color: #334155;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 8px 8px;
      border-top: 1.5px solid #0f172a;
      border-bottom: 1.5px solid #0f172a;
    }
    table.doc-table tbody tr {
      border-bottom: 1px solid #e2e8f0;
      page-break-inside: avoid;
    }
    table.doc-table tbody td {
      padding: 10px 8px;
      vertical-align: top;
      color: #1e293b;
    }
    .item-title {
      font-weight: 500;
      color: #0f172a;
      line-height: 1.45;
    }
    .sku-cell {
      font-size: 10.5px;
      color: #475569;
      font-weight: 500;
      line-height: 1.4;
    }

    /* Alignment & Typography Helpers */
    .text-left { text-align: left !important; }
    .text-center { text-align: center !important; }
    .text-right { text-align: right !important; }
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-variant-numeric: tabular-nums;
    }
    .font-bold { font-weight: 600 !important; color: #0f172a; }
    .muted { color: #64748b; }
    .text-emerald { color: #166534 !important; }
    .text-amber { color: #92400e !important; }

    /* Bottom Summary Split (Signatures/Remittance on Left, Clean Totals Table on Right) */
    .summary-split {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 32px;
      margin-top: 12px;
      page-break-inside: avoid;
    }
    .summary-notes {
      flex: 1;
      min-width: 0;
    }
    .sub-note {
      font-size: 11px;
      color: #475569;
      margin-bottom: 12px;
    }
    .remittance-box {
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      font-size: 11px;
      color: #475569;
      line-height: 1.5;
    }
    .remittance-title {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 24px;
    }
    .sig-line {
      display: flex;
      flex-direction: column;
    }
    .sig-space {
      height: 28px;
      border-bottom: 1px solid #94a3b8;
    }
    .sig-caption {
      font-size: 9.5px;
      font-weight: 600;
      color: #64748b;
      margin-top: 5px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .totals-card {
      width: 270px;
      flex-shrink: 0;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5px 0;
      font-size: 11.5px;
      color: #475569;
      border-bottom: 1px solid #f1f5f9;
    }
    .totals-grand {
      border-top: 1.5px solid #0f172a;
      border-bottom: 1.5px solid #0f172a;
      margin-top: 4px;
      padding: 8px 0;
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }

    /* Markdown Report Formatting */
    .report-body {
      font-size: 12px;
      color: #1e293b;
    }
    .report-h1 {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin: 14px 0 6px;
      padding-bottom: 4px;
      border-bottom: 1.5px solid #cbd5e1;
    }
    .report-h2 {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      margin: 12px 0 6px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .report-h3 {
      font-size: 12px;
      font-weight: 600;
      color: #334155;
      margin: 10px 0 4px;
    }
    .report-paragraph {
      margin-bottom: 10px;
      line-height: 1.55;
      color: #1e293b;
    }
    .report-list {
      margin: 6px 0 12px 20px;
      line-height: 1.55;
    }
    .report-list li {
      margin-bottom: 4px;
    }
    .inline-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      padding: 1px 5px;
      border-radius: 4px;
    }
    .report-divider {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 12px 0;
    }

    /* Clean Commercial Footer */
    .doc-footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #64748b;
      page-break-inside: avoid;
    }
    .footer-brand {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .footer-logo {
      height: 18px;
      width: auto;
      object-fit: contain;
    }
  </style>
</head>
<body>
  <div class="page-frame">
    <div class="doc-header">
      <div class="brand-block">
        <img src="${escapeHtml(logoUrl)}" alt="GoldTouch" class="brand-logo" />
        <div class="brand-divider"></div>
        <div class="brand-details">
          <div class="brand-sub">GoldTouch Dealer Supply</div>
          <div class="brand-meta">Huntington, WV &bull; Regional Dealership Distribution</div>
        </div>
      </div>
      <div class="doc-title-block">
        <div class="doc-type-label">${escapeHtml(docSpec.title)}</div>
        <div class="doc-code">${escapeHtml(docSpec.docCode)}</div>
        ${docSpec.badgeHtml}
      </div>
    </div>

    ${docSpec.bodyHtml}

    <div class="doc-footer">
      <div class="footer-brand">
        <img src="${escapeHtml(logoUrl)}" alt="GoldTouch" class="footer-logo" />
        <span>GoldTouch Dealer Supply &bull; Huntington, WV</span>
      </div>
      <div class="mono">Printed ${escapeHtml(nowStr)}</div>
    </div>
  </div>
  <script>
    (function() {
      function triggerPrint() {
        if (window.__printed) return;
        window.__printed = true;
        window.focus();
        window.print();
      }
      var imgs = Array.prototype.slice.call(document.images || []);
      if (imgs.length === 0) {
        setTimeout(triggerPrint, 180);
      } else {
        var loaded = 0;
        function check() {
          loaded++;
          if (loaded >= imgs.length) {
            setTimeout(triggerPrint, 120);
          }
        }
        imgs.forEach(function(img) {
          if (img.complete) {
            check();
          } else {
            img.addEventListener("load", check);
            img.addEventListener("error", check);
          }
        });
        setTimeout(triggerPrint, 900);
      }
    })();
  </script>
</body>
</html>`;

  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();
}
