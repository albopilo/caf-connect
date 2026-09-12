# Café Connect

626f6c742d63632d6167656e74Let me review a few more key files to ground the updated plan in your actual business rules.I have enough context from all the files I've read. Here's the complete updated plan.

---

## How I Would Build the New Project

### Architecture Overview

```

Frontend:  Vite + React + TypeScript + Tailwind CSS + React Router

Backend:   Supabase (Postgres, Auth, Realtime, Storage, Edge Functions)

External:  Olsera Open API (product sync, order push, customer sync)

```

The app has three surfaces, each behind proper authentication:

**Customer surface** (no login to browse, login for loyalty):

- Menu page with category tabs, product cards, variant selection modals

- Cart with promo detection (buy X get Y), localStorage persistence, 1-hour session

- Checkout with server-computed totals (subtotal, member discount, tax, delivery fee, total)

- Payment selection: Cash or QRIS (QRIS-only for Mille 1/2/3 tables)

- QRIS flow: QR display, payment proof upload to Supabase Storage

- Member registration (name, email, phone, birthdate, password)

- Member login (email/password via Supabase Auth)

- Operational hours notice popup; closed message on Mondays

**Staff surface** (staff role required):

- One unified dashboard with location filter (All, Mille 1, Mille 2, Mille 3, Main Kitchen)

- Real-time order stream via Supabase Realtime (updates individual cards, not full re-render)

- Status workflow: pending → preparing → served / cancelled

- "Served" action triggers server-side loyalty accrual and tier recalculation

- "Cancelled" action reverses any loyalty already recorded

- Audio chime with repeating alert, gesture-unlocked autoplay

- Date picker to view historical orders

- Push notification registration

- Contact guest via tel: and WhatsApp links

**Admin surface** (admin role required):

- Product management (CRUD, bulk variant paste, CSV/XLSX import/export, photo URLs, hide toggle)

- "Sync from Olsera" button to pull product catalog from Olsera API

- Marketing programs (buy X get Y promos)

- Voucher management (percent/fixed, daily limits)

- Member overview (view tiers, spending, adjust points)

### Olsera Integration Points

All Olsera API calls happen in Supabase Edge Functions, never in the browser:

| Integration | Direction | Mechanism |

|---|---|---|

| Product sync | Olsera → Supabase | Admin clicks "Sync from Olsera" → edge function calls Olsera `GET /products` → upserts into `products` table |

| Order push | Supabase → Olsera | `create-order` edge function saves order to Supabase, then pushes to Olsera `POST /orders` so it appears in the POS |

| Order status | Olsera → Supabase | Scheduled edge function (cron) polls Olsera for status changes, or Olsera webhook calls a Supabase edge function |

| Customer sync | Supabase → Olsera | When member registers or tier changes, edge function pushes to Olsera `POST/PUT /customers` |

Olsera credentials stored as Supabase Edge Function secrets:

- `OLSSERA_API_TOKEN`

- `OLSSERA_MERCHANT_ID`

- `OLSSERA_API_BASE_URL`

### Database Schema

