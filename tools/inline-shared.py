#!/usr/bin/env python3
"""
inline-shared.py — sync shared components into every page as inlined CSS/JS.

Whiffletree pages render inside the EBMS review iframe, which cannot load
external local files. So the shared components in assets/ must be INLINED into
each .html (see ebms-design/docs/INSTRUCTIONS.md — "one file = everything").

assets/wt-*.css / assets/wt-*.js are the SOURCE OF TRUTH. Edit them there, then
run this script to push the changes into every page's inlined <style>/<script>.

Usage (run from repo root):
    python3 tools/inline-shared.py            # re-inline sources into all pages
    python3 tools/inline-shared.py --check    # report external local CSS/JS (CI/pre-commit); exit 1 if any

The script is idempotent: it updates existing <style|script data-inlined="X">
blocks in place, and converts any leftover <link>/<script src> tags to inlined
blocks. Running it with unchanged sources produces no diff.
"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

# component filename -> (kind, source path). Present on a page only if its
# marker/tag is found there, so this list is safe to apply to every file.
COMPONENTS = [
    ("wt-layout.css",      "css", "assets/wt-layout.css"),
    ("wt-header.css",      "css", "assets/wt-header.css"),
    ("wt-account.css",     "css", "assets/wt-account.css"),
    ("wt-fields.css",      "css", "assets/wt-fields.css"),
    ("wt-cart-drawer.css", "css", "assets/wt-cart-drawer.css"),
    ("wt-account.js",      "js",  "assets/wt-account.js"),
    ("wt-fields.js",       "js",  "assets/wt-fields.js"),
    ("wt-cart-drawer.js",  "js",  "assets/wt-cart-drawer.js"),
    ("wt-search.js",       "js",  "assets/wt-search.js"),
]

def html_files():
    return sorted(p for p in ROOT.glob("*.html"))

def check():
    """Report any external LOCAL css/js references (CDN https:// is allowed)."""
    bad = []
    css_re = re.compile(r'<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"', re.I)
    js_re  = re.compile(r'<script\b[^>]*\bsrc="([^"]+)"', re.I)
    for f in html_files():
        txt = f.read_text(encoding="utf-8")
        for m in list(css_re.finditer(txt)) + list(js_re.finditer(txt)):
            url = m.group(1)
            if not url.startswith(("http://", "https://", "//")):
                bad.append((f.name, url))
    if bad:
        print("✗ external local CSS/JS found (breaks EBMS iframe):")
        for name, url in bad:
            print(f"    {name}: {url}")
        return 1
    print(f"✓ all {len(html_files())} pages self-contained (no external local CSS/JS)")
    return 0

def inline():
    sources = {name: (ROOT / path).read_text(encoding="utf-8").rstrip("\n")
               for name, _kind, path in COMPONENTS}
    for f in html_files():
        txt = f.read_text(encoding="utf-8")
        changed = []
        for name, kind, _path in COMPONENTS:
            body = sources[name]
            tag = "style" if kind == "css" else "script"
            block = f'<{tag} data-inlined="{name}">\n{body}\n        </{tag}>'

            # 1) update an existing inlined block in place
            existing = re.compile(rf'<{tag} data-inlined="{re.escape(name)}">.*?</{tag}>', re.S)
            if existing.search(txt):
                txt = existing.sub(lambda _: block, txt, count=1)
                changed.append(name)
                continue
            # 2) otherwise convert a leftover external tag
            if kind == "css":
                ext = re.compile(rf'<link\b[^>]*href="assets/{re.escape(name)}"[^>]*/?>', re.I)
            else:
                ext = re.compile(rf'<script\b[^>]*src="assets/{re.escape(name)}"[^>]*>\s*</script>', re.I)
            if ext.search(txt):
                txt = ext.sub(lambda _: block, txt, count=1)
                changed.append(name)
        f.write_text(txt, encoding="utf-8")
        if changed:
            print(f"{f.name}: {', '.join(changed)}")
    return 0

if __name__ == "__main__":
    sys.exit(check() if "--check" in sys.argv[1:] else inline())
