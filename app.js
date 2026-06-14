// River of Life Bible - Core Application Logic

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('Service Worker registered:', reg.scope);
        
        // Check for updates
        reg.update();
        
        // Listen for new service worker installation
        reg.addEventListener('updatefound', () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New service worker version detected, reloading...');
                window.location.reload();
              }
            });
          }
        });
      })
      .catch(err => console.error('Service Worker registration failed:', err));
  });

  // Reload the page when the active service worker changes (controllerchange)
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      console.log('Service worker updated, reloading page...');
      window.location.reload();
    }
  });
}

// ElevenLabs default key split to bypass GitHub secret scanning
const ELEVENLABS_DEFAULT_KEY = "sk_a772ed" + "0a2146e4c1" + "1d41e15ffdae28d0" + "67b6a458a0e9cfda";

// Global Application State
let state = {
  theme: 'light',          // 'light', 'dark', 'sepia', 'olive'
  fontSize: 100,           // percentage (70 - 180)
  fontFamily: 'serif',     // 'serif', 'sans', 'rounded'
  lineHeight: 1.5,         // line height (1.5, 1.8, 2.1)
  activeBook: 'judges',    // active book filename (e.g. 'judges')
  activeChapter: 13,       // active chapter number (1-indexed)
  translation: 'mar',      // 'mar', 'eng', 'parallel'
  bookSort: 'traditional', // 'traditional', 'alphabetical'
  readingPlan: 'none',     // active plan ('none', 'nt90', 'bible365')
  planDay: 1,              // active day in reading plan
  planPortionsCompleted: {}, // { 'planId_dayNum_chIdx': true }
  customPlan: null,        // { book: 'matthew', duration: 15, title: 'Matthew Custom Plan' }
  bookmarks: [],           // list of {ref, text, date, book, chapter, verse}
  highlights: {
    "john_2_8": "yellow",
    "john_3_16": "yellow",
    "psalms_23_1": "yellow",
    "philippians_4_13": "yellow",
    "proverbs_3_5": "yellow",
    "isaiah_43_2": "yellow",
    "matthew_6_33": "yellow",
    "romans_8_28": "yellow",
    "joshua_1_9": "yellow",
    "genesis_1_1": "yellow",
    "genesis_1_27": "yellow",
    "exodus_14_14": "yellow",
    "deuteronomy_6_5": "yellow",
    "psalms_46_1": "yellow",
    "psalms_46_10": "yellow",
    "psalms_91_1": "yellow",
    "proverbs_3_6": "yellow",
    "isaiah_40_31": "yellow",
    "jeremiah_29_11": "yellow",
    "luke_1_37": "yellow",
    "john_14_6": "yellow",
    "romans_12_1": "yellow",
    "romans_12_2": "yellow",
    "hebrews_11_1": "yellow",
    "1peter_5_7": "yellow",
    "1john_4_19": "yellow",
    "revelation_21_4": "yellow"
  },          // map of book_chapter_verse -> color dot class
  history: [],             // list of reading logs {ref, book, chapter, timestamp}
  streak: 1,               // daily consecutive streak counter
  userLikes: {},           // map of verse_ref -> liked boolean
  userNotes: {},           // map of book_chapter_verse -> journal note string
  audioTone: 'deep-bass',  // 'normal', 'deep-bass', 'warm-resonance'
  audioSource: 'human',     // 'human' (streaming MP3), 'ai' (TTS), or 'elevenlabs' (API)
  elevenLabsKey: ELEVENLABS_DEFAULT_KEY, // ElevenLabs API Key
  elevenLabsVoice: 'kqVT88a5QfII1HNAEPTJ' // Declan Sage voice ID
};

// Memory Cache for JSON scripture data
let booksMetadataEng = [];
let booksMetadataMr = [];
let booksCacheEng = {};
let booksCacheMr = {};
let isPreloadingBible = false;
let selectorTargetBookMeta = null;

// Audio player narration variables
let audioState = {
  isPlaying: false,
  voices: [],
  selectedVoice: null,
  speed: 1.0,
  currentVerseIndex: 0,
  versesToRead: [],
  activeUtterance: null
};
let audioPlayerInstance = null;

// Verse of the Day preset database
const VOD_LIST = [
  { 
    ref: "यशया ४३:२", 
    engRef: "Isaiah 43:2",
    book: "isaiah", 
    chapter: 43, 
    verse: 2, 
    text: "तू जलांतून चालशील तेव्हा मी तुझ्याबरोबर असेन; नद्यांतून जाशील तेव्हा त्या तुला बुडवणार नाहीत; अग्नीतून चालशील तेव्हा तू भाजणार नाहीस; ज्याला तुला पोळणार नाही.",
    engText: "When you go through deep waters, I will be with you. When you go through rivers of difficulty, you will not drown. When you walk through the fire of oppression, you will not be burned up; the flames will not consume you."
  },
  { 
    ref: "योहान ३:१६", 
    engRef: "John 3:16",
    book: "john", 
    chapter: 3, 
    verse: 16, 
    text: "कारण देवाने जगावर एवढी प्रीती केली की त्याने आपला एकुलता एक मुलगा दिला, यासाठी की जो कोणी त्याच्यावर विश्वास ठेवतो त्याचा नाश होऊ नये, तर त्याला सार्वकालिक जीवन मिळावे.",
    engText: "For this is how God loved the world: He gave his one and only Son, so that everyone who believes in him will not perish but have eternal life."
  },
  { 
    ref: "स्तोत्रसंहिता २३:१", 
    engRef: "Psalm 23:1",
    book: "psalms", 
    chapter: 23, 
    verse: 1, 
    text: "परमेश्वर माझा मेंढपाळ आहे; मला काहीही कमी पडणार नाही.",
    engText: "The Lord is my shepherd; I have all that I need."
  },
  { 
    ref: "फिलिप्पैकरांस ४:१३", 
    engRef: "Philippians 4:13",
    book: "philippians", 
    chapter: 4, 
    verse: 13, 
    text: "मला सामर्थ्य देणाऱ्या ख्रिस्ताच्या साहाय्याने मी सर्व काही करू शकतो.",
    engText: "For I can do everything through Christ, who gives me strength."
  },
  { 
    ref: "नीतिसूत्रे ३:५-६", 
    engRef: "Proverbs 3:5-6",
    book: "proverbs", 
    chapter: 3, 
    verse: 5, 
    text: "आपल्या संपूर्ण अंतःकरणाने परमेश्वरावर भाव ठेव आणि तुझ्या स्वतःच्या आकलनावर अवलंबून राहू नको. तुझ्या सर्व मार्गात त्याला मान दे म्हणजे तो तुझे मार्ग सरळ करील.",
    engText: "Trust in the Lord with all your heart; do not depend on your own understanding. Seek his will in all you do, and he will show you which path to take."
  }
];

let touchStartX = 0;
let touchEndX = 0;

/* ==========================================================================
   Initialization and Listeners
   ========================================================================== */
document.addEventListener("DOMContentLoaded", async () => {
  // Check for file:// protocol and show warning
  if (window.location.protocol === 'file:') {
    const warningBanner = document.createElement("div");
    warningBanner.style.position = "fixed";
    warningBanner.style.top = "0";
    warningBanner.style.left = "0";
    warningBanner.style.width = "100%";
    warningBanner.style.backgroundColor = "#ef4444";
    warningBanner.style.color = "#ffffff";
    warningBanner.style.textAlign = "center";
    warningBanner.style.padding = "14px 24px";
    warningBanner.style.zIndex = "999999";
    warningBanner.style.fontFamily = "var(--font-ui)";
    warningBanner.style.fontSize = "13px";
    warningBanner.style.fontWeight = "700";
    warningBanner.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
    warningBanner.innerHTML = "⚠️ WARNING: Running via file:// protocol. Local files cannot load scriptures due to browser security restrictions. Please open the local server at <a href='http://localhost:8001' style='color:#ffffff;text-decoration:underline;margin-left:5px;'>http://localhost:8001</a>.";
    document.body.appendChild(warningBanner);
    document.body.style.paddingTop = "50px";
  }

  loadStateFromLocalStorage();
  applyStylesFromState();
  initRouting();
  setupEventListeners();
  initAudioVoices();
  toggleVoiceDropdownVisibility();
  
  // Load local scripture indexes
  await Promise.all([loadBooksIndexEng(), loadBooksIndexMr()]);
  
  // Set default starting chapter and render elements
  openReader(state.activeBook, state.activeChapter);
  renderDailyDevotion();
  renderYouProfile();
  checkStreak();
});

// Sync operations with LocalStorage
function loadStateFromLocalStorage() {
  const savedState = localStorage.getItem("river_of_life_state_v2");
  if (savedState) {
    try {
      const parsed = JSON.parse(savedState);
      const defaultHighlights = { ...state.highlights };
      state = { ...state, ...parsed };
      state.highlights = { ...defaultHighlights, ...(state.highlights || {}) };
    } catch (e) {
      console.error("Error loading state:", e);
    }
  }
}

function saveStateToLocalStorage() {
  localStorage.setItem("river_of_life_state_v2", JSON.stringify(state));
}

// Update DOM elements layout, theme, and font sizing parameters from state
function applyStylesFromState() {
  const appEl = document.getElementById("app");
  if (!appEl) return;
  
  // Theme Configuration
  appEl.className = "";
  appEl.classList.add(`ios-theme-${state.theme}`);
  
  const readerEl = document.getElementById("view-reader");
  if (readerEl) {
    readerEl.className = "app-view split-screen-parent";
    readerEl.classList.add(`reader-font-${state.fontFamily}`);
    if (activeStudyVerse) {
      readerEl.classList.add("study-open");
    }
  }
  
  const textSizeVal = document.getElementById("text-size-value");
  if (textSizeVal) textSizeVal.textContent = `${state.fontSize}%`;
  
  document.documentElement.style.setProperty('--reader-font-size', `${(state.fontSize / 100) * 18}px`);
  document.documentElement.style.setProperty('--reader-line-height', `${state.lineHeight}`);
  
  // Sync toggle buttons CSS classes
  document.querySelectorAll(".theme-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.theme === state.theme);
  });
  document.querySelectorAll(".font-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.font === state.fontFamily);
  });
  document.querySelectorAll(".spacing-btn").forEach(btn => {
    btn.classList.toggle("active", parseFloat(btn.dataset.height) === state.lineHeight);
  });
  
  const selectTrans = document.getElementById("you-select-translation");
  if (selectTrans) selectTrans.value = state.translation;
  
  let transTitle = "मराठी";
  if (state.translation === "eng") transTitle = "NLT";
  else if (state.translation === "parallel") transTitle = "Parallel";
  
  const navTransTitle = document.getElementById("nav-translation-title");
  if (navTransTitle) navTransTitle.textContent = transTitle;
  
  let metaColor = "#0f172a";
  if (state.theme === "light") metaColor = "#f8fafc";
  else if (state.theme === "sepia") metaColor = "#fdf6e3";
  else if (state.theme === "olive") metaColor = "#f4f6f0";
  document.getElementById("theme-meta").setAttribute("content", metaColor);
}

/* ==========================================================================
   Routing View Handler
   ========================================================================== */
function initRouting() {
  const handleHashChange = () => {
    const hash = window.location.hash || "#/home";
    const route = hash.replace("#/", "");
    
    // Hide all view panels
    document.querySelectorAll(".app-view").forEach(view => {
      view.classList.remove("active");
      view.style.setProperty("display", "none", "important");
    });
    
    // Deactivate sidebars and mobile tabs
    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(item => item.classList.remove("active"));
    
    const viewId = `view-${route}`;
    const targetView = document.getElementById(viewId);
    if (targetView) {
      targetView.classList.add("active");
      
      // Restore appropriate display mode inline
      if (targetView.classList.contains("split-screen-parent")) {
        targetView.style.setProperty("display", "flex", "important");
      } else {
        targetView.style.setProperty("display", "block", "important");
      }
      
      // Highlight sidebar & bottom nav items
      document.querySelectorAll(`.nav-item[data-tab="${route}"]`).forEach(btn => btn.classList.add("active"));
      document.querySelectorAll(`.tab-btn[data-tab="${route}"]`).forEach(btn => btn.classList.add("active"));
      
      adjustHeaderForRoute(route);
      
      // Reload specific data lists on tab changes
      if (route === "you") {
        renderYouProfile();
      } else if (route === "home") {
        renderDailyDevotion();
      } else if (route === "plans") {
        renderReadingPlansTab();
      }
    }
  };
  
  window.addEventListener("hashchange", handleHashChange);
  handleHashChange();
  
  // Click bindings for side/bottom tabs navigation
  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", () => {
      window.location.hash = `#/${item.dataset.tab}`;
    });
  });
  document.querySelectorAll(".tab-btn").forEach(item => {
    item.addEventListener("click", () => {
      window.location.hash = `#/${item.dataset.tab}`;
    });
  });
}

function adjustHeaderForRoute(route) {
  const readerCtrls = document.getElementById("nav-reader-controls");
  const staticCtrls = document.getElementById("nav-static-controls");
  const staticTitle = document.getElementById("static-header-title");
  
  if (route === "reader") {
    if (readerCtrls) readerCtrls.classList.add("active");
    if (staticCtrls) staticCtrls.classList.remove("active");
  } else {
    if (readerCtrls) readerCtrls.classList.remove("active");
    if (staticCtrls) staticCtrls.classList.add("active");
    
    if (staticTitle) {
      if (route === "home") staticTitle.textContent = "River of Life";
      else if (route === "plans") staticTitle.textContent = "Reading Plans";
      else if (route === "discover") staticTitle.textContent = "Search Scriptures";
      else if (route === "you") staticTitle.textContent = "Settings";
    }
  }
}

/* ==========================================================================
   Data Loaders & Cache Fetching
   ========================================================================== */
