export type Tier = "Classic" | "Bronze" | "Silver" | "Gold";

export type Product = {
  id: string;
  name: string;
  category: string;
  variant_label: string | null;
  variant_names: string[];
  pos_sell_price: number;
  pos_hidden: boolean;
  photo_1: string | null;
  olsera_id: string | null;
};

export type MarketingProgram = {
  id: string;
  type: string;
  active: boolean;
  buy_product_ids: string[];
  free_product_id: string | null;
  free_qty: number;
  free_variant: string | null;
};

export type Member = {
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  birthdate: string | null;
  tier: Tier;
  discount_rate: number;
  redeemable_points: number;
  spending_since_upgrade: number;
};

export type OrderItem = {
  productId: string;
  name: string;
  variant: string | null;
  qty: number;
  unitPrice: number;
  free: boolean;
};

export type OrderStatus = "pending" | "preparing" | "served" | "cancelled";

export type Order = {
  id: string;
  member_id: string | null;
  table_name: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  delivery_fee: number;
  total: number;
  grand_total: number;
  status: OrderStatus;
  payment_method: "cash" | "qris";
  payment_status: "none" | "awaiting-proof" | "paid";
  proof_url: string | null;
  phone: string | null;
  is_member: boolean;
  date: string;
  created_at: string;
};

export type CartLine = {
  lineId: string;
  productId: string;
  name: string;
  variant: string | null;
  unitPrice: number;
  qty: number;
  free: boolean;
  promoLinkId?: string;
};
