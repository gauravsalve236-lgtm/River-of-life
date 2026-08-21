(() => {
  const app = () => document.getElementById('app');
  const isHome = () => { const h = location.hash || '#/'; return h === '#' || h === '#/' || h === '#/home' || h === '#/today' || h === ''; };
  const getName = () => { for (const k of ['user', 'currentUser', 'loggedInUser', 'riverUser', 'userProfile']) { try { const v = JSON.parse(localStorage.getItem(k)); if (v && (v.name || v.fullName || v.displayName)) return v.name || v.fullName || v.displayName; } catch (_) {} const s = localStorage.getItem(k); if (s && s.length < 80 && !s.startsWith('{')) return s; } return 'Friend'; };
  const go = p => location.hash = p;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  
  async function verse() {
    try {
      const r = await fetch('data/daily_bible_verses.json', { cache: 'no-store' });
      const d = await r.json();
      const day = Math.floor(Date.now() / 86400000);
      return d.verses[day % d.verses.length];
    } catch (_) {
      return { reference: 'Psalm 23:1', english: 'The LORD is my shepherd; I shall not want.' };
    }
  }

  async function render() {
    if (!isHome()) return;
    const root = app();
    if (!root || root.querySelector('.rol-home')) return;
    const v = await verse();
    if (!isHome()) return;

    root.innerHTML = `
      <main class="rol-home ios-theme-light" aria-label="River of Life Home">
        <header class="app-header">
          <div style="display:flex; align-items:center; gap:12px;">
            <img src="assets/icons/icon-192.png" alt="Logo" style="width:38px; height:38px; object-fit:contain; border-radius:8px;" onerror="this.src='assets/river-logo.png'">
            <div id="static-header-title" style="font-size: 1.1rem; font-weight: 700;">River of Life</div>
          </div>
          <div style="display:flex; gap:8px;">
            <button aria-label="Notifications" class="icon-btn">🔔</button>
            <button aria-label="Profile" data-go="#/profile" class="icon-btn">👤</button>
          </div>
        </header>

        <div class="view-scroll-content">
          <!-- Welcome Hero Card -->
          <section class="welcome-header-card">
            <p class="date-label">WELCOME BACK</p>
            <h1 class="greeting-text">Good morning, ${esc(getName())}</h1>
            <p style="margin:0; opacity:0.85;">Walk with God today.</p>
          </section>

          <!-- Verse of the Day Card -->
          <section class="vod-display-card">
            <div class="vod-text">“${esc(v.english)}”</div>
            <div class="vod-citation">— ${esc(v.reference)}</div>
            <div style="display:flex; gap:10px;">
              <button class="rol-outline-btn" data-save>♡ Save</button>
              <button class="rol-gold-btn" data-share>Share to WhatsApp</button>
            </div>
          </section>

          <!-- Quick Actions -->
          <section style="margin-top: 24px;">
            <div class="rol-section-head">
              <h2>Quick Access</h2>
              <span>Start your journey</span>
            </div>
            <div class="rol-actions-grid">
              <button data-go="#/bible" class="home-action-card">
                <span style="font-size: 22px;">📖</span>
                <strong style="margin-top:4px; color:var(--rol-navy);">Bible</strong>
                <small style="color:var(--text-muted);">Read Scripture</small>
              </button>
              <button data-go="#/meetings" class="home-action-card">
                <span style="font-size: 22px;">🎥</span>
                <strong style="margin-top:4px; color:var(--rol-navy);">Prayer Mtg</strong>
                <small style="color:var(--text-muted);">Join live meeting</small>
              </button>
              <button data-go="#/prayers" class="home-action-card">
                <span style="font-size: 22px;">🙏</span>
                <strong style="margin-top:4px; color:var(--rol-navy);">Requests</strong>
                <small style="color:var(--text-muted);">Share needs</small>
              </button>
              <button data-go="#/churches" class="home-action-card">
                <span style="font-size: 22px;">⛪</span>
                <strong style="margin-top:4px; color:var(--rol-navy);">Churches</strong>
                <small style="color:var(--text-muted);">Find fellowship</small>
              </button>
            </div>
          </section>
        </div>
      </main>
    `;

    root.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
    root.querySelector('[data-share]')?.addEventListener('click', () => {
      const t = `🙏 Daily Bible Verse\n\n“${v.english}”\n— ${v.reference}\n\nRiver of Life`;
      window.open(`https://wa.me/?text=${encodeURIComponent(t)}`, '_blank', 'noopener');
    });
    root.querySelector('[data-save]')?.addEventListener('click', e => {
      localStorage.setItem(`rol-saved-verse-${v.reference}`, JSON.stringify(v));
      e.currentTarget.textContent = '♥ Saved';
    });
  }

  function routeChanged() { setTimeout(render, 30); }
  window.addEventListener('hashchange', routeChanged);
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(render, 150);
    const root = app();
    if (root) {
      new MutationObserver(() => { if (isHome() && !root.querySelector('.rol-home')) render(); }).observe(root, { childList: true });
    }
  });
  setTimeout(render, 500);
})();