```

products

  id (uuid, PK)

  name, category, variant_label, variant_names (text[])

  pos_sell_price (integer)

  pos_hidden (boolean)

  photo_1 .. photo_10 (text)

  olsera_id (text, nullable) — links to Olsera product ID for sync

  created_at, updated_at

marketing_programs

  id (uuid, PK)

  type (text) — 'buy_x_get_y'

  active (boolean)

  buy_product_ids (uuid[])

  free_product_id (uuid)

  free_qty (integer)

  free_variant (text, nullable)

members (extends auth.users)

  user_id (uuid, FK to auth.users, PK)

  phone, email, name, birthdate

  tier (text) — Classic/Bronze/Silver/Gold

  discount_rate (numeric)

  tax_rate (numeric)

  redeemable_points (integer)

  spending_since_upgrade (integer)

  monthly_since_upgrade (integer)

  yearly_since_upgrade (integer)

  upgrade_date (date, nullable)

  created_at

orders

  id (uuid, PK)

  member_id (uuid, nullable)

  table_name (text)

  items (jsonb)

  subtotal, discount, tax, delivery_fee, total, grand_total (integer)

  status (text) — pending/preparing/served/cancelled

  payment_method (text) — cash/qris

  payment_status (text) — awaiting-proof/paid/none

  proof_url (text, nullable)

  voucher_id (uuid, nullable)

  date (date)

  loyalty_recorded (boolean)

  loyalty_tx_id (uuid, nullable)

  phone (text, nullable)

  is_member (boolean)

  olsera_order_id (text, nullable) — ID returned by Olsera on push

  created_at

order_status_history

  id (uuid, PK)

  order_id (uuid, FK)

  status (text)

  changed_by (uuid)

  changed_at (timestamptz)

vouchers

  id (uuid, PK)

  code (text, unique)

  type (text) — percent/fixed

  value (numeric)

  limit_per_day (integer)

  active (boolean)

voucher_redemptions

  id (uuid, PK)

  voucher_id (uuid, FK)

  order_id (uuid, FK)

  table_name (text)

  redeemed_at (timestamptz)

loyalty_transactions

  id (uuid, PK)

  member_id (uuid, FK)

  order_id (uuid, FK)

  amount (integer)

  cashback (integer)

  points_earned (integer)

  source (text)

  table_name (text)

  created_at (timestamptz)

staff_push_tokens

  id (uuid, PK)

  user_id (uuid)

  token (text)

  role (text)

  created_at

admins

  user_id (uuid, PK)

```

### Edge Functions

| Function | Purpose |

|---|---|

| `create-order` | Validates cart, looks up product prices from DB, computes subtotal/discount/tax/delivery/total, inserts order, pushes to Olsera, sends push to staff |

| `apply-voucher` | Atomically checks daily limit, applies discount, records redemption |

| `mark-order-status` | Updates status; if "served" records loyalty + recalculates tier; if "cancelled" reverses loyalty |

| `upload-payment-proof` | Receives image, stores in Supabase Storage, updates order |

| `register-push-token` | Stores staff device token with role |

| `sync-olsera-products` | Pulls product catalog from Olsera, upserts into products table |

| `push-olsera-order` | Pushes order to Olsera POS (called by create-order) |

| `sync-olsera-status` | Scheduled function to poll Olsera for order status changes |

### RLS Policies

- **products**: public read (where `pos_hidden = false`), admin write all

- **orders**: customer reads own (by `member_id`), staff reads all, inserts only via `create-order` edge function (service role)

- **members**: user reads/updates own profile, admin reads all

- **vouchers**: public read code+active only, admin write, redemptions via edge function only

- **marketing_programs**: public read active, admin write

- **loyalty_transactions**: user reads own, admin reads all, writes via edge function only

