/*
 * usability-audit.js — the RENDER-DEPENDENT half of the local design test.
 *
 * These checks cannot be done from markup: they need real computed styles and
 * layout boxes. Run this against a page rendered in a browser (the project's
 * dev server: `python3 -m http.server 8773`, launch config "static").
 *
 * It audits WHATEVER is currently on screen, so set the viewport BEFORE calling
 * to test a breakpoint. Returns a plain object (JSON-serialisable) — no console
 * side effects — so it can be driven from the Browser pane / DevTools / CI:
 *
 *     wtUsabilityAudit()                       // audit at the current width
 *     wtUsabilityAudit({ max: 15 })            // cap items reported per rule
 *
 * Static/markup rules (lang, self-contained, data-comment, alt, font-display)
 * live in tools/ebms-audit.py — this file deliberately does NOT repeat them.
 *
 * WCAG references: 1.4.3 contrast, 2.5.8 target size (24px AA / 44px AAA),
 * 2.4.7 focus visible, 1.4.10 reflow (no horizontal scroll at 320–375px),
 * 1.3.1 heading order.
 */
(function (root) {
  function wtUsabilityAudit(opts) {
    opts = opts || {};
    var MAX = opts.max || 20;
    var findings = [];
    // Headless/iframe browsers can report innerWidth 0 — prefer the layout width.
    var vw = document.documentElement.clientWidth || window.innerWidth || 0;
    var vh = document.documentElement.clientHeight || window.innerHeight || 0;

    function add(rule, severity, msg, el, detail) {
      findings.push({
        rule: rule, severity: severity, msg: msg,
        dataComment: el && el.getAttribute ? el.getAttribute('data-comment') : null,
        selector: el ? cssPath(el) : null,
        detail: detail || null,
      });
    }
    function cssPath(el) {
      if (!el || el.nodeType !== 1) return null;
      var dc = el.getAttribute('data-comment');
      if (dc) return '[data-comment="' + dc + '"]';
      var parts = [], node = el, depth = 0;
      while (node && node.nodeType === 1 && depth < 4) {
        var s = node.tagName.toLowerCase();
        if (node.id) { parts.unshift(s + '#' + node.id); break; }
        if (node.className && typeof node.className === 'string') {
          var c = node.className.trim().split(/\s+/)[0];
          if (c) s += '.' + c;
        }
        parts.unshift(s); node = node.parentElement; depth++;
      }
      return parts.join(' > ');
    }
    function visible(el) {
      // walk ancestors so closed popups/menus (display:none, visibility:hidden,
      // opacity:0 on a parent) are correctly treated as not-on-screen
      var node = el;
      while (node && node.nodeType === 1) {
        var s = getComputedStyle(node);
        if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false;
        node = node.parentElement;
      }
      var r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return false;
      // fully off-screen (e.g. transformed-away drawers) — skip
      if (vw && (r.right < 0 || r.left > vw)) return false;
      return true;
    }

    /* ── colour helpers ─────────────────────────────────────────────── */
    function parseColor(c) {
      var m = c && c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      var p = m[1].split(',').map(function (x) { return parseFloat(x); });
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    }
    function lum(c) {
      var a = [c.r, c.g, c.b].map(function (v) {
        v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    }
    function ratio(fg, bg) {
      var l1 = lum(fg), l2 = lum(bg);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    }
    // walk up for the first opaque background colour; bail on image/gradient.
    // Returns { color, fallback } — fallback=true means no explicit bg was found
    // (assumed white), which is the tell-tale of text sitting over an image.
    function effectiveBg(el) {
      var node = el;
      while (node && node.nodeType === 1) {
        var s = getComputedStyle(node);
        if (s.backgroundImage && s.backgroundImage !== 'none') return null; // can't measure
        var c = parseColor(s.backgroundColor);
        if (c && c.a === 1) return { color: c, fallback: false };
        node = node.parentElement;
      }
      return { color: { r: 255, g: 255, b: 255, a: 1 }, fallback: true };
    }

    // Some headless/iframe browsers report a 0-size layout viewport. When that
    // happens, flex/grid boxes collapse to degenerate sizes, so target-size,
    // reflow and button-wrap measurements are meaningless — skip them and say
    // so. Contrast, headings, text-size and focus don't depend on width.
    var layoutOK = vw > 0 && vh > 0;
    if (!layoutOK) {
      add('ENV', 'warn',
        'layout viewport is 0×0 (headless preview) — TARGET-SIZE, REFLOW and ' +
        'BUTTON-WRAP were skipped. Run in a real browser at a set width for those.',
        null);
    }

    var all = Array.prototype.slice.call(document.body.querySelectorAll('*'));

    /* ── 1.4.3 contrast — text nodes only ───────────────────────────── */
    var contrastHits = [];
    all.forEach(function (el) {
      if (!visible(el)) return;
      var hasText = Array.prototype.some.call(el.childNodes, function (n) {
        return n.nodeType === 3 && n.textContent.trim().length > 1;
      });
      if (!hasText) return;
      var s = getComputedStyle(el);
      var fg = parseColor(s.color); if (!fg || fg.a === 0) return;
      var bgInfo = effectiveBg(el); if (!bgInfo) return; // over an image — can't measure
      var bg = bgInfo.color;
      if (fg.a < 1) { // flatten text alpha over bg
        fg = { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 };
      }
      var size = parseFloat(s.fontSize), wt = parseInt(s.fontWeight, 10) || 400;
      var large = size >= 24 || (size >= 18.66 && wt >= 700);
      var need = large ? 3.0 : 4.5;
      var cr = ratio(fg, bg);
      if (cr >= need) return;
      // A near-1.0 ratio means fg ≈ bg — never an intentional design; it's the
      // signature of text sitting over an image/video that we can't sample
      // (e.g. a hero <img> behind a section with its own white bg). Likewise a
      // fallback (assumed-white) bg under light text. Downgrade both to advisory.
      var overImage = cr < 1.5 || (bgInfo.fallback && lum(fg) > 0.5);
      contrastHits.push({ el: el, cr: cr, need: need, size: size, overImage: overImage });
    });
    contrastHits.sort(function (a, b) { return a.cr - b.cr; });
    contrastHits.slice(0, MAX).forEach(function (h) {
      add('CONTRAST', h.overImage ? 'warn' : 'error',
        h.overImage
          ? 'contrast undetermined at ' + Math.round(h.size) + 'px — text likely over an image (verify manually)'
          : 'contrast ' + h.cr.toFixed(2) + ':1 (needs ' + h.need + ':1) at ' + Math.round(h.size) + 'px',
        h.el);
    });
    if (contrastHits.length > MAX) add('CONTRAST', 'error', '(+' + (contrastHits.length - MAX) + ' more low-contrast text nodes)', null);

    /* ── 2.5.8 target size — interactive elements ───────────────────── */
    var interactiveSel = 'a[href], button, input:not([type=hidden]), select, textarea, [role=button], [onclick]';
    var interactive = Array.prototype.slice.call(document.body.querySelectorAll(interactiveSel))
      .filter(visible);
    var smallHits = [];
    if (layoutOK) interactive.forEach(function (el) {
      // WCAG 2.5.8 inline exception: a link that flows inline within text
      // (display:inline — breadcrumbs, "edit", links in a sentence) is exempt,
      // its size being constrained by the surrounding line-height.
      if (el.tagName === 'A' && getComputedStyle(el).display === 'inline') return;
      var r = el.getBoundingClientRect();
      var min = Math.min(r.width, r.height);
      if (min > 0 && min < 24) smallHits.push({ el: el, w: r.width, h: r.height });
      else if (min >= 24 && min < 44) smallHits.push({ el: el, w: r.width, h: r.height, warn: true });
    });
    smallHits.sort(function (a, b) { return Math.min(a.w, a.h) - Math.min(b.w, b.h); });
    smallHits.slice(0, MAX).forEach(function (h) {
      add('TARGET-SIZE', h.warn ? 'warn' : 'error',
        'tap target ' + Math.round(h.w) + '×' + Math.round(h.h) + 'px' +
        (h.warn ? ' (<44px recommended)' : ' (<24px WCAG minimum)'),
        h.el);
    });

    /* ── 1.4.10 reflow — no horizontal scroll ───────────────────────── */
    var docW = document.documentElement.scrollWidth;
    if (layoutOK && docW > vw + 1) {
      var overflowers = all.filter(function (el) {
        if (!visible(el)) return false;
        var r = el.getBoundingClientRect();
        return r.right > vw + 1 && r.width <= docW;
      }).sort(function (a, b) {
        return b.getBoundingClientRect().right - a.getBoundingClientRect().right;
      });
      add('REFLOW', 'error',
        'page scrolls horizontally: content ' + docW + 'px > viewport ' + vw + 'px', null);
      overflowers.slice(0, 8).forEach(function (el) {
        var r = el.getBoundingClientRect();
        add('REFLOW', 'error', 'overflows to ' + Math.round(r.right) + 'px', el);
      });
    }

    /* ── button never wraps to two lines (project rule) ─────────────── */
    var btns = Array.prototype.slice.call(
      document.body.querySelectorAll('button, .btn, [class*="btn"], a[class*="cta"]'))
      .filter(visible);
    var wrapHits = [];
    if (layoutOK) btns.forEach(function (el) {
      if (!el.textContent.trim()) return;
      var s = getComputedStyle(el);
      var lh = parseFloat(s.lineHeight);
      if (isNaN(lh)) lh = parseFloat(s.fontSize) * 1.2;
      var inner = el.clientHeight - parseFloat(s.paddingTop) - parseFloat(s.paddingBottom);
      if (lh > 0 && inner > lh * 1.6) wrapHits.push(el);
    });
    wrapHits.slice(0, MAX).forEach(function (el) {
      add('BUTTON-WRAP', 'warn',
        'button text appears to wrap to 2+ lines: "' + el.textContent.trim().slice(0, 40) + '"', el);
    });

    /* ── 2.4.7 focus visible ─────────────────────────────────────────
       :focus-visible only applies on keyboard focus, so per-element runtime
       probing is unreliable. Instead scan the stylesheets for focus rules and
       flag only the definitive case: the page defines none at all, and relies
       on the UA default that many resets remove. */
    var focusRuleCount = 0, outlineNoneReset = false;
    try {
      Array.prototype.forEach.call(document.styleSheets, function (ss) {
        var rules; try { rules = ss.cssRules; } catch (e) { return; } // cross-origin
        if (!rules) return;
        Array.prototype.forEach.call(rules, function (rule) {
          var sel = rule.selectorText || '';
          if (/:focus(-visible|-within)?\b/.test(sel)) focusRuleCount++;
          if (/^\s*\*/.test(sel) && rule.style && rule.style.outline &&
              /none|0/.test(rule.style.outline)) outlineNoneReset = true;
        });
      });
    } catch (e) {}
    if (focusRuleCount === 0) {
      add('FOCUS', 'warn',
        'no :focus / :focus-visible styles defined on the page' +
        (outlineNoneReset ? ' (and a reset removes the default outline)' : '') +
        ' — keyboard users get no visible focus indicator', null);
    }

    /* ── 1.3.1 heading order ────────────────────────────────────────── */
    var heads = Array.prototype.slice.call(document.body.querySelectorAll('h1,h2,h3,h4,h5,h6'))
      .filter(visible);
    var h1s = heads.filter(function (h) { return h.tagName === 'H1'; });
    if (h1s.length === 0) add('HEADINGS', 'warn', 'page has no <h1>', null);
    if (h1s.length > 1) add('HEADINGS', 'warn', 'page has ' + h1s.length + ' <h1> elements', null);
    var prev = 0;
    heads.forEach(function (h) {
      var lvl = +h.tagName[1];
      if (prev && lvl > prev + 1) {
        add('HEADINGS', 'warn',
          'heading level jumps h' + prev + ' → h' + lvl + ': "' + h.textContent.trim().slice(0, 40) + '"', h);
      }
      prev = lvl;
    });

    /* ── tiny text ──────────────────────────────────────────────────── */
    var tiny = [];
    all.forEach(function (el) {
      if (!visible(el)) return;
      var hasText = Array.prototype.some.call(el.childNodes, function (n) {
        return n.nodeType === 3 && n.textContent.trim().length > 1;
      });
      if (!hasText) return;
      var size = parseFloat(getComputedStyle(el).fontSize);
      if (size && size < 12) tiny.push({ el: el, size: size });
    });
    tiny.sort(function (a, b) { return a.size - b.size; });
    tiny.slice(0, MAX).forEach(function (t) {
      add('TEXT-SIZE', 'warn', 'text at ' + t.size.toFixed(1) + 'px (<12px hard to read)', t.el);
    });

    var errors = findings.filter(function (f) { return f.severity === 'error'; }).length;
    var warns = findings.filter(function (f) { return f.severity === 'warn'; }).length;
    return {
      url: location.pathname,
      viewport: vw + '×' + vh,
      passed: errors === 0,
      counts: { errors: errors, warnings: warns },
      findings: findings,
    };
  }

  // Human-friendly console report — handy when pasted into real Chrome DevTools.
  function wtAuditReport(opts) {
    var r = wtUsabilityAudit(opts);
    var tag = r.passed ? '%c✓ usability' : '%c✗ usability';
    var css = r.passed ? 'color:#0a0;font-weight:bold' : 'color:#c00;font-weight:bold';
    console.log(tag + ' — ' + r.url + ' @ ' + r.viewport +
      ' — %c' + r.counts.errors + ' error(s), ' + r.counts.warnings + ' warning(s)',
      css, 'color:inherit');
    var groups = {};
    r.findings.forEach(function (f) { (groups[f.rule] = groups[f.rule] || []).push(f); });
    Object.keys(groups).forEach(function (rule) {
      console.groupCollapsed(rule + ' (' + groups[rule].length + ')');
      groups[rule].forEach(function (f) {
        console.log((f.severity === 'error' ? '✗ ' : '⚠ ') + (f.dataComment || f.selector || '') + ' — ' + f.msg);
      });
      console.groupEnd();
    });
    return r;
  }

  root.wtUsabilityAudit = wtUsabilityAudit;
  root.wtAuditReport = wtAuditReport;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { wtUsabilityAudit: wtUsabilityAudit, wtAuditReport: wtAuditReport };
  }
})(typeof window !== 'undefined' ? window : this);
