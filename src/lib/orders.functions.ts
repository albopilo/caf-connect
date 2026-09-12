import { createServerFn } from "@tanstack/react-start";

import { DELIVERY_FEE, DELIVERY_FEE_TABLES, QRIS_ONLY_TABLES, TAX_RATE } from "./config";
import { roundTo100 } from "./format";
import { discountRateFor } from "./loyalty";
import type { OrderItem } from "./types";

type CartInput = { productId: string; variant: string | null; qty: number; isFree: boolean };

type CreateOrderInput = {
  items: CartInput[];
  tableName: string;
  paymentMethod: "cash" | "qris";
  phone: string | null;
  memberId: string | null;
  voucherCode: string | null;
};

function validateCreateOrder(input: unknown): CreateOrderInput {
  const data = input as CreateOrderInput;
  if (!data || !Array.isArray(data.items) || data.items.length === 0) {
    throw new Error("Your cart is empty.");
  }
  if (data.items.length > 60) throw new Error("Too many items in one order.");
  for (const item of data.items) {
    if (typeof item.productId !== "string" || !item.productId) throw new Error("Invalid item.");
    if (!Number.isInteger(item.qty) || item.qty < 1 || item.qty > 30) {
      throw new Error("Invalid item quantity.");
    }
  }
  const tableName = String(data.tableName || "Takeaway").slice(0, 40);
  const paymentMethod = data.paymentMethod === "qris" ? "qris" : "cash";
  if (QRIS_ONLY_TABLES.includes(tableName) && paymentMethod !== "qris") {
    throw new Error("This table can only pay with QRIS.");
  }
  return {
    items: data.items.map((item) => ({
      productId: item.productId,
      variant: item.variant ? String(item.variant).slice(0, 80) : null,
      qty: item.qty,
      isFree: Boolean(item.isFree),
    })),
    tableName,
    paymentMethod,
    phone: data.phone ? String(data.phone).slice(0, 20) : null,
    memberId: data.memberId ? String(data.memberId) : null,
    voucherCode: data.voucherCode ? String(data.voucherCode).slice(0, 40).toUpperCase() : null,
  };
}

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator(validateCreateOrder)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Rate limit: max 5 orders per table per 10 minutes.
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("table_name", data.tableName)
      .gte("created_at", since);
    if ((count ?? 0) >= 5) {
      throw new Error("Too many orders from this table. Please wait a few minutes.");
    }

    const productIds = [...new Set(data.items.map((item) => item.productId))];
    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      .select("id, name, pos_sell_price, pos_hidden")
      .in("id", productIds);
    if (productsError) throw new Error("Could not load menu prices.");

    const { data: programs } = await supabaseAdmin
      .from("marketing_programs")
      .select("free_product_id, free_qty, active")
      .eq("active", true);
    const freeProductIds = new Set((programs ?? []).map((p) => p.free_product_id));

    const orderItems: OrderItem[] = [];
    for (const item of data.items) {
      const product = (products ?? []).find((row) => row.id === item.productId);
      if (!product || product.pos_hidden) throw new Error("An item is no longer available.");
      const isFree = item.isFree && freeProductIds.has(product.id);
      orderItems.push({
        productId: product.id,
        name: product.name,
        variant: item.variant,
        qty: item.qty,
        unitPrice: isFree ? 0 : product.pos_sell_price,
        isFree,
      });
    }

    const subtotal = orderItems.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);

    let discountRate = 0;
    let memberId: string | null = null;
    if (data.memberId) {
      const { data: member } = await supabaseAdmin
        .from("members")
        .select("user_id, tier")
        .eq("user_id", data.memberId)
        .maybeSingle();
      if (member) {
        memberId = member.user_id;
        discountRate = discountRateFor(member.tier);
      }
    }
    let discount = Math.round(subtotal * discountRate);

    let voucherId: string | null = null;
    if (data.voucherCode) {
      const { data: voucher } = await supabaseAdmin
        .from("vouchers")
        .select("id, type, value, limit_per_day, active")
        .eq("code", data.voucherCode)
        .eq("active", true)
        .maybeSingle();
      if (voucher) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const { count: used } = await supabaseAdmin
          .from("voucher_redemptions")
          .select("id", { count: "exact", head: true })
          .eq("voucher_id", voucher.id)
          .gte("redeemed_at", startOfDay.toISOString());
        if (voucher.limit_per_day === 0 || (used ?? 0) < voucher.limit_per_day) {
          voucherId = voucher.id;
          discount +=
            voucher.type === "percent"
              ? Math.round((subtotal * Number(voucher.value)) / 100)
              : Math.round(Number(voucher.value));
        }
      }
    }
    discount = Math.min(discount, subtotal);

    const taxable = subtotal - discount;
    const tax = Math.round(taxable * TAX_RATE);
    const deliveryFee = DELIVERY_FEE_TABLES.includes(data.tableName) ? DELIVERY_FEE : 0;
    const total = taxable + tax + deliveryFee;
    const grandTotal = roundTo100(total);

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        member_id: memberId,
        table_name: data.tableName,
        items: orderItems,
        subtotal,
        discount,
        tax,
        delivery_fee: deliveryFee,
        total,
        grand_total: grandTotal,
        status: "pending",
        payment_method: data.paymentMethod,
        payment_status: data.paymentMethod === "qris" ? "awaiting-proof" : "none",
        voucher_id: voucherId,
        phone: data.phone,
        is_member: Boolean(memberId),
      })
      .select("id, grand_total, payment_method, payment_status")
      .single();
    if (error || !order) throw new Error("Could not place your order. Please try again.");

    if (voucherId) {
      await supabaseAdmin
        .from("voucher_redemptions")
        .insert({ voucher_id: voucherId, order_id: order.id, table_name: data.tableName });
    }

    await supabaseAdmin
      .from("order_status_history")
      .insert({ order_id: order.id, status: "pending" });

    try {
      const { pushOlseraOrder } = await import("./olsera.server");
      const olseraOrderId = await pushOlseraOrder({
        table_name: data.tableName,
        payment_method: data.paymentMethod,
        total: grandTotal,
        items: orderItems.map((item) => ({
          name: item.name,
          variant: item.variant,
          qty: item.qty,
          price: item.unitPrice,
        })),
      });
      if (olseraOrderId) {
        await supabaseAdmin
          .from("orders")
          .update({ olsera_order_id: olseraOrderId })
          .eq("id", order.id);
      }
    } catch (pushError) {
      console.error("Olsera push failed", pushError);
    }

    return order;
  });

