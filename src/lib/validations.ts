import { z } from "zod";

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
  rating: z.coerce.number().int().min(1).max(5),
  message: z.string().trim().min(5, "Please write a short review").max(1000),
  honeypot: honeypotField,
});
export type ReviewSubmitInput = z.infer<typeof reviewSubmitSchema>;

export const reviewModerationSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
});

export const projectSchema = z.object({
  name: z.string().trim().min(1).max(150),
  summary: z.string().trim().min(1).max(1000),
  liveUrl: z.union([z.string().trim().url(), z.literal("")]).optional(),
  techStack: z.array(z.string().trim().min(1)).max(20).default([]),
  imageUrl: z.union([z.string().trim().url(), z.literal("")]).optional(),
  featured: z.boolean().default(false),
  order: z.coerce.number().int().default(0),
});
export type ProjectInput = z.infer<typeof projectSchema>;

export const announcementSchema = z.object({
  message: z.string().trim().min(1).max(300),
  isActive: z.boolean().default(true),
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
  })
  .partial();

export const adminLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const analyticsTrackSchema = z.object({
  type: z.enum(["PAGE_VIEW", "BOOKING_CLICK"]),
  path: z.string().trim().max(300).optional(),
});
