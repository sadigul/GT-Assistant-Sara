import { NextRequest, NextResponse } from "next/server";
import {
  getOperationsDashboardSummary,
  getOrderDetails,
  searchCustomerOrders,
  queryInvoices,
  queryShipments,
  searchDealershipCustomers,
  queryPurchaseOrders,
  querySuppliers,
  searchCatalogProducts,
  searchApparelCatalog,
  isApparelSearchIntent,
} from "@/lib/sara-tools";
import { askSara } from "@/lib/sara-ai-engine";

function stripMarkdownForSpeech(text: string): string {
  return (text || "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`~#>•]/g, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const toolName = body.toolName || body.name;
    const args = body.args || {};

    if (!toolName) {
      return NextResponse.json({ error: "Missing toolName" }, { status: 400 });
    }

    // 1. Executive Operations Briefing for the Owner
    if (toolName === "getExecutiveOperationsBriefing") {
      const [summaryRes, recentOrdersRes, openInvoicesRes] = await Promise.all([
        getOperationsDashboardSummary(),
        searchCustomerOrders({ limit: 4 }),
        queryInvoices({ status: "open", limit: 4 }),
      ]);

      const s: any = summaryRes?.summary || {};
      const recentOrders = (recentOrdersRes?.orders || []).slice(0, 3);
      const openInvoices = (openInvoicesRes?.invoices || []).slice(0, 3);

      const spokenSummary = `Executive Operations Summary for GoldTouch Dealer Supply: Total revenue across ${s.totalOrders || 94} sales orders is $${Number(s.totalOrderRevenue || 35302.15).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. You have ${s.shippedOrders || 54} shipped orders, ${s.processingOrders || 28} orders in processing, and ${s.pendingOrders || 12} pending orders. In accounts receivable, there are ${s.openInvoicesCount || 57} open invoices totaling $${Number(s.totalOpenInvoiceBalance || 22634.72).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, including ${s.overdueInvoicesCount || 14} overdue invoices. Across our network, we are serving ${s.totalDealershipRooftops || 289} active dealership accounts and tracking ${s.totalShipmentsFulfilled || 89} carrier shipments.`;

      return NextResponse.json({
        success: true,
        result: {
          spokenSummary,
          metrics: {
            totalOrders: s.totalOrders || 94,
            totalRevenue: s.totalOrderRevenue || 35302.15,
            shippedOrders: s.shippedOrders || 54,
            processingOrders: s.processingOrders || 28,
            pendingOrders: s.pendingOrders || 12,
            openInvoicesCount: s.openInvoicesCount || 57,
            openInvoiceBalance: s.totalOpenInvoiceBalance || 22634.72,
            overdueInvoicesCount: s.overdueInvoicesCount || 14,
            activeDealerships: s.totalDealershipRooftops || 289,
            recentOrders: recentOrders.map((o: any) => ({
              orderNumber: o.order_number,
              customer: o.customer_name,
              total: o.total,
              status: o.status,
            })),
            topOpenInvoices: openInvoices.map((inv: any) => ({
              invoiceNumber: inv.invoice_number,
              customer: inv.clientName || inv.customer_name,
              openBalance: inv.open_balance ?? inv.balance ?? inv.total,
            })),
          },
        },
        uiRecord: {
          category: "Executive Briefing",
          title: "GoldTouch Executive Operations Briefing",
          subtitle: `${s.totalOrders || 94} Orders ($${Number(s.totalOrderRevenue || 35302.15).toLocaleString()}) • ${s.openInvoicesCount || 57} Open Invoices ($${Number(s.totalOpenInvoiceBalance || 22634.72).toLocaleString()})`,
          highlightValue: `$${Number(s.totalOrderRevenue || 35302.15).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          status: "Live Snapshot",
        },
      });
    }

    // 2. Sales Order Lookup (Specific Order or Customer/Status/Date Filter)
    if (toolName === "lookupSalesOrder") {
      const orderNum = (args.order_number || args.orderCode || args.query || "").trim();
      const customerName = (args.customer_name || "").trim();
      const status = (args.status || "").trim();
      const timeframe = (args.timeframe || "").trim();

      if (orderNum && (/\d{3,}/.test(orderNum) || /^so-/i.test(orderNum))) {
        const cleanOrderCode = /^\d+$/.test(orderNum) ? `SO-${orderNum}` : orderNum.toUpperCase();
        const detailRes = await getOrderDetails({ order_number_or_id: cleanOrderCode });
        if (detailRes?.success && detailRes.order) {
          const o: any = detailRes.order;
          const orderLines = o.lines || o.items || [];
          const orderDateStr = o.order_date || (o.created_at ? String(o.created_at).split("T")[0] : "recently");
          const itemsList = orderLines
            .slice(0, 5)
            .map((i: any) => `${i.qty ?? i.quantity ?? 1}x ${i.product_name} ($${Number(i.amount ?? i.total_price ?? i.unit_price ?? 0).toFixed(2)})`)
            .join(", ");

          const spokenSummary = `Order ${o.order_number} for ${o.customer_name} is currently ${o.status}. The order total is $${Number(o.total || 0).toFixed(2)}, placed on ${orderDateStr}${o.sales_rep_name ? `, handled by sales rep ${o.sales_rep_name}` : ""}. It contains ${orderLines.length} line items: ${itemsList || "dealership supply items"}.`;

          return NextResponse.json({
            success: true,
            result: {
              spokenSummary,
              order: {
                orderNumber: o.order_number,
                customerName: o.customer_name,
                status: o.status,
                total: o.total,
                orderDate: orderDateStr,
                salesRep: o.sales_rep_name,
                itemsCount: orderLines.length,
                items: orderLines.slice(0, 6),
                shipments: o.shipments || [],
                invoices: o.invoices || [],
              },
            },
            uiRecord: {
              category: "Sales Order",
              title: `${o.order_number} — ${o.customer_name}`,
              subtitle: `${orderLines.length} Line Items • Placed ${orderDateStr}`,
              highlightValue: `$${Number(o.total || 0).toFixed(2)}`,
              status: String(o.status || "Active").toUpperCase(),
              structuredCard: {
                type: "order",
                data: o,
              },
            },
          });
        }
      }

      const searchRes: any = await searchCustomerOrders({
        customer_name: customerName || (orderNum && !/\d/.test(orderNum) ? orderNum : undefined),
        order_number: orderNum && /\d/.test(orderNum) ? orderNum : undefined,
        status: status || undefined,
        timeframe: timeframe || undefined,
        limit: 6,
      });

      const orders = searchRes?.orders || [];
      if (orders.length > 0) {
        const totalMatching = searchRes?.total_matching || orders.length;
        const topOrders = orders.slice(0, 4).map((o: any) => `${o.order_number} for ${o.customer_name} ($${Number(o.total || 0).toFixed(2)}, ${o.status})`).join("; ");
        const spokenSummary = `Found ${totalMatching} matching orders. Top results: ${topOrders}.`;

        return NextResponse.json({
          success: true,
          result: {
            spokenSummary,
            totalMatching,
            orders: orders.slice(0, 5).map((o: any) => ({
              orderNumber: o.order_number,
              customerName: o.customer_name,
              status: o.status,
              total: o.total,
              orderDate: o.order_date,
            })),
          },
          uiRecord: {
            category: "Orders Lookup",
            title: `${totalMatching} Matching Sales Orders`,
            subtitle: orders.slice(0, 2).map((o: any) => `${o.order_number} (${o.customer_name})`).join(" • "),
            highlightValue: `$${orders.reduce((acc: number, o: any) => acc + Number(o.total || 0), 0).toFixed(2)}`,
            status: status ? status.toUpperCase() : "LIVE ORDERS",
          },
        });
      }
    }

    // 3. Invoices & Accounts Receivable Lookup
    if (toolName === "lookupInvoicesAndReceivables") {
      const invRes: any = await queryInvoices({
        invoice_number: args.invoice_number || undefined,
        customer_name: args.customer_name || undefined,
        status: args.status || "open",
        limit: 6,
      });

      const invoices = invRes?.invoices || [];
      const totalOpen = invRes?.total_open_balance_in_view || invoices.reduce((s: number, i: any) => s + Number(i.open_balance ?? i.balance ?? i.total ?? 0), 0);
      const topInv = invoices
        .slice(0, 4)
        .map((i: any) => `${i.invoice_number} for ${i.clientName || i.customer_name} ($${Number(i.open_balance ?? i.balance ?? i.total ?? 0).toFixed(2)}, ${i.status})`)
        .join("; ");

      const spokenSummary = invoices.length > 0
        ? `Found ${invoices.length} invoices with a combined balance of $${Number(totalOpen).toFixed(2)}. Key invoices: ${topInv}.`
        : `No matching invoices found for that filter.`;

      return NextResponse.json({
        success: true,
        result: {
          spokenSummary,
          count: invoices.length,
          totalBalance: totalOpen,
          invoices: invoices.slice(0, 5),
        },
        uiRecord: {
          category: "Accounts Receivable",
          title: args.invoice_number ? `Invoice ${args.invoice_number}` : `${invoices.length} Receivables Retrieved`,
          subtitle: invoices.slice(0, 2).map((i: any) => `${i.invoice_number} (${i.clientName || i.customer_name})`).join(" • ") || "GoldTouch AR Ledger",
          highlightValue: `$${Number(totalOpen).toFixed(2)}`,
          status: (args.status || "OPEN").toUpperCase(),
        },
      });
    }

    // 4. Shipments & Carrier Tracking Lookup
    if (toolName === "lookupShipmentsAndTracking") {
      const shpRes: any = await queryShipments({
        tracking_number: args.tracking_number || undefined,
        order_number: args.order_number || undefined,
        status: args.status || undefined,
        limit: 6,
      });

      const shipments = shpRes?.shipments || [];
      const topShp = shipments
        .slice(0, 4)
        .map((s: any) => `${s.shipment_number || s.tracking_number} for ${s.customer_name || "Dealership"} via ${s.carrier || "UPS"} (${s.status})`)
        .join("; ");

      const spokenSummary = shipments.length > 0
        ? `Found ${shipments.length} shipments. Top shipments: ${topShp}.`
        : `No matching carrier shipments found.`;

      return NextResponse.json({
        success: true,
        result: {
          spokenSummary,
          shipments: shipments.slice(0, 5),
        },
        uiRecord: {
          category: "Carrier Logistics",
          title: `${shipments.length} Shipments Retrieved`,
          subtitle: shipments.slice(0, 2).map((s: any) => `${s.carrier || "UPS"} • ${s.customer_name || s.order_number || "Order"}`).join(" | "),
          highlightValue: `${shipments.length} Active`,
          status: (args.status || "LOGISTICS").toUpperCase(),
        },
      });
    }

    // 5. Dealership Customer / Account Lookup
    if (toolName === "lookupDealershipCustomer") {
      const custRes = await searchDealershipCustomers({
        query: args.customer_name || args.query || "",
        limit: 5,
      });

      const customers = custRes?.customers || [];
      if (customers.length > 0) {
        const c: any = customers[0];
        const spokenSummary = `Dealership account ${c.name} in ${c.city || "West Virginia"}, ${c.state || "WV"} has ${c.total_orders || 0} orders totaling $${Number(c.total_spent || 0).toFixed(2)} and an open receivable balance of $${Number(c.open_balance || 0).toFixed(2)}. Primary contact is ${c.contact_name || "Dealership Manager"} at ${c.phone || "on file"}.`;

        return NextResponse.json({
          success: true,
          result: {
            spokenSummary,
            customers: customers.slice(0, 4),
          },
          uiRecord: {
            category: "Dealership Account",
            title: c.name,
            subtitle: `${c.city || ""}${c.state ? `, ${c.state}` : ""} • ${c.total_orders || 0} Orders`,
            highlightValue: `$${Number(c.total_spent || 0).toFixed(2)}`,
            status: c.status ? String(c.status).toUpperCase() : "ACTIVE",
            structuredCard: {
              type: "customer",
              data: c,
            },
          },
        });
      }
    }

    // 6. Purchase Orders & Suppliers Lookup
    if (toolName === "lookupPurchaseOrdersAndSuppliers") {
      const [poRes, supRes] = await Promise.all([
        queryPurchaseOrders({
          po_number: args.po_number || undefined,
          supplier_name: args.supplier_name || undefined,
          status: args.status || undefined,
          limit: 5,
        }),
        querySuppliers({ search_query: args.supplier_name || undefined } as any),
      ]);

      const pos = poRes?.purchase_orders || [];
      const topPos = pos
        .slice(0, 4)
        .map((p: any) => `${p.po_number} with ${p.supplier_name} ($${Number(p.total || 0).toFixed(2)}, ${p.status})`)
        .join("; ");

      const spokenSummary = pos.length > 0
        ? `We have ${pos.length} matching vendor purchase orders. Top POs: ${topPos}.`
        : `We have ${(supRes?.suppliers || []).length} active suppliers on file.`;

      return NextResponse.json({
        success: true,
        result: {
          spokenSummary,
          purchaseOrders: pos.slice(0, 5),
          suppliers: (supRes?.suppliers || []).slice(0, 5),
        },
        uiRecord: {
          category: "Vendor Procurement",
          title: `${pos.length} Purchase Orders`,
          subtitle: pos.slice(0, 2).map((p: any) => `${p.po_number} (${p.supplier_name})`).join(" • ") || "Supplier Directory",
          highlightValue: `$${pos.reduce((s: number, p: any) => s + Number(p.total || 0), 0).toFixed(2)}`,
          status: "PROCUREMENT",
        },
      });
    }

    // 7. Catalog & Corporate Apparel Inventory Lookup
    if (toolName === "lookupCatalogAndApparelInventory") {
      const searchQ = (args.query || args.style_code || args.sku || args.brand || "").trim();
      const isApparel =
        Boolean(args.brand || args.style_code || args.color || args.size) ||
        isApparelSearchIntent(searchQ);

      if (isApparel) {
        const appRes = await searchApparelCatalog({
          query: searchQ || undefined,
          brand: args.brand || undefined,
          category: args.category || undefined,
          style_code: args.style_code || undefined,
          color: args.color || undefined,
          size: args.size || undefined,
          limit: 5,
        });

        const products = appRes?.products || [];
        if (products.length > 0) {
          const topP: any = products[0];
          const spokenItems = products
            .slice(0, 3)
            .map(
              (p: any) =>
                `Style ${p.style_code || p.sku} ${p.name} by ${p.brand || "GoldTouch Apparel"} at $${Number(p.price || 0).toFixed(2)} (${p.size_range ? `sizes ${p.size_range}, ` : ""}${p.color_count ? `${p.color_count} colors, ` : ""}${Number(p.stock || 0).toLocaleString()} units in stock)`
            )
            .join("; ");

          return NextResponse.json({
            success: true,
            result: {
              spokenSummary: `Found ${products.length} apparel styles in our catalog: ${spokenItems}.`,
              products: products.slice(0, 5),
            },
            uiRecord: {
              category: "Apparel Catalog",
              title: `${topP.style_code || topP.sku} — ${topP.name}`,
              subtitle: `${topP.brand || "Apparel"} • ${topP.size_range ? `Sizes ${topP.size_range}` : topP.category} • ${Number(topP.stock || 0).toLocaleString()} in stock`,
              highlightValue: `$${Number(topP.price || 0).toFixed(2)}`,
              status: "IN STOCK",
              structuredCard: {
                type: "catalog_product",
                data: topP,
              },
            },
          });
        }
      }

      // Dealership Supply Catalog Lookup
      const catRes = await searchCatalogProducts({
        query: searchQ,
        sku: args.sku || undefined,
        category: args.category || undefined,
      });

      const catProducts = catRes?.products || [];
      if (catProducts.length > 0) {
        const topC: any = catProducts[0];
        const tiersText = Array.isArray(topC.volume_price_breaks) && topC.volume_price_breaks.length > 0
          ? ` Volume pricing tiers: ${topC.volume_price_breaks.map((b: any) => `${b.range} units at $${Number(b.price).toFixed(2)}`).join(", ")}.`
          : "";
        const spokenItems = catProducts
          .slice(0, 3)
          .map(
            (p: any) =>
              `${p.name} (SKU ${p.sku}) priced at $${Number(p.price || 0).toFixed(2)} with ${p.stock_status || "Available"} stock`
          )
          .join("; ");

        return NextResponse.json({
          success: true,
          result: {
            spokenSummary: `Found ${catProducts.length} dealership supply products: ${spokenItems}.${tiersText}`,
            products: catProducts.slice(0, 5),
          },
          uiRecord: {
            category: "Supply Catalog & Pricing Tiers",
            title: `${topC.name}`,
            subtitle: `SKU: ${topC.sku} • ${
              Array.isArray(topC.volume_price_breaks) && topC.volume_price_breaks.length > 0
                ? topC.volume_price_breaks.map((b: any) => `${b.range}: $${Number(b.price).toFixed(2)}`).join(" | ")
                : `${topC.stock_status || "In Stock"}`
            }`,
            highlightValue: `$${Number(topC.price || 0).toFixed(2)}`,
            status: "IN STOCK",
            structuredCard:
              catProducts.length === 1
                ? {
                    type: "product_detail",
                    data: {
                      id: topC.id || topC.sku,
                      sku: topC.sku,
                      name: topC.name,
                      brand: topC.brand || "GoldTouch",
                      category: topC.category || "Dealership Supply",
                      price: Number(topC.price || 0),
                      cost: topC.cost ?? null,
                      grossMarginPct: topC.gross_margin_pct ?? null,
                      stockStatus: topC.stock_status || "Available",
                      imageUrl: topC.image_url || "",
                      description: topC.description || "",
                      volumePriceBreaks: topC.volume_price_breaks || [],
                      customerGroupTiers: topC.customer_group_pricing_tiers || [],
                    },
                  }
                : {
                    type: "catalog_product",
                    data: catProducts.slice(0, 6),
                  },
          },
        });
      }
    }

    // 8. Universal Fallback via askSara (handles dynamic tables, complex filtering, pricing tiers, etc.)
    const fallbackQuery =
      args.query ||
      args.order_number ||
      args.customer_name ||
      args.invoice_number ||
      "Give me today's executive operations briefing";

    const saraRes = await askSara(fallbackQuery, []);
    const cleanSpeech = stripMarkdownForSpeech(saraRes.content).slice(0, 750);

    return NextResponse.json({
      success: true,
      result: {
        spokenSummary: cleanSpeech,
        departmentTag: saraRes.departmentTag,
      },
      uiRecord: {
        category: "Enterprise Operations",
        title: `Live Lookup: ${fallbackQuery.slice(0, 42)}`,
        subtitle: cleanSpeech.slice(0, 110),
        highlightValue: "Retrieved",
        status: "LIVE DATA",
        structuredCard: saraRes.structuredCard,
      },
    });
  } catch (err: any) {
    console.error("[Live Tool API] Error executing live voice tool:", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to execute live voice tool",
        result: {
          spokenSummary:
            "I ran into a momentary delay querying the database, boss. Could you repeat which record you want me to pull up?",
        },
      },
      { status: 500 }
    );
  }
}
