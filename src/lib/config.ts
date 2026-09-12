export const CATEGORY_ORDER = [
  "Special Today",
  "Snacks",
  "Western",
  "Ricebowl",
  "Nasi",
  "Nasi Goreng",
  "Mie",
  "Matcha",
  "Coffee",
  "Non coffee",
  "Tea & Juices",
] as const;

export const LOCATIONS = ["Mille 1", "Mille 2", "Mille 3", "Main Kitchen"] as const;

/** Tables that must pay by QRIS only. */
export const QRIS_ONLY_TABLES = ["Mille-1", "Mille-2", "Mille-3"];
/** Tables that carry a delivery fee. */
export const DELIVERY_FEE_TABLES = ["Mille-1", "Mille-3"];
export const DELIVERY_FEE = 5000;
export const TAX_RATE = 0.1;

export const TIERS = {
  Classic: { discount: 0, cashback: 0, threshold: 0 },
  Bronze: { discount: 0.1, cashback: 0.05, threshold: 500_000 },
  Silver: { discount: 0.15, cashback: 0.07, threshold: 2_000_000 },
  Gold: { discount: 0.2, cashback: 0.1, threshold: 5_000_000 },
} as const;

export type TierName = keyof typeof TIERS;

/** Sunday = 0 … Saturday = 6. null = closed. */
export const OPENING_HOURS: Record<number, { open: string; close: string } | null> = {
  0: { open: "08:30", close: "19:30" },
  1: null,
  2: { open: "08:30", close: "19:30" },
  3: { open: "08:30", close: "19:30" },
  4: { open: "08:30", close: "19:30" },
  5: { open: "08:30", close: "19:30" },
  6: { open: "08:30", close: "21:30" },
};

export const CART_TTL_MS = 60 * 60 * 1000;

export function jakartaNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
}

export function todayHours() {
  const now = jakartaNow();
  return { day: now.getDay(), hours: OPENING_HOURS[now.getDay()] ?? null, now };
}

export function isOpenNow(): boolean {
  const { hours, now } = todayHours();
  if (!hours) return false;
  const mins = now.getHours() * 60 + now.getMinutes();
  const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  return mins >= toMin(hours.open) && mins <= toMin(hours.close);
}

export function normalizePhone(input: string): string {
  const digits = input.replace(/[^\d]/g, "");
  if (digits.startsWith("62")) return "0" + digits.slice(2);
  if (digits.startsWith("0")) return digits;
  return "0" + digits;
}

/** Turns a Google Drive share link into a directly embeddable image URL. */
export function normalizePhotoUrl(url: string): string {
  const trimmed = url.trim();
  const match =
    trimmed.match(/drive\.google\.com\/file\/d\/([^/]+)/) ??
    trimmed.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
  return trimmed;
}
