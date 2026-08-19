(() => {
  const app = () => document.getElementById('app');
  const isHome = () => {
    const h = location.hash || '#/';
    return h === '#' || h === '#/' || h === '#/home' || h === '#/today' || h === '';
  };
  const getName = () => {
    const keys = ['user','currentUser','loggedInUser','riverUser','userProfile'];
    for (const k of keys) {
      try {
        const v = JSON.parse(localStorage.getItem(k));
        if (v && (v.name || v.fullName || v.displayName)) return v.name || v.fullName || v.displayName;
      } catch (_) {}
      const s = localStorage.getItem(k);
      if (s && s.length < 80 && !s.startsWith('{')) return s;
    }
    return 'Friend';
  };
  const go = path => { location.hash = path; };
  const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  async function verse() {
    try {
      const r = await fetch('data/daily_bible_verses.json', {cache:'no-store'});
      const d = await r.json();
      const day = Math.floor(Date.now()/86400000);
      return d.verses[day % d.verses.length];
    } catch (_) {
      return {reference:'Psalm 23:1', english:'The LORD is my shepherd; I shall not want.', marathi:'परमेश्वर माझा मेंढपाळ आहे; मला काही उणे पडणार नाही.'};
    }
  }

  function shareWhatsApp(v) {
    const text = `🙏 Daily Bible Verse\n\n“${v.english}”\n— ${v.reference}\n\nRiver of Life`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  }

  async function render() {
    if (!isHome()) return;
    const root = app(); if (!root) return;
    if (root.dataset.rolHome === '1') return;
    root.dataset.rolHome = '1';
    const v = await verse();
    if (!isHome()) { root.dataset.rolHome = '0'; return; }
    root.innerHTML = `
      <main class="rol-home" aria-label="River of Life Home">
        <header class="rol-topbar">
          <div class="rol-brand"><div class="rol-mark">✝</div><div><strong>River of Life</strong><span>Bible • Prayer • Community</span></div></div>
          <div class="rol-top-actions"><button aria-label="Notifications" title="Notifications">🔔</button><button aria-label="Profile" title="Profile" data-go="#/profile">👤</button></div>
        </header>
        <section class="rol-welcome"><div><p class="rol-eyebrow">WELCOME BACK</p><h1>Good morning, ${escapeHtml(getName())}</h1><p>Walk with God today.</p></div><div class="rol-cross-water">✝</div></section>
        <section class="rol-verse-card">
          <div class="rol-verse-label">✦ VERSE OF THE DAY</div>
          <blockquote>“${escapeHtml(v.english)}”</blockquote>
          <div class="rol-reference">— ${escapeHtml(v.reference)}</div>
          <div class="rol-verse-actions"><button class="rol-outline" data-save>♡ Save</button><button class="rol-gold" data-share>Share to WhatsApp</button></div>
        </section>
        <section><div class="rol-section-head"><h2>Quick Actions</h2><span>Start your journey</span></div>
          <div class="rol-actions-grid">
            <button data-go="#/bible"><span>📖</span><strong>Bible</strong><small>Read Scripture</small></button>
            <button data-go="#/prayer"><span>🙏</span><strong>Prayer</strong><small>Pray & request</small></button>
            <button data-go="#/quiz"><span>🧠</span><strong>Bible Quiz</strong><small>Test your knowledge</small></button>
            <button data-go="#/meetings"><span>🎥</span><strong>Meetings</strong><small>Join prayer meeting</small></button>
          </div>
        </section>
        <section class="rol-journey"><div class="rol-section-head"><h2>Continue Your Journey</h2><span>Keep growing</span></div>
          <div class="rol-journey-grid"><button data-go="#/bible"><span class="rol-journey-icon">📖</span><div><strong>Read the Bible</strong><small>Spend a few minutes with God's Word.</small></div><b>›</b></button><button data-go="#/quiz"><span class="rol-journey-icon">🧠</span><div><strong>Take a Bible Quiz</strong><small>Learn something new today.</small></div><b>›</b></button></div>
        </section>
        <footer class="rol-footer"><div class="rol-mark">✝</div><strong>River of Life</strong><p>Let His Word be a lamp to your path.</p></footer>
      </main>`;
    root.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
    root.querySelector('[data-share]')?.addEventListener('click', () => shareWhatsApp(v));
    root.querySelector('[data-save]')?.addEventListener('click', e => { localStorage.setItem(`rol-saved-verse-${v.reference}`, JSON.stringify(v)); e.currentTarget.textContent='♥ Saved'; });
  }
  function routeChanged(){ const root=app(); if(!root) return; if(!isHome()) root.dataset.rolHome='0'; render(); }
  window.addEventListener('hashchange', routeChanged);
  window.addEventListener('DOMContentLoaded', () => setTimeout(render, 150));
  setTimeout(render, 500);
})();
