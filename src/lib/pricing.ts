import { PRICES_IDR, MAX_PASSENGERS_PER_TYPE } from "./business.ts";

export type PriceBreakdown = {
  adultQty: number;
  childQty: number;
  adultUnitPrice: number;
  childUnitPrice: number;
  adultSubtotal: number;
  childSubtotal: number;
  totalAmount: number;
  currency: "IDR";
};

/**
 * Total = (adults × 200,000) + (children × 175,000).
 * Used on the client for display AND on the server as the only source of truth for amounts.
 */
export function calculatePrice(adultQty: number, childQty: number): PriceBreakdown {
  for (const [label, q] of [["adultQty", adultQty], ["childQty", childQty]] as const) {
    if (!Number.isInteger(q) || q < 0 || q > MAX_PASSENGERS_PER_TYPE) {
      throw new RangeError(`${label} must be an integer between 0 and ${MAX_PASSENGERS_PER_TYPE}`);
    }
  }
  if (adultQty + childQty < 1) throw new RangeError("At least one passenger is required");
  const adultSubtotal = adultQty * PRICES_IDR.ADULT;
  const childSubtotal = childQty * PRICES_IDR.CHILD;
  return {
    adultQty,
    childQty,
    adultUnitPrice: PRICES_IDR.ADULT,
    childUnitPrice: PRICES_IDR.CHILD,
    adultSubtotal,
    childSubtotal,
    totalAmount: adultSubtotal + childSubtotal,
    currency: "IDR",
  };
}

/** "Rp 575.000" (id) / "IDR 575,000" (en) */
export function formatIDR(amount: number, lang: "id" | "en" = "id"): string {
  if (lang === "id") return `Rp ${new Intl.NumberFormat("id-ID").format(amount)}`;
  return `IDR ${new Intl.NumberFormat("en-US").format(amount)}`;
}
