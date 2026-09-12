import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { TIERS, computeTotals, deliveryFeeFor, isQrisOnly, tierForSpending } from "./pricing";
import type { Tier } from "./types";

const cartSchema = z.object({
  tableName: z.string().min(1).max(40),
  paymentMethod: z.enum(["cash", "qris"]),
  phone: z.string().max(30).optional(),
  voucherCode: z.string().max(40).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        variant: z.string().max(80).nullable(),
        qty: z.number().int().min(1).max(50),
        free: z.boolean(),
      }),
    )
    .min(1)
    .max(60),
});

async function currentUserId(): Promise<string | null> {
  const header = getRequestHeader("authorization");
  const token = header?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data.user?.id ?? null;
}

/**
 * Server-authoritative order creation. The client sends product ids and
 * quantities only — every price, discount, tax and fee is looked up and
 * computed here.
 */
export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => cartSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = await currentUserId();

    if (isQrisOnly(data.tableName) && data.paymentMethod !== "qris") {
      throw new Error("This table accepts QRIS payment only.");
    }

    // rate limit: 5 orders per table per 10 minutes
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("table_name", data.tableName)
      .gte("created_at", since);
    if ((count ?? 0) >= 5) {
      throw new Error("Too many orders from this table. Please wait a few minutes.");
    }

    const ids = [...new Set(data.items.map((i) => i.productId))];
    const { data: products, error: prodErr } = await supabaseAdmin
      .from("products")
      .select("id, name, pos_sell_price, pos_hidden")
      .in("id", ids);
    if (prodErr) throw new Error(prodErr.message);
    const byId = new Map((products ?? []).map((p) => [p.id, p]));
    if (byId.size !== ids.length) throw new Error("Some items are no longer available.");

    // validate free items against active promos
    const { data: promos } = await supabaseAdmin
      .from("marketing_programs")
      .select("buy_product_ids, free_product_id, free_qty, active, type")
      .eq("active", true);
    const paidIds = new Set(data.items.filter((i) => !i.free).map((i) => i.productId));

    const items = data.items.map((i) => {
      const p = byId.get(i.productId)!;
      if (p.pos_hidden) throw new Error(`${p.name} is not available right now.`);
      if (i.free) {
        const ok = (promos ?? []).some(
          (pr) =>
            pr.free_product_id === i.productId &&
            (pr.buy_product_ids ?? []).some((b: string) => paidIds.has(b)),
        );
        if (!ok) throw new Error("A free item in your cart is not part of an active promo.");
      }
      return {
        productId: i.productId,
        name: p.name,
        variant: i.variant,
        qty: i.qty,
        unitPrice: i.free ? 0 : p.pos_sell_price,
        free: i.free,
      };
    });

    const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);

    let discountRate = 0;
    let memberTier: Tier = "Classic";
    if (userId) {
      const { data: member } = await supabaseAdmin
        .from("members")
        .select("tier, discount_rate")
        .eq("user_id", userId)
        .maybeSingle();
      if (member) {
        memberTier = (member.tier as Tier) ?? "Classic";
        discountRate = Number(member.discount_rate) || TIERS[memberTier].discount;
      }
    }

    // voucher (atomic-ish: re-check daily limit right before insert)
    let voucherId: string | null = null;
    let voucherDiscount = 0;
    if (data.voucherCode) {
      const { data: voucher } = await supabaseAdmin
        .from("vouchers")
        .select("id, type, value, limit_per_day, active")
        .eq("code", data.voucherCode.toUpperCase())
        .eq("active", true)
        .maybeSingle();
      if (!voucher) throw new Error("Voucher code is not valid.");
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      const { count: used } = await supabaseAdmin
        .from("voucher_redemptions")
        .select("id", { count: "exact", head: true })
        .eq("voucher_id", voucher.id)
        .gte("redeemed_at", startOfDay.toISOString());
      if (voucher.limit_per_day > 0 && (used ?? 0) >= voucher.limit_per_day) {
        throw new Error("This voucher has reached today's limit.");
      }
      voucherId = voucher.id;
      voucherDiscount =
        voucher.type === "percent"
          ? Math.round((subtotal * Number(voucher.value)) / 100)
          : Math.round(Number(voucher.value));
    }

    const totals = computeTotals(subtotal, discountRate, data.tableName, voucherDiscount);

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        member_id: userId,
        is_member: Boolean(userId),
        table_name: data.tableName,
        items,
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        delivery_fee: totals.deliveryFee,
        total: totals.total,
        grand_total: totals.grandTotal,
        status: "pending",
        payment_method: data.paymentMethod,
        payment_status: data.paymentMethod === "qris" ? "awaiting-proof" : "none",
        voucher_id: voucherId,
        phone: data.phone ?? null,
      })
      .select("id, grand_total, payment_method, payment_status")
      .single();
    if (error) throw new Error(error.message);

    if (voucherId) {
      await supabaseAdmin.from("voucher_redemptions").insert({
        voucher_id: voucherId,
        order_id: order.id,
        table_name: data.tableName,
      });
    }
    await supabaseAdmin
      .from("order_status_history")
      .insert({ order_id: order.id, status: "pending", changed_by: userId });

    return {
      orderId: order.id as string,
      grandTotal: order.grand_total as number,
      paymentMethod: order.payment_method as string,
      paymentStatus: order.payment_status as string,
      deliveryFee: deliveryFeeFor(data.tableName),
      tier: memberTier,
    };
  });

