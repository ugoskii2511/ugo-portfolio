/// Business Solutions: the six offerings, their copy, deliverables and the
/// questions their enquiry form asks. This is the single place to edit
/// wording, deliverables or form options. Pricing rules live separately in
/// src/lib/solution-pricing.ts.
///
/// Honesty rules for this file: every offering is a service delivered to the
/// client's requirements, not a finished product sitting on a shelf. Say so
/// in `availability`. Only list related projects that really exist in the
/// portfolio (slugs from src/lib/projects.ts), and say what they show.

export type FieldOption = { value: string; label: string };

type FieldBase = { key: string; label: string; hint?: string; required?: boolean };
export type SolutionField =
  | (FieldBase & { type: "multi"; options: FieldOption[]; /** Counts toward the estimate as modules or integrations. */ weight?: "module" | "integration" | "physical" })
  | (FieldBase & { type: "select"; options: FieldOption[] })
  | (FieldBase & { type: "number"; min: number; max: number; placeholder?: string })
  | (FieldBase & { type: "text" | "textarea"; maxLength: number; placeholder?: string });

export type SolutionIcon = "box" | "workflow" | "card" | "sparkles" | "school" | "store";

export type Solution = {
  key: string;
  slug: string;
  name: string;
  icon: SolutionIcon;
  headline: string;
  description: string;
  /// One line for the overview card.
  summary: string;
  /// What this offering honestly is right now.
  availability: string;
  benefits: string[];
  /// Three highlights for the overview card.
  highlights: string[];
  deliverables: { title: string; items: string[] }[];
  cta: string;
  /// Industry-specific examples (what a system could do for them).
  industries?: { name: string; examples: string[] }[];
  /// Offering-specific delivery steps (otherwise the shared process is shown).
  process?: string[];
  /// Costs that sit outside the build: printing, hosting, third-party fees…
  costNotes: string[];
  related?: { slug: string; note: string }[];
  /// Service-specific enquiry questions (the common contact fields are added for every service).
  fields: SolutionField[];
};

const opts = (...labels: string[]): FieldOption[] =>
  labels.map((label) => ({ value: label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), label }));

