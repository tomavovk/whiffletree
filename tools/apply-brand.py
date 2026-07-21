#!/usr/bin/env python3
"""
apply-brand.py — bring fonts, colours, logo and favicon in line with the
Whiffletree Brand Guide across every page (task #986).

Like sync-nav.py / inline-shared.py, this is idempotent: run it after editing
the constants below and it rewrites the same regions in every *.html.

What it touches on each page:
  1. Google Fonts <link>  — Cormorant/Mulish → Libre Caslon Text + Kaushan Script
  2. :root font tokens    — --display/--sans, adds --serif-text/--script
  3. :root green scale     — re-anchored to the brand green #006838
  4. brand + brown tokens  — adds --brand-green/--brand-brown + --e* earth scale
  5. favicon <link>s       — SVG + PNG + ICO (inserted after <title>)
  6. logo <img>            — assets/whiffletree-logo.png → .svg

Usage (from repo root):
    python3 tools/apply-brand.py            # apply to all pages
    python3 tools/apply-brand.py --check    # report pages still off-brand; exit 1
"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

# 1 — Google Fonts URL (href value, with &amp; entities as they appear in HTML)
OLD_FONTS_RE = re.compile(r'https://fonts\.googleapis\.com/css2\?family=Cormorant\+Garamond[^"]*')
NEW_FONTS = ("https://fonts.googleapis.com/css2?family=Kaushan+Script"
             "&amp;family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400"
             "&amp;display=block")

# 2 — font tokens. Replace the two existing lines with four (idempotent: the
#     new --display value is matched so a second run is a no-op).
FONT_TOKENS_RE = re.compile(
    r'(?P<i>[ \t]*)--display:[^\n;]*;\n[ \t]*--sans:[^\n;]*;')
def font_tokens_repl(m):
    i = m.group('i')
    return (f'{i}--display: "Libre Caslon Text", Georgia, serif;\n'
            f'{i}--serif-text: "Libre Caslon Text", Georgia, serif;\n'
            f'{i}--sans: "Helvetica Neue", Helvetica, Arial, sans-serif;\n'
            f'{i}--script: "Kaushan Script", cursive;')

# 3 — green scale, re-anchored on #006838 (g700 = exact brand green)
GREEN = {
    "g900": "#003d21", "g800": "#00522c", "g700": "#006838",
    "g600": "#088149", "g500": "#199a5e", "g300": "#6dba94",
    "g200": "#a6d3bb", "g100": "#d4eddf", "g050": "#e8f7ee",
}

# 4 — brand + brown/earth tokens, inserted right after the --g050 line
BROWN_BLOCK_MARK = "--brand-green:"
def brown_block(indent):
    i = indent
    lines = [
        "",
        f"{i}/* Brand — canonical brand-guide colours */",
        f"{i}--brand-green: #006838;",
        f"{i}--brand-brown: #5e3210;",
        "",
        f"{i}/* Brown / earth — secondary brand scale (anchor e700 = brand brown) */",
        f"{i}--e900: #341c09;",
        f"{i}--e800: #4a270d;",
        f"{i}--e700: #5e3210;",
        f"{i}--e600: #75411a;",
        f"{i}--e500: #91592b;",
        f"{i}--e300: #bc8c62;",
        f"{i}--e200: #d3baa1;",
        f"{i}--e100: #ecdfd0;",
        f"{i}--e050: #f7f0e8;",
    ]
    return "\n".join(lines)

# 5 — favicon links (inserted once, right after the </title>)
FAVICON_MARK = 'href="assets/favicon.svg"'
FAVICON_BLOCK = (
    '\n        <link rel="icon" type="image/svg+xml" href="assets/favicon.svg" />'
    '\n        <link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png" />'
    '\n        <link rel="apple-touch-icon" href="assets/apple-touch-icon.png" />'
    '\n        <link rel="icon" href="assets/favicon.ico" sizes="any" />')


# 7 — serif weight. Libre Caslon reads heavy (and weight 600 maps to its 700
#     bold cut), so every heading that uses the serif (--display / --serif-text)
#     is normalised to weight 400, its lightest available cut.
SERIF_MARKERS = ("var(--display", "var(--serif-text")
SERIF_ASSET_FILES = ["assets/wt-account.css", "assets/wt-cart-drawer.css"]
_FW_RE = re.compile(r'font-weight:\s*\d+')

def _norm_decls(text):
    """Force font-weight:400 inside a declaration group that uses the serif."""
    if any(mk in text for mk in SERIF_MARKERS):
        return _FW_RE.sub('font-weight: 400', text)
    return text

def normalize_serif_weight_html(txt):
    # rule bodies {...} inside <style> blocks (never touches <script>)
    def style_block(m):
        return re.sub(r'\{([^{}]*)\}', lambda r: '{' + _norm_decls(r.group(1)) + '}', m.group(0))
    txt = re.sub(r'<style\b[^>]*>.*?</style>', style_block, txt, flags=re.S)
    # inline style="" attributes
    txt = re.sub(r'style="([^"]*)"', lambda m: 'style="' + _norm_decls(m.group(1)) + '"', txt)
    return txt

def fix_serif_assets():
    """Normalise serif weights in the shared CSS sources (re-inline afterwards)."""
    changed = []
    for rel in SERIF_ASSET_FILES:
        p = ROOT / rel
        s = p.read_text(encoding="utf-8")
        new = re.sub(r'\{([^{}]*)\}', lambda r: '{' + _norm_decls(r.group(1)) + '}', s)
        if new != s:
            p.write_text(new, encoding="utf-8")
            changed.append(rel)
    return changed


# 8 — hardcoded old-green literals that bypass the token scale. Point them at
#     the matching --g* token so they track the brand green. (--success #1c7a45
#     is a semantic status colour and is intentionally left alone.)
GREEN_LITERALS = {
    "#0e4c23": "var(--g800)",   # old g800 — contact/CTA band background
    "#c1d8b6": "var(--g200)",   # old g200 — light-green gradients
    "#85ac81": "var(--g300)",   # old g300 — sage accents
    "#f1f8ea": "var(--g050)",   # old g050 — lightest tint
}
_GREEN_LIT_RES = [(re.compile(re.escape(k), re.I), v) for k, v in GREEN_LITERALS.items()]


def html_files():
    return sorted(p for p in ROOT.glob("*.html"))


def transform(txt, is_design_system=False):
    changes = []

    # 1 — fonts link
    if OLD_FONTS_RE.search(txt):
        txt = OLD_FONTS_RE.sub(NEW_FONTS, txt)
        changes.append("fonts-link")

    # 2 — font tokens
    if 'Cormorant Garamond' in txt or re.search(r'--sans:\s*"Mulish"', txt):
        txt, n = FONT_TOKENS_RE.subn(font_tokens_repl, txt)
        if n:
            changes.append("font-tokens")

    # 3 — green scale (replace each --gNNN value regardless of current hex)
    for key, hexv in GREEN.items():
        pat = re.compile(rf'(--{key}:\s*)#[0-9a-fA-F]{{3,6}}(;)')
        txt, n = pat.subn(rf'\g<1>{hexv}\g<2>', txt)
        if n:
            changes.append(f"green:{key}")

    # 4 — brand + brown tokens (insert after --g050 line, once)
    if BROWN_BLOCK_MARK not in txt:
        m = re.search(r'^([ \t]*)--g050:[^\n]*\n', txt, re.M)
        if m:
            indent = m.group(1)
            insert_at = m.end()
            txt = txt[:insert_at] + brown_block(indent) + "\n" + txt[insert_at:]
            changes.append("brown-tokens")

    # 5 — favicon links (insert after </title>, once)
    if FAVICON_MARK not in txt:
        m = re.search(r'</title>', txt)
        if m:
            txt = txt[:m.end()] + FAVICON_BLOCK + txt[m.end():]
            changes.append("favicon")

    # 6 — logo png → svg
    if 'assets/whiffletree-logo.png' in txt:
        txt = txt.replace('assets/whiffletree-logo.png', 'assets/whiffletree-logo.svg')
        changes.append("logo-svg")

    # 7 — lighten serif headings (Libre Caslon → weight 400)
    new = normalize_serif_weight_html(txt)
    if new != txt:
        txt = new
        changes.append("serif-weight")

    # 8 — old-green literals → tokens (skip the design-system swatch page, whose
    #     literals are intentional colour specimens)
    if not is_design_system:
        hit = False
        for rx, tok in _GREEN_LIT_RES:
            txt, n = rx.subn(tok, txt)
            if n:
                hit = True
        if hit:
            changes.append("green-literals")

    return txt, changes


def check():
    off = []
    for f in html_files():
        txt = f.read_text(encoding="utf-8")
        problems = []
        if 'Cormorant Garamond' in txt or re.search(r'--sans:\s*"Mulish"', txt):
            problems.append("old-fonts")
        if '--g700: #14682a' in txt:
            problems.append("old-green")
        if BROWN_BLOCK_MARK not in txt:
            problems.append("no-brown-tokens")
        if FAVICON_MARK not in txt and '<title>' in txt:
            problems.append("no-favicon")
        if 'assets/whiffletree-logo.png' in txt:
            problems.append("png-logo")
        if normalize_serif_weight_html(txt) != txt:
            problems.append("serif-weight")
        if f.name != "design-system.html" and any(rx.search(txt) for rx, _ in _GREEN_LIT_RES):
            problems.append("green-literals")
        if problems:
            off.append((f.name, problems))
    if off:
        print("✗ pages still off-brand:")
        for name, ps in off:
            print(f"    {name}: {', '.join(ps)}")
        return 1
    print(f"✓ all {len(html_files())} pages on-brand (fonts, greens, brown tokens, favicon, logo)")
    return 0


def apply():
    for f in html_files():
        txt = f.read_text(encoding="utf-8")
        new, changes = transform(txt, is_design_system=(f.name == "design-system.html"))
        if new != txt:
            f.write_text(new, encoding="utf-8")
            print(f"{f.name}: {', '.join(changes)}")
    assets = fix_serif_assets()
    if assets:
        print(f"assets (serif-weight → run inline-shared.py): {', '.join(assets)}")
    return 0


if __name__ == "__main__":
    sys.exit(check() if "--check" in sys.argv[1:] else apply())
