# HTML Design File Guidelines

You are helping a designer create and iterate on HTML files for the EBMS Client Platform — a team review tool where reviewers leave comments anchored to specific page elements.

## What You're Building

Single self-contained `.html` files — typically e-commerce pages, production management interfaces, or marketing sites. These files are rendered inside an iframe on the review platform, where team members click on elements to leave comments.

Every visible element MUST have a `data-comment` attribute with a unique value. This is how the platform anchors comments to elements. Missing `data-comment` = element cannot be reviewed.

---

## File Structure

Every HTML file follows this exact structure:

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Project Name — Page</title>

        <!-- Google Fonts only -->
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link
            href="https://fonts.googleapis.com/css2?family=..."
            rel="stylesheet" />

        <style>
            /* Reset */
            *,
            *::before,
            *::after {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }

            /* Design tokens as CSS custom properties */
            :root {
                /* -- Colors -- */
                /* -- Typography -- */
                /* -- Spacing -- */
            }

            /* All styles here — no external CSS files */
        </style>
    </head>
    <body>
        <!-- All markup here -->

        <script>
            /* All scripts here — no external JS files */
        </script>
    </body>
</html>
```

### Rules

- **One file = everything.** HTML, CSS, and JS all live in a single `.html` file. No external CSS or JS files.
- **Google Fonts only** for custom typefaces. Always include `preconnect` hints.
- **Libraries are OK** if loaded from CDN and useful (e.g., GSAP for animation, Swiper for carousels). Keep it pragmatic — don't add dependencies without a reason.
- **CSS custom properties** in `:root` for all design tokens (colors, fonts, spacing). This keeps the design system readable and easy to adjust during review.

---

## data-comment Attribute Convention

### The Rule

Every element that is visible or interactive MUST have a unique `data-comment` attribute.

### Naming Pattern

Use `section-element` or `section-element-variant` format:

```
header-logo
header-nav
header-nav-link-home
header-nav-link-cart

hero-heading
hero-subheading
hero-cta-primary
hero-cta-secondary
hero-image

products-grid
products-card-1
products-card-1-image
products-card-1-title
products-card-1-price
products-card-2
products-card-2-image
...

footer-copyright
footer-social-instagram
footer-social-twitter
```

### What Gets a data-comment

| Element type | Gets data-comment? | Example |
| --- | --- | --- |
| Headings, paragraphs, labels | ✅ Yes | `data-comment="hero-heading"` |
| Buttons, links, inputs | ✅ Yes | `data-comment="hero-cta-primary"` |
| Images, icons, SVGs | ✅ Yes | `data-comment="hero-image"` |
| Cards, list items | ✅ Yes | `data-comment="products-card-1"` |
| Section/wrapper containers | ✅ Yes | `data-comment="hero-section"` |
| Layout-only wrappers with no visual meaning | ❌ No | Generic flex/grid containers that are purely structural |
| `<html>`, `<head>`, `<body>` | ❌ No | — |
| `<script>`, `<style>`, `<meta>`, `<link>` | ❌ No | — |

### Numbered Items

For repeated elements (cards, list items, table rows), use sequential numbering:

```html
<div data-comment="products-card-1">...</div>
<div data-comment="products-card-2">...</div>
<div data-comment="products-card-3">...</div>
```

Children inherit the parent's prefix:

```html
<div data-comment="products-card-1">
    <img data-comment="products-card-1-image" />
    <h3 data-comment="products-card-1-title">...</h3>
    <span data-comment="products-card-1-price">...</span>
</div>
```

### Uniqueness

No two elements in the same file may share a `data-comment` value. Before committing, mentally verify there are no duplicates.

---

## SPA Navigation

**SPA is the default.** All pages/views go into a single `.html` file unless the user explicitly asks for separate HTML files. This keeps state shared across views and simplifies navigation.

Follow this pattern:

```html
<!-- Navigation triggers -->
<button data-comment="nav-link-home" onclick="navigate('home')">Home</button>
<button data-comment="nav-link-catalog" onclick="navigate('catalog')">
    Catalog
</button>

