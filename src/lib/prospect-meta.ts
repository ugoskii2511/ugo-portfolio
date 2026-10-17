/// Display metadata shared by the client-acquisition dashboard. Industry
/// names must match prospector/app/discovery/industries.py.
export const INDUSTRIES = [
  "Education",
  "Food & drink",
  "Hospitality",
  "Retail",
  "Fashion",
  "Real estate",
  "Health",
  "Professional services",
  "Logistics",
  "Beauty & wellness",
  "Automotive",
  "Agriculture",
  "Events & entertainment",
] as const;

export const NIGERIAN_STATES = [
  "Federal Capital Territory", "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina",
  "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers",
  "Sokoto", "Taraba", "Yobe", "Zamfara",
];

export const WEBSITE_STATUS: Record<string, { label: string; tone: "success" | "accent" | "warning" | "neutral" | "danger" }> = {
  VERIFIED: { label: "Website verified", tone: "success" },
  FOUND_UNVERIFIED: { label: "Website found, unverified", tone: "accent" },
  NONE_FOUND: { label: "No website found", tone: "warning" },
  UNCERTAIN: { label: "Website not loading", tone: "danger" },
  UNCHECKED: { label: "Not checked yet", tone: "neutral" },
};

export const QUALIFICATION: Record<string, { label: string; tone: "success" | "accent" | "warning" | "neutral" | "danger" }> = {
  qualified: { label: "Qualified", tone: "success" },
  review: { label: "Needs review", tone: "warning" },
  low: { label: "Low fit", tone: "neutral" },
  do_not_contact: { label: "Do not contact", tone: "danger" },
};

export const TEMPLATE_LABEL: Record<string, string> = {
  new_website: "New website",
  website_rescue: "Website not loading",
  redesign: "Website improvements",
  mobile: "Mobile usability",
  ecommerce: "Online store",
  school_website: "School website",
  audit_summary: "Audit summary",
  consultation: "Consultation invite",
  follow_up: "Follow-up",
};

export function formatNaira(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return "—";
  return `₦${amount.toLocaleString("en-NG")}`;
}

export function jobTone(status: string): "success" | "danger" | "neutral" | "accent" {
  return status === "done" ? "success" : status === "failed" ? "danger" : status === "cancelled" ? "neutral" : "accent";
}
