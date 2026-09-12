import type { Product } from "./types";

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
];

export function orderCategories(cats: string[]): string[] {
  const known = CATEGORY_ORDER.filter((c) => cats.includes(c));
  const rest = cats.filter((c) => !CATEGORY_ORDER.includes(c)).sort();
  return [...known, ...rest];
}

export function lowestPrice(p: Product): number {
  return p.pos_sell_price;
}

export function groupByCategory(products: Product[]): Record<string, Product[]> {
  return products.reduce<Record<string, Product[]>>((acc, p) => {
    (acc[p.category] ||= []).push(p);
    return acc;
  }, {});
}
