import { z } from "zod";
import { MAX_PASSENGERS_PER_TYPE } from "./business.ts";
import { normalizeWhatsApp } from "./phone.ts";
import { isValidISODate, isValidTzOffset } from "./dates.ts";

/** Messages are i18n keys (see src/lib/i18n/dictionaries.ts → errors.*). */

/** Strip control chars & angle brackets, collapse whitespace. React escapes output; this keeps data clean. */
export function sanitizeText(s: string): string {
  return s
    .replace(/[\u0000-\u001F\u007F<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'\-]*$/u;

export const passengerNameSchema = z
  .string()
  .transform(sanitizeText)
  .pipe(z.string().min(2, "errors.nameRequired").max(100, "errors.nameTooLong").regex(NAME_RE, "errors.nameInvalid"));

export const emailSchema = z
  .string()
  .transform((s) => s.trim().toLowerCase())
  .pipe(z.string().min(1, "errors.emailRequired").max(254, "errors.emailInvalid").email("errors.emailInvalid"));

export const whatsappSchema = z
  .string()
  .min(1, "errors.whatsappRequired")
  .transform((s, ctx) => {
    const n = normalizeWhatsApp(s);
    if (!n) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "errors.whatsappInvalid" });
      return z.NEVER;
    }
    return n;
  });

const qty = z.coerce.number().int().min(0).max(MAX_PASSENGERS_PER_TYPE, "errors.tooManyPassengers");

export const createOrderSchema = z
  .object({
    idempotencyKey: z.string().regex(/^[A-Za-z0-9-]{16,100}$/, "errors.generic"),
    language: z.enum(["id", "en"]).default("id"),
    customerName: z
      .string()
      .optional()
      .transform((s) => (s ? sanitizeText(s).slice(0, 100) : undefined)),
    email: emailSchema,
    whatsapp: whatsappSchema,
    airportIata: z
      .string()
      .transform((s) => s.trim().toUpperCase())
      .pipe(z.string().regex(/^[A-Z]{3}$/, "errors.airportRequired")),
    loungeId: z.string().min(1, "errors.loungeRequired").max(64),
    visitDate: z.string().refine(isValidISODate, "errors.dateRequired"),
    tzOffsetMinutes: z.coerce.number().refine(isValidTzOffset, "errors.generic"),
    adultQty: qty,
    childQty: qty,
    adultNames: z.array(passengerNameSchema).max(MAX_PASSENGERS_PER_TYPE),
    childNames: z.array(passengerNameSchema).max(MAX_PASSENGERS_PER_TYPE),
    acceptTerms: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.acceptTerms !== true) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["acceptTerms"], message: "errors.termsRequired" });
    }
    if (v.adultQty + v.childQty < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["adultQty"], message: "errors.passengerRequired" });
    }
    if (v.adultNames.length !== v.adultQty) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["adultNames"], message: "errors.nameRequired" });
    }
    if (v.childNames.length !== v.childQty) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["childNames"], message: "errors.nameRequired" });
    }
  });

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/** Flatten zod issues to { "adultNames.0": "errors.nameRequired", ... } for the client. */
export function issuesToFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message.startsWith("errors.") ? issue.message : "errors.generic";
  }
  return out;
}