export const quoteOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => cartSchema.omit({ paymentMethod: true }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = await currentUserId();
    const ids = [...new Set(data.items.map((i) => i.productId))];
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("id, pos_sell_price")
      .in("id", ids);
    const byId = new Map((products ?? []).map((p) => [p.id, p.pos_sell_price]));
    const subtotal = data.items.reduce(
      (s, i) => s + (i.free ? 0 : (byId.get(i.productId) ?? 0)) * i.qty,
      0,
    );
    let discountRate = 0;
    let tier: Tier = "Classic";
    if (userId) {
      const { data: member } = await supabaseAdmin
        .from("members")
        .select("tier, discount_rate")
        .eq("user_id", userId)
        .maybeSingle();
      if (member) {
        tier = (member.tier as Tier) ?? "Classic";
        discountRate = Number(member.discount_rate) || TIERS[tier].discount;
      }
    }
    return { ...computeTotals(subtotal, discountRate, data.tableName), tier };
  });

export const uploadPaymentProof = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        orderId: z.string().uuid(),
        fileName: z.string().max(120),
        contentType: z.string().max(80),
        base64: z.string().max(9_000_000),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, payment_status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order || order.payment_status !== "awaiting-proof") {
      throw new Error("This order is not waiting for a payment proof.");
    }
    const bytes = Buffer.from(data.base64, "base64");
    const ext = (data.fileName.split(".").pop() ?? "jpg").toLowerCase().slice(0, 5);
    const path = `${data.orderId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from("payment-proofs")
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (error) throw new Error(error.message);
    const { data: pub } = supabaseAdmin.storage.from("payment-proofs").getPublicUrl(path);
    await supabaseAdmin
      .from("orders")
      .update({ proof_url: pub.publicUrl, payment_status: "paid" })
      .eq("id", data.orderId);
    return { proofUrl: pub.publicUrl };
  });

export const markOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orderId: z.string().uuid(),
        status: z.enum(["pending", "preparing", "served", "cancelled"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isStaff } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "staff",
    });
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isStaff && !isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, member_id, total, loyalty_recorded, loyalty_tx_id, table_name")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("Order not found.");

    if (data.status === "served" && order.member_id && !order.loyalty_recorded) {
      const { data: member } = await supabaseAdmin
        .from("members")
        .select("tier, spending_since_upgrade, redeemable_points, birthdate")
        .eq("user_id", order.member_id)
        .maybeSingle();
      const tier = ((member?.tier as Tier) ?? "Classic") satisfies Tier;
      let rate = TIERS[tier].cashback;
      const today = new Date();
      if (
        tier === "Gold" &&
        member?.birthdate &&
        new Date(member.birthdate).getUTCDate() === today.getUTCDate() &&
        new Date(member.birthdate).getUTCMonth() === today.getUTCMonth()
      ) {
        rate *= 2;
      }
      const cashback = Math.round(order.total * rate);
      const { data: tx } = await supabaseAdmin
        .from("loyalty_transactions")
        .insert({
          member_id: order.member_id,
          order_id: order.id,
          amount: order.total,
          cashback,
          points_earned: cashback,
          source: "order",
          table_name: order.table_name,
        })
        .select("id")
        .single();
      const spending = (member?.spending_since_upgrade ?? 0) + order.total;
      await supabaseAdmin
        .from("members")
        .update({
          redeemable_points: (member?.redeemable_points ?? 0) + cashback,
          spending_since_upgrade: spending,
          tier: tierForSpending(spending),
          discount_rate: TIERS[tierForSpending(spending)].discount,
        })
        .eq("user_id", order.member_id);
      await supabaseAdmin
        .from("orders")
        .update({ loyalty_recorded: true, loyalty_tx_id: tx?.id ?? null })
        .eq("id", order.id);
    }

    if (data.status === "cancelled" && order.loyalty_recorded && order.member_id) {
      const { data: tx } = await supabaseAdmin
        .from("loyalty_transactions")
        .select("cashback, amount")
        .eq("id", order.loyalty_tx_id!)
        .maybeSingle();
      const { data: member } = await supabaseAdmin
        .from("members")
        .select("redeemable_points, spending_since_upgrade")
        .eq("user_id", order.member_id)
        .maybeSingle();
      const spending = Math.max(0, (member?.spending_since_upgrade ?? 0) - (tx?.amount ?? 0));
      await supabaseAdmin
        .from("members")
        .update({
          redeemable_points: Math.max(0, (member?.redeemable_points ?? 0) - (tx?.cashback ?? 0)),
          spending_since_upgrade: spending,
          tier: tierForSpending(spending),
          discount_rate: TIERS[tierForSpending(spending)].discount,
        })
        .eq("user_id", order.member_id);
      if (order.loyalty_tx_id) {
        await supabaseAdmin.from("loyalty_transactions").delete().eq("id", order.loyalty_tx_id);
      }
      await supabaseAdmin
        .from("orders")
        .update({ loyalty_recorded: false, loyalty_tx_id: null })
        .eq("id", order.id);
    }

    await supabaseAdmin.from("orders").update({ status: data.status }).eq("id", data.orderId);
    await supabaseAdmin
      .from("order_status_history")
      .insert({ order_id: data.orderId, status: data.status, changed_by: userId });

    return { ok: true };
  });
