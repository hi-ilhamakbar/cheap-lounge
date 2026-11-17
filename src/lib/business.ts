/**
 * Mandatory business rules (project requirements §6, §9, §10, §16).
 * Change here only with business approval — these values are used server-side for every order.
 */
export const BRAND_NAME = "JASA TIKET MURAH";

export const PRICES_IDR = {
  ADULT: 200_000,
  CHILD: 175_000,
} as const;

/** A child is a passenger under this age. 12 and above = adult. */
export const CHILD_MAX_AGE_EXCLUSIVE = 12;

/** Visit date may be today through today + this many days (customer's local date). */
export const BOOKING_WINDOW_DAYS = 90;

export const MAX_PASSENGERS_PER_TYPE = 10;

export const WHATSAPP_NUMBER = "6285213009993";
export const WHATSAPP_DISPLAY = "+62 852-1300-9993";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

/** Always CC'd on every order email (configured as real CC recipients in the email API call). */
export const INTERNAL_CC_EMAILS = ["airportloungevoucher@gmail.com", "jasatiketmurah@gmail.com"] as const;

export const QRIS = {
  imagePath: "/qris/qris-jasa-tiket-murah.jpg",
  width: 874,
  height: 1240,
  merchantName: "JASA TIKET MURAH",
  nmid: "ID1025423279625",
  merchantCategory: "A01",
} as const;

/** Timezone used for the date part of order codes. */
export const BUSINESS_TIMEZONE = "Asia/Jakarta";

export const MAX_PROOF_BYTES = 5 * 1024 * 1024;
export const ALLOWED_PROOF_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
