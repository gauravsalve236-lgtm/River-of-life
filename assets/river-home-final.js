/* River of Life — authoritative Home renderer. Meeting code/routes are not modified. */
(function () {
  'use strict';

  const app = () => document.getElementById('app');
  const HOME_HASHES = new Set(['', '#', '#/', '#/home', '#/today', '#/dashboard']);
  const NON_HOME_PREFIXES = ['#/meetings', '#/meeting', '#/bible', '#/prayer', '#/quiz', '#/profile', '#/settings', '#/church', '#/events'];

  function isHome() {
    const hash = (location.hash || '').toLowerCase().trim();
    if (HOME_HASHES.has(hash)) return true;
    if (NON_HOME_PREFIXES.some(p => hash === p || hash.startsWith(p + '/'))) return false;
    return hash === '' || hash === '#' || hash === '#/' || hash === '#/home' || hash === '#/today' || hash === '#/dashboard';
  }

  function getUserName() {
    const candidates = ['riverUser', 'user', 'currentUser', 'loggedInUser'];
    for (const key of candidates) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const u = JSON.parse(raw);
        const name = u.fullName || u.name || u.displayName || u.firstName;
        if (name) return String(name).split(' ')[0];
      } catch (_) {}
    }
    return 'Friend';
  }

  const verses = [
    ['The LORD is my shepherd; I shall not want.', 'Psalm 23:1'],
    ['Trust in the LORD with all your heart, and do not lean on your own understanding.', 'Proverbs 3:5'],
    ['I can do all things through Christ who strengthens me.', 'Philippians 4:13'],
    ['Be strong and courageous. Do not be frightened, and do not be dismayed, for the LORD your God is with you wherever you go.', 'Joshua 1:9'],
    ['Your word is a lamp to my feet and a light to my path.', 'Psalm 119:105'],
    ['God is our refuge and strength, a very present help in trouble.', 'Psalm 46:1'],
    ['Come to me, all who labor and are heavy laden, and I will give you rest.', 'Matthew 11:28']
  ];

  function todayVerse() {
    const d = new Date();
    const day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
    return verses[Math.abs(day) % verses.length];
  }

  function go(hash) { location.hash = hash; }

  function renderHome() {
    if (!isHome()) return false;
    const root = app();
    if (!root) return false;

    const [verse, ref] = todayVerse();
    const name = getUserName();

    root.innerHTML = `
      <main class="rol-home-final" aria-label="River of Life Home">
        <header class="rol-home-header">
          <div class="rol-brand">
            <div class="rol-logo-mark" aria-hidden="true">✝</div>
            <div><strong>River of Life</strong><small>Bible • Prayer • Community</small></div>
          </div>
          <div class="rol-header-actions">
            <button type="button" aria-label="Notifications" onclick="window.dispatchEvent(new CustomEvent('openNotifications'))">🔔</button>
            <button type="button" aria-label="Profile" onclick="location.hash='#/profile'">👤</button>
          </div>
        </header>

        <section class="rol-welcome">
          <div><span>WELCOME BACK</span><h1>Good morning, ${name}</h1><p>Walk with God today.</p></div>
          <div class="rol-cross-water" aria-hidden="true">🌊</div>
        </section>

        <section class="rol-verse-card" aria-label="Verse of the Day">
          <div class="rol-eyebrow">✦ VERSE OF THE DAY</div>
          <blockquote>“${verse}”</blockquote>
          <div class="rol-reference">— ${ref}</div>
          <div class="rol-verse-actions">
            <button type="button" onclick="window.dispatchEvent(new CustomEvent('saveDailyVerse'))">♡ Save</button>
            <button type="button" onclick="window.rolShareVerse()">Share to WhatsApp</button>
          </div>
        </section>

        <section>
          <h2 class="rol-section-title">QUICK ACTIONS</h2>
          <div class="rol-actions-grid">
            <button type="button" onclick="location.hash='#/bible'"><span>📖</span><strong>Bible</strong><small>Read the Word</small></button>
            <button type="button" onclick="location.hash='#/prayer'"><span>🙏</span><strong>Prayer</strong><small>Pray & connect</small></button>
            <button type="button" onclick="location.hash='#/quiz'"><span>🧠</span><strong>Bible Quiz</strong><small>Test your knowledge</small></button>
            <button type="button" onclick="location.hash='#/meetings'"><span>🎥</span><strong>Meetings</strong><small>Join prayer meetings</small></button>
          </div>
        </section>

        <section>
          <div class="rol-section-heading"><h2 class="rol-section-title">CONTINUE YOUR JOURNEY</h2><span>Grow daily</span></div>
          <div class="rol-journey-grid">
            <button type="button" onclick="location.hash='#/bible'"><div>📖</div><p>Continue Reading</p><small>Spend time in God's Word</small><b>›</b></button>
            <button type="button" onclick="location.hash='#/quiz'"><div>🧠</div><p>Take a Bible Quiz</p><small>Learn something new today</small><b>›</b></button>
          </div>
        </section>

        <div class="rol-last-updated">River of Life • Updated just now</div>
      </main>`;

    root.dataset.rolAuthoritativeHome = '1';
    return true;
  }

  window.rolShareVerse = function () {
    const [v, r] = todayVerse();
    const text = `🙏 Daily Bible Verse\n\n“${v}”\n— ${r}\n\nRiver of Life`;
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
  };

  function boot() {
    if (!isHome()) return;
    const root = app();
    if (!root) return setTimeout(boot, 50);
    renderHome();
  }

  let lastHash = location.hash;
  window.addEventListener('hashchange', function () {
    const now = location.hash;
    if (now === lastHash) return;
    lastHash = now;
    if (isHome()) setTimeout(boot, 20);
  });

  function start() {
    boot();
    const root = app();
    if (root) {
      const observer = new MutationObserver(function () {
        if (isHome() && root.dataset.rolAuthoritativeHome !== '1') renderHome();
      });
      observer.observe(root, { childList: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
