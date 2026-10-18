/// Estimated pricing shown on the public site (/work, case studies, /pricing).
/// Everything here is a preliminary ESTIMATE, never a quotation; the
/// disclaimer below is shown wherever a price appears. Amounts are whole
/// naira. The defaults can be changed on Admin → Pricing (stored in
/// SiteSettings.pricingConfig) but every development estimate must stay at
/// or above PRICE_FLOOR, which the server enforces.

export const PRICE_FLOOR = 150_000;

export type PackageKey =
  | "business"
  | "portfolio"
  | "school"
  | "restaurant"
  | "landing"
  | "ecommerce"
  | "blog"
  | "booking"
  | "admin_dashboard"
  | "webapp"
  | "marketplace";

export type PricePackage = {
  label: string;
  min: number;
  /// null = open-ended ("From ₦400,000, depending on scope").
  max: number | null;
  /// Larger builds: hosting and running costs are likely to be higher.
  complex?: boolean;
};

export type Range = { min: number; max: number };

export type PricingConfig = {
  packages: Record<PackageKey, PricePackage>;
  domain: Range; // per year
  hosting: Range; // per year, typical small business site
  maintenanceFrom: number; // per month, basic plan
};

export const PACKAGE_ORDER: PackageKey[] = [
  "business",
  "portfolio",
  "landing",
  "school",
  "restaurant",
  "blog",
  "ecommerce",
  "booking",
  "admin_dashboard",
  "webapp",
  "marketplace",
];

export const DEFAULT_PRICING: PricingConfig = {
  packages: {
    business: { label: "Professional business website", min: 150_000, max: 250_000 },
    portfolio: { label: "Personal portfolio website", min: 150_000, max: 220_000 },
    school: { label: "School website", min: 200_000, max: 350_000 },
    restaurant: { label: "Restaurant or hospitality website", min: 180_000, max: 300_000 },
    landing: { label: "Landing page for a business or campaign", min: 150_000, max: 200_000 },
    ecommerce: { label: "E-commerce website", min: 250_000, max: 500_000 },
    blog: { label: "Blog or publishing platform", min: 180_000, max: 300_000 },
    booking: { label: "Booking or appointment website", min: 250_000, max: 450_000 },
    admin_dashboard: { label: "Website with an admin dashboard", min: 250_000, max: 500_000 },
    webapp: { label: "Custom web application or SaaS platform", min: 400_000, max: null, complex: true },
    marketplace: { label: "Marketplace platform", min: 500_000, max: null, complex: true },
  },
  domain: { min: 15_000, max: 35_000 },
  hosting: { min: 30_000, max: 120_000 },
  maintenanceFrom: 15_000,
};

export const DEFAULT_DISCLAIMER =
  "All prices displayed on this website are estimates intended to help you understand the approximate cost of a project. They are not fixed quotations or binding offers. The final price will depend on the project’s requirements, complexity, features, integrations, timeline, and other agreed deliverables. Final pricing will be determined after a direct discussion between the developer and the client, during which the scope of work will be reviewed and an appropriate quotation provided. Hosting, domain registration, maintenance, and third-party service fees may be charged separately where applicable. No project will be considered agreed upon until the final scope, price, and terms have been confirmed by both parties.";

export const OTHER_COSTS = [
  "Premium themes, fonts, plugins or templates",
  "Paid APIs and AI services",
  "Email hosting and business email accounts",
  "Payment gateway charges",
  "SMS and OTP services",
  "Cloud storage and file processing",
  "Additional integrations",
  "Content creation and professional photography",
  "Third-party subscriptions",
];

export function formatNaira(amount: number): string {
  return `₦${Math.round(amount).toLocaleString("en-NG")}`;
}

/// "₦150,000–₦250,000" or "From ₦400,000".
export function formatRange(min: number, max: number | null): string {
  return max === null ? `From ${formatNaira(min)}` : min === max ? formatNaira(min) : `${formatNaira(min)}–${formatNaira(max)}`;
}

/// Compact form for cards: "₦150k–₦250k", "From ₦400k".
export function formatRangeShort(min: number, max: number | null): string {
  const k = (n: number) => (n >= 1_000_000 ? `₦${+(n / 1_000_000).toFixed(2)}m` : `₦${Math.round(n / 1000)}k`);
  return max === null ? `From ${k(min)}` : `${k(min)}–${k(max)}`;
}

export function isPackageKey(value: unknown): value is PackageKey {
  return typeof value === "string" && (PACKAGE_ORDER as string[]).includes(value);
}

export type Estimate = {
  packageKey: PackageKey | null;
  label: string;
  min: number;
  max: number | null;
  complex: boolean;
  /// True when the admin set a custom range for this project.
  custom: boolean;
};

