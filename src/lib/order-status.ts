export const ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "PAYMENT_SUBMITTED",
  "PAYMENT_VERIFIED",
  "PROCESSING",
  "COMPLETED",
  "CANCELLED",
] as const;
export type OrderStatusValue = (typeof ORDER_STATUSES)[number];

/**
 * Allowed manual status changes by an admin. Payment verification/rejection have their own
 * actions (they also update the Payment record) and are the only way into PAYMENT_VERIFIED.
 */
const TRANSITIONS: Record<OrderStatusValue, OrderStatusValue[]> = {
  PENDING_PAYMENT: ["CANCELLED"],
  PAYMENT_SUBMITTED: ["CANCELLED"],
  PAYMENT_VERIFIED: ["PROCESSING", "COMPLETED", "CANCELLED"],
  PROCESSING: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function allowedNextStatuses(from: OrderStatusValue): OrderStatusValue[] {
  return TRANSITIONS[from];
}

export function canTransition(from: OrderStatusValue, to: OrderStatusValue): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isOrderStatus(v: unknown): v is OrderStatusValue {
  return typeof v === "string" && (ORDER_STATUSES as readonly string[]).includes(v);
}
