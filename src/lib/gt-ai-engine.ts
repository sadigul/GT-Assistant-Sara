import {
  MOCK_INVOICES,
  MOCK_PURCHASE_ORDERS,
  MOCK_LANCASHIRE_SITE,
  MOCK_CRM_DEALS,
  MOCK_INVENTORY,
  MOCK_OPERATIONS_METRICS
} from "../data/mock-gt-operations";
import { ChatMessage, Department, InvoiceItem, PurchaseOrder } from "../types/gt-operations";

interface EngineResponse {
  content: string;
  departmentTag: Department;
  structuredCard?: ChatMessage["structuredCard"];
  suggestedFollowUps: string[];
}

export function processUserQuery(query: string, activeDept: Department = "all"): EngineResponse {
  const q = query.toLowerCase().trim();

  // 1. INVOICE QUERIES
  if (
    q.includes("invoice") ||
    q.includes("overdue") ||
    q.includes("billing") ||
    q.includes("unpaid") ||
    q.includes("payment") ||
    q.includes("bentley") ||
    q.includes("mayfair") ||
    q.includes("gt-inv")
  ) {
    if (q.includes("overdue") || q.includes("late") || q.includes("unpaid")) {
      const overdueList = MOCK_INVOICES.filter((inv) => inv.status === "overdue");
      const totalOverdue = overdueList.reduce((acc, curr) => acc + curr.amount, 0);

      return {
        content: `### ⚠️ Overdue Invoices Alert - GoldTouch Finance ERP\n\nThere are currently **${overdueList.length} overdue invoices** totaling **£${totalOverdue.toLocaleString()} GBP**.\n\n` +
          `- **Bentley Bespoke Interiors Ltd** (${overdueList[0].invoiceNumber}): **£${overdueList[0].amount.toLocaleString()} GBP** (Due: ${overdueList[0].dueDate}) - *${overdueList[0].notes}*\n` +
          `- **Kensington Luxury Boutique Suites** (${overdueList[1]?.invoiceNumber}): **£${overdueList[1]?.amount.toLocaleString()} GBP** (Due: ${overdueList[1]?.dueDate}) - *${overdueList[1]?.notes}*\n\n` +
          `You can inspect the invoice details, generate an account statement, or dispatch an automated reminder below.`,
        departmentTag: "invoices",
        structuredCard: {
          type: "invoice",
          data: overdueList[0]
        },
        suggestedFollowUps: [
          "Show all pending invoices due this month",
          "What did we bill Bentley Bespoke for?",
          "How much has been paid by Rolls-Royce?",
          "Open full Accounts Receivable register"
        ]
      };
    }

    // Specific invoice lookup
    const matchedInvoice = MOCK_INVOICES.find(inv => 
      q.includes(inv.invoiceNumber.toLowerCase()) || 
      q.includes(inv.clientName.toLowerCase().split(" ")[0])
    ) || MOCK_INVOICES[0];

    return {
      content: `### 📄 Invoice Details: ${matchedInvoice.invoiceNumber}\n\n` +
        `- **Client:** ${matchedInvoice.clientName}\n` +
        `- **Amount:** £${matchedInvoice.amount.toLocaleString()} ${matchedInvoice.currency}\n` +
        `- **Status:** ${matchedInvoice.status.toUpperCase()}\n` +
        `- **Issued:** ${matchedInvoice.issueDate} | **Due:** ${matchedInvoice.dueDate}\n` +
        `- **Fulfillment Origin:** ${matchedInvoice.site}\n\n` +
        `**Line Items Summary:**\n` +
        (matchedInvoice.items || []).map(it => `• ${it.description} — ${it.quantity} units @ £${it.unitPrice} = **£${it.total.toLocaleString()}**`).join("\n") +
        (matchedInvoice.notes ? `\n\n*Note:* ${matchedInvoice.notes}` : ""),
      departmentTag: "invoices",
      structuredCard: {
        type: "invoice",
        data: matchedInvoice
      },
      suggestedFollowUps: [
        "Send payment reminder to client",
        "Show all invoices for Lancashire site",
        "Check purchasing orders related to this job",
        "What is our total outstanding revenue?"
      ]
    };
  }

  // 2. PURCHASING / PO QUERIES
  if (
    q.includes("purchas") ||
    q.includes("po-") ||
    q.includes("purchase order") ||
    q.includes("supplier") ||
    q.includes("vendor") ||
    q.includes("raw material") ||
    q.includes("procurement") ||
    q.includes("titanium") ||
    q.includes("cyanide")
  ) {
    const specificPO = MOCK_PURCHASE_ORDERS.find(po => 
      q.includes(po.poNumber.toLowerCase()) || 
      q.includes(po.supplier.toLowerCase().split(" ")[0])
    ) || MOCK_PURCHASE_ORDERS[0];

    return {
      content: `### 📦 Purchasing & Procurement Tracking - ERP Core\n\n` +
        `Found Purchase Order **${specificPO.poNumber}** with supplier **${specificPO.supplier}**.\n\n` +
        `- **Category:** ${specificPO.category}\n` +
        `- **Order Value:** £${specificPO.totalAmount.toLocaleString()} ${specificPO.currency}\n` +
        `- **Current Status:** \`${specificPO.status.replace(/_/g, " ").toUpperCase()}\` (${specificPO.progressPercent}% completed)\n` +
        `- **Destination:** ${specificPO.destinationSite}\n` +
        `- **Expected Arrival:** ${specificPO.expectedDelivery}\n` +
        `- **Authorized By:** ${specificPO.requestedBy}\n\n` +
        `**Ordered Consumables & Goods:**\n` +
        (specificPO.items || []).map(it => `• ${it.name} — ${it.qty} ${it.unit} @ £${it.unitCost}/${it.unit}`).join("\n"),
      departmentTag: "purchasing",
      structuredCard: {
        type: "purchase_order",
        data: specificPO
      },
      suggestedFollowUps: [
        "Check all in-transit shipments to Lancashire",
        "Show critical raw material inventory",
        "Compare supplier lead times",
        "List all POs approved this month"
      ]
    };
  }

  // 3. LANCASHIRE SITE / PRODUCTION / LOGISTICS / FACTORY
  if (
    q.includes("lancashire") ||
    q.includes("langinstire") ||
    q.includes("site") ||
    q.includes("factory") ||
    q.includes("production") ||
    q.includes("line") ||
    q.includes("dispatch") ||
    q.includes("throughput") ||
    q.includes("facility") ||
    q.includes("coating") ||
    q.includes("pvd")
  ) {
    return {
      content: `### 🏭 Lancashire Manufacturing Complex - Live Telemetry\n\n` +
        `**Status:** 🟢 ${MOCK_LANCASHIRE_SITE.operationalStatus} | **Efficiency:** ${MOCK_OPERATIONS_METRICS.lancashireFactoryEfficiency}\n` +
        `- **Facility:** ${MOCK_LANCASHIRE_SITE.facilityCode} (${MOCK_LANCASHIRE_SITE.location})\n` +
        `- **Daily Production Target:** ${MOCK_LANCASHIRE_SITE.dailyThroughputUnits} finished units / day\n` +
        `- **Safety Record:** **${MOCK_LANCASHIRE_SITE.safetyDaysLost} consecutive days** without lost-time incidents\n` +
        `- **Duty Shift Manager:** ${MOCK_LANCASHIRE_SITE.shiftManager}\n\n` +
        `**Active Production Lines:**\n` +
        MOCK_LANCASHIRE_SITE.activeLines.map((l: any) => 
          `• **${l.id}**: ${l.name} — Status: \`${l.status.toUpperCase()}\` (${l.efficiency}% efficiency) | Running: *${l.currentBatch}*`
        ).join("\n") +
        `\n\n**Today's Outbound Dispatches (${MOCK_LANCASHIRE_SITE.todayDispatches.length}):**\n` +
        MOCK_LANCASHIRE_SITE.todayDispatches.map((d: any) =>
          `• **${d.dispatchId}** -> ${d.destination} via ${d.carrier} [${d.status.toUpperCase()}]`
        ).join("\n"),
      departmentTag: "lancashire_site",
      structuredCard: {
        type: "lancashire_site",
        data: MOCK_LANCASHIRE_SITE
      },
      suggestedFollowUps: [
        "What is running in Line A right now?",
        "Show outbound dispatches for today",
        "Are there any maintenance alerts for Chamber 2?",
        "Check raw material inventory at Lancashire depot"
      ]
    };
  }

  // 4. SALES CRM / PIPELINE / CLIENTS
  if (
    q.includes("crm") ||
    q.includes("sales") ||
    q.includes("lead") ||
    q.includes("deal") ||
    q.includes("pipeline") ||
    q.includes("prospect") ||
    q.includes("client") ||
    q.includes("customer") ||
    q.includes("aston martin") ||
    q.includes("shard") ||
    q.includes("harrods")
  ) {
    const totalPipeline = MOCK_CRM_DEALS.reduce((acc, d) => acc + d.dealValue, 0);

    return {
      content: `### 💼 GoldTouch Sales CRM & Deal Pipeline\n\n` +
        `Active sales pipeline stands at **£${totalPipeline.toLocaleString()} GBP** across **${MOCK_CRM_DEALS.length} key enterprise accounts**.\n\n` +
        MOCK_CRM_DEALS.map(d => 
          `• **${d.companyName}** — **£${d.dealValue.toLocaleString()} GBP** | Stage: \`${d.stage}\` (${d.probability}% close prob) | Rep: ${d.salesRep}\n  *Scope:* ${d.interestArea} (Est Close: ${d.projectedClose})`
        ).join("\n\n") +
        `\n\n*Top deal closing this month:* **Harrods Knightsbridge** (£115,000 GBP) at 95% contract signing.`,
      departmentTag: "crm",
      structuredCard: {
        type: "crm_deals",
        data: MOCK_CRM_DEALS
      },
      suggestedFollowUps: [
        "Details on Aston Martin Special Projects deal",
        "What is Sarah Jenkins' total pipeline value?",
        "Which deals are expected to close in Q4?",
        "Draft client proposal for The Shard Refurbishment"
      ]
    };
  }

  // 5. INVENTORY / STOCK / DEPOT
  if (
    q.includes("stock") ||
    q.includes("inventory") ||
    q.includes("warehouse") ||
    q.includes("sku") ||
    q.includes("reorder") ||
    q.includes("chemicals") ||
    q.includes("vault") ||
    q.includes("gold target")
  ) {
    const lowStock = MOCK_INVENTORY.filter(item => item.status !== "In Stock");

    return {
      content: `### 📊 Central Inventory & Vault Stock Levels\n\n` +
        `Central warehouse and vault storage report:\n\n` +
        (lowStock.length > 0 
          ? `⚠️ **Action Required: ${lowStock.length} items below reorder buffer:**\n` +
            lowStock.map(i => `• **${i.name}** (${i.sku}): **${i.currentStock} ${i.unit}** (Buffer Reorder: ${i.reorderLevel} ${i.unit}) — Location: ${i.location} [${i.status.toUpperCase()}]`).join("\n") + `\n\n`
          : `All inventory buffers healthy.\n\n`) +
        `**Full Stock Listing:**\n` +
        MOCK_INVENTORY.map(i => `• ${i.name}: **${i.currentStock} ${i.unit}** (${i.status}) - £${i.unitValue} / ${i.unit}`).join("\n"),
      departmentTag: "inventory",
      structuredCard: {
        type: "inventory",
        data: MOCK_INVENTORY
      },
      suggestedFollowUps: [
        "Create PO for Gold Sputtering Target Discs",
        "Check batch consumption in Lancashire Line A",
        "Show supplier for Gold Potassium Cyanide",
        "Export inventory valuation spreadsheet"
      ]
    };
  }

  // DEFAULT / GENERAL OVERVIEW
  return {
    content: `### 🏛️ GoldTouch Executive Operations Command\n\n` +
      `Welcome to **GT Assistant**. I have live operational integrations across the entire GoldTouch enterprise:\n\n` +
      `1. **ERP Purchasing & Procurement:** ${MOCK_OPERATIONS_METRICS.activePurchaseOrdersCount} active purchase orders in transit / processing.\n` +
      `2. **Invoices & Billing Accounts:** £${MOCK_OPERATIONS_METRICS.totalOpenInvoicesAmount.toLocaleString()} GBP open invoices (£${MOCK_OPERATIONS_METRICS.overdueInvoicesAmount.toLocaleString()} GBP overdue).\n` +
      `3. **Lancashire Site Manufacturing:** 4 automated PVD/Anodizing lines operating at **${MOCK_OPERATIONS_METRICS.lancashireFactoryEfficiency}** efficiency, ${MOCK_LANCASHIRE_SITE.todayDispatches.length} scheduled dispatches today.\n` +
      `4. **Sales CRM Pipeline:** £${MOCK_OPERATIONS_METRICS.totalCrmPipelineValue.toLocaleString()} GBP in active corporate deals.\n` +
      `5. **Raw Material Inventory:** 5 primary SKUs monitored with real-time vault security.\n\n` +
      `What operational area would you like to explore or execute actions on?`,
    departmentTag: "all",
    structuredCard: {
      type: "quick_summary",
      data: MOCK_OPERATIONS_METRICS
    },
    suggestedFollowUps: [
      "Show all overdue customer invoices",
      "Give me the latest status of the Lancashire site",
      "Check pending raw material purchase orders",
      "List our top 5 CRM sales opportunities",
      "Check inventory levels in the Lancashire warehouse"
    ]
  };
}
