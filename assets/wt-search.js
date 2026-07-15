/* ============================================================================
   Whiffletree — shared header search wiring
   Desktop: the magnifier icon-button opens the dedicated results page.
   Mobile: type in the nav-overlay field and hit the search button → results.
   On search.html itself the desktop icon just focuses the on-page field.
   ========================================================================== */
(function () {
    'use strict';

    var SEARCH_URL = 'search.html';

    function go(q) {
        window.location.href = SEARCH_URL + (q ? '?q=' + encodeURIComponent(q) : '');
    }

    function init() {
        var onPageInput = document.querySelector('[data-comment="search-input"]');

        var deskBtn = document.querySelector('[data-comment="header-action-search"]');
        if (deskBtn) deskBtn.addEventListener('click', function () {
            if (onPageInput) { onPageInput.focus(); onPageInput.select(); }
            else go('');
        });

        var mInput = document.querySelector('[data-comment="header-search-m"] input');
        var mGo = document.querySelector('[data-comment="header-search-m-go"]');
        function submitMobile() { go(mInput ? mInput.value.trim() : ''); }
        if (mInput) mInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submitMobile(); } });
        if (mGo) mGo.addEventListener('click', submitMobile);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
