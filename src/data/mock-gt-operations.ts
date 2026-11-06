import { InvoiceItem, PurchaseOrder, LancashireSiteData, CrmLeadDeal, InventoryItem } from "../types/gt-operations";

export const MOCK_INVOICES: InvoiceItem[] = [
  {
    id: "inv-01",
    invoiceNumber: "GT-INV-2026-44180",
    clientName: "Bentley Bespoke Interiors Ltd",
    clientEmail: "procurement@bentley-bespoke.co.uk",
    amount: 48500,
    currency: "GBP",
    status: "overdue",
    issueDate: "2026-08-15",
    dueDate: "2026-09-15",
    site: "Lancashire Site A - Precision Plating Bay",
    items: [
      { description: "24K Gold PVD Coating - Steering & Trim Accents (250 sets)", quantity: 250, unitPrice: 154, total: 38500 },
      { description: "Diamond Cut Anodizing & Laser Etch QC Pass", quantity: 250, unitPrice: 40, total: 10000 }
    ],
    notes: "Overdue by 28 days. Follow-up dispatched to Accounts Receivable team."
  },
  {
    id: "inv-02",
    invoiceNumber: "GT-INV-2026-44205",
    clientName: "Mayfair Grand Penthouse Project",
    clientEmail: "accounts@mayfairluxurydesign.com",
    amount: 32400,
    currency: "GBP",
    status: "pending",
    issueDate: "2026-09-28",
    dueDate: "2026-10-28",
    site: "Lancashire Site B - Architectural Metalwork",
    items: [
      { description: "Architectural Brushed Champagne Gold Balustrade Panels", quantity: 18, unitPrice: 1600, total: 28800 },
      { description: "On-site Lancashire Pre-assembly & Protective Shrink-Crating", quantity: 18, unitPrice: 200, total: 3600 }
    ],
    notes: "Payment terms: Net 30. Awaiting stage sign-off."
  },
  {
    id: "inv-03",
    invoiceNumber: "GT-INV-2026-44129",
    clientName: "Rolls-Royce Bespoke Coachbuild",
    clientEmail: "ap-payables@goodwoodbespoke.com",
    amount: 67200,
    currency: "GBP",
    status: "paid",
    issueDate: "2026-08-01",
    dueDate: "2026-08-31",
    site: "Lancashire Facility - High Purity Vacuum Bay",
    items: [
      { description: "Rose Gold Vapor Deposition for Phantom Treadplates", quantity: 120, unitPrice: 460, total: 55200 },
      { description: "Spectrometry Certificate of Authenticity & Batch Testing", quantity: 1, unitPrice: 12000, total: 12000 }
    ],
    notes: "Settled in full via BACS on Aug 29, 2026."
  },
  {
    id: "inv-04",
    invoiceNumber: "GT-INV-2026-44222",
    clientName: "Preston Commercial Glazing Ltd",
    clientEmail: "finance@prestonglazing.co.uk",
    amount: 14850,
    currency: "GBP",
    status: "pending",
    issueDate: "2026-10-02",
    dueDate: "2026-11-02",
    site: "Lancashire Site B - Exterior Systems",
    items: [
      { description: "Titanium Gold Mullion Cap Extrusions 6.2m", quantity: 45, unitPrice: 330, total: 14850 }
    ]
  },
  {
    id: "inv-05",
    invoiceNumber: "GT-INV-2026-44098",
    clientName: "Kensington Luxury Boutique Suites",
    clientEmail: "billing@kensingtonhotels.com",
    amount: 21900,
    currency: "GBP",
    status: "overdue",
    issueDate: "2026-08-20",
    dueDate: "2026-09-20",
    site: "Lancashire Site A - Decorative Hardware",
    items: [
      { description: "Custom Satin Gold Shower Fixtures & Door Escutcheons", quantity: 60, unitPrice: 365, total: 21900 }
    ],
    notes: "Second notice issued. Contact rep: Sarah Jenkins."
  }
];

