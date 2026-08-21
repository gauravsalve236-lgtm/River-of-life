/* River of Life Home stability layer.
   Keeps the existing Bible/Prayer/Meeting logic intact.
   Prevents the legacy Home/splash from flashing before the final Home renderer. */
(function () {
  'use strict';

  const PRELOAD_STYLE_ID = 'rol-home-stability-preload';

  function isHomeRoute() {
    const hash = (window.location.hash || '').toLowerCase().trim();
    return hash === '' || hash === '#' || hash === '#/' || hash === '#/home' || hash === '#/today' || hash === '#/dashboard';
  }

  function revealApp() {
    const app = document.getElementById('app');
    if (app) {
      app.style.removeProperty('visibility');
      app.style.removeProperty('opacity');
      app.classList.add('rol-home-stable');
    }
  }

  function hideSplash() {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.style.setProperty('display', 'none', 'important');
      splash.classList.remove('fade-out');
    }
  }

  function removePreloadStyle() {
    const style = document.getElementById(PRELOAD_STYLE_ID);
    if (style) style.remove();
  }

  function stabilizeHome() {
    hideSplash();

    const app = document.getElementById('app');
    if (!app) return;

    if (isHomeRoute() && typeof window.renderRiverHomeFinal === 'function') {
      const currentHome = app.querySelector('.rol-home-final');
      if (!currentHome) {
        window.renderRiverHomeFinal();
      }
    }

    revealApp();
    removePreloadStyle();
  }

  function installIdempotentRenderer() {
    if (typeof window.renderRiverHomeFinal !== 'function' || window.__rolStableRendererInstalled) return;

    const original = window.renderRiverHomeFinal;
    window.renderRiverHomeFinal = function () {
      const app = document.getElementById('app');
      if (app && app.querySelector('.rol-home-final') && isHomeRoute()) {
        revealApp();
        return true;
      }

      const result = original.apply(this, arguments);
      if (result !== false) revealApp();
      return result;
    };

    window.__rolStableRendererInstalled = true;
  }

  function boot() {
    hideSplash();
    installIdempotentRenderer();

    const app = document.getElementById('app');
    if (!app) return;

    if (isHomeRoute() && typeof window.renderRiverHomeFinal === 'function') {
      const currentHome = app.querySelector('.rol-home-final');
      if (!currentHome) window.renderRiverHomeFinal();
    }

    revealApp();
    removePreloadStyle();
  }

  document.addEventListener('DOMContentLoaded', boot, { once: true });
  window.addEventListener('load', boot, { once: true });
  window.addEventListener('hashchange', function () {
    if (isHomeRoute()) {
      hideSplash();
      setTimeout(boot, 0);
    } else {
      revealApp();
    }
  });

  // If the final renderer is loaded after this file, observe until it exists.
  const timer = window.setInterval(function () {
    if (typeof window.renderRiverHomeFinal === 'function') {
      installIdempotentRenderer();
      boot();
      window.clearInterval(timer);
    }
  }, 25);

  window.setTimeout(function () {
    window.clearInterval(timer);
    revealApp();
    removePreloadStyle();
  }, 5000);
})();
