/// Pure business rules for the client/finance records. No database access
/// here, so every rule is unit-tested (tests/business.test.ts) and the pages
/// and reports all use the same definitions.

export const PROJECT_STATUSES = ["INQUIRY", "QUOTED", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "CANCELLED"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  INQUIRY: "Inquiry",
  QUOTED: "Quoted",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  ON_HOLD: "On hold",
  CANCELLED: "Cancelled",
};

export const PAYMENT_STATUSES = ["UNPAID", "PARTIAL", "PAID"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  UNPAID: "Unpaid",
  PARTIAL: "Partially paid",
  PAID: "Fully paid",
};

export const PAYMENT_METHODS = {
  bank_transfer: "Bank transfer",
  cash: "Cash",
  card: "Card",
  pos: "POS",
  mobile_money: "Mobile money",
  other: "Other",
} as const;
export type PaymentMethod = keyof typeof PAYMENT_METHODS;

export const EXPENSE_CATEGORIES = {
  hosting_domains: "Hosting & domains",
  software: "Software subscriptions",
  api_ai: "API usage & AI tools",
  marketing: "Advertising & marketing",
  internet_data: "Internet & data",
  transport: "Transportation",
  contractors: "Contractors & freelancers",
  equipment: "Equipment",
  bank_charges: "Bank charges",
  other: "Other expenses",
} as const;
export type ExpenseCategory = keyof typeof EXPENSE_CATEGORIES;

export const MAINTENANCE_INTERVALS = { monthly: "Monthly", quarterly: "Quarterly", yearly: "Yearly", "one-off": "One-off" } as const;

/// Projects that represent real, live work. Cancelled ones are kept for
/// history but never count toward value, outstanding or active totals.
export function countsTowardTotals(status: ProjectStatus): boolean {
  return status !== "CANCELLED";
}

/// Derived from the payment records, never typed in.
export function paymentStatus(priceKobo: number | null, paidKobo: number): PaymentStatus {
  if (paidKobo <= 0) return "UNPAID";
  if (priceKobo !== null && priceKobo > 0 && paidKobo >= priceKobo) return "PAID";
  if (priceKobo === 0) return "PAID";
  return "PARTIAL";
}

/// What's still owed. Never negative; overpayment is reported as credit.
export function outstandingKobo(priceKobo: number | null, paidKobo: number, status: ProjectStatus): number {
  if (!countsTowardTotals(status) || priceKobo === null) return 0;
  return Math.max(priceKobo - paidKobo, 0);
}

export function creditKobo(priceKobo: number | null, paidKobo: number): number {
  if (priceKobo === null) return 0;
  return Math.max(paidKobo - priceKobo, 0);
}

export type ProjectFigures = {
  priceKobo: number | null;
  /// Payments toward the agreed price.
  paidKobo: number;
  /// Hosting / maintenance payments on this project.
  maintenanceKobo: number;
  directExpensesKobo: number;
  status: ProjectStatus;
};

export type ProjectFinancials = {
  outstandingKobo: number;
  creditKobo: number;
  paymentStatus: PaymentStatus;
  /// Agreed price − direct expenses (an estimate: unpaid money isn't cash).
  estimatedProfitKobo: number | null;
  /// All money received on the project − direct expenses (actual cash).
  cashAfterExpensesKobo: number;
};

export function projectFinancials(p: ProjectFigures): ProjectFinancials {
  return {
    outstandingKobo: outstandingKobo(p.priceKobo, p.paidKobo, p.status),
    creditKobo: creditKobo(p.priceKobo, p.paidKobo),
    paymentStatus: paymentStatus(p.priceKobo, p.paidKobo),
    estimatedProfitKobo: p.priceKobo === null ? null : p.priceKobo - p.directExpensesKobo,
    cashAfterExpensesKobo: p.paidKobo + p.maintenanceKobo - p.directExpensesKobo,
  };
}

// ---------------------------------------------------------------- date ranges
// All business dates are calendar days in Lagos (UTC+1, no DST), stored in
// DATE columns. Ranges are inclusive YYYY-MM-DD pairs.

export const BUSINESS_TZ = "Africa/Lagos";
export const RANGE_PRESETS = ["today", "week", "month", "year", "all", "custom"] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];
export const RANGE_LABEL: Record<RangePreset, string> = {
  today: "Today",
  week: "This week",
  month: "This month",
  year: "This year",
  all: "All time",
  custom: "Custom",
};

export type DateRange = { preset: RangePreset; from: string | null; to: string | null; label: string };

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function lagosToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function shiftDay(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isValidDay(day: string | undefined | null): day is string {
  if (!day || !ISO_DAY.test(day)) return false;
  const d = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === day;
}

export function resolveRange(preset: string | undefined, from?: string, to?: string, now: Date = new Date()): DateRange {
  const today = lagosToday(now);
  const p = (RANGE_PRESETS as readonly string[]).includes(preset ?? "") ? (preset as RangePreset) : "month";
  switch (p) {
    case "today":
      return { preset: p, from: today, to: today, label: "Today" };
    case "week": {
      const weekday = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = Sunday
      const monday = shiftDay(today, -((weekday + 6) % 7));
      return { preset: p, from: monday, to: today, label: "This week" };
    }
    case "year":
      return { preset: p, from: `${today.slice(0, 4)}-01-01`, to: today, label: "This year" };
    case "all":
      return { preset: p, from: null, to: null, label: "All time" };
    case "custom": {
      if (isValidDay(from) && isValidDay(to)) {
        const [a, b] = from <= to ? [from, to] : [to, from];
        return { preset: p, from: a, to: b, label: `${a} → ${b}` };
      }
      return resolveRange("month", undefined, undefined, now);
    }
    default:
      return { preset: "month", from: `${today.slice(0, 7)}-01`, to: today, label: "This month" };
  }
}

export function currentMonthRange(now: Date = new Date()): DateRange {
  return resolveRange("month", undefined, undefined, now);
}

/// Prisma filter for a DATE column.
export function dateFilter(range: Pick<DateRange, "from" | "to">): { gte?: Date; lte?: Date } | undefined {
  if (!range.from && !range.to) return undefined;
  return {
    ...(range.from ? { gte: new Date(`${range.from}T00:00:00Z`) } : {}),
    ...(range.to ? { lte: new Date(`${range.to}T00:00:00Z`) } : {}),
  };
}

/// Filter for a timestamp column (e.g. createdAt), using Lagos day bounds.
export function timestampFilter(range: Pick<DateRange, "from" | "to">): { gte?: Date; lt?: Date } | undefined {
  if (!range.from && !range.to) return undefined;
  return {
    ...(range.from ? { gte: new Date(`${range.from}T00:00:00+01:00`) } : {}),
    ...(range.to ? { lt: new Date(`${shiftDay(range.to, 1)}T00:00:00+01:00`) } : {}),
  };
}

export function dayString(date: Date | null | undefined): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

/// "2026-10" style keys for the last `count` months, oldest first.
export function lastMonths(count: number, now: Date = new Date()): string[] {
  const today = lagosToday(now);
  let year = Number(today.slice(0, 4));
  let month = Number(today.slice(5, 7));
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.unshift(`${year}-${String(month).padStart(2, "0")}`);
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  return out;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
}

/// Formula-injection-safe CSV cell.
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  // Neutralise spreadsheet formulas, but leave plain numbers (e.g. a loss of -500) alone.
  if (/^[=+\-@\t\r]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
