#!/usr/bin/env python3
"""
brand-consistency-test.py — verify task #986 (brand-guide alignment) is applied
CONSISTENTLY across every page and asset.

Static test: parses the *.html files + the shared assets/ sources and asserts
each brand rule holds everywhere. Read-only. Exit 0 = all pass, 1 = failures.

    python3 tools/brand-consistency-test.py            # full report
    python3 tools/brand-consistency-test.py -q         # only failures + summary

Covers: fonts (link + tokens, no Cormorant/Mulish), colours (green scale re-
anchored to #006838, brand + brown tokens, no old-green literals, contact band
= brand green), favicon set, SVG logo, serif weight 400, nav weight 400 + active
state, Kaushan restricted to home/about, and the −8px type scale.
"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
QUIET = "-q" in sys.argv[1:]

PAGES = sorted(p for p in ROOT.glob("*.html"))
DS = "design-system.html"

# --- expected values ------------------------------------------------------
FONT_LINK = "family=Kaushan+Script&amp;family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&amp;display=block"
FONT_TOKENS = [
    '--display: "Libre Caslon Text", Georgia, serif;',
    '--serif-text: "Libre Caslon Text", Georgia, serif;',
    '--sans: "Helvetica Neue", Helvetica, Arial, sans-serif;',
    '--script: "Kaushan Script", cursive;',
]
GREEN = {
    "g900": "#003d21", "g800": "#00522c", "g700": "#006838", "g600": "#088149",
    "g500": "#199a5e", "g300": "#6dba94", "g200": "#a6d3bb", "g100": "#d4eddf",
    "g050": "#e8f7ee",
}
BRAND_TOKENS = ["--brand-green: #006838;", "--brand-brown: #5e3210;", "--e700: #5e3210;"]
FAVICONS = [
    'href="assets/favicon.svg"', 'href="assets/favicon-32.png"',
    'href="assets/apple-touch-icon.png"', 'href="assets/favicon.ico"',
]
OLD_GREEN_LITERALS = ["#0e4c23", "#c1d8b6", "#85ac81", "#f1f8ea"]
OLD_GREEN_TOKENS = ["#14682a", "#093f1e", "#2f9b3c"]  # must not appear as g-values
ASSET_FILES = [
    "assets/favicon.svg", "assets/favicon-32.png", "assets/apple-touch-icon.png",
    "assets/favicon.ico", "assets/whiffletree-logo.svg",
]
# Type-scale tokens whose value is a live design choice — the test checks they
# are DEFINED and propagated identically to every page, not that they equal
# specific px (those get tuned; hardcoding them here would cause false failures).
FS_TOKENS = ("fs-hero", "fs-title", "fs-h2", "fs-cta", "fs-h3", "fs-tile-title")
NAV_ACTIVE = {
    "shop.html": "shop", "product.html": "shop", "search.html": "shop",
    "catalog.html": "resources", "workshops.html": "resources", "orchard-care.html": "resources",
    "members.html": "members",
    "about.html": "info", "product-faq.html": "info", "guarantee-policy.html": "info",
    "privacy-policy.html": "info", "terms-conditions.html": "info",
    "contact.html": "contact",
}
SCRIPT_ALLOWED = {"home.html", "about.html", DS}  # DS has a Kaushan specimen

SERIF_MARK = ("var(--display", "var(--serif-text")

# --- test harness ----------------------------------------------------------
results = []  # (name, ok, [offenders])

def check(name, ok, offenders=None):
    results.append((name, ok, offenders or []))

def each_page():
    return [(p.name, p.read_text(encoding="utf-8")) for p in PAGES]


def caps_body_runs(txt):
    """Count runs of >=6 consecutive all-caps words in visible text (legal copy
    that should be sentence case). Short uppercase labels (eyebrows, trust-bar,
    footer headers = <=5 words) are intentional and not flagged."""
    runs = []
    joiners = {"&", "/", "-", "(1)", "(2)", "(3)", "(4)", "(5)", "(6)"}
    for m in re.finditer(r">([^<>]{30,})<", txt):
        words = re.sub(r"&[a-zA-Z]+;", " ", m.group(1)).split()
        cur = 0
        for w in words:
            letters = [c for c in w if c.isalpha()]
            shouty = bool(letters) and all(c.isupper() for c in letters)
            if shouty or (cur and w in joiners):
                cur += 1
            else:
                if cur >= 6:
                    runs.append(cur)
                cur = 0
        if cur >= 6:
            runs.append(cur)
    return runs


def serif_weight_offenders(txt):
    """Rules/inline-styles that use the serif but a weight other than 400."""
    bad = []
    fw = re.compile(r"font-weight:\s*(\d+)")
    for body in re.findall(r"\{([^{}]*)\}", txt) + re.findall(r'style="([^"]*)"', txt):
        if any(m in body for m in SERIF_MARK):
            for w in fw.findall(body):
                if w != "400":
                    bad.append(w)
    return bad


def run():
    pages = each_page()

    # 1. FONTS ---------------------------------------------------------------
    check("font link (Libre Caslon + Kaushan, display=block) on every page",
          all(FONT_LINK in t for _, t in pages),
          [n for n, t in pages if FONT_LINK not in t])
    check("no Cormorant / Mulish anywhere",
          all("Cormorant" not in t and "Mulish" not in t for _, t in pages),
          [n for n, t in pages if "Cormorant" in t or "Mulish" in t])
    for tok in FONT_TOKENS:
        check(f'font token present everywhere: {tok.split(":")[0]}',
              all(tok in t for _, t in pages),
              [n for n, t in pages if tok not in t])

    # 2. GREEN SCALE ---------------------------------------------------------
    for key, hexv in GREEN.items():
        line = f"--{key}: {hexv};"
        check(f"green token {key} = {hexv} everywhere",
              all(line in t for _, t in pages),
              [n for n, t in pages if line not in t])
    for old in OLD_GREEN_TOKENS:
        check(f"old green token value {old} gone",
              all(old.lower() not in t.lower() for _, t in pages),
              [n for n, t in pages if old.lower() in t.lower()])

    # 3. BRAND + BROWN TOKENS ------------------------------------------------
    for tok in BRAND_TOKENS:
        check(f"brand/brown token present: {tok}",
              all(tok in t for _, t in pages),
              [n for n, t in pages if tok not in t])

    # 4. NO HARDCODED OLD-GREEN LITERALS (design-system excluded — swatches) --
    for lit in OLD_GREEN_LITERALS:
        off = [n for n, t in pages if n != DS and lit.lower() in t.lower()]
        check(f"no hardcoded old-green literal {lit}", not off, off)

    # 5. CONTACT BAND = BRAND GREEN ------------------------------------------
    band = 'contact-section" style="position:relative; overflow:hidden; background:var(--g700);'
    have_band = [n for n, t in pages if 'data-comment="contact-section"' in t]
    check("contact CTA band uses var(--g700) where present",
          all(band in t for n, t in pages if 'data-comment="contact-section"' in t),
          [n for n, t in pages if 'data-comment="contact-section"' in t and band not in t])

    # 6. FAVICON -------------------------------------------------------------
    for fav in FAVICONS:
        check(f"favicon link present: {fav}",
              all(fav in t for _, t in pages),
              [n for n, t in pages if fav not in t])

    # 7. LOGO ----------------------------------------------------------------
    check("logo uses assets/whiffletree-logo.svg (no .png reference)",
          all("assets/whiffletree-logo.png" not in t for _, t in pages),
          [n for n, t in pages if "assets/whiffletree-logo.png" in t])

    # 8. ASSET FILES EXIST ---------------------------------------------------
    missing = [f for f in ASSET_FILES if not (ROOT / f).exists()]
    check("brand asset files exist on disk", not missing, missing)

    # 9. SERIF WEIGHT = 400 --------------------------------------------------
    off = [f"{n}({'/'.join(set(w))})" for n, t in pages for w in [serif_weight_offenders(t)] if w]
    check("all serif (Libre Caslon) headings are weight 400", not off, off)

    # 10. NAV WEIGHT = 400 ---------------------------------------------------
    def nav_container_600(t):
        m = re.search(r'data-comment="header-nav" style="([^"]*)"', t)
        return bool(m and "font-weight: 600" in m.group(1))
    check("header-nav container weight 400", not any(nav_container_600(t) for _, t in pages),
          [n for n, t in pages if nav_container_600(t)])
    for sel in (".nav-trigger", ".np-link"):
        rx = re.compile(re.escape(sel) + r"\s*\{[^}]*?font-weight:\s*600", re.S)
        off = [n for n, t in pages if rx.search(t)]
        check(f"{sel} weight 400 (no 600)", not off, off)

    # 11. NAV ACTIVE STATE ---------------------------------------------------
    marker = 'nav-current" data-comment="header-nav-link-'
    for n, t in pages:
        expect = NAV_ACTIVE.get(n)
        if expect:
            want = f'nav-current" data-comment="header-nav-link-{expect}"'
            check(f"active nav item on {n} = {expect}", want in t, [] if want in t else [n])
        else:
            check(f"no active nav item on {n}", marker not in t, [] if marker not in t else [n])

    # 12. KAUSHAN RESTRICTED -------------------------------------------------
    off = [n for n, t in pages if "var(--script)" in t and n not in SCRIPT_ALLOWED]
    check("Kaushan (var(--script)) used only on home + about (+DS specimen)", not off, off)
    check("home + about actually use Kaushan",
          all("var(--script)" in dict(pages)[p] for p in ("home.html", "about.html")))

    # 13. TYPE SCALE — consistency only (exact px is a live design choice) -----
    lay = (ROOT / "assets/wt-layout.css").read_text(encoding="utf-8")
    for tok in FS_TOKENS:
        m = re.search(rf"--{tok}:\s*(\d+)px", lay)  # first match = base (before @media)
        check(f"type token --{tok} defined in wt-layout.css", bool(m),
              [] if m else ["wt-layout.css"])
        if m:
            line = f"--{tok}: {m.group(1)}px"
            off = [n for n, t in pages if line not in t]
            check(f"--{tok} base ({m.group(1)}px) inlined consistently on all pages", not off, off)

    # 14. NO ALL-CAPS BODY TEXT (legal copy readable) -----------------------
    off = [f"{n}({sum(caps_body_runs(t))}w)" for n, t in pages for r in [caps_body_runs(t)] if r]
    check("no all-caps body text (legal copy in sentence case)", not off, off)

    # 15. BUTTON TOKEN + CORAL RETIRED --------------------------------------
    check("--btn / --btn-hover defined (brown) on every page",
          all("--btn: var(--e600);" in t and "--btn-hover: var(--e700);" in t for _, t in pages),
          [n for n, t in pages if "--btn: var(--e600);" not in t or "--btn-hover: var(--e700);" not in t])
    coral_hex = re.compile(r"#(521c13|6e2519|8f3122|b23e2c|d75640|ee917d|f5bcaf|fbdfd7|fdf1ec|edc9c0|fbeeea)", re.I)
    def has_coral(t):
        return bool(re.search(r"var\(--c\d{3}", t)) or bool(coral_hex.search(t)) or "coral" in t.lower()
    off = [n for n, t in pages if has_coral(t)]
    check("coral fully retired (no var(--c*), no coral hex, no 'coral')", not off, off)
    asset_off = [rel for rel in ["assets/wt-cart-drawer.css", "assets/wt-account.css",
                                  "assets/wt-fields.css", "assets/wt-header.css", "assets/wt-layout.css"]
                 if has_coral((ROOT / rel).read_text(encoding="utf-8"))]
    check("coral retired in shared asset sources too", not asset_off, asset_off)

    # 16. CTA CONTROL RADIUS = 2px (DS default; pills like the burger exempt) -
    controls = ("hero-cta-primary", "contact-cta-faq", "contact-cta-contact",
                "newsletter-submit", "newsletter-input", "about-cta", "status-badge")
    # inline-style scoped so CSS pill rules (border-radius:999px) aren't caught
    ctrl_rx = re.compile(r'data-comment="(?:%s)"[^>]*\bstyle="[^"]*?border-radius:\s*(\d+)px' % "|".join(controls))
    off = [n for n, t in pages if any(int(v) != 2 for v in ctrl_rx.findall(t))]
    check("CTA button/input radius = 2px (DS default)", not off, off)

    # --- report -------------------------------------------------------------
    passed = sum(1 for _, ok, _ in results if ok)
    failed = [r for r in results if not r[1]]
    for name, ok, offenders in results:
        if ok and not QUIET:
            print(f"  ✓ {name}")
        elif not ok:
            extra = f"  → {', '.join(map(str, offenders))}" if offenders else ""
            print(f"  ✗ {name}{extra}")
    print(f"\n{'✓' if not failed else '✗'} brand consistency: {passed}/{len(results)} checks passed"
          + (f", {len(failed)} FAILED" if failed else f" across {len(PAGES)} pages"))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(run())
