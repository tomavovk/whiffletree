/* ============================================================================
   Whiffletree — shared enhanced form fields (searchable select + intl phone).
   Self-contained; relies only on site :root tokens + wt-fields.css.
   Auto-inits on DOMContentLoaded:
     • <select data-wt-select>          → searchable custom dropdown
     • <div data-wt-phone data-country>  → flag + dial-code picker + number
   Address cascading (Country → Province/State → City) groups controls that
   share a data-wt-geo="<id>" value. Canada cascades to curated cities; other
   countries fall back to a free-typed city input (data-wt-city-text sibling).
   ========================================================================== */
(function () {
    'use strict';

    /* ---- Data ---- */
    var ADDRESS_COUNTRIES = ['Canada', 'United States'];
    var REGIONS = {
        'Canada': ['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'],
        'United States': ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming']
    };
    /* Curated cities for Canadian provinces (the nursery's shipping market). */
    var CITIES = {
        'Ontario': ['Barrie', 'Bracebridge', 'Brampton', 'Elmvale', 'Guelph', 'Hamilton', 'Kingston', 'Kitchener', 'London', 'Mississauga', 'Orillia', 'Ottawa', 'Peterborough', 'St. Catharines', 'Sudbury', 'Thunder Bay', 'Toronto', 'Windsor'],
        'Quebec': ['Gatineau', 'Laval', 'Longueuil', 'Montreal', 'Quebec City', 'Saguenay', 'Sherbrooke', 'Trois-Rivières'],
        'British Columbia': ['Abbotsford', 'Kamloops', 'Kelowna', 'Nanaimo', 'Prince George', 'Surrey', 'Vancouver', 'Victoria'],
        'Alberta': ['Airdrie', 'Calgary', 'Edmonton', 'Grande Prairie', 'Lethbridge', 'Medicine Hat', 'Red Deer'],
        'Manitoba': ['Brandon', 'Portage la Prairie', 'Steinbach', 'Thompson', 'Winnipeg'],
        'Saskatchewan': ['Moose Jaw', 'Prince Albert', 'Regina', 'Saskatoon', 'Swift Current'],
        'Nova Scotia': ['Dartmouth', 'Halifax', 'Sydney', 'Truro'],
        'New Brunswick': ['Bathurst', 'Fredericton', 'Moncton', 'Saint John'],
        'Newfoundland and Labrador': ['Corner Brook', 'Gander', 'Mount Pearl', "St. John's"],
        'Prince Edward Island': ['Charlottetown', 'Stratford', 'Summerside'],
        'Northwest Territories': ['Hay River', 'Inuvik', 'Yellowknife'],
        'Nunavut': ['Iqaluit', 'Rankin Inlet'],
        'Yukon': ['Dawson City', 'Whitehorse']
    };

    /* Country dial codes for the phone picker (iso2, name, dial). */
    var COUNTRIES = [
        ['ca', 'Canada', '1'], ['us', 'United States', '1'], ['gb', 'United Kingdom', '44'], ['au', 'Australia', '61'], ['ie', 'Ireland', '353'], ['nz', 'New Zealand', '64'],
        ['af', 'Afghanistan', '93'], ['al', 'Albania', '355'], ['dz', 'Algeria', '213'], ['ar', 'Argentina', '54'], ['am', 'Armenia', '374'], ['at', 'Austria', '43'], ['az', 'Azerbaijan', '994'],
        ['bh', 'Bahrain', '973'], ['bd', 'Bangladesh', '880'], ['by', 'Belarus', '375'], ['be', 'Belgium', '32'], ['bo', 'Bolivia', '591'], ['ba', 'Bosnia and Herzegovina', '387'], ['br', 'Brazil', '55'], ['bg', 'Bulgaria', '359'],
        ['kh', 'Cambodia', '855'], ['cm', 'Cameroon', '237'], ['cl', 'Chile', '56'], ['cn', 'China', '86'], ['co', 'Colombia', '57'], ['cr', 'Costa Rica', '506'], ['hr', 'Croatia', '385'], ['cu', 'Cuba', '53'], ['cy', 'Cyprus', '357'], ['cz', 'Czechia', '420'],
        ['dk', 'Denmark', '45'], ['do', 'Dominican Republic', '1'], ['ec', 'Ecuador', '593'], ['eg', 'Egypt', '20'], ['sv', 'El Salvador', '503'], ['ee', 'Estonia', '372'], ['et', 'Ethiopia', '251'],
        ['fi', 'Finland', '358'], ['fr', 'France', '33'], ['ge', 'Georgia', '995'], ['de', 'Germany', '49'], ['gh', 'Ghana', '233'], ['gr', 'Greece', '30'], ['gt', 'Guatemala', '502'],
        ['hn', 'Honduras', '504'], ['hk', 'Hong Kong', '852'], ['hu', 'Hungary', '36'], ['is', 'Iceland', '354'], ['in', 'India', '91'], ['id', 'Indonesia', '62'], ['ir', 'Iran', '98'], ['iq', 'Iraq', '964'], ['il', 'Israel', '972'], ['it', 'Italy', '39'],
        ['jm', 'Jamaica', '1'], ['jp', 'Japan', '81'], ['jo', 'Jordan', '962'], ['kz', 'Kazakhstan', '7'], ['ke', 'Kenya', '254'], ['kw', 'Kuwait', '965'], ['lv', 'Latvia', '371'], ['lb', 'Lebanon', '961'], ['ly', 'Libya', '218'], ['lt', 'Lithuania', '370'], ['lu', 'Luxembourg', '352'],
        ['mo', 'Macau', '853'], ['my', 'Malaysia', '60'], ['mt', 'Malta', '356'], ['mx', 'Mexico', '52'], ['md', 'Moldova', '373'], ['mc', 'Monaco', '377'], ['ma', 'Morocco', '212'], ['np', 'Nepal', '977'], ['nl', 'Netherlands', '31'], ['ng', 'Nigeria', '234'], ['no', 'Norway', '47'],
        ['om', 'Oman', '968'], ['pk', 'Pakistan', '92'], ['pa', 'Panama', '507'], ['py', 'Paraguay', '595'], ['pe', 'Peru', '51'], ['ph', 'Philippines', '63'], ['pl', 'Poland', '48'], ['pt', 'Portugal', '351'], ['qa', 'Qatar', '974'], ['ro', 'Romania', '40'], ['ru', 'Russia', '7'],
        ['sa', 'Saudi Arabia', '966'], ['rs', 'Serbia', '381'], ['sg', 'Singapore', '65'], ['sk', 'Slovakia', '421'], ['si', 'Slovenia', '386'], ['za', 'South Africa', '27'], ['kr', 'South Korea', '82'], ['es', 'Spain', '34'], ['lk', 'Sri Lanka', '94'], ['se', 'Sweden', '46'], ['ch', 'Switzerland', '41'], ['sy', 'Syria', '963'],
        ['tw', 'Taiwan', '886'], ['th', 'Thailand', '66'], ['tn', 'Tunisia', '216'], ['tr', 'Türkiye', '90'], ['ua', 'Ukraine', '380'], ['ae', 'United Arab Emirates', '971'], ['uy', 'Uruguay', '598'], ['uz', 'Uzbekistan', '998'], ['ve', 'Venezuela', '58'], ['vn', 'Vietnam', '84'], ['ye', 'Yemen', '967'], ['zm', 'Zambia', '260'], ['zw', 'Zimbabwe', '263']
    ];
    var BY_ISO = {};
    COUNTRIES.forEach(function (c) { if (!BY_ISO[c[0]]) BY_ISO[c[0]] = c; });

    /* ---- Helpers ---- */
    function h(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }
    function flagEmoji(iso) {
        iso = (iso || '').toUpperCase();
        if (iso.length !== 2 || /[^A-Z]/.test(iso)) return '🏳️';
        return String.fromCodePoint(0x1F1E6 + iso.charCodeAt(0) - 65) + String.fromCodePoint(0x1F1E6 + iso.charCodeAt(1) - 65);
    }
    function digits(s) { return (s || '').replace(/\D/g, ''); }

    var registry = [];
    function closeAll(except) { registry.forEach(function (d) { if (d.el !== except) d.close(); }); }
    document.addEventListener('click', function (e) { registry.forEach(function (d) { if (!d.el.contains(e.target)) d.close(); }); });

    /* ============================ Searchable select ============================ */
    function enhanceSelect(sel) {
        if (sel.dataset.wtfInit) return; sel.dataset.wtfInit = '1';
        var forceSearch = sel.hasAttribute('data-wt-search');

        var wrap = h('div', 'wtf-dd');
        var trigger = h('button', 'wtf-trigger'); trigger.type = 'button';
        trigger.setAttribute('aria-haspopup', 'listbox'); trigger.setAttribute('aria-expanded', 'false');
        if (sel.getAttribute('aria-label')) trigger.setAttribute('aria-label', sel.getAttribute('aria-label'));
        var label = h('span', 'wtf-label');
        var caret = h('i', 'ph ph-caret-down wtf-caret'); caret.setAttribute('aria-hidden', 'true');
        trigger.appendChild(label); trigger.appendChild(caret);
        var menu = h('div', 'wtf-menu'); menu.setAttribute('role', 'listbox');

        sel.parentNode.insertBefore(wrap, sel);
        wrap.appendChild(sel); wrap.appendChild(trigger); wrap.appendChild(menu);
        sel.classList.add('wtf-native'); sel.tabIndex = -1;

        var list, search;
        function optionEls() { return list ? list.querySelectorAll('.wtf-opt') : []; }
        function render() {
            menu.innerHTML = '';
            var opts = Array.prototype.slice.call(sel.options);
            var useSearch = forceSearch || opts.length > 8;
            search = null;
            if (useSearch) {
                var sw = h('div', 'wtf-search-wrap');
                var ic = h('i', 'ph ph-magnifying-glass wtf-search-ic'); ic.setAttribute('aria-hidden', 'true');
                search = h('input', 'wtf-search'); search.type = 'text'; search.placeholder = 'Search…';
                sw.appendChild(ic); sw.appendChild(search); menu.appendChild(sw);
                search.addEventListener('input', function () { filter(search.value); });
                search.addEventListener('keydown', navKey);
            }
            list = h('div', 'wtf-list'); menu.appendChild(list);
            opts.forEach(function (o, i) {
                var it = h('div', 'wtf-opt'); it.setAttribute('role', 'option'); it.dataset.index = i;
                var lab = h('span', 'wtf-opt-label'); lab.textContent = o.textContent;
                var ck = h('i', 'ph ph-check wtf-opt-check'); ck.setAttribute('aria-hidden', 'true');
                it.appendChild(lab); it.appendChild(ck);
                it.addEventListener('click', function () { choose(i); close(); trigger.focus(); });
                it.addEventListener('mousemove', function () { setActive(it); });
                list.appendChild(it);
            });
            syncLabel();
        }
        function syncLabel() {
            var o = sel.options[sel.selectedIndex];
            if (o && o.value !== '') { label.textContent = o.textContent; label.classList.remove('is-placeholder'); }
            else { label.textContent = sel.dataset.wtPlaceholder || (o ? o.textContent : 'Select…'); label.classList.toggle('is-placeholder', !o || o.value === ''); }
            optionEls().forEach(function (el) {
                var on = (+el.dataset.index === sel.selectedIndex);
                el.classList.toggle('is-selected', on);
                el.setAttribute('aria-selected', on ? 'true' : 'false');
            });
        }
        function choose(i) {
            if (sel.selectedIndex !== i) { sel.selectedIndex = i; sel.dispatchEvent(new Event('change', { bubbles: true })); }
            syncLabel();
        }
        function filter(q) {
            q = (q || '').trim().toLowerCase();
            var any = false;
            optionEls().forEach(function (el) {
                var show = !q || el.textContent.toLowerCase().indexOf(q) >= 0;
                el.style.display = show ? '' : 'none'; if (show) any = true;
            });
            var empty = list.querySelector('.wtf-empty');
            if (!any && !empty) { empty = h('div', 'wtf-empty'); empty.textContent = 'No matches'; list.appendChild(empty); }
            else if (any && empty) { empty.remove(); }
            clearActive();
        }
        function visible() { return Array.prototype.filter.call(optionEls(), function (el) { return el.style.display !== 'none'; }); }
        function clearActive() { optionEls().forEach(function (el) { el.classList.remove('is-active'); }); }
        function setActive(el) { optionEls().forEach(function (e) { e.classList.toggle('is-active', e === el); }); }
        function move(dir) {
            var vis = visible(); if (!vis.length) return;
            var idx = -1; for (var k = 0; k < vis.length; k++) { if (vis[k].classList.contains('is-active')) { idx = k; break; } }
            idx += dir; if (idx < 0) idx = 0; if (idx > vis.length - 1) idx = vis.length - 1;
            vis.forEach(function (e) { e.classList.remove('is-active'); });
            vis[idx].classList.add('is-active'); vis[idx].scrollIntoView({ block: 'nearest' });
        }
        function navKey(e) {
            if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
            else if (e.key === 'Enter') { e.preventDefault(); var a = list.querySelector('.wtf-opt.is-active'); if (a) { choose(+a.dataset.index); close(); trigger.focus(); } }
            else if (e.key === 'Escape') { e.preventDefault(); close(); trigger.focus(); }
        }
        function open() {
            closeAll(wrap); render();
            wrap.classList.add('is-open'); trigger.setAttribute('aria-expanded', 'true');
            if (search) setTimeout(function () { search.focus(); }, 20);
        }
        function close() { wrap.classList.remove('is-open'); trigger.setAttribute('aria-expanded', 'false'); clearActive(); }
        function isOpen() { return wrap.classList.contains('is-open'); }

        trigger.addEventListener('click', function (e) { e.stopPropagation(); if (isOpen()) close(); else open(); });
        trigger.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!isOpen()) open(); else move(1); }
            else if (e.key === 'Escape') { if (isOpen()) { e.preventDefault(); close(); } }
        });

        render();
        if (sel.dataset.wtValue) selectByText(sel, sel.dataset.wtValue);
        sel._wtf = { render: render, wrap: wrap, close: close, syncLabel: syncLabel };
        registry.push({ el: wrap, close: close });
    }

    function selectByText(sel, text) {
        for (var i = 0; i < sel.options.length; i++) {
            if (sel.options[i].textContent === text || sel.options[i].value === text) { sel.selectedIndex = i; break; }
        }
        if (sel._wtf) sel._wtf.syncLabel();
    }
    function setOptions(sel, items, preferred) {
        sel.innerHTML = '';
        items.forEach(function (v) { var o = document.createElement('option'); o.value = v; o.textContent = v; sel.appendChild(o); });
        var idx = 0;
        if (preferred) { for (var i = 0; i < items.length; i++) { if (items[i] === preferred) { idx = i; break; } } }
        sel.selectedIndex = items.length ? idx : -1;
        if (sel._wtf) sel._wtf.render();
    }

    /* ============================ Address cascading ============================ */
    function wireGeo() {
        var groups = {};
        document.querySelectorAll('[data-wt-geo]').forEach(function (el) {
            var g = el.getAttribute('data-wt-geo'); (groups[g] = groups[g] || []).push(el);
        });
        Object.keys(groups).forEach(function (g) {
            var els = groups[g];
            function role(r) { return els.filter(function (e) { return e.getAttribute('data-wt-select') === r; })[0]; }
            var country = role('country'), region = role('region'), city = role('city');
            if (!country || !region) return;
            /* City has a free-text fallback (used for regions without curated cities).
               After enhancement the <select> lives inside a .wtf-dd wrap, so the
               fallback input is a sibling of that wrap within the field. */
            var cityField = city ? ((city._wtf && city._wtf.wrap.parentNode) || city.parentNode) : null;
            var cityText = cityField ? cityField.querySelector('[data-wt-city-text]') : null;

            function buildCities(pref) {
                if (!city) return;
                var list = CITIES[region.value];
                if (list && list.length) {
                    if (city._wtf) city._wtf.wrap.style.display = '';
                    if (cityText) cityText.style.display = 'none';
                    setOptions(city, list, pref || city.dataset.wtValue || '');
                } else {
                    if (city._wtf) city._wtf.wrap.style.display = 'none';
                    if (cityText) { cityText.style.display = ''; if (pref || city.dataset.wtValue) cityText.value = pref || city.dataset.wtValue; }
                }
            }
            function buildRegions(prefRegion, prefCity) {
                var list = REGIONS[country.value] || [];
                setOptions(region, list, prefRegion || region.dataset.wtValue || '');
                buildCities(prefCity);
            }
            country.addEventListener('change', function () { buildRegions(); });
            region.addEventListener('change', function () { buildCities(); });
            buildRegions(region.dataset.wtValue, city ? city.dataset.wtValue : '');
        });
    }

    /* ============================ Intl phone ============================ */
    function enhancePhone(root) {
        if (root.dataset.wtfInit) return; root.dataset.wtfInit = '1';
        root.classList.add('wtf-phone');
        var num = root.querySelector('input[type="tel"], input:not([type="hidden"])');
        if (!num) { num = h('input'); num.type = 'tel'; root.appendChild(num); }
        num.classList.add('wtf-num');
        if (!num.getAttribute('placeholder')) num.setAttribute('placeholder', '(705) 645-4444');

        var iso = (root.getAttribute('data-country') || 'ca').toLowerCase();
        var current = BY_ISO[iso] || COUNTRIES[0];

        var codeBtn = h('button', 'wtf-code'); codeBtn.type = 'button';
        codeBtn.setAttribute('aria-haspopup', 'listbox'); codeBtn.setAttribute('aria-expanded', 'false'); codeBtn.setAttribute('aria-label', 'Country calling code');
        var flag = h('span', 'wtf-flag');
        var dial = h('span', 'wtf-dial');
        var caret = h('i', 'ph ph-caret-down wtf-caret'); caret.setAttribute('aria-hidden', 'true');
        codeBtn.appendChild(flag); codeBtn.appendChild(dial); codeBtn.appendChild(caret);
        root.insertBefore(codeBtn, num);

        var hidden = h('input'); hidden.type = 'hidden'; if (root.getAttribute('data-name')) hidden.name = root.getAttribute('data-name'); root.appendChild(hidden);

        var menu = h('div', 'wtf-menu'); menu.setAttribute('role', 'listbox'); root.appendChild(menu);
        var list, search;

        function setCountry(c) {
            current = c; flag.textContent = flagEmoji(c[0]); dial.textContent = '+' + c[2];
            hidden.value = '+' + c[2] + ' ' + num.value;
        }
        function render() {
            menu.innerHTML = '';
            var sw = h('div', 'wtf-search-wrap');
            var ic = h('i', 'ph ph-magnifying-glass wtf-search-ic'); ic.setAttribute('aria-hidden', 'true');
            search = h('input', 'wtf-search'); search.type = 'text'; search.placeholder = 'Search country or code…';
            sw.appendChild(ic); sw.appendChild(search); menu.appendChild(sw);
            list = h('div', 'wtf-list'); menu.appendChild(list);
            COUNTRIES.forEach(function (c) {
                var it = h('div', 'wtf-opt'); it.setAttribute('role', 'option'); it.dataset.iso = c[0];
                var fl = h('span', 'wtf-flag'); fl.textContent = flagEmoji(c[0]);
                var lab = h('span', 'wtf-opt-label'); lab.textContent = c[1];
                var dl = h('span', 'wtf-opt-dial'); dl.textContent = '+' + c[2];
                var ck = h('i', 'ph ph-check wtf-opt-check'); ck.setAttribute('aria-hidden', 'true');
                it.appendChild(fl); it.appendChild(lab); it.appendChild(dl); it.appendChild(ck);
                if (c[0] === current[0]) it.classList.add('is-selected');
                it.addEventListener('click', function () { setCountry(c); close(); num.focus(); });
                it.addEventListener('mousemove', function () { setActive(it); });
                list.appendChild(it);
            });
            search.addEventListener('input', function () { filter(search.value); });
            search.addEventListener('keydown', navKey);
        }
        function optionEls() { return list ? list.querySelectorAll('.wtf-opt') : []; }
        function filter(q) {
            var raw = (q || '').trim().toLowerCase(); var d = digits(q); var any = false;
            optionEls().forEach(function (el) {
                var name = el.querySelector('.wtf-opt-label').textContent.toLowerCase();
                var code = digits(el.querySelector('.wtf-opt-dial').textContent);
                var show = (!raw && !d) || name.indexOf(raw) >= 0 || (d && code.indexOf(d) >= 0);
                el.style.display = show ? '' : 'none'; if (show) any = true;
            });
            var empty = list.querySelector('.wtf-empty');
            if (!any && !empty) { empty = h('div', 'wtf-empty'); empty.textContent = 'No matches'; list.appendChild(empty); }
            else if (any && empty) { empty.remove(); }
            clearActive();
        }
        function visible() { return Array.prototype.filter.call(optionEls(), function (el) { return el.style.display !== 'none'; }); }
        function clearActive() { optionEls().forEach(function (el) { el.classList.remove('is-active'); }); }
        function setActive(el) { optionEls().forEach(function (e) { e.classList.toggle('is-active', e === el); }); }
        function move(dir) {
            var vis = visible(); if (!vis.length) return;
            var idx = -1; for (var k = 0; k < vis.length; k++) { if (vis[k].classList.contains('is-active')) { idx = k; break; } }
            idx += dir; if (idx < 0) idx = 0; if (idx > vis.length - 1) idx = vis.length - 1;
            vis.forEach(function (e) { e.classList.remove('is-active'); });
            vis[idx].classList.add('is-active'); vis[idx].scrollIntoView({ block: 'nearest' });
        }
        function navKey(e) {
            if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
            else if (e.key === 'Enter') { e.preventDefault(); var a = list.querySelector('.wtf-opt.is-active'); if (a) { setCountry(BY_ISO[a.dataset.iso]); close(); num.focus(); } }
            else if (e.key === 'Escape') { e.preventDefault(); close(); codeBtn.focus(); }
        }
        function open() { closeAll(root); render(); root.classList.add('is-open'); codeBtn.setAttribute('aria-expanded', 'true'); setTimeout(function () { search.focus(); }, 20); }
        function close() { root.classList.remove('is-open'); codeBtn.setAttribute('aria-expanded', 'false'); clearActive(); }
        function isOpen() { return root.classList.contains('is-open'); }

        codeBtn.addEventListener('click', function (e) { e.stopPropagation(); if (isOpen()) close(); else open(); });
        codeBtn.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!isOpen()) open(); }
            else if (e.key === 'Escape') { if (isOpen()) { e.preventDefault(); close(); } }
        });
        num.addEventListener('focus', function () { root.classList.add('is-focus'); });
        num.addEventListener('blur', function () { root.classList.remove('is-focus'); });
        num.addEventListener('input', function () { hidden.value = '+' + current[2] + ' ' + num.value; });

        setCountry(current);
        registry.push({ el: root, close: close });
    }

    /* ---- Init ---- */
    function init() {
        document.querySelectorAll('select[data-wt-select]').forEach(enhanceSelect);
        wireGeo();
        document.querySelectorAll('[data-wt-phone]').forEach(enhancePhone);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    window.WTFields = { enhanceSelect: enhanceSelect, enhancePhone: enhancePhone };
})();