export const MOCK_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    poNumber: "GT-PO-2026-8941",
    supplier: "Lancashire Chemical Refining Ltd",
    category: "Chemicals",
    totalAmount: 19400,
    currency: "GBP",
    status: "in_transit",
    destinationSite: "Lancashire Central Storage - Hazard Bay 3",
    orderDate: "2026-10-08",
    expectedDelivery: "2026-10-15",
    requestedBy: "Liam Gallagher (Head of Plating Operations)",
    progressPercent: 65,
    items: [
      { name: "Gold Potassium Cyanide 68.3% Tech Grade", qty: 25, unit: "kg", unitCost: 650 },
      { name: "Brightener Electrolyte Additive G-44", qty: 200, unit: "litres", unitCost: 15.75 }
    ]
  },
  {
    poNumber: "GT-PO-2026-8955",
    supplier: "Apex Precision Titanium UK",
    category: "Raw Material",
    totalAmount: 42800,
    currency: "GBP",
    status: "received_at_site",
    destinationSite: "Lancashire Production Bay 1 - Milling & Prep",
    orderDate: "2026-09-29",
    expectedDelivery: "2026-10-12",
    requestedBy: "Marcus Thorne (Production Director)",
    progressPercent: 90,
    items: [
      { name: "Grade 5 Titanium Bar Stock (Dia 65mm x 3m)", qty: 80, unit: "bars", unitCost: 410 },
      { name: "Mirror Polished Stainless 316L Sheets (2mm x 1250 x 2500)", qty: 50, unit: "sheets", unitCost: 200 }
    ]
  },
  {
    poNumber: "GT-PO-2026-9012",
    supplier: "Leyland Industrial Tooling & Jigs",
    category: "Tooling",
    totalAmount: 8650,
    currency: "GBP",
    status: "supplier_confirmed",
    destinationSite: "Lancashire Site - CNC & Jig Shop",
    orderDate: "2026-10-11",
    expectedDelivery: "2026-10-22",
    requestedBy: "Dave Hesketh (Tooling Supervisor)",
    progressPercent: 40,
    items: [
      { name: "Custom Titanium Racking Fixtures for PVD Chamber 2", qty: 12, unit: "units", unitCost: 620 },
      { name: "High-Temperature Ceramic Masking Plugs", qty: 500, unit: "pcs", unitCost: 2.42 }
    ]
  },
  {
    poNumber: "GT-PO-2026-8890",
    supplier: "EcoPack Sustainable Crates Manchester",
    category: "Packaging",
    totalAmount: 4300,
    currency: "GBP",
    status: "qc_approved",
    destinationSite: "Lancashire Dispatch Warehouse",
    orderDate: "2026-09-18",
    expectedDelivery: "2026-09-25",
    requestedBy: "Emma Wright (Logistics Manager)",
    progressPercent: 100,
    items: [
      { name: "Foam-Lined Heavy-Duty Timber Export Cases (Large)", qty: 40, unit: "crates", unitCost: 85 },
      { name: "Anti-Static Anti-Scratch VCI Protective Sleeves", qty: 1000, unit: "pcs", unitCost: 0.90 }
    ]
  }
];

export const MOCK_LANCASHIRE_SITE: LancashireSiteData = {
  siteName: "GoldTouch Lancashire Manufacturing & Finishing Complex",
  facilityCode: "GT-UK-LAN-01",
  location: "Chorley Logistics Park, Lancashire, PR6 7BX, United Kingdom",
  operationalStatus: "Optimal",
  dailyThroughputUnits: 430,
  safetyDaysLost: 412, // 412 days without incident!
  shiftManager: "Callum Fitzpatrick (Day Shift Operations Lead)",
  activeLines: [
    {
      id: "LINE-A",
      name: "Line A: Precision PVD Gold Vapor Deposition Chamber 1",
      status: "running",
      efficiency: 96.4,
      currentBatch: "BATCH-GT-9941 (Bentley Interior Accents)",
      operator: "Gary Barlow"
    },
    {
      id: "LINE-B",
      name: "Line B: Architectural Large-Format Anodizing & Tinting Tank",
      status: "running",
      efficiency: 92.1,
      currentBatch: "BATCH-GT-9942 (Mayfair Balustrade Mullions)",
      operator: "Darren Boyd"
    },
    {
      id: "LINE-C",
      name: "Line C: Automated Electro-Polishing & Ultrasonic Cleaning",
      status: "running",
      efficiency: 98.0,
      currentBatch: "BATCH-GT-9945 (Pre-plating Degrease Cycle)",
      operator: "Helen Croft"
    },
    {
      id: "LINE-D",
      name: "Line D: High-Vacuum Sputtering Chamber 2 (Specialty Alloys)",
      status: "calibrating",
      efficiency: 85.0,
      currentBatch: "Calibration & Cathode Target Replacement",
      operator: "Dave Hesketh"
    }
  ],
  todayDispatches: [
    {
      dispatchId: "DSP-LAN-491",
      destination: "Goodwood Rolls-Royce Facility, West Sussex",
      carrier: "GT Dedicated Secure Transporter",
      status: "dispatched",
      departureTime: "07:30 AM",
      palletCount: 2
    },
    {
      dispatchId: "DSP-LAN-492",
      destination: "Mayfair London Luxury Site (Delivery Gate 4)",
      carrier: "Palletways Express Freight",
      status: "loading",
      departureTime: "02:00 PM",
      palletCount: 4
    },
    {
      dispatchId: "DSP-LAN-493",
      destination: "Preston Architectural Coatings Depot",
      carrier: "DPD Heavy Freight",
      status: "delivered",
      departureTime: "06:15 AM",
      palletCount: 1
    }
  ]
};

