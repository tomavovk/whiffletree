/* ============================================================================
   Whiffletree — shared Account component
   Wires the header Account icon on every page to a login popover; sign-up is a
   dedicated page (register.html), reached via openSignup().
   Auth is a localStorage-backed MOCK (no backend) so state persists across pages.
   Exposes window.WTAccount for page-specific code (e.g. Members Hub) to consume.
   ========================================================================== */
(function () {
    'use strict';

    var LS_KEY = 'wtAccount';
    var ACCOUNT_URL = 'account.html'; /* signed-in destination (page built separately) */
    var listeners = [];
    var state = load();

    function goAccount() { window.location.href = ACCOUNT_URL; }

    function load() {
        try {
            var s = JSON.parse(localStorage.getItem(LS_KEY));
            if (s && typeof s.signedIn === 'boolean') return s;
        } catch (e) { }
        return { signedIn: false, user: { name: '', email: '' } };
    }
    function persist() { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { } }
    function notify() { listeners.forEach(function (cb) { try { cb(state); } catch (e) { } }); }

    function deriveName(email) {
        var local = (email || '').split('@')[0];
        if (!local) return 'Whiffletree Member';
        return local.split(/[._\-+]/).filter(Boolean).map(function (w) {
            return w.charAt(0).toUpperCase() + w.slice(1);
        }).join(' ');
    }
    function avatarFor(name) {
        var seed = encodeURIComponent((name || 'WT').trim() || 'WT');
        return 'https://api.dicebear.com/7.x/initials/svg?seed=' + seed + '&backgroundColor=14682a&textColor=ffffff';
    }

    /* ---- SVG logos ---- */
    var G = '<svg class="wta-logo" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.28-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
    var A = '<svg class="wta-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#000000" d="M17.05 12.53c-.03-2.53 2.07-3.75 2.16-3.81-1.18-1.72-3.01-1.96-3.66-1.98-1.56-.16-3.04.92-3.83.92-.79 0-2.01-.9-3.31-.87-1.7.03-3.27 1-4.15 2.53-1.77 3.07-.45 7.62 1.27 10.11.84 1.22 1.84 2.59 3.15 2.54 1.26-.05 1.74-.82 3.27-.82 1.52 0 1.95.82 3.28.79 1.36-.02 2.22-1.24 3.05-2.47.96-1.42 1.36-2.79 1.38-2.86-.03-.01-2.65-1.02-2.68-4.05zM14.63 4.84c.7-.85 1.17-2.02 1.04-3.19-1.01.04-2.23.67-2.95 1.52-.65.75-1.21 1.95-1.06 3.1 1.12.09 2.27-.57 2.97-1.43z"/></svg>';
    var F = '<svg class="wta-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#1877F2" d="M24 12c0-6.63-5.37-12-12-12S0 5.37 0 12c0 5.99 4.39 10.95 10.13 11.85v-8.38H7.08V12h3.05V9.41c0-3.01 1.79-4.68 4.53-4.68 1.31 0 2.68.24 2.68.24v2.95h-1.51c-1.49 0-1.95.93-1.95 1.87V12h3.33l-.53 3.47h-2.8v8.38C19.61 22.95 24 17.99 24 12z"/><path fill="#FFFFFF" d="M16.68 15.47 17.21 12h-3.33V9.79c0-.94.46-1.87 1.95-1.87h1.51V4.97s-1.37-.24-2.68-.24c-2.74 0-4.53 1.67-4.53 4.68V12H7.08v3.47h3.05v8.38a12.1 12.1 0 0 0 3.75 0v-8.38h2.8z"/></svg>';

    function providers(compact) {
        function btn(provider, logo) {
            return '<button type="button" class="wta-provider" data-wta-action="social" data-wta-provider="' + provider + '"'
                + (compact ? ' aria-label="Continue with ' + provider + '" title="Continue with ' + provider + '"' : '')
                + '>' + logo + (compact ? '' : ' Continue with ' + provider) + '</button>';
        }
        return '<div class="wta-providers' + (compact ? ' wta-providers--compact' : '') + '">'
            + btn('Google', G) + btn('Apple', A) + btn('Facebook', F) + '</div>';
    }

    function loginFormHTML() {
        return providers(true)
            + '<div class="wta-divider">or</div>'
            + '<form class="wta-form" data-wta-loginform onsubmit="return false;">'
            +   '<div class="wta-field wta-field--full"><label class="wta-label">Email</label><input class="wta-input" type="email" data-wta-email placeholder="you@email.com"></div>'
            +   '<div class="wta-field wta-field--full"><label class="wta-label">Password</label><input class="wta-input" type="password" placeholder="Your password"></div>'
            +   '<button type="button" class="wta-linkbtn wta-forgot" data-wta-action="forgot">Forgot password?</button>'
            +   '<button type="submit" class="wta-btn wta-btn-primary wta-btn--block" data-wta-action="email-login">Log in</button>'
            + '</form>';
    }

    function popHTML() {
        if (state.signedIn) {
            var name = state.user.name || 'Whiffletree Member';
            return '<div class="wta-menu-head">'
                +   '<img class="wta-avatar" src="' + avatarFor(name) + '" alt="">'
                +   '<div class="wta-id"><span class="wta-hello">Signed in as</span><span class="wta-name">' + esc(name) + '</span></div>'
                + '</div>'
                + '<nav class="wta-menu">'
                +   '<a class="wta-menu-item" href="#"><i class="ph ph-user-circle" aria-hidden="true"></i> My account</a>'
                +   '<a class="wta-menu-item" href="members.html"><i class="ph ph-images-square" aria-hidden="true"></i> My posts</a>'
                +   '<a class="wta-menu-item" href="#"><i class="ph ph-package" aria-hidden="true"></i> Orders</a>'
                + '</nav>'
                + '<div class="wta-menu-foot"><button type="button" class="wta-btn wta-btn-secondary wta-btn--block" data-wta-action="logout"><i class="ph ph-sign-out" aria-hidden="true"></i> Log out</button></div>';
        }
        return '<button type="button" class="wta-pop-close" aria-label="Close" data-wta-action="close-login"><i class="ph ph-x" aria-hidden="true"></i></button>'
            + '<div class="wta-pop-head"><h2 class="wta-pop-title">Log in</h2><p class="wta-pop-sub">Post, comment, and check out faster.</p></div>'
            + loginFormHTML()
            + '<p class="wta-pop-alt">New to Whiffletree? <button type="button" class="wta-linkbtn" data-wta-action="open-signup">Sign up</button></p>';
    }

    function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }

    /* ---- DOM refs ---- */
    var icon, anchor, pop, scrim, toastEl, toastTimer, returnFocus = null;

    function build() {
        icon = document.querySelector('[data-comment="header-action-user"]');
        if (!icon || icon.dataset.wtaInit) return false;
        icon.dataset.wtaInit = '1';

        anchor = document.createElement('span');
        anchor.className = 'wta-anchor';
        icon.parentNode.insertBefore(anchor, icon);
        anchor.appendChild(icon);

        /* Dimmed backdrop + centered login dialog live at the body root so they
           overlay the whole page and can't be clipped by header stacking. */
        scrim = document.createElement('div');
        scrim.className = 'wta-scrim';
        scrim.setAttribute('data-wta-action', 'overlay-close');
        document.body.appendChild(scrim);

        pop = document.createElement('div');
        pop.className = 'wta-pop';
        pop.setAttribute('role', 'dialog');
        pop.setAttribute('aria-modal', 'true');
        pop.setAttribute('aria-label', 'Log in');
        pop.setAttribute('aria-hidden', 'true');
        pop.setAttribute('data-comment', 'header-account-pop');
        document.body.appendChild(pop);

        icon.setAttribute('role', 'button');
        icon.setAttribute('tabindex', '0');
        icon.setAttribute('aria-haspopup', 'dialog');
        icon.setAttribute('aria-expanded', 'false');
        icon.setAttribute('aria-label', 'Account');
        icon.style.cursor = 'pointer';
        icon.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); togglePop(); });
        icon.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePop(); } });

        toastEl = document.createElement('div');
        toastEl.className = 'wta-toast';
        toastEl.setAttribute('role', 'status');
        toastEl.setAttribute('aria-live', 'polite');
        toastEl.innerHTML = '<i class="ph ph-check-circle" aria-hidden="true"></i> <span class="wta-toast-text"></span>';
        document.body.appendChild(toastEl);

        wireEnhance(); /* enhance popover selects if the page has a custom dropdown enhancer */
        renderPop();
        return true;
    }

    function renderPop() { if (pop) pop.innerHTML = popHTML(); }
    function wireEnhance() { /* login popover has no custom selects — nothing to enhance by default */ }

    /* ---- Login modal open/close ---- */
    function openPop() {
        if (!pop) return;
        if (state.signedIn) { goAccount(); return; } /* signed in → straight to account, no menu */
        returnFocus = document.activeElement;
        renderPop();
        if (scrim) scrim.classList.add('on');
        pop.classList.add('on');
        pop.setAttribute('aria-hidden', 'false');
        icon.setAttribute('aria-expanded', 'true');
        document.documentElement.style.overflow = 'hidden';
        document.addEventListener('keydown', popKey);
        var f = pop.querySelector('input, a, button');
        if (f) f.focus();
    }
    function closePop() {
        if (!pop || !pop.classList.contains('on')) return;
        pop.classList.remove('on');
        if (scrim) scrim.classList.remove('on');
        pop.setAttribute('aria-hidden', 'true');
        icon.setAttribute('aria-expanded', 'false');
        document.documentElement.style.overflow = '';
        document.removeEventListener('keydown', popKey);
        if (returnFocus && document.contains(returnFocus)) { try { returnFocus.focus(); } catch (e) { } }
        returnFocus = null;
    }
    function togglePop() { if (state.signedIn) { goAccount(); return; } if (pop.classList.contains('on')) closePop(); else openPop(); }
    function popKey(e) {
        if (e.key === 'Escape') { closePop(); if (icon.focus) icon.focus(); return; }
        if (e.key !== 'Tab') return;
        var f = pop.querySelectorAll('a[href], button, input, select, textarea');
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    /* ---- Signup: go to the dedicated page ----
       Registration is a long, multi-section form, so it lives on its own page
       (register.html) rather than a dismissable modal — a stray backdrop click
       or Esc must never wipe a half-filled form. We remember the current page
       in ?next= so the user is returned here after signing up. */
    function openSignup() {
        closePop();
        var here = (location.pathname.split('/').pop() || 'home.html');
        if (/^register\.html$/i.test(here)) return; /* already here — no-op */
        location.href = 'register.html?next=' + encodeURIComponent(here);
    }
    /* ---- Toast ---- */
    function toast(msg) {
        if (!toastEl) return;
        toastEl.querySelector('.wta-toast-text').textContent = msg;
        toastEl.classList.add('on');
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(function () { toastEl.classList.remove('on'); }, 2600);
    }

    /* ---- Auth actions (mock) ---- */
    function login(user) {
        state.signedIn = true;
        state.user = { name: (user && user.name) || 'Whiffletree Member', email: (user && user.email) || '' };
        persist(); closePop(); renderPop(); notify();
        toast('You’re signed in as ' + state.user.name);
    }
    function socialLogin(provider) {
        state.signedIn = true;
        if (!state.user.name) state.user = { name: 'Alex Green', email: '' };
        persist(); closePop(); renderPop(); notify();
        goAccount(); /* land the user in their account */
    }
    function emailLogin() {
        var email = (pop.querySelector('[data-wta-email]') || {}).value || '';
        login({ name: email ? deriveName(email) : 'Alex Green', email: email });
        goAccount();
    }
    function logout() {
        state.signedIn = false;
        state.user = { name: '', email: '' };
        persist(); closePop(); renderPop(); notify();
        toast('Signed out');
    }

    /* ---- Delegated events ---- */
    document.addEventListener('click', function (e) {
        var el = e.target.closest ? e.target.closest('[data-wta-action]') : null;
        if (!el) return;
        var action = el.getAttribute('data-wta-action');
        if (action === 'social') { e.preventDefault(); socialLogin(el.getAttribute('data-wta-provider')); }
        else if (action === 'email-login') { e.preventDefault(); emailLogin(); }
        else if (action === 'forgot') { e.preventDefault(); closePop(); window.location.href = 'forgot-password.html'; }
        else if (action === 'open-signup') { e.preventDefault(); openSignup(); }
        else if (action === 'logout') { e.preventDefault(); logout(); }
        else if (action === 'close-login' || action === 'overlay-close') { e.preventDefault(); closePop(); }
    });

    /* ---- Public API ---- */
    window.WTAccount = {
        isSignedIn: function () { return state.signedIn; },
        getUser: function () { return { name: state.user.name, email: state.user.email }; },
        onChange: function (cb) { listeners.push(cb); return function () { listeners = listeners.filter(function (f) { return f !== cb; }); }; },
        login: login,
        logout: logout,
        openLogin: openPop,
        closeLogin: closePop,
        openSignup: openSignup,
        refresh: renderPop
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
    else build();
})();