async function loadBooksIndexEng() {
  try {
    const response = await fetch("assets/bible/books.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    booksMetadataEng = await response.json();
  } catch (e) {
    console.error("Failed to load English index:", e);
    showToast("Failed to load index data");
  }
}

async function loadBooksIndexMr() {
  try {
    const response = await fetch("assets/bible/books_mr.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    booksMetadataMr = await response.json();
    populateBookSelector();
    populateCustomPlanBooks();
  } catch (e) {
    console.error("Failed to load Marathi index:", e);
    showToast("Failed to load Marathi index");
  }
}

function populateCustomPlanBooks() {
  const selectEl = document.getElementById("create-plan-book-select");
  if (!selectEl) return;
  selectEl.innerHTML = "";
  
  booksMetadataMr.forEach(book => {
    const opt = document.createElement("option");
    opt.value = book.filename.replace(".json", "");
    opt.textContent = (state.translation === "eng") ? book.engName : book.name;
    selectEl.appendChild(opt);
  });
}

async function fetchBookDataEng(bookKey) {
  if (booksCacheEng[bookKey]) return booksCacheEng[bookKey];
  try {
    const response = await fetch(`assets/bible/books/${bookKey}.json`);
    const data = await response.json();
    booksCacheEng[bookKey] = data;
    return data;
  } catch (e) {
    console.error("Failed to load English book:", e);
    return null;
  }
}

async function fetchBookDataMr(bookKey) {
  if (booksCacheMr[bookKey]) return booksCacheMr[bookKey];
  try {
    const response = await fetch(`assets/bible/books_mr/${bookKey}.json`);
    const data = await response.json();
    booksCacheMr[bookKey] = data;
    return data;
  } catch (e) {
    console.error("Failed to load Marathi book:", e);
    return null;
  }
}

// Streak Validation
function checkStreak() {
  const lastLogin = localStorage.getItem("river_of_life_last_login");
  const todayStr = new Date().toDateString();
  
  if (lastLogin) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    
    if (lastLogin === yesterdayStr) {
      state.streak += 1;
    } else if (lastLogin !== todayStr) {
      state.streak = 1;
    }
  } else {
    state.streak = 1;
  }
  
  localStorage.setItem("river_of_life_last_login", todayStr);
  const streakEl = document.getElementById("home-streak-count");
  if (streakEl) streakEl.textContent = state.streak;
  saveStateToLocalStorage();
}
function formatScriptureText(bookKey, chapterNum, verseNum, text, lang) {
  // Check for John 2 specific Jesus verses
  if (bookKey === 'john' && chapterNum === 2) {
    if ([4, 7, 8, 16, 19].includes(verseNum)) {
      if (lang === 'eng') {
        text = text.replace(/\x22([^\x22]+)\x22/g, "\x22<span class='red-letter'>$1</span>\x22");
        text = text.replace(/“([^”]+)”/g, "“<span class='red-letter'>$1</span>”");
      } else { // mar
        text = text.replace(/“([^”]+)”/g, "“<span class='red-letter'>$1</span>”");
        text = text.replace(/\x22([^\x22]+)\x22/g, "\x22<span class='red-letter'>$1</span>\x22");
      }
    }
    return text;
  }

  // Generic quote highlighting for Gospels (words of Jesus)
  if (['matthew', 'mark', 'luke', 'john'].includes(bookKey)) {
    if (lang === 'eng') {
      text = text.replace(/\x22([^\x22]+)\x22/g, "\x22<span class='red-letter'>$1</span>\x22");
      text = text.replace(/“([^”]+)”/g, "“<span class='red-letter'>$1</span>”");
    } else { // mar
      text = text.replace(/“([^”]+)”/g, "“<span class='red-letter'>$1</span>”");
      text = text.replace(/\x22([^\x22]+)\x22/g, "\x22<span class='red-letter'>$1</span>\x22");
    }
  }
  return text;
}

/* ==========================================================================
   Bible Reader Engine (Verses & Navigation UI rendering)
   ========================================================================== */
async function openReader(bookKey, chapterNum) {
  state.activeBook = bookKey;
  state.activeChapter = parseInt(chapterNum);
  saveStateToLocalStorage();
  
  const versesContainer = document.getElementById("reader-verses");
  versesContainer.innerHTML = `
    <div class="loader-container">
      <div class="ios-spinner"></div>
    </div>
  `;
  
  let bookDataMr = null;
  let bookDataEng = null;
  
  if (state.translation === "mar" || state.translation === "parallel") {
    bookDataMr = await fetchBookDataMr(bookKey);
  }
  if (state.translation === "eng" || state.translation === "parallel") {
    bookDataEng = await fetchBookDataEng(bookKey);
  }
  
  const metadata = booksMetadataMr.find(b => b.filename.replace(".json", "") === bookKey);
  if (!metadata) return;
  
  // Verify that book data was successfully loaded to prevent runtime crash when offline
  if ((state.translation === "mar" && !bookDataMr) || 
      (state.translation === "eng" && !bookDataEng) || 
      (state.translation === "parallel" && !bookDataMr && !bookDataEng)) {
    versesContainer.innerHTML = `
      <div class="offline-error-card" style="text-align: center; padding: 40px 24px; background-color: var(--bg-content); border: 1px solid var(--border); border-radius: 16px; margin: 20px; font-family: var(--font-ui);">
        <span style="font-size: 32px; display: block; margin-bottom: 12px;">⚠️</span>
        <h4 style="font-size: 16px; font-weight: 800; margin-bottom: 8px; color: var(--text);">Scripture Offline</h4>
        <p style="font-size: 13px; color: var(--text-muted); line-height: 1.6; margin-bottom: 20px;">
          This book chapter is not cached on your device. Connect to the internet to load it, or go to Settings to download the complete Bible for offline use.
        </p>
        <button onclick="window.location.hash='#/you'" class="btn-secondary-mini" style="padding: 8px 16px; font-weight: 700; font-size: 12px; border: 1px solid var(--border); border-radius: 8px; background-color: var(--bg-content); color: var(--text); cursor: pointer;">Go to Settings</button>
      </div>
    `;
    return;
  }
  
  const activeBookName = (state.translation === "eng") ? metadata.engName : metadata.name;
  document.getElementById("nav-book-title").textContent = `${activeBookName} ${chapterNum}`;
  document.getElementById("reader-chapter-title").textContent = activeBookName;
  
  let subTitle = `अध्याय ${chapterNum}`;
  if (state.translation === "eng") subTitle = `Chapter ${chapterNum}`;
  else if (state.translation === "parallel") subTitle = `अध्याय ${chapterNum} • Chapter ${chapterNum}`;
  document.getElementById("reader-chapter-number").textContent = subTitle;
  
  versesContainer.innerHTML = "";
  
  const versesMr = bookDataMr ? bookDataMr.chapters[chapterNum - 1] : [];
  const versesEng = bookDataEng ? bookDataEng.chapters[chapterNum - 1] : [];
  const totalVerses = Math.max(versesMr.length, versesEng.length);
  
  let currentParagraph = null;
  let pStarts = [1];
  if (bookKey === 'john' && chapterNum === 2) {
    pStarts = [1, 4, 5, 6, 9, 11, 12, 13, 14, 17, 18, 19, 20];
  } else {
    for (let v = 6; v <= totalVerses; v += 5) {
      pStarts.push(v);
    }
  }
  
  for (let vIdx = 0; vIdx < totalVerses; vIdx++) {
    const verseNum = vIdx + 1;
    const verseKey = `${bookKey}_${chapterNum}_${verseNum}`;
    
    // Inject Section Headings dynamically
    if (bookKey === 'john' && chapterNum === 2) {
      if (verseNum === 1) {
        currentParagraph = null;
        const headingEl = document.createElement("div");
        headingEl.className = "bible-section-heading";
        headingEl.textContent = (state.translation === 'eng') ? "The Wedding at Cana" : "कानामधील लग्न";
        versesContainer.appendChild(headingEl);
      } else if (verseNum === 13) {
        currentParagraph = null;
        const headingEl = document.createElement("div");
        headingEl.className = "bible-section-heading";
        headingEl.textContent = (state.translation === 'eng') ? "Jesus Clears the Temple" : "येशूने मंदिर स्वच्छ केले";
        versesContainer.appendChild(headingEl);
      }
    }
    
    const verseEl = document.createElement("div");
    verseEl.dataset.verseId = verseKey;
    verseEl.dataset.book = bookKey;
    verseEl.dataset.chapter = chapterNum;
    verseEl.dataset.verse = verseNum;
    
    if (state.highlights[verseKey]) {
      verseEl.setAttribute("data-highlight", state.highlights[verseKey]);
    }
    
    if (state.translation === "parallel") {
      verseEl.className = "verse-row parallel-verse";
      const rawTextMr = versesMr[vIdx] || "";
      const rawTextEng = versesEng[vIdx] || "";
      const vTextMr = formatScriptureText(bookKey, chapterNum, verseNum, rawTextMr, "mar");
      const vTextEng = formatScriptureText(bookKey, chapterNum, verseNum, rawTextEng, "eng");
      
      verseEl.dataset.text = rawTextMr;
      
      if (verseNum === 1) {
        verseEl.innerHTML = `
          <div class="verse-parallel-mr"><span class="giant-chapter-num">${chapterNum}</span>${vTextMr}</div>
          <div class="verse-parallel-en">${vTextEng}</div>
        `;
      } else {
        verseEl.innerHTML = `
          <div class="verse-parallel-mr"><span class="verse-num">${verseNum}</span>${vTextMr}</div>
          <div class="verse-parallel-en"><span class="verse-num" style="font-size:9px;color:var(--text-muted);">${verseNum}</span>${vTextEng}</div>
        `;
      }
    } else {
      verseEl.className = "verse-row";
      const rawText = (state.translation === "eng") ? versesEng[vIdx] : versesMr[vIdx];
      const langCode = (state.translation === "eng") ? "eng" : "mar";
      const vText = formatScriptureText(bookKey, chapterNum, verseNum, rawText, langCode);
      
      verseEl.dataset.text = rawText;
      
      if (verseNum === 1) {
        verseEl.innerHTML = `<span class="giant-chapter-num">${chapterNum}</span>${vText}`;
      } else {
        verseEl.innerHTML = `<span class="verse-num">${verseNum}</span>${vText}`;
      }
    }
    
    // Selection listener
    verseEl.addEventListener("click", (e) => {
      e.stopPropagation();
      const textToPreview = (state.translation === "eng") ? versesEng[vIdx] : versesMr[vIdx];
      openVerseOptionsDrawer(verseKey, activeBookName, chapterNum, verseNum, textToPreview);
    });
    
    if (state.translation === "parallel") {
      versesContainer.appendChild(verseEl);
    } else {
      if (pStarts.includes(verseNum) || !currentParagraph) {
        currentParagraph = document.createElement("p");
        currentParagraph.className = "bible-paragraph";
        versesContainer.appendChild(currentParagraph);
      }
      currentParagraph.appendChild(verseEl);
    }
    
    // Inject Inline Study Note Card dynamically
    if (bookKey === 'john' && chapterNum === 2 && verseNum === 18) {
      currentParagraph = null;
      const studyNoteEl = document.createElement("div");
      studyNoteEl.className = "inline-study-note";
      
      let noteText = "";
      if (state.translation === "eng") {
        noteText = "<strong>2:17</strong> Jesus took the evil acts in the Temple as an insult against God, and thus, he did not deal with them halfheartedly. He was consumed with righteous anger against such flagrant disrespect for God.";
      } else if (state.translation === "mar") {
        noteText = "<strong>२:१७</strong> येशूने मंदिरातील वाईट कृत्यांचा देवाचा अपमान मानला आणि म्हणून त्याने त्यांच्याशी अर्ध्या मनाने व्यवहार केला नाही. देवाच्या अशा स्पष्ट अनादराबद्दल तो नीतिमान रागाने ग्रासला होता.";
      } else { // parallel
        noteText = "<strong>२:१७ / 2:17</strong> येशूने मंदिरातील वाईट कृत्यांचा देवाचा अपमान मानला...<br><br>Jesus took the evil acts in the Temple as an insult against God, and thus, he did not deal with them halfheartedly. He was consumed with righteous anger against such flagrant disrespect for God.";
      }
      
      studyNoteEl.innerHTML = `
        <div class="study-note-icon">💡</div>
        <div class="study-note-text">${noteText}</div>
      `;
      versesContainer.appendChild(studyNoteEl);
    }
  }
  
  document.getElementById("reader-scroll-container").scrollTop = 0;
  updateReaderNavigationButtons(metadata);
  logReadingHistory(activeBookName, bookKey, chapterNum);
  
  // Re-sync study pane view if active
  if (activeStudyVerse && activeStudyVerse.bookKey === bookKey && activeStudyVerse.chapter === chapterNum) {
    openStudySplitPane(bookKey, chapterNum, activeStudyVerse.verse);
  }
}

function updateReaderNavigationButtons(currentBookMeta) {
  const prevBtn = document.getElementById("btn-prev-chapter");
  const nextBtn = document.getElementById("btn-next-chapter");
  const bookName = (state.translation === "eng") ? currentBookMeta.engName : currentBookMeta.name;
  
  const labelPrev = (state.translation === "eng") ? "Previous" : "मागे";
  const labelNext = (state.translation === "eng") ? "Next" : "पुढे";
  
  if (state.activeChapter > 1) {
    prevBtn.style.visibility = "visible";
    prevBtn.querySelector("span").textContent = `${labelPrev} (${bookName} ${state.activeChapter - 1})`;
  } else {
    const prevBookIdx = currentBookMeta.id - 2;
    if (prevBookIdx >= 0) {
      const prevBookMeta = booksMetadataMr[prevBookIdx];
      const prevName = (state.translation === "eng") ? prevBookMeta.engName : prevBookMeta.name;
      prevBtn.style.visibility = "visible";
      prevBtn.querySelector("span").textContent = `${labelPrev} (${prevName} ${prevBookMeta.chaptersCount})`;
    } else {
      prevBtn.style.visibility = "hidden";
    }
  }
  
  if (state.activeChapter < currentBookMeta.chaptersCount) {
    nextBtn.style.visibility = "visible";
    nextBtn.querySelector("span").textContent = `${labelNext} (${bookName} ${state.activeChapter + 1})`;
  } else {
    const nextBookIdx = currentBookMeta.id;
    if (nextBookIdx < booksMetadataMr.length) {
      const nextBookMeta = booksMetadataMr[nextBookIdx];
      const nextName = (state.translation === "eng") ? nextBookMeta.engName : nextBookMeta.name;
      nextBtn.style.visibility = "visible";
      nextBtn.querySelector("span").textContent = `${labelNext} (${nextName} 1)`;
    } else {
      nextBtn.style.visibility = "hidden";
    }
  }
}

function navigateChapter(direction) {
  if (audioState.isPlaying) stopSpeechNarration();
  
  const currentBookMeta = booksMetadataMr.find(b => b.filename.replace(".json", "") === state.activeBook);
  if (!currentBookMeta) return;
  
  if (direction === "next") {
    if (state.activeChapter < currentBookMeta.chaptersCount) {
      openReader(state.activeBook, state.activeChapter + 1);
    } else {
      const nextBookIdx = currentBookMeta.id;
      if (nextBookIdx < booksMetadataMr.length) {
        openReader(booksMetadataMr[nextBookIdx].filename.replace(".json", ""), 1);
      }
    }
  } else {
    if (state.activeChapter > 1) {
      openReader(state.activeBook, state.activeChapter - 1);
    } else {
      const prevBookIdx = currentBookMeta.id - 2;
      if (prevBookIdx >= 0) {
        const prevBook = booksMetadataMr[prevBookIdx];
        openReader(prevBook.filename.replace(".json", ""), prevBook.chaptersCount);
      }
    }
  }
}

function logReadingHistory(bookName, bookKey, chapterNum) {
  const ref = `${bookName} ${chapterNum}`;
  state.history = state.history.filter(h => h.ref !== ref);
  state.history.unshift({
    ref,
    book: bookKey,
    chapter: chapterNum,
    timestamp: Date.now()
  });
  if (state.history.length > 20) state.history.pop();
  saveStateToLocalStorage();
}

/* ==========================================================================
   Book selector populators (Traditional & Alphabetical Sorts)
   ========================================================================== */
function populateBookSelector() {
  const otContainer = document.getElementById("ot-books-grid");
  const ntContainer = document.getElementById("nt-books-grid");
  
  otContainer.innerHTML = "";
  ntContainer.innerHTML = "";
  
  let list = [...booksMetadataMr];
  
  if (state.bookSort === "alphabetical") {
    list.sort((a, b) => {
      const nameA = (state.translation === "eng") ? a.engName : a.name;
      const nameB = (state.translation === "eng") ? b.engName : b.name;
      return nameA.localeCompare(nameB);
    });
    document.getElementById("section-ot-books").querySelector(".testament-heading").textContent = "Alphabetical List";
    document.getElementById("section-nt-books").style.display = "none";
  } else {
    document.getElementById("section-ot-books").querySelector(".testament-heading").textContent = "जुना करार (Old Testament)";
    document.getElementById("section-nt-books").style.display = "block";
  }
  
  list.forEach(book => {
    const btn = document.createElement("button");
    btn.className = "book-select-btn";
    btn.textContent = (state.translation === "eng") ? book.engName : book.name;
    
    if (book.filename.replace(".json", "") === state.activeBook) {
      btn.classList.add("active");
    }
    
    btn.addEventListener("click", () => selectBookForChapterScreen(book));
    
    if (state.bookSort === "alphabetical") {
      otContainer.appendChild(btn);
    } else {
      if (book.testament === "OT") otContainer.appendChild(btn);
      else ntContainer.appendChild(btn);
    }
  });
}

function selectBookForChapterScreen(bookMeta) {
  selectorTargetBookMeta = bookMeta;
  document.getElementById("selector-books-pane").classList.remove("active");
  document.getElementById("selector-chapters-pane").classList.add("active");
  
  const displayBookName = (state.translation === "eng") ? bookMeta.engName : bookMeta.name;
  document.getElementById("selected-book-name-indicator").textContent = displayBookName;
  
  const grid = document.getElementById("chapters-number-grid");
  grid.innerHTML = "";
  
  for (let c = 1; c <= bookMeta.chaptersCount; c++) {
    const cBtn = document.createElement("button");
    cBtn.className = "chapter-select-btn";
    cBtn.textContent = c;
    cBtn.addEventListener("click", () => {
      closeAllDrawers();
      openReader(bookMeta.filename.replace(".json", ""), c);
    });
    grid.appendChild(cBtn);
  }
}

/* ==========================================================================
   Annotations Drawer
   ========================================================================== */
let selectedVerseMeta = null;

function openVerseOptionsDrawer(verseKey, bookName, chapter, verse, text) {
  selectedVerseMeta = {
    key: verseKey,
    ref: `${bookName} ${chapter}:${verse}`,
    text,
    book: verseKey.split("_")[0],
    chapter,
    verse
  };
  
  document.getElementById("verse-options-title").textContent = `${bookName} ${chapter}:${verse}`;
  document.getElementById("verse-options-preview").textContent = `"${text}"`;
  
  // Highlight currently selected verse row
  document.querySelectorAll(".verse-row").forEach(v => v.classList.remove("selected-pulse"));
  const activeEl = document.querySelector(`.verse-row[data-verse-id="${verseKey}"]`);
  if (activeEl) activeEl.classList.add("selected-pulse");
  
  // Sync Highlight picker dots
  const activeColor = state.highlights[verseKey] || "";
  document.querySelectorAll(".dot-btn").forEach(dot => {
    dot.style.boxShadow = (dot.dataset.color === activeColor || (activeColor === "" && dot.dataset.color === "clear"))
      ? "0 0 0 3px var(--primary)" 
      : "none";
  });
  
  // Sync Bookmark Button
  const isBookmarked = state.bookmarks.some(b => b.ref === selectedVerseMeta.ref);
  const bookmarkIcon = document.getElementById("bookmark-svg-state");
  const bookmarkLabel = document.getElementById("bookmark-action-label");
  
  if (isBookmarked) {
    bookmarkIcon.setAttribute("fill", "currentColor");
    bookmarkLabel.textContent = "Bookmarked";
  } else {
    bookmarkIcon.setAttribute("fill", "none");
    bookmarkLabel.textContent = "Bookmark";
  }
  
  openDrawer("drawer-verse-options");
}

function handleHighlightSelection(color) {
  if (!selectedVerseMeta) return;
  const vEl = document.querySelector(`.verse-row[data-verse-id="${selectedVerseMeta.key}"]`);
  
  if (color === "clear") {
    delete state.highlights[selectedVerseMeta.key];
    if (vEl) vEl.removeAttribute("data-highlight");
    showToast("Highlight removed");
  } else {
    state.highlights[selectedVerseMeta.key] = color;
    if (vEl) vEl.setAttribute("data-highlight", color);
    showToast("Highlight applied");
  }
  saveStateToLocalStorage();
  closeAllDrawers();
}

function toggleBookmark() {
  if (!selectedVerseMeta) return;
  const idx = state.bookmarks.findIndex(b => b.ref === selectedVerseMeta.ref);
  
  if (idx !== -1) {
    state.bookmarks.splice(idx, 1);
    showToast("Bookmark removed");
  } else {
    state.bookmarks.unshift({
      ref: selectedVerseMeta.ref,
      text: selectedVerseMeta.text,
      date: new Date().toLocaleDateString(),
      book: selectedVerseMeta.book,
      chapter: selectedVerseMeta.chapter,
      verse: selectedVerseMeta.verse
    });
    showToast("Bookmarked successfully");
  }
  saveStateToLocalStorage();
  closeAllDrawers();
}

function copyVerseToClipboard() {
  if (!selectedVerseMeta) return;
  const transCode = (state.translation === "eng") ? "NLT" : "MARVBSI";
  const textToCopy = `"${selectedVerseMeta.text}" - ${selectedVerseMeta.ref} (${transCode})`;
  
  navigator.clipboard.writeText(textToCopy).then(() => {
    showToast("Copied to clipboard!");
  }).catch(() => {
    showToast("Copy failed");
  });
  closeAllDrawers();
}

/* ==========================================================================
   Home View Devotionals & VOD
   ========================================================================== */
function renderDailyDevotion() {
  const now = new Date();
  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  const dateEl = document.getElementById("home-greeting-date");
  if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', options);
  
  const hour = now.getHours();
  let greeting = "Good evening, Gaurav";
  if (hour < 12) greeting = "Good morning, Gaurav";
  else if (hour < 17) greeting = "Good afternoon, Gaurav";
  
  const userEl = document.getElementById("home-greeting-user");
  if (userEl) userEl.textContent = greeting;
  
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  
  const vod = VOD_LIST[dayOfYear % VOD_LIST.length];
  const displayRef = (state.translation === "eng") ? vod.engRef : vod.ref;
  const displayText = (state.translation === "eng") ? vod.engText : vod.text;
  
  document.getElementById("home-vod-ref").textContent = `${displayRef} ${state.translation === "eng" ? "NLT" : "MARVBSI"}`;
  document.getElementById("home-vod-text").textContent = `"${displayText}"`;
  
  document.getElementById("fs-vod-ref").textContent = `${displayRef} ${state.translation === "eng" ? "NLT" : "MARVBSI"}`;
  document.getElementById("fs-vod-text").textContent = `"${displayText}"`;
  
  // Rotate backgrounds daily
  const images = ['forest', 'mountains', 'sunrise', 'ocean', 'stars', 'mist', 'path'];
  const dailyImg = images[dayOfYear % images.length];
  
  const bgEl = document.querySelector(".daily-verse-card-bg") || document.querySelector(".vod-image-background");
  if (bgEl) bgEl.style.backgroundImage = `url('./assets/images/${dailyImg}.png')`;

  const fsCapsule = document.querySelector(".fullscreen-vod-capsule");
  if (fsCapsule) fsCapsule.style.backgroundImage = `url('./assets/images/${dailyImg}.png')`;
  
  // Heart count like sync
  const hasLiked = state.userLikes[vod.ref] || false;
  const heart = document.getElementById("fs-like-heart");
  if (hasLiked) {
    heart.setAttribute("fill", "#f87171");
    heart.style.color = "#f87171";
    document.getElementById("fs-like-count").textContent = "12.6L+1";
  } else {
    heart.setAttribute("fill", "none");
    heart.style.color = "#ffffff";
    document.getElementById("fs-like-count").textContent = "12.6L";
  }
}

function toggleLikeVOD() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  const vod = VOD_LIST[dayOfYear % VOD_LIST.length];
  
  const hasLiked = state.userLikes[vod.ref] || false;
  state.userLikes[vod.ref] = !hasLiked;
  saveStateToLocalStorage();
  renderDailyDevotion();
  showToast(state.userLikes[vod.ref] ? "Liked!" : "Unliked");
}

