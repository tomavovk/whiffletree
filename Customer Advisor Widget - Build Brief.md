# Build Brief — Customer Advisor Widget (storefront)

**Hand this whole file to the AI building it. It is self-contained.**

**Product:** Whiffletree — AI Variety Advisor, customer-facing chat widget
**Where it goes:** the existing Whiffletree e-commerce storefront (every page)
**Reference build:** `customer-advisor-widget.html` (a working mock — open it; match its look & behavior)
**Companion:** this widget is the *front-end of the advisor configured in the admin tool* (`index.html`). Persona, greeting, knowledge, product focuses, and what-it-can-see all come from there — the widget renders it, it doesn't decide it.

---

## 1. What we're building (one paragraph)

A fruit-tree store has 70+ apple varieties; shoppers are overwhelmed. We add an **AI advisor** that talks in plain language and recommends the *right* trees for the customer's region and needs. It lives on the storefront as a **launchable chat panel** that can drop **product cards** (image, name, price, Add to cart) inline. It must feel like a calm, on-brand helper — not a generic chatbot.

## 2. The pattern (decided)

- **Two entry points, same panel:**
  1. A **persistent floating launcher button** (bottom-right, every page) — green pill, tree mark, label "Ask the advisor", small accent pulse dot until first opened.
  2. A **header link** "Ask the advisor" in the main nav (sparkle icon, subtle green chip).
