# Whiffletree — Cart & Checkout Redesign Spec

> Living design document. Captures the UX best practices, business logic, and open
> decisions for the cart/checkout rework so nothing is lost during the build.
> Status: **research / design phase — do not code until client sign-off.**
> Last updated: 2026-07-06.

---

## 1. Context

- **Platform:** WordPress + WooCommerce (live site, separate from the static HTML repo in this workspace).
- **Business:** bare-root fruit trees & shrubs. Highly **seasonal** — 6,000–7,000 orders over a few months.
- **Fulfillment:** local **pickup** (limited people/day) + **shipping** (CFIA restrictions: no shipping outside Canada; no fruit trees / grape vines to BC).
- **Existing promo:** spend-based "You are $X away from a 10% discount" (threshold ≈ $500).

### Client requirements
1. Cart/checkout "as easy as possible" — best practices, visual cleanliness, clear grouping, cover all scenarios.
2. **Fast login (Google)** AND **guest checkout / no registration**.
3. **Pickup scheduler embedded in checkout** (confirmed: part of checkout, not a separate app or account-only). Limited pickups/day → day/slot capacity.
4. **Add-to-existing-order** so a customer can add items to an unfulfilled order weeks later (already exists in a rough form; being reworked — see §6).
5. **Pollination check** in the cart (relationship logic between products — see §7).

### Current live-flow pain points (from client screenshots)
- Checkout **forces login — no guest checkout** ("You must be logged in to checkout").
- Floating black "$X away from discount" badge **overlaps** cart & mini-cart content.
- Mini-cart subtotal renders **blank**.
- Cart totals **poorly grouped** (huge empty left column; totals cramped on the right).
- Two-step **"Calculate shipping"** friction.
- Weak **button hierarchy** (thin red outline CTAs, low contrast).
- **"Add to Existing"** is buried as a plain paragraph of text — undiscoverable.
- No pickup-date scheduler in the UI yet.

---

## 2. Cart — best practices (chosen)

Grounded in Baymard: ~70% cart abandonment; checkout UX changes alone can lift conversion up to ~35%.

1. **Rich line items** — photo, name, **variety / rootstock**, unit price, qty stepper (− / +), line subtotal, remove + save-for-later. Variety & rootstock must be visible in-row (nursery-specific).
2. **Price transparency, no surprises** — subtotal, discounts, estimated tax/shipping shown *before* checkout. Unexpected fees are the #1 abandonment cause.
3. **Discount progress bar** — keep the "$X away from 10%" mechanic but as an **inline visual progress bar**, not a floating overlay that covers content.
4. **Sticky order summary** — totals + primary CTA always visible (right rail on desktop, pinned bar on mobile).
5. **Two actions, clear hierarchy** — primary `Proceed to Checkout` (solid accent); secondary `Continue Shopping` (quiet). Express pay (Google Pay / PayPal) as a fast lane.
6. **Pollination banner lives here** (§7) — cart = the natural "review before you order" moment.
7. **Smart cross-sell "add a pollinator"** — recommend a *compatible* pollinator, not generic "related products" (ties to §7).
8. **Empty state + persistent cart** — friendly empty state; cart persists across sessions (seasonal returning buyers).
9. **Cleanliness & grouping** — one "items" block, one "summary" block, generous whitespace, no stacked banners.

---

## 3. Checkout + login — best practices (chosen)

Baymard core rule: **guest checkout must be the most prominent option** (62% of sites fail this).

1. **Guest checkout by default** — show the form immediately, not a Login|Register wall. Offer optional account creation at the *end* (one-click, password set later).
2. **Fast sign-in, unobtrusive:**
   - **Social login: Google + Apple + Facebook** (OAuth) — 1-click account for those who want order history (needed for add-to-order, §6). Sits alongside guest email-only, never blocks guests.
   - **Express checkout:** Apple Pay + Google Pay (confirmed) + PayPal — pull address & payment from wallet, work for guests.
   - Fit: Nextend/Social Login for OAuth providers + Stripe / express wallets.