export const SOLUTIONS: Solution[] = [
  {
    key: "business-in-a-box",
    slug: "business-in-a-box",
    name: "Business-in-a-Box",
    icon: "box",
    headline: "Everything your business needs to establish a professional digital presence.",
    description:
      "We combine essential digital tools and selected physical business materials to help businesses establish a professional identity and operate more efficiently.",
    summary: "A website, digital profile and QR tools, with optional printed materials, set up together.",
    availability:
      "A configurable package. You choose the pieces you need; nothing is bundled in by default, and the quotation lists exactly what's included.",
    benefits: [
      "One partner sets up your online presence and your printed materials, so they match",
      "Customers can find you, contact you on WhatsApp and see what you offer",
      "Printed QR codes lead straight to your website, profile or catalogue",
      "You're onboarded and supported after launch, not left on your own",
    ],
    highlights: ["Business website & digital profile", "QR codes linking to your business", "Optional printed cards & brochures"],
    deliverables: [
      {
        title: "Digital",
        items: [
          "Professional, mobile-responsive business website",
          "Business information and service pages",
          "Digital business profile",
          "QR code linking to your website, profile or product catalogue",
          "WhatsApp integration and contact forms",
          "Digital invoice and receipt system, where appropriate",
          "Payment integration, where required",
          "Basic search-engine optimisation",
          "Analytics integration, where appropriate",
        ],
      },
      {
        title: "Physical (optional)",
        items: ["Printed business cards", "Printed QR-code cards", "Business brochures or company profiles", "Other approved branded stationery"],
      },
      {
        title: "Service",
        items: [
          "Initial requirements consultation",
          "Configuration for your business",
          "Website launch assistance",
          "Onboarding and training",
          "An agreed initial technical support period",
        ],
      },
    ],
    cta: "Customise this package",
    costNotes: [
      "Printing, physical production and delivery are quoted separately, based on quantities and finishes.",
      "Domain registration, hosting and third-party subscriptions (e.g. payment providers) have their own costs.",
    ],
    related: [
      { slug: "prudential-international-school", note: "A complete business website built around one clear action (admissions)." },
      { slug: "nzechukwus-books", note: "Catalogue website with WhatsApp ordering." },
    ],
    fields: [
      {
        key: "digital",
        type: "multi",
        weight: "module",
        label: "Digital items you need",
        required: true,
        options: opts(
          "Business website",
          "Digital business profile",
          "QR code",
          "Invoice & receipt system",
          "WhatsApp integration",
          "Contact forms",
          "Payment integration",
          "Analytics"
        ),
      },
      {
        key: "physical",
        type: "multi",
        weight: "physical",
        label: "Printed materials (optional)",
        options: opts("Business cards", "QR-code cards", "Brochure / company profile", "Other stationery"),
      },
      { key: "printQuantity", type: "number", min: 0, max: 100000, label: "Approximate print quantity", hint: "Leave empty if you're not ordering print." },
      { key: "branding", type: "select", label: "Do you have a logo and brand colours?", options: opts("Yes, I have them", "Partly", "No, I need help") },
    ],
  },
  {
    key: "business-automation",
    slug: "business-automation",
    name: "Business Automation Systems",
    icon: "workflow",
    headline: "Spend less time managing tasks. Spend more time growing your business.",
    description:
      "We build custom software that helps businesses organise operations, manage information, monitor performance and reduce repetitive manual work.",
    summary: "Custom inventory, sales, customer and reporting systems, built around how you work.",
    availability:
      "Custom development. These are configurable systems built to your requirements, not one ready-made product. Related work below shows the kind of systems already built.",
    benefits: [
      "Know your stock, sales and expenses at any moment",
      "Replace spreadsheets and notebooks with one reliable system",
      "Automatic notifications and reports instead of manual follow-up",
      "Role-based access, so staff see only what they need",
    ],
    highlights: ["Inventory, sales & expense tracking", "Customer records & invoicing", "Dashboards & automated reports"],
    deliverables: [
      {
        title: "Possible modules",
        items: [
          "Inventory management and stock tracking",
          "Sales and expense management",
          "Customer relationship management",
          "Digital invoicing and receipts",
          "Order management",
          "Employee dashboards",
          "Business analytics dashboards",
          "Automated notifications",
          "Customer databases",
          "Reporting systems",
          "Workflow automation",
          "Custom internal business applications",
        ],
      },
    ],
    cta: "Discuss your system",
    industries: [
      { name: "Retail", examples: ["Stock levels per branch", "Daily sales and expense summaries", "Low-stock alerts"] },
      { name: "Electronics stores", examples: ["Serial-number and warranty tracking", "Repairs and returns log", "Supplier orders"] },
      { name: "Fashion boutiques", examples: ["Sizes and colours per item", "Customer purchase history", "New-arrival notifications"] },
      { name: "Restaurants", examples: ["Orders by table or delivery", "Ingredient stock tracking", "Daily takings report"] },
      { name: "Schools", examples: ["Fees and payment records", "Receipts for parents", "Staff and admin dashboards"] },
      { name: "Wholesalers", examples: ["Bulk orders and invoicing", "Customer credit balances", "Stock across warehouses"] },
      { name: "Service businesses", examples: ["Bookings and job tracking", "Quotations and invoices", "Customer follow-up reminders"] },
    ],
    costNotes: [
      "Hosting, databases and any paid third-party services are billed separately or passed through at cost.",
      "Data migration from existing records is scoped once we've seen your data.",
    ],
    related: [
      { slug: "swiftvtu", note: "A platform with wallets, transactions, admin dashboards and automated processing." },
      { slug: "pickbykay", note: "A store backed by inventory management and order handling." },
    ],
    fields: [
      {
        key: "industry",
        type: "select",
        label: "Your industry",
        required: true,
        options: opts("Retail", "Electronics", "Fashion", "Restaurant", "School", "Wholesale", "Service business", "Other"),
      },
      { key: "size", type: "select", label: "Business size", options: opts("Just me", "2–10 staff", "11–50 staff", "More than 50 staff") },
      {
        key: "features",
        type: "multi",
        weight: "module",
        label: "Features you need",
        required: true,
        options: opts(
          "Inventory & stock tracking",
          "Sales & expenses",
          "Customer records (CRM)",
          "Invoices & receipts",
          "Order management",
          "Employee dashboards",
          "Analytics dashboard",
          "Automated notifications",
          "Reports",
          "Workflow automation",
          "Something else (describe below)"
        ),
      },
      { key: "workflow", type: "textarea", maxLength: 1500, label: "How do you handle this today?", required: true, placeholder: "e.g. We record sales in a notebook and count stock every Friday." },
      { key: "existingSoftware", type: "text", maxLength: 200, label: "Software you already use (optional)", placeholder: "e.g. Excel, QuickBooks, none" },
    ],
  },
  {
    key: "smart-business-cards",
    slug: "smart-business-cards",
    name: "Elite Digital Identity",
    icon: "card",
    headline: "One card. Your entire digital business identity.",
    description:
      "Customisable business cards that open your digital profile: contact details, links, portfolio and catalogue, saved to a phone in one tap or scan.",
    summary: "QR or NFC business cards that open a digital profile people can save.",
    availability:
      "Made to order and quoted per order. Choose QR, NFC or both: NFC needs NFC-enabled card stock, so card type, quantity and design are confirmed before production.",
    benefits: [
      "Share everything about your business from one card",
      "Update your details online without reprinting",
      "People save your contact to their phone in one step",
      "Consistent cards for your whole team",
    ],
    highlights: ["QR, NFC or both", "Digital profile you can update", "Single cards or whole teams"],
    deliverables: [
      {
        title: "Your digital profile can include",
        items: [
          "Full name, business name and professional title",
          "Phone number and WhatsApp contact",
          "Email address and website",
          "Social media profiles",
          "Business address",
          "Portfolio or product catalogue",
          "Save-contact button",
        ],
      },
      { title: "Card options", items: ["QR-code cards", "NFC-enabled cards", "QR + NFC combined", "Individual or team orders", "Custom design or your brand design"] },
    ],
    cta: "Request a card quote",
    costNotes: [
      "Card manufacturing, personalisation and delivery are part of each quotation; prices depend on card type, quantity and finish.",
      "NFC cards require NFC-enabled card stock. Tapping works on NFC-capable phones; QR works on any phone camera.",
    ],
    fields: [
      { key: "cardType", type: "select", label: "Card type", required: true, options: opts("QR-code card", "NFC card", "QR + NFC") },
      { key: "quantity", type: "number", min: 1, max: 10000, label: "Quantity", required: true, placeholder: "e.g. 50" },
      { key: "design", type: "select", label: "Design style", options: opts("Minimal", "Bold", "Classic / premium", "Use my brand design") },
      { key: "profile", type: "select", label: "Do you need a custom digital profile?", required: true, options: opts("Yes", "No, link to my existing website") },
      { key: "team", type: "select", label: "Who are the cards for?", options: opts("Just me", "My team (multiple employees)") },
      { key: "personalisation", type: "textarea", maxLength: 1000, label: "Personalisation details (optional)", placeholder: "Names and titles on each card, special finishes…" },
      { key: "previewName", type: "text", maxLength: 80, label: "Name for the preview (optional)" },
      { key: "previewTitle", type: "text", maxLength: 80, label: "Title for the preview (optional)" },
    ],
  },
  {
    key: "ai-business-assistant",
    slug: "ai-business-assistant",
    name: "Elite AI Business Assistant",
    icon: "sparkles",
    headline: "Your business deserves smarter tools.",
    description:
      "AI-powered tools designed to help businesses handle repetitive tasks, organise information, prepare business documents and serve customers more efficiently.",
    summary: "An AI assistant set up for your business: drafting, answering FAQs and organising enquiries.",
    availability:
      "A custom setup, not an off-the-shelf product. The AI provider and capabilities are chosen for your use case, and the provider's usage charges are billed separately.",
    benefits: [
      "Draft emails, quotations and product descriptions in seconds",
      "Answer common customer questions consistently, day and night",
      "Summarise documents and organise incoming enquiries",
      "Answers drawn from your own approved business information",
    ],
    highlights: ["Drafting & customer replies", "Trained on your approved documents", "Connected to your workflow where supported"],
    deliverables: [
      {
        title: "Example use cases",
        items: [
          "Drafting business emails",
          "Generating product descriptions",
          "Preparing quotations and invoice drafts",
          "Responding to frequently asked questions",
          "Organising customer enquiries",
          "Summarising business documents",
          "Assisting with customer support",
          "Producing marketing content",
          "Retrieving information from approved business documents",
        ],
      },
      {
        title: "Customisation & integration",
        items: [
          "Your tone of voice and business rules",
          "Which documents and information it may use",
          "Where it lives: website chat, internal tool or WhatsApp, where supported",
          "Human review before anything is sent, if you prefer",
        ],
      },
      {
        title: "Setup requirements",
        items: [
          "Your approved business information (FAQs, price lists, policies)",
          "An account with the chosen AI provider",
          "Agreement on usage limits and who can access it",
        ],
      },
    ],
    cta: "Request a demonstration",
    costNotes: [
      "AI providers charge per use. Usage costs depend on how much the assistant is used and are agreed up front, with limits in place; there's no 'unlimited' usage.",
      "Integrations with other services (WhatsApp Business, email, document storage) may need their own accounts or subscriptions.",
    ],
    fields: [
      {
        key: "useCases",
        type: "multi",
        weight: "module",
        label: "What should it help with?",
        required: true,
        options: opts("Customer FAQs", "Drafting emails", "Quotations & invoices", "Product descriptions", "Organising enquiries", "Summarising documents", "Marketing content", "Something else"),
      },
      {
        key: "integrations",
        type: "multi",
        weight: "integration",
        label: "Where should it work?",
        options: opts("Website chat", "WhatsApp", "Email", "Internal tool for staff", "Existing software", "Not sure yet"),
      },
      { key: "intendedUse", type: "textarea", maxLength: 1500, label: "Describe the main task you want help with", required: true },
    ],
  },
  {
    key: "school-management",
    slug: "school-management",
    name: "School Management Solutions",
    icon: "school",
    headline: "Bring your school's everyday operations into one digital platform.",
    description:
      "We develop school-specific digital platforms to help educational institutions manage academic records, communication, attendance and everyday administrative processes.",
    summary: "Records, attendance, results and parent communication in one secure platform.",
    availability:
      "Custom development, module by module. Schools choose only the modules they need; each is built and configured for the school rather than deployed off the shelf.",
    benefits: [
      "Results and report cards prepared in a fraction of the time",
      "Parents receive announcements and progress updates directly",
      "Teachers and administrators each get their own dashboard",
      "Student information kept private, with role-based access",
    ],
    highlights: ["Results & report cards", "Attendance & timetables", "Parent communication"],
    deliverables: [
      {
        title: "Available modules",
        items: [
          "Student and teacher profiles (with photographs)",
          "Attendance tracking",
          "Results management and report cards",
          "Homework management",
          "Timetables and school calendar",
          "Announcements and parent notifications",
          "Teacher and administrative dashboards",
          "Student progress reports",
          "Role-based access",
          "School-specific branding",
        ],
      },
      {
        title: "How student data is protected",
        items: [
          "Sign-in for every user, with access limited by role",
          "Permission checks on the server for every request",
          "No student records on public pages or open APIs",
          "Changes recorded, so you can see who changed what",
        ],
      },
    ],
    cta: "Book a consultation",
    process: [
      "Requirements consultation",
      "Solution planning",
      "Interface design",
      "Development and configuration",
      "Testing and data preparation",
      "Staff onboarding",
      "Deployment and agreed support",
    ],
    costNotes: [
      "Hosting, data migration, maintenance, backups and additional modules are scoped separately.",
      "Bulk SMS or email notifications to parents may carry provider charges.",
    ],
    related: [{ slug: "prudential-international-school", note: "A school website built around admissions (website, not a management system)." }],
    fields: [
      { key: "schoolType", type: "select", label: "School type", required: true, options: opts("Nursery / primary", "Secondary", "Nursery to secondary", "Tertiary / training", "Other") },
      { key: "students", type: "number", min: 1, max: 100000, label: "Approximate number of students", required: true },
      { key: "staff", type: "number", min: 0, max: 10000, label: "Number of staff (optional)" },
      {
        key: "modules",
        type: "multi",
        weight: "module",
        label: "Modules you need",
        required: true,
        options: opts(
          "Student & teacher profiles",
          "Attendance",
          "Results & report cards",
          "Homework",
          "Timetables & calendar",
          "Announcements",
          "Parent notifications",
          "Teacher dashboards",
          "Admin dashboards",
          "Progress reports"
        ),
      },
      { key: "existingSoftware", type: "text", maxLength: 200, label: "Software you already use (optional)" },
      { key: "challenges", type: "textarea", maxLength: 1500, label: "Main administrative challenges", required: true },
    ],
  },
  {
    key: "ecommerce",
    slug: "ecommerce",
    name: "Elite E-Commerce Solutions",
    icon: "store",
    headline: "Turn your products into an online shopping experience.",
    description:
      "We build online stores that help businesses display products, accept orders, manage sales and give customers a convenient way to shop.",
    summary: "From a product catalogue to a full store with checkout, payments and order management.",
    availability:
      "Built in three levels: a product catalogue website, a WhatsApp ordering website, or a full store with checkout and order management. Each level is quoted on its own.",
    benefits: [
      "Customers browse and order any time, from any phone",
      "Payments and orders tracked in one place",
      "Stock updates as you sell",
      "Order notifications so nothing is missed",
    ],
    highlights: ["Catalogue, WhatsApp ordering or full checkout", "Payments, orders & inventory", "Optional labels & packaging design"],
    deliverables: [
      {
        title: "Three levels",
        items: [
          "Catalogue website: products, categories, images and search",
          "WhatsApp ordering: customers build an order and send it to you on WhatsApp",
          "Full store: cart, checkout, payment gateway, order management and inventory",
        ],
      },
      {
        title: "Possible features",
        items: [
          "Product variants such as size and colour",
          "Search and filtering",
          "Customer accounts, where needed",
          "Shipping and delivery configuration",
          "Order notifications",
          "Sales dashboards",
          "Mobile-responsive design and basic SEO",
        ],
      },
      { title: "Optional physical add-ons", items: ["Product label designs", "Packaging designs", "QR-code cards", "Printed business cards", "Product catalogue design"] },
    ],
    cta: "Discuss your store",
    industries: [
      { name: "Fashion", examples: ["Sizes and colours", "Lookbook-style catalogue"] },
      { name: "Electronics", examples: ["Specifications per product", "Warranty information"] },
      { name: "Beauty & skincare", examples: ["Ingredients and usage", "Bundles"] },
      { name: "Food businesses", examples: ["Menus and delivery areas", "Order-ahead"] },
      { name: "Home & lifestyle", examples: ["Collections", "Gift options"] },
      { name: "General retail", examples: ["Large catalogues with filters", "Stock tracking"] },
    ],
    costNotes: [
      "Payment gateways (e.g. Paystack, Flutterwave) charge their own transaction fees.",
      "Hosting, domain and delivery services are separate costs; printing for physical add-ons is quoted separately.",
    ],
    related: [
      { slug: "pickbykay", note: "Storefront with inventory, cart, checkout and online payments." },
      { slug: "nzechukwus-books", note: "Catalogue with WhatsApp ordering and Selar checkout." },
      { slug: "chimdys-collection", note: "Online presence for a jewellery brand." },
    ],
    fields: [
      { key: "storeType", type: "select", label: "Which level do you need?", required: true, options: opts("Product catalogue website", "WhatsApp ordering website", "Full store with checkout", "Not sure, advise me") },
      { key: "industry", type: "select", label: "What do you sell?", options: opts("Fashion", "Electronics", "Beauty & skincare", "Food", "Home & lifestyle", "General retail", "Other") },
      { key: "productCount", type: "select", label: "Estimated number of products", required: true, options: opts("Under 50", "50–200", "200–1,000", "Over 1,000") },
      { key: "payments", type: "multi", weight: "integration", label: "Preferred payment methods", options: opts("Paystack", "Flutterwave", "Bank transfer", "Pay on delivery", "Not sure yet") },
      { key: "features", type: "multi", weight: "module", label: "Features you need", options: opts("Product variants", "Customer accounts", "Inventory tracking", "Order notifications", "Sales dashboard", "Delivery fees by area") },
      { key: "addOns", type: "multi", weight: "physical", label: "Optional physical add-ons", options: opts("Product labels", "Packaging design", "QR-code cards", "Business cards", "Catalogue design") },
      { key: "delivery", type: "textarea", maxLength: 1000, label: "Delivery requirements (optional)", placeholder: "Where you deliver, pickup options, delivery partners…" },
    ],
  },
];

