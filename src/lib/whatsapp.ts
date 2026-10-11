// Falls back to the developer's real number so the booking flow still works
// if NEXT_PUBLIC_WHATSAPP_NUMBER isn't configured in the environment yet.
const DEFAULT_WHATSAPP_NUMBER = "2349065606430";

/// The DB-stored number (edited from /admin/content) always wins when
/// provided — it's the source of truth so the number can change without a
/// redeploy. The env var is only the fallback for contexts that can't reach
/// the database (or haven't been updated to pass one yet).
export function getWhatsAppNumber(override?: string | null): string {
  return override || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || DEFAULT_WHATSAPP_NUMBER;
}

export type BookingWhatsAppInput = {
  name: string;
  projectType: string;
  budget: string;
  details: string;
};

export function buildBookingMessage({
  name,
  projectType,
  budget,
  details,
}: BookingWhatsAppInput): string {
  // Labelled lines rather than a sentence template, so any project type
  // reads naturally ("Buy SwiftVTU (₦350,000)", "E-Commerce Store…").
  const subject = projectType === "General Inquiry" ? "General enquiry" : projectType;
  return `Hello Ugochukwu, my name is ${name}.\n\nProject: ${subject}\nBudget: ${budget}\n\n${details}`;
}

export function buildBookingWhatsAppUrl(
  input: BookingWhatsAppInput,
  whatsappNumberOverride?: string | null
): string {
  return buildWhatsAppChatUrl(buildBookingMessage(input), whatsappNumberOverride);
}

/// A plain chat link with a pre-filled greeting, for "message me" buttons
/// that aren't attached to a booking form submission.
export function buildWhatsAppChatUrl(message: string, whatsappNumberOverride?: string | null): string {
  return `https://wa.me/${getWhatsAppNumber(whatsappNumberOverride)}?text=${encodeURIComponent(message)}`;
}

/// Formats a raw digit string (country code + number, no separators) as
/// "+CC XXX XXX XXXX" for display — the last group absorbs a 4th digit
/// when the remainder doesn't divide evenly into threes.
export function formatWhatsAppDisplay(digits: string): string {
  const countryCode = digits.slice(0, 3);
  const rest = digits.slice(3);
  const groups: string[] = [];
  let i = 0;
  while (i < rest.length) {
    const size = rest.length - i === 4 ? 4 : 3;
    groups.push(rest.slice(i, i + size));
    i += size;
  }
  return `+${countryCode} ${groups.join(" ")}`;
}
