/* ============================================================
   RIVER OF LIFE — FINAL HOME RENDERER
   ============================================================
   IMPORTANT:
   - Home page only
   - Does NOT modify Meetings / WebRTC / Prayer Meeting logic
   - Works with GitHub Pages /docs deployment
   ============================================================ */

(function () {
  'use strict';

  /* ------------------------------------------------------------
     HOME CSS LOADER
     ------------------------------------------------------------
     index.html does not need to be edited. This renderer loads
     its own stylesheet so the Home cannot appear as unstyled HTML.
     ------------------------------------------------------------ */

  function ensureHomeStyles() {
    var id = 'river-home-final-css';
    var existing = document.getElementById(id);

    if (existing) return;

    var link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = './assets/river-home-final.css?v=20260820-2';
    document.head.appendChild(link);
  }

  ensureHomeStyles();

  /* ------------------------------------------------------------
     APP ROOT
     ------------------------------------------------------------ */

  function getApp() {
    return document.getElementById('app');
  }

  /* ------------------------------------------------------------
     HOME ROUTES
     ------------------------------------------------------------ */

  var HOME_HASHES = new Set(['', '#', '#/', '#/home', '#/today', '#/dashboard']);

  var NON_HOME_PREFIXES = [
    '#/meetings', '#/meeting', '#/bible', '#/reader', '#/prayer',
    '#/prayers', '#/quiz', '#/profile', '#/settings', '#/church',
    '#/events', '#/plans', '#/discover', '#/you'
  ];

  function isHome() {
    var hash = (window.location.hash || '').toLowerCase().trim();
    if (HOME_HASHES.has(hash)) return true;

    if (NON_HOME_PREFIXES.some(function (prefix) {
      return hash === prefix || hash.indexOf(prefix + '/') === 0;
    })) return false;

    return HOME_HASHES.has(hash);
  }

  /* ------------------------------------------------------------
     USER / GREETING / DATE
     ------------------------------------------------------------ */

  function getUserName() {
    var candidates = ['riverUser', 'currentUser', 'loggedInUser', 'user'];

    for (var i = 0; i < candidates.length; i++) {
      try {
        var raw = localStorage.getItem(candidates[i]);
        if (!raw) continue;

        var parsed = JSON.parse(raw);
        var name = parsed.fullName || parsed.name || parsed.displayName || parsed.firstName;

        if (name) return String(name).trim().split(/\s+/)[0];
      } catch (_) {}
    }

    return 'Friend';
  }

  function getGreeting() {
    var hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  function getTodayDate() {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  }

  /* ------------------------------------------------------------
     DAILY VERSES
     ------------------------------------------------------------ */

  var verses = [
    ['The LORD is my shepherd; I shall not want.', 'Psalm 23:1'],
    ['Trust in the LORD with all your heart, and do not lean on your own understanding.', 'Proverbs 3:5'],
    ['I can do all things through Christ who strengthens me.', 'Philippians 4:13'],
    ['Be strong and courageous. Do not be frightened, and do not be dismayed, for the LORD your God is with you wherever you go.', 'Joshua 1:9'],
    ['Your word is a lamp to my feet and a light to my path.', 'Psalm 119:105'],
    ['God is our refuge and strength, a very present help in trouble.', 'Psalm 46:1'],
    ['Come to me, all who labor and are heavy laden, and I will give you rest.', 'Matthew 11:28'],
    ['The Lord is near to the brokenhearted and saves the crushed in spirit.', 'Psalm 34:18'],
    ['Commit your work to the LORD, and your plans will be established.', 'Proverbs 16:3'],
    ['The LORD is my strength and my shield; in him my heart trusts.', 'Psalm 28:7'],
    ['Cast all your anxiety on him because he cares for you.', '1 Peter 5:7'],
    ['Rejoice in hope, be patient in tribulation, be constant in prayer.', 'Romans 12:12'],
    ['The steadfast love of the LORD never ceases; his mercies never come to an end.', 'Lamentations 3:22'],
    ['For nothing will be impossible with God.', 'Luke 1:37']
  ];

  function todayVerse() {
    var date = new Date();
    var dayNumber = Math.floor(Date.UTC(
      date.getFullYear(), date.getMonth(), date.getDate()
    ) / 86400000);
    return verses[Math.abs(dayNumber) % verses.length];
  }

  function escapeHTML(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* ------------------------------------------------------------
     SAVE / SHARE / NAVIGATION
     ------------------------------------------------------------ */

  window.rolSaveDailyVerse = function () {
    var data = todayVerse();
    try {
      localStorage.setItem('riverSavedDailyVerse', JSON.stringify({
        verse: data[0],
        reference: data[1],
        savedAt: new Date().toISOString()
      }));
      if (typeof window.showToast === 'function') window.showToast('Verse saved');
      else alert('Verse saved');
    } catch (error) {
      console.error('River Home: unable to save verse', error);
    }
  };

  window.rolShareVerse = function () {
    var data = todayVerse();
    var text = '🙏 Daily Bible Verse\n\n“' + data[0] + '”\n— ' + data[1] + '\n\nRiver of Life';
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener,noreferrer');
  };

  window.rolGo = function (hash) {
    window.location.hash = hash || '#/home';
  };

  /* ------------------------------------------------------------
     HOME RENDERER
     ------------------------------------------------------------ */

  function renderHome() {
    if (!isHome()) return false;

    ensureHomeStyles();

    var root = getApp();
    if (!root) return false;

    var data = todayVerse();
    var verse = data[0];
    var reference = data[1];
    var name = getUserName();
    var greeting = getGreeting();
    var today = getTodayDate();

    root.innerHTML = `
      <main class="rol-home-final" aria-label="River of Life Home">
        <header class="rol-home-header">
          <div class="rol-brand">
            <div class="rol-logo-mark" aria-hidden="true">✝</div>
            <div class="rol-brand-text">
              <strong>River of Life</strong>
              <small>Bible • Prayer • Community</small>
            </div>
          </div>
          <div class="rol-header-actions">
            <button type="button" class="rol-header-button" aria-label="Notifications" onclick="window.dispatchEvent(new CustomEvent('openNotifications'))">🔔</button>
            <button type="button" class="rol-header-button" aria-label="Profile" onclick="window.location.hash='#/profile'">👤</button>
          </div>
        </header>

        <section class="rol-welcome">
          <div class="rol-welcome-content">
            <span class="rol-welcome-label">WELCOME BACK</span>
            <h1>${escapeHTML(greeting)}, ${escapeHTML(name)}</h1>
            <p>${escapeHTML(today)}</p>
            <p class="rol-welcome-subtitle">Walk with God today.</p>
          </div>
          <div class="rol-cross-water" aria-hidden="true">
            <div class="rol-water-rings"><span></span><span></span><span></span></div>
            <div class="rol-cross">✝</div>
          </div>
        </section>

        <section class="rol-verse-card" aria-label="Verse of the Day">
          <div class="rol-eyebrow">✦ VERSE OF THE DAY</div>
          <blockquote>“${escapeHTML(verse)}”</blockquote>
          <div class="rol-reference">— ${escapeHTML(reference)}</div>
          <div class="rol-verse-actions">
            <button type="button" onclick="window.rolSaveDailyVerse()">♡ <span>Save</span></button>
            <button type="button" onclick="window.rolShareVerse()">↗ <span>Share WhatsApp</span></button>
          </div>
        </section>

        <section class="rol-home-section">
          <div class="rol-section-heading">
            <div><span class="rol-section-kicker">EXPLORE</span><h2 class="rol-section-title">QUICK ACTIONS</h2></div>
          </div>
          <div class="rol-actions-grid">
            <button type="button" class="rol-action-card" onclick="window.location.hash='#/bible'"><span class="rol-action-icon">📖</span><strong>Bible</strong><small>Read the Word</small><span class="rol-action-arrow">→</span></button>
            <button type="button" class="rol-action-card" onclick="window.location.hash='#/prayer'"><span class="rol-action-icon">🙏</span><strong>Prayer</strong><small>Pray &amp; connect</small><span class="rol-action-arrow">→</span></button>
            <button type="button" class="rol-action-card" onclick="window.location.hash='#/quiz'"><span class="rol-action-icon">🧠</span><strong>Bible Quiz</strong><small>Test your knowledge</small><span class="rol-action-arrow">→</span></button>
            <button type="button" class="rol-action-card" onclick="window.location.hash='#/meetings'"><span class="rol-action-icon">🎥</span><strong>Meetings</strong><small>Join prayer meetings</small><span class="rol-action-arrow">→</span></button>
          </div>
        </section>

        <section class="rol-home-section">
          <div class="rol-section-heading">
            <div><span class="rol-section-kicker">KEEP GROWING</span><h2 class="rol-section-title">CONTINUE YOUR JOURNEY</h2></div>
            <span class="rol-section-note">Grow daily</span>
          </div>
          <div class="rol-journey-grid">
            <button type="button" class="rol-journey-card" onclick="window.location.hash='#/bible'"><div class="rol-journey-icon">📖</div><div class="rol-journey-content"><p>Continue Reading</p><small>Spend time in God's Word</small></div><b>→</b></button>
            <button type="button" class="rol-journey-card" onclick="window.location.hash='#/quiz'"><div class="rol-journey-icon">🧠</div><div class="rol-journey-content"><p>Take a Bible Quiz</p><small>Learn something new today</small></div><b>→</b></button>
          </div>
        </section>

        <section class="rol-home-message">
          <div class="rol-home-message-icon">🙏</div>
          <div class="rol-home-message-content"><span>TODAY'S REMINDER</span><strong>Take a moment with God</strong><p>Read His Word, pray, and grow in faith every day.</p></div>
        </section>

        <footer class="rol-last-updated"><span>✝</span> River of Life <span>•</span> Your daily walk with God</footer>
      </main>`;

    root.dataset.rolAuthoritativeHome = '1';
    return true;
  }

  window.renderRiverHomeFinal = renderHome;

  /* ------------------------------------------------------------
     BOOT / ROUTING
     ------------------------------------------------------------ */

  function boot() {
    ensureHomeStyles();
    if (!isHome()) return;

    var root = getApp();
    if (!root) {
      setTimeout(boot, 100);
      return;
    }

    renderHome();
  }

  var lastHash = window.location.hash;

  window.addEventListener('hashchange', function () {
    var currentHash = window.location.hash;
    if (currentHash === lastHash) return;
    lastHash = currentHash;
    if (isHome()) setTimeout(boot, 50);
  });

  function startObserver() {
    var root = getApp();
    if (!root) {
      setTimeout(startObserver, 100);
      return;
    }

    var observer = new MutationObserver(function () {
      if (isHome() && root.dataset.rolAuthoritativeHome !== '1') {
        renderHome();
      }
    });

    observer.observe(root, { childList: true });
  }

  function start() {
    ensureHomeStyles();
    boot();
    startObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.addEventListener('load', function () {
    ensureHomeStyles();
    setTimeout(function () {
      if (isHome()) renderHome();
    }, 700);
  });

  window.RiverHomeDebug = {
    isHome: isHome,
    render: renderHome,
    getUserName: getUserName,
    todayVerse: todayVerse
  };

  console.log('%cRiver of Life Home Renderer Loaded', 'font-weight:bold;font-size:14px');

})();
