import { z } from "zod";
import { SERVICE_ICON_KEYS } from "@/lib/services-data";
import { PACKAGE_ORDER, PRICE_FLOOR, type PackageKey } from "@/lib/pricing";

// Honeypot: a field real visitors never see or fill in, but naive form
// bots often auto-fill. A non-empty value marks the submission as spam.
const honeypotField = z.string().max(200).optional();

export const bookingSchema = z.object({
  clientName: z.string().trim().min(2, "Name is too short").max(100),
  budget: z.string().trim().min(1, "Budget is required").max(100),
  projectType: z.string().trim().min(2, "Project type is required").max(150),
  details: z.string().trim().min(5, "Please add a bit more detail").max(2000),
  honeypot: honeypotField,
});
export type BookingInput = z.infer<typeof bookingSchema>;

export const reviewSubmitSchema = z.object({
  clientName: z.string().trim().min(2, "Name is too short").max(100),
  position: z.string().trim().min(1, "Position is required").max(100),
  rating: z.coerce.number().int().min(1).max(5),
  message: z.string().trim().min(5, "Please write a short review").max(1000),
  honeypot: honeypotField,
});
export type ReviewSubmitInput = z.infer<typeof reviewSubmitSchema>;

export const reviewModerationSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
});

// Note: fields below deliberately avoid `.default(...)` even though every
// current caller sends them explicitly. Zod's `.partial()` (used for PATCH
// endpoints) does not reliably preserve "key omitted" once a `.default()` is
// present on that field in this zod version — an omitted key can come back
// filled with the default and silently overwrite the existing DB value on
// update. Keep defaults for genuinely-optional fields off objects that get
// `.partial()`-ed; apply defaults explicitly at the create call site instead.

// Links rendered as href/src on the public site: http(s) only. zod's .url()
// alone also accepts javascript: and data: URLs, which would be live XSS
// vectors in an <a href>.
const httpUrl = z
  .string()
  .trim()
  .url()
  .refine((value) => /^https?:\/\//i.test(value), "Must start with http:// or https://");

export const projectSchema = z.object({
  name: z.string().trim().min(1).max(150),
  summary: z.string().trim().min(1).max(1000),
  liveUrl: z.union([httpUrl, z.literal("")]).optional(),
  techStack: z.array(z.string().trim().min(1)).max(20),
  imageUrl: z.union([httpUrl, z.literal("")]).optional(),
  featured: z.boolean(),
  order: z.coerce.number().int(),
  // Showcase fields (optional; empty values fall back to the editorial layer).
  published: z.boolean().optional(),
  category: z.string().trim().max(80).nullable().optional(),
  lead: z.string().trim().max(300).nullable().optional(),
  challenge: z.string().trim().max(2000).nullable().optional(),
  solution: z.string().trim().max(2000).nullable().optional(),
  features: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
  galleryUrls: z.array(httpUrl).max(8).optional(),
  pricingPackage: z.enum(PACKAGE_ORDER as [PackageKey, ...PackageKey[]]).nullable().optional(),
  priceMinNaira: z.coerce.number().int().min(PRICE_FLOOR, `Estimates can't go below ₦${PRICE_FLOOR.toLocaleString("en-NG")}`).max(1_000_000_000).nullable().optional(),
  priceMaxNaira: z.coerce.number().int().min(PRICE_FLOOR, `Estimates can't go below ₦${PRICE_FLOOR.toLocaleString("en-NG")}`).max(1_000_000_000).nullable().optional(),
});
export type ProjectInput = z.infer<typeof projectSchema>;

/// Range rule checked after parsing (zod can't .partial() a refined object).
/// Returns an error message, or null when the custom estimate is valid.
export function projectPriceProblem(min: number | null | undefined, max: number | null | undefined): string | null {
  if (max != null && min == null) return "Set a starting price before a maximum.";
  if (min != null && max != null && max < min) return "The maximum estimate must be at least the starting price.";
  return null;
}

/// "Discuss a similar project" enquiry from the public site.
export const projectInquirySchema = z.object({
  clientName: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Please enter a valid email address").max(200),
  phone: z
    .string()
    .trim()
    .max(40)
    .refine((v) => /^[+\d][\d\s()-]{6,}$/.test(v), "Please enter a valid phone or WhatsApp number"),
  projectType: z.string().trim().min(2, "Choose the type of website").max(150),
  budget: z.string().trim().min(1, "Choose an approximate budget").max(100),
  deadline: z.string().trim().max(100).optional().default(""),
  features: z.string().trim().max(2000).optional().default(""),
  details: z.string().trim().max(3000).optional().default(""),
  sourceProject: z.string().trim().max(150).optional().default(""),
  estimateAcknowledged: z.literal(true, { message: "Please confirm you understand the prices shown are estimates" }),
  honeypot: honeypotField,
});
export type ProjectInquiryInput = z.infer<typeof projectInquirySchema>;

export const announcementSchema = z.object({
  message: z.string().trim().min(1).max(300),
  isActive: z.boolean(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().nullable().optional(),
});
export type AnnouncementInput = z.infer<typeof announcementSchema>;

export const siteSettingsSchema = z
  .object({
    reviewsSectionShown: z.boolean(),
    availabilityStatus: z.string().trim().min(1).max(100),
    heroIntro: z.string().trim().min(1).max(600),
    aboutBio: z.string().trim().min(1).max(4000),
    contactEmail: z.string().trim().email(),
    whatsappNumber: z
      .string()
      .trim()
      .regex(/^\d{6,15}$/, "Digits only, country code included, no + or spaces"),
    siteName: z.string().trim().min(1).max(100),
    siteTagline: z.string().trim().min(1).max(100),
    siteDescription: z.string().trim().min(1).max(300),
    heroHeadline: z.string().trim().min(1).max(150),
    footerBio: z.string().trim().min(1).max(300),
    projectsDeliveredOverride: z.coerce.number().int().min(0).nullable(),
    clientReviewsOverride: z.coerce.number().int().min(0).nullable(),
    serviceCategoriesOverride: z.coerce.number().int().min(0).nullable(),
    averageRatingOverride: z.coerce.number().min(0).max(5).nullable(),
  })
  .partial();

export const faqItemSchema = z.object({
  question: z.string().trim().min(1).max(200),
  answer: z.string().trim().min(1).max(1000),
  order: z.coerce.number().int(),
});
export type FaqItemInput = z.infer<typeof faqItemSchema>;

export const processStepSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(300),
  order: z.coerce.number().int(),
});
export type ProcessStepInput = z.infer<typeof processStepSchema>;

export const serviceCategorySchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(300),
  icon: z.enum(SERVICE_ICON_KEYS),
  order: z.coerce.number().int(),
});
export type ServiceCategoryInput = z.infer<typeof serviceCategorySchema>;

export const serviceItemSchema = z.object({
  categoryId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(150),
  description: z.string().trim().min(1).max(300),
  order: z.coerce.number().int(),
});
export type ServiceItemInput = z.infer<typeof serviceItemSchema>;

export const adminLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const analyticsTrackSchema = z.object({
  type: z.enum(["PAGE_VIEW", "BOOKING_CLICK"]),
  path: z.string().trim().max(300).optional(),
});
