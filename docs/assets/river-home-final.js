/* ============================================================
   RIVER OF LIFE — FINAL HOME RENDERER
   ============================================================
   IMPORTANT:
   - This file is intended for: docs/assets/river-home-final.js
   - Home page only
   - Does NOT modify Meetings / WebRTC / Prayer Meeting logic
   - Works with GitHub Pages /docs deployment
   ============================================================ */

(function () {
  'use strict';

  /* ------------------------------------------------------------
     APP ROOT
     ------------------------------------------------------------ */

  function getApp() {
    return document.getElementById('app');
  }


  /* ------------------------------------------------------------
     HOME ROUTES
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
    '#/reader',
    '#/prayer',
    '#/prayers',
    '#/quiz',
    '#/profile',
    '#/settings',
    '#/church',
    '#/events',
    '#/plans',
    '#/discover',
    '#/you'
  ];


  function isHome() {
    const hash = (window.location.hash || '')
      .toLowerCase()
      .trim();

    if (HOME_HASHES.has(hash)) {
      return true;
    }

    if (
      NON_HOME_PREFIXES.some(function (prefix) {
        return (
          hash === prefix ||
          hash.startsWith(prefix + '/')
        );
      })
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

    for (let i = 0; i < candidates.length; i++) {

      const key = candidates[i];

      try {

        const raw = localStorage.getItem(key);

        if (!raw) {
          continue;
        }

        const parsed = JSON.parse(raw);

        const name =
          parsed.fullName ||
          parsed.name ||
          parsed.displayName ||
          parsed.firstName;

        if (name) {
          return String(name)
            .trim()
            .split(/\s+/)[0];
        }

      } catch (error) {
        console.warn(
          'River Home: unable to read user',
          key,
          error
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
     DATE
     ------------------------------------------------------------ */

  function getTodayDate() {

    const date = new Date();

    return date.toLocaleDateString(
      'en-US',
      {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      }
    );
  }


  /* ------------------------------------------------------------
     DAILY VERSES
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
     ESCAPE HTML
     ------------------------------------------------------------ */

  function escapeHTML(value) {

    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }


  /* ------------------------------------------------------------
     SAVE VERSE
     ------------------------------------------------------------ */

  window.rolSaveDailyVerse = function () {

    const data = todayVerse();

    const verse = data[0];
    const reference = data[1];

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

        window.showToast(
          'Verse saved'
        );

      } else {

        alert('Verse saved');

      }

    } catch (error) {

      console.error(
        'River Home: unable to save verse',
        error
      );

    }
  };


  /* ------------------------------------------------------------
     SHARE VERSE
     ------------------------------------------------------------ */

  window.rolShareVerse = function () {

    const data = todayVerse();

    const verse = data[0];
    const reference = data[1];

    const text =
      '🙏 Daily Bible Verse\n\n' +
      '“' + verse + '”\n' +
      '— ' + reference + '\n\n' +
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
     NAVIGATION
     ------------------------------------------------------------ */

  window.rolGo = function (hash) {

    if (!hash) {
      hash = '#/home';
    }

    window.location.hash = hash;
  };


  /* ------------------------------------------------------------
     HOME RENDERER
     ------------------------------------------------------------ */

  function renderHome() {

    if (!isHome()) {
      return false;
    }

    const root = getApp();

    if (!root) {
      return false;
    }

    const data = todayVerse();

    const verse = data[0];
    const reference = data[1];

    const name = getUserName();

    const greeting = getGreeting();

    const today = getTodayDate();


    /* ----------------------------------------------------------
       RENDER
       ---------------------------------------------------------- */

    root.innerHTML = `

      <main
        class="rol-home-final"
        aria-label="River of Life Home"
      >

        <!-- ==================================================
             HEADER
             ================================================== -->

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
              class="rol-header-button"
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
              class="rol-header-button"
              aria-label="Profile"
              onclick="
                window.location.hash='#/profile'
              "
            >
              👤
            </button>

          </div>

        </header>


        <!-- ==================================================
             WELCOME SECTION
             ================================================== -->

        <section class="rol-welcome">

          <div class="rol-welcome-content">

            <span class="rol-welcome-label">
              WELCOME BACK
            </span>

            <h1>
              ${escapeHTML(greeting)}, ${escapeHTML(name)}
            </h1>

            <p>
              ${escapeHTML(today)}
            </p>

            <p class="rol-welcome-subtitle">
              Walk with God today.
            </p>

          </div>


          <div
            class="rol-cross-water"
            aria-hidden="true"
          >

            <div class="rol-water-rings">
              <span></span>
              <span></span>
              <span></span>
            </div>

            <div class="rol-cross">
              ✝
            </div>

          </div>

        </section>


        <!-- ==================================================
             VERSE OF THE DAY
             ================================================== -->

        <section
          class="rol-verse-card"
          aria-label="Verse of the Day"
        >

          <div class="rol-eyebrow">
            ✦ VERSE OF THE DAY
          </div>


          <blockquote>
            “${escapeHTML(verse)}”
          </blockquote>


          <div class="rol-reference">
            — ${escapeHTML(reference)}
          </div>


          <div class="rol-verse-actions">

            <button
              type="button"
              onclick="
                window.rolSaveDailyVerse()
              "
            >
              ♡
              <span>Save</span>
            </button>


            <button
              type="button"
              onclick="
                window.rolShareVerse()
              "
            >
              ↗
              <span>Share WhatsApp</span>
            </button>

          </div>

        </section>


        <!-- ==================================================
             QUICK ACTIONS
             ================================================== -->

        <section class="rol-home-section">

          <div class="rol-section-heading">

            <div>

              <span class="rol-section-kicker">
                EXPLORE
              </span>

              <h2 class="rol-section-title">
                QUICK ACTIONS
              </h2>

            </div>

          </div>


          <div class="rol-actions-grid">


            <!-- BIBLE -->

            <button
              type="button"
              class="rol-action-card"
              onclick="
                window.location.hash='#/bible'
              "
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

              <span class="rol-action-arrow">
                →
              </span>

            </button>


            <!-- PRAYER -->

            <button
              type="button"
              class="rol-action-card"
              onclick="
                window.location.hash='#/prayer'
              "
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

              <span class="rol-action-arrow">
                →
              </span>

            </button>


            <!-- QUIZ -->

            <button
              type="button"
              class="rol-action-card"
              onclick="
                window.location.hash='#/quiz'
              "
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

              <span class="rol-action-arrow">
                →
              </span>

            </button>


            <!-- MEETINGS -->

            <button
              type="button"
              class="rol-action-card"
              onclick="
                window.location.hash='#/meetings'
              "
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

              <span class="rol-action-arrow">
                →
              </span>

            </button>


          </div>

        </section>


        <!-- ==================================================
             CONTINUE JOURNEY
             ================================================== -->

        <section class="rol-home-section">


          <div class="rol-section-heading">

            <div>

              <span class="rol-section-kicker">
                KEEP GROWING
              </span>

              <h2 class="rol-section-title">
                CONTINUE YOUR JOURNEY
              </h2>

            </div>

            <span class="rol-section-note">
              Grow daily
            </span>

          </div>


          <div class="rol-journey-grid">


            <!-- CONTINUE READING -->

            <button
              type="button"
              class="rol-journey-card"
              onclick="
                window.location.hash='#/bible'
              "
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
                →
              </b>

            </button>


            <!-- QUIZ -->

            <button
              type="button"
              class="rol-journey-card"
              onclick="
                window.location.hash='#/quiz'
              "
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
                →
              </b>

            </button>


          </div>

        </section>


        <!-- ==================================================
             DAILY MESSAGE
             ================================================== -->

        <section class="rol-home-message">

          <div class="rol-home-message-icon">
            🙏
          </div>


          <div class="rol-home-message-content">

            <span>
              TODAY'S REMINDER
            </span>

            <strong>
              Take a moment with God
            </strong>

            <p>
              Read His Word, pray, and grow
              in faith every day.
            </p>

          </div>

        </section>


        <!-- ==================================================
             FOOTER
             ================================================== -->

        <footer class="rol-last-updated">

          <span>
            ✝
          </span>

          River of Life

          <span>
            •
          </span>

          Your daily walk with God

        </footer>


      </main>

    `;


    /* ----------------------------------------------------------
       MARK HOME AS AUTHORITATIVE
       ---------------------------------------------------------- */

    root.dataset.rolAuthoritativeHome = '1';

    return true;
  }


  /* ------------------------------------------------------------
     EXPOSE RENDER FUNCTION
     ------------------------------------------------------------ */

  window.renderRiverHomeFinal = renderHome;


  /* ------------------------------------------------------------
     BOOT
     ------------------------------------------------------------ */

  function boot() {

    if (!isHome()) {
      return;
    }

    const root = getApp();

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
     HASH CHANGE
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
     MUTATION OBSERVER
     ------------------------------------------------------------ */

  function startObserver() {

    const root = getApp();

    if (!root) {
      return;
    }


    const observer =
      new MutationObserver(
        function () {

          if (
            isHome() &&
            root.dataset.rolAuthoritativeHome !== '1'
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
     START
     ------------------------------------------------------------ */

  function start() {

    boot();

    startObserver();

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


  /* ------------------------------------------------------------
     FINAL SAFETY BOOT
     ------------------------------------------------------------ */

  window.addEventListener(
    'load',
    function () {

      setTimeout(
        function () {

          if (isHome()) {

            const root = getApp();

            if (
              root &&
              root.dataset.rolAuthoritativeHome !== '1'
            ) {

              renderHome();

            }

          }

        },
        500
      );

    }
  );


  /* ------------------------------------------------------------
     DEBUG
     ------------------------------------------------------------ */

  window.RiverHomeDebug = {

    isHome: isHome,

    render: renderHome,

    getUserName: getUserName,

    todayVerse: todayVerse

  };


  console.log(
    '%cRiver of Life Home Renderer Loaded',
    'font-weight:bold;font-size:14px'
  );

})();