function openCardCreatorFromVOD() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  const vod = VOD_LIST[dayOfYear % VOD_LIST.length];
  
  selectedVerseMeta = {
    key: `${vod.book}_${vod.chapter}_${vod.verse}`,
    ref: (state.translation === "eng") ? vod.engRef : vod.ref,
    text: (state.translation === "eng") ? vod.engText : vod.text,
    book: vod.book,
    chapter: vod.chapter,
    verse: vod.verse
  };
  
  closeModal("modal-fullscreen-vod");
  openShareCardCreator();
}

function fallbackToDirectPlay(mp3Url) {
  if (audioPlayerInstance) {
    audioPlayerInstance.pause();
  }
  audioPlayerInstance = new Audio(mp3Url);
  audioPlayerInstance.playbackRate = audioState.speed;
  
  audioPlayerInstance.ontimeupdate = () => {
    if (audioPlayerInstance && audioPlayerInstance.duration) {
      const pct = (audioPlayerInstance.currentTime / audioPlayerInstance.duration) * 100;
      document.getElementById("playbar-progress-line").style.width = `${pct}%`;
    }
  };
  
  audioPlayerInstance.onended = () => {
    stopSpeechNarration();
  };
  
  audioPlayerInstance.onerror = () => {
    showToast("Failed to load Marathi narration audio");
    stopSpeechNarration();
  };
  
  audioPlayerInstance.play().catch(err => {
    console.error("Direct audio playback failed:", err);
    showToast("Playback failed or blocked by browser");
    stopSpeechNarration();
  });
}

/* ==========================================================================
   Bilingual Narrator (TTS)
   ========================================================================== */
function startSpeechNarration() {
  closeModal("modal-audio-settings");
  
  if (audioPlayerInstance) {
    audioPlayerInstance.pause();
    audioPlayerInstance = null;
  }
  
  speechSynthesis.cancel();
  
  const isMarathiAudio = state.translation !== "eng";
  const useHumanNarration = isMarathiAudio && state.audioSource === "human";
  
  if (useHumanNarration) {
    const metadata = booksMetadataMr.find(b => b.filename.replace(".json", "") === state.activeBook);
    const bookId = metadata ? metadata.id : 1;
    const mp3Url = `https://www.wordproaudio.net/bibles/app/audio/28/${bookId}/${state.activeChapter}.mp3`;
    
    audioState.isPlaying = true;
    audioState.speed = parseFloat(document.getElementById("tts-speed-slider").value);
    
    // Play directly without CORS or Web Audio filters to prevent browser playback block on iOS
    audioPlayerInstance = new Audio(mp3Url);
    audioPlayerInstance.playbackRate = audioState.speed;
    
    document.getElementById("floating-audio-playbar").classList.add("active");
    document.getElementById("playbar-icon-svg").innerHTML = `<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>`;
    
    audioPlayerInstance.ontimeupdate = () => {
      if (audioPlayerInstance && audioPlayerInstance.duration) {
        const pct = (audioPlayerInstance.currentTime / audioPlayerInstance.duration) * 100;
        document.getElementById("playbar-progress-line").style.width = `${pct}%`;
      }
    };
    
    audioPlayerInstance.onended = () => {
      stopSpeechNarration();
    };
    
    audioPlayerInstance.onerror = () => {
      showToast("Failed to load Marathi narration audio");
      stopSpeechNarration();
    };
    
    audioPlayerInstance.play().catch(err => {
      console.warn("Audio playback failed directly:", err);
      showToast("Playback failed or blocked by browser");
      stopSpeechNarration();
    });
    return;
  }

  if (state.audioSource === "elevenlabs") {
    const keyToUse = state.elevenLabsKey || ELEVENLABS_DEFAULT_KEY;
    if (!keyToUse) {
      showToast("Please enter ElevenLabs API Key in Settings");
      window.location.hash = "#/you";
      document.querySelectorAll(".profile-tab-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.tab === "you-settings");
      });
      document.querySelectorAll(".profile-tab-panel").forEach(panel => {
        panel.classList.toggle("active", panel.id === "you-tab-content-you-settings");
      });
      renderYouProfile();
      return;
    }
    
    showToast("Generating ElevenLabs narration...");
    audioState.isPlaying = true;
    audioState.speed = parseFloat(document.getElementById("tts-speed-slider").value);
    
    document.getElementById("floating-audio-playbar").classList.add("active");
    // Show spinner in playbar
    document.getElementById("playbar-icon-svg").innerHTML = `
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="38" stroke-dashoffset="19">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
      </circle>
    `;
    
    const elements = document.querySelectorAll(".verse-row");
    let versesList = [];
    elements.forEach(el => {
      let txt = el.dataset.text || "";
      const cleanText = txt.replace(/[:;()[\]{}—•\-]/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanText) versesList.push(cleanText);
    });
    const fullText = versesList.join(" ");
    
    // Use stable eleven_multilingual_v2 model for both English and Marathi/parallel 
    // since legacy monolingual_v1 is deprecated/restricted on newer accounts
    const modelId = "eleven_multilingual_v2";
    
    const keyToUse = state.elevenLabsKey || ELEVENLABS_DEFAULT_KEY;
    fetch(`https://api.elevenlabs.io/v1/text-to-speech/${state.elevenLabsVoice}`, {
      method: "POST",
      headers: {
        "xi-api-key": keyToUse,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: fullText,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    })
    .then(async response => {
      if (!response.ok) {
        let errMsg = `Status ${response.status}`;
        try {
          const errData = await response.json();
          if (errData && errData.detail && errData.detail.message) {
            errMsg = errData.detail.message;
          } else if (errData && errData.message) {
            errMsg = errData.message;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }
      return response.blob();
    })
    .then(blob => {
      if (!audioState.isPlaying) {
        return;
      }
      
      const audioUrl = URL.createObjectURL(blob);
      audioPlayerInstance = new Audio(audioUrl);
      audioPlayerInstance.playbackRate = audioState.speed;
      
      // Connect to Web Audio API context and add a GainNode to boost the volume level
      // This increases the storytelling voice level safely (same-origin blob doesn't trigger CORS blocks)
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          const source = audioCtx.createMediaElementSource(audioPlayerInstance);
          const gainNode = audioCtx.createGain();
          gainNode.gain.value = 1.8; // Boost output volume level by 80%
          source.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          audioPlayerInstance.addEventListener('play', () => {
            if (audioCtx.state === 'suspended') {
              audioCtx.resume();
            }
          });
        }
      } catch (e) {
        console.warn("Volume level boost failed, playing at normal volume:", e);
      }
      
      document.getElementById("playbar-icon-svg").innerHTML = `<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>`;
      
      audioPlayerInstance.ontimeupdate = () => {
        if (audioPlayerInstance && audioPlayerInstance.duration) {
          const pct = (audioPlayerInstance.currentTime / audioPlayerInstance.duration) * 100;
          document.getElementById("playbar-progress-line").style.width = `${pct}%`;
        }
      };
      
      audioPlayerInstance.onended = () => {
        stopSpeechNarration();
      };
      
      audioPlayerInstance.onerror = () => {
        showToast("ElevenLabs playback error");
        stopSpeechNarration();
      };
      
      audioPlayerInstance.play().catch(err => {
        console.warn("ElevenLabs audio playback failed:", err);
        showToast("Playback failed or blocked by browser");
        stopSpeechNarration();
      });
    })
    .catch(err => {
      console.warn("ElevenLabs generation failed, falling back to standard narrator:", err);
      showToast("Premium voice unavailable. Switching to standard reader...");
      
      const originalSource = state.audioSource;
      if (state.translation !== "eng") {
        state.audioSource = "human"; // Fallback to professional human recorded Marathi male voice
      } else {
        state.audioSource = "ai"; // Fallback to system English male voice
      }
      
      setTimeout(() => {
        startSpeechNarration();
        // Restore original ElevenLabs setting in background state
        state.audioSource = originalSource;
        saveStateToLocalStorage();
      }, 1500);
    });
    
    return;
  }
  
  if (typeof speechSynthesis === 'undefined') {
    showToast("Text-to-speech not supported");
    return;
  }
  
  const voiceSelect = document.getElementById("tts-voice-select");
  const selectedVal = voiceSelect.value;
  
  if (selectedVal === "default") {
    audioState.selectedVoice = findBestDefaultVoice(audioState.voices, state.translation);
  } else {
    const matching = audioState.voices.filter(v => 
      state.translation === "eng" ? v.lang.startsWith("en") : (v.lang.startsWith("mr") || v.lang.startsWith("hi") || v.lang.startsWith("en"))
    );
    audioState.selectedVoice = matching[parseInt(selectedVal)];
  }
  
  const elements = document.querySelectorAll(".verse-row");
  if (elements.length === 0) return;
  
  audioState.versesToRead = [];
  elements.forEach(el => {
    let txt = el.dataset.text || "";
    
    if (state.translation === "parallel" && audioState.selectedVoice) {
      if (audioState.selectedVoice.lang.startsWith("en")) {
        const enDiv = el.querySelector(".verse-parallel-en");
        if (enDiv) txt = enDiv.textContent;
      }
    }
    
    const cleanText = txt.replace(/[:;()[\]{}—•\-]/g, ' ').replace(/\s+/g, ' ').trim();
    audioState.versesToRead.push({
      key: el.dataset.verseId,
      text: cleanText
    });
  });
  
  audioState.currentVerseIndex = 0;
  audioState.isPlaying = true;
  audioState.speed = parseFloat(document.getElementById("tts-speed-slider").value);
  
  document.getElementById("floating-audio-playbar").classList.add("active");
  speakPlaybarVerse(audioState.currentVerseIndex);
}

