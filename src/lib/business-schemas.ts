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
