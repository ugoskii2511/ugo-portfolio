import { z } from "zod";
import { EXPENSE_CATEGORIES, isValidDay, MAINTENANCE_INTERVALS, PAYMENT_METHODS, PROJECT_STATUSES } from "@/lib/business-calc";
import { parseNairaToKobo } from "@/lib/money";

/// Request validation for the business API. Amounts arrive as the text the
/// admin typed ("15,000.50") and are parsed to exact kobo here.

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

const amount = (label: string) =>
  z.union([z.string(), z.number()]).transform((v, ctx) => {
    const kobo = parseNairaToKobo(v);
    if (kobo === null) {
      ctx.addIssue({ code: "custom", message: `${label}: enter an amount like 15000 or 15,000.50` });
      return z.NEVER;
    }
    return kobo;
  });

const positiveAmount = (label: string) =>
  amount(label).refine((k) => k > 0, `${label} must be more than ₦0`);

const optionalAmount = (label: string) =>
  z
    .union([z.string(), z.number()])
    .nullish()
    .transform((v, ctx) => {
      if (v === null || v === undefined || String(v).trim() === "") return null;
      const kobo = parseNairaToKobo(v);
      if (kobo === null) {
        ctx.addIssue({ code: "custom", message: `${label}: enter an amount like 15000 or 15,000.50` });
        return z.NEVER;
      }
      return kobo;
    });

const day = (label: string) => z.string().refine((v) => isValidDay(v), `${label}: pick a valid date`);
const optionalDay = (label: string) =>
  z
    .string()
    .nullish()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || isValidDay(v), `${label}: pick a valid date`);

const phone = optionalText(40).refine((v) => v === null || /^[+\d][\d\s()-]{5,}$/.test(v), "Enter a valid phone number");
const email = optionalText(200).refine((v) => v === null || z.string().email().safeParse(v).success, "Enter a valid email address");

export const clientFields = z.object({
  name: z.string().trim().min(1, "Enter the client's name").max(200),
  businessName: optionalText(200),
  phone,
  email,
  whatsapp: phone,
  notes: optionalText(5000),
});

export const projectFields = z
  .object({
    title: z.string().trim().min(1, "Give the project a name").max(200),
    serviceType: optionalText(120),
    description: optionalText(5000),
    price: optionalAmount("Agreed price"),
    additionalCharges: optionalAmount("Additional charges"),
    discount: optionalAmount("Discount"),
    referenceNumber: optionalText(60),
    status: z.enum(PROJECT_STATUSES),
    startDate: optionalDay("Start date"),
    expectedDeliveryDate: optionalDay("Expected delivery"),
    completedDate: optionalDay("Completion date"),
    maintenanceFee: optionalAmount("Hosting / maintenance fee"),
    maintenanceInterval: z
      .enum(Object.keys(MAINTENANCE_INTERVALS) as [keyof typeof MAINTENANCE_INTERVALS, ...(keyof typeof MAINTENANCE_INTERVALS)[]])
      .nullish()
      .transform((v) => v ?? null),
    nextPaymentDate: optionalDay("Next payment date"),
  })
  .refine((p) => !p.startDate || !p.expectedDeliveryDate || p.expectedDeliveryDate >= p.startDate, {
    message: "Expected delivery can't be before the start date",
    path: ["expectedDeliveryDate"],
  })
  .refine((p) => p.price !== null || (p.additionalCharges === null && p.discount === null), {
    message: "Enter the agreed price before adding charges or a discount",
    path: ["price"],
  })
  .refine((p) => p.discount === null || p.price === null || p.discount <= p.price + (p.additionalCharges ?? 0), {
    message: "The discount can't be more than the price plus charges",
    path: ["discount"],
  });

/// A new client, optionally with their first project.
export const createClientSchema = clientFields.extend({ project: projectFields.nullish() });

const methods = Object.keys(PAYMENT_METHODS) as [string, ...string[]];

