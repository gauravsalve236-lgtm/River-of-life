/* River of Life v63 — UI polish helper */
(function(){
  'use strict';

  function markMobileNavigation(){
    const items = Array.from(document.querySelectorAll('[data-tab]'));
    if (!items.length) return;

    const groups = new Map();
    for (const item of items){
      const parent = item.parentElement;
      if (!parent) continue;
      if (!groups.has(parent)) groups.set(parent, []);
      groups.get(parent).push(item);
    }

    let best = null;
    for (const [parent, children] of groups.entries()){
      const tabs = new Set(children.map(el => el.getAttribute('data-tab')));
      const required = ['home','reader','meetings','plans','prayers','you'];
      const score = required.filter(t => tabs.has(t)).length;
      if (score >= 5 && !parent.closest('.desktop-sidebar')){
        if (!best || score > best.score) best = { parent, score };
      }
    }

    if (best) best.parent.classList.add('rol-mobile-nav');
  }

  function enhanceMeetingSurface(){
    const grid = document.getElementById('river-video-grid');
    if (grid) grid.classList.add('rol-gallery-grid');

    const stage = document.getElementById('river-native-meeting-stage');
    if (stage) stage.classList.add('rol-meeting-stage');

    const modal = document.getElementById('modal-live-meeting');
    if (modal) modal.classList.add('rol-prayer-meeting');
  }

  function boot(){
    markMobileNavigation();
    enhanceMeetingSurface();

    const observer = new MutationObserver(() => {
      markMobileNavigation();
      enhanceMeetingSurface();
    });
    observer.observe(document.body, { childList:true, subtree:true });

    setTimeout(() => observer.disconnect(), 30000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once:true });
  } else {
    boot();
  }
})();
