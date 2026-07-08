#!/usr/bin/env python3
"""
sync-nav.py — make the header mega-menu identical & correct across all pages.

The 3 nav panels (shop / resources / info) are duplicated inline in every page
and had drifted (stale category links -> wrong/empty categories, dead "#" links,
missing data-comment). shop.html holds the correct link targets, so we take its
panels as canonical, inject a data-comment on every panel link/heading, then
splice the canonical block into every page.

Only href/data-comment change — no visual/structure change.

Usage:  python3 tools/sync-nav.py [--check]
"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PANELS = ["nav-panel-shop", "nav-panel-resources", "nav-panel-info"]
SHORT = {"nav-panel-shop": "shop", "nav-panel-resources": "res", "nav-panel-info": "info"}

def pages():
    return sorted(p for p in ROOT.glob("*.html") if p.name != "design-system.html")

def find_block(h, pid):
    """Return (start, end) of the <div ...id="pid"...> ... </div> balanced block."""
    k = h.find('id="%s"' % pid)
    if k < 0:
        return None
    start = h.rfind("<div", 0, k)
    depth = 0
    for m in re.finditer(r"<(/?)div\b", h[start:]):
        depth += 1 if m.group(1) == "" else -1
        if depth == 0:
            return (start, start + m.end())
    return None

def slug(text):
    t = re.sub(r"<[^>]+>", "", text)
    t = t.replace("&amp;", "and")
    t = re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")
    return t or "x"

def add_dc(block, pid):
    """Add a data-comment to every panel link/heading that lacks one."""
    sp = SHORT[pid]
    out = []
    col = "main"
    for line in block.splitlines():
        # column context from headings
        mh = re.search(r'<span class="np-col-head">(.*?)</span>', line)
        if mh and "data-comment" not in line:
            col = slug(mh.group(1))
            line = line.replace('<span class="np-col-head">',
                                '<span class="np-col-head" data-comment="navp-%s-head-%s">' % (sp, col), 1)
            out.append(line); continue
        if 'class="np-eyebrow"' in line and "data-comment" not in line:
            line = re.sub(r'(<span class="np-eyebrow")', r'\1 data-comment="navp-%s-eyebrow"' % sp, line, 1)
            out.append(line); continue
        if 'class="np-pill"' in line and "data-comment" not in line:
            line = re.sub(r'(<a class="np-pill"[^>]*?)>', r'\1 data-comment="navp-%s-allcats">' % sp, line, 1)
            out.append(line); continue
        if 'class="np-seeall"' in line and "data-comment" not in line:
            line = re.sub(r'(<a class="np-seeall"[^>]*?)>', r'\1 data-comment="navp-%s-%s-seeall">' % (sp, col), line, 1)
            out.append(line); continue
        m = re.search(r'<a class="np-link"[^>]*>(.*?)</a>', line)
        if m and "data-comment" not in line:
            it = slug(m.group(1))
            line = re.sub(r'(<a class="np-link"[^>]*?)>', r'\1 data-comment="navp-%s-%s-%s">' % (sp, col, it), line, 1)
            out.append(line); continue
        out.append(line)
    return "\n".join(out)

def canonical():
    h = (ROOT / "shop.html").read_text(encoding="utf-8")
    out = {}
    for pid in PANELS:
        s, e = find_block(h, pid)
        out[pid] = add_dc(h[s:e], pid)
    return out

def run(check=False):
    canon = canonical()
    # sanity: canonical must have unique data-comments among themselves
    changed_total = 0
    for f in pages():
        h = f.read_text(encoding="utf-8")
        orig = h
        for pid in PANELS:
            loc = find_block(h, pid)
            if not loc:
                continue
            s, e = loc
            if h[s:e] != canon[pid]:
                h = h[:s] + canon[pid] + h[e:]
        if h != orig:
            changed_total += 1
            if check:
                print("would update:", f.name)
            else:
                f.write_text(h, encoding="utf-8")
                print("updated:", f.name)
    if check:
        print("nav out of sync on %d page(s)" % changed_total)
        return 1 if changed_total else 0
    print("done; %d page(s) changed" % changed_total)
    return 0

if __name__ == "__main__":
    sys.exit(run("--check" in sys.argv[1:]))
