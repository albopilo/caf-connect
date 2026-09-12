import { useSyncExternalStore } from "react";
import type { CartLine, MarketingProgram, Product } from "./types";

const KEY = "13e-cart-v1";
const GUEST_TTL_MS = 60 * 60 * 1000;

type Stored = { lines: CartLine[]; savedAt: number; table: string };

let state: Stored = { lines: [], savedAt: Date.now(), table: "Takeaway" };
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.add(() => {});
  listeners.forEach((l) => l());
}

function persist() {
  if (typeof window === "undefined") return;
  state.savedAt = Date.now();
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

export function loadCart(isMember: boolean) {
  if (typeof window === "undefined" || loaded) return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Stored;
    if (!isMember && Date.now() - parsed.savedAt > GUEST_TTL_MS) {
      window.localStorage.removeItem(KEY);
      return;
    }
    state = parsed;
    emit();
  } catch {
    window.localStorage.removeItem(KEY);
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const serverSnapshot: Stored = { lines: [], savedAt: 0, table: "Takeaway" };

export function useCart() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => serverSnapshot,
  );
}

export function setTable(table: string) {
  state = { ...state, table };
  persist();
  emit();
}

function newId() {
  return crypto.randomUUID();
}

export function addLine(
  product: Product,
  variant: string | null,
  opts: { free?: boolean; promoLinkId?: string; qty?: number } = {},
) {
  const qty = opts.qty ?? 1;
  const free = opts.free ?? false;
  const existing = state.lines.find(
    (l) => l.productId === product.id && l.variant === variant && l.free === free && !l.promoLinkId,
  );
  if (existing && !opts.promoLinkId) {
    existing.qty += qty;
  } else {
    state.lines = [
      ...state.lines,
      {
        lineId: newId(),
        productId: product.id,
        name: product.name,
        variant,
        unitPrice: free ? 0 : product.pos_sell_price,
        qty,
        free,
        ...(opts.promoLinkId ? { promoLinkId: opts.promoLinkId } : {}),
      },
    ];
  }
  state = { ...state, lines: [...state.lines] };
  persist();
  emit();
}

export function changeQty(lineId: string, delta: number) {
  const line = state.lines.find((l) => l.lineId === lineId);
  if (!line) return;
  line.qty += delta;
  let lines = state.lines.filter((l) => l.qty > 0);
  // removing a buy-line removes its linked free item
  const remainingIds = new Set(lines.map((l) => l.lineId));
  lines = lines.filter((l) => !l.promoLinkId || remainingIds.has(l.promoLinkId));
  state = { ...state, lines: [...lines] };
  persist();
  emit();
}

export function removeLine(lineId: string) {
  const lines = state.lines.filter((l) => l.lineId !== lineId && l.promoLinkId !== lineId);
  state = { ...state, lines };
  persist();
  emit();
}

export function setVariant(lineId: string, variant: string) {
  const line = state.lines.find((l) => l.lineId === lineId);
  if (!line) return;
  line.variant = variant;
  state = { ...state, lines: [...state.lines] };
  persist();
  emit();
}

export function clearCart() {
  state = { lines: [], savedAt: Date.now(), table: state.table };
  if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
  emit();
}

export function cartSubtotal(lines: CartLine[]) {
  return lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
}

/** Returns the promo that a just-added product qualifies for, if any. */
export function matchPromo(
  programs: MarketingProgram[],
  productId: string,
): MarketingProgram | undefined {
  return programs.find(
    (p) => p.active && p.type === "buy_x_get_y" && p.buy_product_ids.includes(productId),
  );
}

export function hasPromoFor(lineId: string) {
  return state.lines.some((l) => l.promoLinkId === lineId);
}