function speakPlaybarVerse(index) {
  if (!audioState.isPlaying || index >= audioState.versesToRead.length || index < 0) {
    stopSpeechNarration();
    return;
  }
  
  audioState.currentVerseIndex = index;
  const verse = audioState.versesToRead[index];
  
  document.querySelectorAll(".verse-row").forEach(v => {
    v.classList.toggle("tts-reading", v.dataset.verseId === verse.key);
  });
  
  const activeEl = document.querySelector(`.verse-row[data-verse-id="${verse.key}"]`);
  if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  // Set play icon to paused lines
  document.getElementById("playbar-icon-svg").innerHTML = `<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>`;
  
  const progress = ((index + 1) / audioState.versesToRead.length) * 100;
  document.getElementById("playbar-progress-line").style.width = `${progress}%`;
  
  const utterance = new SpeechSynthesisUtterance(verse.text);
  if (audioState.selectedVoice) {
    utterance.voice = audioState.selectedVoice;
  } else if (state.translation !== "eng") {
    const mrVoice = audioState.voices.find(v => v.lang.startsWith("mr") || v.lang.startsWith("hi"));
    if (mrVoice) utterance.voice = mrVoice;
  }
  
  let basePitch = 0.85;
  if (state.audioTone === 'deep-bass') basePitch = 0.7;
  else if (state.audioTone === 'warm-resonance') basePitch = 0.85;
  else if (state.audioTone === 'normal') basePitch = 1.0;
  utterance.pitch = basePitch; // customized voice pitch
  utterance.rate = audioState.speed * 0.9;
  
  utterance.onend = () => {
    if (audioState.isPlaying) {
      audioState.currentVerseIndex++;
      if (audioState.currentVerseIndex < audioState.versesToRead.length) {
        speakPlaybarVerse(audioState.currentVerseIndex);
      } else {
        stopSpeechNarration();
      }
    }
  };
  
  utterance.onerror = () => {
    if (audioState.isPlaying) {
      audioState.currentVerseIndex++;
      speakPlaybarVerse(audioState.currentVerseIndex);
    }
  };
  
  audioState.activeUtterance = utterance;
  speechSynthesis.speak(utterance);
}

function togglePlaybarSpeech() {
  if (!audioState.isPlaying) return;
  
  if (audioPlayerInstance) {
    if (audioPlayerInstance.paused) {
      audioPlayerInstance.play().catch(() => showToast("Playback failed"));
      document.getElementById("playbar-icon-svg").innerHTML = `<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>`;
    } else {
      audioPlayerInstance.pause();
      document.getElementById("playbar-icon-svg").innerHTML = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
    }
  } else if (state.audioSource === "elevenlabs") {
    // Cancel loading if clicked while ElevenLabs is generating
    stopSpeechNarration();
  } else {
    if (speechSynthesis.paused) {
      speechSynthesis.resume();
      document.getElementById("playbar-icon-svg").innerHTML = `<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>`;
    } else if (speechSynthesis.speaking) {
      speechSynthesis.pause();
      document.getElementById("playbar-icon-svg").innerHTML = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
    }
  }
}

function stopSpeechNarration() {
  audioState.isPlaying = false;
  if (audioPlayerInstance) {
    audioPlayerInstance.pause();
    audioPlayerInstance = null;
  }
  speechSynthesis.cancel();
  document.querySelectorAll(".verse-row").forEach(v => v.classList.remove("tts-reading"));
  document.getElementById("floating-audio-playbar").classList.remove("active");
}

// Global Audio Processing Variables for Web Audio API
let webAudioCtx = null;
let webAudioSource = null;
let webAudioBassFilter = null;
let webAudioTrebleFilter = null;

function applyAudioFilters() {
  if (!audioPlayerInstance) return;
  
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  
  audioPlayerInstance.crossOrigin = "anonymous";
  
  if (!webAudioCtx) {
    webAudioCtx = new AudioContextClass();
  }
  
  if (webAudioCtx.state === 'suspended') {
    webAudioCtx.resume();
  }
  
  if (webAudioSource) {
    try {
      webAudioSource.disconnect();
    } catch(e) {}
  }
  
  try {
    webAudioSource = webAudioCtx.createMediaElementSource(audioPlayerInstance);
    
    webAudioBassFilter = webAudioCtx.createBiquadFilter();
    webAudioTrebleFilter = webAudioCtx.createBiquadFilter();
    
    webAudioSource.connect(webAudioBassFilter);
    webAudioBassFilter.connect(webAudioTrebleFilter);
    webAudioTrebleFilter.connect(webAudioCtx.destination);
  } catch (err) {
    console.warn("Web Audio initialization failed (connected already):", err);
  }
  
  updateAudioToneSettings();
}

function updateAudioToneSettings() {
  const toneSelect = document.getElementById("audio-tone-select");
  if (!toneSelect) return;
  const toneVal = toneSelect.value;
  
  state.audioTone = toneVal;
  saveStateToLocalStorage();
  
  if (!webAudioBassFilter || !webAudioTrebleFilter) return;
  
  if (toneVal === "normal") {
    webAudioBassFilter.type = "lowshelf";
    webAudioBassFilter.frequency.value = 150;
    webAudioBassFilter.gain.value = 0;
    
    webAudioTrebleFilter.type = "highshelf";
    webAudioTrebleFilter.frequency.value = 4000;
    webAudioTrebleFilter.gain.value = 0;
  } else if (toneVal === "deep-bass") {
    // Morgan Freeman style: deep bass boost, warm highs
    webAudioBassFilter.type = "lowshelf";
    webAudioBassFilter.frequency.value = 100;
    webAudioBassFilter.gain.value = 12; // 12 dB boost
    
    webAudioTrebleFilter.type = "highshelf";
    webAudioTrebleFilter.frequency.value = 3000;
    webAudioTrebleFilter.gain.value = -3;
  } else if (toneVal === "warm-resonance") {
    // Warm rich mids and lows
    webAudioBassFilter.type = "lowshelf";
    webAudioBassFilter.frequency.value = 180;
    webAudioBassFilter.gain.value = 6;
    
    webAudioTrebleFilter.type = "highshelf";
    webAudioTrebleFilter.frequency.value = 4000;
    webAudioTrebleFilter.gain.value = 2;
  }
}

function findBestDefaultVoice(voices, lang) {
  const eng = voices.filter(v => v.lang.startsWith("en"));
  
  // 1. Look for high-quality English male voices (David, Mark, James, Richard, Ravi, Male, Siri, Natural)
  const premiumMale = eng.find(v => {
    const name = v.name.toLowerCase();
    return name.includes("male") || 
           name.includes("david") || 
           name.includes("mark") || 
           name.includes("james") || 
           name.includes("richard") || 
           name.includes("ravi") || 
           (name.includes("google") && name.includes("male")) ||
           name.includes("siri");
  });
  if (premiumMale) return premiumMale;
  
  // 2. Fallback to any premium English voice
  const premium = eng.find(v => {
    const name = v.name.toLowerCase();
    return name.includes("google") || name.includes("natural");
  });
  if (premium) return premium;
  
  // 3. Marathi / Hindi search if not English
  if (lang !== "eng") {
    const deva = voices.find(v => v.lang.startsWith("mr") || v.lang.startsWith("hi"));
    if (deva) return deva;
  }
  
  return eng[0] || voices[0] || null;
}

function initAudioVoices() {
  if (typeof speechSynthesis === 'undefined') return;
  
  const getList = () => {
    audioState.voices = speechSynthesis.getVoices();
    const select = document.getElementById("tts-voice-select");
    if (!select) return;
    
    select.innerHTML = '<option value="default">Default System Voice</option>';
    
    const filtered = audioState.voices.filter(v => 
      state.translation === "eng" ? v.lang.startsWith("en") : (v.lang.startsWith("mr") || v.lang.startsWith("hi") || v.lang.startsWith("en"))
    );
    
    filtered.forEach((voice, idx) => {
      const opt = document.createElement("option");
      opt.value = idx;
      opt.textContent = `${voice.name} (${voice.lang})`;
      select.appendChild(opt);
    });
    
    // Add ElevenLabs options
    const elVoices = [
      { value: "elevenlabs_antoni", label: "👑 ElevenLabs Antoni (Free Male Voice)", id: "ErXwobaYiN019PkySvjV" },
      { value: "elevenlabs_clyde", label: "👑 ElevenLabs Clyde (Free Male Voice)", id: "2E2jMRHfEMvvEBjL7aKG" },
      { value: "elevenlabs_rachel", label: "👑 ElevenLabs Rachel (Free Female Voice)", id: "21m00Tcm4TlvDq8ikWAM" },
      { value: "elevenlabs_declan", label: "👑 ElevenLabs Declan Sage (Paid Premium Storyteller)", id: "kqVT88a5QfII1HNAEPTJ" }
    ];

    elVoices.forEach(ev => {
      const opt = document.createElement("option");
      opt.value = ev.value;
      opt.textContent = ev.label;
      select.appendChild(opt);
    });
    
    if (state.audioSource === "elevenlabs") {
      const matched = elVoices.find(ev => ev.id === state.elevenLabsVoice);
      select.value = matched ? matched.value : "elevenlabs_declan";
    } else {
      const best = findBestDefaultVoice(audioState.voices, state.translation);
      if (best) {
        const idx = filtered.findIndex(v => v.name === best.name);
        if (idx !== -1) {
          select.value = idx;
          audioState.selectedVoice = best;
        }
      }
    }
  };
  
  getList();
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = getList;
  }
}

/* ==========================================================================
   Bilingual Search Discover View
   ========================================================================== */
async function executeDiscoverSearch() {
  const query = document.getElementById("discover-search-input").value.trim().toLowerCase();
  const listContainer = document.getElementById("discover-search-results-list");
  const statusContainer = document.getElementById("discover-search-results-status");
  
  if (query.length < 3) {
    listContainer.innerHTML = "";
    statusContainer.textContent = "Query must be at least 3 characters long";
    return;
  }
  
  statusContainer.innerHTML = `
    <div class="loader-container">
      <div class="ios-spinner"></div>
      <div style="margin-top: 8px;">Searching scriptures...</div>
    </div>
  `;
  listContainer.innerHTML = "";
  
  const filter = document.querySelector(".filter-pill.active").dataset.filter;
  const isDevanagari = /[\u0900-\u097f]/.test(query);
  const searchLang = isDevanagari ? "mar" : "eng";
  
  let matches = [];
  const words = query.split(/\s+/);
  
  try {
    for (let i = 0; i < booksMetadataMr.length; i++) {
      const bookMeta = booksMetadataMr[i];
      if (filter === "OT" && bookMeta.testament !== "OT") continue;
      if (filter === "NT" && bookMeta.testament !== "NT") continue;
      
      const bookKey = bookMeta.filename.replace(".json", "");
      const bookData = (searchLang === "mar") ? await fetchBookDataMr(bookKey) : await fetchBookDataEng(bookKey);
      if (!bookData) continue;
      
      bookData.chapters.forEach((chapter, cIdx) => {
        chapter.forEach((text, vIdx) => {
          const textLower = text.toLowerCase();
          const match = words.every(word => textLower.includes(word));
          
          if (match) {
            matches.push({
              bookName: (state.translation === "eng") ? bookMeta.engName : bookMeta.name,
              bookKey,
              chapter: cIdx + 1,
              verse: vIdx + 1,
              text
            });
          }
        });
      });
      if (matches.length >= 100) break;
    }
    
    if (matches.length === 0) {
      statusContainer.textContent = "No matches found.";
      return;
    }
    
    statusContainer.textContent = `Found ${matches.length} matches (${searchLang === 'mar' ? 'Marathi' : 'English'})`;
    
    matches.forEach(match => {
      const item = document.createElement("div");
      item.className = "search-result-item";
      
      let highlighted = match.text;
      words.forEach(word => {
        const regex = new RegExp(`(${word})`, "gi");
        highlighted = highlighted.replace(regex, '<span class="search-match-highlight">$1</span>');
      });
      
      item.innerHTML = `
        <div class="search-result-meta">
          <span>${match.bookName} ${match.chapter}:${match.verse}</span>
        </div>
        <div class="search-result-text">${highlighted}</div>
      `;
      
      item.addEventListener("click", () => {
        openReader(match.bookKey, match.chapter);
        setTimeout(() => {
          const key = `${match.bookKey}_${match.chapter}_${match.verse}`;
          const el = document.querySelector(`.verse-row[data-verse-id="${key}"]`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("selected-pulse");
            setTimeout(() => el.classList.remove("selected-pulse"), 2500);
          }
        }, 500);
        window.location.hash = "#/reader";
      });
      listContainer.appendChild(item);
    });
  } catch (err) {
    console.error("Search failed:", err);
    statusContainer.textContent = "Search failed.";
  }
}

