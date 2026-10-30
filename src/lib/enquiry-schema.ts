import { z } from "zod";
import { BUDGET_OPTIONS, getSolutionByKey, SOLUTIONS, TIMELINE_OPTIONS, type SolutionField } from "@/lib/solutions";
import { COMPLEXITY } from "@/lib/solution-pricing";

/// Server-side validation for Business Solutions enquiries. The service's
/// own questions are validated against its definition in solutions.ts, so
/// only known fields with allowed values are ever stored.

const text = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) => text(max).optional().transform((v) => (v ? v : undefined));
const values = (options: { value: string }[]) => options.map((o) => o.value) as [string, ...string[]];

export const enquiryBaseSchema = z.object({
  service: z.enum(SOLUTIONS.map((s) => s.key) as [string, ...string[]]),
  fullName: text(100).min(2, "Enter your full name"),
  businessName: optionalText(150),
  email: text(200).email("Enter a valid email address"),
  phone: text(40).regex(/^[+\d][\d\s()-]{6,}$/, "Enter a valid phone or WhatsApp number"),
  description: text(3000).min(10, "Tell me a little more about the project"),
  budget: z.enum(values(BUDGET_OPTIONS), { message: "Choose a budget range" }),
  timeline: z.enum(values(TIMELINE_OPTIONS), { message: "Choose a timeline" }),
  additional: optionalText(2000),
  complexity: z.enum(Object.keys(COMPLEXITY) as [string, ...string[]]).default("standard"),
  answers: z.record(z.string(), z.unknown()).default({}),
  /// Honeypot: hidden from people, filled in by bots.
  website: z.string().max(200).optional(),
});

function fieldSchema(field: SolutionField): z.ZodTypeAny {
  switch (field.type) {
    case "multi": {
      const arr = z.array(z.enum(values(field.options))).max(field.options.length);
      return field.required ? arr.min(1, `${field.label}: choose at least one`) : arr.default([]);
    }
    case "select": {
      const e = z.enum(values(field.options), { message: `${field.label}: choose an option` });
      return field.required ? e : e.optional();
    }
    case "number": {
      const n = z.coerce.number().int(`${field.label}: whole numbers only`).min(field.min, `${field.label}: at least ${field.min}`).max(field.max, `${field.label}: at most ${field.max}`);
      return field.required
        ? n
        : z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : v), n.optional());
    }
    default: {
      const s = text(field.maxLength);
      return field.required ? s.min(2, `${field.label}: please fill this in`) : s.optional().transform((v) => (v ? v : undefined));
    }
  }
}

/// Validates a full submission: common fields, then the chosen service's
/// questions. Unknown answer keys are dropped.
export function parseEnquiry(input: unknown) {
  const base = enquiryBaseSchema.parse(input);
  const solution = getSolutionByKey(base.service)!;
  const shape = Object.fromEntries(solution.fields.map((f) => [f.key, fieldSchema(f)]));
  const answers = z.object(shape).strip().parse(base.answers) as Record<string, string | string[] | number | undefined>;
  return { ...base, answers, solution };
}

export type ParsedEnquiry = ReturnType<typeof parseEnquiry>;

/// "a, b" labels for stored answers, for the admin view and notifications.
export function describeAnswers(serviceKey: string, answers: Record<string, unknown>): { label: string; value: string }[] {
  const solution = getSolutionByKey(serviceKey);
  if (!solution) return [];
  const out: { label: string; value: string }[] = [];
  for (const field of solution.fields) {
    const v = answers[field.key];
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) continue;
    if (field.type === "multi" || field.type === "select") {
      const list = (Array.isArray(v) ? v : [v]).map((x) => field.options.find((o) => o.value === x)?.label ?? String(x));
      out.push({ label: field.label, value: list.join(", ") });
    } else {
      out.push({ label: field.label, value: String(v) });
    }
  }
  return out;
}

export function optionLabel(options: { value: string; label: string }[], value: string) {
  return options.find((o) => o.value === value)?.label ?? value;
}
