import { TIERS, type TierName } from "./config";

export function tierFor(spending: number): TierName {
  const names = Object.keys(TIERS) as TierName[];
  let result: TierName = "Classic";
  for (const name of names) {
    if (spending >= TIERS[name].threshold) result = name;
  }
  return result;
}

export function discountRateFor(tier: string): number {
  return TIERS[(tier as TierName) in TIERS ? (tier as TierName) : "Classic"].discount;
}

export function cashbackRateFor(tier: string, isBirthday = false): number {
  const base = TIERS[(tier as TierName) in TIERS ? (tier as TierName) : "Classic"].cashback;
  if (isBirthday && tier === "Gold") return base * 2;
  return base;
}

export function isBirthdayToday(birthdate: string | null): boolean {
  if (!birthdate) return false;
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const date = new Date(birthdate);
  return date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
}
