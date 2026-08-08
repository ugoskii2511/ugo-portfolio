import { z } from "zod";
import { SERVICE_ICON_KEYS } from "@/lib/services-data";

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

export const projectSchema = z.object({
  name: z.string().trim().min(1).max(150),
  summary: z.string().trim().min(1).max(1000),
  liveUrl: z.union([z.string().trim().url(), z.literal("")]).optional(),
  techStack: z.array(z.string().trim().min(1)).max(20),
  imageUrl: z.union([z.string().trim().url(), z.literal("")]).optional(),
  featured: z.boolean(),
  order: z.coerce.number().int(),
});
export type ProjectInput = z.infer<typeof projectSchema>;

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
