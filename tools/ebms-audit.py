#!/usr/bin/env python3
"""
ebms-audit.py — local conformance test for the EBMS-design rules + static
usability/accessibility checks.

This is the STATIC half of the local design test. It parses each shipped page
and asserts the rules from ebms-design/docs/INSTRUCTIONS.md plus the
Whiffletree-specific conventions and the a11y rules that can be judged from
markup alone. Render-dependent usability (colour contrast, tap-target size,
mobile overflow, button wrapping) lives in the browser half:
tools/usability-audit.js.

Zero dependencies — Python 3 stdlib only (mirrors the other tools/*.py).

Usage (run from repo root):
    python3 tools/ebms-audit.py                 # audit all top-level pages, full report
    python3 tools/ebms-audit.py home.html       # audit specific file(s)
    python3 tools/ebms-audit.py --check         # quiet; print only errors; exit 1 if any
    python3 tools/ebms-audit.py --warn-as-error # treat warnings as failures too

Exit code: 0 if no errors, 1 if any error (pre-commit / CI friendly).
"""
import sys, glob, re, pathlib
from html.parser import HTMLParser

C = {
    "red": "\033[0;31m", "yellow": "\033[0;33m", "green": "\033[0;32m",
    "dim": "\033[2m", "bold": "\033[1m", "cyan": "\033[0;36m", "nc": "\033[0m",
}
if not sys.stdout.isatty():
    C = {k: "" for k in C}

# Head/interactive tags that should carry a data-comment when they are real
# content (structural-only wrappers are exempt per INSTRUCTIONS.md).
NEEDS_COMMENT = {"button", "img", "h1", "h2", "h3", "h4", "h5", "h6",
                 "input", "select", "textarea", "nav", "header", "footer",
                 "main", "section", "a"}
VOID = {"img", "input", "br", "hr", "meta", "link", "source", "area"}


