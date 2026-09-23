/// The four things the studio builds. Positioning copy, so it lives in code;
/// the detailed, bookable service catalogue stays admin-managed in the DB.
/// `examples` are project slugs (see src/lib/projects.ts); any that don't
/// resolve to a live project are simply skipped.
export type Capability = {
  title: string;
  summary: string;
  includes: string[];
  examples: string[];
};

export const CAPABILITIES: Capability[] = [
  {
    title: "Websites",
    summary: "Fast, considered websites that make a business look as good as it actually is.",
    includes: ["Company & brand sites", "Landing pages", "Portfolio sites", "CMS-backed content", "Technical SEO & speed"],
    examples: ["prudential-international-school", "elite-flyers", "the-media-reborn"],
  },
  {
    title: "Web Applications",
    summary: "Dashboards, portals, marketplaces and management systems, built around how people really work.",
    includes: ["Dashboards & admin panels", "Customer portals", "Stores & inventory", "Booking & management systems"],
    examples: ["pickbykay", "swiftvtu"],
  },
  {
    title: "SaaS & Platforms",
    summary: "Multi-user products with accounts, wallets and subscriptions, plus the plumbing they need to grow.",
    includes: ["Accounts, roles & permissions", "Wallets & subscriptions", "Multi-tenant architecture", "Admin & analytics"],
    examples: ["swiftvtu"],
  },
  {
    title: "Digital Engineering",
    summary: "The invisible parts that make a product trustworthy: auth, data, payments, integrations and deployment.",
    includes: ["Authentication", "Databases & APIs", "Payments (Paystack, Stripe)", "Third-party integrations", "Deployment & maintenance"],
    examples: ["swiftvtu", "pickbykay"],
  },
];