3. **One screen, grouped sections** (accordion or single-page): Contact → Pickup/Shipping → **Scheduler (§5)** → Payment → Review. Single column on mobile.
4. **Minimum fields** — hide shipping address when pickup is selected; don't ask for what isn't needed.
5. **"Pickup/Delivery Date", not "Delivery Speed"** (Baymard) — maps directly onto the scheduler.
6. **No complex password rules** at pay time (65% of sites get this wrong) — account created quietly via Google or magic-link.
7. **Trust signals & policies** on the page (CFIA restrictions, clearance warranty) — brief, in-context, no surprises.

### Resolving "guest vs. account for add-to-order"
- First order can be placed **guest / email-only** — fast, as requested.
- Identity for later "add to order" is provided quietly via **Google 1-click** or **guest + magic-link** (order-history access by email link, no password).
- Not "either/or" — a smooth ramp: fast start for everyone, full account appears silently for those who want to add later.

---

## 4. Button & visual hierarchy notes
- Primary CTA = solid accent, high contrast. Secondary = quiet/outline. Avoid the current thin red-outline primary buttons.
- Kill floating overlays that cover content (discount badge). Inline it.
- Auto-resolve shipping cost where possible; avoid the manual "Calculate shipping" step.

---

## 5. Scheduler in checkout — **DECISION: B (custom module)**

Confirmed by client: scheduling is **part of the checkout process**. Business needs hard per-day capacity (limited people/day for pickup) at the scale of 6–7k orders.

**Decision:** Build a **custom scheduler module** (Option B), not an off-the-shelf plugin (Option A).
- **Why B:** full control of UX, and tight coupling to add-to-order (§6) and pollination (§7) — off-the-shelf plugins can't flex to the seasonal + linked-order + pollination specifics.

**Design:**
1. Step **"Choose your date"** inside checkout, after selecting fulfillment method and **before payment**. Order can't complete without a chosen date/slot. (Label adapts: "pickup day" for pickup, "ship date" for shipping.)
2. **Capacity calendar:**
   - each day has a limit (N orders/day, or K slots × M orders);
   - **full days auto-disabled** (greyed, non-clickable);
   - optional time windows (e.g. 9–12, 12–15) with their own limits.
3. **Cutoff rules** — disable today/tomorrow; minimum lead time (trees need to be dug/prepped).
4. **Seasonal windows** — scheduler active only during pickup seasons (spring/fall); closed off-season.
5. **Soft-hold** the slot during checkout so two buyers don't grab the last spot simultaneously.
6. **Confirmation + reminders** — chosen day in confirmation email, "My Account", ICS calendar file, day-before reminder.

**Both pickup AND shipping go through the calendar** (client decision). Today the ship date is set **manually via fields** — the scheduler replaces that manual step for both fulfillment methods:
- **Pickup** → customer picks a pickup day/slot, capacity = limited people/day.
- **Shipping** → customer picks a ship date from the calendar, capacity = how many orders can be packed/shipped per day (likely a different limit than pickup).
- Both are capacity-controlled with auto-blocking of full days; limits configurable per method.

**Data (custom):** own capacity table (date/slot → method, limit, booked count).

**Capacity pool — needs discussion.** The essence: when there is both pickup and delivery on the same date — are they counted together or separately?
- **One common pool:** e.g. "30 orders/day total" (pickup + shipping both eat out of these 30).
- **Two separate pools:** e.g. "10 pickups + 20 shipments/day" separately.

Why it matters: pickup = people physically come (limited by parking/personnel at pickup), delivery = how many orders they manage to pack. Different bottlenecks, so most likely two separate counters — but agree the real per-day limits with the client.

---

## 6. Add-to-existing-order — **model: auto-link at checkout**

**Already exists (rough):** current site supports "Add to Existing" — combine multiple orders into one shipment; the added order **inherits the ship date** of the initial order; **cannot** add to an order whose ship date is **< 14 days** away. Problem: it's a buried manual flow (log in → find your order → click "Add to Existing") that users don't discover.

