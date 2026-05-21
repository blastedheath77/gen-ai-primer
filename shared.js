'use strict';

(function () {
  var STORAGE_KEY = 'ct_present';

  var ENTER_ICON =
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" ' +
    'stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<polyline points="6,2 2,2 2,6"/><polyline points="10,2 14,2 14,6"/>' +
    '<polyline points="14,10 14,14 10,14"/><polyline points="2,10 2,14 6,14"/></svg>';

  var EXIT_ICON =
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" ' +
    'stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<polyline points="2,6 6,6 6,2"/><polyline points="14,6 10,6 10,2"/>' +
    '<polyline points="14,10 10,10 10,14"/><polyline points="2,10 6,10 6,14"/></svg>';

  // ── Module state ───────────────────────────────────────────
  var active = false;
  var navigating = false;
  var pageNav = { prev: null, next: null };

  // ── Public API (called by each page's inline script) ───────
  window.updateNav = function (prev, next) {
    pageNav.prev = prev || null;
    pageNav.next = next || null;
  };

  // navigateTo: fetch-swap when in presentation mode (preserves
  // fullscreen); plain href otherwise.
  window.navigateTo = function (url) {
    if (!url) return;
    if (active) {
      fetchSwap(url);
    } else {
      navigating = true;
      window.location.href = url;
    }
  };

  // ── Presentation-mode helpers ──────────────────────────────
  function getBtn () { return document.querySelector('.nav__present-btn'); }

  function setVisual (on) {
    active = on;
    document.body.classList.toggle('presentation-mode', on);
    var btn = getBtn();
    if (!btn) return;
    btn.innerHTML   = on ? EXIT_ICON  : ENTER_ICON;
    btn.title       = on ? 'Exit presentation mode (Esc or F)' : 'Presentation mode (F)';
    btn.setAttribute('aria-label', on ? 'Exit presentation mode' : 'Enter presentation mode');
  }

  function enter () {
    setVisual(true);
    sessionStorage.setItem(STORAGE_KEY, '1');
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(function () {});
    }
  }

  function exit () {
    setVisual(false);
    sessionStorage.removeItem(STORAGE_KEY);
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(function () {});
    }
  }

  function toggle () { if (active) { exit(); } else { enter(); } }

  function injectButton (nav) {
    var btn = document.createElement('button');
    btn.className = 'nav__present-btn';
    btn.innerHTML = active ? EXIT_ICON : ENTER_ICON;
    btn.title = active ? 'Exit presentation mode (Esc or F)' : 'Presentation mode (F)';
    btn.setAttribute('aria-label', active ? 'Exit presentation mode' : 'Enter presentation mode');
    btn.addEventListener('click', toggle);
    nav.appendChild(btn);
  }

  // ── Fetch-swap (keeps the document alive → fullscreen stays) ──
  function fetchSwap (url) {
    fetch(url)
      .then(function (r) { return r.text(); })
      .then(function (html) { doSwap(url, html); })
      .catch(function () { navigating = true; window.location.href = url; });
  }

  function doSwap (url, html) {
    var parser = new DOMParser();
    var newDoc  = parser.parseFromString(html, 'text/html');

    // Update document-level metadata
    document.title      = newDoc.title;
    document.body.className = newDoc.body.className;
    if (active) document.body.classList.add('presentation-mode');

    // Swap nav (dots, arrows), then re-inject our button
    var newNav = newDoc.querySelector('.nav');
    var oldNav = document.querySelector('.nav');
    if (newNav && oldNav) {
      oldNav.innerHTML = newNav.innerHTML;
      injectButton(oldNav);
    }

    // Swap page content
    var newWrapper = newDoc.querySelector('.page-wrapper');
    var oldWrapper = document.querySelector('.page-wrapper');
    if (newWrapper && oldWrapper) {
      oldWrapper.innerHTML = newWrapper.innerHTML;
    }

    // Execute the new page's inline scripts.
    // Wrap each in an IIFE so const/let declarations don't collide across swaps.
    newDoc.querySelectorAll('script:not([src])').forEach(function (s) {
      var el = document.createElement('script');
      el.textContent = '(function(){\n' + s.textContent + '\n})();';
      document.body.appendChild(el);
      document.body.removeChild(el); // inline scripts run synchronously; clean up after
    });

    history.pushState(null, newDoc.title, url);
  }

  // ── Centralised keyboard navigation ───────────────────────
  // Pages register their prev/next via updateNav(); this handler reads them.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' &&
        e.key !== 'PageDown'   && e.key !== 'PageUp') return;
    if (e.target.matches('input,textarea,select')) return;
    if (e.defaultPrevented) return;
    if ((e.key === 'ArrowRight' || e.key === 'PageDown') && pageNav.next) {
      window.navigateTo(pageNav.next);
    }
    if ((e.key === 'ArrowLeft' || e.key === 'PageUp') && pageNav.prev) {
      window.navigateTo(pageNav.prev);
    }
  });

  // F key toggles presentation mode
  document.addEventListener('keydown', function (e) {
    if (e.target.matches('input,textarea,select,button')) return;
    if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggle(); }
  });

  // Browser back/forward while in presentation mode
  window.addEventListener('popstate', function () {
    if (active) fetchSwap(location.href);
  });

  // Esc exits fullscreen — sync our state, but only when not navigating
  window.addEventListener('beforeunload', function () { navigating = true; });
  document.addEventListener('fullscreenchange', function () {
    if (!document.fullscreenElement && active && !navigating) exit();
  });

  // ── Init ──────────────────────────────────────────────────
  function init () {
    localStorage.removeItem(STORAGE_KEY); // remove any value left by older code version

    var nav = document.querySelector('.nav');
    if (!nav) return;

    injectButton(nav);

    if (sessionStorage.getItem(STORAGE_KEY)) {
      setVisual(true);
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(function () {});
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
