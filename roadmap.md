# 13e Café — Build Roadmap

## M1 — Foundation
- [ ] Lovable Cloud enabled
- [ ] Database schema + RLS + GRANTs (products, marketing_programs, members, orders,
      order_status_history, vouchers, voucher_redemptions, loyalty_transactions,
      staff_push_tokens, user_roles)
- [ ] Warm café design system (cream/espresso/sage), no purple
- [ ] Shared lib: types, format, cart, loyalty, config

## M2 — Customer surface
- [ ] Menu page (category tabs, product cards, variant modal)
- [ ] Cart with localStorage + 1h TTL + promo buy X get Y
- [ ] Checkout with SERVER-computed totals
- [ ] Payment method (cash/QRIS, QRIS-only for Mille tables)
- [ ] QRIS proof upload to storage
- [ ] Operational hours notice / Monday closed

## M3 — Auth & loyalty
- [ ] Email/password auth (sign up, sign in)
- [ ] Member profile + tiers Classic/Bronze/Silver/Gold
- [ ] Loyalty accrual on "served", reversal on "cancelled"

## M4 — Staff
- [ ] Single staff dashboard with location filter
- [ ] Realtime order stream (per-card updates)
- [ ] Status workflow + history
- [ ] Filter tabs, date picker
- [ ] Audio chime (repeating, gesture unlocked)
- [ ] Push token registration

## M5 — Admin
- [ ] Product CRUD + bulk variant paste
- [ ] CSV/XLSX import/export
- [ ] Marketing programs
- [ ] Vouchers + redemption history
- [ ] Member overview

## M6 — Olsera POS integration (blocked: no credentials)
- [ ] sync products from Olsera
- [ ] push order to Olsera
- [ ] poll order status
- [ ] push customer