- **The panel is a right-side drawer** (~412px), slides in over a light scrim; the store stays visible behind. **On mobile (≤640px) the drawer is full-width.**
- **Open/close:** either entry point opens it; close via the ✕, clicking the scrim, or `Esc`. Opening focuses the input. State persists while navigating within a session (don't reset the conversation on open/close).

Do **not** use a centered modal (blocks browsing, weak on mobile) or an always-on inline section.

## 3. House style — non-negotiable

Match the **Whiffletree design system** (`design-system.html`) exactly. Do **not** introduce new colors or fonts.

- **Type:** Cormorant Garamond (headings/product names), Mulish (body & UI). Phosphor icons.
- **Tokens (use these CSS custom properties):**
  ```
  --display:"Cormorant Garamond",Georgia,serif;  --sans:"Mulish",ui-sans-serif,system-ui,sans-serif;
  --g900:#063d22; --g800:#0a4a29; --g700:#006837; --g600:#138a45; --g300:#7fa98c; --g100:#e2f0e5; --g050:#eff7f0;
  --paper1:#f4ead9; --paper2:#ebdfc8; --page:#f7f5ee;
  --ink:#15140f; --ink2:#262521; --muted:#57544e; --subtle:#939089; --line:#d8c9ac; --line-soft:#e8dcc4;
  --accent:#c0392b; --accent-deep:#9e2c20; --success:#1c7a45; --warning:#b5772a;
  ```
- **Roles:** forest green `--g700` = the advisor / primary path. Brick red `--accent` = **Add to cart only**. Dark green `--g900` = drawer header. Cream `--page`/`--paper1` = surfaces.
- **Radius:** 4px default (buttons, cards, inputs, badges); pill for the launcher, chips, and the send button.
- **Tone:** warm, editorial, calm. Generous spacing inside the panel.

## 4. Build conventions (the `ebms-design` rules this repo uses)

- **Self-contained:** one approach — inline CSS/JS, no local external files. Google Fonts + Phosphor via CDN are fine.
- **`data-comment` on every visible/interactive element**, unique per file, `section-element` naming (e.g. `advisor-head`, `advisor-msg-3`, `advisor-card-3-cta`). The review platform anchors comments to these. See `customer-advisor-widget.html` for the full set to mirror.
- **`data-component` hints** for future React/shadcn mapping where there's a 1:1 (`sheet` for the drawer, `button`, `input`, `card`).
- If embedding into an existing framework instead of static HTML, keep the same structure, class roles, and `data-comment` values.

## 5. UI spec — anatomy & states

**Launcher button** — fixed bottom-right; green pill; tree mark in a cream circle; accent pulse dot (hide after first open). Hover: darken + lift 2px.

**Header link** — green chip in nav, sparkle icon, "Ask the advisor".

**Drawer** = three regions:
1. **Header** (`--g900`): cream tree mark, "Whiffletree Advisor", status line "Typically replies instantly" with a green dot, ✕ close.
2. **Body** (scrolls): message stream.
   - **AI bubble:** white, 1px `--paper2` border, radius `4px 14px 14px 14px`, left-aligned.
   - **User bubble:** `--g700` fill, white text, radius `14px 4px 14px 14px`, right-aligned.
   - **Product card** (AI can drop inline): image band (gradient placeholder or real photo), optional badge top-left (e.g. "Boosted" / "New" — accent fill), Cormorant product name + green price on one row, meta line (zone · harvest · rootstock), full-width **Add to cart** button in `--accent`.
   - **Suggested-question chips:** shown only before the first user message; pill, white, green text; clicking sends that question.
   - **Typing indicator:** three pulsing green dots in an AI bubble while awaiting a reply.
3. **Footer:** one-line disclaimer ("Advice is a guide — always confirm your hardiness zone before planting."), then composer = rounded input + round green send button.

**Required states:** intro/greeting (with chips) · typing/loading · normal stream · **error** ("Something went wrong — try again", retry affordance) · **offline/unavailable** (advisor turned off in admin → friendly fallback + link to browse). Keep an empty/first-run that *teaches* via the chips.

**Accessibility:** `role="dialog"`, `aria-label`; trap focus while open; `Esc` closes; launcher and close are real `<button>`s; input has an accessible label; color contrast per the design system.

## 6. Integration contract (UI ↔ advisor)

The widget is dumb; the advisor is smart. Wire the widget to a single endpoint. **No backend code here — just the shape.**

**Config (on open / page load)** — GET the published advisor config (set in the admin):
```jsonc
// GET /api/advisor/config  →
{
  "enabled": true,                       // false → show offline state
  "intro": "Hi! I can help you find…",   // greeting bubble (admin: AI Settings → opening message)
  "suggestedQuestions": ["There are 73 apple varieties — what should I get?", "..."],
  "persona": { "tone": "friendly-expert" },
  "disclaimer": "Advice is a guide — always confirm your hardiness zone before planting."
}
```

**Send a message** — POST the turn; advisor assembles knowledge + focuses + the allowed catalog slice (the "payload" from AI Settings) server-side:
```jsonc
// POST /api/advisor/message
// →
{ "sessionId": "abc123", "message": "There are 73 apple varieties — what should I get?" }
// ←  (streaming preferred — SSE/chunked; else single JSON)
{
  "reply": "For most Ontario gardens, <b>Honeycrisp</b> is hard to beat…",
  "products": [
    { "id": 1, "name": "Honeycrisp Apple", "price": 42, "currency": "CAD",
      "image": "https://…", "url": "/products/honeycrisp",
      "meta": "Zone 3–6 · Sept harvest · Bud-118 rootstock",
      "badge": "Boosted" }      // badge optional; set when a Product Focus applied
  ],
  "followups": ["Show me two more", "Without spraying?"]   // optional chips for this turn
}
```

**Rules for the widget:**
- Render `reply` as the AI bubble; render each `products[]` item as a product card **in order** (the advisor already ranked them — focuses/fit are baked in; the widget does not re-sort).
- `badge` is display-only. Product card name/price/url come straight from `products[]`.
- **Add to cart** posts to the **store's existing cart** (`productId`), not the advisor. The advisor never owns cart state.
- `sessionId`: create on first message, keep for the visit, send on every turn (so the advisor keeps context). No PII stored client-side.
- If `enabled:false` or the request errors → render the offline/error state; never show a raw error or empty bubble.
- Streaming: if used, append tokens into the open AI bubble; show the typing indicator until the first token.

**What stays in the admin, not the widget:** which catalog fields are sent, in-stock/published filters, max products per answer, custom knowledge, product focuses, hard rules (always/never). The widget must not duplicate or override these.

## 7. Acceptance checklist

- [ ] Floating launcher on every page **and** header link both open the same drawer.
- [ ] Right drawer slides over a scrim; ✕ / scrim / `Esc` close it; full-width on mobile.
- [ ] Greeting + suggested chips on first open; chips disappear after first message.
- [ ] Typing indicator → AI bubble; product cards render inline with working **Add to cart** into the real cart.
- [ ] Error and offline states implemented; no raw errors surface.
- [ ] Matches the design system (tokens, type, 4px radius, green/accent roles) — verify against `design-system.html`.
- [ ] Every visible element has a unique `data-comment`; self-contained; passes `validate-html.sh`.
- [ ] Config + message calls follow the §6 contract; widget does no ranking, filtering, or cart logic of its own.

## 8. Open questions (confirm before building)

- Endpoint base URL + auth, and is the advisor backend live yet, or build against a mock (`pickReply()` in the reference file) first?
- Streaming vs single-response from the AI backend?
- Does the cart use a JS API we call directly, or a form POST / redirect?
- Persist the conversation across page loads (localStorage session), or per-page only? (Note: the design-prototype rules forbid storage; production may differ.)
- Should the launcher appear on **all** pages including checkout, or be suppressed there?
