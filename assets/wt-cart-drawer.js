/* ============================================================================
   Whiffletree — shared Cart Drawer component
   Right-side drawer opened from the header cart icon (click only — the
   fly-to-cart animation on add stays as-is, per client decision).
   Extends the existing wt-cart badge mock: line items persist across pages in
   localStorage ('wt_cart_items'); the legacy 'wt_cart_count' key is kept in
   sync so the red-dot badge logic keeps working unchanged.
   Includes the inline discount progress bar and the pollination check with a
   compatible-pollinator cross-sell (see docs/cart-checkout-spec.md §2, §7).
   PRODUCTION: replace the localStorage store with the real WooCommerce cart;
   the pollination result comes from the backend rule engine.
   ========================================================================== */
(function () {
    'use strict';

    var ITEMS_KEY = 'wt_cart_items';
    var COUNT_KEY = 'wt_cart_count';
    var DISCOUNT_THRESHOLD = 500;   /* existing "spend $500 → 10% off" promo */
    var DISCOUNT_RATE = 0.10;
    var CHECKOUT_URL = 'checkout.html';

    /* ── Nursery mock data (per-category) ─────────────────────────────── */
    var ROOTSTOCK = {
        apples: 'MM.106 rootstock', pears: 'OHxF 87 rootstock', plums: 'Myrobalan rootstock',
        cherries: 'Gisela 6 rootstock', peaches: 'Bailey rootstock', apricots: 'Manchurian rootstock'
    };
    var CAT_IMG = {
        apples: 'assets/cat-apples.png', pears: 'assets/cat-pears.png', plums: 'assets/cat-plums.jpg',
        cherries: 'assets/cat-cherries.png', peaches: 'assets/cat-peaches.png', apricots: 'assets/cat-apricots.png',
        grapes: 'assets/cat-grapes.png', nuts: 'assets/cat-nuts.png', shrubs: 'assets/cat-shrubs.png',
        supplies: 'assets/cat-supplies.png', books: 'assets/books.png'
    };
    /* Compatible-pollinator recommendations (mock of the §7 rule engine —
       real varieties from the catalogue, same species + overlapping bloom). */
    var POLLINATORS = {
        apples:   [{ name: 'Liberty Apple', price: 44.95, type: 'Apple tree' }, { name: 'Harcourt Apple', price: 39.95, type: 'Apple tree' }],
        pears:    [{ name: 'Shinsui Asian Pear', price: 39.95, type: 'Pear tree' }, { name: 'Flemish Beauty European Pear', price: 39.95, type: 'Pear tree' }],
        plums:    [{ name: 'Shiro Japanese Plum', price: 46.95, type: 'Plum tree' }, { name: 'Superior American Hybrid Plum', price: 46.95, type: 'Plum tree' }],
        cherries: [{ name: 'Stella Sweet Cherry', price: 49.95, type: 'Cherry tree' }],
        apricots: [{ name: 'Precious Apricot', price: 49.95, type: 'Apricot tree' }],
        peaches:  [{ name: 'Reliance Peach', price: 49.95, type: 'Peach tree' }]
    };

    /* ── Store (localStorage-backed, cross-page mock) ─────────────────── */
    function loadItems() {
        try { var a = JSON.parse(localStorage.getItem(ITEMS_KEY)); return Array.isArray(a) ? a : []; }
        catch (e) { return []; }
    }
    function totalQty(items) { return items.reduce(function (n, it) { return n + (it.qty || 0); }, 0); }
    function subtotal(items) { return items.reduce(function (n, it) { return n + (it.price || 0) * (it.qty || 0); }, 0); }
    function saveItems(items) {
        try {
            localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
            localStorage.setItem(COUNT_KEY, String(totalQty(items)));
        } catch (e) { }
        refreshBadge(items);
    }
    function refreshBadge(items) {
        var b = document.querySelector('[data-comment="header-cart-badge"]');
        if (b) b.classList.toggle('on', totalQty(items) > 0);
    }
    function addItem(items, p) {
        for (var i = 0; i < items.length; i++) {
            if (items[i].id === p.id) { items[i].qty += 1; return items; }
        }
        items.push({ id: p.id, name: p.name, price: p.price, category: p.category, chars: p.chars, img: p.img, type: p.type, qty: 1 });
        return items;
    }

    /* ── Helpers ───────────────────────────────────────────────────────── */
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
    function fmt(n) { return '$' + (Math.round(n * 100) / 100).toFixed(2); }
    function bgUrl(el) {
        if (!el) return '';
        var m = /url\(['"]?([^'")]+)['"]?\)/.exec(el.style.backgroundImage || '');
        return m ? m[1] : '';
    }
    function guessCategory(name) {
        var n = String(name).toLowerCase();
        if (n.indexOf('apple') !== -1) return 'apples';
        if (n.indexOf('pear') !== -1) return 'pears';
        if (n.indexOf('plum') !== -1) return 'plums';
        if (n.indexOf('cherry') !== -1) return 'cherries';
        if (n.indexOf('peach') !== -1) return 'peaches';
        if (n.indexOf('apricot') !== -1) return 'apricots';
        if (n.indexOf('grape') !== -1) return 'grapes';
        return '';
    }
    function detailFor(it) {
        var parts = [];
        if (it.type) parts.push(it.type);
        if (ROOTSTOCK[it.category]) parts.push(ROOTSTOCK[it.category]);
        else if (it.category && CAT_IMG[it.category] && it.category !== 'supplies' && it.category !== 'books') parts.push('Bare-root');
        return parts.join(' · ');
    }

    /* Derive the product from whatever element triggered the add:
       a catalogue card, an advisor product card, or explicit data-cart-* attrs. */
    function productFrom(src) {
        if (!src || !src.closest) return null;
        var card = src.closest('.cat-card');
        if (card && card.dataset && card.dataset.name) {
            return {
                id: slug(card.dataset.name),
                name: card.dataset.name,
                price: parseFloat(card.dataset.price) || 0,
                category: card.dataset.category || '',
                chars: card.dataset.chars || '',
                img: bgUrl(card.querySelector('.cat-card-img')),
                type: (card.querySelector('.cat-card-type') || { textContent: '' }).textContent.trim()
            };
        }
        var adv = src.closest('.adv-prod-card');
        if (adv) {
            var nameEl = adv.querySelector('.adv-prod-name');
            if (nameEl) {
                var name = nameEl.textContent.trim();
                var priceEl = adv.querySelector('.adv-prod-price');
                var priceM = priceEl ? /([\d.]+)/.exec(priceEl.textContent) : null;
                return {
                    id: slug(name), name: name,
                    price: priceM ? parseFloat(priceM[1]) : 0,
                    category: guessCategory(name), chars: '',
                    img: bgUrl(adv.querySelector('.adv-prod-img')),
                    type: (adv.querySelector('.adv-prod-meta') || { textContent: '' }).textContent.trim()
                };
            }
        }
        if (src.dataset && src.dataset.cartName) {
            return {
                id: slug(src.dataset.cartName), name: src.dataset.cartName,
                price: parseFloat(src.dataset.cartPrice) || 0,
                category: src.dataset.cartCategory || guessCategory(src.dataset.cartName),
                chars: src.dataset.cartChars || '',
                img: src.dataset.cartImg || '',
                type: src.dataset.cartType || ''
            };
        }
        return null;
    }

    /* ── Pollination check (mock of the §7 rule engine) ───────────────── */
    function pollinationCheck(items) {
        var trees = items.filter(function (it) { return ROOTSTOCK[it.category]; });
        if (!trees.length) return null;
        var conflicts = [];
        trees.forEach(function (it) {
            if ((it.chars || '').indexOf('needs-pollenizer') === -1) return;
            var partner = trees.some(function (o) { return o !== it && o.category === it.category; });
            if (!partner) conflicts.push(it);
        });
        return { conflicts: conflicts };
    }
    function suggestionFor(item, items) {
        var pool = POLLINATORS[item.category] || [];
        for (var i = 0; i < pool.length; i++) {
            var inCart = items.some(function (it) { return it.id === slug(pool[i].name); });
            if (!inCart) {
                return {
                    id: slug(pool[i].name), name: pool[i].name, price: pool[i].price,
                    category: item.category, chars: '', img: CAT_IMG[item.category] || '', type: pool[i].type
                };
            }
        }
        return null;
    }

    /* ── Drawer DOM ────────────────────────────────────────────────────── */
    var scrim, drawer, lastFocused = null;

    function build() {
        if (drawer) return;
        scrim = document.createElement('div');
        scrim.className = 'wtc-scrim';
        scrim.setAttribute('data-comment', 'cart-drawer-scrim');
        scrim.setAttribute('aria-hidden', 'true');

        drawer = document.createElement('aside');
        drawer.className = 'wtc-drawer';
        drawer.setAttribute('data-comment', 'cart-drawer');
        drawer.setAttribute('role', 'dialog');
        drawer.setAttribute('aria-modal', 'true');
        drawer.setAttribute('aria-label', 'Shopping cart');
        drawer.innerHTML =
            '<div class="wtc-head" data-comment="cart-drawer-head">'
            + '<span class="wtc-title" data-comment="cart-drawer-title">Your cart</span>'
            + '<span class="wtc-count" data-comment="cart-drawer-count"></span>'
            + '<button type="button" class="wtc-close" data-comment="cart-drawer-close" aria-label="Close cart"><i class="ph ph-x" aria-hidden="true"></i></button>'
            + '</div>'
            + '<div class="wtc-progress" data-comment="cart-drawer-progress">'
            + '<div class="wtc-progress-label" data-comment="cart-drawer-progress-label"></div>'
            + '<div class="wtc-progress-track" data-comment="cart-drawer-progress-track"><div class="wtc-progress-fill" data-comment="cart-drawer-progress-fill"></div></div>'
            + '</div>'
            + '<div class="wtc-body" data-comment="cart-drawer-body"></div>'
            + '<div class="wtc-foot" data-comment="cart-drawer-foot"></div>';

        document.body.appendChild(scrim);
        document.body.appendChild(drawer);

        scrim.addEventListener('click', function () { close(); });
        drawer.querySelector('.wtc-close').addEventListener('click', function () { close(); });
        document.addEventListener('keydown', function (e) {
            if (!isOpen()) return;
            if (e.key === 'Escape') { close(true); return; }
            if (e.key !== 'Tab') return;
            /* keep focus inside the dialog */
            var f = Array.prototype.filter.call(
                drawer.querySelectorAll('button, a[href], input, [tabindex]:not([tabindex="-1"])'),
                function (el) { return el.offsetParent !== null; });
            if (!f.length) return;
            var first = f[0], last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        });

        /* event delegation for dynamic content */
        drawer.addEventListener('click', function (e) {
            var t = e.target.closest('[data-wtc-action]');
            if (!t) return;
            var action = t.getAttribute('data-wtc-action');
            var id = t.getAttribute('data-wtc-id');
            var items = loadItems();
            if (action === 'inc' || action === 'dec') {
                items.forEach(function (it) {
                    if (it.id !== id) return;
                    it.qty = Math.max(1, Math.min(99, it.qty + (action === 'inc' ? 1 : -1)));
                });
                saveItems(items); render();
            } else if (action === 'remove') {
                items = items.filter(function (it) { return it.id !== id; });
                saveItems(items); render();
            } else if (action === 'suggest-add') {
                var p = null;
                try { p = JSON.parse(t.getAttribute('data-wtc-product')); } catch (err) { }
                if (p) { saveItems(addItem(items, p)); render(); }
            } else if (action === 'continue') {
                close();
            }
        });
    }

    /* ── Render ────────────────────────────────────────────────────────── */
    function itemHTML(it, i) {
        var n = i + 1;
        var linkOpen = '<a class="wtc-item-name" data-comment="cart-drawer-item-' + n + '-name" href="product.html">' + esc(it.name) + '</a>';
        return '<div class="wtc-item" data-comment="cart-drawer-item-' + n + '">'
            + '<div class="wtc-item-img" data-comment="cart-drawer-item-' + n + '-img"' + (it.img ? ' style="background-image:url(\'' + esc(it.img) + '\')"' : '') + '></div>'
            + '<div class="wtc-item-main">'
            + linkOpen
            + '<div class="wtc-item-detail" data-comment="cart-drawer-item-' + n + '-detail">' + esc(detailFor(it)) + '</div>'
            + (it.price ? '<div class="wtc-item-unit" data-comment="cart-drawer-item-' + n + '-unit">' + fmt(it.price) + ' each</div>' : '')
            + '<span class="wtc-qty" data-comment="cart-drawer-item-' + n + '-qty">'
            + '<button type="button" data-wtc-action="dec" data-wtc-id="' + esc(it.id) + '" aria-label="Decrease quantity"><i class="ph ph-minus" aria-hidden="true"></i></button>'
            + '<span class="wtc-qty-num">' + it.qty + '</span>'
            + '<button type="button" data-wtc-action="inc" data-wtc-id="' + esc(it.id) + '" aria-label="Increase quantity"><i class="ph ph-plus" aria-hidden="true"></i></button>'
            + '</span>'
            + '</div>'
            + '<div class="wtc-item-side">'
            + '<span class="wtc-item-price" data-comment="cart-drawer-item-' + n + '-price">' + (it.price ? fmt(it.price * it.qty) : 'Call for price') + '</span>'
            + '<button type="button" class="wtc-item-remove" data-wtc-action="remove" data-wtc-id="' + esc(it.id) + '" aria-label="Remove ' + esc(it.name) + ' from cart"><i class="ph ph-trash" aria-hidden="true"></i></button>'
            + '</div>'
            + '</div>';
    }

    function pollinationHTML(items) {
        var res = pollinationCheck(items);
        if (!res) return '';
        if (!res.conflicts.length) {
            return '<div class="wtc-poll ok" data-comment="cart-drawer-pollination">'
                + '<div class="wtc-poll-head"><i class="ph ph-check-circle" aria-hidden="true"></i>Your order is pollination-ready</div>'
                + '<div class="wtc-poll-text">Every variety in your cart is self-fertile or has a compatible partner.</div>'
                + '</div>';
        }
        var html = '<div class="wtc-poll warn" data-comment="cart-drawer-pollination">'
            + '<div class="wtc-poll-head"><i class="ph ph-warning-circle" aria-hidden="true"></i>'
            + (res.conflicts.length === 1 ? '1 variety needs a pollinator' : res.conflicts.length + ' varieties need a pollinator')
            + '</div>'
            + '<div class="wtc-poll-text">'
            + esc(res.conflicts.map(function (it) { return it.name; }).join(', '))
            + (res.conflicts.length === 1 ? ' isn’t self-fertile — add a compatible partner nearby so it can set fruit.' : ' aren’t self-fertile — add compatible partners nearby so they can set fruit.')
            + '</div>';
        var seenCats = {};
        res.conflicts.forEach(function (it) {
            if (seenCats[it.category]) return;
            seenCats[it.category] = true;
            var s = suggestionFor(it, items);
            if (!s) return;
            html += '<div class="wtc-suggest" data-comment="cart-drawer-suggest-' + esc(it.category) + '">'
                + '<div class="wtc-suggest-img"' + (s.img ? ' style="background-image:url(\'' + esc(s.img) + '\')"' : '') + '></div>'
                + '<div class="wtc-suggest-main">'
                + '<div class="wtc-suggest-name">' + esc(s.name) + '</div>'
                + '<div class="wtc-suggest-meta">Compatible pollinator · ' + fmt(s.price) + '</div>'
                + '</div>'
                + '<button type="button" class="wtc-suggest-add" data-wtc-action="suggest-add" data-wtc-product="' + esc(JSON.stringify(s)) + '">Add</button>'
                + '</div>';
        });
        return html + '</div>';
    }

    function render() {
        if (!drawer) build();
        var items = loadItems();
        refreshBadge(items);
        var qty = totalQty(items);
        var sub = subtotal(items);
        var head = drawer.querySelector('.wtc-count');
        var progress = drawer.querySelector('.wtc-progress');
        var body = drawer.querySelector('.wtc-body');
        var foot = drawer.querySelector('.wtc-foot');

        head.textContent = qty ? (qty + (qty === 1 ? ' item' : ' items')) : '';

        if (!items.length) {
            progress.style.display = 'none';
            foot.style.display = 'none';
            body.classList.add('is-empty');
            body.innerHTML = '<div class="wtc-empty" data-comment="cart-drawer-empty">'
                + '<i class="ph-light ph-plant" aria-hidden="true"></i>'
                + '<div class="wtc-empty-title" data-comment="cart-drawer-empty-title">Your cart is empty</div>'
                + '<p class="wtc-empty-text" data-comment="cart-drawer-empty-text">Bare-root season goes quickly — browse the nursery and reserve your trees.</p>'
                + '<a class="wtc-empty-cta" data-comment="cart-drawer-empty-cta" href="shop.html">Browse the nursery</a>'
                + '</div>';
            return;
        }
        body.classList.remove('is-empty');

        /* discount progress */
        progress.style.display = '';
        var away = DISCOUNT_THRESHOLD - sub;
        var label = drawer.querySelector('.wtc-progress-label');
        var fill = drawer.querySelector('.wtc-progress-fill');
        if (away > 0) {
            progress.classList.remove('done');
            label.innerHTML = 'You’re <b>' + fmt(away) + '</b> away from a <b>10% discount</b> on your order.';
            fill.style.width = Math.min(100, (sub / DISCOUNT_THRESHOLD) * 100) + '%';
        } else {
            progress.classList.add('done');
            label.innerHTML = '<b>10% discount unlocked</b> — it’s applied to your order below.';
            fill.style.width = '100%';
        }

        /* items + pollination */
        body.innerHTML = items.map(itemHTML).join('') + pollinationHTML(items);

        /* summary + CTAs */
        var discount = sub >= DISCOUNT_THRESHOLD ? sub * DISCOUNT_RATE : 0;
        foot.style.display = '';
        foot.innerHTML =
            '<div class="wtc-row' + (discount ? '' : ' total') + '" data-comment="cart-drawer-subtotal"><span class="wtc-row-label">Subtotal</span><span class="wtc-row-value">' + fmt(sub) + ' CAD</span></div>'
            + (discount ? '<div class="wtc-row discount" data-comment="cart-drawer-discount"><span class="wtc-row-label">Volume discount (10%)</span><span class="wtc-row-value">−' + fmt(discount) + '</span></div>' : '')
            + (discount ? '<div class="wtc-row total" data-comment="cart-drawer-total"><span>Total</span><span class="wtc-row-value">' + fmt(sub - discount) + ' CAD</span></div>' : '')
            + '<div class="wtc-note" data-comment="cart-drawer-note">Shipping &amp; taxes calculated at checkout. Pickup at the farm is free.</div>'
            + '<a class="wtc-checkout" data-comment="cart-drawer-checkout" href="' + CHECKOUT_URL + '">Proceed to checkout</a>'
            + '<button type="button" class="wtc-continue" data-comment="cart-drawer-continue" data-wtc-action="continue">Continue shopping</button>';
    }

    /* ── Open / close ──────────────────────────────────────────────────── */
    function isOpen() { return drawer && drawer.classList.contains('open'); }
    function open() {
        build(); render();
        lastFocused = document.activeElement;
        scrim.classList.add('open');
        drawer.classList.add('open');
        document.body.style.overflow = 'hidden';
        var closeBtn = drawer.querySelector('.wtc-close');
        if (closeBtn) closeBtn.focus();
    }
    function close(restoreFocus) {
        if (!isOpen()) return;
        scrim.classList.remove('open');
        drawer.classList.remove('open');
        document.body.style.overflow = '';
        /* Restore focus only for keyboard closes (Esc) — after a tap/click a
           programmatic focus() would leave a stray :focus-visible ring on the
           header cart icon on touch devices. */
        if (restoreFocus && lastFocused && lastFocused.focus) lastFocused.focus();
        else if (document.activeElement && drawer.contains(document.activeElement)) document.activeElement.blur();
    }

    /* ── Wire up ───────────────────────────────────────────────────────── */
    function init() {
        /* wrap the existing badge/fly mock so every add also records an item */
        if (window.wtCart && window.wtCart.add) {
            var base = window.wtCart.add.bind(window.wtCart);
            window.wtCart.add = function (src, productOverride) {
                base(src); /* fly animation + badge pop (legacy count bump) */
                var p = productOverride || productFrom(src);
                if (p) {
                    saveItems(addItem(loadItems(), p));
                    if (isOpen()) render();
                }
            };
        }
        /* items are the source of truth — reconcile the legacy count/badge */
        saveItems(loadItems());

        var icon = document.querySelector('[data-comment="header-action-cart"]');
        if (icon) icon.addEventListener('click', function (e) { e.preventDefault(); open(); });

        window.wtCartDrawer = { open: open, close: close, items: loadItems };
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