<!-- Views -->
<div id="view-home" class="view active" data-comment="view-home">...</div>
<div id="view-catalog" class="view" data-comment="view-catalog">...</div>
```

```css
.view {
    display: none;
    opacity: 0;
    transition: opacity 0.4s ease;
}
.view.active {
    display: block;
    opacity: 1;
}
```

```js
function navigate(page) {
    document.querySelectorAll(".view").forEach((v) => {
        v.classList.remove("active");
        setTimeout(() => {
            if (!v.classList.contains("active")) v.style.display = "none";
        }, 400);
    });
    const target = document.getElementById("view-" + page);
    target.style.display = "block";
    requestAnimationFrame(() =>
        requestAnimationFrame(() => target.classList.add("active")),
    );

    document.querySelectorAll('[data-comment^="nav-link-"]').forEach((link) => {
        link.classList.toggle(
            "active",
            link.dataset.comment === "nav-link-" + page,
        );
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
}
```

Each view's elements still need unique `data-comment` values. Prefix with the view name:

```
home-hero-heading       (not just "hero-heading")
catalog-filter-price    (not just "filter-price")
```

---

## CSS Conventions

### Design Tokens

Always define tokens in `:root`. Group them clearly:

```css
:root {
    /* Colors */
    --color-primary: #...;
    --color-secondary: #...;
    --color-bg: #...;
    --color-text: #...;
    --color-muted: #...;
    --color-border: #...;

    /* Typography */
    --font-heading: "Font Name", serif;
    --font-body: "Font Name", sans-serif;
    --font-mono: "Font Name", monospace;

    /* Spacing (if useful) */
    --space-xs: 8px;
    --space-sm: 16px;
    --space-md: 32px;
    --space-lg: 64px;
}
```

### Selectors

Use `data-comment` attribute selectors for styling when it makes sense for unique elements:

```css
header[data-comment="header-root"] { ... }
```

Class selectors are fine for shared styles:

```css
.btn-primary { ... }
.card { ... }
```

Use whichever is cleaner. For one-off sections, `data-comment` selectors keep HTML minimal. For reused components, classes are better.

### Responsive Design

Add media queries when the project requires responsive behavior. Not every project needs them — confirm before adding.

Use Tailwind-aligned breakpoints so responsive behavior carries over to the final React + Tailwind build:

```css
:root {
    /* Breakpoints (reference — use in media queries) */
    /* sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px */
}

/* Mobile first — base styles are mobile, then scale up */
.products-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
}

@media (min-width: 640px) {   /* sm */
    .products-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1024px) {  /* lg */
    .products-grid { grid-template-columns: repeat(3, 1fr); }
}

@media (min-width: 1280px) {  /* xl */
    .products-grid { grid-template-columns: repeat(4, 1fr); }
}
```

**Rules:**
- **Mobile first** — base CSS is the mobile layout, use `min-width` to scale up (matches Tailwind's approach)
- **Use only these breakpoints:** `640px` (sm), `768px` (md), `1024px` (lg), `1280px` (xl), `1536px` (2xl)
- **Comment the breakpoint name** next to each media query for readability
- Not every project needs all breakpoints — use only what the design requires

---

## JavaScript Conventions

- Vanilla JS by default. Libraries only when they save significant effort.
- No frameworks (React, Vue, etc.) — these are static HTML review files.
- Keep JS at the bottom inside a single `<script>` tag.
- SPA navigation logic (if applicable) should follow the pattern above.
- Interactive elements (forms, modals, accordions) should work in the preview but don't need real backend connections. Mock the behavior.
- For state management and UI state patterns, see [STATE.md](./docs/STATE.md).
- For React-ready code conventions, see [REACT-READY.md](./docs/REACT-READY.md).

---

## Git Commit Messages

Write short, human-readable commit messages in English. One sentence. Describe what changed visually, not technically.

### Good examples

```
Add hero section with heading and CTA buttons
Update product card layout to 3-column grid
Fix footer alignment and add social links
Restyle navigation with new color scheme
Add contact form page with validation states
Replace placeholder images with SVG illustrations
Adjust typography sizes across all sections
Add hover effects to product cards
Build out the full catalog page with filters
Polish mobile layout for the checkout flow
```

### Bad examples

```
feat: implement responsive grid system with CSS custom properties    ← too technical
update styles                                                        ← too vague
WIP                                                                  ← meaningless
fix: resolve z-index stacking context issue in header component      ← not human
```

---

## Pre-Commit Checklist

Before every commit, verify:

1. **Every visible element has a unique `data-comment`** — no missing, no duplicates
2. **File is self-contained** — no external CSS/JS file references (CDN libraries are OK)
3. **Page renders correctly** — open in browser, check all views/pages
4. **No dead code** — remove unused styles, commented-out blocks, placeholder text like "Lorem ipsum" (unless intentional)
5. **Clean formatting** — consistent indentation (2 spaces), organized CSS sections
6. **SPA navigation works** — if multi-view, all views accessible and transitions smooth
7. **Commit message is clear** — one sentence, describes the visual change

---

## When Modifying Existing Files

- **Don't remove `data-comment` attributes** that already exist — comments in the review platform depend on them
- **Don't change `data-comment` values** unless the element fundamentally changed — renaming breaks existing comment anchors
- When adding new elements, follow the existing naming pattern in the file
- If a section is restructured significantly, note it in the commit message so reviewers know their old comments may be displaced

---

## Validation

There is a validator script (`validate-html.sh`) that runs automatically before every commit via a Claude Code PreToolUse hook (configured in `.claude/settings.json`). It checks:

- Every visible element has a `data-comment` attribute
- No duplicate `data-comment` values
- File is self-contained (no external local CSS/JS)
- Basic HTML structure (doctype, charset, viewport, title)
- CSS custom properties exist in `:root`
- SPA views have proper `data-comment` and `navigate()` function

**If the validator reports errors, fix them before committing.** Warnings are advisory but should be addressed when possible.

You can also run it manually:

```bash
bash ./validate-html.sh                  # check all HTML files
bash ./validate-html.sh index.html       # check specific file
```

---

## Project Structure

```
project-root/
├── CLAUDE.md              ← Claude Code entry point → reads docs/
├── AGENTS.md              ← OpenAI Codex entry point → reads docs/
├── docs/
│   ├── INSTRUCTIONS.md    ← core rules (file structure, data-comment, CSS, JS, SPA, git)
│   ├── STATE.md           ← store pattern, CRUD, UI states (loading/empty/error)
│   └── REACT-READY.md    ← React conversion conventions (components, routes, shadcn hints)
├── .claude/
│   └── settings.json      ← Claude hook validates HTML before every commit
├── validate-html.sh       ← validation script
├── index.html             ← main page (or the only page)
├── catalog.html           ← additional pages if needed
└── ...
```

Each `.html` file is fully independent. No shared assets between files.