**Chosen model (per client) — automatic linking, no manual "find your order" step:**
1. Customer places an order → gets an **order identifier** tied to their identity (email / account).
2. Customer shops again later and checks out **normally**.
3. **System auto-detects** an existing **open (unfulfilled) order** for that customer and **links the new order into it** — the new order **inherits the same ship/pickup date** and travels in the **same shipment**.
4. If the previous order is **already fulfilled** (shipped / picked up) → the new one is simply a **separate new order**.
5. **No CRM exists** → the linkage IS the lightweight substitute: orders are grouped into a **"shipment group"** keyed by customer + ship date, so whoever packs sees the grouped orders and combines them.

**Refinements to lock in (recommended):**
- **Confirm, don't silently merge.** At checkout, if an eligible open order exists, prompt:
  *"You have an order shipping on [date]. Add these items to that shipment, or place a separate order?"* — default = add (saves shipping), but let them choose (a customer may deliberately want a separate/later shipment).
- **Keep the 14-day cutoff.** If the open order's ship date is < 14 days out → not eligible → new order.
- **Payments stay per-order.** "Linking" is metadata (shared ship date + shipment group), **not** a re-charge of the original order. Each checkout is its own WooCommerce transaction. This matches the existing "inherit ship date" behavior and avoids the WooCommerce limitation that paid orders can't easily be topped up.
- **Guest support via email match.** Auto-detect works for guests by matching email (with the same confirmation prompt), so this doesn't force login.
- **Automatic, not manual-by-manager.** Detection/linking should happen in the system at checkout — relying on a human "manager" to merge won't scale to 6–7k orders. (Client wording mentioned a manager; recommend system-automatic.)
- **Account cabinet** shows the linked group: combined shipment, the shared ship date, and the added items — so status is clear without hunting.
- **Capacity sync (pickup, §5):** linking into an existing pickup day does **not** consume a new slot (same pickup). Only a genuinely new/separate order consumes capacity.

**Definition of "open/eligible" order:** status = not yet shipped/picked up **AND** ship/pickup date ≥ 14 days out.

---

## 7. Pollination check (cart)

Client vision: pollination data stored **per product** + **relationship logic** between products; automated; "just understanding relationships between products."

**Where it lives:** hybrid, source-of-truth in the **cart** as an inline "review before you order" moment (banner/card), with the **same engine** exposed to the AI advisor (already embedded on 3 pages) so it can answer in conversation. One compatibility engine → two surfaces.

**Per-variety data — proposed canonical schema.** No exact backend format exists yet (client), so this is our **logical schema** derived from the requirements & horticultural context; we map/confirm it once the backend format lands. Fields needed on each product:
| Field | Example | Purpose |
|---|---|---|
| `self_fertile` | true / false / partial | self-fertile need no partner |
| `bloom_group` | 1–5 (early→late) | partner must overlap in bloom |
| `species` | apple / pear / plum… | pollinate only within species |
| `ploidy` | diploid / **triploid** | triploids don't pollinate others → need **2 pollinators** |
| `incompatibility_group` | S-groups (cherries/plums) | same S-group can't pollinate each other |
| `pollenizer_for` / `compatible_with` | relationships | manual exceptions / recommendations |

**Check logic:**
1. Group cart items by `species`.
2. For each non-self-fertile item, find a compatible pollinator in the cart: species match + `bloom_group` overlap (±1) + different `incompatibility_group` + not both triploid.
3. If none → flag + **recommend a specific compatible variety** (ties to cross-sell §2).
4. Special cases: triploid → require ≥2 compatible diploids; cherries/plums → S-group check.

**Data source (client decision):** the per-variety pollination data **comes from the backend** — each product already carries it. The frontend/engine **consumes** these fields; we do NOT compile or maintain the dataset. So our scope = the **compatibility rule engine + cart banner + advisor surface**, reading backend-provided fields.

