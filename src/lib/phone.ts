/**
 * WhatsApp number normalisation → E.164 ("+6281234567890").
 * Defaults to Indonesia (+62): "0812..." and "812..." become "+62812...".
 * International numbers must be typed with "+" and their country code.
 */
export function normalizeWhatsApp(input: string): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  const hasPlus = raw.startsWith("+") || raw.startsWith("00");
  let digits = raw.replace(/[^\d]/g, "");
  if (raw.startsWith("00")) digits = digits.slice(2);

  if (!hasPlus) {
    if (digits.startsWith("62")) {
      // already has Indonesian country code without "+"
    } else if (digits.startsWith("0")) {
      digits = "62" + digits.slice(1);
    } else if (digits.startsWith("8")) {
      digits = "62" + digits;
    } else {
      return null;
    }
  }

  if (!/^[1-9]\d{7,14}$/.test(digits)) return null; // E.164: max 15 digits
  if (digits.startsWith("62")) {
    // Indonesian WhatsApp numbers are mobile numbers: +62 8xx, 9–12 digits after 62.
    if (!/^628\d{8,11}$/.test(digits)) return null;
  }
  return `+${digits}`;
}