/// The development estimate for a project: its custom range if set (never
/// below the floor), otherwise its package. Null when neither is set.
export function projectEstimate(
  config: PricingConfig,
  project: { pricingPackage?: string | null; priceMinNaira?: number | null; priceMaxNaira?: number | null }
): Estimate | null {
  const pkg = isPackageKey(project.pricingPackage) ? config.packages[project.pricingPackage] : null;
  if (project.priceMinNaira != null) {
    const min = Math.max(PRICE_FLOOR, project.priceMinNaira);
    const max = project.priceMaxNaira != null ? Math.max(min, project.priceMaxNaira) : null;
    return {
      packageKey: isPackageKey(project.pricingPackage) ? project.pricingPackage : null,
      label: pkg?.label ?? "Comparable project",
      min,
      max,
      complex: pkg?.complex ?? max === null,
      custom: true,
    };
  }
  if (!pkg) return null;
  return {
    packageKey: project.pricingPackage as PackageKey,
    label: pkg.label,
    min: Math.max(PRICE_FLOOR, pkg.min),
    max: pkg.max === null ? null : Math.max(PRICE_FLOOR, pkg.max),
    complex: !!pkg.complex,
    custom: false,
  };
}

export type BudgetChoice = { domain: boolean; hosting: boolean; maintenance: boolean };

export type BudgetBreakdown = {
  development: { min: number; max: number | null }; // one-time
  domain: Range | null; // per year
  hosting: Range | null; // per year
  /// Domain + hosting for the first year (recurring every year).
  operatingFirstYear: Range;
  /// Development + first-year operating costs. max null if development is open-ended.
  firstYearTotal: { min: number; max: number | null };
  /// Optional: basic maintenance for 12 months. Never included in firstYearTotal.
  maintenanceYear: { min: number; max: null } | null;
  /// firstYearTotal plus optional maintenance, shown separately and labelled optional.
  firstYearWithMaintenance: { min: number; max: number | null } | null;
};

/// First-year budget for a development estimate. Development is one-time;
/// domain and hosting recur yearly; maintenance is optional and kept out of
/// the main total (it's only added in the separately labelled figure).
export function firstYearBudget(config: Pick<PricingConfig, "domain" | "hosting" | "maintenanceFrom">, dev: { min: number; max: number | null }, choice: BudgetChoice): BudgetBreakdown {
  const domain = choice.domain ? config.domain : null;
  const hosting = choice.hosting ? config.hosting : null;
  const operatingFirstYear = {
    min: (domain?.min ?? 0) + (hosting?.min ?? 0),
    max: (domain?.max ?? 0) + (hosting?.max ?? 0),
  };
  const firstYearTotal = {
    min: dev.min + operatingFirstYear.min,
    max: dev.max === null ? null : dev.max + operatingFirstYear.max,
  };
  const maintenanceYear = choice.maintenance ? { min: config.maintenanceFrom * 12, max: null } : null;
  return {
    development: dev,
    domain,
    hosting,
    operatingFirstYear,
    firstYearTotal,
    maintenanceYear,
    // Maintenance is "from" (open-ended), so the combined figure is a lower bound.
    firstYearWithMaintenance: maintenanceYear ? { min: firstYearTotal.min + maintenanceYear.min, max: null } : null,
  };
}

/// Check an admin-submitted config. Returns problems in plain English.
export function validatePricingConfig(config: PricingConfig): string[] {
  const problems: string[] = [];
  for (const key of PACKAGE_ORDER) {
    const p = config.packages[key];
    if (!p) {
      problems.push(`Missing package: ${key}`);
      continue;
    }
    if (!Number.isInteger(p.min) || p.min < PRICE_FLOOR) problems.push(`${p.label}: the starting price can't be below ${formatNaira(PRICE_FLOOR)}.`);
    if (p.max !== null && (!Number.isInteger(p.max) || p.max < p.min)) problems.push(`${p.label}: the top of the range must be at least the starting price.`);
    if (!p.label.trim()) problems.push(`Package ${key} needs a name.`);
  }
  for (const [name, r] of [["Domain", config.domain], ["Hosting", config.hosting]] as const) {
    if (!Number.isInteger(r.min) || !Number.isInteger(r.max) || r.min < 0 || r.max < r.min) problems.push(`${name}: enter a yearly range from low to high.`);
  }
  if (!Number.isInteger(config.maintenanceFrom) || config.maintenanceFrom < 0) problems.push("Maintenance: enter a monthly starting price.");
  return problems;
}

/// Stored config merged over the defaults (unknown keys ignored).
export function mergePricing(stored: unknown): PricingConfig {
  const base: PricingConfig = structuredClone(DEFAULT_PRICING);
  if (!stored || typeof stored !== "object") return base;
  const s = stored as Partial<PricingConfig>;
  for (const key of PACKAGE_ORDER) {
    const p = s.packages?.[key];
    if (p && typeof p.min === "number") base.packages[key] = { ...base.packages[key], ...p, complex: base.packages[key].complex };
  }
  if (s.domain && typeof s.domain.min === "number") base.domain = s.domain;
  if (s.hosting && typeof s.hosting.min === "number") base.hosting = s.hosting;
  if (typeof s.maintenanceFrom === "number") base.maintenanceFrom = s.maintenanceFrom;
  return base;
}

/// Short group names for the /work filter.
export const PACKAGE_GROUP: Record<PackageKey, string> = {
  business: "Business websites",
  portfolio: "Portfolios",
  landing: "Landing pages",
  school: "Schools",
  restaurant: "Restaurants",
  blog: "Blogs",
  ecommerce: "E-commerce",
  booking: "Booking",
  admin_dashboard: "With admin dashboards",
  webapp: "Web apps",
  marketplace: "Marketplaces",
};