- **admins**: user reads only own row (to check if they're admin)

---

## Ultimate Goals

1. **Every price is computed server-side.** The client sends a cart (product IDs + quantities); the edge function looks up prices, applies member discount, adds tax and delivery fee, returns the final total. No client-computed number ever reaches the database.

2. **Every data path is authorized server-side.** Supabase RLS on every table, per-verb policies. Admin access from an `admins` table checked via RLS, not client-side JavaScript. No service-role keys in the browser, ever.

3. **One codebase, not twelve.** One React app, one router, one shared Supabase client. Location differences are a URL parameter, not a separate HTML file. Config lives in one file, not copy-pasted across every page.

4. **Real authentication.** Supabase Auth with email/password. No phone-only login. Staff and admin roles assigned via database tables, not client-side checks.

5. **Olsera as the POS source of truth.** Products sync from Olsera. Orders push to Olsera. The café staff sees orders in both the web dashboard and their existing Olsera POS without double entry.

6. **Real-time without DOM destruction.** Supabase Realtime subscriptions update individual order cards in place. No wiping and re-rendering the entire list on every snapshot.

7. **No XSS surface.** React JSX escapes everything by default. No `dangerouslySetInnerHTML`. No `innerHTML` with user data.

8. **Premium, café-appropriate design.** Warm tones (espresso brown, cream, sage green). Mobile-first from 320px. Subtle animations, hover states, toast notifications. No purple/violet.

---

## Objectives

| # | Objective | Verification |

|---|-----------|-------------|

| 1 | No API keys or service-role keys in client bundle | Grep built client code for `secret`, `service_role`, `apikey` — zero hits |

| 2 | Every table has RLS enabled with 4 per-verb policies | `get_security_posture` confirms policies on all tables |

| 3 | Order totals computed in edge function, not client | `create-order` function source shows price lookup from DB |

| 4 | Staff/admin actions require authenticated session with correct role | RLS policies check `auth.uid()` against role tables |

| 5 | No `dangerouslySetInnerHTML` anywhere | Grep source for `dangerouslySetInnerHTML` — zero hits |

| 6 | Single staff dashboard handles all locations | One route `/staff?location=mille1`, not 4 HTML files |

| 7 | Voucher redemption is atomic and idempotent | Edge function uses DB transaction; double redemption rejected |

| 8 | Push notifications target staff only | Token table has `role` column; edge function filters by `role = 'staff'` |

| 9 | Olsera product sync works | Admin clicks sync, products table updates from Olsera API response |

| 10 | Olsera order push works | `create-order` function pushes to Olsera and stores returned `olsera_order_id` |

| 11 | Build passes with zero TypeScript errors | `npm run build` exits 0 |

| 12 | Responsive at 320px, 375px, 768px, 1024px | Browser test at each breakpoint |

| 13 | No `Date.now()` used as an ID | Grep source for `Date.now()` — not used for IDs |

| 14 | No writes inside real-time subscription callbacks | Subscription handlers only update React state, never call Supabase writes |

---

## What to Avoid

1. **Trusting client-computed prices** — the single biggest flaw in the current system. Server recomputes everything.

2. **Phone-only authentication** — anyone who knows a phone number gets full access. Use email/password.

3. **`innerHTML` with unescaped data** — the XSS vector in the current Mille staff pages. React eliminates this.

4. **Duplicated configuration** — one `supabase.ts` client, not copy-pasted config in 12 files.

5. **Hardcoded API keys in client code** — ImgBB, Olsera, OneSignal keys all live in edge function secrets.

6. **Timestamp-based IDs** — use UUIDs.

7. **Write-on-read in real-time listeners** — never write to the database inside a subscription callback.

8. **Three identical staff pages** — one page with a location parameter.

9. **Monolithic files** — no 2,300-line JavaScript files. Split by responsibility.

10. **Purple/violet color schemes** — use warm café tones.

11. **Premature abstraction** — build exactly what 13e Café needs, not a generic framework.

12. **`Date.now()` as member ID** — use Supabase auto-generated UUIDs.

13. **Push to all devices indiscriminately** — filter by staff role.

14. **No rate limiting on order creation** — add basic rate limiting in the edge function.

---

## Prompt for Bolt.new

---

**Prompt:**

Build a café ordering, loyalty, and POS integration system called "13e Café". Full-stack web app for a real café with multiple locations (Mille 1, Mille 2, Mille 3, and main kitchen).

**Tech stack:** Vite + React + TypeScript, Supabase (Postgres, Auth, Realtime, Storage, Edge Functions), Tailwind CSS, React Router.

**Design:** Warm café aesthetic — cream backgrounds (#FAF6F0), espresso brown accents (#3E2723), sage green for success (#558B6E), warm amber for warnings (#D4A017), muted red for errors (#B23A48). Typography: use a clean sans-serif for body and a slightly rounded display font for headings. Mobile-first responsive from 320px to desktop. Premium feel with subtle animations: hover transitions on cards, toast notifications that slide in, modal fade-in, cart item highlight pulse. No purple, indigo, or violet colors.

**Three user roles:**

**1. Customers** (no login to browse, login required for loyalty):

- Menu page with category tabs in this preferred order: Special Today, Snacks, Western, Ricebowl, Nasi, Nasi Goreng, Mie, Matcha, Coffee, Non coffee, Tea & Juices. Products grouped by name with aggregated variants. Product cards show photo, name, price (from lowest variant), and "Add to cart" or "Select variation" button.

- Variant selection modal: scrollable list of variant buttons showing "Variant name — Rp{price}". Add search input when more than 12 variants. For free promo items, show "Rp0" and a green note "This item is included for free with your order."

- Cart: persisted in localStorage with 1-hour TTL for guests (no expiry for logged-in members). Items show name, variant, price, quantity controls (+/-), and clickable name to change variant. Promo free items are marked.

- Automatic "buy X get Y" promo detection: when customer adds a qualifying product, the free item is automatically added to cart at Rp0. If the free item has variants, show a variant selector modal. Promo items are linked by a promoLinkId so removing the buy item also removes the free item.

- Checkout: cart summary showing subtotal, member discount (based on tier), tax (10%), delivery fee (Rp5,000 for Mille 1 and Mille 3 tables, Rp0 for others and takeaway), and grand total (rounded to nearest Rp100). ALL TOTALS COMPUTED SERVER-SIDE via edge function.

- Payment method selection: Cash or QRIS. Mille 1, Mille 2, and Mille 3 tables are QRIS-only (hide cash option). Other tables and takeaway allow both.

- QRIS flow: show QR code image, customer uploads payment proof photo (stored in Supabase Storage), order payment_status set to "awaiting-proof".

- Member login via Supabase Auth email/password. Member registration: name, email, phone, birthdate, password. Phone normalized to Indonesian format (strip +62, leading 0).

- Loyalty tiers: Classic (0% discount, 0% cashback), Bronze (10% discount, 5% cashback), Silver (15% discount, 7% cashback), Gold (20% discount, 10% cashback, elevated cashback on birthday).

- Cashback points accrue when staff marks order as "served". Tier upgrades based on spending thresholds. Tier can downgrade if spending drops.

- Session timeout: 1 hour of inactivity clears cart and session.

- Operational hours: Sunday–Friday 08:30–19:30, Saturday 08:30–21:30, Monday closed. Show hours popup on page load. On Mondays, show closed message and hide ordering interface.

- Table number from URL parameter: `?table=Mille-1` etc.

**2. Staff** (login required, staff role):

- ONE unified dashboard (not separate pages per location). Location filter: All, Mille 1, Mille 2, Mille 3, Main Kitchen.

- Real-time order stream via Supabase Realtime. Updates individual order cards in place — do NOT wipe and re-render the entire list on every update.

- Order cards show: table number, items (quantity × name, variant), total, payment method, payment status, time elapsed since order, guest phone (clickable tel: and WhatsApp links).

- Status workflow: pending → preparing → served / cancelled. Status buttons with color-coded badges.

- "Served" action: triggers edge function that records loyalty cashback for member orders and recalculates tier. "Cancelled" action: edge function reverses any loyalty already recorded.

- Filter tabs: All, Incoming (pending + preparing), Served, Cancelled.

- Date picker to view orders for any day.

- Audio chime: plays on new order. Repeating chime every 5 seconds until staff dismisses. Browser autoplay unlocked on first user gesture. QRIS awaiting-proof orders play a single chime; others repeat.

- Push notification registration for staff devices.

- When staff page opened with `?orderId=X` parameter, stop repeating chime for that order.

**3. Admin** (login required, admin role):

- Product management: create, edit, delete products. Fields: name, category, variant_label, variant_names (array), pos_sell_price, pos_hidden toggle, photo_1 through photo_10 (URL inputs with Google Drive URL normalization). Bulk add: paste "Variant | Price" lines to create multiple product rows at once. Import from CSV, export to XLSX.

- "Sync from Olsera" button: calls edge function that pulls product catalog from Olsera Open API and upserts into products table. Products get an `olsera_id` field for linking.

- Marketing programs: create "buy X get Y" promos. Select buy products (multi-select), free product, free quantity, free variant (optional), active toggle.

- Voucher management: create vouchers (percent or fixed value, daily redemption limit, active toggle). View redemption history.

- Member overview: view all members, their tiers, spending, points. Search by name or phone.

- Product search/filter by name, variant, category.

- Cache invalidation button.

**Olsera POS integration (via edge functions only, never in browser):**

- Product sync: edge function calls Olsera API `GET /products` endpoint, maps fields, upserts into Supabase products table. Admin triggers manually via "Sync from Olsera" button.

- Order push: `create-order` edge function, after saving order to Supabase, calls Olsera API `POST /orders` to push the order to the café's POS. Stores returned `olsera_order_id` on the order record.

- Order status sync: scheduled edge function (cron) polls Olsera for order status changes and updates Supabase orders accordingly. Alternatively, if Olsera supports webhooks, a public edge function receives status callbacks.

- Customer sync: when a member registers or their tier changes, an edge function pushes the customer record to Olsera.

- Olsera API credentials stored as Supabase Edge Function secrets: `OLSSERA_API_TOKEN`, `OLSSERA_MERCHANT_ID`, `OLSSERA_API_BASE_URL`.

**Security requirements (critical):**

- All order totals, discounts, tax, and delivery fees computed server-side in the `create-order` edge function. Client sends cart items (product IDs + quantities) and member ID. Server looks up product prices from DB, computes subtotal, applies member discount based on tier from members table, adds 10% tax, adds delivery fee based on table name, rounds to nearest Rp100, returns final total. Never trust client-sent prices.

- Supabase RLS on every table. Four per-verb policies (SELECT, INSERT, UPDATE, DELETE) per table. Customers read only their own orders and profile. Staff read all orders. Admins manage products and programs. Voucher redemptions and loyalty transactions happen via edge functions (service role) only — no direct client inserts.

- No API keys, service-role keys, or Olsera credentials in client code. All privileged operations go through edge functions.

- Admin access determined by `admins` table (user_id allowlist), checked via RLS, not client-side JavaScript.

- No `dangerouslySetInnerHTML` anywhere. All user content renders through JSX.

- Basic rate limiting on order creation in the edge function (max 5 orders per table per 10 minutes).

**Database tables (create via Supabase migrations with RLS):**

- `products` — id (uuid PK), name, category, variant_label, variant_names (text[]), pos_sell_price (int), pos_hidden (bool), photo_1..photo_10 (text), olsera_id (text nullable), created_at, updated_at

- `marketing_programs` — id (uuid PK), type (text), active (bool), buy_product_ids (uuid[]), free_product_id (uuid), free_qty (int), free_variant (text nullable)

- `members` — user_id (uuid PK, FK auth.users), phone, email, name, name_lower, birthdate, tier (text), discount_rate (numeric), tax_rate (numeric), redeemable_points (int), spending_since_upgrade (int), monthly_since_upgrade (int), yearly_since_upgrade (int), upgrade_date (date nullable), created_at

- `orders` — id (uuid PK), member_id (uuid nullable), table_name (text), items (jsonb), subtotal (int), discount (int), tax (int), delivery_fee (int), total (int), grand_total (int), status (text), payment_method (text), payment_status (text), proof_url (text nullable), voucher_id (uuid nullable), date (date), loyalty_recorded (bool), loyalty_tx_id (uuid nullable), phone (text nullable), is_member (bool), olsera_order_id (text nullable), created_at

- `order_status_history` — id (uuid PK), order_id (uuid FK), status (text), changed_by (uuid), changed_at (timestamptz)

- `vouchers` — id (uuid PK), code (text unique), type (text), value (numeric), limit_per_day (int), active (bool)

- `voucher_redemptions` — id (uuid PK), voucher_id (uuid FK), order_id (uuid FK), table_name (text), redeemed_at (timestamptz)

- `loyalty_transactions` — id (uuid PK), member_id (uuid FK), order_id (uuid FK), amount (int), cashback (int), points_earned (int), source (text), table_name (text), created_at (timestamptz)

- `staff_push_tokens` — id (uuid PK), user_id (uuid), token (text), role (text), created_at

- `admins` — user_id (uuid PK)

**Edge functions (all in supabase/functions/, each with [functions.<slug>] in config.toml, verify_jwt true except for public webhooks):**

- `create-order` — receives cart items + member_id + table_name + payment_method, validates product prices from DB, computes subtotal/discount/tax/delivery/total, inserts order, pushes to Olsera API, sends push notification to staff tokens. Rate limited.

- `apply-voucher` — receives voucher code + order_id, atomically checks daily limit, applies discount, updates order, records redemption.

- `mark-order-status` — receives order_id + new_status, updates order, records status history, if "served" records loyalty cashback + recalculates tier, if "cancelled" reverses loyalty.

- `upload-payment-proof` — receives image file + order_id, uploads to Supabase Storage, updates order payment_status.

- `register-push-token` — receives token + role, stores in staff_push_tokens.

- `sync-olsera-products` — calls Olsera GET /products, upserts into products table. Admin only.

- `push-olsera-order` — pushes order to Olsera POST /orders. Called by create-order.

- `sync-olsera-status` — scheduled function polling Olsera for order status changes.

- `push-olsera-customer` — pushes member data to Olsera on registration or tier change.

**File organization:**

- `src/lib/supabase.ts` — single Supabase client

- `src/lib/types.ts` — shared TypeScript types for all DB entities

- `src/lib/cart.ts` — cart logic (add, remove, qty, promo detection, localStorage)

- `src/lib/loyalty.ts` — tier calculation, discount helpers

- `src/lib/format.ts` — currency formatting (Rp)

- `src/lib/olsera.ts` — Olsera API helper types and field mapping

- `src/components/` — ProductCard, CartItem, OrderCard, VariantModal, Toast, StatusBadge, etc.

- `src/pages/customer/` — Menu, Checkout, QRISPayment, Register, Login

- `src/pages/staff/` — StaffDashboard (handles all locations via ?location= param)

- `src/pages/admin/` — AdminPanel with tabs: Products, Promos, Vouchers, Members

- `supabase/functions/` — all edge functions

- `supabase/migrations/` — SQL migrations with RLS policies

- `supabase/config.toml` — function configurations

**What to avoid:**

- Do not trust any client-computed price, discount, or total. Server recomputes everything.

- Do not use `dangerouslySetInnerHTML` anywhere. All content through JSX.

- Do not create duplicate pages for different Mille locations. One staff page with a location filter.

- Do not hardcode any API keys, service keys, Olsera credentials, or third-party secrets in client code.

- Do not use `Date.now()` or timestamps as IDs. Use UUIDs.

- Do not write to the database inside real-time subscription callbacks. Subscriptions only update React state.

- Do not use purple, indigo, or violet color schemes. Use warm café tones.

- Do not create monolithic files. Split by responsibility into focused modules under 400 lines.

- Do not add auth unless explicitly specified — this app uses Supabase Auth email/password for members, staff, and admins.

- Do not push notifications to all devices. Filter by staff role in the token table.

- Do not skip RLS on any table. Every table gets four per-verb policies.

- Do not use `FOR ALL` in RLS policies. One policy per CRUD verb.

---

This plan preserves every business rule from the current system (tier discounts, promo logic, QRIS-only tables, delivery fees, operational hours, loyalty accrual on "served", birthday bonuses, category ordering, Google Drive photo normalization) while fixing every security issue (server-side pricing, real auth, RLS, no XSS, no exposed keys) and adding the Olsera integration layer. The key addition is that products can sync from Olsera and orders push to Olsera, so the café staff works in their existing POS without double entry.

Want me to start building this, or would you like to adjust anything first?

Build this project, save files for each edits/milestone achieved. Read out Which milestone have not been achieved.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9361d4b3-96ce-4f0d-97db-f996d64c5cf7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