class PageParser(HTMLParser):
    """Collects the facts the rules need, ignoring <script>/<style> content."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip_depth = 0            # inside <script>/<style>
        self.tags = []                 # (tag, attrs_dict, line)
        self.data_comments = []        # (value, line)
        self.style_text = []           # concatenated <style> contents
        self._in_style = False
        self.has_doctype = False
        self.title_text = ""
        self._in_title = False
        self.html_attrs = {}

    def handle_decl(self, decl):
        if decl.lower().startswith("doctype html"):
            self.has_doctype = True

    def handle_starttag(self, tag, attrs):
        a = {k.lower(): (v if v is not None else "") for k, v in attrs}
        line = self.getpos()[0]
        if tag == "html":
            self.html_attrs = a
        if tag in ("script", "style"):
            self.skip_depth += 1
            self._in_style = (tag == "style")
            return
        if tag == "title":
            self._in_title = True
        if self.skip_depth:
            return
        self.tags.append((tag, a, line))
        if "data-comment" in a:
            self.data_comments.append((a["data-comment"], line))

    def handle_startendtag(self, tag, attrs):
        # self-closing (e.g. <img ... />)
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            if self.skip_depth:
                self.skip_depth -= 1
            self._in_style = False
        if tag == "title":
            self._in_title = False

    def handle_data(self, data):
        if self._in_style:
            self.style_text.append(data)
        if self._in_title:
            self.title_text += data


class Report:
    def __init__(self, path):
        self.path = path
        self.findings = []  # (severity, rule, msg, line)

    def err(self, rule, msg, line=None):
        self.findings.append(("error", rule, msg, line))

    def warn(self, rule, msg, line=None):
        self.findings.append(("warn", rule, msg, line))

    @property
    def errors(self):
        return [f for f in self.findings if f[0] == "error"]

    @property
    def warnings(self):
        return [f for f in self.findings if f[0] == "warn"]


def _lines_hint(lines, cap=6):
    lines = [str(x) for x in lines if x]
    if not lines:
        return ""
    shown = lines[:cap]
    extra = f" (+{len(lines) - cap} more)" if len(lines) > cap else ""
    return f"  {C['dim']}lines {', '.join(shown)}{extra}{C['nc']}"


def audit_file(path):
    r = Report(path)
    raw = pathlib.Path(path).read_text(encoding="utf-8", errors="replace")
    p = PageParser()
    try:
        p.feed(raw)
    except Exception as e:  # never let a parse hiccup kill the whole run
        r.err("PARSE", f"HTML parse error: {e}")
        return r

    # ── EBMS: self-contained (no external LOCAL css/js; CDN https is fine) ──
    def is_external(url):
        u = (url or "").strip().lower()
        return u.startswith(("http://", "https://", "//", "data:"))

    for tag, a, line in p.tags:
        if tag == "link" and "stylesheet" in a.get("rel", "") and a.get("href"):
            if not is_external(a["href"]):
                r.err("SELF-CONTAINED",
                      f'external local CSS: href="{a["href"]}"', line)
        if tag == "script" and a.get("src") and not is_external(a["src"]):
            r.err("SELF-CONTAINED",
                  f'external local JS: src="{a["src"]}"', line)

    # ── EBMS: data-comment presence / uniqueness / non-empty ──
    if not p.data_comments:
        r.err("DATA-COMMENT", "no data-comment attributes found at all")
    seen, dupes = {}, {}
    for val, line in p.data_comments:
        if val == "":
            r.err("DATA-COMMENT", "empty data-comment=\"\"", line)
            continue
        if val in seen:
            dupes.setdefault(val, [seen[val]]).append(line)
        else:
            seen[val] = line
    for val, lines in dupes.items():
        r.err("DATA-COMMENT",
              f'duplicate data-comment="{val}" (x{len(lines)})', lines[0])

    # missing data-comment on content/interactive tags → warning (structural
    # wrappers are allowed to omit it, so this is advisory, not a hard fail)
    missing = {}
    for tag, a, line in p.tags:
        if tag not in NEEDS_COMMENT:
            continue
        if tag == "a" and (not a.get("href") or a.get("href") == "#"):
            continue  # non-navigational anchors
        if "data-comment" not in a:
            missing.setdefault(tag, []).append(line)
    for tag, lines in sorted(missing.items()):
        r.warn("DATA-COMMENT",
               f"{len(lines)} <{tag}> missing data-comment" + _lines_hint(lines))

    # ── EBMS: document structure ──
    if not p.has_doctype:
        r.err("STRUCTURE", "missing <!DOCTYPE html>")
    if not any(t == "meta" and "charset" in a for t, a, _ in p.tags):
        r.err("STRUCTURE", "missing <meta charset>")
    vp = next((a for t, a, _ in p.tags
               if t == "meta" and a.get("name", "").lower() == "viewport"), None)
    if vp is None:
        r.err("STRUCTURE", "missing viewport meta")
    else:
        content = vp.get("content", "").lower()
        if "width=device-width" not in content:
            r.err("STRUCTURE", "viewport missing width=device-width")
        if "user-scalable=no" in content or re.search(r"maximum-scale\s*=\s*1(\.0)?\b", content):
            r.warn("A11Y", "viewport blocks zoom (user-scalable=no / maximum-scale=1)")
    if not p.title_text.strip():
        r.warn("STRUCTURE", "missing or empty <title>")
    style_css = "".join(p.style_text)
    if ":root" not in style_css:
        r.warn("STRUCTURE", "no :root CSS custom-property block found")

    # ── EBMS: Google Fonts — preconnect + Whiffletree display=block rule ──
    gfont_links = [(a, line) for t, a, line in p.tags
                   if t == "link" and "fonts.googleapis.com/css" in a.get("href", "")]
    if gfont_links:
        has_preconnect = any(t == "link" and "preconnect" in a.get("rel", "")
                             for t, a, _ in p.tags)
        if not has_preconnect:
            r.warn("FONTS", "Google Fonts used without preconnect hints")
        for a, line in gfont_links:
            if "display=block" not in a["href"]:
                r.err("FONTS",
                      "Google Fonts URL missing display=block "
                      "(project decision — see memory font-display-block)", line)

    # ── Whiffletree: logo links to home.html (never index.html / #) ──
    logo = next(((a, line) for t, a, line in p.tags
                 if t == "a" and "logo" in a.get("data-comment", "").lower()), None)
    if logo:
        a, line = logo
        href = (a.get("href") or "").split("#")[0].split("?")[0]
        if href != "home.html":
            r.warn("WHIFFLETREE",
                   f'logo href is "{a.get("href")}" — should be home.html', line)

    # ── a11y (static): <html lang>, <img alt>, positive tabindex ──
    lang = p.html_attrs.get("lang", "").strip()
    if not lang:
        r.err("A11Y", "<html> missing lang attribute")

    no_alt = [line for t, a, line in p.tags if t == "img" and "alt" not in a]
    if no_alt:
        r.err("A11Y", f"{len(no_alt)} <img> missing alt attribute" + _lines_hint(no_alt))

    pos_tab = []
    for t, a, line in p.tags:
        try:
            if int(a.get("tabindex", "0")) > 0:
                pos_tab.append(line)
        except ValueError:
            pass
    if pos_tab:
        r.warn("A11Y", f"{len(pos_tab)} element(s) with positive tabindex "
                       "(breaks tab order)" + _lines_hint(pos_tab))

    # form controls likely missing an accessible name
    unlabeled = []
    for t, a, line in p.tags:
        if t not in ("input", "select", "textarea"):
            continue
        if a.get("type", "").lower() in ("hidden", "submit", "button", "reset", "image"):
            continue
        if not any(k in a for k in ("aria-label", "aria-labelledby", "id",
                                    "placeholder", "title")):
            unlabeled.append(line)
    if unlabeled:
        r.warn("A11Y", f"{len(unlabeled)} form control(s) may lack an accessible "
                       "name (no label/aria/placeholder)" + _lines_hint(unlabeled))

    return r


def main(argv):
    check_mode = "--check" in argv
    warn_as_error = "--warn-as-error" in argv
    files = [a for a in argv if not a.startswith("--")]
    if not files:
        files = sorted(glob.glob("*.html"))  # top-level shipped pages only
    if not files:
        print("No HTML files found.")
        return 0

    reports = [audit_file(f) for f in files]
    total_err = sum(len(r.errors) for r in reports)
    total_warn = sum(len(r.warnings) for r in reports)

    for r in reports:
        errs, warns = r.errors, r.warnings
        if check_mode and not errs:
            continue
        head = f"{C['bold']}{r.path}{C['nc']}"
        if not errs and not warns:
            print(f"{head}  {C['green']}✓ clean{C['nc']}")
            continue
        print(f"\n{head}")
        for sev, rule, msg, line in errs:
            loc = f"{C['dim']}:{line}{C['nc']}" if line else ""
            print(f"  {C['red']}✗ [{rule}]{C['nc']} {msg}{loc}")
        if not check_mode:
            for sev, rule, msg, line in warns:
                loc = f"{C['dim']}:{line}{C['nc']}" if line else ""
                print(f"  {C['yellow']}⚠ [{rule}]{C['nc']} {msg}{loc}")

    # ranked summary (worst files first)
    ranked = sorted(reports, key=lambda r: (-len(r.errors), -len(r.warnings)))
    print(f"\n{C['bold']}══ summary ══{C['nc']}")
    for r in ranked:
        e, w = len(r.errors), len(r.warnings)
        if e == 0 and w == 0:
            continue
        badge = (f"{C['red']}{e} err{C['nc']}" if e else f"{C['green']}0 err{C['nc']}")
        print(f"  {badge}  {C['yellow']}{w} warn{C['nc']}  {r.path}")

    failed = total_err + (total_warn if warn_as_error else 0)
    print()
    if failed == 0:
        print(f"{C['green']}{C['bold']}✓ EBMS audit passed{C['nc']} "
              f"({len(files)} files, {total_warn} warning(s))")
        return 0
    print(f"{C['red']}{C['bold']}✗ EBMS audit failed{C['nc']}: "
          f"{total_err} error(s), {total_warn} warning(s) across {len(files)} files")
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
