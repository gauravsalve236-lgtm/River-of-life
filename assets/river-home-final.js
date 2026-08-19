/* River of Life — Authoritative Home Renderer
   Home only. Meeting / WebRTC / Prayer Meeting routes are untouched.
*/
(function () {
  'use strict';

  const app = () => document.getElementById('app');

  const HOME_HASHES = new Set([
    '',
    '#',
    '#/',
    '#/home',
    '#/today',
    '#/dashboard'
  ]);

  const NON_HOME_PREFIXES = [
    '#/meetings',
    '#/meeting',
    '#/bible',
    '#/prayer',
    '#/quiz',
    '#/profile',
    '#/settings',
    '#/church',
    '#/events'
  ];

  function isHome() {
    const hash = (location.hash || '').toLowerCase().trim();

    if (HOME_HASHES.has(hash)) return true;

    if (
      NON_HOME_PREFIXES.some(
        p => hash === p || hash.startsWith(p + '/')
      )
    ) {
      return false;
    }

    return (
      hash === '' ||
      hash === '#' ||
      hash === '#/' ||
      hash === '#/home' ||
      hash === '#/today' ||
      hash === '#/dashboard'
    );
  }

  /* ---------------------------------------------------------
     USER
  --------------------------------------------------------- */

  function getUserName() {
    const candidates = [
      'riverUser',
      'currentUser',
      'loggedInUser',
      'user'
    ];

    for (const key of candidates) {
      try {
        const raw = localStorage.getItem(key);

        if (!raw) continue;

        const u = JSON.parse(raw);

        const name =
          u.fullName ||
          u.name ||
          u.displayName ||
          u.firstName;

        if (name) {
          return String(name).trim().split(/\s+/)[0];
        }
      } catch (_) {}
    }

    return 'Friend';
  }

  /* ---------------------------------------------------------
     TIME / GREETING
  --------------------------------------------------------- */

  function getGreeting() {
    const hour = new Date().getHours();

    if (hour < 12) return 'Good morning';

    if (hour < 17) return 'Good afternoon';

    return 'Good evening';
  }

  /* ---------------------------------------------------------
     DAILY VERSE
  --------------------------------------------------------- */

  const verses = [
    [
      'The LORD is my shepherd; I shall not want.',
      'Psalm 23:1'
    ],
    [
      'Trust in the LORD with all your heart, and do not lean on your own understanding.',
      'Proverbs 3:5'
    ],
    [
      'I can do all things through Christ who strengthens me.',
      'Philippians 4:13'
    ],
    [
      'Be strong and courageous. Do not be frightened, and do not be dismayed, for the LORD your God is with you wherever you go.',
      'Joshua 1:9'
    ],
    [
      'Your word is a lamp to my feet and a light to my path.',
      'Psalm 119:105'
    ],
    [
      'God is our refuge and strength, a very present help in trouble.',
      'Psalm 46:1'
    ],
    [
      'Come to me, all who labor and are heavy laden, and I will give you rest.',
      'Matthew 11:28'
    ],
    [
      'The Lord is near to the brokenhearted and saves the crushed in spirit.',
      'Psalm 34:18'
    ],
    [
      'Commit your work to the LORD, and your plans will be established.',
      'Proverbs 16:3'
    ],
    [
      'The LORD is my strength and my shield; in him my heart trusts.',
      'Psalm 28:7'
    ],
    [
      'Cast all your anxiety on him because he cares for you.',
      '1 Peter 5:7'
    ],
    [
      'Rejoice in hope, be patient in tribulation, be constant in prayer.',
      'Romans 12:12'
    ],
    [
      'The steadfast love of the LORD never ceases; his mercies never come to an end.',
      'Lamentations 3:22'
    ],
    [
      'For nothing will be impossible with God.',
      'Luke 1:37'
    ]
  ];

  function todayVerse() {
    const d = new Date();

    const day = Math.floor(
      Date.UTC(
        d.getFullYear(),
        d.getMonth(),
        d.getDate()
      ) / 86400000
    );

    return verses[Math.abs(day) % verses.length];
  }

  /* ---------------------------------------------------------
     NAVIGATION
  --------------------------------------------------------- */

  function go(hash) {
    location.hash = hash;
  }

  /* ---------------------------------------------------------
     SHARE VERSE
  --------------------------------------------------------- */

  window.rolShareVerse = function () {
    const [verse, reference] = todayVerse();

    const text =
      `🙏 Daily Bible Verse\n\n` +
      `“${verse}”\n` +
      `— ${reference}\n\n` +
      `River of Life`;

    const whatsappUrl =
      'https://wa.me/?text=' +
      encodeURIComponent(text);

    window.open(
      whatsappUrl,
      '_blank',
      'noopener,noreferrer'
    );
  };

  /* ---------------------------------------------------------
     SAVE VERSE
  --------------------------------------------------------- */

  window.rolSaveDailyVerse = function () {
    const [verse, reference] = todayVerse();

    try {
      localStorage.setItem(
        'riverSavedDailyVerse',
        JSON.stringify({
          verse,
          reference,
          savedAt: new Date().toISOString()
        })
      );

      if (typeof window.showToast === 'function') {
        window.showToast('Verse saved');
      } else {
        alert('Verse saved');
      }
    } catch (error) {
      console.warn('Unable to save verse:', error);
    }
  };

  /* ---------------------------------------------------------
     HOME RENDERER
  --------------------------------------------------------- */

  function renderHome() {
    if (!isHome()) return false;

    const root = app();

    if (!root) return false;

    const [verse, reference] = todayVerse();

    const name = getUserName();

    const greeting = getGreeting();

    root.innerHTML = `
      <main
        class="rol-home-final"
        aria-label="River of Life Home"
      >

        <!-- HEADER -->

        <header class="rol-home-header">

          <div class="rol-brand">

            <div
              class="rol-logo-mark"
              aria-hidden="true"
            >
              ✝
            </div>

            <div class="rol-brand-text">
              <strong>River of Life</strong>
              <small>
                Bible • Prayer • Community
              </small>
            </div>

          </div>

          <div class="rol-header-actions">

            <button
              type="button"
              aria-label="Notifications"
              onclick="
                window.dispatchEvent(
                  new CustomEvent('openNotifications')
                )
              "
            >
              🔔
            </button>

            <button
              type="button"
              aria-label="Profile"
              onclick="location.hash='#/profile'"
            >
              👤
            </button>

          </div>

        </header>


        <!-- WELCOME -->

        <section class="rol-welcome">

          <div class="rol-welcome-content">

            <span class="rol-welcome-label">
              WELCOME BACK
            </span>

            <h1>
              ${greeting}, ${name}
            </h1>

            <p>
              Walk with God today.
            </p>

          </div>

          <div
            class="rol-cross-water"
            aria-hidden="true"
          >
            ✝
          </div>

        </section>


        <!-- VERSE OF THE DAY -->

        <section
          class="rol-verse-card"
          aria-label="Verse of the Day"
        >

          <div class="rol-eyebrow">
            ✦ VERSE OF THE DAY
          </div>

          <blockquote>
            “${verse}”
          </blockquote>

          <div class="rol-reference">
            — ${reference}
          </div>

          <div class="rol-verse-actions">

            <button
              type="button"
              onclick="window.rolSaveDailyVerse()"
            >
              ♡ Save
            </button>

            <button
              type="button"
              onclick="window.rolShareVerse()"
            >
              <span>↗</span>
              Share WhatsApp
            </button>

          </div>

        </section>


        <!-- QUICK ACTIONS -->

        <section class="rol-home-section">

          <div class="rol-section-heading">

            <h2 class="rol-section-title">
              QUICK ACTIONS
            </h2>

          </div>

          <div class="rol-actions-grid">

            <button
              type="button"
              onclick="location.hash='#/bible'"
            >
              <span class="rol-action-icon">
                📖
              </span>

              <strong>
                Bible
              </strong>

              <small>
                Read the Word
              </small>
            </button>


            <button
              type="button"
              onclick="location.hash='#/prayer'"
            >
              <span class="rol-action-icon">
                🙏
              </span>

              <strong>
                Prayer
              </strong>

              <small>
                Pray & connect
              </small>
            </button>


            <button
              type="button"
              onclick="location.hash='#/quiz'"
            >
              <span class="rol-action-icon">
                🧠
              </span>

              <strong>
                Bible Quiz
              </strong>

              <small>
                Test your knowledge
              </small>
            </button>


            <button
              type="button"
              onclick="location.hash='#/meetings'"
            >
              <span class="rol-action-icon">
                🎥
              </span>

              <strong>
                Meetings
              </strong>

              <small>
                Join prayer meetings
              </small>
            </button>

          </div>

        </section>


        <!-- CONTINUE JOURNEY -->

        <section class="rol-home-section">

          <div class="rol-section-heading">

            <h2 class="rol-section-title">
              CONTINUE YOUR JOURNEY
            </h2>

            <span>
              Grow daily
            </span>

          </div>


          <div class="rol-journey-grid">

            <button
              type="button"
              onclick="location.hash='#/bible'"
            >

              <div class="rol-journey-icon">
                📖
              </div>

              <div class="rol-journey-content">

                <p>
                  Continue Reading
                </p>

                <small>
                  Spend time in God's Word
                </small>

              </div>

              <b>
                ›
              </b>

            </button>


            <button
              type="button"
              onclick="location.hash='#/quiz'"
            >

              <div class="rol-journey-icon">
                🧠
              </div>

              <div class="rol-journey-content">

                <p>
                  Take a Bible Quiz
                </p>

                <small>
                  Learn something new today
                </small>

              </div>

              <b>
                ›
              </b>

            </button>

          </div>

        </section>


        <!-- DAILY MESSAGE -->

        <section class="rol-home-message">

          <div>
            <span>🙏</span>
          </div>

          <div>
            <strong>
              Take a moment with God
            </strong>

            <p>
              Read His Word, pray, and grow
              in faith every day.
            </p>
          </div>

        </section>


        <div class="rol-last-updated">
          River of Life • Your daily walk with God
        </div>

      </main>
    `;

    root.dataset.rolAuthoritativeHome = '1';

    return true;
  }

  /* ---------------------------------------------------------
     BOOT
  --------------------------------------------------------- */

  function boot() {

    if (!isHome()) return;

    const root = app();

    if (!root) {
      setTimeout(boot, 100);
      return;
    }

    renderHome();
  }

  /* ---------------------------------------------------------
     ROUTE CHANGE
  --------------------------------------------------------- */

  let lastHash = location.hash;

  window.addEventListener(
    'hashchange',
    function () {

      const now = location.hash;

      if (now === lastHash) return;

      lastHash = now;

      if (isHome()) {
        setTimeout(boot, 50);
      }

    }
  );

  /* ---------------------------------------------------------
     START
  --------------------------------------------------------- */

  function start() {

    boot();

    const root = app();

    if (!root) return;

    const observer =
      new MutationObserver(function () {

        if (
          isHome() &&
          root.dataset.rolAuthoritativeHome !== '1'
        ) {
          renderHome();
        }

      });

    observer.observe(
      root,
      {
        childList: true
      }
    );
  }

  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      start
    );
  } else {
    start();
  }

})();
window.addEventListener('load', function () {
  setTimeout(function () {
    if (isHome()) {
      renderHome();
    }
  }, 800);
});
