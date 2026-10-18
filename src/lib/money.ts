/// Naira amounts are handled as whole kobo (₦1 = 100 kobo) everywhere: in the
/// database (BigInt columns), in calculations and in API payloads. Parsing
/// works on the typed text directly, so "0.1 + 0.2" style float errors can't
/// creep in. JS numbers are exact for integers up to 2^53 (≈ ₦90 trillion),
/// so kobo values are passed around as plain numbers.

export const MAX_KOBO = 1_000_000_000_000_00; // ₦1 trillion: a sanity ceiling, not a business rule

/// "₦15,000", "15000", "15,000.5", "15000.50" → kobo. Returns null for
/// anything that isn't a plain non-negative amount with at most 2 decimals.
export function parseNairaToKobo(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const text = String(input).trim().replace(/[₦,\s]/g, "").replace(/^NGN/i, "");
  if (text === "") return null;
  const match = /^(\d+)(?:\.(\d{0,2}))?$/.exec(text);
  if (!match) return null;
  const whole = match[1].replace(/^0+(?=\d)/, "");
  const fraction = (match[2] ?? "").padEnd(2, "0");
  if (whole.length > 13) return null;
  const kobo = Number(whole) * 100 + Number(fraction);
  return Number.isSafeInteger(kobo) && kobo <= MAX_KOBO ? kobo : null;
}

/// 1500050 → "₦15,000.50"; whole amounts drop the ".00".
export function formatKobo(kobo: number | bigint | null | undefined, { signed = false }: { signed?: boolean } = {}): string {
  if (kobo === null || kobo === undefined) return "—";
  const value = typeof kobo === "bigint" ? Number(kobo) : kobo;
  const negative = value < 0;
  const abs = Math.abs(value);
  const naira = Math.trunc(abs / 100);
  const rest = abs % 100;
  const body = naira.toLocaleString("en-NG") + (rest ? `.${String(rest).padStart(2, "0")}` : "");
  return `${negative ? "−" : signed && value > 0 ? "+" : ""}₦${body}`;
}

/// Kobo → the plain text a form field should show ("15000.5" → "15000.50").
export function koboToInput(kobo: number | bigint | null | undefined): string {
  if (kobo === null || kobo === undefined) return "";
  const value = typeof kobo === "bigint" ? Number(kobo) : kobo;
  const rest = value % 100;
  return `${Math.trunc(value / 100)}${rest ? `.${String(rest).padStart(2, "0")}` : ""}`;
}

export function toKoboNumber(value: bigint | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "bigint" ? Number(value) : value;
}

export function sumKobo(values: Iterable<number>): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}
