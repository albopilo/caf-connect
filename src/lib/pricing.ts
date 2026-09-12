import type { Tier } from "./types";

export const TIERS: Record<Tier, { discount: number; cashback: number; threshold: number }> = {
  Classic: { discount: 0, cashback: 0, threshold: 0 },
  Bronze: { discount: 0.1, cashback: 0.05, threshold: 500_000 },
  Silver: { discount: 0.15, cashback: 0.07, threshold: 2_000_000 },
  Gold: { discount: 0.2, cashback: 0.1, threshold: 5_000_000 },
};

export const TAX_RATE = 0.1;
export const DELIVERY_TABLES = ["Mille-1", "Mille-3"];
export const QRIS_ONLY_TABLES = ["Mille-1", "Mille-2", "Mille-3"];
export const DELIVERY_FEE = 5000;

export function deliveryFeeFor(tableName: string): number {
  return DELIVERY_TABLES.includes(tableName) ? DELIVERY_FEE : 0;
}

export function isQrisOnly(tableName: string): boolean {
  return QRIS_ONLY_TABLES.includes(tableName);
}

export function roundTo100(value: number): number {
  return Math.round(value / 100) * 100;
}

export function tierForSpending(spending: number): Tier {
  if (spending >= TIERS.Gold.threshold) return "Gold";
  if (spending >= TIERS.Silver.threshold) return "Silver";
  if (spending >= TIERS.Bronze.threshold) return "Bronze";
  return "Classic";
}

export type Totals = {
  subtotal: number;
  discount: number;
  tax: number;
  deliveryFee: number;
  total: number;
  grandTotal: number;
};

/** Shared math. The authoritative call always happens on the server. */
export function computeTotals(
  subtotal: number,
  discountRate: number,
  tableName: string,
  voucherDiscount = 0,
): Totals {
  const memberDiscount = Math.round(subtotal * discountRate);
  const discount = Math.min(subtotal, memberDiscount + voucherDiscount);
  const taxable = subtotal - discount;
  const tax = Math.round(taxable * TAX_RATE);
  const deliveryFee = deliveryFeeFor(tableName);
  const total = taxable + tax + deliveryFee;
  return {
    subtotal,
    discount,
    tax,
    deliveryFee,
    total,
    grandTotal: roundTo100(total),
  };
}
