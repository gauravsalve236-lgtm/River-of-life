/* ============================================================
   RIVER OF LIFE — FINAL HOME RENDERER
   ============================================================
   Home page only.
   Does NOT modify Meetings / WebRTC / Prayer Meeting logic.
   ============================================================ */

(function () {
  'use strict';

  const app = () => document.getElementById('app');

  /* ------------------------------------------------------------
     ROUTES
     ------------------------------------------------------------ */

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
    '#/events',
    '#/plans',
    '#/discover',
    '#/you',
    '#/reader'
  ];

  function isHome() {
    const hash = (window.location.hash || '').toLowerCase().trim();

    if (HOME_HASHES.has(hash)) {
      return true;
    }

    if (
      NON_HOME_PREFIXES.some(
        prefix =>
          hash === prefix ||
          hash.startsWith(prefix + '/')
      )
    ) {
      return false;
    }

    return false;
  }

  /* ------------------------------------------------------------
     USER
     ------------------------------------------------------------ */

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

        const user = JSON.parse(raw);

        const name =
          user.fullName ||
          user.name ||
          user.displayName ||
          user.firstName;

        if (name) {
          return String(name)
            .trim()
            .split(/\s+/)[0];
        }
      } catch (error) {
        console.warn(
          'River Home: unable to read user:',
          key
        );
      }
    }

    return 'Friend';
  }

  /* ------------------------------------------------------------
     GREETING
     ------------------------------------------------------------ */

  function getGreeting() {
    const hour = new Date().getHours();

    if (hour < 12) {
      return 'Good morning';
    }

    if (hour < 17) {
      return 'Good afternoon';
    }

    return 'Good evening';
  }

  /* ------------------------------------------------------------
     DAILY BIBLE VERSES
     ------------------------------------------------------------ */

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
    ],
    [
      'The LORD is good, a stronghold in the day of trouble; he knows those who take refuge in him.',
      'Nahum 1:7'
    ],
    [
      'I have set the LORD always before me; because he is at my right hand, I shall not be shaken.',
      'Psalm 16:8'
    ],
    [
      'The joy of the LORD is your strength.',
      'Nehemiah 8:10'
    ],
    [
      'Those who wait for the LORD shall renew their strength.',
      'Isaiah 40:31'
    ],
    [
      'The LORD bless you and keep you.',
      'Numbers 6:24'
    ],
    [
      'Let all that you do be done in love.',
      '1 Corinthians 16:14'
    ],
    [
      'Above all else, guard your heart, for everything you do flows from it.',
      'Proverbs 4:23'
    ],
    [
      'The LORD will fight for you; you need only to be still.',
      'Exodus 14:14'
    ]
  ];

  function todayVerse() {
    const date = new Date();

    const dayNumber = Math.floor(
      Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      ) / 86400000
    );

    return verses[
      Math.abs(dayNumber) % verses.length
    ];
  }

  /* ------------------------------------------------------------
     NAVIGATION
     ------------------------------------------------------------ */

  function go(hash) {
    window.location.hash = hash;
  }

  /* ------------------------------------------------------------
     SAVE DAILY VERSE
     ------------------------------------------------------------ */

  window.rolSaveDailyVerse = function () {
    const [verse, reference] = todayVerse();

    try {
      localStorage.setItem(
        'riverSavedDailyVerse',
        JSON.stringify({
          verse: verse,
          reference: reference,
          savedAt: new Date().toISOString()
        })
      );

      if (
        typeof window.showToast === 'function'
      ) {
        window.showToast('Verse saved');
      } else {
        alert('Verse saved');
      }
    } catch (error) {
      console.error(
        'River Home: save verse failed',
        error
      );
    }
  };

  /* ------------------------------------------------------------
     SHARE TO WHATSAPP
     ------------------------------------------------------------ */

  window.rolShareVerse = function () {
    const [verse, reference] = todayVerse();

    const text =
      '🙏 Daily Bible Verse\n\n' +
      '“' +
      verse +
      '”\n' +
      '— ' +
      reference +
      '\n\n' +
      'River of Life';

    const url =
      'https://wa.me/?text=' +
      encodeURIComponent(text);

    window.open(
      url,
      '_blank',
      'noopener,noreferrer'
    );
  };

  /* ------------------------------------------------------------
     HOME HTML
     ------------------------------------------------------------ */

  function renderHome() {
    if (!isHome()) {
      return false;
    }

    const root = app();

    if (!root) {
      return false;
    }

    const [verse, reference] = todayVerse();

    const userName = getUserName();

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

              <strong>
                River of Life
              </strong>

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
                  new CustomEvent(
                    'openNotifications'
                  )
                )
              "
            >
              🔔
            </button>

            <button
              type="button"
              aria-label="Profile"
              onclick="
                window.location.hash =
                  '#/profile'
              "
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
              ${greeting}, ${userName}
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
              onclick="
                window.rolSaveDailyVerse()
              "
            >
              ♡ Save
            </button>

            <button
              type="button"
              onclick="
                window.rolShareVerse()
              "
            >
              ↗ Share WhatsApp
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
              onclick="
                go('#/bible')
              "
            >

              <span
                class="rol-action-icon"
              >
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
              onclick="
                go('#/prayer')
              "
            >

              <span
                class="rol-action-icon"
              >
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
              onclick="
                go('#/quiz')
              "
            >

              <span
                class="rol-action-icon"
              >
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
              onclick="
                go('#/meetings')
              "
            >

              <span
                class="rol-action-icon"
              >
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


        <!-- CONTINUE YOUR JOURNEY -->
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
              onclick="
                go('#/bible')
              "
            >

              <div
                class="rol-journey-icon"
              >
                📖
              </div>

              <div
                class="rol-journey-content"
              >

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
              onclick="
                go('#/quiz')
              "
            >

              <div
                class="rol-journey-icon"
              >
                🧠
              </div>

              <div
                class="rol-journey-content"
              >

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

          <div class="rol-home-message-icon">
            🙏
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


        <!-- FOOTER -->
        <div class="rol-last-updated">
          River of Life • Your daily walk with God
        </div>

      </main>
    `;

    root.dataset.rolAuthoritativeHome = '1';

    return true;
  }

  /* ------------------------------------------------------------
     EXPOSE RENDERER TO APP.JS
     ------------------------------------------------------------ */

  window.renderRiverHomeFinal = renderHome;

  /* ------------------------------------------------------------
     BOOT
     ------------------------------------------------------------ */

  function boot() {
    if (!isHome()) {
      return;
    }

    const root = app();

    if (!root) {
      setTimeout(
        boot,
        100
      );

      return;
    }

    renderHome();
  }

  /* ------------------------------------------------------------
     ROUTE CHANGES
     ------------------------------------------------------------ */

  let lastHash =
    window.location.hash;

  window.addEventListener(
    'hashchange',
    function () {

      const currentHash =
        window.location.hash;

      if (
        currentHash === lastHash
      ) {
        return;
      }

      lastHash = currentHash;

      if (isHome()) {
        setTimeout(
          boot,
          50
        );
      }

    }
  );

  /* ------------------------------------------------------------
     START
     ------------------------------------------------------------ */

  function start() {

    boot();

    const root = app();

    if (!root) {
      return;
    }

    const observer =
      new MutationObserver(
        function () {

          if (
            isHome() &&
            root.dataset
              .rolAuthoritativeHome !== '1'
          ) {
            renderHome();
          }

        }
      );

    observer.observe(
      root,
      {
        childList: true
      }
    );
  }

  /* ------------------------------------------------------------
     INITIALIZE
     ------------------------------------------------------------ */

  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      start
    );

  } else {

    start();

  }

})();
