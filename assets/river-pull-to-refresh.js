/* River of Life mobile pull-to-refresh. Never reloads the whole page. */
(function () {
  'use strict';
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (!isTouch) return;

  let startY = 0;
  let pulling = false;
  let refreshing = false;
  const threshold = 78;
  const indicator = document.createElement('div');
  indicator.className = 'rol-ptr';
  indicator.innerHTML = '<span class="rol-ptr-wave">🌊</span><span class="rol-ptr-text">Pull to refresh</span>';
  document.body.appendChild(indicator);

  function setState(state) {
    indicator.dataset.state = state;
    const text = indicator.querySelector('.rol-ptr-text');
    if (text) text.textContent = state === 'ready' ? 'Release to refresh' : state === 'refreshing' ? 'Refreshing…' : state === 'done' ? 'Updated just now' : 'Pull to refresh';
  }

  function atTop() {
    return (window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0) <= 1;
  }

  window.addEventListener('touchstart', e => {
    if (refreshing || !atTop() || e.touches.length !== 1) return;
    startY = e.touches[0].clientY;
    pulling = true;
    setState('idle');
  }, {passive:true});

  window.addEventListener('touchmove', e => {
    if (!pulling || refreshing) return;
    const distance = e.touches[0].clientY - startY;
    if (distance <= 0) return;
    const progress = Math.min(distance, threshold * 1.45);
    indicator.style.transform = `translateY(${Math.max(-100, progress - 64)}px)`;
    if (distance >= threshold) setState('ready'); else setState('idle');
  }, {passive:true});

  window.addEventListener('touchend', async e => {
    if (!pulling || refreshing) return;
    pulling = false;
    const endY = e.changedTouches[0]?.clientY ?? startY;
    const distance = endY - startY;
    if (distance < threshold) {
      indicator.style.transform = 'translateY(-100px)';
      return;
    }
    refreshing = true;
    setState('refreshing');
    indicator.style.transform = 'translateY(0)';
    try {
      if (typeof window.refreshAppData === 'function') {
        await window.refreshAppData();
      } else {
        window.dispatchEvent(new CustomEvent('riverOfLifeRefresh'));
        await new Promise(r => setTimeout(r, 700));
      }
      setState('done');
      window.dispatchEvent(new CustomEvent('riverOfLifeRefreshed'));
    } catch (err) {
      console.error('[River of Life] refresh failed', err);
      setState('done');
    } finally {
      setTimeout(() => {
        indicator.style.transform = 'translateY(-100px)';
        refreshing = false;
      }, 700);
    }
  }, {passive:true});
})();