/** Public read of a single order (used by the order status screen). */
export const getOrder = createServerFn({ method: "POST" })
  .inputValidator((input: { orderId: string }) => ({ orderId: String(input.orderId) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select(
        "id, table_name, items, subtotal, discount, tax, delivery_fee, total, grand_total, status, payment_method, payment_status, created_at",
      )
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("Order not found.");
    return order;
  });

export const uploadPaymentProof = createServerFn({ method: "POST" })
  .inputValidator((input: { orderId: string; fileBase64: string; contentType: string }) => {
    if (!input?.orderId || !input?.fileBase64) throw new Error("Missing payment proof.");
    if (input.fileBase64.length > 8_000_000) throw new Error("Photo is too large.");
    return {
      orderId: String(input.orderId),
      fileBase64: String(input.fileBase64),
      contentType: String(input.contentType || "image/jpeg"),
    };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, payment_status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("Order not found.");
    if (order.payment_status === "paid") throw new Error("This order is already paid.");

    const bytes = Uint8Array.from(atob(data.fileBase64), (char) => char.charCodeAt(0));
    const path = `${data.orderId}/${crypto.randomUUID()}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("payment-proofs")
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (uploadError) throw new Error("Could not upload the photo. Please try again.");

    await supabaseAdmin
      .from("orders")
      .update({ proof_url: path, payment_status: "awaiting-proof" })
      .eq("id", data.orderId);
    return { ok: true };
  });
