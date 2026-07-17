# Local design test

Two-part local test for **usability** and **EBMS-design rule conformance**. No
npm, no framework — matches the rest of `tools/`.

| Half | File | Checks | Needs a browser? |
| --- | --- | --- | --- |
| Static | `ebms-audit.py` | EBMS rules + markup-level a11y | No |
| Rendered | `usability-audit.js` | contrast, tap targets, reflow, focus, headings | Yes |

---

## 1. Static — EBMS rules + markup a11y (`ebms-audit.py`)

Parses every shipped page and asserts the rules from
`ebms-design/docs/INSTRUCTIONS.md` plus the Whiffletree conventions.

```bash
python3 tools/ebms-audit.py                 # full report, all top-level pages
python3 tools/ebms-audit.py home.html       # one file
python3 tools/ebms-audit.py --check         # errors only; exit 1 if any (CI/pre-commit)
python3 tools/ebms-audit.py --warn-as-error # fail on warnings too
```

**Errors** (block): external local CSS/JS, empty/duplicate `data-comment`,
missing doctype/charset/viewport, Google-Fonts URL missing `display=block`,
`<html>` missing `lang`, `<img>` missing `alt`.
**Warnings** (advisory): missing `data-comment` on content tags, no `:root`
tokens, logo not → `home.html`, form controls with no accessible name,
positive `tabindex`, zoom-blocking viewport.

This supersedes `ebms-design/validate-html.sh` for the Whiffletree pages (adds
`display=block`, `lang`, `alt`, logo→home, accessible-name checks; uses a real
HTML parser instead of grep so `<script>`/`<style>` bodies are skipped).

---

## 2. Rendered — usability (`usability-audit.js`)

Layout- and colour-dependent checks that markup can't answer. Audits **whatever
is currently on screen**, so set the viewport *before* running to test a
breakpoint. Returns a JSON-serialisable object; `wtAuditReport()` pretty-prints.

Rules: `CONTRAST` (WCAG 1.4.3), `TARGET-SIZE` (2.5.8 — 24px min / 44px rec),
`REFLOW` (1.4.10 — no horizontal scroll), `FOCUS` (2.4.7 — focus styles exist),
`HEADINGS` (1.3.1 order), `BUTTON-WRAP` (project rule: CTAs never wrap),
`TEXT-SIZE` (<12px).

### Run it in real Chrome (recommended — gives real pixel sizes)

1. Serve the site: `python3 -m http.server 8773` (or launch config `static`).
2. Open a page, e.g. `http://localhost:8773/home.html`.
3. DevTools console → paste the contents of `tools/usability-audit.js`, then:
   ```js
   wtAuditReport();                 // grouped, collapsible report
   wtUsabilityAudit();              // raw object (for scripting)
   ```
4. Test a breakpoint by resizing the window (or device toolbar) first, then
   re-run. Repeat at 375 / 768 / 1024 / 1280.

### Bookmarklet (one click, any page)

```
javascript:(function(){var s=document.createElement('script');s.src='/tools/usability-audit.js';s.onload=function(){wtAuditReport();};document.head.appendChild(s);})();
```

### Driving it from the in-app Browser pane (headless)

Works fully — but you must set an **explicit** width/height, not a named
preset. The `desktop`/`tablet`/`mobile` presets leave the viewport at 0×0
(flex/grid boxes collapse, and the tool auto-skips `TARGET-SIZE`/`REFLOW`/
`BUTTON-WRAP` with an `ENV` warning). An explicit size gives a real viewport:

```
resize_window({ width: 375,  height: 812 })   # then inject + wtUsabilityAudit()
resize_window({ width: 768,  height: 1024 })
resize_window({ width: 1024, height: 768 })
resize_window({ width: 1280, height: 800 })
```

The width persists across `navigate`, so set it once and sweep pages.
`CONTRAST`, `HEADINGS`, `FOCUS` and `TEXT-SIZE` are width-independent and
accurate even at 0×0.

---

## Suggested loop

```bash
python3 tools/ebms-audit.py            # gate: must be 0 errors
# then, in real Chrome at each breakpoint:
wtAuditReport();                       # triage contrast + layout findings
```

Not wired as a pre-commit gate yet — run on demand, fix errors, re-run. Wire
`ebms-audit.py --check` into `ebms-design/.claude/settings.json` once the
warning backlog is triaged.