Concept is not hard (data provided on product + rule engine on top).

### AI cart review (client comment)
> *"Potential for an AI review that checks the cart for the pollination review and makes sure there are no conflicts with what the customer is ordering."*

- A **pre-order AI review** step that scans the whole cart and confirms there are **no pollination conflicts** with what the customer is ordering — a "we checked your order for you" moment before checkout.
- **Recommended architecture: deterministic engine + AI layer.**
  - The **rule engine** (above, on backend fields) does the actual conflict detection — deterministic, accurate, testable. This is the source of truth for pass/fail.
  - The **AI layer** turns the result into **plain-language review + guidance**: explains *why* there's a conflict and **recommends the specific compatible variety(ies)** to add (ties to cross-sell §2). This is also what the embedded AI advisor surfaces in conversation.
  - Rationale: never let a probabilistic model decide horticultural correctness on its own — ground it in the rule engine so recommendations are trustworthy.
- **UX:** cart shows a clear status — ✅ "Your order is pollination-ready" or ⚠️ "1 variety needs a pollinator" with the fix inline. Non-blocking (customer may proceed anyway), but visible and actionable.
- Runs at the cart/"review before you order" moment (§2.6); the same engine result is reusable at checkout and in the advisor.

---

## 8. Scenarios & edge cases (client asked to "cover all scenarios")

**Cart / product mix**
- **Mixed cart — seasonal vs. immediate items.** Trees ship in a spring/fall window; supplies (tools, books, sea salt) can ship anytime. **Decision: always try to combine into one shipment/date where possible** (default). Split only when combining is impossible/undesirable. Surface the trade-off clearly (the immediate item waits for the tree window if combined) and offer split as the fallback. Reflected in scheduler + cart.
- **Mixed fulfillment** — some items pickup-only, some shippable. Handle per-item eligibility; don't let an invalid combo reach payment.
- **Out-of-stock during checkout** — item sells out between add-to-cart and pay. Re-validate stock at each step; show a clear, non-destructive message.
- **Quantity limits** — per-variety caps (nursery stock is finite); enforce in cart with a clear reason.

**Regional / legal restrictions (CFIA)**
- **No shipping outside Canada; no fruit trees / grape vines to BC.** Enforce by (product category × destination) at address entry — block or warn *before* payment, not after. Offer pickup as the fallback where shipping is blocked.
- Show restriction reasons in plain language; keep clearance warranty notice visible.

**Scheduler edge cases**
- **Slot fills during checkout** — soft-hold covers the active session; if hold expires, prompt to re-pick with a clear message (never silently drop the order).
- **No dates available** (season closed / all full) — graceful state + waitlist or "notify me" instead of a dead end.
- **Cutoff crossed mid-session** — if the < 14-day / lead-time boundary is crossed while the user lingers, re-validate on submit.

**Add-to-Existing edge cases**
- Multiple open orders for one customer → let them choose which to add to (or newest by default).
- Open order's date changes/fills after linking → re-validate the linked group's shared date.
- Guest with same email as an existing account → match carefully; avoid merging strangers who share a typo'd email (confirm via the email link).

**Payment / coupon**
- **Payment failure / retry** — keep the cart, slot hold, and entered data; don't force a restart.
- **Coupon + threshold discount interaction** — define whether the "$X → 10%" auto-discount stacks with coupon codes; show the applied result transparently.
- **Abandoned cart** — recovery email (70% abandon); persist cart to enable it.

---

## 9. Cross-cutting concerns