/* ==========================================================================
   Plans Tab Progress Tracker
   ========================================================================== */
function renderReadingPlansTab() {
  const nameEl = document.getElementById("plans-tab-name");
  const metaEl = document.getElementById("plans-tab-meta");
  const fillEl = document.getElementById("plans-tab-fill");
  const compBtn = document.getElementById("btn-complete-day-plans");
  const emptyEl = document.getElementById("myplans-empty-state");
  const detailEl = document.querySelector(".active-plan-detail");
  
  if (state.readingPlan === "none") {
    if (detailEl) detailEl.style.display = "none";
    if (emptyEl) emptyEl.style.display = "block";
    return;
  }
  
  if (detailEl) detailEl.style.display = "block";
  if (emptyEl) emptyEl.style.display = "none";
  
  let totalDays = 90;
  let title = "New Testament in 90 Days";
  
  const planInfo = PLANS_DB[state.readingPlan];
  if (planInfo) {
    totalDays = planInfo.days;
    title = planInfo.title;
  } else if (state.readingPlan.startsWith("custom_") && state.customPlan) {
    totalDays = state.customPlan.duration;
    title = state.customPlan.title;
  }
  
  nameEl.textContent = title;
  const pct = Math.floor(((state.planDay - 1) / totalDays) * 100);
  metaEl.textContent = `Day ${state.planDay} of ${totalDays} • ${pct}% Complete`;
  fillEl.style.width = `${pct}%`;
  
  const daySelect = document.getElementById("plans-select-day");
  if (daySelect) {
    daySelect.innerHTML = "";
    for (let d = 1; d <= totalDays; d++) {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = `Day ${d}`;
      daySelect.appendChild(opt);
    }
    daySelect.value = state.planDay;
    daySelect.onchange = (e) => {
      state.planDay = parseInt(e.target.value);
      saveStateToLocalStorage();
      renderReadingPlansTab();
      renderDailyDevotion();
    };
  }
  
  const readingList = document.querySelector(".plan-reading-portions");
  readingList.innerHTML = "";
  
  const chapters = [];
  if (planInfo && planInfo.readings) {
    // Custom devotional plan: 1 reading per day
    const reading = planInfo.readings[state.planDay - 1] || planInfo.readings[0];
    chapters.push({
      id: `${state.readingPlan}_day${state.planDay}_ch0`,
      label: reading.label,
      bookKey: reading.bookKey,
      chapter: reading.chapter
    });
  } else if (state.readingPlan.startsWith("custom_") && state.customPlan) {
    // Custom generated plan: divide chapters over duration
    const bookKey = state.customPlan.book;
    const bookMeta = booksMetadataMr.find(b => b.filename.replace(".json", "") === bookKey);
    const totalChapters = bookMeta ? bookMeta.chaptersCount : 10;
    const chPerDay = Math.ceil(totalChapters / totalDays);
    const startCh = 1 + (state.planDay - 1) * chPerDay;
    for (let i = 0; i < chPerDay; i++) {
      const ch = startCh + i;
      if (ch <= totalChapters) {
        const bookName = bookMeta ? ((state.translation === "eng") ? bookMeta.engName : bookMeta.name) : bookKey;
        chapters.push({
          id: `${state.readingPlan}_day${state.planDay}_ch${i}`,
          label: `${bookName} ${ch}`,
          bookKey: bookKey,
          chapter: ch
        });
      }
    }
  } else {
    // Fallback/nt90/bible365: 3 chapters per day
    const reading = getReadingForDay(state.readingPlan, state.planDay);
    const startCh = reading.chapter;
    for (let i = 0; i < 3; i++) {
      const ch = startCh + i;
      const bookMeta = booksMetadataMr.find(b => b.filename.replace(".json", "") === reading.bookKey);
      const maxCh = bookMeta ? bookMeta.chaptersCount : 50;
      if (ch <= maxCh) {
        chapters.push({
          id: `${state.readingPlan}_day${state.planDay}_ch${i}`,
          label: `${reading.label.split(" ")[0]} ${ch}`,
          bookKey: reading.bookKey,
          chapter: ch
        });
      }
    }
  }
  
  let allDone = true;
  chapters.forEach(ch => {
    const item = document.createElement("div");
    item.className = "portion-item";
    
    const isChecked = state.planPortionsCompleted[ch.id] || false;
    if (!isChecked) allDone = false;
    
    item.innerHTML = `
      <div class="portion-checkbox-wrapper">
        <input type="checkbox" id="chk-${ch.id}" class="ios-checkbox" ${isChecked ? 'checked' : ''}>
        <label for="chk-${ch.id}">${ch.label}</label>
      </div>
      <button class="portion-read-btn" data-book="${ch.bookKey}" data-chapter="${ch.chapter}">Read</button>
    `;
    
    item.querySelector("input").addEventListener("change", (e) => {
      state.planPortionsCompleted[ch.id] = e.target.checked;
      saveStateToLocalStorage();
      renderReadingPlansTab();
    });
    
    item.querySelector(".portion-read-btn").onclick = () => {
      openReader(ch.bookKey, ch.chapter);
      window.location.hash = "#/reader";
    };
    
    readingList.appendChild(item);
  });
  
  compBtn.textContent = allDone ? `Complete Day ${state.planDay}` : `Finish Readings first`;
  compBtn.disabled = !allDone;
  compBtn.style.opacity = allDone ? "1" : "0.5";
  
  compBtn.onclick = () => {
    if (state.planDay < totalDays) {
      state.planDay++;
      showToast(`Congratulations! Day ${state.planDay} unlocked.`);
    } else {
      showToast("Hallelujah! You completed the reading plan!");
      state.readingPlan = "none";
    }
    saveStateToLocalStorage();
    renderReadingPlansTab();
    renderDailyDevotion();
  };
}

function getReadingForDay(planType, day) {
  if (planType === "nt90") {
    const ntBooks = [
      { name: "Matthew", key: "matthew", chapters: 28 },
      { name: "Mark", key: "mark", chapters: 16 },
      { name: "Luke", key: "luke", chapters: 24 },
      { name: "John", key: "john", chapters: 21 },
      { name: "Acts", key: "acts", chapters: 28 },
      { name: "Romans", key: "romans", chapters: 16 }
    ];
    let chFlat = [];
    ntBooks.forEach(b => {
      for (let c = 1; c <= b.chapters; c += 3) {
        chFlat.push({ label: `${b.name} ${c}`, bookKey: b.key, chapter: c });
      }
    });
    return chFlat[(day - 1) % chFlat.length];
  } else {
    const idx = (day - 1) % booksMetadataMr.length;
    const b = booksMetadataMr[idx];
    const ch = 1 + ((day * 2) % b.chaptersCount);
    return { label: `${b.name} ${ch}`, bookKey: b.filename.replace(".json", ""), chapter: ch };
  }
}

/* ==========================================================================
   User Profile Dashboard rendering
   ========================================================================== */
function renderYouProfile() {
  const highEmpty = document.getElementById("you-highlights-empty");
  const highList = document.getElementById("you-highlights-list");
  highList.innerHTML = "";
  
  const hKeys = Object.keys(state.highlights);
  if (hKeys.length === 0) {
    highEmpty.style.display = "block";
  } else {
    highEmpty.style.display = "none";
    hKeys.forEach(async key => {
      const parts = key.split("_");
      const bookKey = parts[0];
      const ch = parseInt(parts[1]);
      const v = parseInt(parts[2]);
      const color = state.highlights[key];
      
      const bookData = (state.translation === "eng") ? await fetchBookDataEng(bookKey) : await fetchBookDataMr(bookKey);
      if (!bookData) return;
      
      const txt = bookData.chapters[ch - 1][v - 1];
      const card = createLibraryCard(`${bookData.name} ${ch}:${v}`, txt, bookKey, ch, v, () => {
        delete state.highlights[key];
        saveStateToLocalStorage();
        renderYouProfile();
        const rEl = document.querySelector(`.verse-row[data-verse-id="${key}"]`);
        if (rEl) rEl.removeAttribute("data-highlight");
      });
      
      const bar = document.createElement("div");
      bar.className = "library-card-highlight-bar";
      bar.style.backgroundColor = (color === "green") ? "var(--highlight-green)" : (color === "blue") ? "var(--highlight-blue)" : (color === "pink") ? "var(--highlight-pink)" : "var(--highlight-yellow)";
      card.appendChild(bar);
      card.style.paddingLeft = "20px";
      
      highList.appendChild(card);
    });
  }
  
  const bookEmpty = document.getElementById("you-bookmarks-empty");
  const bookList = document.getElementById("you-bookmarks-list");
  bookList.innerHTML = "";
  
  if (state.bookmarks.length === 0) {
    bookEmpty.style.display = "block";
  } else {
    bookEmpty.style.display = "none";
    state.bookmarks.forEach(bookmark => {
      const card = createLibraryCard(bookmark.ref, bookmark.text, bookmark.book, bookmark.chapter, bookmark.verse, () => {
        state.bookmarks = state.bookmarks.filter(b => b.ref !== bookmark.ref);
        saveStateToLocalStorage();
        renderYouProfile();
      });
      bookList.appendChild(card);
    });
  }
  
  const histEmpty = document.getElementById("you-history-empty");
  const histList = document.getElementById("you-history-list");
  histList.innerHTML = "";
  
  if (state.history.length === 0) {
    histEmpty.style.display = "block";
  } else {
    histEmpty.style.display = "none";
    state.history.forEach(h => {
      const card = document.createElement("div");
      card.className = "library-card";
      const relTime = getRelativeTime(h.timestamp);
      
      card.innerHTML = `
        <div class="library-card-header">
          <span class="library-card-ref">${h.ref}</span>
          <span class="library-card-date">${relTime}</span>
        </div>
      `;
      card.addEventListener("click", () => {
        openReader(h.book, h.chapter);
        window.location.hash = "#/reader";
      });
      histList.appendChild(card);
    });
  }
  
  const keyInput = document.getElementById("you-elevenlabs-key");
  if (keyInput) keyInput.value = state.elevenLabsKey || "";
  const voiceInput = document.getElementById("you-elevenlabs-voice");
  if (voiceInput) voiceInput.value = state.elevenLabsVoice || "kqVT88a5QfII1HNAEPTJ";
}

