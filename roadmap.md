# 13e Café — Build Roadmap

Legend: [x] done · [ ] not done · [!] blocked

## M1 — Foundation
- [ ] Lovable Cloud enabled
- [ ] Warm café design system (cream/espresso/sage/amber) in src/styles.css
- [ ] Database schema + RLS + GRANTs for all tables
- [ ] Email/password auth enabled, roles via user_roles table

## M2 — Customer surface
- [ ] Menu page with category tabs + product cards
- [ ] Variant selection modal (search when >12 variants)
- [ ] Cart with localStorage + 1h TTL for guests
- [ ] Buy X get Y promo auto-detection
- [ ] Checkout with SERVER-COMPUTED totals
- [ ] Payment method (cash/QRIS, QRIS-only for Mille tables)
- [ ] QRIS proof upload to storage
- [ ] Member register/login, loyalty tiers display
- [ ] Operational hours notice / Monday closed

## M3 — Staff surface
- [ ] Unified staff dashboard with location filter
- [ ] Realtime order stream (in-place card updates)
- [ ] Status workflow pending→preparing→served/cancelled
- [ ] Loyalty accrual on served, reversal on cancelled
- [ ] Date picker + filter tabs
- [ ] Audio chime with gesture unlock
- [ ] Push token registration

## M4 — Admin surface
- [ ] Product CRUD + hide toggle + photos
- [ ] Bulk variant paste, CSV import / XLSX export
- [ ] Marketing programs (buy X get Y)
- [ ] Voucher management + redemption history
- [ ] Member overview

## M5 — Olsera POS integration
- [!] Product sync from Olsera (needs API credentials)
- [!] Order push to Olsera (needs API credentials)
- [!] Order status polling (needs API credentials)
- [!] Customer sync (needs API credentials)

## Notes
- Stack is TanStack Start, so server logic uses server functions instead of
  separate edge functions; same security boundary.
