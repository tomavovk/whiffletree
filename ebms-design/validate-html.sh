#!/bin/bash
# validate-html.sh — Validates HTML files for EBMS review platform rules
# Usage: ./validate-html.sh [file.html ...]
# If no files given, validates all .html files in current directory

set -euo pipefail

RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
BOLD='\033[1m'
NC='\033[0m'

errors=0
warnings=0

files=("$@")
if [ ${#files[@]} -eq 0 ]; then
  mapfile -t files < <(find . -maxdepth 2 -name '*.html' -not -path '*/node_modules/*' -not -path '*/.git/*')
fi

if [ ${#files[@]} -eq 0 ]; then
  echo -e "${YELLOW}No HTML files found.${NC}"
  exit 0
fi

for file in "${files[@]}"; do
  echo -e "\n${BOLD}Checking: ${file}${NC}"
  echo "─────────────────────────────────────────"

  file_errors=0
  file_warnings=0

  # ── 1. Self-contained check: no external CSS/JS file references ──
  # Allow CDN links (https://) but block local file refs
  local_css=$(grep -nE '<link[^>]+rel="stylesheet"[^>]+href="(?!https?://)' "$file" 2>/dev/null || true)
  local_js=$(grep -nE '<script[^>]+src="(?!https?://)' "$file" 2>/dev/null || true)

  if [ -n "$local_css" ]; then
    echo -e "${RED}  ✗ External local CSS file detected:${NC}"
    echo "    $local_css"
    ((file_errors++))
  fi

  if [ -n "$local_js" ]; then
    echo -e "${RED}  ✗ External local JS file detected:${NC}"
    echo "    $local_js"
    ((file_errors++))
  fi

  # ── 2. Extract all data-comment values and check for duplicates ──
  mapfile -t dc_values < <(grep -oP 'data-comment="[^"]*"' "$file" | sed 's/data-comment="//;s/"//' | sort)

  if [ ${#dc_values[@]} -eq 0 ]; then
    echo -e "${RED}  ✗ No data-comment attributes found at all${NC}"
    ((file_errors++))
  else
    echo -e "  ℹ Found ${#dc_values[@]} data-comment attributes"

    # Check duplicates
    mapfile -t dupes < <(printf '%s\n' "${dc_values[@]}" | sort | uniq -d)
    if [ ${#dupes[@]} -gt 0 ]; then
      echo -e "${RED}  ✗ Duplicate data-comment values:${NC}"
      for d in "${dupes[@]}"; do
        count=$(grep -c "data-comment=\"${d}\"" "$file")
        echo -e "    ${RED}\"${d}\"${NC} appears ${count} times"
      done
      ((file_errors += ${#dupes[@]}))
    fi

    # Check for empty values
    empty_count=$(grep -c 'data-comment=""' "$file" 2>/dev/null || echo 0)
    if [ "$empty_count" -gt 0 ]; then
      echo -e "${RED}  ✗ Found ${empty_count} empty data-comment=\"\" attributes${NC}"
      ((file_errors++))
    fi
  fi

  # ── 3. Check elements that should have data-comment but don't ──
  # Extract visible tags that typically need data-comment
  # This uses a simple heuristic — not a full HTML parser
  missing_tags=()

  for tag in h1 h2 h3 h4 h5 h6 button img nav header footer main section; do
    # Find tags of this type without data-comment
    count_without=$(grep -cP "<${tag}[\s>](?![^>]*data-comment)" "$file" 2>/dev/null || echo 0)
    if [ "$count_without" -gt 0 ]; then
      missing_tags+=("${tag}(${count_without})")
    fi
  done

  if [ ${#missing_tags[@]} -gt 0 ]; then
    echo -e "${YELLOW}  ⚠ Elements likely missing data-comment:${NC}"
    echo -e "    ${missing_tags[*]}"
    ((file_warnings += ${#missing_tags[@]}))
  fi

  # ── 4. Check for Google Fonts preconnect ──
  has_gfonts=$(grep -c "fonts.googleapis.com/css" "$file" 2>/dev/null || echo 0)
  has_preconnect=$(grep -c 'rel="preconnect"' "$file" 2>/dev/null || echo 0)

  if [ "$has_gfonts" -gt 0 ] && [ "$has_preconnect" -eq 0 ]; then
    echo -e "${YELLOW}  ⚠ Google Fonts used without preconnect hints${NC}"
    ((file_warnings++))
  fi

  # ── 5. Check basic structure ──
  has_doctype=$(grep -c '<!DOCTYPE html>' "$file" 2>/dev/null || echo 0)
  has_charset=$(grep -c 'charset="UTF-8"' "$file" 2>/dev/null || echo 0)
  has_viewport=$(grep -c 'name="viewport"' "$file" 2>/dev/null || echo 0)
  has_title=$(grep -cP '<title>.+</title>' "$file" 2>/dev/null || echo 0)
  has_root_vars=$(grep -c ':root' "$file" 2>/dev/null || echo 0)

  if [ "$has_doctype" -eq 0 ]; then
    echo -e "${RED}  ✗ Missing <!DOCTYPE html>${NC}"
    ((file_errors++))
  fi
  if [ "$has_charset" -eq 0 ]; then
    echo -e "${RED}  ✗ Missing charset UTF-8${NC}"
    ((file_errors++))
  fi
  if [ "$has_viewport" -eq 0 ]; then
    echo -e "${YELLOW}  ⚠ Missing viewport meta tag${NC}"
    ((file_warnings++))
  fi
  if [ "$has_title" -eq 0 ]; then
    echo -e "${YELLOW}  ⚠ Missing or empty <title>${NC}"
    ((file_warnings++))
  fi
  if [ "$has_root_vars" -eq 0 ]; then
    echo -e "${YELLOW}  ⚠ No :root CSS custom properties found${NC}"
    ((file_warnings++))
  fi

  # ── 6. Check for SPA views consistency ──
  view_count=$(grep -cP 'class="view' "$file" 2>/dev/null || echo 0)
  if [ "$view_count" -gt 1 ]; then
    echo -e "  ℹ SPA detected: ${view_count} views"

    # Check each view has data-comment
    views_without_dc=$(grep -cP 'class="view[^"]*"(?![^>]*data-comment)' "$file" 2>/dev/null || echo 0)
    if [ "$views_without_dc" -gt 0 ]; then
      echo -e "${RED}  ✗ ${views_without_dc} view(s) missing data-comment${NC}"
      ((file_errors++))
    fi

    # Check navigate function exists
    has_navigate=$(grep -c 'function navigate' "$file" 2>/dev/null || echo 0)
    if [ "$has_navigate" -eq 0 ]; then
      echo -e "${YELLOW}  ⚠ SPA views found but no navigate() function${NC}"
      ((file_warnings++))
    fi
  fi

  # ── Summary for file ──
  if [ "$file_errors" -eq 0 ] && [ "$file_warnings" -eq 0 ]; then
    echo -e "${GREEN}  ✓ All checks passed${NC}"
  else
    [ "$file_errors" -gt 0 ] && echo -e "${RED}  ${file_errors} error(s)${NC}"
    [ "$file_warnings" -gt 0 ] && echo -e "${YELLOW}  ${file_warnings} warning(s)${NC}"
  fi

  ((errors += file_errors))
  ((warnings += file_warnings))
done

# ── Final summary ──
echo ""
echo "═══════════════════════════════════════════"
if [ "$errors" -eq 0 ]; then
  echo -e "${GREEN}${BOLD}✓ All files valid${NC} (${warnings} warning(s))"
  exit 0
else
  echo -e "${RED}${BOLD}✗ Validation failed: ${errors} error(s), ${warnings} warning(s)${NC}"
  echo -e "${RED}  Fix errors before committing.${NC}"
  exit 1
fi