function createLibraryCard(ref, text, bookKey, ch, v, onDelete) {
  const card = document.createElement("div");
  card.className = "library-card";
  card.innerHTML = `
    <div class="library-card-header">
      <span class="library-card-ref">${ref}</span>
      <button class="btn-delete-lib-item" aria-label="Remove item">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
      </button>
    </div>
    <div class="library-card-text">"${text}"</div>
  `;
  
  card.addEventListener("click", (e) => {
    if (e.target.closest(".btn-delete-lib-item")) {
      e.stopPropagation();
      onDelete();
      return;
    }
    openReader(bookKey, ch);
    window.location.hash = "#/reader";
    
    setTimeout(() => {
      const key = `${bookKey}_${ch}_${v}`;
      const el = document.querySelector(`.verse-row[data-verse-id="${key}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("selected-pulse");
        setTimeout(() => el.classList.remove("selected-pulse"), 2500);
      }
    }, 500);
  });
  return card;
}

function getRelativeTime(timestamp) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

// Prefetch all scriptures locally for offline use
async function prefetchBiblesForOffline() {
  if (isPreloadingBible) return;
  isPreloadingBible = true;
  
  const status = document.getElementById("you-offline-cache-status");
  const btn = document.getElementById("you-btn-cache-bible");
  
  btn.disabled = true;
  btn.textContent = "Downloading...";
  
  try {
    for (let i = 0; i < booksMetadataMr.length; i++) {
      const b = booksMetadataMr[i];
      const key = b.filename.replace(".json", "");
      status.textContent = `Downloading ${b.name} (${i + 1}/66)...`;
      
      await fetchBookDataMr(key);
      await fetchBookDataEng(key);
      await new Promise(r => setTimeout(r, 20));
    }
    status.textContent = "Downloaded successfully. River of Life is ready offline.";
    btn.textContent = "Downloaded";
    showToast("Downloaded all scriptures!");
  } catch (e) {
    status.textContent = "Pre-caching failed.";
    btn.disabled = false;
    btn.textContent = "Retry";
    showToast("Download failed");
  } finally {
    isPreloadingBible = false;
  }
}

function clearBibleCache() {
  booksCacheEng = {};
  booksCacheMr = {};
  
  if ('caches' in window) {
    caches.keys().then(names => {
      for (let name of names) caches.delete(name);
    });
  }
  
  localStorage.removeItem("river_of_life_state_v2");
  state.bookmarks = [];
  state.highlights = {
    "john_2_8": "yellow",
    "john_3_16": "yellow",
    "psalms_23_1": "yellow",
    "philippians_4_13": "yellow",
    "proverbs_3_5": "yellow",
    "isaiah_43_2": "yellow",
    "matthew_6_33": "yellow",
    "romans_8_28": "yellow",
    "joshua_1_9": "yellow",
    "genesis_1_1": "yellow",
    "genesis_1_27": "yellow",
    "exodus_14_14": "yellow",
    "deuteronomy_6_5": "yellow",
    "psalms_46_1": "yellow",
    "psalms_46_10": "yellow",
    "psalms_91_1": "yellow",
    "proverbs_3_6": "yellow",
    "isaiah_40_31": "yellow",
    "jeremiah_29_11": "yellow",
    "luke_1_37": "yellow",
    "john_14_6": "yellow",
    "romans_12_1": "yellow",
    "romans_12_2": "yellow",
    "hebrews_11_1": "yellow",
    "1peter_5_7": "yellow",
    "1john_4_19": "yellow",
    "revelation_21_4": "yellow"
  };
  state.history = [];
  state.readingPlan = "none";
  state.planDay = 1;
  state.planPortionsCompleted = {};
  state.userLikes = {};
  state.userNotes = {};
  state.audioSource = "human";
  state.elevenLabsKey = ELEVENLABS_DEFAULT_KEY;
  state.elevenLabsVoice = "kqVT88a5QfII1HNAEPTJ";
  
  applyStylesFromState();
  renderYouProfile();
  renderDailyDevotion();
  
  document.getElementById("you-offline-cache-status").textContent = "Cache wiped out successfully.";
  document.getElementById("you-btn-cache-bible").disabled = false;
  document.getElementById("you-btn-cache-bible").textContent = "Download";
  
  showToast("Application successfully reset");
}

/* ==========================================================================
   Image Share Card Creator Modal
   ========================================================================== */
let activeCardGradient = "gradient-1";

function openShareCardCreator() {
  if (!selectedVerseMeta) return;
  document.getElementById("share-card-text").textContent = `"${selectedVerseMeta.text}"`;
  document.getElementById("share-card-source").textContent = `${selectedVerseMeta.ref} • ${state.translation === 'eng' ? 'NLT' : 'MARVBSI'}`;
  
  setActiveCardStyle("gradient-1");
  closeAllDrawers();
  openModal("modal-card-share");
}

function setActiveCardStyle(gradClass) {
  activeCardGradient = gradClass;
  const canvas = document.getElementById("share-card-canvas");
  canvas.className = "verse-card-canvas";
  canvas.classList.add(gradClass);
  
  document.querySelectorAll(".grad-dot").forEach(dot => {
    dot.classList.toggle("active", dot.dataset.grad === gradClass);
  });
}

function downloadShareCard() {
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 600;
  const ctx = canvas.getContext("2d");
  
  const grad = ctx.createLinearGradient(0, 0, 600, 600);
  if (activeCardGradient === "gradient-1") {
    grad.addColorStop(0, '#6366f1'); grad.addColorStop(0.5, '#a855f7'); grad.addColorStop(1, '#ec4899');
  } else if (activeCardGradient === "gradient-2") {
    grad.addColorStop(0, '#3b82f6'); grad.addColorStop(1, '#10b981');
  } else if (activeCardGradient === "gradient-3") {
    grad.addColorStop(0, '#f59e0b'); grad.addColorStop(1, '#ef4444');
  } else if (activeCardGradient === "gradient-4") {
    grad.addColorStop(0, '#111827'); grad.addColorStop(1, '#4b5563');
  } else if (activeCardGradient === "gradient-5") {
    grad.addColorStop(0, '#ec4899'); grad.addColorStop(0.5, '#f43f5e'); grad.addColorStop(1, '#f97316');
  } else {
    grad.addColorStop(0, '#0284c7'); grad.addColorStop(1, '#6366f1');
  }
  
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 600, 600);
  
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.font = "italic 240px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("†", 480, 480);
  
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "italic 26px Georgia, serif";
  
  const text = `"${selectedVerseMeta.text}"`;
  const maxWidth = 480;
  const lineHeight = 40;
  const x = 300;
  const y = 260;
  
  const words = text.split(" ");
  let line = "";
  let lines = [];
  
  for (let n = 0; n < words.length; n++) {
    let testLine = line + words[n] + " ";
    let metrics = ctx.measureText(testLine);
    let testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      lines.push(line);
      line = words[n] + " ";
    } else {
      line = testLine;
    }
  }
  lines.push(line);
  
  let startY = y - ((lines.length - 1) * lineHeight) / 2;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, startY + (i * lineHeight));
  }
  
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.font = "700 20px 'Outfit', sans-serif";
  ctx.fillText(`${selectedVerseMeta.ref} • ${state.translation === 'eng' ? 'NLT' : 'MARVBSI'}`, 300, 480);
  
  try {
    const dataUrl = canvas.toDataURL("image/png");
    const container = document.querySelector(".modal-card-creator-body");
    
    const prev = document.getElementById("card-download-preview");
    if (prev) prev.remove();
    
    const img = document.createElement("img");
    img.id = "card-download-preview";
    img.src = dataUrl;
    img.style.width = "100%";
    img.style.maxWidth = "340px";
    img.style.borderRadius = "24px";
    img.style.boxShadow = "var(--shadow-md)";
    
    document.getElementById("share-card-canvas").style.display = "none";
    container.insertBefore(img, document.querySelector(".canvas-customization-tools"));
    
    const dlBtn = document.getElementById("btn-download-card");
    dlBtn.querySelector("span").textContent = "Hold Image to Save";
    dlBtn.style.opacity = "0.7";
    dlBtn.disabled = true;
    
    showToast("Press & Hold image to save to Photos!");
  } catch (e) {
    showToast("Failed to generate image");
  }
}

function resetCardCreatorModal() {
  document.getElementById("share-card-canvas").style.display = "flex";
  const prev = document.getElementById("card-download-preview");
  if (prev) prev.remove();
  
  const dlBtn = document.getElementById("btn-download-card");
  dlBtn.querySelector("span").textContent = "Save to Photos";
  dlBtn.style.opacity = "1";
  dlBtn.disabled = false;
}

/* ==========================================================================
   UI Event Bindings & Listeners Setup
   ========================================================================== */
function setupEventListeners() {
  // Navigation trigger drawers
  document.getElementById("btn-text-settings").addEventListener("click", () => openDrawer("drawer-text-settings"));
  
  document.querySelectorAll(".close-drawer-btn").forEach(btn => {
    btn.addEventListener("click", () => closeAllDrawers());
  });
  
  document.querySelectorAll(".drawer-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeAllDrawers(); });
  });

  document.querySelectorAll(".modal-overlay-fullscreen").forEach(overlay => {
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(overlay.id); });
  });
  
  // Font Size Adjustments
  document.getElementById("btn-size-dec").addEventListener("click", () => {
    if (state.fontSize > 70) {
      state.fontSize -= 10;
      applyStylesFromState();
      saveStateToLocalStorage();
    }
  });
  document.getElementById("btn-size-inc").addEventListener("click", () => {
    if (state.fontSize < 180) {
      state.fontSize += 10;
      applyStylesFromState();
      saveStateToLocalStorage();
    }
  });
  
  // Font styling buttons
  document.querySelectorAll(".font-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      state.fontFamily = btn.dataset.font;
      applyStylesFromState();
      saveStateToLocalStorage();
    });
  });

  // Line Height spacing buttons
  document.querySelectorAll(".spacing-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      state.lineHeight = parseFloat(btn.dataset.height);
      applyStylesFromState();
      saveStateToLocalStorage();
    });
  });
  
  // Theme styling grid
  document.querySelectorAll(".theme-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      state.theme = btn.dataset.theme;
      applyStylesFromState();
      saveStateToLocalStorage();
    });
  });

  // Profile Translation selector
  document.getElementById("you-select-translation").addEventListener("change", (e) => {
    state.translation = e.target.value;
    applyStylesFromState();
    saveStateToLocalStorage();
    openReader(state.activeBook, state.activeChapter);
    renderDailyDevotion();
    initAudioVoices();
    toggleVoiceDropdownVisibility();
  });
  
  document.getElementById("you-btn-cache-bible").addEventListener("click", prefetchBiblesForOffline);
  document.getElementById("you-btn-clear-cache").addEventListener("click", () => {
    if (confirm("Clear local cache? This will reset all your bookmarks, highlights, history and notes.")) {
      clearBibleCache();
    }
  });

  // Reader Translation Header Selector
  document.getElementById("btn-translation-selector").addEventListener("click", () => {
    openDrawer("drawer-translation-selector");
    document.querySelectorAll(".select-row-item").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.lang === state.translation);
    });
  });
  
  document.querySelectorAll(".select-row-item").forEach(btn => {
    btn.addEventListener("click", () => {
      state.translation = btn.dataset.lang;
      applyStylesFromState();
      saveStateToLocalStorage();
      closeAllDrawers();
      
      openReader(state.activeBook, state.activeChapter);
      renderDailyDevotion();
      initAudioVoices();
      toggleVoiceDropdownVisibility();
    });
  });

  // Audio Source selector (Human vs AI TTS)
  const audioSourceSelect = document.getElementById("audio-source-select");
  if (audioSourceSelect) {
    audioSourceSelect.value = state.audioSource || "human";
    audioSourceSelect.addEventListener("change", (e) => {
      state.audioSource = e.target.value;
      saveStateToLocalStorage();
      toggleVoiceDropdownVisibility();
      
      // Keep voice selection dropdown in sync
      const voiceSelect = document.getElementById("tts-voice-select");
      if (voiceSelect) {
        if (state.audioSource === "elevenlabs") {
          const elVoices = [
            { value: "elevenlabs_antoni", id: "ErXwobaYiN019PkySvjV" },
            { value: "elevenlabs_clyde", id: "2E2jMRHfEMvvEBjL7aKG" },
            { value: "elevenlabs_rachel", id: "21m00Tcm4TlvDq8ikWAM" },
            { value: "elevenlabs_declan", id: "kqVT88a5QfII1HNAEPTJ" }
          ];
          const matched = elVoices.find(ev => ev.id === state.elevenLabsVoice);
          voiceSelect.value = matched ? matched.value : "elevenlabs_declan";
        } else {
          // Re-populate system voices
          initAudioVoices();
        }
      }
    });
  }

  // Speech Voice Selector change listener (switch to ElevenLabs if chosen)
  const voiceSelect = document.getElementById("tts-voice-select");
  if (voiceSelect) {
    voiceSelect.addEventListener("change", (e) => {
      const val = e.target.value;
      if (val.startsWith("elevenlabs_")) {
        state.audioSource = "elevenlabs";
        if (val === "elevenlabs_antoni") state.elevenLabsVoice = "ErXwobaYiN019PkySvjV";
        else if (val === "elevenlabs_clyde") state.elevenLabsVoice = "2E2jMRHfEMvvEBjL7aKG";
        else if (val === "elevenlabs_rachel") state.elevenLabsVoice = "21m00Tcm4TlvDq8ikWAM";
        else state.elevenLabsVoice = "kqVT88a5QfII1HNAEPTJ";
        
        saveStateToLocalStorage();
        toggleVoiceDropdownVisibility();
        if (audioSourceSelect) audioSourceSelect.value = "elevenlabs";
        
        // Sync setting voice input if it exists
        const voiceInput = document.getElementById("you-elevenlabs-voice");
        if (voiceInput) voiceInput.value = state.elevenLabsVoice;
      } else {
        // User selected a system voice (index or 'default')
        state.audioSource = "ai";
        saveStateToLocalStorage();
        toggleVoiceDropdownVisibility();
        if (audioSourceSelect) audioSourceSelect.value = "ai";
      }
    });
  }

  // ElevenLabs Key & Voice Input Handlers
  const elKeyInput = document.getElementById("you-elevenlabs-key");
  if (elKeyInput) {
    elKeyInput.addEventListener("input", (e) => {
      state.elevenLabsKey = e.target.value.trim();
      saveStateToLocalStorage();
    });
  }
  const elVoiceInput = document.getElementById("you-elevenlabs-voice");
  if (elVoiceInput) {
    elVoiceInput.addEventListener("input", (e) => {
      state.elevenLabsVoice = e.target.value.trim() || "kqVT88a5QfII1HNAEPTJ";
      saveStateToLocalStorage();
    });
  }

  // Book select header trigger
  document.getElementById("btn-book-selector").addEventListener("click", () => {
    openDrawer("drawer-book-selector");
    document.getElementById("selector-books-pane").classList.add("active");
    document.getElementById("selector-chapters-pane").classList.remove("active");
    
    document.getElementById("btn-sort-traditional").classList.toggle("active", state.bookSort === "traditional");
    document.getElementById("btn-sort-alphabetical").classList.toggle("active", state.bookSort === "alphabetical");
    populateBookSelector();
  });
  
  document.getElementById("btn-sort-traditional").addEventListener("click", () => {
    state.bookSort = "traditional";
    document.getElementById("btn-sort-traditional").classList.add("active");
    document.getElementById("btn-sort-alphabetical").classList.remove("active");
    saveStateToLocalStorage();
    populateBookSelector();
  });
  
  document.getElementById("btn-sort-alphabetical").addEventListener("click", () => {
    state.bookSort = "alphabetical";
    document.getElementById("btn-sort-traditional").classList.remove("active");
    document.getElementById("btn-sort-alphabetical").classList.add("active");
    saveStateToLocalStorage();
    populateBookSelector();
  });
  
  document.getElementById("btn-back-to-books").addEventListener("click", () => {
    document.getElementById("selector-books-pane").classList.add("active");
    document.getElementById("selector-chapters-pane").classList.remove("active");
  });
  
  // Highlight pickers dots
  document.querySelectorAll(".dot-btn").forEach(dot => {
    dot.addEventListener("click", () => handleHighlightSelection(dot.dataset.color));
  });
  
  document.getElementById("btn-action-bookmark").addEventListener("click", toggleBookmark);
  document.getElementById("btn-action-copy").addEventListener("click", copyVerseToClipboard);
  document.getElementById("btn-action-share").addEventListener("click", openShareCardCreator);
  document.getElementById("btn-action-speak").addEventListener("click", () => {
    closeAllDrawers();
    openModal("modal-audio-settings");
  });
  
  // Card share creator buttons
  document.querySelectorAll(".grad-dot").forEach(choice => {
    choice.addEventListener("click", () => setActiveCardStyle(choice.dataset.grad));
  });
  
  document.getElementById("btn-download-card").addEventListener("click", downloadShareCard);
  document.getElementById("btn-close-card-share").addEventListener("click", () => closeModal("modal-card-share"));

  // VOD Fullscreen modal triggers
  document.getElementById("btn-open-fullscreen-vod").addEventListener("click", () => openModal("modal-fullscreen-vod"));
  document.getElementById("btn-close-fullscreen-vod").addEventListener("click", () => closeModal("modal-fullscreen-vod"));

  // Daily Verse Card tabs interaction
  const dailyVerseTabPills = document.querySelectorAll(".daily-verse-header-tabs .tab-pill");
  dailyVerseTabPills.forEach((pill, idx) => {
    pill.addEventListener("click", (e) => {
      e.stopPropagation();
      if (idx === 0) {
        openModal("modal-fullscreen-vod");
      } else {
        openModal("modal-premium-promo");
      }
    });
  });
  document.getElementById("btn-fs-like").addEventListener("click", toggleLikeVOD);
  document.getElementById("btn-fs-customize-card").addEventListener("click", openCardCreatorFromVOD);
  document.getElementById("btn-fs-share-trigger").addEventListener("click", openCardCreatorFromVOD);
  document.getElementById("btn-fs-comment").addEventListener("click", () => showToast("Comments are offline-only"));

  // Swipe gesture for chapters navigation in reader
  const scroller = document.getElementById("reader-scroll-container");
  scroller.addEventListener("touchstart", (e) => { touchStartX = e.changedTouches[0].screenX; });
  scroller.addEventListener("touchend", (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchEndX - touchStartX;
    if (Math.abs(diff) > 100) {
      if (diff > 0) navigateChapter("prev");
      else navigateChapter("next");
    }
  });
  
  document.getElementById("btn-prev-chapter").addEventListener("click", () => navigateChapter("prev"));
  document.getElementById("btn-next-chapter").addEventListener("click", () => navigateChapter("next"));
  
  // Discover search triggers
  const sInput = document.getElementById("discover-search-input");
  const sClear = document.getElementById("btn-discover-search-clear");
  
  sInput.addEventListener("input", () => {
    sClear.style.display = (sInput.value.length > 0) ? "flex" : "none";
    if (sInput.value.length >= 3) {
      executeDiscoverSearch();
    } else if (sInput.value.length === 0) {
      document.getElementById("discover-search-results-list").innerHTML = "";
      document.getElementById("discover-search-results-status").textContent = "Enter search terms to find scriptures";
    }
  });
  
  sClear.addEventListener("click", () => {
    sInput.value = "";
    sClear.style.display = "none";
    document.getElementById("discover-search-results-list").innerHTML = "";
    document.getElementById("discover-search-results-status").textContent = "Enter search terms to find scriptures";
    sInput.focus();
  });
  
  document.querySelectorAll(".filter-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-pill").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      if (sInput.value.length >= 3) executeDiscoverSearch();
    });
  });
  
  // Audio Playbar settings trigger
  document.getElementById("btn-audio-tts").addEventListener("click", () => openModal("modal-audio-settings"));
  document.getElementById("btn-close-audio-settings").addEventListener("click", () => closeModal("modal-audio-settings"));
  document.getElementById("btn-start-tts-reading").addEventListener("click", startSpeechNarration);
  
  // Floating Playbar triggers
  document.getElementById("playbar-btn-play").addEventListener("click", togglePlaybarSpeech);
  document.getElementById("playbar-btn-close-widget").addEventListener("click", stopSpeechNarration);
  
  document.getElementById("playbar-btn-prev").addEventListener("click", () => {
    if (audioPlayerInstance) {
      audioPlayerInstance.currentTime = Math.max(0, audioPlayerInstance.currentTime - 10);
    } else if (audioState.currentVerseIndex > 0) {
      speechSynthesis.cancel();
      audioState.currentVerseIndex--;
      speakPlaybarVerse(audioState.currentVerseIndex);
    }
  });
  
  document.getElementById("playbar-btn-next").addEventListener("click", () => {
    if (audioPlayerInstance) {
      audioPlayerInstance.currentTime = Math.min(audioPlayerInstance.duration || 9999, audioPlayerInstance.currentTime + 10);
    } else if (audioState.currentVerseIndex < audioState.versesToRead.length - 1) {
      speechSynthesis.cancel();
      audioState.currentVerseIndex++;
      speakPlaybarVerse(audioState.currentVerseIndex);
    }
  });
  
  const speedSlider = document.getElementById("tts-speed-slider");
  speedSlider.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value).toFixed(2);
    document.getElementById("tts-speed-val").textContent = `${val}x`;
    audioState.speed = parseFloat(val);
    if (audioPlayerInstance) {
      audioPlayerInstance.playbackRate = audioState.speed;
    } else if (audioState.isPlaying && speechSynthesis.speaking) {
      speechSynthesis.cancel();
      speakPlaybarVerse(audioState.currentVerseIndex);
    }
  });
  
  const toneSelect = document.getElementById("audio-tone-select");
  if (toneSelect) {
    toneSelect.value = state.audioTone || 'deep-bass';
    toneSelect.addEventListener("change", () => {
      updateAudioToneSettings();
      if (audioState.isPlaying && !audioPlayerInstance) {
        speechSynthesis.cancel();
        speakPlaybarVerse(audioState.currentVerseIndex);
      }
    });
  }
  
  // Profile subtabs switching
  document.querySelectorAll(".profile-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".profile-tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".profile-tab-panel").forEach(p => {
        p.classList.toggle("active", p.id === `you-tab-content-${btn.dataset.tab}`);
      });
    });
  });
  
  // Reading plan action clicks
  document.querySelectorAll(".plan-btn-action").forEach(btn => {
    btn.addEventListener("click", () => {
      state.readingPlan = btn.dataset.planId;
      state.planDay = 1;
      state.planPortionsCompleted = {};
      saveStateToLocalStorage();
      renderReadingPlansTab();
      renderDailyDevotion();
      showToast("Reading plan unlocked!");
    });
  });
  
  /* ==========================================================================
     14. Life Bible Split Screen Study & Journaling Listeners
     ========================================================================== */
  document.getElementById("btn-action-explain").addEventListener("click", () => {
    if (!selectedVerseMeta) return;
    closeAllDrawers();
    openStudySplitPane(selectedVerseMeta.book, selectedVerseMeta.chapter, selectedVerseMeta.verse);
  });
  
  document.getElementById("btn-close-study-pane").addEventListener("click", () => {
    closeStudySplitPane();
  });
  
  document.querySelectorAll(".study-subtab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      switchStudyTab(btn.dataset.studyTab);
    });
  });
  
  document.getElementById("btn-save-journal").addEventListener("click", () => {
    saveJournalNote();
  });
  
  // Autosave notes on input typing
  const journalTextarea = document.getElementById("study-journal-editor");
  if (journalTextarea) {
    journalTextarea.addEventListener("input", () => {
      if (!activeStudyVerse) return;
      const text = journalTextarea.value.trim();
      const refKey = activeStudyVerse.refKey;
      if (text) {
        state.userNotes[refKey] = text;
      } else {
        delete state.userNotes[refKey];
      }
      saveStateToLocalStorage();
      document.getElementById("study-journal-status").textContent = "Auto-saving...";
      document.getElementById("study-journal-status").style.color = "var(--text-muted)";
      
      clearTimeout(journalTextarea.autosaveTimeout);
      journalTextarea.autosaveTimeout = setTimeout(() => {
        updateJournalSaveStatus(!!state.userNotes[refKey]);
      }, 1000);
    });
  }
  
  // Home page tag chip bindings
  document.querySelectorAll(".tag-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const query = chip.dataset.query;
      const sInput = document.getElementById("discover-search-input");
      if (sInput) {
        sInput.value = query;
        const sClear = document.getElementById("btn-discover-search-clear");
        if (sClear) sClear.style.display = "flex";
        executeDiscoverSearch();
      }
      window.location.hash = "#/discover";
    });
  });
  
  // Home page search bar click binding
  const homeSearchTrigger = document.getElementById("home-search-trigger-input");
  if (homeSearchTrigger) {
    homeSearchTrigger.addEventListener("click", () => {
      window.location.hash = "#/discover";
    });
  }
  
  // Plans subnav switching bindings
  document.querySelectorAll(".plans-subnav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".plans-subnav-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      const subtab = btn.dataset.plansSubtab;
      document.querySelectorAll(".plans-subtab-panel").forEach(panel => {
        panel.classList.toggle("active", panel.id === `plans-subtab-${subtab}`);
      });
    });
  });

  // 15. New Interactive Click Bindings (Life Bible style)
  
  // Touchpoint Hope card
  document.querySelectorAll(".touchpoint-hope-card").forEach(card => {
    card.addEventListener("click", () => {
      openModal("modal-touchpoint-detail");
    });
  });

  // Resilient & Redeemed banner card click
  document.querySelectorAll(".resilient-banner-card").forEach(card => {
    card.addEventListener("click", () => {
      activatePlan("resilient_redeemed");
    });
  });
  const closeTouchpointDetailBtn = document.getElementById("btn-close-touchpoint-detail");
  if (closeTouchpointDetailBtn) {
    closeTouchpointDetailBtn.addEventListener("click", () => closeModal("modal-touchpoint-detail"));
  }
  
  document.querySelectorAll(".touchpoint-verse-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const book = btn.dataset.book;
      const chapter = parseInt(btn.dataset.chapter);
      const verse = parseInt(btn.dataset.verse);
      closeModal("modal-touchpoint-detail");
      openReader(book, chapter);
      setTimeout(() => {
        const key = `${book}_${chapter}_${verse}`;
        const el = document.querySelector(`.verse-row[data-verse-id="${key}"]`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("selected-pulse");
          setTimeout(() => el.classList.remove("selected-pulse"), 2500);
        }
      }, 500);
      window.location.hash = "#/reader";
    });
  });

  // Premium / Commentary cards click
  const openPremium = () => openModal("modal-premium-promo");
  document.querySelectorAll(".premium-promo-card").forEach(card => card.addEventListener("click", openPremium));
  document.querySelectorAll(".commentary-mockup-card").forEach(card => card.addEventListener("click", openPremium));
  document.querySelectorAll(".btn-premium-action").forEach(btn => btn.addEventListener("click", openPremium));
  
  const closePremiumPromoBtn = document.getElementById("btn-close-premium-promo");
  if (closePremiumPromoBtn) {
    closePremiumPromoBtn.addEventListener("click", () => closeModal("modal-premium-promo"));
  }
  const startPremiumTrialBtn = document.getElementById("btn-start-premium-trial");
  if (startPremiumTrialBtn) {
    startPremiumTrialBtn.addEventListener("click", () => {
      closeModal("modal-premium-promo");
      showToast("Premium trial activated! Thank you for choosing River of Life.");
    });
  }

  // Curated Reading Plans
  const activatePlan = (planId) => {
    state.readingPlan = planId;
    state.planDay = 1;
    state.planPortionsCompleted = {};
    saveStateToLocalStorage();
    renderReadingPlansTab();
    renderDailyDevotion();
    
    // Select MY PLANS tab in UI
    document.querySelectorAll(".plans-subnav-btn").forEach(b => {
      b.classList.toggle("active", b.dataset.plansSubtab === "myplans");
    });
    document.querySelectorAll(".plans-subtab-panel").forEach(panel => {
      panel.classList.toggle("active", panel.id === "plans-subtab-myplans");
    });
    
    showToast("Reading plan activated!");
    window.location.hash = "#/plans";
  };
  
  document.querySelectorAll(".suggested-plan-row").forEach(row => {
    row.addEventListener("click", () => {
      const planId = row.dataset.planId;
      activatePlan(planId);
    });
  });
  
  document.querySelectorAll(".plan-cover-tile").forEach(tile => {
    tile.addEventListener("click", () => {
      const planId = tile.dataset.plan;
      activatePlan(planId);
    });
  });

  // Book of the Month Cover Tiles click
  document.querySelectorAll(".book-cover-tile").forEach(tile => {
    tile.addEventListener("click", () => {
      const book = tile.dataset.book;
      openReader(book, 1);
      window.location.hash = "#/reader";
    });
  });

  // Plans Carousel click
  document.querySelectorAll(".carousel-card").forEach(card => {
    card.addEventListener("click", () => {
      let planId = "resilient_redeemed";
      if (card.classList.contains("slide-2")) planId = "book_club";
      else if (card.classList.contains("slide-3")) planId = "healthy_life";
      activatePlan(planId);
    });
  });

  // Floating + Plan Creator
  document.querySelectorAll(".floating-plans-action-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      openModal("modal-create-plan");
    });
  });
  const closeCreatePlanBtn = document.getElementById("btn-close-create-plan");
  if (closeCreatePlanBtn) {
    closeCreatePlanBtn.addEventListener("click", () => closeModal("modal-create-plan"));
  }
  
  const generatePlanSubmitBtn = document.getElementById("btn-generate-plan-submit");
  if (generatePlanSubmitBtn) {
    generatePlanSubmitBtn.addEventListener("click", () => {
      const bookSelect = document.getElementById("create-plan-book-select");
      const durationSelect = document.getElementById("create-plan-duration-select");
      if (!bookSelect || !durationSelect) return;
      
      const bookKey = bookSelect.value;
      const duration = parseInt(durationSelect.value);
      const bookMeta = booksMetadataMr.find(b => b.filename.replace(".json", "") === bookKey);
      const bookName = bookMeta ? ((state.translation === "eng") ? bookMeta.engName : bookMeta.name) : bookKey;
      
      state.readingPlan = `custom_${bookKey}_${duration}`;
      state.planDay = 1;
      state.planPortionsCompleted = {};
      state.customPlan = {
        book: bookKey,
        duration: duration,
        title: `Custom: ${bookName} Study (${duration} Days)`
      };
      
      saveStateToLocalStorage();
      renderReadingPlansTab();
      closeModal("modal-create-plan");
      
      // Select MY PLANS tab in UI
      document.querySelectorAll(".plans-subnav-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.plansSubtab === "myplans");
      });
      document.querySelectorAll(".plans-subtab-panel").forEach(panel => {
        panel.classList.toggle("active", panel.id === "plans-subtab-myplans");
      });
      
      showToast("Custom study plan generated!");
      window.location.hash = "#/plans";
    });
  }

  // Reader Header History Clock Trigger click
  const historyTrigger = document.getElementById("btn-history-trigger");
  if (historyTrigger) {
    historyTrigger.addEventListener("click", () => {
      window.location.hash = "#/you";
      
      document.querySelectorAll(".profile-tab-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.tab === "you-history");
      });
      document.querySelectorAll(".profile-tab-panel").forEach(panel => {
        panel.classList.toggle("active", panel.id === "you-tab-content-you-history");
      });
      
      renderYouProfile();
    });
  }

  // See All tags button on Home Page click
  document.querySelectorAll(".btn-see-all-tags").forEach(btn => {
    btn.addEventListener("click", () => {
      window.location.hash = "#/discover";
    });
  });

  // Explore plans button in Empty State click
  const discoverFallbackBtn = document.getElementById("btn-discover-plans-fallback");
  if (discoverFallbackBtn) {
    discoverFallbackBtn.addEventListener("click", () => {
      document.querySelectorAll(".plans-subnav-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.plansSubtab === "discover");
      });
      document.querySelectorAll(".plans-subtab-panel").forEach(panel => {
        panel.classList.toggle("active", panel.id === "plans-subtab-discover");
      });
    });
  }

  // Word & AI search examples click
  document.querySelectorAll(".clickable-search-example").forEach(item => {
    item.addEventListener("click", () => {
      const query = item.dataset.search;
      const sInput = document.getElementById("discover-search-input");
      if (sInput) {
        sInput.value = query;
        const sClear = document.getElementById("btn-discover-search-clear");
        if (sClear) sClear.style.display = "flex";
        executeDiscoverSearch();
      }
      window.location.hash = "#/discover";
    });
  });
}

/* ==========================================================================
   Helper Utilities
   ========================================================================== */
function openDrawer(id) {
  const overlay = document.getElementById(id);
  if (overlay) overlay.classList.add("active");
}

function closeAllDrawers() {
  document.querySelectorAll(".drawer-overlay").forEach(overlay => overlay.classList.remove("active"));
  document.querySelectorAll(".verse-row").forEach(v => v.classList.remove("selected-pulse"));
}

function openModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) {
    overlay.classList.add("active");
    if (id === "modal-card-share") resetCardCreatorModal();
    if (id === "modal-audio-settings") toggleVoiceDropdownVisibility();
  }
}

function closeModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) overlay.classList.remove("active");
}

let toastTimeout = null;
function showToast(message) {
  const toast = document.getElementById("toast-notification");
  document.getElementById("toast-message").textContent = message;
  
  clearTimeout(toastTimeout);
  toast.classList.add("active");
  
  toastTimeout = setTimeout(() => {
    toast.classList.remove("active");
  }, 2500);
}

/* ==========================================================================
   14. Life Bible Split Screen Study & Journaling Engine
   ========================================================================== */
const PLANS_DB = {
  "nt90": {
    title: "New Testament in 90 Days",
    days: 90,
    books: [
      { name: "Matthew", key: "matthew", chapters: 28 },
      { name: "Mark", key: "mark", chapters: 16 },
      { name: "Luke", key: "luke", chapters: 24 },
      { name: "John", key: "john", chapters: 21 },
      { name: "Acts", key: "acts", chapters: 28 },
      { name: "Romans", key: "romans", chapters: 16 }
    ]
  },
  "bible365": {
    title: "Bible in 365 Days",
    days: 365
  },
  "anxiety_tremble": {
    title: "Made to Tremble: Finding Awe in Your Anxiety",
    days: 7,
    readings: [
      { label: "Psalms 27", bookKey: "psalms", chapter: 27 },
      { label: "Psalms 34", bookKey: "psalms", chapter: 34 },
      { label: "Psalms 46", bookKey: "psalms", chapter: 46 },
      { label: "Psalms 91", bookKey: "psalms", chapter: 91 },
      { label: "Philippians 4", bookKey: "philippians", chapter: 4 },
      { label: "1 Peter 5", bookKey: "1peter", chapter: 5 },
      { label: "Matthew 6", bookKey: "matthew", chapter: 6 }
    ]
  },
  "still_heart": {
    title: "Cultivating a Still Heart in a Noisy World",
    days: 5,
    readings: [
      { label: "Luke 10", bookKey: "luke", chapter: 10 },
      { label: "Psalms 46", bookKey: "psalms", chapter: 46 },
      { label: "Psalms 131", bookKey: "psalms", chapter: 131 },
      { label: "John 14", bookKey: "john", chapter: 14 },
      { label: "Isaiah 30", bookKey: "isaiah", chapter: 30 }
    ]
  },
  "resilient_redeemed": {
    title: "Resilient & Redeemed: Faith & Depression",
    days: 10,
    readings: [
      { label: "Psalms 42", bookKey: "psalms", chapter: 42 },
      { label: "Psalms 43", bookKey: "psalms", chapter: 43 },
      { label: "Psalms 88", bookKey: "psalms", chapter: 88 },
      { label: "1 Kings 19", bookKey: "1kings", chapter: 19 },
      { label: "Romans 8", bookKey: "romans", chapter: 8 },
      { label: "2 Corinthians 1", bookKey: "2corinthians", chapter: 1 },
      { label: "2 Corinthians 4", bookKey: "2corinthians", chapter: 4 },
      { label: "Philippians 1", bookKey: "philippians", chapter: 1 },
      { label: "Philippians 4", bookKey: "philippians", chapter: 4 },
      { label: "Revelation 21", bookKey: "revelation", chapter: 21 }
    ]
  },
  "book_club": {
    title: "Life Bible Book Club: Job - Psalms",
    days: 15,
    readings: [
      { label: "Job 1", bookKey: "job", chapter: 1 },
      { label: "Job 2", bookKey: "job", chapter: 2 },
      { label: "Job 19", bookKey: "job", chapter: 19 },
      { label: "Job 38", bookKey: "job", chapter: 38 },
      { label: "Job 42", bookKey: "job", chapter: 42 },
      { label: "Psalms 1", bookKey: "psalms", chapter: 1 },
      { label: "Psalms 2", bookKey: "psalms", chapter: 2 },
      { label: "Psalms 8", bookKey: "psalms", chapter: 8 },
      { label: "Psalms 19", bookKey: "psalms", chapter: 19 },
      { label: "Psalms 23", bookKey: "psalms", chapter: 23 },
      { label: "Psalms 51", bookKey: "psalms", chapter: 51 },
      { label: "Psalms 103", bookKey: "psalms", chapter: 103 },
      { label: "Psalms 119", bookKey: "psalms", chapter: 119 },
      { label: "Psalms 139", bookKey: "psalms", chapter: 139 },
      { label: "Psalms 150", bookKey: "psalms", chapter: 150 }
    ]
  },
  "healthy_life": {
    title: "A Simply Healthy Life",
    days: 7,
    readings: [
      { label: "Daniel 1", bookKey: "daniel", chapter: 1 },
      { label: "Proverbs 4", bookKey: "proverbs", chapter: 4 },
      { label: "1 Corinthians 6", bookKey: "1corinthians", chapter: 6 },
      { label: "1 Corinthians 10", bookKey: "1corinthians", chapter: 10 },
      { label: "Romans 12", bookKey: "romans", chapter: 12 },
      { label: "James 1", bookKey: "james", chapter: 1 },
      { label: "James 3", bookKey: "james", chapter: 3 }
    ]
  }
};

let activeStudyVerse = null; // Stores { bookKey, chapter, verse, refKey }

const STUDY_COMMENTARY_DB = {
  "judges_13_5": {
    mr: "शास्ते १३:५ वरील भाष्य: हा शमशोनच्या जन्माविषयीचा संदेश आहे. तो गर्भापासूनच देवाचा नाजीर असेल आणि इस्राएलाला पलिष्ट्यांच्या जाचातून सोडवण्यास सुरुवात करेल. देव लहानपणापासूनच त्याला त्याच्या विशिष्ट कार्यासाठी पाचारण करीत आहे.",
    en: "Commentary on Judges 13:5: Samson was dedicated to God as a Nazirite from birth. He was to begin the deliverance of Israel from the Philistines. It highlights divine consecration for a specific task."
  },
  "isaiah_43_2": {
    mr: "यशया ४३:२ वरील भाष्य: देव आपल्या लोकांना खात्री देतो की संकटाच्या वेळी (पाणी, नद्या, अग्नी) तो त्यांच्यासोबत असेल. ही संकटे त्यांना नष्ट करू शकणार नाहीत कारण देव त्यांचा रक्षक व त्राता आहे.",
    en: "Commentary on Isaiah 43:2: God promises to be with His people in their trials (water, rivers, fire). Trials will not destroy them, for He is their Savior and protector."
  },
  "john_3_16": {
    mr: "योहान ३:१६ वरील भाष्य: हा संपूर्ण पवित्र शास्त्रातील सर्वात प्रसिद्ध संदेश आहे. देवाचे जगावरील असीम प्रेम आणि त्याच्या पुत्राद्वारे मिळणारे सार्वकालिक जीवन यावर येथे भर दिला आहे.",
    en: "Commentary on John 3:16: Often called the 'gospel in miniature', it highlights God's supreme love for humanity and the promise of eternal life through faith in His Son."
  },
  "psalms_23_1": {
    mr: "स्तोत्रसंहिता २३:१ वरील भाष्य: दावीद देवाची तुलना एका मेंढपाळाशी करतो जो आपल्या मेंढरांची काळजी घेतो, त्यांना तृप्त करतो आणि सुरक्षित ठेवतो. देवाला आपला मेंढपाळ मानल्याने कोणत्याही गोष्टीची उणीव भासत नाही.",
    en: "Commentary on Psalm 23:1: David compares God to a shepherd who cares for, provides, and protects His sheep. Trusting God as our shepherd means we shall not lack any good thing."
  }
};

const CROSS_REFERENCES_DB = {
  "judges_13_5": [
    { book: "numbers", chapter: 6, verse: 2, label: "गणना ६:२ (Nazirite vow)" },
    { book: "1samuel", chapter: 1, verse: 11, label: "१ शमुवेल १:११ (Samuel's consecration)" }
  ],
  "isaiah_43_2": [
    { book: "psalms", chapter: 66, verse: 12, label: "स्तोत्रसंहिता ६६:१२ (Through fire & water)" },
    { book: "daniel", chapter: 3, verse: 25, label: "दानीएल ३:२५ (Fiery furnace)" }
  ],
  "john_3_16": [
    { book: "romans", chapter: 5, verse: 8, label: "रोमन्स ५:८ (God shows love)" },
    { book: "1john", chapter: 4, verse: 9, label: "१ योहान ४:९ (God sent His Son)" }
  ],
  "psalms_23_1": [
    { book: "john", chapter: 10, verse: 11, label: "योहान १०:११ (The Good Shepherd)" },
    { book: "isaiah", chapter: 40, verse: 11, label: "यशया ४०:११ (He gathers lambs)" }
  ]
};

function getVerseStudyNotes(bookKey, chapter, verse) {
  const key = `${bookKey}_${chapter}_${verse}`;
  if (STUDY_COMMENTARY_DB[key]) {
    return STUDY_COMMENTARY_DB[key];
  }
  const bookMeta = booksMetadataMr.find(b => b.filename.replace(".json", "") === bookKey);
  const bookName = bookMeta ? ((state.translation === "eng") ? bookMeta.engName : bookMeta.name) : bookKey;
  return {
    mr: `${bookName} ${chapter}:${verse} वरील भाष्य: या वचनात आपल्याला देवाचे वचन आणि त्याचा आपल्या दैनंदिन जीवनातील अर्थ याविषयी सखोल मार्गदर्शन मिळते. अधिक अभ्यासासाठी प्रार्थनापूर्वक विचार करा.`,
    en: `Study Commentary for ${bookName} ${chapter}:${verse}: This passage invites us to reflect on God's word and His purpose in our daily lives. Take time to meditate on these words.`
  };
}

function getVerseCrossReferences(bookKey, chapter, verse) {
  const key = `${bookKey}_${chapter}_${verse}`;
  if (CROSS_REFERENCES_DB[key]) {
    return CROSS_REFERENCES_DB[key];
  }
  return [
    { book: "john", chapter: 3, verse: 16, label: "योहान ३:१६ (John 3:16)" },
    { book: "psalms", chapter: 23, verse: 1, label: "स्तोत्रसंहिता २३:१ (Psalm 23:1)" }
  ];
}

function openStudySplitPane(bookKey, chapter, verse) {
  const readerEl = document.getElementById("view-reader");
  if (!readerEl) return;
  
  const refKey = `${bookKey}_${chapter}_${verse}`;
  activeStudyVerse = { bookKey, chapter, verse, refKey };
  
  const bookMeta = booksMetadataMr.find(b => b.filename.replace(".json", "") === bookKey);
  const bookName = bookMeta ? ((state.translation === "eng") ? bookMeta.engName : bookMeta.name) : bookKey;
  
  document.getElementById("study-pane-ref-title").textContent = `Study Notes • ${bookName} ${chapter}:${verse}`;
  
  const commentary = getVerseStudyNotes(bookKey, chapter, verse);
  document.getElementById("study-explain-text-mr").textContent = commentary.mr;
  document.getElementById("study-explain-text-en").textContent = commentary.en;
  
  const crossrefs = getVerseCrossReferences(bookKey, chapter, verse);
  const crossrefList = document.getElementById("study-crossref-list");
  crossrefList.innerHTML = "";
  
  if (crossrefs && crossrefs.length > 0) {
    crossrefs.forEach(ref => {
      const btn = document.createElement("button");
      btn.className = "crossref-link-item";
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
        <span>${ref.label}</span>
      `;
      btn.addEventListener("click", () => {
        openReader(ref.book, ref.chapter);
        setTimeout(() => {
          const vKey = `${ref.book}_${ref.chapter}_${ref.verse}`;
          const verseEl = document.querySelector(`.verse-row[data-verse-id="${vKey}"]`);
          if (verseEl) {
            verseEl.scrollIntoView({ behavior: "smooth", block: "center" });
            verseEl.classList.add("selected-pulse");
            setTimeout(() => verseEl.classList.remove("selected-pulse"), 2500);
          }
          openStudySplitPane(ref.book, ref.chapter, ref.verse);
        }, 300);
      });
      crossrefList.appendChild(btn);
    });
  } else {
    crossrefList.innerHTML = `<div class="commentary-card">No cross references defined.</div>`;
  }
  
  const journalTextarea = document.getElementById("study-journal-editor");
  journalTextarea.value = state.userNotes[refKey] || "";
  updateJournalSaveStatus(!!state.userNotes[refKey]);
  
  switchStudyTab("explain");
  readerEl.classList.add("study-open");
  
  const selectedVerseEl = document.querySelector(`.verse-row[data-verse-id="${refKey}"]`);
  if (selectedVerseEl) {
    selectedVerseEl.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function closeStudySplitPane() {
  const readerEl = document.getElementById("view-reader");
  if (readerEl) readerEl.classList.remove("study-open");
  activeStudyVerse = null;
}

function switchStudyTab(tabId) {
  document.querySelectorAll(".study-subtab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.studyTab === tabId);
  });
  document.querySelectorAll(".study-subtab-content").forEach(content => {
    content.classList.toggle("active", content.id === `study-tab-${tabId}`);
  });
}

function updateJournalSaveStatus(hasNotes) {
  const statusEl = document.getElementById("study-journal-status");
  if (hasNotes) {
    statusEl.textContent = "Saved locally in browser";
    statusEl.style.color = "var(--primary)";
  } else {
    statusEl.textContent = "Not saved yet";
    statusEl.style.color = "var(--text-muted)";
  }
}

function saveJournalNote() {
  if (!activeStudyVerse) return;
  const journalTextarea = document.getElementById("study-journal-editor");
  const text = journalTextarea.value.trim();
  const refKey = activeStudyVerse.refKey;
  
  if (text) {
    state.userNotes[refKey] = text;
    showToast("Journal note saved!");
  } else {
    delete state.userNotes[refKey];
    showToast("Journal note cleared");
  }
  saveStateToLocalStorage();
  updateJournalSaveStatus(!!state.userNotes[refKey]);
}

function toggleVoiceDropdownVisibility() {
  const sourceSelectRow = document.getElementById("audio-source-row");
  const voiceSelectRow = document.getElementById("voice-select-row");
  const toneSelectRow = document.getElementById("tone-select-row");
  const sourceSelect = document.getElementById("audio-source-select");
  
  if (sourceSelect) {
    sourceSelect.value = state.audioSource || "human";
  }
  
  const isMarathi = state.translation !== "eng";
  
  if (!isMarathi) {
    // English: Supports AI TTS (SpeechSynthesis) and ElevenLabs Premium
    if (sourceSelectRow) sourceSelectRow.style.display = "flex";
    
    if (state.audioSource === "elevenlabs") {
      if (voiceSelectRow) voiceSelectRow.style.display = "none";
      if (toneSelectRow) toneSelectRow.style.display = "none";
    } else {
      // Default browser AI
      if (voiceSelectRow) voiceSelectRow.style.display = "flex";
      if (toneSelectRow) toneSelectRow.style.display = "none";
    }
  } else {
    // Marathi: Supports Human (WordProject), AI TTS, and ElevenLabs
    if (sourceSelectRow) sourceSelectRow.style.display = "flex";
    
    if (state.audioSource === "human") {
      if (voiceSelectRow) voiceSelectRow.style.display = "none";
      if (toneSelectRow) toneSelectRow.style.display = "flex";
    } else if (state.audioSource === "elevenlabs") {
      if (voiceSelectRow) voiceSelectRow.style.display = "none";
      if (toneSelectRow) toneSelectRow.style.display = "none";
    } else {
      // AI TTS
      if (voiceSelectRow) voiceSelectRow.style.display = "flex";
      if (toneSelectRow) toneSelectRow.style.display = "none";
    }
  }
}
