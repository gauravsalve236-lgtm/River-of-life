/* ==========================================================================
   RIVER OF LIFE — CHURCH HUB, SUNDAY SCHOOL & FULL ADMIN PORTAL CONTROLLER
   Manages:
   1. Church Information, Notices & Updates, Photos & Videos, Members Directory
   2. Sunday School (Age-Group Classes, Bible Lessons, Memory Verses & Quizzes)
   3. Admin Portal Panels to add/edit/delete every single item in the app
   Synced with Cloud Firestore + localStorage fallback.
   ========================================================================== */
(function () {
  'use strict';

  const KEYS = {
    CHURCH_INFO: 'rol_church_info_v1',
    NOTICES: 'rol_church_notices_v1',
    MEDIA: 'rol_church_media_v1',
    MEMBERS: 'rol_church_members_v1',
    SUNDAY_SCHOOL: 'rol_sunday_school_v1'
  };

  const DEFAULT_CHURCH_INFO = {
    name: 'River of Life Church',
    nameMr: 'रिव्हर ऑफ लाईफ चर्च',
    pastor: 'Pastor & Ministry Team',
    serviceTimes: 'Sunday Worship: 9:30 AM | Wednesday Prayer: 7:00 PM | Friday Youth: 6:30 PM',
    address: 'River of Life Sanctuary, Main Road',
    phone: '+91 98000 00000',
    email: 'contact@riveroflifechurch.org',
    about: 'A Christ-centered, bilingual Marathi & English church family committed to God’s Word, fervent prayer, Sunday School discipleship, and loving our community.',
    givingInfo: 'Tithes & Offerings can be shared at Church Sanctuary or via Church UPI.'
  };

  const DEFAULT_NOTICES = [
    {
      id: 'ntc_1',
      title: 'Sunday Worship & Holy Communion Service',
      category: 'Service Update',
      date: 'This Sunday • 9:30 AM',
      body: 'Join us with your family for praise, worship, and the Word of God. Sunday School classes for all children run concurrently.',
      pinned: true,
      createdAt: 1700000001000
    },
    {
      id: 'ntc_2',
      title: 'Weekly Family Prayer & Video Fellowship',
      category: 'Prayer Notice',
      date: 'Wednesday • 7:00 PM',
      body: 'Join our live Sanctuary Video Meeting right from the app for corporate prayer and testimonies.',
      pinned: false,
      createdAt: 1700000002000
    }
  ];

  const DEFAULT_MEDIA = [
    {
      id: 'med_1',
      type: 'photo',
      title: 'Sunday Worship Gathering',
      caption: 'River of Life Church family praising together',
      url: 'assets/images/church_worship_placeholder.jpg',
      fallbackUrl: 'assets/images/book_psalms_cover.png',
      createdAt: 1700000001000
    },
    {
      id: 'med_2',
      type: 'video',
      title: 'Sunday Message & Worship Highlights',
      caption: 'Watch our latest church message and worship moments',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      createdAt: 1700000002000
    }
  ];

  const DEFAULT_MEMBERS = [
    { id: 'mem_1', name: 'Church Pastor', role: 'Senior Pastor', group: 'Leadership', phone: '', email: '', status: 'Active' },
    { id: 'mem_2', name: 'Sunday School Coordinator', role: 'Sunday School Teacher', group: 'Children Ministry', phone: '', email: '', status: 'Active' },
    { id: 'mem_3', name: 'Worship Leader', role: 'Worship & Choir', group: 'Worship Team', phone: '', email: '', status: 'Active' }
  ];

  const DEFAULT_SUNDAY_SCHOOL = [
    {
      id: 'ss_1',
      ageGroup: 'Little Lambs (4–6 yrs)',
      title: 'God Made Everything Good',
      titleMr: 'देवाने सर्व काही उत्तम निर्माण केले',
      scripture: 'Genesis 1:1-31',
      memoryVerse: '“In the beginning God created the heavens and the earth.” — Genesis 1:1',
      story: 'Before there were trees, animals, stars, or people, God spoke and created a beautiful world filled with light, oceans, birds, and animals. And best of all, God made each of us with love!',
      questions: [
        'What is your favorite animal or flower that God created?',
        'How can we thank God for His wonderful world today?'
      ],
      activity: 'Draw 3 things God created and say a thank-you prayer together.',
      quizQuestion: 'Who created the heavens and the earth in Genesis 1:1?',
      quizOptions: ['God', 'Angels', 'Kings'],
      quizAnswer: 0,
      createdAt: 1700000001000
    },
    {
      id: 'ss_2',
      ageGroup: 'Explorers (7–10 yrs)',
      title: 'David and Goliath: Courage in God',
      titleMr: 'दावीद आणि गल्याथ: देवावरील विश्वास',
      scripture: '1 Samuel 17:32-50',
      memoryVerse: '“The battle is the Lord’s.” — 1 Samuel 17:47',
      story: 'Everyone in the army was afraid of the giant Goliath. Young David trusted that God was bigger than any giant. With five smooth stones and faith in God, David stepped forward and won.',
      questions: [
        'Why wasn’t David afraid of Goliath?',
        'What "giant" (fear or hard problem) can you trust God with this week?'
      ],
      activity: 'Write one fear on a paper stone and pray over it together in class.',
      quizQuestion: 'How many smooth stones did David pick up from the stream?',
      quizOptions: ['3 stones', '5 stones', '12 stones'],
      quizAnswer: 1,
      createdAt: 1700000002000
    },
    {
      id: 'ss_3',
      ageGroup: 'Juniors (11–14 yrs)',
      title: 'The Good Samaritan: Loving Our Neighbor',
      titleMr: 'दयाळू शोमरोनी: शेजाऱ्यावर प्रीती',
      scripture: 'Luke 10:25-37',
      memoryVerse: '“Love your neighbor as yourself.” — Luke 10:27',
      story: 'Jesus told a story of a traveler who was hurt and ignored by people who should have helped, until a Samaritan stopped, cared for his wounds, and paid for his recovery.',
      questions: [
        'Who is our "neighbor" at school or in our neighborhood?',
        'What is one practical way we can help someone left out this week?'
      ],
      activity: 'Plan one kindness act for a classmate, elderly neighbor, or sibling.',
      quizQuestion: 'Who stopped to care for the injured traveler in Jesus’ parable?',
      quizOptions: ['A Priest', 'A Samaritan', 'A Soldier'],
      quizAnswer: 1,
      createdAt: 1700000003000
    },
    {
      id: 'ss_4',
      ageGroup: 'Teens (15–18 yrs)',
      title: 'Standing Strong Like Daniel',
      titleMr: 'दानीएलासारखे विश्वासात खंबीर राहणे',
      scripture: 'Daniel 1:8; Daniel 6:10',
      memoryVerse: '“Don’t let anyone look down on you because you are young, but set an example…” — 1 Timothy 4:12',
      story: 'Even far away from home, Daniel refused to compromise his convictions and prayed faithfully three times a day. God honored his integrity and gave him wisdom.',
      questions: [
        'Where do teens face the most peer pressure today?',
        'How does a daily prayer habit help us stand strong?'
      ],
      activity: 'Set a daily 5-minute prayer & Bible reminder on your phone this week.',
      quizQuestion: 'How many times a day did Daniel pray by his open window?',
      quizOptions: ['Once a week', 'Twice a day', 'Three times a day'],
      quizAnswer: 2,
      createdAt: 1700000004000
    }
  ];

  function loadStore(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return JSON.parse(JSON.stringify(fallback));
  }

  function saveStore(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {}
  }

  window.getChurchInfo = () => loadStore(KEYS.CHURCH_INFO, DEFAULT_CHURCH_INFO);
  window.saveChurchInfo = (obj) => {
    saveStore(KEYS.CHURCH_INFO, obj);
    if (window.FirebaseApp?.setDoc) FirebaseApp.setDoc('church_config', 'main', obj).catch(() => {});
  };

  window.getChurchNotices = () => loadStore(KEYS.NOTICES, DEFAULT_NOTICES);
  window.saveChurchNotices = (arr) => saveStore(KEYS.NOTICES, arr);

  window.getChurchMedia = () => loadStore(KEYS.MEDIA, DEFAULT_MEDIA);
  window.saveChurchMedia = (arr) => saveStore(KEYS.MEDIA, arr);

  window.getChurchMembersDirectory = () => loadStore(KEYS.MEMBERS, DEFAULT_MEMBERS);
  window.saveChurchMembersDirectory = (arr) => saveStore(KEYS.MEMBERS, arr);

  window.getSundaySchoolLessons = () => loadStore(KEYS.SUNDAY_SCHOOL, DEFAULT_SUNDAY_SCHOOL);
  window.saveSundaySchoolLessons = (arr) => saveStore(KEYS.SUNDAY_SCHOOL, arr);

  let activeChurchSubtab = 'info';
  let activeSSAgeFilter = 'All';

  window.openChurchHub = function (subtab = 'info') {
    activeChurchSubtab = subtab;
    if (typeof switchTab === 'function') switchTab('church');
    window.renderChurchHub();
  };

  window.switchChurchHubSubtab = function (subtab) {
    activeChurchSubtab = subtab;
    window.renderChurchHub();
  };

  function getYoutubeEmbedUrl(url) {
    if (!url) return null;
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{6,})/);
    return m ? `https://www.youtube.com/embed/${m[1]}` : null;
  }

  window.renderChurchHub = function () {
    const root = document.getElementById('church-hub-root');
    if (!root) return;

    const info = window.getChurchInfo();
    const notices = window.getChurchNotices();
    const media = window.getChurchMedia();
    const members = window.getChurchMembersDirectory();

    const subtabs = [
      { id: 'info', label: '⛪ Church Info' },
      { id: 'notices', label: `📢 Notices (${notices.length})` },
      { id: 'media', label: `🎬 Photos & Videos (${media.length})` },
      { id: 'directory', label: `👥 Members (${members.length})` }
    ];

    let bodyHtml = '';
    if (activeChurchSubtab === 'info') {
      bodyHtml = `
        <div style="background: var(--bg-content); border: 1.5px solid var(--border); border-radius: 18px; padding: 20px; display: flex; flex-direction: column; gap: 14px;">
          <h3 style="margin: 0; font-size: 18px; font-weight: 800; color: var(--primary);">${info.name} <span style="font-size: 14px; color: var(--text-muted); font-weight: 600;">${info.nameMr || ''}</span></h3>
          <p style="margin: 0; font-size: 14px; line-height: 1.6; color: var(--text);">${info.about}</p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
            <div style="background: var(--bg); border: 1px solid var(--border); border-radius: 12px; padding: 12px;">
              <div style="font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">🕊️ Pastor & Leadership</div>
              <div style="font-size: 13.5px; font-weight: 700; margin-top: 4px;">${info.pastor}</div>
            </div>
            <div style="background: var(--bg); border: 1px solid var(--border); border-radius: 12px; padding: 12px;">
              <div style="font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">⏰ Service Timings</div>
              <div style="font-size: 13px; font-weight: 600; margin-top: 4px;">${info.serviceTimes}</div>
            </div>
            <div style="background: var(--bg); border: 1px solid var(--border); border-radius: 12px; padding: 12px;">
              <div style="font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">📍 Location</div>
              <div style="font-size: 13px; font-weight: 600; margin-top: 4px;">${info.address}</div>
            </div>
            <div style="background: var(--bg); border: 1px solid var(--border); border-radius: 12px; padding: 12px;">
              <div style="font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">📞 Contact</div>
              <div style="font-size: 13px; font-weight: 600; margin-top: 4px;">${info.phone}<br>${info.email}</div>
            </div>
          </div>
          <div style="background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.25); border-radius: 12px; padding: 12px; font-size: 13px;">
            <strong>💛 Giving & Offerings:</strong> ${info.givingInfo}
          </div>
        </div>
      `;
    } else if (activeChurchSubtab === 'notices') {
      bodyHtml = notices.length ? notices.map(n => `
        <div style="background: var(--bg-content); border: 1.5px solid ${n.pinned ? 'var(--primary)' : 'var(--border)'}; border-radius: 16px; padding: 16px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px;">
            <span style="font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 999px; background: rgba(224,83,95,0.12); color: var(--primary);">${n.pinned ? '📌 ' : ''}${n.category || 'Notice'}</span>
            <span style="font-size: 12px; color: var(--text-muted); font-weight: 600;">${n.date || ''}</span>
          </div>
          <h4 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 800;">${n.title}</h4>
          <p style="margin: 0; font-size: 13.5px; line-height: 1.55; color: var(--text);">${n.body}</p>
        </div>
      `).join('') : '<p style="text-align:center; color:var(--text-muted);">No notices posted yet.</p>';
    } else if (activeChurchSubtab === 'media') {
      bodyHtml = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px;">
          ${media.map(m => {
            const yt = m.type === 'video' ? getYoutubeEmbedUrl(m.url) : null;
            return `
              <div style="background: var(--bg-content); border: 1.5px solid var(--border); border-radius: 16px; overflow: hidden; display: flex; flex-direction: column;">
                ${m.type === 'photo'
                  ? `<img src="${m.url}" onerror="this.src='${m.fallbackUrl || 'assets/images/book_psalms_cover.png'}'" alt="${m.title}" style="width:100%; height:180px; object-fit:cover;">`
                  : (yt
                    ? `<iframe src="${yt}" style="width:100%; height:180px; border:none;" allowfullscreen></iframe>`
                    : `<video src="${m.url}" controls playsinline style="width:100%; height:180px; background:#000;"></video>`)
                }
                <div style="padding: 12px 14px;">
                  <span style="font-size: 10.5px; font-weight: 800; text-transform: uppercase; color: var(--primary);">${m.type === 'video' ? '🎬 Video' : '📸 Photo'}</span>
                  <h4 style="margin: 4px 0; font-size: 14.5px; font-weight: 800;">${m.title}</h4>
                  <p style="margin: 0; font-size: 12.5px; color: var(--text-muted);">${m.caption || ''}</p>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else if (activeChurchSubtab === 'directory') {
      bodyHtml = `
        <div style="margin-bottom: 12px;">
          <input id="church-directory-search" type="search" oninput="filterChurchDirectoryList(this.value)" placeholder="Search church members by name, role, or group..." style="width: 100%; padding: 11px 14px; border-radius: 12px; border: 1.5px solid var(--border); background: var(--bg-content); color: var(--text); font-size: 13.5px;">
        </div>
        <div id="church-directory-cards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 12px;">
          ${members.map(m => `
            <div class="church-dir-card" data-search="${(m.name + ' ' + m.role + ' ' + m.group).toLowerCase()}" style="background: var(--bg-content); border: 1.5px solid var(--border); border-radius: 14px; padding: 14px; display: flex; gap: 12px; align-items: center;">
              <div style="width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), #f59e0b); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; flex-shrink: 0;">${(m.name || 'M').charAt(0).toUpperCase()}</div>
              <div style="min-width: 0;">
                <div style="font-size: 14px; font-weight: 800; color: var(--text);">${m.name}</div>
                <div style="font-size: 12px; font-weight: 700; color: var(--primary);">${m.role || 'Member'} ${m.group ? '• ' + m.group : ''}</div>
                ${m.phone ? `<div style="font-size: 11.5px; color: var(--text-muted);">📞 ${m.phone}</div>` : ''}
                ${m.email ? `<div style="font-size: 11.5px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis;">✉️ ${m.email}</div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    root.innerHTML = `
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #fff; border-radius: 20px; padding: 22px; margin-bottom: 16px;">
        <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #93c5fd;">⛪ CHURCH COMMUNITY & INFORMATION</span>
        <h2 style="margin: 6px 0 4px 0; font-size: 22px; font-weight: 800;">${info.name}</h2>
        <p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.78);">${info.serviceTimes}</p>
      </div>
      <div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 16px;">
        ${subtabs.map(t => `
          <button onclick="switchChurchHubSubtab('${t.id}')" style="padding: 9px 14px; border-radius: 12px; border: 1.5px solid ${activeChurchSubtab === t.id ? 'var(--primary)' : 'var(--border)'}; background: ${activeChurchSubtab === t.id ? 'var(--primary)' : 'var(--bg-content)'}; color: ${activeChurchSubtab === t.id ? '#fff' : 'var(--text)'}; font-size: 12.5px; font-weight: 800; cursor: pointer; white-space: nowrap;">${t.label}</button>
        `).join('')}
      </div>
      ${bodyHtml}
    `;
  };

  window.filterChurchDirectoryList = function (q) {
    const query = (q || '').trim().toLowerCase();
    document.querySelectorAll('.church-dir-card').forEach(el => {
      const hay = el.getAttribute('data-search') || '';
      el.style.display = !query || hay.includes(query) ? 'flex' : 'none';
    });
  };

  /* ── SUNDAY SCHOOL SECTION ── */
  window.openSundaySchool = function () {
    if (typeof switchTab === 'function') switchTab('sundayschool');
    window.renderSundaySchool();
  };

  window.filterSundaySchoolAge = function (age) {
    activeSSAgeFilter = age;
    window.renderSundaySchool();
  };

  window.answerSundaySchoolQuiz = function (lessonId, optIdx, correctIdx) {
    const fb = document.getElementById('ss-quiz-fb-' + lessonId);
    if (!fb) return;
    if (optIdx === correctIdx) {
      fb.innerHTML = '<span style="color:#16a34a; font-weight:800;">✅ Great job! Correct answer!</span>';
    } else {
      fb.innerHTML = '<span style="color:#dc2626; font-weight:800;">❌ Try again! Check the story above.</span>';
    }
  };

  window.renderSundaySchool = function () {
    const root = document.getElementById('sunday-school-root');
    if (!root) return;

    const lessons = window.getSundaySchoolLessons();
    const groups = ['All', ...Array.from(new Set(lessons.map(l => l.ageGroup)))];
    const filtered = activeSSAgeFilter === 'All' ? lessons : lessons.filter(l => l.ageGroup === activeSSAgeFilter);

    root.innerHTML = `
      <div style="background: linear-gradient(135deg, #065f46 0%, #047857 100%); color: #fff; border-radius: 20px; padding: 22px; margin-bottom: 16px;">
        <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #a7f3d0;">🎒 KIDS & TEENS MINISTRY • संडे स्कूल</span>
        <h2 style="margin: 6px 0 4px 0; font-size: 22px; font-weight: 800;">River of Life Sunday School</h2>
        <p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.86);">Age-wise Bible lessons, memory verses, discussion questions, fun activities & quizzes for children and teens.</p>
      </div>

      <div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 16px;">
        ${groups.map(g => `
          <button onclick="filterSundaySchoolAge('${g.replace(/'/g, "\\'")}')" style="padding: 8px 14px; border-radius: 999px; border: 1.5px solid ${activeSSAgeFilter === g ? '#059669' : 'var(--border)'}; background: ${activeSSAgeFilter === g ? '#059669' : 'var(--bg-content)'}; color: ${activeSSAgeFilter === g ? '#fff' : 'var(--text)'}; font-size: 12px; font-weight: 800; cursor: pointer; white-space: nowrap;">${g}</button>
        `).join('')}
      </div>

      <div style="display: flex; flex-direction: column; gap: 16px;">
        ${filtered.map(l => `
          <div style="background: var(--bg-content); border: 1.5px solid var(--border); border-radius: 18px; padding: 18px; display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
              <span style="font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 999px; background: rgba(5,150,105,0.12); color: #059669;">🎒 ${l.ageGroup}</span>
              <span style="font-size: 12px; font-weight: 700; color: var(--text-muted);">📖 ${l.scripture}</span>
            </div>
            <div>
              <h3 style="margin: 0 0 2px 0; font-size: 17px; font-weight: 800;">${l.title}</h3>
              ${l.titleMr ? `<div style="font-size: 13px; font-weight: 700; color: var(--primary);">${l.titleMr}</div>` : ''}
            </div>
            <div style="background: rgba(245,158,11,0.1); border-left: 4px solid #f59e0b; padding: 10px 12px; border-radius: 0 10px 10px 0; font-size: 13px; font-weight: 700;">
              🌟 Memory Verse: ${l.memoryVerse}
            </div>
            <p style="margin: 0; font-size: 13.5px; line-height: 1.6; color: var(--text);">${l.story}</p>
            ${Array.isArray(l.questions) && l.questions.length ? `
              <div style="background: var(--bg); border: 1px solid var(--border); border-radius: 12px; padding: 12px;">
                <div style="font-size: 11.5px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">💬 Discussion Questions</div>
                <ul style="margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.55;">
                  ${l.questions.map(q => `<li>${q}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            ${l.activity ? `<div style="font-size: 13px; color: var(--text);"><strong>🎨 Activity:</strong> ${l.activity}</div>` : ''}
            ${l.quizQuestion ? `
              <div style="background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.22); border-radius: 12px; padding: 12px;">
                <div style="font-size: 12.5px; font-weight: 800; margin-bottom: 8px;">🧩 Quick Quiz: ${l.quizQuestion}</div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                  ${(l.quizOptions || []).map((opt, idx) => `
                    <button onclick="answerSundaySchoolQuiz('${l.id}', ${idx}, ${l.quizAnswer || 0})" style="padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-content); color: var(--text); font-size: 12px; font-weight: 700; cursor: pointer;">${opt}</button>
                  `).join('')}
                </div>
                <div id="ss-quiz-fb-${l.id}" style="margin-top: 8px; font-size: 12.5px;"></div>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  };

  /* ── ADMIN PORTAL EXTENSIONS (CHURCH INFO/MEDIA, MEMBERS, SERMONS, SUNDAY SCHOOL) ── */
  window.renderAdminChurchAndContentPanels = function () {
    const churchPanel = document.getElementById('admin-panel-church');
    if (churchPanel) {
      const info = window.getChurchInfo();
      const media = window.getChurchMedia();
      const notices = window.getChurchNotices();
      const members = window.getChurchMembersDirectory();

      churchPanel.innerHTML = `
        <div class="settings-card-group" style="padding: 18px; margin-bottom: 16px;">
          <h4 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 800; color: var(--primary);">⛪ Edit Church Information</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 10px;">
            <input id="adm-ch-name" value="${(info.name || '').replace(/"/g, '&quot;')}" placeholder="Church Name" style="padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text);">
            <input id="adm-ch-pastor" value="${(info.pastor || '').replace(/"/g, '&quot;')}" placeholder="Pastor Name" style="padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text);">
            <input id="adm-ch-times" value="${(info.serviceTimes || '').replace(/"/g, '&quot;')}" placeholder="Service Timings" style="padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text);">
            <input id="adm-ch-address" value="${(info.address || '').replace(/"/g, '&quot;')}" placeholder="Address" style="padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text);">
            <input id="adm-ch-phone" value="${(info.phone || '').replace(/"/g, '&quot;')}" placeholder="Phone" style="padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text);">
            <input id="adm-ch-email" value="${(info.email || '').replace(/"/g, '&quot;')}" placeholder="Email" style="padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text);">
          </div>
          <textarea id="adm-ch-about" placeholder="About Church" style="width:100%; margin-top:10px; padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text); min-height:70px;">${info.about || ''}</textarea>
          <button onclick="adminSaveChurchInfo()" class="btn-primary-mini" style="margin-top:10px; padding:10px 16px; border-radius:10px; font-weight:800;">💾 Save Church Info</button>
        </div>

        <div class="settings-card-group" style="padding: 18px; margin-bottom: 16px;">
          <h4 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 800; color: var(--primary);">📢 Post Church Notice / Update</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px; margin-bottom: 10px;">
            <input id="adm-ntc-title" placeholder="Notice Title" style="padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text);">
            <input id="adm-ntc-cat" placeholder="Category (e.g. Service Update)" style="padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text);">
            <input id="adm-ntc-date" placeholder="Date / Time (e.g. Sunday 9:30 AM)" style="padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text);">
          </div>
          <textarea id="adm-ntc-body" placeholder="Notice details..." style="width:100%; padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text); min-height:60px;"></textarea>
          <button onclick="adminAddChurchNotice()" class="btn-primary-mini" style="margin-top:8px; padding:10px 16px; border-radius:10px; font-weight:800;">➕ Publish Notice</button>
          <div style="margin-top:12px; display:flex; flex-direction:column; gap:8px;">
            ${notices.map(n => `<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:var(--bg); border:1px solid var(--border); border-radius:10px;"><span><strong>${n.title}</strong> (${n.date || ''})</span><button onclick="adminDeleteChurchNotice('${n.id}')" style="background:#ef4444; color:#fff; border:none; padding:4px 10px; border-radius:8px; cursor:pointer; font-size:11px;">Delete</button></div>`).join('')}
          </div>
        </div>

        <div class="settings-card-group" style="padding: 18px; margin-bottom: 16px;">
          <h4 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 800; color: var(--primary);">🎬 Add Church Photo or Video</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px; margin-bottom: 10px;">
            <select id="adm-med-type" style="padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text);">
              <option value="photo">📸 Photo URL</option>
              <option value="video">🎬 Video / YouTube URL</option>
            </select>
            <input id="adm-med-title" placeholder="Title" style="padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text);">
            <input id="adm-med-url" placeholder="Image or YouTube/MP4 URL" style="padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text);">
            <input id="adm-med-cap" placeholder="Short caption" style="padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text);">
          </div>
          <button onclick="adminAddChurchMedia()" class="btn-primary-mini" style="padding:10px 16px; border-radius:10px; font-weight:800;">➕ Add Media</button>
          <div style="margin-top:12px; display:flex; flex-direction:column; gap:8px;">
            ${media.map(m => `<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:var(--bg); border:1px solid var(--border); border-radius:10px;"><span>${m.type === 'video' ? '🎬' : '📸'} <strong>${m.title}</strong></span><button onclick="adminDeleteChurchMedia('${m.id}')" style="background:#ef4444; color:#fff; border:none; padding:4px 10px; border-radius:8px; cursor:pointer; font-size:11px;">Delete</button></div>`).join('')}
          </div>
        </div>

        <div class="settings-card-group" style="padding: 18px;">
          <h4 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 800; color: var(--primary);">👥 Church Members Directory (${members.length})</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; margin-bottom: 10px;">
            <input id="adm-mem-name" placeholder="Full Name" style="padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text);">
            <input id="adm-mem-role" placeholder="Role (e.g. Member, Elder)" style="padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text);">
            <input id="adm-mem-group" placeholder="Ministry / Group" style="padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text);">
            <input id="adm-mem-phone" placeholder="Phone" style="padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text);">
            <input id="adm-mem-email" placeholder="Email" style="padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text);">
          </div>
          <button onclick="adminAddDirectoryMember()" class="btn-primary-mini" style="padding:10px 16px; border-radius:10px; font-weight:800;">➕ Add to Directory</button>
          <div style="margin-top:12px; display:flex; flex-direction:column; gap:8px;">
            ${members.map(m => `<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:var(--bg); border:1px solid var(--border); border-radius:10px;"><span><strong>${m.name}</strong> — ${m.role} (${m.group || 'General'})</span><button onclick="adminDeleteDirectoryMember('${m.id}')" style="background:#ef4444; color:#fff; border:none; padding:4px 10px; border-radius:8px; cursor:pointer; font-size:11px;">Delete</button></div>`).join('')}
          </div>
        </div>
      `;
    }

    const sermonPanel = document.getElementById('admin-panel-sermons');
    if (sermonPanel && typeof window.getSermonTopics === 'function') {
      const topics = window.getSermonTopics();
      sermonPanel.innerHTML = `
        <div class="settings-card-group" style="padding: 18px;">
          <h4 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 800; color: var(--primary);">🎙️ Manage Preaching & Sermon Topics (${topics.length})</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 10px;">
            <input id="adm-srm-title" placeholder="Topic Title (English)" style="padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text);">
            <input id="adm-srm-title-mr" placeholder="Title (Marathi - Optional)" style="padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text);">
            <input id="adm-srm-scripture" placeholder="Key Scriptures (e.g. James 5:16)" style="padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text);">
            <input id="adm-srm-duration" value="20-25 mins" placeholder="Duration (e.g. 20-25 mins)" style="padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text);">
          </div>
          <textarea id="adm-srm-intro" placeholder="Introduction & main points summary..." style="width:100%; padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text); min-height:70px;"></textarea>
          <button onclick="adminAddSermonTopic()" class="btn-primary-mini" style="margin-top:8px; padding:10px 16px; border-radius:10px; font-weight:800;">➕ Add Sermon Topic</button>
          <div style="margin-top:14px; display:flex; flex-direction:column; gap:8px;">
            ${topics.map(t => `<div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:var(--bg); border:1px solid var(--border); border-radius:10px;"><div><strong>${t.title}</strong><div style="font-size:11.5px; color:var(--text-muted);">${t.scripture} • ${t.duration}</div></div><button onclick="adminDeleteSermonTopic('${t.id}')" style="background:#ef4444; color:#fff; border:none; padding:4px 10px; border-radius:8px; cursor:pointer; font-size:11px;">Delete</button></div>`).join('')}
          </div>
        </div>
      `;
    }

    const ssPanel = document.getElementById('admin-panel-sundayschool');
    if (ssPanel) {
      const lessons = window.getSundaySchoolLessons();
      ssPanel.innerHTML = `
        <div class="settings-card-group" style="padding: 18px;">
          <h4 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 800; color: var(--primary);">🎒 Manage Sunday School Lessons (${lessons.length})</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px; margin-bottom: 10px;">
            <select id="adm-ss-age" style="padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text);">
              <option value="Little Lambs (4–6 yrs)">Little Lambs (4–6 yrs)</option>
              <option value="Explorers (7–10 yrs)">Explorers (7–10 yrs)</option>
              <option value="Juniors (11–14 yrs)">Juniors (11–14 yrs)</option>
              <option value="Teens (15–18 yrs)">Teens (15–18 yrs)</option>
            </select>
            <input id="adm-ss-title" placeholder="Lesson Title" style="padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text);">
            <input id="adm-ss-scripture" placeholder="Scripture (e.g. Luke 10:25-37)" style="padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text);">
            <input id="adm-ss-memory" placeholder="Memory Verse" style="padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text);">
          </div>
          <textarea id="adm-ss-story" placeholder="Bible story & life lesson..." style="width:100%; padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text); min-height:70px;"></textarea>
          <input id="adm-ss-activity" placeholder="Class Activity" style="width:100%; margin-top:8px; padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text);">
          <button onclick="adminAddSundaySchoolLesson()" class="btn-primary-mini" style="margin-top:8px; padding:10px 16px; border-radius:10px; font-weight:800;">➕ Add Sunday School Lesson</button>
          <div style="margin-top:14px; display:flex; flex-direction:column; gap:8px;">
            ${lessons.map(l => `<div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:var(--bg); border:1px solid var(--border); border-radius:10px;"><div><strong>${l.title}</strong> <span style="font-size:11px; color:#059669;">(${l.ageGroup})</span></div><button onclick="adminDeleteSundaySchoolLesson('${l.id}')" style="background:#ef4444; color:#fff; border:none; padding:4px 10px; border-radius:8px; cursor:pointer; font-size:11px;">Delete</button></div>`).join('')}
          </div>
        </div>
      `;
    }
  };

  window.adminSaveChurchInfo = function () {
    const info = {
      ...window.getChurchInfo(),
      name: document.getElementById('adm-ch-name')?.value.trim() || 'River of Life Church',
      pastor: document.getElementById('adm-ch-pastor')?.value.trim() || '',
      serviceTimes: document.getElementById('adm-ch-times')?.value.trim() || '',
      address: document.getElementById('adm-ch-address')?.value.trim() || '',
      phone: document.getElementById('adm-ch-phone')?.value.trim() || '',
      email: document.getElementById('adm-ch-email')?.value.trim() || '',
      about: document.getElementById('adm-ch-about')?.value.trim() || ''
    };
    window.saveChurchInfo(info);
    if (typeof showToast === 'function') showToast('✅ Church information updated!');
  };

  window.adminAddChurchNotice = function () {
    const title = document.getElementById('adm-ntc-title')?.value.trim();
    const body = document.getElementById('adm-ntc-body')?.value.trim();
    if (!title || !body) return typeof showToast === 'function' && showToast('Enter title and notice details');
    const item = {
      id: 'ntc_' + Date.now(),
      title,
      category: document.getElementById('adm-ntc-cat')?.value.trim() || 'Notice',
      date: document.getElementById('adm-ntc-date')?.value.trim() || new Date().toLocaleDateString(),
      body,
      pinned: true,
      createdAt: Date.now()
    };
    const list = window.getChurchNotices();
    list.unshift(item);
    window.saveChurchNotices(list);
    if (window.FirebaseApp?.setDoc) FirebaseApp.setDoc('church_notices', item.id, item).catch(() => {});
    window.renderAdminChurchAndContentPanels();
    if (typeof showToast === 'function') showToast('📢 Notice published!');
  };

  window.adminDeleteChurchNotice = function (id) {
    window.saveChurchNotices(window.getChurchNotices().filter(n => n.id !== id));
    if (window.FirebaseApp?.deleteDoc) FirebaseApp.deleteDoc('church_notices', id).catch(() => {});
    window.renderAdminChurchAndContentPanels();
  };

  window.adminAddChurchMedia = function () {
    const type = document.getElementById('adm-med-type')?.value || 'photo';
    const title = document.getElementById('adm-med-title')?.value.trim();
    const url = document.getElementById('adm-med-url')?.value.trim();
    const caption = document.getElementById('adm-med-cap')?.value.trim() || '';
    if (!title || !url) return typeof showToast === 'function' && showToast('Enter title and media URL');
    const item = { id: 'med_' + Date.now(), type, title, url, caption, createdAt: Date.now() };
    const list = window.getChurchMedia();
    list.unshift(item);
    window.saveChurchMedia(list);
    if (window.FirebaseApp?.setDoc) FirebaseApp.setDoc('church_media', item.id, item).catch(() => {});
    window.renderAdminChurchAndContentPanels();
    if (typeof showToast === 'function') showToast('🎬 Media added to Church Gallery!');
  };

  window.adminDeleteChurchMedia = function (id) {
    window.saveChurchMedia(window.getChurchMedia().filter(m => m.id !== id));
    if (window.FirebaseApp?.deleteDoc) FirebaseApp.deleteDoc('church_media', id).catch(() => {});
    window.renderAdminChurchAndContentPanels();
  };

  window.adminAddDirectoryMember = function () {
    const name = document.getElementById('adm-mem-name')?.value.trim();
    if (!name) return typeof showToast === 'function' && showToast('Enter member name');
    const item = {
      id: 'mem_' + Date.now(),
      name,
      role: document.getElementById('adm-mem-role')?.value.trim() || 'Member',
      group: document.getElementById('adm-mem-group')?.value.trim() || 'Congregation',
      phone: document.getElementById('adm-mem-phone')?.value.trim() || '',
      email: document.getElementById('adm-mem-email')?.value.trim() || '',
      status: 'Active',
      createdAt: Date.now()
    };
    const list = window.getChurchMembersDirectory();
    list.unshift(item);
    window.saveChurchMembersDirectory(list);
    if (window.FirebaseApp?.setDoc) FirebaseApp.setDoc('church_members', item.id, item).catch(() => {});
    window.renderAdminChurchAndContentPanels();
    if (typeof showToast === 'function') showToast('👥 Member added to Church Directory!');
  };

  window.adminDeleteDirectoryMember = function (id) {
    window.saveChurchMembersDirectory(window.getChurchMembersDirectory().filter(m => m.id !== id));
    if (window.FirebaseApp?.deleteDoc) FirebaseApp.deleteDoc('church_members', id).catch(() => {});
    window.renderAdminChurchAndContentPanels();
  };

  window.adminAddSermonTopic = function () {
    const title = document.getElementById('adm-srm-title')?.value.trim();
    const intro = document.getElementById('adm-srm-intro')?.value.trim();
    if (!title || !intro) return typeof showToast === 'function' && showToast('Enter sermon title and content');
    const item = {
      id: 'srm_' + Date.now(),
      title,
      titleMr: document.getElementById('adm-srm-title-mr')?.value.trim() || '',
      occasion: 'Church Sermon & Family Prayer',
      duration: document.getElementById('adm-srm-duration')?.value.trim() || '20-25 mins',
      scripture: document.getElementById('adm-srm-scripture')?.value.trim() || 'Psalm 23',
      openingPrayer: 'Heavenly Father, speak to us through Your Word today. Amen.',
      introduction: intro,
      points: [
        { heading: '1. Biblical Foundation', time: '7 mins', explanation: intro },
        { heading: '2. Practical Application for Home & Church', time: '8 mins', explanation: 'Walk in obedience, prayer, and love throughout this week.' }
      ],
      application: 'Share one key takeaway from this message with your family today.',
      closingPrayer: 'Lord Jesus, bless our church and every family listening. Amen.',
      createdAt: Date.now()
    };
    const list = window.getSermonTopics();
    list.unshift(item);
    window.saveSermonTopics(list);
    if (window.FirebaseApp?.setDoc) FirebaseApp.setDoc('sermon_topics', item.id, item).catch(() => {});
    window.renderAdminChurchAndContentPanels();
    if (typeof showToast === 'function') showToast('🎙️ Sermon topic added!');
  };

  window.adminDeleteSermonTopic = function (id) {
    window.saveSermonTopics(window.getSermonTopics().filter(t => t.id !== id));
    if (window.FirebaseApp?.deleteDoc) FirebaseApp.deleteDoc('sermon_topics', id).catch(() => {});
    window.renderAdminChurchAndContentPanels();
  };

  window.adminAddSundaySchoolLesson = function () {
    const title = document.getElementById('adm-ss-title')?.value.trim();
    const story = document.getElementById('adm-ss-story')?.value.trim();
    if (!title || !story) return typeof showToast === 'function' && showToast('Enter lesson title and story');
    const item = {
      id: 'ss_' + Date.now(),
      ageGroup: document.getElementById('adm-ss-age')?.value || 'Explorers (7–10 yrs)',
      title,
      scripture: document.getElementById('adm-ss-scripture')?.value.trim() || 'John 3:16',
      memoryVerse: document.getElementById('adm-ss-memory')?.value.trim() || '',
      story,
      activity: document.getElementById('adm-ss-activity')?.value.trim() || '',
      questions: ['What did we learn about God in this story?'],
      createdAt: Date.now()
    };
    const list = window.getSundaySchoolLessons();
    list.unshift(item);
    window.saveSundaySchoolLessons(list);
    if (window.FirebaseApp?.setDoc) FirebaseApp.setDoc('sunday_school_lessons', item.id, item).catch(() => {});
    window.renderAdminChurchAndContentPanels();
    if (typeof showToast === 'function') showToast('🎒 Sunday School lesson added!');
  };

  window.adminDeleteSundaySchoolLesson = function (id) {
    window.saveSundaySchoolLessons(window.getSundaySchoolLessons().filter(l => l.id !== id));
    if (window.FirebaseApp?.deleteDoc) FirebaseApp.deleteDoc('sunday_school_lessons', id).catch(() => {});
    window.renderAdminChurchAndContentPanels();
  };

  // Cloud Firestore Listeners for real-time cross-device sync
  window.addEventListener('DOMContentLoaded', () => {
    if (!window.FirebaseApp) return;
    if (typeof FirebaseApp.getDoc === 'function') {
      FirebaseApp.getDoc('church_config', 'main').then(doc => {
        if (doc && doc.name) saveStore(KEYS.CHURCH_INFO, doc);
      }).catch(() => {});
    }
    if (typeof FirebaseApp.listenCollection === 'function') {
      FirebaseApp.listenCollection('church_notices', items => { if (items.length) saveStore(KEYS.NOTICES, items); });
      FirebaseApp.listenCollection('church_media', items => { if (items.length) saveStore(KEYS.MEDIA, items); });
      FirebaseApp.listenCollection('church_members', items => { if (items.length) saveStore(KEYS.MEMBERS, items); });
      FirebaseApp.listenCollection('sunday_school_lessons', items => { if (items.length) saveStore(KEYS.SUNDAY_SCHOOL, items); });
    }
  });
})();