- **Mobile-first / responsive** — cart and checkout must be flawless on mobile (single column, pinned summary + CTA, thumb-friendly qty steppers, native date picker feel for the scheduler). Most traffic is likely mobile.
- **Accessibility (WCAG 2.1 AA)** — labelled form fields + inline error messages, keyboard-navigable calendar/scheduler, sufficient contrast (fixes the current thin-outline CTA issue), focus management across steps, screen-reader announcements for cart/slot updates.
- **Payments** — confirm gateway (Stripe likely; support cards + **Interac** as a Canadian expectation). **Express wallets Apple Pay + Google Pay = confirmed** (fast lane, guest-friendly, autofill address/payment). Per-order charge model (aligns with add-to-order §6).
- **Concurrency at seasonal peak** — 6–7k orders in a burst means many buyers hitting the same popular dates at once. Slot capacity counting must be **atomic** (DB-level), with soft-hold + final re-check on submit to prevent overbooking.
- **Post-purchase** — clear confirmation page + email: order summary, chosen date, pickup/shipping instructions, ICS calendar file, and how to use Add-to-Existing. Order status visible in account cabinet.
- **Performance** — cart/checkout pages fast under load; avoid blocking synchronous calls (e.g. the current manual "Calculate shipping" round-trip).
- **Analytics** — funnel tracking (cart → checkout → date → pay) to measure the abandonment the redesign targets.

---

## 10. Open questions / decisions log

**Decisions locked:**
- ✅ Scheduler = **custom module (Option B)**.
- ✅ **Both pickup AND shipping go through the calendar.** Ship date is currently set **manually via fields** — the scheduler replaces this manual step; each method has its own capacity limit.
- ✅ Add-to-order = **auto-link at checkout** (system-automatic, confirm-don't-silently-merge, 14-day cutoff, per-order payments, shipment-group linkage). No CRM — linkage is the substitute. **Keep the existing logic as-is** (14-day cutoff, inherit ship date) — reworking UX/discoverability only, not the rules.
- ✅ **Guest checkout** — first order is **email-only, no account required**; upsell to Google / account creation specifically so the customer can use **Add to Existing** later. Add-to-order auto-detect works for guests by email match.

- ✅ **Pollination data comes from the backend** — each product carries the fields; we consume them. Our scope = rule engine + cart banner + advisor surface, not data compilation.
- ✅ **Express wallets: Apple Pay + Google Pay** enabled (fast lane in cart & checkout, work for guests, pull address + payment from the wallet). Per-order charge model (aligns with add-to-order §6).
- ✅ **Social logins enabled** — Google + Apple + Facebook sign-in (in addition to guest email-only). Fast 1-click identity that also enables Add-to-Existing (§6).
- ✅ **Custom checkout** (not extended-native WooCommerce). Built to our project build rules (`ebms-design`: self-contained HTML review file with `data-comment` attributes, design tokens in `:root`, mobile-first Tailwind breakpoints, React-ready → later React + Tailwind + shadcn) **and** all best practices recorded in this document. Custom is required for the three unique features (scheduler, add-to-order, pollination).
- ✅ **Mixed seasonal cart (§8): always try to combine into one shipment/date where possible** (default). Split only when combining is impossible/undesirable per constraints. Trade-off to surface: combining a spring-shipping tree with an immediate item means the immediate item waits for the tree window — show this clearly; offer split as the fallback.

**Open:**
1. **Capacity pool — needs discussion (see §5).** When there is both pickup and delivery on the same date — are they counted together or separately? One common pool ("30 orders/day total") vs. two separate pools ("10 pickups + 20 shipments/day"). Pickup and delivery are different bottlenecks (people arriving vs. orders to pack), so likely two — but agree the real per-day limits with the client.
2. **Pollination fields shape:** no exact backend format yet → we define a **logical/canonical schema** (the §7 field table) per requirements & context; map/confirm when the backend format lands.

---

## 11. Sources (best practices)
- Baymard Institute — Checkout UX best practices: https://baymard.com/blog/current-state-of-checkout-ux
- WooCommerce schedulers (reference for capacity behavior): Delivery & Pickup Scheduler, CodeRockz Delivery & Pickup Date Time, Iconic Delivery Slots, Local Pickup Plus.
- Add product to order after purchase (WooCommerce limitations): Business Bloomer; WooCommerce "After the Order" docs.
- Social login / guest checkout: WooCommerce Social Login; Nextend Social Login; Cloudways guide.