export const MOCK_CRM_DEALS: CrmLeadDeal[] = [
  {
    id: "deal-01",
    companyName: "Aston Martin Special Projects",
    contactPerson: "Julian Vance (Head of Materials Sourcing)",
    email: "j.vance@astonmartinspecial.com",
    phone: "+44 1926 644000",
    dealValue: 185000,
    currency: "GBP",
    stage: "Negotiation",
    probability: 85,
    salesRep: "Sarah Jenkins",
    projectedClose: "2026-11-15",
    interestArea: "Titanium Gold Bespoke Grille Inserts & Cockpit Badging"
  },
  {
    id: "deal-02",
    companyName: "The Shard Executive Suites Refurbishment",
    contactPerson: "Eleanor Rigby (Lead Architect)",
    email: "e.rigby@londonsharddevelopment.com",
    phone: "+44 20 7403 8888",
    dealValue: 240000,
    currency: "GBP",
    stage: "Proposal Sent",
    probability: 60,
    salesRep: "Alastair Vance",
    projectedClose: "2026-12-01",
    interestArea: "Full Architectural Rose Gold & Champagne PVD Paneling"
  },
  {
    id: "deal-03",
    companyName: "Harrods Knightsbridge Department Fitout",
    contactPerson: "Marcus Sterling (VP Store Development)",
    email: "m.sterling@harrodsstorefronts.co.uk",
    phone: "+44 20 7730 1234",
    dealValue: 115000,
    currency: "GBP",
    stage: "Awaiting Contract",
    probability: 95,
    salesRep: "Sarah Jenkins",
    projectedClose: "2026-10-25",
    interestArea: "Decorative Mirror Gold Fixtures & Display Vitrines"
  },
  {
    id: "deal-04",
    companyName: "Superyacht Monaco Marine Fitters",
    contactPerson: "Capt. Jean-Luc Moreau",
    email: "tech@monacomarine-build.mc",
    phone: "+377 97 97 10 00",
    dealValue: 320000,
    currency: "GBP",
    stage: "Discovery",
    probability: 40,
    salesRep: "Alastair Vance",
    projectedClose: "2027-01-20",
    interestArea: "Marine-Grade Marine Salt-Resistant PVD Gold Plating"
  }
];

export const MOCK_INVENTORY: InventoryItem[] = [
  {
    sku: "SKU-AU-GPC-01",
    name: "Gold Potassium Cyanide 68.3% (Plating Grade)",
    category: "Precious Chemicals",
    currentStock: 14.2,
    unit: "kg",
    reorderLevel: 20.0,
    location: "Lancashire Safe Vault #1",
    unitValue: 650,
    status: "Low Stock"
  },
  {
    sku: "SKU-TI-GR5-BAR",
    name: "Grade 5 Titanium Bar Stock (65mm x 3000mm)",
    category: "Raw Metals",
    currentStock: 142,
    unit: "bars",
    reorderLevel: 50,
    location: "Lancashire Racks Yard 2",
    unitValue: 410,
    status: "In Stock"
  },
  {
    sku: "SKU-SS-316L-SHT",
    name: "Stainless Steel 316L Mirror Polish (1.5mm x 1250 x 2500)",
    category: "Sheet Stock",
    currentStock: 94,
    unit: "sheets",
    reorderLevel: 40,
    location: "Lancashire Bay 3 Floor",
    unitValue: 200,
    status: "In Stock"
  },
  {
    sku: "SKU-CH-PVD-CATH",
    name: "Pure 99.99% Gold Sputtering Target Disc (200mm)",
    category: "Consumables",
    currentStock: 2,
    unit: "discs",
    reorderLevel: 3,
    location: "Lancashire Vault Safe #2",
    unitValue: 18500,
    status: "Critical"
  },
  {
    sku: "SKU-SOLV-IPA-IND",
    name: "Isopropanol Ultra-Pure Cleaning Solvent",
    category: "Cleaning Solvents",
    currentStock: 850,
    unit: "litres",
    reorderLevel: 300,
    location: "Lancashire Hazard Tank Compound",
    unitValue: 4.80,
    status: "In Stock"
  }
];

export const MOCK_OPERATIONS_METRICS = {
  activePurchaseOrdersCount: MOCK_PURCHASE_ORDERS.length,
  totalOpenInvoicesAmount: MOCK_INVOICES
    .filter(i => i.status === "pending" || i.status === "overdue")
    .reduce((sum, i) => sum + i.amount, 0),
  overdueInvoicesAmount: MOCK_INVOICES
    .filter(i => i.status === "overdue")
    .reduce((sum, i) => sum + i.amount, 0),
  totalCrmPipelineValue: MOCK_CRM_DEALS.reduce((sum, d) => sum + d.dealValue, 0),
  lancashireFactoryEfficiency: "95.4%",
  lancashireActiveStaff: 38,
  lancashireActiveLinesCount: 4,
  dispatchesTodayCount: MOCK_LANCASHIRE_SITE.todayDispatches.length
};
