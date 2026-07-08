#!/usr/bin/env python3
"""
tag-elements.py — add a data-comment to interactive/visible DOM elements that
lack one, so every element is reviewable in the EBMS platform.

Names are derived from context (label text, data-* hook, placeholder, alt, type),
prefixed by the page name, and de-duplicated per file. Only markup OUTSIDE
<script>/<style> is touched, so component JS templates are left alone.

No visual change — only a data-comment attribute is added.

Usage:  python3 tools/tag-elements.py [--check] [file ...]
"""
import re, sys, pathlib, collections

ROOT = pathlib.Path(__file__).resolve().parent.parent
TAGS = ("input", "select", "textarea", "label", "button", "img", "a", "h1", "h2", "h3", "h4", "h5", "h6")
SKIP = re.compile(r"<(script|style)\b[^>]*>.*?</\1>", re.S | re.I)

def slug(s, maxlen=28):
    s = re.sub(r"<svg\b.*?</svg>", "", s, flags=re.S | re.I)  # drop inline icons
    s = re.sub(r"<[^>]+>", "", s)
    s = s.replace("&amp;", "and").replace("&", "and")
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return s[:maxlen].strip("-")

def attr(tag, name):
    m = re.search(r'\b%s="([^"]*)"' % name, tag)
    return m.group(1) if m else None

def hook(tag):
    """derive a name fragment from data-* hooks / name / placeholder / type / alt"""
    m = re.search(r'\bdata-(reg|wt|wta|acct)-([a-z-]+)', tag)
    if m: return slug(m.group(2))
    for a in ("name", "id", "placeholder", "alt", "aria-label"):
        v = attr(tag, a)
        if v: return slug(v)
    t = attr(tag, "type")
    return slug(t) if t else None

def tag_segment(seg, base, used, counter):
    """add data-comment to matching tags in a non-script/style segment"""
    out = []
    pos = 0
    # match opening tags (and self-closing) of target elements, plus following text for labels/headings/buttons
    pat = re.compile(r"<(%s)\b([^>]*?)(/?)>" % "|".join(TAGS), re.I)
    for m in pat.finditer(seg):
        out.append(seg[pos:m.start()])
        pos = m.end()
        tag_name = m.group(1).lower()
        attrs = m.group(2)
        selfclose = m.group(3)
        full = m.group(0)
        if "data-comment=" in attrs:
            out.append(full); continue
        # derive descriptive fragment
        frag = None
        def inner_text():
            tail = seg[pos:pos + 1200]
            mt = re.search(r"</%s>" % tag_name, tail, re.I)
            return slug(tail[:mt.start()] if mt else tail)
        if tag_name == "button":
            # buttons: prefer stable hook / aria-label, fall back to visible text
            frag = hook(full) or inner_text()
        elif tag_name in ("label", "a", "h1", "h2", "h3", "h4", "h5", "h6"):
            frag = inner_text() or hook(full)
        if not frag:
            frag = hook(full)
        if not frag:
            frag = tag_name
        name = "%s-%s-%s" % (base, tag_name, frag)
        # ensure unique
        cand = name
        while cand in used:
            counter[name] += 1
            cand = "%s-%s" % (name, counter[name])
        used.add(cand)
        new = "<%s%s data-comment=\"%s\"%s>" % (m.group(1), attrs, cand, selfclose)
        out.append(new)
    out.append(seg[pos:])
    return "".join(out)

def process(path, check):
    txt = path.read_text(encoding="utf-8")
    base = path.stem
    used = set(re.findall(r'data-comment="([^"]+)"', txt))
    counter = collections.Counter()
    # split into [text, skip, text, skip, ...] keeping skip blocks verbatim
    parts = []
    last = 0
    added = 0
    for m in SKIP.finditer(txt):
        parts.append(("dom", txt[last:m.start()]))
        parts.append(("skip", m.group(0)))
        last = m.end()
    parts.append(("dom", txt[last:]))
    rebuilt = []
    for kind, seg in parts:
        if kind == "skip":
            rebuilt.append(seg)
        else:
            before = len(re.findall(r'data-comment=', seg))
            seg2 = tag_segment(seg, base, used, counter)
            after = len(re.findall(r'data-comment=', seg2))
            added += after - before
            rebuilt.append(seg2)
    newtxt = "".join(rebuilt)
    if added and not check:
        path.write_text(newtxt, encoding="utf-8")
    return added

if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    check = "--check" in sys.argv[1:]
    files = [ROOT / a for a in args] if args else sorted(ROOT.glob("*.html"))
    total = 0
    for f in files:
        n = process(f, check)
        if n:
            print(("would add" if check else "added"), n, "->", f.name)
        total += n
    print("total data-comment added:", total)
