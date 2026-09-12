import { CART_TTL_MS } from "./config";
import type { CartItem, MarketingProgram, Product } from "./types";

const KEY = "13e-cart-v1";

type Stored = { items: CartItem[]; savedAt: number; persistent: boolean };

export function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed.persistent && Date.now() - parsed.savedAt > CART_TTL_MS) {
      window.localStorage.removeItem(KEY);
      return [];
    }
    return parsed.items ?? [];
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[], persistent: boolean) {
  if (typeof window === "undefined") return;
  const payload: Stored = { items, savedAt: Date.now(), persistent };
  window.localStorage.setItem(KEY, JSON.stringify(payload));
}

export function clearCart() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export function newLineId(): string {
  return crypto.randomUUID();
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.qty, 0);
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + (item.isFree ? 0 : item.unitPrice * item.qty), 0);
}

/** Returns the program triggered by adding this product, if any. */
export function findPromoFor(
  productId: string,
  programs: MarketingProgram[],
): MarketingProgram | null {
  return (
    programs.find((program) => program.active && program.buy_product_ids.includes(productId)) ??
    null
  );
}

export function buildFreeItem(
  program: MarketingProgram,
  freeProduct: Product,
  variant: string | null,
  promoLinkId: string,
): CartItem {
  return {
    lineId: newLineId(),
    productId: freeProduct.id,
    name: freeProduct.name,
    variant,
    unitPrice: 0,
    qty: program.free_qty,
    isFree: true,
    promoLinkId,
  };
}

/** Removing a buy line also removes its linked free line. */
export function removeLine(items: CartItem[], lineId: string): CartItem[] {
  return items.filter((item) => item.lineId !== lineId && item.promoLinkId !== lineId);
}