export const paymentFields = z.object({
  projectId: z.string().min(1, "Choose the project this payment is for"),
  kind: z.enum(["PROJECT", "MAINTENANCE"]).default("PROJECT"),
  amount: positiveAmount("Amount"),
  paidOn: day("Payment date"),
  method: z.enum(methods),
  reference: optionalText(300),
  description: optionalText(120),
  notes: optionalText(2000),
});

export const createPaymentSchema = paymentFields.extend({
  clientRequestId: z.string().uuid().optional(),
  /// Set after the admin confirms a possible duplicate.
  confirmDuplicate: z.boolean().optional(),
});

const categories = Object.keys(EXPENSE_CATEGORIES) as [string, ...string[]];

export const expenseFields = z.object({
  name: z.string().trim().min(1, "Name the expense").max(200),
  amount: positiveAmount("Amount"),
  category: z.enum(categories),
  spentOn: day("Date"),
  notes: optionalText(2000),
  method: z
    .enum(methods)
    .nullish()
    .transform((v) => v ?? null),
  projectId: optionalText(40),
  clientId: optionalText(40),
});

export const createExpenseSchema = z.union([
  expenseFields.extend({ clientRequestId: z.string().uuid().optional() }),
  /// From the calculator: several lines saved at once (as separate records).
  z.object({
    items: z.array(expenseFields).min(1).max(50),
    clientRequestId: z.string().uuid().optional(),
  }),
]);

// ---------------------------------------------------------------- receipts

/// One "Generate receipt" submission: either a receipt for a payment that's
/// already recorded, or a new payment (for an existing or new client and
/// project) plus its receipt, saved together.
export const createReceiptSchema = z
  .object({
    clientRequestId: z.string().uuid(),
    preview: z.boolean().optional(),
    confirmDuplicate: z.boolean().optional(),
    issueDate: day("Issue date"),
    paymentId: z.string().min(1).max(40).optional(),
    clientId: z.string().min(1).max(40).optional(),
    newClient: clientFields.optional(),
    projectId: z.string().min(1).max(40).optional(),
    newProject: projectFields.optional(),
    payment: paymentFields.omit({ projectId: true }).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.paymentId) return;
    if (!v.clientId === !v.newClient) ctx.addIssue({ code: "custom", message: "Choose a client or enter a new one", path: ["clientId"] });
    if (!v.projectId === !v.newProject) ctx.addIssue({ code: "custom", message: "Choose a project or enter a new one", path: ["projectId"] });
    if (!v.payment) ctx.addIssue({ code: "custom", message: "Enter the payment details", path: ["payment"] });
    else if (v.issueDate < v.payment.paidOn) ctx.addIssue({ code: "custom", message: "The issue date can't be before the payment date", path: ["issueDate"] });
  });

export const voidReceiptSchema = z.object({
  action: z.literal("void"),
  reason: z.string().trim().min(3, "Give a short reason for voiding it").max(500),
});
export const reissueReceiptSchema = z.object({
  action: z.literal("reissue"),
  issueDate: day("Issue date").optional(),
  reason: z.string().trim().max(500).optional(),
});

const shortText = (max: number) => optionalText(max);
export const receiptSettingsSchema = z.object({
  businessName: shortText(200),
  logoUrl: shortText(500).refine((v) => v === null || /^\/[\w./-]+$/.test(v) || /^https:\/\/[^\s]+$/.test(v), "Use a site path like /logo.jpg or an https:// image link"),
  email,
  phone: shortText(60),
  website: shortText(200),
  address: shortText(500),
  currency: z.string().trim().regex(/^[A-Z]{3}$/, "Use a 3-letter currency code like NGN").default("NGN"),
  currencySymbol: z.string().trim().min(1).max(4).default("₦"),
  numberPrefix: z.string().trim().regex(/^[A-Za-z0-9]{1,8}$/, "Use 1–8 letters or digits, e.g. RCT").transform((v) => v.toUpperCase()).default("RCT"),
  authorizedName: shortText(120),
  authorizedTitle: shortText(120),
  acknowledgement: shortText(1000),
  footerNote: shortText(300),
});
