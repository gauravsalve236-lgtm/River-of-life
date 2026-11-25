/* ==========================================================================
   RIVER OF LIFE — PREACHING & SERMON SPEECH STUDIO (AI + DAILY TOPICS)
   Provides 15–30 minute structured, easy-to-understand yet biblically rich
   sermon & family-prayer speech outlines, daily rotating topics, random topic
   shuffling, custom AI speech builder, and Admin-managed topic library.
   ========================================================================== */
(function () {
  'use strict';

  const STORAGE_KEY = 'rol_sermon_topics_v1';
  const CUSTOM_KEY = 'rol_custom_sermons_v1';

  const DEFAULT_SERMON_TOPICS = [
    {
      id: 'srm_prayer_power',
      title: 'The Power of Persistent Prayer in the Family',
      titleMr: 'कुटुंबातील अखंड प्रार्थनेचे सामर्थ्य',
      occasion: 'Family Prayer & Church Sermon',
      duration: '20-25 mins',
      scripture: 'James 5:16; Matthew 18:19-20; Philippians 4:6-7',
      book: 'james',
      chapter: 5,
      verse: 16,
      openingPrayer: 'Heavenly Father, thank You for gathering our family and church together. Open our hearts to understand how prayer changes our homes, calms our fears, and invites Your presence into every situation. In Jesus’ name, Amen.',
      introduction: 'Many families pray only when a crisis hits—sickness, financial pressure, or a sudden problem. Yet Scripture invites us to make prayer the daily breathing of our home, not just an emergency siren. Today we will see how simple, sincere, united prayer builds an unshakeable home.',
      points: [
        {
          heading: '1. Prayer Brings God’s Peace Before the Answer Arrives (Phil 4:6-7)',
          time: '6 mins',
          explanation: 'Paul writes from a prison cell: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God." Notice the promise—God’s peace guards our hearts and minds even while we wait for circumstances to change.',
          illustration: 'Just like a lighthouse does not stop the storm waves, it keeps the ship from crashing on the rocks. Prayer anchors our mind in storms.'
        },
        {
          heading: '2. United Family Prayer Carries Special Authority (Matt 18:19-20)',
          time: '6 mins',
          explanation: 'Jesus promised that where two or three gather in His name, He is right there in the middle of them. When husband, wife, children, or church members pray together aloud, division breaks and spiritual unity grows.',
          illustration: 'One coal alone cools down quickly; coals gathered together keep the fire burning all night.'
        },
        {
          heading: '3. How to Pray Practically Every Day (ACTS Pattern)',
          time: '6 mins',
          explanation: 'Teach everyone an easy 4-step rhythm: Adoration (praising God for who He is), Confession (keeping hearts clean and forgiving each other), Thanksgiving (thanking God for 3 blessings today), and Supplication (praying specifically for family, church, and neighbors).'
        }
      ],
      application: 'Tonight before sleeping, spend 5 minutes together as a family. Let each person share one thing they are thankful for and one prayer need, and pray for each other by name.',
      closingPrayer: 'Lord Jesus, make our home a house of prayer. Teach us to trust You daily, forgive quickly, and walk in Your peace. Bless our church and every family listening today. Amen.',
      createdAt: 1700000001000
    },
    {
      id: 'srm_faith_storms',
      title: 'Peace in the Middle of Life’s Storms',
      titleMr: 'जीवनातील वादळातही ख्रिस्ताची शांती',
      occasion: 'Sunday Sermon / Fellowship',
      duration: '20-30 mins',
      scripture: 'Mark 4:35-41; Isaiah 41:10; Psalm 46:1',
      book: 'mark',
      chapter: 4,
      verse: 39,
      openingPrayer: 'Lord God, You are the Maker of heaven and earth, and even the winds and waves obey Your voice. Speak peace over every troubled heart here today. Amen.',
      introduction: 'Even when we follow Jesus closely, storms still come. In Mark 4, the disciples were obeying Jesus’ exact instruction to cross the lake, yet a furious storm hit them. Knowing Jesus is in the boat changes how we face every storm.',
      points: [
        {
          heading: '1. Obedience Does Not Exempt Us from Storms, But Guarantees His Presence',
          time: '6 mins',
          explanation: 'The disciples were right in the center of God’s will when the waves rose. Hardship is not proof that God abandoned you—Jesus was asleep in the same boat with them.'
        },
        {
          heading: '2. Fear Asks "Don’t You Care?"; Faith Trusts His Character',
          time: '7 mins',
          explanation: 'When panic rises, we often question God’s love. Yet the cross proves once and for all how deeply God cares for us. Bring your honest fears to Jesus instead of letting fear rule your decisions.'
        },
        {
          heading: '3. One Word from Jesus Calms What Years of Worry Cannot',
          time: '7 mins',
          explanation: 'Jesus stood up and said, "Peace, be still!" First He calmed the sea around them, and then He addressed the fear inside them. Ask Him to speak peace into your home and mind today.'
        }
      ],
      application: 'Write down the biggest "storm" you are facing this week. Read Isaiah 41:10 aloud every morning and replace anxious thoughts with gratitude.',
      closingPrayer: 'Father, we place our health, work, and families in Your hands. Quiet the storms around us and within us. Amen.',
      createdAt: 1700000002000
    },
    {
      id: 'srm_forgiveness_love',
      title: 'The Healing Power of Forgiveness & Love',
      titleMr: 'क्षमा आणि प्रीतीचे बरे करणारे सामर्थ्य',
      occasion: 'Family Prayer / Midweek Service',
      duration: '15-20 mins',
      scripture: 'Ephesians 4:31-32; Colossians 3:13; Matthew 6:14-15',
      book: 'ephesians',
      chapter: 4,
      verse: 32,
      openingPrayer: 'Loving Father, You forgave us when we could never repay our debt. Give us soft, humble hearts that reflect Your mercy to others. Amen.',
      introduction: 'Unforgiveness is like drinking poison and expecting the other person to suffer. In families and churches, small hurts grow into walls if we don’t practice daily grace.',
      points: [
        {
          heading: '1. Forgiveness Is a Command Rooted in How Much God Forgave Us',
          time: '5 mins',
          explanation: 'Ephesians 4:32 says, "Be kind and compassionate to one another, forgiving each other, just as in Christ God forgave you." We don’t forgive because the other person earned it; we forgive because Christ already paid for it.'
        },
        {
          heading: '2. What Forgiveness Is—and What It Isn’t',
          time: '6 mins',
          explanation: 'Forgiveness means releasing bitterness and the desire for revenge into God’s hands. It does not mean pretending sin didn’t hurt; it means choosing healing over hatred.'
        },
        {
          heading: '3. Speaking Words That Build Up (Eph 4:29)',
          time: '5 mins',
          explanation: 'Replace harsh criticism at home with encouraging, grace-filled words. Watch how the atmosphere of a household transforms when kindness leads.'
        }
      ],
      application: 'Ask the Holy Spirit if there is anyone you need to forgive or apologize to this week. Take one step of peace today.',
      closingPrayer: 'Lord, heal broken relationships in our families and church. Fill our speech with grace and truth. Amen.',
      createdAt: 1700000003000
    },
    {
      id: 'srm_gratitude_joy',
      title: 'Living with Gratitude in Every Season',
      titleMr: 'प्रत्येक परिस्थितीत कृतज्ञतेचे जीवन',
      occasion: 'Thanksgiving / Family Prayer',
      duration: '15-25 mins',
      scripture: '1 Thessalonians 5:16-18; Psalm 100:4; Psalm 103:1-5',
      book: 'psalms',
      chapter: 103,
      verse: 2,
      openingPrayer: 'Gracious God, every breath and every blessing comes from You. Teach us to count Your mercies and live with thankful hearts. Amen.',
      introduction: 'Complaining shrinks our joy, while gratitude opens our eyes to God’s faithfulness. Psalm 103:2 reminds us: "Forget not all His benefits."',
      points: [
        {
          heading: '1. Gratitude Shifts Our Focus from What’s Missing to Who God Is',
          time: '6 mins',
          explanation: 'Paul instructs us to "give thanks in all circumstances"—not *for* every painful event, but *in* every season because God is still good and still on the throne.'
        },
        {
          heading: '2. Remembering God’s Past Faithfulness Fuels Future Faith',
          time: '6 mins',
          explanation: 'David remembered how God forgave, healed, and redeemed him. Keeping a family list of answered prayers reminds children that God is real and active.'
        },
        {
          heading: '3. Thanksgiving Opens the Gates of Worship (Psalm 100:4)',
          time: '6 mins',
          explanation: 'When we enter prayer with thanksgiving, heaviness lifts and faith rises.'
        }
      ],
      application: 'Start a "Blessing Jar" or family notebook this week—write one thing God did each day and read them together on Sunday.',
      closingPrayer: 'Thank You Lord for Your unfailing love, provision, and grace over our homes. Amen.',
      createdAt: 1700000004000
    },
    {
      id: 'srm_gods_word_light',
      title: 'Building Your Life on the Rock of God’s Word',
      titleMr: 'देवाच्या वचनावर जीवन उभारणे',
      occasion: 'Sunday Sermon / Youth & Family',
      duration: '20-30 mins',
      scripture: 'Matthew 7:24-27; Psalm 119:105; Joshua 1:8',
      book: 'matthew',
      chapter: 7,
      verse: 24,
      openingPrayer: 'Lord, Your Word is a lamp to our feet and a light to our path. Make us not just hearers, but doers of Your Word. Amen.',
      introduction: 'Two builders built similar-looking houses, but only one survived the flood. The difference wasn’t the storm—it was the foundation underneath.',
      points: [
        {
          heading: '1. Hearing vs. Doing (Matthew 7:24)',
          time: '7 mins',
          explanation: 'Jesus says the wise person hears His words *and puts them into practice*. Real spiritual growth happens when Sunday’s verse becomes Monday’s action.'
        },
        {
          heading: '2. Daily Scripture Guards Our Decisions (Psalm 119:105)',
          time: '7 mins',
          explanation: 'A lamp doesn’t show the whole road 10 miles ahead, it shows the very next step. Daily Bible reading keeps us from stumbling in dark times.'
        },
        {
          heading: '3. Meditating on Scripture Brings Quiet Strength (Joshua 1:8)',
          time: '6 mins',
          explanation: 'Even 10 minutes a day reading and thinking on one chapter shapes how we speak, work, and love our family.'
        }
      ],
      application: 'Pick one chapter a day this week (for example, Proverbs or John) and share one verse with someone in your family.',
      closingPrayer: 'Lord, plant Your Word deep in our hearts so our homes stand strong in every season. Amen.',
      createdAt: 1700000005000
    },
    {
      id: 'srm_serving_church',
      title: 'Serving One Another with Humility & Purpose',
      titleMr: 'नम्रतेने एकमेकांची सेवा करणे',
      occasion: 'Church Service / Youth Fellowship',
      duration: '20-25 mins',
      scripture: 'Mark 10:43-45; Galatians 5:13; 1 Peter 4:10',
      book: 'galatians',
      chapter: 5,
      verse: 13,
      openingPrayer: 'Jesus, You came not to be served, but to serve. Give us Your servant heart in our church, workplace, and home. Amen.',
      introduction: 'The world measures greatness by how many people serve you. Jesus measures greatness by how many people you love and serve.',
      points: [
        {
          heading: '1. Jesus Set the Pattern (Mark 10:45)',
          time: '6 mins',
          explanation: 'The King of Kings washed His disciples’ feet. No act of kindness in the church or home is ever too small for God to notice.'
        },
        {
          heading: '2. Every Believer Has a Gift to Share (1 Peter 4:10)',
          time: '7 mins',
          explanation: 'Whether hospitality, prayer, teaching Sunday School, singing, or helping a neighbor—God gave you gifts to bless others.'
        },
        {
          heading: '3. Serving Together Unites the Church',
          time: '6 mins',
          explanation: 'When everyone contributes, no one burns out and the whole church shines Christ’s light to the city.'
        }
      ],
      application: 'Look for one quiet way to serve someone in your family or church this week without expecting recognition.',
      closingPrayer: 'Lord, use our hands, voices, and time to bring Your love to those around us. Amen.',
      createdAt: 1700000006000
    }
  ];

  function getDayOfYear() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    return Math.floor((now - start) / 86400000);
  }

  window.getSermonTopics = function () {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_SERMON_TOPICS.slice();
  };

  window.saveSermonTopics = function (list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}
  };

  window.getDailySermonTopic = function () {
    const list = window.getSermonTopics();
    if (!list.length) return DEFAULT_SERMON_TOPICS[0];
    const idx = getDayOfYear() % list.length;
    return list[idx];
  };

  let currentSermonId = null;

  window.openSermonStudio = function (topicId) {
    if (typeof switchTab === 'function') switchTab('sermons');
    window.renderSermonStudio(topicId || null);
  };

  window.shuffleSermonTopic = function () {
    const list = window.getSermonTopics();
    if (!list.length) return;
    let pool = list.filter(t => t.id !== currentSermonId);
    if (!pool.length) pool = list;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    window.renderSermonStudio(pick.id);
    if (typeof showToast === 'function') showToast('🎲 Loaded new preaching topic!');
  };

  window.renderSermonStudio = function (selectedId = null) {
    const root = document.getElementById('sermon-studio-root');
    if (!root) return;

    const topics = window.getSermonTopics();
    const daily = window.getDailySermonTopic();
    const active = topics.find(t => t.id === selectedId) || topics.find(t => t.id === currentSermonId) || daily;
    currentSermonId = active ? active.id : null;

    const pointsHtml = (active.points || []).map((pt, i) => `
      <div style="background: var(--bg); border: 1px solid var(--border); border-radius: 14px; padding: 14px 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 6px;">
          <h5 style="margin: 0; font-size: 14.5px; font-weight: 800; color: var(--primary);">${pt.heading}</h5>
          ${pt.time ? `<span style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: rgba(59,130,246,0.12); color: #2563eb; white-space: nowrap;">⏱ ${pt.time}</span>` : ''}
        </div>
        <p style="margin: 0; font-size: 13.5px; line-height: 1.6; color: var(--text);">${pt.explanation}</p>
        ${pt.illustration ? `<div style="margin-top: 8px; padding: 8px 12px; border-left: 3px solid #f59e0b; background: rgba(245,158,11,0.08); border-radius: 0 8px 8px 0; font-size: 12.5px; color: var(--text);"><strong>💡 Illustration:</strong> ${pt.illustration}</div>` : ''}
      </div>
    `).join('');

    const topicChips = topics.map(t => {
      const isAct = active && t.id === active.id;
      const isDaily = daily && t.id === daily.id;
      return `
        <button onclick="renderSermonStudio('${t.id}')" style="text-align: left; padding: 10px 14px; border-radius: 12px; border: 1.5px solid ${isAct ? 'var(--primary)' : 'var(--border)'}; background: ${isAct ? 'rgba(224,83,95,0.09)' : 'var(--bg)'}; color: var(--text); cursor: pointer; min-width: 210px; max-width: 260px; flex: 0 0 auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="font-size: 10.5px; font-weight: 800; color: ${isDaily ? '#059669' : 'var(--text-muted)'}; text-transform: uppercase;">${isDaily ? '✨ Today’s Topic' : (t.duration || '20 mins')}</span>
          </div>
          <div style="font-size: 13px; font-weight: 800; line-height: 1.3;">${t.title}</div>
          <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">${t.titleMr || ''}</div>
        </button>
      `;
    }).join('');

    root.innerHTML = `
      <!-- Header Banner -->
      <div style="background: linear-gradient(135deg, #1f1b2e 0%, #3b1d2a 100%); color: #fff; border-radius: 20px; padding: 22px; margin-bottom: 18px; box-shadow: 0 10px 28px rgba(0,0,0,0.18);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
          <div>
            <span style="display: inline-block; background: rgba(255,255,255,0.15); padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; letter-spacing: 0.4px; margin-bottom: 8px;">🎙️ AI SERMON & SPEECH STUDIO • प्रवचन व भाषण तयारी</span>
            <h2 style="margin: 0 0 6px 0; font-size: 22px; font-weight: 800;">Preaching & Family Prayer Speeches (15–30 Mins)</h2>
            <p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.82);">Daily rotating Bible topics, clear easy-to-understand points, illustrations & prayers—ready for church sermons or family prayer.</p>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button onclick="shuffleSermonTopic()" style="background: #f59e0b; color: #111827; border: none; padding: 10px 14px; border-radius: 12px; font-size: 12.5px; font-weight: 800; cursor: pointer;">🎲 Random Topic</button>
            <button onclick="openCustomSermonBuilder()" style="background: rgba(255,255,255,0.18); color: #fff; border: 1px solid rgba(255,255,255,0.3); padding: 10px 14px; border-radius: 12px; font-size: 12.5px; font-weight: 800; cursor: pointer;">✨ Create Custom Speech</button>
          </div>
        </div>
      </div>

      <!-- Custom AI Speech Builder Panel (collapsible) -->
      <div id="custom-sermon-builder-panel" style="display: none; background: var(--bg-content); border: 1.5px solid var(--primary); border-radius: 18px; padding: 18px; margin-bottom: 18px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h4 style="margin: 0; font-size: 15px; font-weight: 800; color: var(--primary);">✨ AI Speech & Sermon Generator / भाषण तयार करा</h4>
          <button onclick="document.getElementById('custom-sermon-builder-panel').style.display='none'" style="background: transparent; border: none; font-size: 18px; cursor: pointer; color: var(--text-muted);">&times;</button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 12px;">
          <input id="ai-sermon-topic-input" type="text" placeholder="Topic (e.g., Power of Prayer, Faith in Family)" style="padding: 10px 12px; border-radius: 10px; border: 1.5px solid var(--border); background: var(--bg); color: var(--text); font-size: 13px;">
          <input id="ai-sermon-verse-input" type="text" placeholder="Bible Reference (optional, e.g. Psalm 23)" style="padding: 10px 12px; border-radius: 10px; border: 1.5px solid var(--border); background: var(--bg); color: var(--text); font-size: 13px;">
          <select id="ai-sermon-occasion-input" style="padding: 10px 12px; border-radius: 10px; border: 1.5px solid var(--border); background: var(--bg); color: var(--text); font-size: 13px;">
            <option value="Family Prayer">🏠 Family Prayer (कुटुंब प्रार्थना)</option>
            <option value="Sunday Church Sermon">⛪ Sunday Church Sermon (रविवार संदेश)</option>
            <option value="Youth & Teens Meeting">🔥 Youth & Teens Meeting (तरुण सभा)</option>
            <option value="Midweek / Cottage Prayer">🕯️ Midweek / Cottage Prayer</option>
          </select>
          <select id="ai-sermon-duration-input" style="padding: 10px 12px; border-radius: 10px; border: 1.5px solid var(--border); background: var(--bg); color: var(--text); font-size: 13px;">
            <option value="15-20 mins">⏱ 15–20 Minutes</option>
            <option value="20-25 mins" selected>⏱ 20–25 Minutes</option>
            <option value="25-30 mins">⏱ 25–30 Minutes</option>
          </select>
        </div>
        <button onclick="generateCustomSermonSpeech()" class="btn-primary-block" style="margin: 0; padding: 12px; border-radius: 12px; font-size: 13.5px; font-weight: 800;">
          ✨ Generate Full 15–30 Min Speech Outline
        </button>
      </div>

      <!-- Daily & Random Topics Carousel -->
      <div style="margin-bottom: 18px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h4 style="margin: 0; font-size: 14px; font-weight: 800; color: var(--text);">📚 Daily & Featured Topics (${topics.length})</h4>
          <span style="font-size: 11.5px; color: var(--text-muted);">Rotates automatically every day</span>
        </div>
        <div style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 6px;">
          ${topicChips}
        </div>
      </div>

      <!-- Active Sermon / Speech Card -->
      <div style="background: var(--bg-content); border: 1.5px solid var(--border); border-radius: 20px; padding: 20px; display: flex; flex-direction: column; gap: 16px; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px; border-bottom: 1px solid var(--border); padding-bottom: 14px;">
          <div>
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 6px;">
              <span style="font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 999px; background: rgba(224,83,95,0.12); color: var(--primary);">⏱ ${active.duration || '20-25 mins'}</span>
              <span style="font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; background: var(--bg); border: 1px solid var(--border); color: var(--text-muted);">${active.occasion || 'Church & Family'}</span>
            </div>
            <h3 style="margin: 0 0 4px 0; font-size: 20px; font-weight: 800; color: var(--text);">${active.title}</h3>
            ${active.titleMr ? `<div style="font-size: 14px; font-weight: 700; color: var(--primary);">${active.titleMr}</div>` : ''}
            <div style="font-size: 12.5px; color: var(--text-muted); margin-top: 6px;">📖 <strong>Key Scriptures:</strong> ${active.scripture}</div>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${active.book ? `<button onclick="openReaderAndNavigate('${active.book}', ${active.chapter || 1}, ${active.verse || 1})" class="btn-secondary-mini" style="padding: 8px 12px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer;">📖 Read Passage</button>` : ''}
            <button onclick="copyActiveSermon('${active.id}')" class="btn-secondary-mini" style="padding: 8px 12px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer;">📋 Copy Speech</button>
          </div>
        </div>

        <div style="background: rgba(16,185,129,0.07); border: 1px solid rgba(16,185,129,0.25); border-radius: 14px; padding: 14px;">
          <div style="font-size: 11.5px; font-weight: 800; color: #059669; text-transform: uppercase; margin-bottom: 4px;">🙏 1. Opening & Prayer (2–3 mins)</div>
          <p style="margin: 0; font-size: 13.5px; line-height: 1.6; color: var(--text); font-style: italic;">"${active.openingPrayer}"</p>
        </div>

        <div>
          <div style="font-size: 11.5px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">💬 2. Introduction (3–4 mins)</div>
          <p style="margin: 0; font-size: 14px; line-height: 1.65; color: var(--text);">${active.introduction}</p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div style="font-size: 11.5px; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">📌 3. Main Teaching Points (12–18 mins)</div>
          ${pointsHtml}
        </div>

        <div style="background: rgba(59,130,246,0.07); border: 1px solid rgba(59,130,246,0.25); border-radius: 14px; padding: 14px;">
          <div style="font-size: 11.5px; font-weight: 800; color: #2563eb; text-transform: uppercase; margin-bottom: 4px;">🏠 4. Practical Family & Life Application (3–4 mins)</div>
          <p style="margin: 0; font-size: 13.5px; line-height: 1.6; color: var(--text);">${active.application}</p>
        </div>

        <div style="background: rgba(168,85,247,0.07); border: 1px solid rgba(168,85,247,0.25); border-radius: 14px; padding: 14px;">
          <div style="font-size: 11.5px; font-weight: 800; color: #7e22ce; text-transform: uppercase; margin-bottom: 4px;">🕊️ 5. Closing Appeal & Prayer (2–3 mins)</div>
          <p style="margin: 0; font-size: 13.5px; line-height: 1.6; color: var(--text); font-style: italic;">"${active.closingPrayer}"</p>
        </div>
      </div>
    `;
  };

  window.openCustomSermonBuilder = function () {
    const el = document.getElementById('custom-sermon-builder-panel');
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
  };

  window.generateCustomSermonSpeech = function () {
    const topic = (document.getElementById('ai-sermon-topic-input')?.value || '').trim();
    const verse = (document.getElementById('ai-sermon-verse-input')?.value || '').trim() || 'Psalm 23; Philippians 4:6-7; Romans 8:28';
    const occasion = document.getElementById('ai-sermon-occasion-input')?.value || 'Family Prayer';
    const duration = document.getElementById('ai-sermon-duration-input')?.value || '20-25 mins';

    if (!topic) {
      if (typeof showToast === 'function') showToast('Please enter a sermon/speech topic');
      return;
    }

    const newSermon = {
      id: 'srm_custom_' + Date.now(),
      title: topic,
      titleMr: `${topic} — ${occasion}`,
      occasion: occasion,
      duration: duration,
      scripture: verse,
      openingPrayer: `Heavenly Father, we thank You for gathering us for this ${occasion}. As we reflect on "${topic}", give us clear understanding, humble hearts, and strength to live out Your Word. In Jesus’ name, Amen.`,
      introduction: `Welcome everyone! Today for our ${occasion}, we are reflecting on "${topic}" from ${verse}. This is a practical truth that every believer—young or old—can understand and apply right away in daily life.`,
      points: [
        {
          heading: `1. What God’s Word Teaches About ${topic}`,
          time: '6 mins',
          explanation: `Look closely at ${verse}. God never leaves us guessing about how to walk with Him. When we anchor "${topic}" in Scripture instead of human opinion, our faith becomes steady and clear.`,
          illustration: `Think of a builder checking a blueprint before raising walls—God’s Word is our blueprint for "${topic}".`
        },
        {
          heading: `2. Common Struggles & How Grace Meets Us`,
          time: '7 mins',
          explanation: `In real life, we face busyness, worry, and discouragement. Yet Jesus meets us right in our weakness and gives us the Holy Spirit’s help to practice "${topic}" step by step.`
        },
        {
          heading: `3. Living Out "${topic}" in Our Home & Church`,
          time: '6 mins',
          explanation: `Faith becomes visible in how we treat family members, neighbors, and fellow believers. Let "${topic}" shape our words, our patience, and our prayers this week.`
        }
      ],
      application: `Before this week ends, choose one concrete action related to "${topic}"—share an encouraging word, pray together as a family, or read ${verse} aloud each morning.`,
      closingPrayer: `Lord Jesus, seal "${topic}" in our hearts today. Bless every person and family present, guide our steps, and let Your peace rule in our home. Amen.`,
      createdAt: Date.now()
    };

    const list = window.getSermonTopics();
    list.unshift(newSermon);
    window.saveSermonTopics(list);
    if (window.FirebaseApp && typeof FirebaseApp.setDoc === 'function') {
      FirebaseApp.setDoc('sermon_topics', newSermon.id, newSermon).catch(() => {});
    }

    window.renderSermonStudio(newSermon.id);
    if (typeof showToast === 'function') showToast('✨ Custom 15–30 min speech generated and saved!');
  };

  window.copyActiveSermon = function (id) {
    const s = window.getSermonTopics().find(t => t.id === id);
    if (!s) return;
    const text = [
      `${s.title} (${s.duration})`,
      `Occasion: ${s.occasion}`,
      `Scriptures: ${s.scripture}`,
      '',
      `OPENING PRAYER:\n${s.openingPrayer}`,
      '',
      `INTRODUCTION:\n${s.introduction}`,
      '',
      'MAIN POINTS:',
      ...(s.points || []).map(p => `${p.heading} [${p.time || ''}]\n${p.explanation}${p.illustration ? '\nIllustration: ' + p.illustration : ''}`),
      '',
      `APPLICATION:\n${s.application}`,
      '',
      `CLOSING PRAYER:\n${s.closingPrayer}`
    ].join('\n\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        if (typeof showToast === 'function') showToast('📋 Full speech copied to clipboard!');
      }).catch(() => {});
    }
  };

  // Sync Sermon Topics from Firestore if available
  if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
      if (window.FirebaseApp && typeof FirebaseApp.listenCollection === 'function') {
        FirebaseApp.listenCollection('sermon_topics', (items) => {
          if (Array.isArray(items) && items.length > 0) {
            const merged = [...items];
            DEFAULT_SERMON_TOPICS.forEach(def => {
              if (!merged.some(m => m.id === def.id)) merged.push(def);
            });
            window.saveSermonTopics(merged);
            if (document.getElementById('view-sermons')?.classList.contains('active')) {
              window.renderSermonStudio(currentSermonId);
            }
          }
        });
      }
    });
  }
})();
