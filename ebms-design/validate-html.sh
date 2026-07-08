#!/bin/bash
# validate-html.sh — Validates HTML files for EBMS review platform rules
# Usage: ./validate-html.sh [file.html ...]
# If no files given, validates all .html files in current directory.
#
# Portable rewrite: the checks run in python3 (works on macOS's default bash 3.2,
# no `mapfile`/`grep -P` needed) and count data-comment only inside real DOM
# markup — attribute selectors in <style> and querySelectors in <script> are
# NOT counted, so referencing a data-comment from CSS/JS is no longer a false
# "duplicate".

set -euo pipefail

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required to run validate-html.sh" >&2
  exit 2
fi

python3 - "$@" <<'PY'
import re, sys, glob, os, collections

RED="\033[0;31m"; YEL="\033[0;33m"; GRN="\033[0;32m"; BOLD="\033[1m"; NC="\033[0m"

files = sys.argv[1:]
if not files:
    files = sorted(glob.glob("*.html"))
if not files:
    print(f"{YEL}No HTML files found.{NC}")
    sys.exit(0)

def strip(html):
    html = re.sub(r"<style\b[^>]*>.*?</style>", "", html, flags=re.S | re.I)
    html = re.sub(r"<script\b[^>]*>.*?</script>", "", html, flags=re.S | re.I)
    return html

errors = warnings = 0
for f in files:
    print(f"\n{BOLD}Checking: {f}{NC}")
    print("─" * 41)
    fe = fw = 0
    full = open(f, encoding="utf-8", errors="replace").read()
    dom = strip(full)

    # 1. self-contained: no external LOCAL css/js (CDN https:// allowed)
    for m in re.findall(r'<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"', full, re.I):
        if not m.startswith(("http://", "https://", "//")):
            print(f"{RED}  ✗ External local CSS: {m}{NC}"); fe += 1
    for m in re.findall(r'<script\b[^>]*src="([^"]+)"', full, re.I):
        if not m.startswith(("http://", "https://", "//")):
            print(f"{RED}  ✗ External local JS: {m}{NC}"); fe += 1

    # 2. data-comment presence / duplicates / empties (DOM only)
    dcs = re.findall(r'data-comment="([^"]*)"', dom)
    if not dcs:
        print(f"{RED}  ✗ No data-comment attributes found{NC}"); fe += 1
    else:
        print(f"  ℹ Found {len(dcs)} data-comment attributes")
        dupes = [v for v, c in collections.Counter(dcs).items() if v and c > 1]
        if dupes:
            print(f"{RED}  ✗ Duplicate data-comment values:{NC}")
            for d in dupes:
                print(f"    {RED}\"{d}\"{NC} appears {dcs.count(d)} times")
            fe += len(dupes)
        if dcs.count(""):
            print(f"{RED}  ✗ {dcs.count('')} empty data-comment=\"\" attributes{NC}"); fe += 1

    # 3. visible tags missing data-comment (heuristic, DOM only)
    missing = []
    for tag in ["h1","h2","h3","h4","h5","h6","button","img","nav","header","footer","main","section","a","input","select","textarea","label"]:
        c = sum(1 for o in re.findall(r"<"+tag+r"(\s[^>]*?)?>", dom, re.I) if not o or "data-comment" not in o)
        if c:
            missing.append(f"{tag}({c})")
    if missing:
        print(f"{YEL}  ⚠ Elements likely missing data-comment: {' '.join(missing)}{NC}")
        fw += len(missing)

    # 4. Google Fonts preconnect
    if "fonts.googleapis.com/css" in full and 'rel="preconnect"' not in full:
        print(f"{YEL}  ⚠ Google Fonts used without preconnect hints{NC}"); fw += 1

    # 5. basic structure
    if not re.search(r"<!DOCTYPE html>", full, re.I):
        print(f"{RED}  ✗ Missing <!DOCTYPE html>{NC}"); fe += 1
    if 'charset="UTF-8"' not in full and 'charset="utf-8"' not in full:
        print(f"{RED}  ✗ Missing charset UTF-8{NC}"); fe += 1
    if 'name="viewport"' not in full:
        print(f"{YEL}  ⚠ Missing viewport meta tag{NC}"); fw += 1
    if not re.search(r"<title>.+</title>", full, re.S):
        print(f"{YEL}  ⚠ Missing or empty <title>{NC}"); fw += 1
    if ":root" not in full:
        print(f"{YEL}  ⚠ No :root CSS custom properties found{NC}"); fw += 1

    # 6. SPA views consistency
    views = len(re.findall(r'class="view', dom))
    if views > 1:
        print(f"  ℹ SPA detected: {views} views")
        vwo = sum(1 for m in re.findall(r'class="view[^"]*"([^>]*)>', dom) if "data-comment" not in m)
        if vwo:
            print(f"{RED}  ✗ {vwo} view(s) missing data-comment{NC}"); fe += 1
        if "function navigate" not in full:
            print(f"{YEL}  ⚠ SPA views found but no navigate() function{NC}"); fw += 1

    if fe == 0 and fw == 0:
        print(f"{GRN}  ✓ All checks passed{NC}")
    else:
        if fe: print(f"{RED}  {fe} error(s){NC}")
        if fw: print(f"{YEL}  {fw} warning(s){NC}")
    errors += fe; warnings += fw

print("\n" + "═" * 43)
if errors == 0:
    print(f"{GRN}{BOLD}✓ All files valid{NC} ({warnings} warning(s))")
    sys.exit(0)
else:
    print(f"{RED}{BOLD}✗ Validation failed: {errors} error(s), {warnings} warning(s){NC}")
    print(f"{RED}  Fix errors before committing.{NC}")
    sys.exit(1)
PY