export function getSolution(slug: string): Solution | undefined {
  return SOLUTIONS.find((s) => s.slug === slug);
}

export function getSolutionByKey(key: string): Solution | undefined {
  return SOLUTIONS.find((s) => s.key === key);
}

export const BUDGET_OPTIONS = opts("Under ₦300,000", "₦300,000 – ₦750,000", "₦750,000 – ₦2,000,000", "Above ₦2,000,000", "Not sure yet");
export const TIMELINE_OPTIONS = opts("As soon as possible", "Within 1 month", "1–3 months", "3+ months", "Flexible");

/// Shared delivery process for every offering.
export const PROCESS = [
  { title: "Tell me about your business", text: "Send the enquiry form or message me. I'll ask what you need and how you work today." },
  { title: "Receive a tailored recommendation", text: "You get a recommendation that fits your goals and budget, not a one-size package." },
  { title: "Approve the scope and quotation", text: "A written scope and quotation, so you know exactly what's included before work starts." },
  { title: "Development and implementation", text: "I build and configure it, with progress updates along the way." },
  { title: "Review, testing and revisions", text: "You test it, I fix and refine, and we check it works on real devices." },
  { title: "Deployment, handover and support", text: "It goes live, you're shown how to use it, and agreed support follows." },
];

export const WHY = [
  { title: "Built around your requirements", text: "Every solution starts from how your business actually works." },
  { title: "Responsive and accessible", text: "Works on phones, tablets and desktops, and for people using assistive technology." },
  { title: "Clear communication", text: "You deal with me directly: no account managers, no surprises." },
  { title: "Sensible security", text: "Server-side checks, private data kept private, and access by role." },
  { title: "Maintainable code", text: "Clean, documented work any developer can pick up later." },
  { title: "Structured delivery and agreed support", text: "A written scope, staged delivery and support after launch." },
];

export const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  CONSULTATION: "Consultation scheduled",
  QUOTATION_SENT: "Quotation sent",
  NEGOTIATION: "Negotiation",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  COMPLETED: "Completed",
};
export const LEAD_STATUSES = Object.keys(STATUS_LABELS) as [string, ...string[]];
