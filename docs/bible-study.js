/**
 * River of Life - Bible Study Engine & Museum Experience
 * 
 * Philosophy: Discover -> Understand -> Explore -> Reflect -> Read Scripture
 * Aesthetic: Warm parchment, charcoal typography, antique gold accents, deep olive accents
 * Rules: ZERO gamification, ZERO quizzes, ZERO badges, ZERO streaks, ZERO videos.
 */

(function() {
  'use strict';

  // --- STATE & INNER ROUTING ---
  const studyState = {
    currentView: 'home', // 'home', 'lesson', 'books', 'book-detail', 'timeline', 'people-places', 'person-detail', 'place-detail', 'genres', 'transmission', 'languages', 'oia'
    params: {},
    historyStack: []
  };

  // --- DATA MODELS ---

  // 1. LESSONS
  const BIBLE_STUDY_LESSONS = {
    'what-is-the-bible': {
      id: 'what-is-the-bible',
      category: 'BIBLE FOUNDATIONS',
      categoryMr: 'बायबल मूलभूत पाया',
      title: 'What Is the Bible?',
      titleMr: 'पवित्र शास्त्र म्हणजे काय?',
      duration: '5 min',
      level: 'Beginner',
      levelMr: 'प्रारंभिक स्तर',
      heroImage: 'assets/images/dawn_valley_genesis.jpg',
      leadQuote: '“Your word is a lamp to my feet and a light to my path.” — Psalm 119:105',
      leadQuoteMr: '“तुझे वचन माझ्या पायांसाठी दिवा आणि माझ्या मार्गासाठी प्रकाश आहे.” — स्तोत्रसंहिता ११९:१०५',
      intro: 'The Bible is not simply a single book, nor is it a dry manual of abstract doctrines. It is a sacred, living library consisting of 66 diverse literary works written over 1,500 years by more than 40 human authors—yet inspired by one divine breath. Together, across poetry, narrative, history, and letters, it unveils one unified redemptive story.',
      introMr: 'बायबल हे केवळ एक सामान्य पुस्तक नाही किंवा केवळ नियमांची जंत्री नाही. हे १५०० हून अधिक वर्षांच्या कालावधीत ४० पेक्षा जास्त मानवी लेखकांनी लिहिलेल्या ६६ पुस्तकांचे पवित्र संकलन आहे. यात इतिहास, काव्य, भाकीते आणि पत्रे यांच्याद्वारे देवाच्या मानवावरील प्रेमाची आणि तारणाची एकच भव्य कथा उलगडते.',
      sections: [
        {
          num: '01',
          title: '66 Books — A Sacred Library',
          titleMr: '६६ पुस्तके — एक दैवी ग्रंथालय',
          content: 'The word "Bible" comes from the Greek term "ta biblia", which translates to "the books" or "the scrolls". The Bible is divided into two major divisions: the Old Testament (39 books originally penned in Hebrew and Aramaic) and the New Testament (27 books composed in ancient Koine Greek).',
          contentMr: '‘बायबल’ हा शब्द ग्रीक भाषेतील ‘टा बिब्लिया’ (ta biblia) या शब्दापासून आला आहे, ज्याचा अर्थ ‘पुस्तके’ किंवा ‘गुंडाळ्या’ असा होतो. बायबलचे दोन मुख्य भाग आहेत: जुना करार (३९ पुस्तके — मुख्यतः हिब्रू आणि अरामी भाषेत) आणि नवा करार (२७ पुस्तके — प्राचीन कोईने ग्रीक भाषेत).',
          metric: '39 Old Testament Books + 27 New Testament Books = 66 Total'
        },
        {
          num: '02',
          title: 'One Unfolding Story',
          titleMr: 'एकच अखंड वाहणारी कथा',
          content: 'Despite being penned across continents (Asia, Africa, Europe) and cultural eras ranging from nomadic desert wanderers to Roman imperial prisoners, the Bible forms one coherent tapestry centered upon redemption:',
          contentMr: 'आशिया, आफ्रिका आणि युरोप या तीन खंडांमध्ये आणि वाळवंटातील मेंढपाळांपासून ते रोमन साम्राज्यातील बंदिवानांपर्यंतच्या विविध लेखकांद्वारे लिहिले गेले असूनही, बायबलमध्ये एकच अखंड तारणकथा आहे:',
          flowSteps: [
            { label: 'Creation', labelMr: 'उत्पत्ती व निर्मिती', desc: 'God creates an ordered, flourishing world with purpose.' },
            { label: 'The Fall', labelMr: 'मानवाचे पतन', desc: 'Human rebellion fractures communion with the Creator.' },
            { label: 'Redemption', labelMr: 'तारणाची प्रतिज्ञा व कार्य', desc: 'God acts through covenant with Israel and the life, death, and resurrection of Jesus Christ.' },
            { label: 'Restoration', labelMr: 'नवे युग व पुनरुत्थान', desc: 'All things are made new in a healed, eternal kingdom.' }
          ]
        },
        {
          num: '03',
          title: 'Diverse Literary Genres',
          titleMr: 'विविध साहित्यिक प्रकार',
          content: 'God spoke through human language using authentic literary forms. Recognizing the genre is the key to hearing the author’s intended heartbeat:',
          contentMr: 'देवाने मानवी भाषा आणि विविध साहित्यिक प्रकारांतून संवाद साधला. प्रत्येक प्रकाराचे मर्म समजून घेतल्यास वचनाचा खरा अर्थ उलगडतो:',
          genresGrid: [
            { name: 'History (इतिहास)', desc: 'Eyewitness historical accounts of God’s actions in time.', books: 'Genesis, Exodus, Kings, Acts' },
            { name: 'Poetry (काव्य)', desc: 'Emotion, prayer, and worship expressing deepest human experience.', books: 'Psalms, Song of Songs' },
            { name: 'Wisdom (ज्ञानसाहित्य)', desc: 'Practical guidance for living righteously in a complex world.', books: 'Proverbs, Ecclesiastes, Job' },
            { name: 'Prophecy (संदेश व भाकीत)', desc: 'God’s covenantal warnings, hope, and promises of restoration.', books: 'Isaiah, Jeremiah, Daniel' },
            { name: 'Gospels (शुभवर्तमाने)', desc: 'Biographical proclamation of Jesus Christ’s life and victory.', books: 'Matthew, Mark, Luke, John' },
            { name: 'Letters (प्रेषितांची पत्रे)', desc: 'Pastoral counsel addressing early church questions and theology.', books: 'Romans, Corinthians, Ephesians' }
          ]
        },
        {
          num: '04',
          title: 'Two Testaments, One Harmony',
          titleMr: 'दोन करार, एकच समतोल',
          content: 'The Old Testament lays the bedrock of anticipation, covenant, and holy expectation; the New Testament reveals the fulfillment of those promises in the person of Jesus Christ.',
          contentMr: 'जुना करार प्रतिज्ञा, करार आणि तारणहाराची वाट पाहणारा पाया रचतो; तर नवा करार येशू ख्रिस्तामध्ये त्या सर्व प्रतिज्ञांची झालेली परिपूर्णता प्रकट करतो.',
          testamentBridge: {
            ot: { label: 'OLD TESTAMENT', tags: ['Promise', 'Preparation', 'Covenant', 'Shadow'] },
            connector: 'Fulfilled In Christ • ख्रिस्तामध्ये परिपूर्ण',
            nt: { label: 'NEW TESTAMENT', tags: ['Jesus', 'Fulfillment', 'New Covenant', 'Light'] }
          }
        }
      ],
      insight: {
        title: 'Did You Know? • तुम्हाला माहिती आहे का?',
        text: 'The original manuscripts of the Bible had no chapter or verse numbers! Chapters were introduced around 1205 AD by Stephen Langton (Archbishop of Canterbury), and standard verses were added in 1551 by the Parisian printer Robert Estienne. This was done solely to help readers locate passages easily.',
        textMr: 'बायबलच्या मूळ हस्तलिखितांमध्ये अध्याय किंवा वचनांचे आकडे नव्हते! १२०५ मध्ये स्टीफन लॅंग्टन यांनी अध्याय विभागले, आणि १५५१ मध्ये पॅरिसचे मुद्रक रॉबर्ट एस्टिएन यांनी वचनांचे क्रमांक जोडले, जेणेकरून वाचकांना संदर्भ शोधणे सोपे जावे.'
      },
      readScripture: {
        book: 'genesis',
        chapter: 1,
        verse: 1,
        label: 'Read Genesis 1 • उत्पत्ती १ वाचा',
        sub: 'Begin at the dawn of creation in the Bible reader.'
      }
    }
  };

  // 2. 66 BOOKS DATA
  const BIBLE_BOOKS_STUDY_DATA = [
    // PENTATEUCH / LAW
    { key: 'genesis', name: 'Genesis', nameMr: 'उत्पत्ती', testament: 'OT', genre: 'Law', chapters: 50, author: 'Moses', date: '~1440-1400 BC', themes: ['Creation', 'Fall', 'Covenant', 'Abrahamic Promise'], keyPeople: ['Adam', 'Noah', 'Abraham', 'Sarah', 'Joseph'], keyEvents: ['Creation of the Universe', 'The Flood', 'Tower of Babel', 'Call of Abraham', 'Joseph in Egypt'], summary: 'The book of beginnings: creation, human rebellion, and the launch of God’s covenant family through Abraham.', keyScripture: 'Genesis 1:1, 12:1-3, 50:20' },
    { key: 'exodus', name: 'Exodus', nameMr: 'निर्गम', testament: 'OT', genre: 'Law', chapters: 40, author: 'Moses', date: '~1440-1400 BC', themes: ['Deliverance', 'Passover', 'Law', 'Tabernacle Presence'], keyPeople: ['Moses', 'Aaron', 'Miriam', 'Pharaoh'], keyEvents: ['Burning Bush', 'Ten Plagues', 'Red Sea Crossing', 'Giving of the Law at Sinai', 'Building the Tabernacle'], summary: 'God rescues Israel from bondage in Egypt, makes a holy covenant at Sinai, and dwells among them.', keyScripture: 'Exodus 3:14, 14:14, 20:1-17' },
    { key: 'leviticus', name: 'Leviticus', nameMr: 'लेवीय', testament: 'OT', genre: 'Law', chapters: 27, author: 'Moses', date: '~1440-1400 BC', themes: ['Holiness', 'Sacrifice', 'Atonement', 'Priesthood'], keyPeople: ['Moses', 'Aaron', 'Nadab & Abihu'], keyEvents: ['Establishment of Sacrificial System', 'Day of Atonement (Yom Kippur)'], summary: 'A handbook of holiness instructing a redeemed people on how to approach a holy God in worship and daily life.', keyScripture: 'Leviticus 19:2, 17:11' },
    { key: 'numbers', name: 'Numbers', nameMr: 'गणना', testament: 'OT', genre: 'Law', chapters: 36, author: 'Moses', date: '~1400 BC', themes: ['Wilderness Wanderings', 'Faithfulness', 'Rebellion', 'Divine Guidance'], keyPeople: ['Moses', 'Caleb', 'Joshua', 'Balaam'], keyEvents: ['Census of Israel', 'Ten Spies Unbelief', '40 Years Wilderness Wandering', 'Bronze Serpent'], summary: 'Israel’s 40-year journey through the wilderness from Sinai to the threshold of the Promised Land.', keyScripture: 'Numbers 6:24-26, 14:8-9' },
    { key: 'deuteronomy', name: 'Deuteronomy', nameMr: 'अनुवाद', testament: 'OT', genre: 'Law', chapters: 34, author: 'Moses', date: '~1400 BC', themes: ['Covenant Renewal', 'Shema (Hear O Israel)', 'Love & Obedience'], keyPeople: ['Moses', 'Joshua'], keyEvents: ['Moses’ Final Sermons', 'Recitation of the Shema', 'Moses’ Death on Mount Nebo'], summary: 'Moses prepares the new generation to enter the Promised Land by renewing the covenant and urging wholehearted devotion.', keyScripture: 'Deuteronomy 6:4-5, 30:19-20' },

    // HISTORICAL BOOKS
    { key: 'joshua', name: 'Joshua', nameMr: 'यहोशवा', testament: 'OT', genre: 'History', chapters: 24, author: 'Joshua', date: '~1390 BC', themes: ['Conquest', 'Faithfulness of God', 'Inheritance'], keyPeople: ['Joshua', 'Rahab', 'Caleb'], keyEvents: ['Jordan River Crossing', 'Fall of Jericho', 'Division of the Land'], summary: 'The entry, conquest, and settlement of Canaan under Joshua’s courage and God’s mighty power.', keyScripture: 'Joshua 1:8-9, 24:15' },
    { key: 'judges', name: 'Judges', nameMr: 'शास्ते', testament: 'OT', genre: 'History', chapters: 21, author: 'Samuel (trad.)', date: '~1050-1000 BC', themes: ['Cycle of Sin & Deliverance', 'Human Frailty', 'Grace of God'], keyPeople: ['Deborah', 'Gideon', 'Samson'], keyEvents: ['Oppression and Rescue cycles', 'Gideon’s 300 men', 'Samson’s strength'], summary: 'A turbulent era of spiritual decline and divine mercy through imperfect deliverers.', keyScripture: 'Judges 2:18, 21:25' },
    { key: 'ruth', name: 'Ruth', nameMr: 'रूथ', testament: 'OT', genre: 'History', chapters: 4, author: 'Unknown', date: '~1000 BC', themes: ['Kinsman Redeemer', 'Hesed (Steadfast Love)', 'Providence'], keyPeople: ['Ruth', 'Naomi', 'Boaz'], keyEvents: ['Ruth’s Loyalty to Naomi', 'Meeting Boaz in the Harvest', 'Genealogy to King David'], summary: 'A beautiful story of loyalty, love, and redemption, linking a Gentile widow to the ancestry of King David and Jesus.', keyScripture: 'Ruth 1:16-17, 4:14' },
    { key: '1samuel', name: '1 Samuel', nameMr: '१ शमुवेल', testament: 'OT', genre: 'History', chapters: 31, author: 'Samuel / Gad / Nathan', date: '~930 BC', themes: ['Transition to Monarchy', 'Heart vs. Appearance', 'David’s Anointing'], keyPeople: ['Samuel', 'Saul', 'David', 'Jonathan'], keyEvents: ['God calls young Samuel', 'Saul crowned King', 'David defeats Goliath', 'Saul hunts David'], summary: 'Israel transitions from judges to kings; the rejection of Saul and the rise of David, a man after God’s own heart.', keyScripture: '1 Samuel 16:7, 17:45-47' },
    { key: '2samuel', name: '2 Samuel', nameMr: '२ शमुवेल', testament: 'OT', genre: 'History', chapters: 24, author: 'Gad / Nathan', date: '~930 BC', themes: ['Davidic Covenant', 'Kingdom Glory', 'Consequences of Sin'], keyPeople: ['David', 'Bathsheba', 'Nathan', 'Absalom'], keyEvents: ['David becomes King of all Israel', 'Jerusalem becomes Capital', 'Davidic Covenant (ch 7)', 'David’s Sin and Repentance'], summary: 'David’s triumphant reign as king, God’s everlasting covenant with his line, and the personal grief of his transgressions.', keyScripture: '2 Samuel 7:12-16, 22:2-3' },
    { key: '1kings', name: '1 Kings', nameMr: '१ राजे', testament: 'OT', genre: 'History', chapters: 22, author: 'Jeremiah (trad.)', date: '~550 BC', themes: ['Solomon’s Wisdom', 'Temple', 'Divided Kingdom', 'Elijah’s Ministry'], keyPeople: ['Solomon', 'Rehoboam', 'Jeroboam', 'Elijah', 'Ahab'], keyEvents: ['Solomon builds the Temple', 'Kingdom splits into Israel and Judah', 'Elijah on Mount Carmel'], summary: 'The zenith of Israel under Solomon’s Temple, the tragic division into two kingdoms, and the fiery ministry of Elijah.', keyScripture: '1 Kings 3:9, 18:37-39' },
    { key: '2kings', name: '2 Kings', nameMr: '२ राजे', testament: 'OT', genre: 'History', chapters: 25, author: 'Jeremiah (trad.)', date: '~550 BC', themes: ['Decline & Fall', 'Prophets Warning', 'Exile'], keyPeople: ['Elisha', 'Hezekiah', 'Josiah', 'Nebuchadnezzar'], keyEvents: ['Elisha’s Miracles', 'Fall of Northern Israel (722 BC)', 'Fall of Jerusalem & Temple (586 BC)'], summary: 'The slow spiral of both kingdoms, prophetic warnings unheeded, ending in tragic conquest and Babylonian exile.', keyScripture: '2 Kings 17:13-14, 23:25' },
    { key: '1chronicles', name: '1 Chronicles', nameMr: '१ इतिहास', testament: 'OT', genre: 'History', chapters: 29, author: 'Ezra (trad.)', date: '~450 BC', themes: ['Temple Worship', 'Davidic Heritage', 'Priestly Order'], keyPeople: ['David', 'Solomon', 'Asaph'], keyEvents: ['Genealogies of Grace', 'Ark brought to Jerusalem', 'Preparations for the Temple'], summary: 'A post-exilic recounting of Israel’s history emphasizing worship, the Temple, and the faithfulness of the Davidic line.', keyScripture: '1 Chronicles 16:8-12, 29:11-13' },
    { key: '2chronicles', name: '2 Chronicles', nameMr: '२ इतिहास', testament: 'OT', genre: 'History', chapters: 36, author: 'Ezra (trad.)', date: '~450 BC', themes: ['Spiritual Renewal', 'Repentance', 'Restoration'], keyPeople: ['Solomon', 'Jehoshaphat', 'Hezekiah', 'Josiah', 'Cyrus'], keyEvents: ['Temple Dedication', 'Reforms of Hezekiah and Josiah', 'Cyrus Decree of Return'], summary: 'The reigns of Judah’s kings highlighting moments of revival, the tragedy of exile, and the promise of return.', keyScripture: '2 Chronicles 7:14, 20:12' },
    { key: 'ezra', name: 'Ezra', nameMr: 'एज्रा', testament: 'OT', genre: 'History', chapters: 10, author: 'Ezra', date: '~440 BC', themes: ['Return from Exile', 'Temple Rebuilt', 'Restoration of the Word'], keyPeople: ['Zerubbabel', 'Ezra', 'Jeshua'], keyEvents: ['First Return under Zerubbabel', 'Temple Rebuilding', 'Ezra teaches God’s Law'], summary: 'Exiles return to Jerusalem to reconstruct the sacred Temple and restore faithful obedience to God’s Law.', keyScripture: 'Ezra 7:10, 3:11' },
    { key: 'nehemiah', name: 'Nehemiah', nameMr: 'नहेम्या', testament: 'OT', genre: 'History', chapters: 13, author: 'Nehemiah', date: '~430 BC', themes: ['Wall Rebuilding', 'Courageous Leadership', 'Covenant Renewal'], keyPeople: ['Nehemiah', 'Ezra', 'Sanballat'], keyEvents: ['Nehemiah weeps for Jerusalem', 'Walls rebuilt in 52 days', 'Great assembly reading scripture'], summary: 'Nehemiah leads the courageous rebuilding of Jerusalem’s broken walls against fierce opposition and brings spiritual revival.', keyScripture: 'Nehemiah 4:14, 8:10' },
    { key: 'esther', name: 'Esther', nameMr: 'एस्तेर', testament: 'OT', genre: 'History', chapters: 10, author: 'Unknown', date: '~460 BC', themes: ['Unseen Providence', 'Courage', 'Deliverance of God’s People'], keyPeople: ['Esther', 'Mordecai', 'Haman', 'King Xerxes'], keyEvents: ['Esther made Queen', 'Haman’s plot exposed', 'Purim established'], summary: 'The hidden hand of God delivers the Jewish people from genocide in Persia through the bravery of Queen Esther.', keyScripture: 'Esther 4:14, 9:22' },

    // POETRY & WISDOM
    { key: 'job', name: 'Job', nameMr: 'ईयोब', testament: 'OT', genre: 'Wisdom', chapters: 42, author: 'Unknown', date: 'Patriarchal era', themes: ['Suffering', 'Sovereignty of God', 'Faith Through Tragedy'], keyPeople: ['Job', 'Eliphaz', 'Bildad', 'Zophar', 'Elihu'], keyEvents: ['Job’s Trials', 'Debates with Friends', 'God answers from the Whirlwind'], summary: 'An exploration of human suffering, divine wisdom, and steadfast trust when life does not make sense.', keyScripture: 'Job 19:25-26, 42:2-5' },
    { key: 'psalms', name: 'Psalms', nameMr: 'स्तोत्रसंहिता', testament: 'OT', genre: 'Poetry', chapters: 150, author: 'David, Asaph, Sons of Korah, Moses', date: '~1400-450 BC', themes: ['Praise', 'Lament', 'Messianic Hope', 'Trust in God'], keyPeople: ['David', 'Solomon', 'Asaph'], keyEvents: ['150 Sacred Hymns and Prayers for all seasons of the soul'], summary: 'The prayer and hymn book of Israel, expressing every human emotion from the depths of despair to soaring heights of praise.', keyScripture: 'Psalm 23:1-3, 119:105, 139:13-14' },
    { key: 'proverbs', name: 'Proverbs', nameMr: 'नीतिसूत्रे', testament: 'OT', genre: 'Wisdom', chapters: 31, author: 'Solomon, Agur, Lemuel', date: '~950 BC', themes: ['Fear of the Lord', 'Wisdom for Daily Living', 'Integrity & Speech'], keyPeople: ['Solomon'], keyEvents: ['Collections of divinely inspired practical principles'], summary: 'Short, memorable sayings providing practical wisdom, discernment, and moral clarity for walking with God.', keyScripture: 'Proverbs 3:5-6, 9:10, 4:23' },
    { key: 'ecclesiastes', name: 'Ecclesiastes', nameMr: 'उपदेशक', testament: 'OT', genre: 'Wisdom', chapters: 12, author: 'Solomon (trad.)', date: '~935 BC', themes: ['Meaning of Life', 'Vanity under the Sun', 'Eternal Perspective'], keyPeople: ['The Teacher (Qoheleth)'], keyEvents: ['Search for purpose through pleasure, wealth, and achievement'], summary: 'An honest reflection on the fleeting nature of life "under the sun", concluding that true meaning is found solely in God.', keyScripture: 'Ecclesiastes 3:1-11, 12:13-14' },
    { key: 'songofsolomon', name: 'Song of Solomon', nameMr: 'गीतरत्न', testament: 'OT', genre: 'Poetry', chapters: 8, author: 'Solomon', date: '~950 BC', themes: ['Sacred Love', 'Marriage', 'Beauty of Commitment'], keyPeople: ['The Beloved', 'The Lover'], keyEvents: ['Poetic celebration of mutual devotion'], summary: 'A celebration of love, intimacy, and marital commitment, reflecting the deeper covenant bond between God and His people.', keyScripture: 'Song of Solomon 2:16, 8:6-7' },

    // MAJOR PROPHETS
    { key: 'isaiah', name: 'Isaiah', nameMr: 'यशया', testament: 'OT', genre: 'Major Prophets', chapters: 66, author: 'Isaiah', date: '~740-680 BC', themes: ['The Holy One of Israel', 'Suffering Servant', 'New Creation'], keyPeople: ['Isaiah', 'Hezekiah', 'Cyrus'], keyEvents: ['Isaiah’s Vision (ch 6)', 'Messianic prophecies', 'The Suffering Servant (ch 53)'], summary: 'The "Fifth Gospel" of the Old Testament, foretelling judgment for idolatry alongside the coming Messiah and new heavens.', keyScripture: 'Isaiah 9:6, 40:31, 53:4-6' },
    { key: 'jeremiah', name: 'Jeremiah', nameMr: 'यिर्मया', testament: 'OT', genre: 'Major Prophets', chapters: 52, author: 'Jeremiah', date: '~627-580 BC', themes: ['The Weeping Prophet', 'The New Covenant', 'Judgment & Restoration'], keyPeople: ['Jeremiah', 'Baruch', 'King Zedekiah'], keyEvents: ['Jeremiah’s Call', 'Shattered Potter’s Jar', 'Prophecy of New Covenant (ch 31)'], summary: 'A heart-rending warning to Judah prior to Babylon’s conquest, paired with the promise of a New Covenant written on human hearts.', keyScripture: 'Jeremiah 29:11, 31:31-34, 33:3' },
    { key: 'lamentations', name: 'Lamentations', nameMr: 'विलापगीत', testament: 'OT', genre: 'Poetry', chapters: 5, author: 'Jeremiah', date: '~586 BC', themes: ['Grief over Jerusalem', 'God’s Faithfulness', 'Hope in Sorrow'], keyPeople: ['Jeremiah'], keyEvents: ['Five acrostic poems mourning the destruction of Jerusalem'], summary: 'Poetic elegies mourning the fallen city of Jerusalem, shining with an immortal ray of hope in God’s steadfast mercies.', keyScripture: 'Lamentations 3:22-24' },
    { key: 'ezekiel', name: 'Ezekiel', nameMr: 'यहेज्केल', testament: 'OT', genre: 'Major Prophets', chapters: 48, author: 'Ezekiel', date: '~593-571 BC', themes: ['Glory of God', 'Valley of Dry Bones', 'New Heart and Spirit'], keyPeople: ['Ezekiel'], keyEvents: ['Vision of God’s Chariot Throne', 'Departure and Return of God’s Glory', 'Valley of Dry Bones (ch 37)'], summary: 'Vivid prophetic visions given in Babylonian captivity, showing God’s holy glory departing and returning to resurrect His people.', keyScripture: 'Ezekiel 36:26, 37:4-10' },
    { key: 'daniel', name: 'Daniel', nameMr: 'दानीएल', testament: 'OT', genre: 'Major Prophets', chapters: 12, author: 'Daniel', date: '~605-535 BC', themes: ['Sovereignty of God over Empires', 'Faithfulness in Exile', 'Son of Man'], keyPeople: ['Daniel', 'Shadrach', 'Meshach', 'Abednego', 'Nebuchadnezzar', 'Darius'], keyEvents: ['Fiery Furnace', 'Handwriting on the Wall', 'Lions’ Den', 'Visions of the Son of Man'], summary: 'Stories of courageous fidelity in pagan Babylon coupled with apocalyptic visions of God’s everlasting kingdom.', keyScripture: 'Daniel 2:44, 7:13-14, 12:3' },

    // MINOR PROPHETS (Selection of key representatives)
    { key: 'hosea', name: 'Hosea', nameMr: 'होशेय', testament: 'OT', genre: 'Minor Prophets', chapters: 14, author: 'Hosea', date: '~750 BC', themes: ['Relentless Love', 'Spiritual Adultery', 'Healing Grace'], keyPeople: ['Hosea', 'Gomer'], keyEvents: ['Hosea marries Gomer as a living picture of God’s love for wayward Israel'], summary: 'A heartbreaking, prophetic enactment of God’s unconditional, pursuing love for unfaithful people.', keyScripture: 'Hosea 6:6, 14:4' },
    { key: 'jonah', name: 'Jonah', nameMr: 'योना', testament: 'OT', genre: 'Minor Prophets', chapters: 4, author: 'Jonah', date: '~760 BC', themes: ['God’s Compassion for Nations', 'Fleeing God’s Call', 'Sovereignty'], keyPeople: ['Jonah', 'Sailors', 'King of Nineveh'], keyEvents: ['Swallowed by Great Fish', 'Preaching to Nineveh', 'Repentance of Nineveh'], summary: 'A reluctant prophet learns the boundless extent of God’s mercy toward even enemy nations.', keyScripture: 'Jonah 2:9, 4:2' },
    { key: 'micah', name: 'Micah', nameMr: 'मीखा', testament: 'OT', genre: 'Minor Prophets', chapters: 7, author: 'Micah', date: '~735 BC', themes: ['Justice', 'Mercy', 'Birthplace of Messiah in Bethlehem'], keyPeople: ['Micah'], keyEvents: ['Prophecy of Messiah born in Bethlehem (ch 5)'], summary: 'Denunciation of social injustice paired with an eternal call to do justice, love mercy, and walk humbly with God.', keyScripture: 'Micah 5:2, 6:8, 7:18' },
    { key: 'malachi', name: 'Malachi', nameMr: 'मलाखी', testament: 'OT', genre: 'Minor Prophets', chapters: 4, author: 'Malachi', date: '~430 BC', themes: ['Call to Wholehearted Worship', 'Tithing', 'Sun of Righteousness'], keyPeople: ['Malachi'], keyEvents: ['Final prophetic voice before 400 years of silence'], summary: 'The concluding voice of the Old Testament, calling for renewed devotion and pointing to the Sun of Righteousness.', keyScripture: 'Malachi 3:10, 4:2' },

    // GOSPELS & ACTS
    { key: 'matthew', name: 'Matthew', nameMr: 'मत्तय', testament: 'NT', genre: 'Gospels', chapters: 28, author: 'Matthew (Levi)', date: '~60-65 AD', themes: ['The Promised Messiah King', 'Kingdom of Heaven', 'Great Commission'], keyPeople: ['Jesus', 'Mary & Joseph', 'Peter', 'John the Baptist'], keyEvents: ['Sermon on the Mount', 'Transfiguration', 'Crucifixion and Resurrection', 'The Great Commission'], summary: 'Written to Jewish believers demonstrating that Jesus is the long-awaited Son of David and King of Kings.', keyScripture: 'Matthew 5:3-12, 16:16, 28:18-20' },
    { key: 'mark', name: 'Mark', nameMr: 'मार्क', testament: 'NT', genre: 'Gospels', chapters: 16, author: 'John Mark', date: '~55-60 AD', themes: ['The Suffering Servant', 'Power and Action', 'Urgency'], keyPeople: ['Jesus', 'Peter', 'Roman Centurion'], keyEvents: ['Baptism of Jesus', 'Miracles over Nature & Demons', 'Passion Week'], summary: 'A fast-paced, action-driven narrative presenting Jesus as the divine Servant who came not to be served, but to serve.', keyScripture: 'Mark 10:45, 1:15' },
    { key: 'luke', name: 'Luke', nameMr: 'लूक', testament: 'NT', genre: 'Gospels', chapters: 24, author: 'Luke (the Physician)', date: '~60-62 AD', themes: ['Son of Man', 'Compassion for the Outcast', 'Holy Spirit', 'Joy'], keyPeople: ['Jesus', 'Mary', 'Zacchaeus', 'Good Samaritan', 'Prodigal Son'], keyEvents: ['Birth Narratives', 'Parable of Prodigal Son', 'Road to Emmaus'], summary: 'An orderly historical investigation highlighting Jesus’ radical compassion for the marginalized, women, and outcasts.', keyScripture: 'Luke 19:10, 4:18-19, 24:32' },
    { key: 'john', name: 'John', nameMr: 'योहान', testament: 'NT', genre: 'Gospels', chapters: 21, author: 'John (the Beloved Apostle)', date: '~85-90 AD', themes: ['The Word Made Flesh', 'Seven "I AM" Statements', 'Eternal Life'], keyPeople: ['Jesus', 'Nicodemus', 'Samaritan Woman', 'Lazarus'], keyEvents: ['Prologue (Word Made Flesh)', 'Wedding at Cana', 'Raising of Lazarus', 'Upper Room Discourse'], summary: 'A deeply theological portrait of Jesus as the eternal Son of God, written so that all who believe may have life in His name.', keyScripture: 'John 1:1-14, 3:16, 14:6, 20:31' },
    { key: 'acts', name: 'Acts', nameMr: 'प्रेषितांची कृत्ये', testament: 'NT', genre: 'Acts', chapters: 28, author: 'Luke', date: '~62-64 AD', themes: ['Empowerment of Holy Spirit', 'Birth of the Church', 'Gospel to the Ends of the Earth'], keyPeople: ['Peter', 'Stephen', 'Philip', 'Paul', 'Barnabas'], keyEvents: ['Pentecost', 'Stoning of Stephen', 'Conversion of Saul on Damascus Road', 'Missionary Journeys'], summary: 'The unstoppable spread of the Gospel from Jerusalem into Judea, Samaria, and to the capital of the Roman Empire.', keyScripture: 'Acts 1:8, 2:1-4, 4:12' },

    // EPISTLES / LETTERS
    { key: 'romans', name: 'Romans', nameMr: 'रोमकरांस पत्र', testament: 'NT', genre: 'Letters', chapters: 16, author: 'Paul', date: '~57 AD', themes: ['Justification by Faith', 'Grace', 'God’s Righteousness', 'Living Sacrifice'], keyPeople: ['Paul', 'Phoebe'], keyEvents: ['Masterful presentation of the Gospel theology and practical unity'], summary: 'Paul’s masterpiece on the Gospel of grace: how all are guilty, justified freely by faith in Christ, and transformed for holy living.', keyScripture: 'Romans 1:16-17, 3:23-24, 8:1, 8:28, 12:1-2' },
    { key: '1corinthians', name: '1 Corinthians', nameMr: '१ करिंथकरांस पत्र', testament: 'NT', genre: 'Letters', chapters: 16, author: 'Paul', date: '~55 AD', themes: ['Cross of Christ', 'Love (Agape)', 'Spiritual Gifts', 'Resurrection Hope'], keyPeople: ['Paul', 'Apollos'], keyEvents: ['Instructions on Church Disorders, Love Chapter (ch 13), Resurrection (ch 15)'], summary: 'Paul addresses divisions, morality, spiritual gifts, and the centrality of love and the resurrection in the Corinthian church.', keyScripture: '1 Corinthians 1:18, 13:4-8, 15:55-57' },
    { key: '2corinthians', name: '2 Corinthians', nameMr: '२ करिंथकरांस पत्र', testament: 'NT', genre: 'Letters', chapters: 13, author: 'Paul', date: '~56 AD', themes: ['Comfort in Affliction', 'Treasure in Jars of Clay', 'Generosity', 'New Creation'], keyPeople: ['Paul', 'Titus'], keyEvents: ['Paul defends his apostolic calling through his weaknesses'], summary: 'An intensely personal letter revealing how God’s power is made perfect in human weakness.', keyScripture: '2 Corinthians 5:17, 12:9-10' },
    { key: 'galatians', name: 'Galatians', nameMr: 'गलतीकरांस पत्र', testament: 'NT', genre: 'Letters', chapters: 6, author: 'Paul', date: '~48-49 AD', themes: ['Christian Freedom', 'No Other Gospel', 'Fruit of the Spirit'], keyPeople: ['Paul', 'Peter', 'Barnabas'], keyEvents: ['Defense of Justification by Faith apart from the works of the Law'], summary: 'The charter of Christian freedom: we are justified by faith alone in Christ, not by legalistic ritual, to walk by the Spirit.', keyScripture: 'Galatians 2:20, 5:1, 5:22-23' },
    { key: 'ephesians', name: 'Ephesians', nameMr: 'इफिसकरांस पत्र', testament: 'NT', genre: 'Letters', chapters: 6, author: 'Paul', date: '~60-62 AD', themes: ['Saved by Grace', 'Unity of the Body', 'Armor of God'], keyPeople: ['Paul', 'Tychicus'], keyEvents: ['The mystery of Christ unifying Jew and Gentile into one body'], summary: 'A majestic vision of God’s eternal plan in Christ, the spiritual riches of believers, and standing firm in the Armor of God.', keyScripture: 'Ephesians 2:8-10, 4:1-3, 6:10-18' },
    { key: 'philippians', name: 'Philippians', nameMr: 'फिलिप्पैकरांस पत्र', testament: 'NT', genre: 'Letters', chapters: 4, author: 'Paul', date: '~61 AD', themes: ['Joy in All Circumstances', 'Christ’s Humility', 'Peace of God'], keyPeople: ['Paul', 'Timothy', 'Epaphroditus'], keyEvents: ['The Christ Hymn (ch 2)', 'Rejoicing in prison'], summary: 'A warm, affectionate epistle written from prison encouraging believers to rejoice continually and emulate Christ’s servant heart.', keyScripture: 'Philippians 2:5-11, 4:4-7, 4:13' },
    { key: 'colossians', name: 'Colossians', nameMr: 'कलस्सैकरांस पत्र', testament: 'NT', genre: 'Letters', chapters: 4, author: 'Paul', date: '~60-62 AD', themes: ['Preeminence of Christ', 'Complete in Him', 'Renewed Mind'], keyPeople: ['Paul', 'Timothy', 'Epaphras'], keyEvents: ['Supremacy of Christ over creation and Church (ch 1)'], summary: 'Declares the total supremacy, all-sufficiency, and deity of Jesus Christ over all created powers and philosophies.', keyScripture: 'Colossians 1:15-20, 2:9-10, 3:1-2' },
    { key: 'hebrews', name: 'Hebrews', nameMr: 'इब्री लोकांस पत्र', testament: 'NT', genre: 'Letters', chapters: 13, author: 'Unknown (Pauline Circle)', date: '~65-69 AD', themes: ['Jesus Superior to All', 'Great High Priest', 'Hall of Faith'], keyPeople: ['Jesus', 'Melchizedek', 'Old Testament Heroes'], keyEvents: ['The Great High Priesthood of Christ', 'Hall of Faith (ch 11)'], summary: 'Demonstrates that Jesus is supreme over angels, Moses, and the Levitical priesthood, fulfilling the entire sacrificial system.', keyScripture: 'Hebrews 1:1-3, 4:14-16, 11:1, 12:1-2' },
    { key: 'james', name: 'James', nameMr: 'याकोबाचे पत्र', testament: 'NT', genre: 'Letters', chapters: 5, author: 'James (Brother of Jesus)', date: '~45-48 AD', themes: ['Living Faith', 'Taming the Tongue', 'Pure Religion'], keyPeople: ['James'], keyEvents: ['Practical wisdom for everyday Christian living'], summary: 'A practical, probing call to live out authentic faith through genuine deeds, speech control, and love for the poor.', keyScripture: 'James 1:2-5, 1:22, 2:14-17, 3:9-10' },
    { key: '1peter', name: '1 Peter', nameMr: '१ पेत्राचे पत्र', testament: 'NT', genre: 'Letters', chapters: 5, author: 'Peter', date: '~64 AD', themes: ['Living Hope', 'Suffering for Christ', 'Chosen Generation'], keyPeople: ['Peter', 'Silas'], keyEvents: ['Encouraging believers scattered under Roman persecution'], summary: 'Written to persecuted Christians, offering a glorious living hope and calling them to stand firm as royal priests.', keyScripture: '1 Peter 1:3-4, 2:9, 5:7-8' },
    { key: '1john', name: '1 John', nameMr: '१ योहानाचे पत्र', testament: 'NT', genre: 'Letters', chapters: 5, author: 'John', date: '~85-90 AD', themes: ['God is Light and Love', 'Assurance of Salvation', 'Overcoming the World'], keyPeople: ['John'], keyEvents: ['Tests of true fellowship with God: truth, obedience, love'], summary: 'A pastoral message providing deep assurance of eternal life to believers who walk in the light and love one another.', keyScripture: '1 John 1:5-7, 3:1, 4:7-8, 5:13' },

    // APOCALYPSE / REVELATION
    { key: 'revelation', name: 'Revelation', nameMr: 'प्रकटीकरण', testament: 'NT', genre: 'Revelation', chapters: 22, author: 'John', date: '~95 AD', themes: ['Sovereignty of the Lamb', 'Ultimate Victory over Evil', 'New Heavens and New Earth'], keyPeople: ['Jesus', 'John', 'Seven Churches'], keyEvents: ['Visions on the Isle of Patmos', 'The Slain Lamb takes the Scroll', 'Final Judgment', 'The New Jerusalem'], summary: 'An apocalyptic vision comforting suffering believers with the sure victory of Jesus Christ, the Alpha and the Omega.', keyScripture: 'Revelation 1:8, 5:12, 21:1-4, 22:20' }
  ];

  // 3. TIMELINE DATA (The Story of Scripture)
  const BIBLE_TIMELINE_DATA = [
    {
      id: 'creation',
      name: 'Creation & Primeval Era',
      nameMr: 'उत्पत्ती व मूळ युग',
      era: 'Before ~2000 BC',
      lead: 'In the beginning, God created the heavens and the earth.',
      people: ['Adam', 'Eve', 'Enoch', 'Noah'],
      books: ['Genesis 1-11'],
      desc: 'The universe is spoken into existence with order, beauty, and purpose. Humanity is crowned with the Image of God. Human rebellion disrupts communion, leading to moral devastation and the Flood, where Noah finds grace.',
      descMr: 'देवाने संपूर्ण सृष्टी सुंदर व सुव्यवस्थित निर्माण केली. मानवाला स्वतःच्या प्रतिरूपात घडवले. परंतु मानवाच्या पतनामुळे जगात पाप आले. जलप्रलयाच्या काळात नोहाला कृपा प्राप्त झाली.',
      scripture: { book: 'genesis', chapter: 1, verse: 1, ref: 'Genesis 1:1' }
    },
    {
      id: 'flood',
      name: 'The Patriarchs (Abraham to Joseph)',
      nameMr: 'पूर्वजांचा काळ (अब्राहाम ते योसेफ)',
      era: '~2100 - 1800 BC',
      lead: '“In you all families of the earth shall be blessed.”',
      people: ['Abraham', 'Sarah', 'Isaac', 'Jacob', 'Joseph'],
      books: ['Genesis 12-50', 'Job'],
      desc: 'God calls Abraham out of pagan Ur and establishes a covenant promise: a land, a great nation, and a blessing for all families on earth. The promise passes through Isaac, Jacob, and Joseph, who saves the family during famine in Egypt.',
      descMr: 'देवाने अब्राहामाला पाचारण करून एक सार्वकालिक करार केला. इसहाक, याकोब आणि योसेफ यांच्याद्वारे हा करार पुढे चालू राहिला आणि इस्राएल कुटुंब मिसरमध्ये पोहचले.',
      scripture: { book: 'genesis', chapter: 12, verse: 1, ref: 'Genesis 12:1-3' }
    },
    {
      id: 'moses',
      name: 'Exodus, Covenant & Wilderness',
      nameMr: 'निर्गम, करार व वाळवंटातील प्रवास',
      era: '~1446 - 1406 BC',
      lead: '“I am the Lord your God, who brought you out of Egypt.”',
      people: ['Moses', 'Aaron', 'Miriam', 'Joshua', 'Caleb'],
      books: ['Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'],
      desc: 'After 400 years of enslavement, God delivers Israel through the Red Sea with a mighty hand. At Mount Sinai, God gives the Law and the Tabernacle. Due to unbelief, Israel journeys 40 years through the desert before entering Canaan.',
      descMr: 'मिसरमधील गुलामगिरीतून देवाने मोशेच्या द्वारे इस्राएली लोकांची सुटका केली. सीनाय पर्वतावर नियमशास्त्र दिले आणि निवासमंडप उभारला.',
      scripture: { book: 'exodus', chapter: 3, verse: 14, ref: 'Exodus 3:14' }
    },
    {
      id: 'david',
      name: 'The United Kingdom & Davidic Covenant',
      nameMr: 'संयुक्त राज्य व दाविदाचा करार',
      era: '~1050 - 930 BC',
      lead: '“Your house and your kingdom shall be made sure forever.”',
      people: ['Samuel', 'Saul', 'David', 'Solomon', 'Nathan'],
      books: ['1 & 2 Samuel', '1 Kings 1-11', '1 Chronicles', 'Psalms', 'Proverbs'],
      desc: 'David unites the tribes, establishes Jerusalem as the holy capital, and receives God’s everlasting covenant that an heir from his line will reign forever. Solomon constructs the First magnificent Temple.',
      descMr: 'दाविदाने सर्व इस्राएलचे एकत्रीकरण केले आणि यरुशलेम ही राजधानी बनवली. देवाने दाविदाशी सार्वकालिक राज्याचा करार केला. शलमोनाने पहिले भव्य मंदिर बांधले.',
      scripture: { book: '2samuel', chapter: 7, verse: 12, ref: '2 Samuel 7:12-16' }
    },
    {
      id: 'exile',
      name: 'Divided Kingdom, Prophets & Exile',
      nameMr: 'विभागलेले राज्य, संदेष्टे व बंदिवास',
      era: '~930 - 538 BC',
      lead: 'Prophets call the nation to repentance; judgment falls.',
      people: ['Elijah', 'Elisha', 'Isaiah', 'Jeremiah', 'Ezekiel', 'Daniel'],
      books: ['Kings', 'Chronicles', 'Major & Minor Prophets'],
      desc: 'Following Solomon, the kingdom splits into Israel (North) and Judah (South). Idolatry leads to the fall of the North to Assyria in 722 BC and the destruction of Jerusalem and the Temple by Babylon in 586 BC. Yet the prophets promise a New Covenant.',
      descMr: 'राज्याची दोन भागात फाळणी झाली. मूर्तीपूजेमुळे उत्तर राज्य अश्शूराच्या हाती गेले, आणि इ.स.पू. ५८६ मध्ये बाबेलाने यरुशलेमचे मंदिर पाडले आणि लोकांना बंदिवासात नेले.',
      scripture: { book: 'jeremiah', chapter: 31, verse: 31, ref: 'Jeremiah 31:31-34' }
    },
    {
      id: 'jesus',
      name: 'The Life, Ministry, Death & Resurrection of Jesus',
      nameMr: 'येशू ख्रिस्ताचे जीवन, सेवा, मरण व पुनरुत्थान',
      era: '~4 BC - 33 AD',
      lead: '“The Word became flesh and made His dwelling among us.”',
      people: ['Jesus Christ', 'Mary', 'John the Baptist', 'Peter', 'John'],
      books: ['Matthew', 'Mark', 'Luke', 'John'],
      desc: 'The climax of human history: God takes on flesh in Jesus of Nazareth. He announces the Kingdom of God, heals the brokenhearted, dies as the atoning sacrifice on the cross, and rises bodily on the third day, conquering death forever.',
      descMr: 'इतिहासाचा सर्वोच्च टप्पा: येशू ख्रिस्ताचा जन्म, त्याची सुवार्ता व चमत्कार. मानवाच्या पापांसाठी वधस्तंभावर मरण आणि तिसऱ्या दिवशी गौरवी पुनरुत्थान.',
      scripture: { book: 'john', chapter: 1, verse: 14, ref: 'John 1:14' }
    },
    {
      id: 'church',
      name: 'The Early Church & Apostolic Missions',
      nameMr: 'आरंभीची मंडळी व प्रेषितांची सेवा',
      era: '~33 - 100 AD',
      lead: '“You will be my witnesses to the ends of the earth.”',
      people: ['Peter', 'Paul', 'Barnabas', 'Stephen', 'Timothy'],
      books: ['Acts', 'Epistles of Paul, Peter, John, James, Hebrews'],
      desc: 'Empowered by the Holy Spirit at Pentecost, the early disciples spread the Good News from Jerusalem through Asia Minor, Greece, and Rome. Churches are planted and apostolic letters guide believers through challenges and persecutions.',
      descMr: 'पेन्टेकॉस्टच्या दिवशी पवित्र आत्म्याचे आगमन झाले. प्रेषित पेत्र आणि पौलाने यरुशलेमपासून रोमहून जगाच्या कानाकोपऱ्यात शुभवर्तमानाचा प्रसार केला.',
      scripture: { book: 'acts', chapter: 1, verse: 8, ref: 'Acts 1:8' }
    },
    {
      id: 'revelation',
      name: 'Consummation & The New Creation',
      nameMr: 'परिपूर्णता व नवे आकाश आणि नवी पृथ्वी',
      era: 'Eternity Ahead',
      lead: '“Behold, I am making all things new.”',
      people: ['Jesus (The Slain & Reigning Lamb)', 'The Church Triumphant'],
      books: ['Revelation'],
      desc: 'The grand conclusion of Scripture: Jesus returns in glory, all evil and death are forever judged, and God dwells intimately with His redeemed people in a renewed creation free from tears, pain, and sorrow.',
      descMr: 'बायबलचा अंतिम विजय: येशूचे गौरवशाली पुनरागमन, सर्व अन्यायाचा अंत, आणि देवाची त्याच्या लोकांशी सार्वकालिक सलोख्याची नवी सृष्टी.',
      scripture: { book: 'revelation', chapter: 21, verse: 3, ref: 'Revelation 21:3-4' }
    }
  ];

  // 4. PEOPLE & PLACES DATA
  const BIBLE_PEOPLE_DATA = [
    {
      id: 'abraham',
      name: 'Abraham',
      nameMr: 'अब्राहाम',
      role: 'Father of Faith & Covenant Patriarch',
      roleMr: 'विश्वासाचा पिता व कराराचा पूर्वज',
      period: '~2100 BC',
      summary: 'Called from Ur of the Chaldees to follow God into an unknown land. God credited his unwavering faith as righteousness and entered into an everlasting covenant with him.',
      summaryMr: 'कल्द्यांच्या ऊर शहरातून देवाने त्याला बोलावले. त्याच्या विश्वासाचे देवाने नीतिमत्व म्हणून परिगणन केले आणि त्याच्या वंशजांद्वारे जगाला आशीर्वाद देण्याचे वचन दिले.',
      relationships: 'Husband of Sarah, father of Isaac and Ishmael, grandfather of Jacob.',
      keyScriptures: 'Genesis 12:1-4, 15:6, 22:1-18, Romans 4:1-3, Hebrews 11:8-10',
      places: ['Ur', 'Haran', 'Hebron', 'Mount Moriah'],
      scriptureLink: { book: 'genesis', chapter: 15, verse: 6 }
    },
    {
      id: 'moses',
      name: 'Moses',
      nameMr: 'मोशे',
      role: 'Deliverer, Lawgiver & Prophet',
      roleMr: 'मुक्तीदाता, नियमशास्त्र देणारा व संदेष्टा',
      period: '~1526 - 1406 BC',
      summary: 'Rescued from the Nile as an infant, raised in Pharaoh’s courts, and called by God at the burning bush. Led Israel out of Egyptian slavery and received the Ten Commandments at Sinai.',
      summaryMr: 'नाईल नदीतून वाचवला गेलेला, देवाच्या ज्वलंत झुडूपातील आवाजाने पाचारण केलेला. इस्राएलला गुलामगिरीतून सोडवणारा आणि सीनाय पर्वतावर १० आज्ञा मिळवणारा महान नेता.',
      relationships: 'Son of Amram and Jochebed, brother of Aaron and Miriam, husband of Zipporah.',
      keyScriptures: 'Exodus 3:1-15, 14:13-31, 20:1-17, Deuteronomy 34:10-12',
      places: ['Egypt', 'Midian', 'Mount Sinai', 'Mount Nebo'],
      scriptureLink: { book: 'exodus', chapter: 3, verse: 4 }
    },
    {
      id: 'david',
      name: 'King David',
      nameMr: 'राजा दावीद',
      role: 'King of Israel & Psalmist',
      roleMr: 'इस्राएलचा महान राजा व स्तोत्रकर्ता',
      period: '~1040 - 970 BC',
      summary: 'Anointed by Samuel as a young shepherd boy. Defeated the giant Goliath with simple faith, united all Israel, captured Jerusalem, and penned scores of deeply honest, messianic Psalms.',
      summaryMr: 'मेंढपाळ मुलगा ज्याला शमुवेलाने अभिषिक्त केले. गल्याथवर विजय मिळवला, यरुशलेमला राजधानी केले आणि अनेक सुंदर स्तोत्रे रचली. देवाच्या मनासारखा मनुष्य म्हणून ओळखला गेला.',
      relationships: 'Son of Jesse, father of Solomon and Absalom, close friend of Jonathan.',
      keyScriptures: '1 Samuel 16:1-13, 17:32-50, 2 Samuel 7:1-17, Psalm 23, Psalm 51',
      places: ['Bethlehem', 'Jerusalem', 'En Gedi', 'Hebron'],
      scriptureLink: { book: '1samuel', chapter: 16, verse: 7 }
    },
    {
      id: 'isaiah',
      name: 'Isaiah',
      nameMr: 'यशया संदेष्टा',
      role: 'Major Prophet & Messianic Herald',
      roleMr: 'महान संदेष्टा व मसीहाचा उद्घोषक',
      period: '~740 - 680 BC',
      summary: 'Prophesied in Jerusalem during the reigns of four Judean kings. Saw a breathtaking vision of the holy Lord in His Temple. Gave the most detailed prophecies of Christ’s birth and suffering.',
      summaryMr: 'यरुशलेममध्ये देवाच्या पवित्रतेचे भव्य दर्शन पाहिले. येशू ख्रिस्ताच्या जन्माविषयी (इम्मानुएल) आणि त्याच्या दुःखी दासाच्या (यशया ५३) स्वरूपाविषयी अचूक भाकीते केली.',
      relationships: 'Contemporary of Micah, counselor to King Hezekiah.',
      keyScriptures: 'Isaiah 6:1-8, 7:14, 9:6-7, 40:1-5, 53:1-12',
      places: ['Jerusalem', 'Temple Mount'],
      scriptureLink: { book: 'isaiah', chapter: 53, verse: 5 }
    },
    {
      id: 'mary',
      name: 'Mary of Nazareth',
      nameMr: 'नाझरेथची मरिया',
      role: 'Mother of Jesus & Faithful Handmaiden',
      roleMr: 'येशूची माता व नम्र दासी',
      period: '~20 BC - 50 AD',
      summary: 'A humble young Jewish woman visited by the angel Gabriel. Responded with supreme surrender: “Behold, I am the servant of the Lord; let it be to me according to your word.”',
      summaryMr: 'देवदूताने दिलेल्या संदेशावर संपूर्ण विश्वास ठेवून देवाची योजना स्वीकारणारी धन्य स्त्री. येशूच्या जन्मापासून ते वधस्तंभाच्या पायथ्यापर्यंत तिने विश्वासू साक्ष दिली.',
      relationships: 'Betrothed to Joseph, mother of Jesus, relative of Elizabeth.',
      keyScriptures: 'Luke 1:26-56 (Magnificat), Luke 2:1-20, John 19:25-27, Acts 1:14',
      places: ['Nazareth', 'Bethlehem', 'Jerusalem'],
      scriptureLink: { book: 'luke', chapter: 1, verse: 38 }
    },
    {
      id: 'peter',
      name: 'Simon Peter',
      nameMr: 'शिमोन पेत्र',
      role: 'Apostle & Pillar of the Early Church',
      roleMr: 'मुख्य प्रेषित व आरंभीच्या मंडळीचा आधारस्तंभ',
      period: '~1 BC - 67 AD',
      summary: 'A Galilean fisherman called by Jesus to be a fisher of men. Passionate and bold, he confessed Jesus as the Christ, was restored by Jesus after his denial, and preached with power at Pentecost.',
      summaryMr: 'गालीलाचा कोळी ज्याला येशूने पाचारण केले. येशूचा ‘ख्रिस्त’ म्हणून अंगीकार करणारा, पेन्टेकॉस्टच्या दिवशी धाडसाने प्रचार करून ३,००० लोकांना विश्वासात आणणारा प्रेषित.',
      relationships: 'Brother of Andrew, disciple of Jesus, companion of John and Paul.',
      keyScriptures: 'Matthew 16:13-19, Luke 22:31-34, John 21:15-19, Acts 2:14-41',
      places: ['Sea of Galilee', 'Capernaum', 'Jerusalem', 'Antioch', 'Rome'],
      scriptureLink: { book: 'matthew', chapter: 16, verse: 16 }
    },
    {
      id: 'paul',
      name: 'Apostle Paul',
      nameMr: 'प्रेषित पौल',
      role: 'Apostle to the Gentiles & Theologian',
      roleMr: 'परराष्ट्रीयांचा प्रेषित व थोर लेखक',
      period: '~5 - 67 AD',
      summary: 'Originally Saul of Tarsus, a zealous persecutor of Christians. Transformed through a blinding encounter with the risen Christ on the road to Damascus, becoming the foremost missionary and letter writer.',
      summaryMr: 'मूळचा तार्सूचा शौल, जो ख्रिस्ती लोकांचा छळ करत होता. दमास्कसच्या वाटेवर पुनरुत्थित ख्रिस्ताच्या दर्शनाने त्याचे संपूर्ण जीवन बदलले. त्याने तीन महान मिशनरी यात्रा केल्या.',
      relationships: 'Trained under Gamaliel, co-worker with Barnabas, mentor to Timothy and Titus.',
      keyScriptures: 'Acts 9:1-19, Romans 8:31-39, Galatians 2:20, Philippians 3:7-14, 2 Timothy 4:7-8',
      places: ['Tarsus', 'Damascus', 'Jerusalem', 'Antioch', 'Ephesus', 'Corinth', 'Rome'],
      scriptureLink: { book: 'romans', chapter: 8, verse: 31 }
    }
  ];

  const BIBLE_PLACES_DATA = [
    {
      id: 'jerusalem',
      name: 'Jerusalem',
      nameMr: 'यरुशलेम (सियोन)',
      region: 'Judean Hill Country',
      significance: 'The City of God & Capital of Israel',
      significanceMr: 'देवाचे नगर व इस्राएलची राजधानी',
      desc: 'Built upon Mount Zion and Mount Moriah. Site of Abraham’s sacrifice, David’s palace, Solomon’s magnificent Temple, and the crucifixion, resurrection, and ascension of Jesus Christ.',
      descMr: 'सियोन व मोरिया डोंगरावर वसलेले पवित्र नगर. अब्राहामाचे समर्पण, दाविदाची राजधानी, शलमोनाचे मंदिर, आणि येशूचे क्रूसावरील मरण व पुनरुत्थान येथेच घडले.',
      keyScriptures: 'Psalm 122:6, Isaiah 2:3, Luke 19:41-44, Acts 2:1-4',
      scriptureLink: { book: 'psalms', chapter: 122, verse: 6 }
    },
    {
      id: 'bethlehem',
      name: 'Bethlehem',
      nameMr: 'बेथलेहेम (दाविदाचे नगर)',
      region: 'Judea (5 miles south of Jerusalem)',
      significance: 'Birthplace of David and Jesus Christ',
      significanceMr: 'राजा दावीद व येशू ख्रिस्ताचे जन्मस्थान',
      desc: 'Means "House of Bread". The ancient pastoral town where Ruth met Boaz, David was anointed king, and the Messiah was born in a humble manger in fulfillment of Micah 5:2.',
      descMr: '‘बेथलेहेम’ म्हणजे भाकरीचे घर. रूथ आणि बोवाज यांची कथा, दाविदाचे बालपण, आणि मीखा संदेष्ट्याच्या भाकितानुसार प्रभू येशूचा जन्म याच गावात झाला.',
      keyScriptures: 'Micah 5:2, Luke 2:1-7, Matthew 2:1-6',
      scriptureLink: { book: 'luke', chapter: 2, verse: 4 }
    },
    {
      id: 'nazareth',
      name: 'Nazareth',
      nameMr: 'नाझरेथ',
      region: 'Lower Galilee',
      significance: 'Boyhood Home of Jesus',
      significanceMr: 'येशूचे बालपण व वाढण्याचे गाव',
      desc: 'A secluded hillside village in Galilee where the angel Gabriel announced the conception of Christ to Mary, and where Jesus grew in wisdom and stature before beginning His public ministry.',
      descMr: 'गालीलातील एक लहान टेकडीवरील गाव. येथे देवदूताने मरियाला सुवार्ता दिली आणि येशूने आपले बालपण व तारुण्य येथेच व्यतीत केले.',
      keyScriptures: 'Luke 1:26, Luke 2:51-52, Luke 4:16-30',
      scriptureLink: { book: 'luke', chapter: 4, verse: 16 }
    },
    {
      id: 'galilee',
      name: 'Sea of Galilee',
      nameMr: 'गालीलचा समुद्र (किन्नेरेथ)',
      region: 'Northern Israel',
      significance: 'Heart of Jesus’ Teaching and Miracles',
      significanceMr: 'येशूच्या सेवेचे व चमत्कारांचे केंद्रस्थान',
      desc: 'A freshwater lake surrounded by rolling hills. Location of Christ calming the storm, walking upon the water, feeding the 5,000, and teaching from fishermen’s boats.',
      descMr: 'एक गोड्या पाण्याचे तळे. येशूने येथे वादळ शांत केले, पाण्यावर चालला, ५,००० लोकांना जेऊ घातले, आणि प्रेषितांना ‘माणसे धरणारे कोळी’ केले.',
      keyScriptures: 'Matthew 4:18-22, Mark 4:35-41, John 6:1-14, John 21:1-14',
      scriptureLink: { book: 'matthew', chapter: 4, verse: 18 }
    },
    {
      id: 'capernaum',
      name: 'Capernaum',
      nameMr: 'कफर्णहूम',
      region: 'Northwest shore of Sea of Galilee',
      significance: 'Jesus’ Ministry Headquarters',
      significanceMr: 'येशूच्या सार्वजनिक सेवेचे मुख्यालय',
      desc: 'The fishing town where Peter lived, and which served as the operational home base for Jesus during His Galilean ministry, witnessing numerous healings and teachings in its synagogue.',
      descMr: 'पेत्राचे राहण्याचे ठिकाण आणि गालीलातील येशूच्या सेवेचे मुख्य केंद्र. येशूने या गावातील सभास्थानात अनेक आजारी लोकांना बरे केले व उपदेश केला.',
      keyScriptures: 'Matthew 4:13, Mark 2:1-12, Luke 7:1-10',
      scriptureLink: { book: 'mark', chapter: 2, verse: 1 }
    },
    {
      id: 'sinai',
      name: 'Mount Sinai (Horeb)',
      nameMr: 'सीनाय पर्वत (होरेब)',
      region: 'Sinai Peninsula',
      significance: 'Mountain of the Law and the Presence',
      significanceMr: 'नियमशास्त्र व देवाच्या उपस्थितीचा पवित्र पर्वत',
      desc: 'The rugged granite mountain where God revealed His holy name ("I AM WHO I AM") to Moses in the burning bush, and later descended in fire, smoke, and thunder to deliver the Ten Commandments.',
      descMr: 'जिथे देवाने मोशेला ज्वलंत झुडूपात दर्शन दिले आणि इस्राएल लोकांशी करार करून आपल्या हातांनी लिहिलेल्या दगडी पाट्यांवर १० आज्ञा दिल्या.',
      keyScriptures: 'Exodus 3:1-6, Exodus 19:16-20, Exodus 20:1-17, 1 Kings 19:8-12',
      scriptureLink: { book: 'exodus', chapter: 19, verse: 18 }
    },
    {
      id: 'babylon',
      name: 'Babylon',
      nameMr: 'बाबेल',
      region: 'Mesopotamia (Modern Iraq, Euphrates River)',
      significance: 'Place of Exile and Symbolic Worldly Empire',
      significanceMr: 'इस्राएलचा बंदिवास व जगाच्या वैभवाचे प्रतीक',
      desc: 'The majestic ancient imperial city that destroyed Jerusalem in 586 BC. Where Daniel stood in the lions’ den, and where the faithful wept "by the rivers of Babylon" awaiting restoration.',
      descMr: 'इ.स.पू. ५८६ मध्ये यरुशलेमचा विध्वंस करणारे बलाढ्य साम्राज्य. दानीएल आणि त्याचे मित्र येथेच विश्वासू राहिले आणि स्तोत्रकर्त्यांनी बंदिवासात देवाची आठवण केली.',
      keyScriptures: 'Psalm 137:1-4, Daniel 1-6, Jeremiah 29:1-14',
      scriptureLink: { book: 'psalms', chapter: 137, verse: 1 }
    },
    {
      id: 'rome',
      name: 'Rome',
      nameMr: 'रोम',
      region: 'Italy (Heart of the Roman Empire)',
      significance: 'Apostolic Destination and Ultimate Martyrdom',
      significanceMr: 'रोमन साम्राज्याची राजधानी व प्रेषितांचे कार्यक्षेत्र',
      desc: 'The imperial capital where the Gospel penetrated Caesar’s household. Paul lived here under house arrest preaching unhindered (Acts 28), and both Peter and Paul were ultimately martyred here under Nero.',
      descMr: 'रोमन साम्राज्याची राजधानी. प्रेषित पौलाने कैदी असतानाही येथे निडरपणे देवाच्या राज्याचा प्रचार केला आणि पेत्र व पौल यांनी येथेच आपल्या विश्वासासाठी हौतात्म्य पत्करले.',
      keyScriptures: 'Acts 28:16-31, Romans 1:7-15, Philippians 1:12-14',
      scriptureLink: { book: 'acts', chapter: 28, verse: 30 }
    }
  ];

  // 5. BIBLE GENRES DATA
  const BIBLE_GENRES_DATA = [
    {
      id: 'law',
      name: 'Law (Pentateuch / Torah)',
      nameMr: 'नियमशास्त्र (तोराह)',
      description: 'Foundational historical narratives and covenantal commandments laying the groundwork for God’s relationship with His people.',
      purpose: 'To reveal God’s holiness, establish His covenant, define sin, and set apart a people for His glory.',
      examples: 'Genesis, Exodus, Leviticus, Numbers, Deuteronomy',
      howToRead: 'Look for God’s holy character, the trajectory toward redemption, and the spiritual principles behind the sacrificial and civil laws.',
      accent: '#c59b27'
    },
    {
      id: 'history',
      name: 'Historical Books',
      nameMr: 'ऐतिहासिक ग्रंथ',
      description: 'True chronological accounts of God’s dealings with Israel through conquest, monarchy, failure, exile, and restoration.',
      purpose: 'To demonstrate God’s unwavering covenant faithfulness across centuries despite human frailty and unfaithfulness.',
      examples: 'Joshua, Judges, 1 & 2 Samuel, 1 & 2 Kings, Ezra, Nehemiah',
      howToRead: 'Read narratively. Observe how human choices yield consequences, and identify God as the true hero operating behind history.',
      accent: '#2d4a3e'
    },
    {
      id: 'poetry',
      name: 'Poetry & Songs',
      nameMr: 'काव्य व गीते',
      description: 'Emotion-filled liturgical hymns, prayers, and meditations expressing the deepest yearnings, laments, and praises of the human spirit.',
      purpose: 'To provide God’s people with inspired language for prayer, worship, mourning, and thanksgiving in all seasons.',
      examples: 'Psalms, Song of Solomon, Lamentations',
      howToRead: 'Notice poetic parallelism (ideas echoing, contrasting, or intensifying), vivid metaphors, and honest emotional vulnerability.',
      accent: '#8c5030'
    },
    {
      id: 'wisdom',
      name: 'Wisdom Literature',
      nameMr: 'ज्ञानसाहित्य',
      description: 'Philosophical and practical guidance for navigating the moral and experiential complexities of life in a fallen world.',
      purpose: 'To teach the fear of the Lord, impart moral discernment, and wrestle honestly with suffering and purpose.',
      examples: 'Job, Proverbs, Ecclesiastes',
      howToRead: 'Proverbs provide general principles for wise living, not unconditional guarantees. Read Job and Ecclesiastes as contemplative journeys.',
      accent: '#4a3b63'
    },
    {
      id: 'prophets',
      name: 'Prophecy (Major & Minor)',
      nameMr: 'संदेश व भाकीते',
      description: 'Covenant enforcement messages spoken by messengers sent to call backsliders to repentance and announce future messianic restoration.',
      purpose: 'To confront social injustice and idolatry, proclaim divine judgment, and spark hope for the coming Messiah.',
      examples: 'Isaiah, Jeremiah, Ezekiel, Daniel, Hosea, Micah',
      howToRead: 'Distinguish between "forth-telling" (speaking to their immediate historical audience) and "fore-telling" (prophesying Christ and the future).',
      accent: '#9e2a2b'
    },
    {
      id: 'gospels',
      name: 'The Gospels',
      nameMr: 'शुभवर्तमाने',
      description: 'Four complementary theological portraits of the life, teachings, miracles, sacrificial death, and bodily resurrection of Jesus Christ.',
      purpose: 'To bring readers to saving faith in Jesus Christ as Lord and Savior and train them as His disciples.',
      examples: 'Matthew, Mark, Luke, John',
      howToRead: 'Read in light of Old Testament fulfillment. Observe both Jesus’ actions and teachings, and let Him confront your worldview.',
      accent: '#1e3a5f'
    },
    {
      id: 'acts',
      name: 'Acts of the Apostles',
      nameMr: 'प्रेषितांची कृत्ये',
      description: 'Historical sequel to the Gospels documenting the Holy Spirit’s empowerment of the early church to take the Gospel to the nations.',
      purpose: 'To show how the resurrected Christ continues His work through the Spirit, breaking cultural and geographic boundaries.',
      examples: 'Acts',
      howToRead: 'Distinguish between descriptive events (what happened historically) and prescriptive commands (what every Christian must do).',
      accent: '#0d9488'
    },
    {
      id: 'letters',
      name: 'Epistles (Letters)',
      nameMr: 'प्रेषितांची पत्रे',
      description: 'Doctrinal and pastoral correspondence written by apostles to specific local churches and leaders facing concrete situations.',
      purpose: 'To explain the theology of the cross and resurrection and guide Christians into holy, unified, loving community.',
      examples: 'Romans, Corinthians, Ephesians, Philippians, Hebrews, James',
      howToRead: 'Read paragraphs in context. Identify the original occasion/problem, extract the timeless theological truth, and apply it today.',
      accent: '#334155'
    },
    {
      id: 'apocalyptic',
      name: 'Apocalyptic Literature',
      nameMr: 'प्रकटीकरण व दृष्टांत',
      description: 'Vivid symbolic visions unveiling the spiritual realities behind earthly struggles and guaranteeing God’s ultimate victory.',
      purpose: 'To comfort and bolster persecuted believers by revealing that the Lamb has conquered and evil’s days are numbered.',
      examples: 'Revelation, parts of Daniel and Zechariah',
      howToRead: 'Do not read woodenly or with modern charts. Appreciate the rich symbolic imagery rooted in Old Testament allusions.',
      accent: '#701a75'
    }
  ];

  // 6. HISTORY & TRANSMISSION DATA
  const BIBLE_HISTORY_TRANSMISSION_DATA = [
    {
      stage: '01',
      title: 'Ancient Scrolls & Clay Tablets',
      titleMr: 'प्राचीन गुंडाळ्या व मातीची पत्रके',
      period: '~1400 - 300 BC',
      desc: 'Scripture was originally recorded on animal skins (parchment/vellum) and reeds from the Nile River (papyrus). Long strips were sewn together and rolled around wooden rods as sacred scrolls.',
      descMr: 'सुरुवातीला पवित्र शास्त्र जनावरांच्या चामड्यांवर (पार्चमेंट) आणि नाईल नदीकाठच्या झाडांपासून बनवलेल्या कागदावर (पपायरस) हाताने लिहिले जायचे. हे लांब पट्ट्यांवर लिहून गुंडाळ्या बनवल्या जात असत.',
      details: 'Scribes treated every word with immense reverence. Jewish Soferim counted every letter and word to guarantee zero error in transmission.'
    },
    {
      stage: '02',
      title: 'The Dead Sea Scrolls (Qumran, 1947)',
      titleMr: 'मृत समुद्रातील हस्तलिखिते (कुमरान, १९४७)',
      period: '~250 BC - 68 AD',
      desc: 'In 1947, Bedouin shepherds discovered ancient clay jars in caves near the Dead Sea containing biblical manuscripts over 1,000 years older than any previously known Hebrew texts.',
      descMr: '१९४७ मध्ये मृत समुद्राजवळील गुहांमध्ये मेंढपाळांना मातीच्या भांड्यात प्राचीन हस्तलिखिते सापडली. ही हस्तलिखिते पूर्वी उपलब्ध असलेल्या प्रतींपेक्षा १००० वर्षे अधिक जुनी होती.',
      details: 'The Great Isaiah Scroll was found virtually identical to the texts translated in modern Bibles, proving the breathtaking fidelity of manuscript copying.'
    },
    {
      stage: '03',
      title: 'The Codex Revolution',
      titleMr: 'कोडेक्स क्रांती (पुस्तकांचे रूप)',
      period: '~100 - 400 AD',
      desc: 'Early Christians were among the very first to adopt the "codex" (bound pages with folded leaves) rather than cumbersome scrolls. This allowed all four Gospels or Paul’s letters to fit in one portable volume.',
      descMr: 'आरंभीच्या ख्रिस्ती लोकांनी गुंडाळ्यांऐवजी पानांचे पुस्तक (कोडेक्स) वापरण्याची क्रांती केली. यामुळे चारही शुभवर्तमाने किंवा पौलाची सर्व पत्रे एकाच पुस्तकात बाळगणे शक्य झाले.',
      details: 'Great fourth-century parchment bibles like Codex Sinaiticus and Codex Vaticanus survive today, preserving the complete Greek New Testament.'
    },
    {
      stage: '04',
      title: 'Early Translations (Septuagint & Vulgate)',
      titleMr: 'आरंभीची भाषांतरे (सप्तती व व्हल्गेट)',
      period: '~250 BC - 405 AD',
      desc: 'The Old Testament was translated into Greek around 250 BC in Alexandria, Egypt (known as the Septuagint or LXX). In 382-405 AD, Jerome translated the entire Bible into everyday Latin (the Latin Vulgate).',
      descMr: 'इ.स.पू. २५० मध्ये अलेक्झांड्रिया येथे जुन्या कराराचे ग्रीक भाषेत भाषांतर झाले (ज्याला सप्तती किंवा LXX म्हणतात). पुढे ३८२-४०५ मध्ये जेरोमने संपूर्ण बायबलचे लॅटिन भाषेत भाषांतर केले.',
      details: 'The Septuagint was the Bible quoted directly by Jesus and the Apostles throughout the New Testament.'
    },
    {
      stage: '05',
      title: 'The Printing Press & Reformation',
      titleMr: 'मुद्रण यंत्र व सुधारणा पर्व',
      period: '1455 - 1611 AD',
      desc: 'In 1455, Johannes Gutenberg invented the movable-type printing press in Mainz, Germany. His very first printed book was the Latin Bible. For the first time in history, Scripture could be duplicated rapidly.',
      descMr: '१४५५ मध्ये जोहान्स गुटेनबर्गने मुद्रण यंत्राचा शोध लावला. त्याने छापलेले पहिले पुस्तक बायबल होते. यामुळे बायबल सर्वसामान्य लोकांपर्यंत पोहोचू लागले.',
      details: 'William Tyndale translated the Bible from Greek & Hebrew directly into English (1526), leading directly to the influential King James Bible (1611).'
    },
    {
      stage: '06',
      title: 'The Marathi Bible & Modern Translations',
      titleMr: 'मराठी बायबलचा इतिहास व आधुनिक भाषांतरे',
      period: '1811 - Present',
      desc: 'The first Marathi New Testament was translated in 1811 by Dr. William Carey and his team at Serampore, West Bengal. Later, scholars including Baba Padmanji contributed immensely to the modern Marathi Bible translation now preserved by the Bible Society of India (BSI).',
      descMr: '१८११ मध्ये डॉ. विल्यम केरी यांनी श्रीरामपूर येथे पहिल्यांदा मराठीत नवा करार भाषांतरित केला. नंतर बाबा पदमनजी आणि इतर विद्वानांनी उत्कृष्ट कार्य केले, ज्याचे रूप आज ‘बायबल सोसायटी ऑफ इंडिया’ (BSI) द्वारे आपल्या हातात आहे.',
      details: 'Today, the complete Bible has been translated into over 730 languages, with portions in more than 3,600 languages worldwide.'
    }
  ];

  // 7. LANGUAGES OF SCRIPTURE DATA
  const BIBLE_LANGUAGES_DATA = [
    {
      id: 'hebrew',
      name: 'Biblical Hebrew',
      nameMr: 'पवित्र हिब्रू भाषा',
      script: 'עִבְרִית (Ivrit)',
      portion: 'Almost the entire Old Testament (39 books)',
      portionMr: 'संपूर्ण जुना करार (काही लहान परिच्छेद वगळता)',
      nature: 'A semitic, highly pictorial, concrete, and verb-centered language. Words are formed from three-letter consonant roots.',
      significance: 'Hebrew paints vivid word-pictures. Rather than abstract philosophical definitions, it describes God through action, nature, and covenant relationship.',
      examples: [
        { term: 'Bereshit (בְּרֵאשִׁית)', meaning: 'In the beginning', ref: 'Genesis 1:1' },
        { term: 'Shalom (שָׁלוֹם)', meaning: 'Wholeness, peace, total wellbeing, flourishing', ref: 'Numbers 6:26' },
        { term: 'Hesed (חֶסֶד)', meaning: 'Steadfast, loyal, unfailing covenant love', ref: 'Psalm 136:1' },
        { term: 'Yahweh (יהוה)', meaning: 'I AM WHO I AM — God’s personal, eternal covenant name', ref: 'Exodus 3:14' }
      ]
    },
    {
      id: 'aramaic',
      name: 'Aramaic',
      nameMr: 'अरामी भाषा',
      script: 'ܐܪܡܝܐ / אֲרָמִית',
      portion: 'Portions of Daniel (2:4b–7:28), Ezra (4:8–6:18, 7:12–26), Genesis 31:47, and spoken words of Jesus',
      portionMr: 'दानीएल व एज्रा यांची काही प्रकरणे, आणि प्रत्यक्ष येशूने बोललेले काही शब्द',
      nature: 'The international diplomatic and trade language of the ancient Near East during the Babylonian and Persian empires. The daily spoken mother tongue of Jesus.',
      significance: 'Jesus spoke Aramaic in His daily life. The Gospel writers preserved His exact Aramaic words at moments of intense intimacy and spiritual power.',
      examples: [
        { term: 'Abba (אַבָּא)', meaning: 'Father (warm, trusting intimacy of a child)', ref: 'Mark 14:36, Romans 8:15' },
        { term: 'Talitha Koum (טַלִיתָא קוּמי)', meaning: 'Little girl, I say to you, arise!', ref: 'Mark 5:41' },
        { term: 'Maranatha (מרנא תא)', meaning: 'Our Lord, come!', ref: '1 Corinthians 16:22' },
        { term: 'Eloi, Eloi, lema sabachthani', meaning: 'My God, my God, why have you forsaken me?', ref: 'Mark 15:34' }
      ]
    },
    {
      id: 'greek',
      name: 'Koine Greek',
      nameMr: 'कोईने ग्रीक भाषा',
      script: 'Ἑλληνική (Koine)',
      portion: 'The entire New Testament (27 books)',
      portionMr: 'संपूर्ण नवा करार (२७ पुस्तके)',
      nature: 'The common, international Greek spoken across the Roman Empire following Alexander the Great. Known for exquisite grammatical precision, nuanced prepositions, and verbal tenses.',
      significance: 'Its incredible precision enabled the early apostles to articulate complex theological truths—such as the Trinity, justification, and the dual nature of Christ—with absolute clarity.',
      examples: [
        { term: 'Logos (Λόγος)', meaning: 'The Word, the divine reason and eternal expression of God', ref: 'John 1:1' },
        { term: 'Agape (Ἀγάπη)', meaning: 'Selfless, sacrificial, unconditional divine love', ref: '1 Corinthians 13:4' },
        { term: 'Charis (Χάρις)', meaning: 'Unmerited grace, divine favor', ref: 'Ephesians 2:8' },
        { term: 'Theopneustos (Θεόπνευστος)', meaning: 'God-breathed (divinely inspired)', ref: '2 Timothy 3:16' }
      ]
    }
  ];

  // 8. HOW TO READ / OIA METHOD DATA
  const BIBLE_OIA_DATA = {
    title: 'The Inductive Bible Study Method',
    titleMr: 'बायबल अभ्यासाची ओ.आय.ए. पद्धत',
    subtitle: 'Observe • Interpret • Apply (निरीक्षण • अर्थबोध • आचरण)',
    lead: 'Reading the Bible effectively is not about skimming for emotional comfort; it is about discovering what God actually communicated through the author, understanding the context, and letting the truth transform daily character.',
    leadMr: 'बायबल वाचणे म्हणजे केवळ वरवर वाचन करणे नव्हे, तर देवाने लेखकाद्वारे काय संदेश दिला हे समजून घेऊन त्यानुसार जीवन बदलणे होय.',
    steps: [
      {
        step: '01',
        name: 'OBSERVE',
        nameMr: 'निरीक्षण (काय लिहिले आहे?)',
        question: 'What does the text actually say?',
        questionMr: 'वचनात प्रत्यक्ष काय सांगितले आहे?',
        icon: '🔍',
        guidelines: [
          'Ask the classic reporter questions: Who? What? Where? When? Why?',
          'Notice repeated words, contrasts ("but", "however"), and comparisons ("like", "as").',
          'Look for transition words indicating cause and effect: "therefore", "for", "so that".',
          'Pay close attention to who is speaking, who is being addressed, and the historical setting.'
        ]
      },
      {
        step: '02',
        name: 'INTERPRET',
        nameMr: 'अर्थबोध (याचा खरा अर्थ काय?)',
        question: 'What did it mean to the original audience?',
        questionMr: 'त्या काळातील मूळ श्रोत्यांसाठी याचा अर्थ काय होता?',
        icon: '💡',
        guidelines: [
          'Context is king: Never isolate a verse from its surrounding paragraph or book.',
          'Consider the cultural customs, geography, and historical crisis of the original readers.',
          'Use Scripture to interpret Scripture: clearer passages shed light on complex passages.',
          'Determine the timeless universal principle that transcends cultural specifics.'
        ]
      },
      {
        step: '03',
        name: 'APPLY',
        nameMr: 'आचरण (माझ्या जीवनात काय बदल?)',
        question: 'How should this truth shape my life today?',
        questionMr: 'हे सत्य आज माझ्या विचारात व वर्तनात कसे उतरावे?',
        icon: '🌱',
        guidelines: [
          'Is there an example to follow or a sin to confess and forsake?',
          'Is there a promise of God to claim with confident faith?',
          'Is there a command to obey today in my family, speech, or workplace?',
          'What new truth does this reveal about God the Father, Son, or Holy Spirit?'
        ]
      }
    ],
    workshop: {
      passageRef: 'Philippians 4:6–7',
      passageText: '“Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God. And the peace of God, which surpasses all understanding, will guard your hearts and your minds in Christ Jesus.”',
      passageTextMr: '“कशाविषयीही चिंता करू नका; परंतु सर्व गोष्टींविषयी प्रार्थना व विनंती करून आभारप्रदर्शनासह आपल्या मागण्या देवाला कळवा. म्हणजे देवाकडून मिळणारी शांती जी सर्व बुद्धीच्या पलीकडची आहे, ती तुमच्या हृदयांचे व विचारांचे ख्रिस्त येशूमध्ये रक्षण करेल.”',
      observeExample: 'Repeated words: "everything", "prayer", "peace". Direct contrast: Anxiety vs. Prayer with thanksgiving.',
      interpretExample: 'Paul wrote this from a cold Roman prison cell. Peace is not the absence of trouble, but a supernatural military guard protecting our inner spirit through Christ.',
      applyExample: 'Identify today’s biggest anxiety. Hand it specifically to God in prayer right now with genuine thankfulness.'
    }
  };

  // --- SUB-NAVIGATION ENGINE ---

  function studyNavigateTo(viewName, params = {}) {
    if (studyState.currentView !== viewName) {
      studyState.historyStack.push({ view: studyState.currentView, params: { ...studyState.params } });
    }
    studyState.currentView = viewName;
    studyState.params = params;
    renderCurrentStudyView();
    
    // Scroll container to top
    const cont = document.getElementById('study-view-scroll-content');
    if (cont) cont.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function studyGoBack() {
    if (studyState.historyStack.length > 0) {
      const prev = studyState.historyStack.pop();
      studyState.currentView = prev.view;
      studyState.params = prev.params;
      renderCurrentStudyView();
      const cont = document.getElementById('study-view-scroll-content');
      if (cont) cont.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      studyNavigateTo('home');
    }
  }

  function renderCurrentStudyView() {
    const root = document.getElementById('bible-study-dynamic-container');
    if (!root) return;

    switch (studyState.currentView) {
      case 'home':
        root.innerHTML = renderStudyHomeHtml();
        break;
      case 'lesson':
        root.innerHTML = renderLessonHtml(studyState.params.lessonId || 'what-is-the-bible');
        break;
      case 'books':
        root.innerHTML = render66BooksExplorerHtml(studyState.params.testament || 'ALL', studyState.params.genre || 'ALL');
        break;
      case 'book-detail':
        root.innerHTML = renderBookDetailHtml(studyState.params.bookKey || 'genesis');
        break;
      case 'timeline':
        root.innerHTML = renderTimelineHtml(studyState.params.eventId || 'creation');
        break;
      case 'people-places':
        root.innerHTML = renderPeoplePlacesHtml(studyState.params.subTab || 'people', studyState.params.query || '');
        break;
      case 'person-detail':
        root.innerHTML = renderPersonDetailHtml(studyState.params.personId || 'abraham');
        break;
      case 'place-detail':
        root.innerHTML = renderPlaceDetailHtml(studyState.params.placeId || 'jerusalem');
        break;
      case 'genres':
        root.innerHTML = renderGenresHtml(studyState.params.genreId || null);
        break;
      case 'transmission':
        root.innerHTML = renderTransmissionHtml();
        break;
      case 'languages':
        root.innerHTML = renderLanguagesHtml(studyState.params.langId || 'hebrew');
        break;
      case 'oia':
        root.innerHTML = renderOiaHtml();
        break;
      default:
        root.innerHTML = renderStudyHomeHtml();
        break;
    }
  }

  // --- HTML GENERATORS ---

  // Breadcrumb / Back Bar
  function renderSubHeader(title, subtitle) {
    return `
      <div class="study-nav-topbar">
        <button class="study-back-btn" onclick="BibleStudy.goBack()" aria-label="Go Back">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.3">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          <span>Back</span>
        </button>
        <div class="study-topbar-headings">
          <h2 class="study-topbar-title">${title}</h2>
          ${subtitle ? `<span class="study-topbar-sub">${subtitle}</span>` : ''}
        </div>
      </div>
    `;
  }

  // 1. STUDY HOME VIEW
  function renderStudyHomeHtml() {
    return `
      <div class="study-home-wrapper">
        
        <!-- Sanctuary Museum Hero Banner -->
        <header class="study-museum-hero">
          <div class="study-hero-crest">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
          </div>
          <h1 class="study-museum-title">Bible Study</h1>
          <p class="study-museum-subtitle">Discover the story behind Scripture</p>
          <span class="study-museum-sub-mr">पवित्र शास्त्रामागील सत्य, इतिहास व आध्यात्मिक पाया समजून घ्या</span>
        </header>

        <!-- Prominent START HERE Featured Card -->
        <section class="study-featured-section">
          <div class="study-featured-card" onclick="BibleStudy.navigateTo('lesson', { lessonId: 'what-is-the-bible' })">
            <div class="study-featured-badge-row">
              <span class="study-pill-gold">START HERE • येथून सुरुवात करा</span>
              <span class="study-meta-pill">⏱ 5 min • Beginner</span>
            </div>
            <h2 class="study-featured-title">What Is the Bible?</h2>
            <p class="study-featured-quote">
              “Discover how Scripture is structured, where it came from, and how its 66 books tell one unfolding story of redemption.”
            </p>
            <div class="study-featured-action-row">
              <span class="study-read-link">Begin Lesson &rarr;</span>
            </div>
          </div>
        </section>

        <!-- EXPLORE SCRIPTURE SECTION -->
        <section class="study-category-group">
          <div class="study-category-header">
            <span class="study-section-tag">EXPLORE SCRIPTURE</span>
            <h3 class="study-section-title">Explore Scripture • पवित्र शास्त्र शोधन</h3>
            <p class="study-section-desc">Journey through the books, historical eras, and figures of the biblical world.</p>
          </div>

          <div class="study-cards-grid">
            <!-- Card 1: 66 Books -->
            <div class="study-card study-card-parchment" onclick="BibleStudy.navigateTo('books')">
              <div class="study-card-icon-box">
                <span style="font-size: 24px;">📚</span>
              </div>
              <h4 class="study-card-title">66 Books</h4>
              <p class="study-card-desc">Explore every book of the Bible with chapter outlines, themes, and historical context.</p>
              <span class="study-card-link">Explore Books &rarr;</span>
            </div>

            <!-- Card 2: Bible Timeline -->
            <div class="study-card study-card-parchment" onclick="BibleStudy.navigateTo('timeline')">
              <div class="study-card-icon-box">
                <span style="font-size: 24px;">⏳</span>
              </div>
              <h4 class="study-card-title">Bible Timeline</h4>
              <p class="study-card-desc">Follow the story of redemption from Creation and Abraham through the Exile to Jesus and Revelation.</p>
              <span class="study-card-link">Follow the Story &rarr;</span>
            </div>

            <!-- Card 3: People & Places -->
            <div class="study-card study-card-parchment" onclick="BibleStudy.navigateTo('people-places')">
              <div class="study-card-icon-box">
                <span style="font-size: 24px;">🗺️</span>
              </div>
              <h4 class="study-card-title">People & Places</h4>
              <p class="study-card-desc">Discover the faithful men, women, and sacred biblical cities behind God’s unfolding covenants.</p>
              <span class="study-card-link">Discover Heritage &rarr;</span>
            </div>
          </div>
        </section>

        <!-- UNDERSTAND SCRIPTURE SECTION -->
        <section class="study-category-group" style="margin-top: 36px;">
          <div class="study-category-header">
            <span class="study-section-tag">UNDERSTAND SCRIPTURE</span>
            <h3 class="study-section-title">Understand Scripture • शास्त्र समजून घेणे</h3>
            <p class="study-section-desc">Scholarly foundations, original languages, and contextual reading frameworks.</p>
          </div>

          <div class="study-cards-grid study-cards-grid-2x2">
            <!-- Card 1: How to Read the Bible (OIA) -->
            <div class="study-card study-card-parchment" onclick="BibleStudy.navigateTo('oia')">
              <div class="study-card-icon-box">
                <span style="font-size: 24px;">🔍</span>
              </div>
              <h4 class="study-card-title">How to Read the Bible</h4>
              <p class="study-card-desc">Master the time-tested Inductive Method: Observe, Interpret, and Apply Scripture with clarity.</p>
              <span class="study-card-link">Learn OIA Method &rarr;</span>
            </div>

            <!-- Card 2: History & Transmission -->
            <div class="study-card study-card-parchment" onclick="BibleStudy.navigateTo('transmission')">
              <div class="study-card-icon-box">
                <span style="font-size: 24px;">📜</span>
              </div>
              <h4 class="study-card-title">History & Transmission</h4>
              <p class="study-card-desc">Trace the remarkable journey of Scripture from papyrus scrolls and Dead Sea caves to modern translations.</p>
              <span class="study-card-link">Trace Manuscript Journey &rarr;</span>
            </div>

            <!-- Card 3: Bible Genres -->
            <div class="study-card study-card-parchment" onclick="BibleStudy.navigateTo('genres')">
              <div class="study-card-icon-box">
                <span style="font-size: 24px;">🎭</span>
              </div>
              <h4 class="study-card-title">Bible Genres</h4>
              <p class="study-card-desc">Understand how Law, Poetry, Wisdom, Prophecy, Gospels, and Letters communicate distinct truths.</p>
              <span class="study-card-link">View Genre Guide &rarr;</span>
            </div>

            <!-- Card 4: Bible Languages -->
            <div class="study-card study-card-parchment" onclick="BibleStudy.navigateTo('languages')">
              <div class="study-card-icon-box">
                <span style="font-size: 24px;">🔤</span>
              </div>
              <h4 class="study-card-title">Bible Languages</h4>
              <p class="study-card-desc">Explore Hebrew, Aramaic, and Greek—the original languages in which the holy scriptures were breathed.</p>
              <span class="study-card-link">Explore Languages &rarr;</span>
            </div>
          </div>
        </section>

      </div>
    `;
  }

  // 2. LESSON VIEW ("What Is the Bible?")
  function renderLessonHtml(lessonId) {
    const lesson = BIBLE_STUDY_LESSONS[lessonId] || BIBLE_STUDY_LESSONS['what-is-the-bible'];
    return `
      <div class="study-lesson-container">
        ${renderSubHeader('Lesson', lesson.category)}

        <div class="study-lesson-hero-card">
          <div class="study-lesson-meta-bar">
            <span class="study-pill-olive">${lesson.category}</span>
            <span class="study-pill-gold">⏱ ${lesson.duration} • ${lesson.level}</span>
          </div>
          <h1 class="study-lesson-main-title">${lesson.title}</h1>
          <h3 class="study-lesson-main-title-mr">${lesson.titleMr}</h3>
          <blockquote class="study-lesson-quote">${lesson.leadQuote}</blockquote>
          <p class="study-lesson-intro-text">${lesson.intro}</p>
        </div>

        <!-- Lesson Body Sections -->
        <div class="study-lesson-sections">
          ${lesson.sections.map(sec => `
            <article class="study-lesson-step-card">
              <div class="study-step-header">
                <span class="study-step-num">${sec.num}</span>
                <div class="study-step-titles">
                  <h3 class="study-step-title">${sec.title}</h3>
                  <span class="study-step-title-mr">${sec.titleMr}</span>
                </div>
              </div>

              <p class="study-step-body">${sec.content}</p>

              ${sec.metric ? `
                <div class="study-metric-box">
                  <span class="study-metric-icon">📖</span>
                  <span class="study-metric-text">${sec.metric}</span>
                </div>
              ` : ''}

              ${sec.flowSteps ? `
                <div class="study-narrative-flow">
                  ${sec.flowSteps.map((f, idx) => `
                    <div class="study-flow-node">
                      <div class="study-flow-dot">${idx + 1}</div>
                      <div class="study-flow-info">
                        <strong class="study-flow-label">${f.label} (${f.labelMr})</strong>
                        <p class="study-flow-desc">${f.desc}</p>
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              ${sec.genresGrid ? `
                <div class="study-lesson-genre-grid">
                  ${sec.genresGrid.map(g => `
                    <div class="study-mini-genre-pill">
                      <strong>${g.name}</strong>
                      <span>${g.desc}</span>
                      <small class="study-genre-examples">Examples: ${g.books}</small>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              ${sec.testamentBridge ? `
                <div class="study-testament-bridge-card">
                  <div class="study-testament-col">
                    <span class="study-testament-name">${sec.testamentBridge.ot.label}</span>
                    <div class="study-tag-cluster">
                      ${sec.testamentBridge.ot.tags.map(t => `<span class="study-tag-item">${t}</span>`).join('')}
                    </div>
                  </div>
                  <div class="study-testament-connector">
                    <span class="study-connector-arrow">&darr;</span>
                    <span class="study-connector-label">${sec.testamentBridge.connector}</span>
                  </div>
                  <div class="study-testament-col">
                    <span class="study-testament-name">${sec.testamentBridge.nt.label}</span>
                    <div class="study-tag-cluster">
                      ${sec.testamentBridge.nt.tags.map(t => `<span class="study-tag-item study-tag-gold">${t}</span>`).join('')}
                    </div>
                  </div>
                </div>
              ` : ''}
            </article>
          `).join('')}
        </div>

        <!-- DID YOU KNOW? CARD -->
        <aside class="study-insight-card">
          <div class="study-insight-header">
            <span class="study-insight-icon">💡</span>
            <h4 class="study-insight-title">${lesson.insight.title}</h4>
          </div>
          <p class="study-insight-text">${lesson.insight.text}</p>
          <p class="study-insight-text-mr">${lesson.insight.textMr}</p>
        </aside>

        <!-- READ SCRIPTURE ACTION -->
        <div class="study-lesson-footer-action">
          <div class="study-footer-prompt">
            <h4>Continue into God’s Word</h4>
            <p>${lesson.readScripture.sub}</p>
          </div>
          <button class="study-btn-primary" onclick="BibleStudy.openReaderAt('${lesson.readScripture.book}', ${lesson.readScripture.chapter}, ${lesson.readScripture.verse})">
            <span>${lesson.readScripture.label}</span>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>

      </div>
    `;
  }

  // 3. 66 BOOKS EXPLORER
  function render66BooksExplorerHtml(activeTestament = 'ALL', activeGenre = 'ALL') {
    let filtered = BIBLE_BOOKS_STUDY_DATA;
    if (activeTestament !== 'ALL') {
      filtered = filtered.filter(b => b.testament === activeTestament);
    }
    if (activeGenre !== 'ALL') {
      filtered = filtered.filter(b => b.genre.toLowerCase().includes(activeGenre.toLowerCase()));
    }

    const genresList = ['ALL', 'Law', 'History', 'Poetry', 'Wisdom', 'Major Prophets', 'Minor Prophets', 'Gospels', 'Acts', 'Letters', 'Revelation'];

    return `
      <div class="study-books-explorer-view">
        ${renderSubHeader('66 Books Explorer', 'Explore the Canon of Scripture • सर्व ६६ पुस्तकांची माहिती')}

        <!-- Filter Controls -->
        <div class="study-filter-toolbar">
          <!-- Testament Toggle -->
          <div class="study-segmented-control">
            <button class="study-segment-btn ${activeTestament === 'ALL' ? 'active' : ''}" onclick="BibleStudy.filterBooks('ALL', '${activeGenre}')">All (६६)</button>
            <button class="study-segment-btn ${activeTestament === 'OT' ? 'active' : ''}" onclick="BibleStudy.filterBooks('OT', '${activeGenre}')">Old Testament (३९)</button>
            <button class="study-segment-btn ${activeTestament === 'NT' ? 'active' : ''}" onclick="BibleStudy.filterBooks('NT', '${activeGenre}')">New Testament (२७)</button>
          </div>

          <!-- Genre Filter Pills -->
          <div class="study-pills-row">
            ${genresList.map(g => `
              <button class="study-genre-pill ${activeGenre.toLowerCase() === g.toLowerCase() ? 'active' : ''}" onclick="BibleStudy.filterBooks('${activeTestament}', '${g}')">
                ${g}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Books Grid -->
        <div class="study-books-card-grid">
          ${filtered.map(b => `
            <div class="study-book-card" onclick="BibleStudy.navigateTo('book-detail', { bookKey: '${b.key}' })">
              <div class="study-book-card-top">
                <span class="study-pill-subtle">${b.testament === 'OT' ? 'Old Testament' : 'New Testament'}</span>
                <span class="study-book-genre-tag">${b.genre}</span>
              </div>
              <h3 class="study-book-card-title">${b.name} <span class="study-book-card-mr">${b.nameMr}</span></h3>
              <span class="study-book-card-meta">${b.chapters} Chapters • ${b.author}</span>
              <p class="study-book-card-summary">${b.summary}</p>
              <div class="study-book-themes-preview">
                ${b.themes.slice(0, 3).map(t => `<span class="study-mini-tag">${t}</span>`).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 4. BOOK DETAIL VIEW
  function renderBookDetailHtml(bookKey) {
    const book = BIBLE_BOOKS_STUDY_DATA.find(b => b.key === bookKey) || BIBLE_BOOKS_STUDY_DATA[0];

    return `
      <div class="study-book-detail-view">
        ${renderSubHeader(book.name, `${book.nameMr} • ${book.testament === 'OT' ? 'Old Testament' : 'New Testament'}`)}

        <div class="study-book-hero-banner">
          <div class="study-book-hero-meta">
            <span class="study-pill-gold">${book.genre}</span>
            <span class="study-pill-olive">${book.chapters} Chapters</span>
            <span class="study-pill-subtle">Author: ${book.author} (${book.date})</span>
          </div>
          <h1 class="study-book-hero-title">${book.name}</h1>
          <h2 class="study-book-hero-mr">${book.nameMr}</h2>
          <p class="study-book-hero-lead">${book.summary}</p>

          <div class="study-book-hero-actions">
            <button class="study-btn-primary" onclick="BibleStudy.openReaderAt('${book.key}', 1, 1)">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
              <span>Read ${book.name}</span>
            </button>
            <button class="study-btn-secondary" onclick="BibleStudy.navigateTo('oia')">
              <span>Study Framework</span>
            </button>
          </div>
        </div>

        <!-- Detail Sections -->
        <div class="study-book-detail-grid">
          <!-- Major Themes -->
          <div class="study-detail-box">
            <h4 class="study-box-title">Major Theological Themes • मुख्य विषय</h4>
            <ul class="study-detail-list">
              ${book.themes.map(t => `<li><strong>${t}</strong></li>`).join('')}
            </ul>
          </div>

          <!-- Key People -->
          <div class="study-detail-box">
            <h4 class="study-box-title">Key Figures • प्रमुख व्यक्ती</h4>
            <div class="study-tag-cluster">
              ${book.keyPeople.map(p => `<span class="study-tag-item">${p}</span>`).join('')}
            </div>
          </div>

          <!-- Key Historical Events -->
          <div class="study-detail-box" style="grid-column: 1 / -1;">
            <h4 class="study-box-title">Key Narrative Milestones • महत्त्वाच्या घटना</h4>
            <div class="study-milestone-chips">
              ${book.keyEvents.map(e => `
                <div class="study-milestone-pill">
                  <span class="study-milestone-dot">✦</span>
                  <span>${e}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Related Key Scripture -->
          <div class="study-detail-box" style="grid-column: 1 / -1;">
            <h4 class="study-box-title">Essential Scripture Passages • आवश्यक शास्त्रवचने</h4>
            <div class="study-scripture-ref-banner">
              <span class="study-ref-icon">📖</span>
              <span class="study-ref-text">${book.keyScripture}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 5. BIBLE TIMELINE VIEW
  function renderTimelineHtml(selectedEventId) {
    const activeEvt = BIBLE_TIMELINE_DATA.find(e => e.id === selectedEventId) || BIBLE_TIMELINE_DATA[0];

    return `
      <div class="study-timeline-view">
        ${renderSubHeader('The Story of Scripture', 'Genesis to Revelation Chronological Timeline • उत्पत्ती ते प्रकटीकरण कालपट')}

        <!-- Horizontal Timeline Stepper -->
        <div class="study-timeline-stepper">
          ${BIBLE_TIMELINE_DATA.map((evt, idx) => `
            <button class="study-timeline-node ${evt.id === activeEvt.id ? 'active' : ''}" onclick="BibleStudy.navigateTo('timeline', { eventId: '${evt.id}' })">
              <span class="study-node-num">${idx + 1}</span>
              <span class="study-node-name">${evt.name.split('(')[0]}</span>
              <span class="study-node-era">${evt.era}</span>
            </button>
          `).join('')}
        </div>

        <!-- Selected Timeline Focus Card -->
        <article class="study-timeline-focus-card">
          <div class="study-timeline-focus-header">
            <span class="study-pill-olive">${activeEvt.era}</span>
            <h2 class="study-timeline-focus-title">${activeEvt.name}</h2>
            <h4 class="study-timeline-focus-title-mr">${activeEvt.nameMr}</h4>
            <blockquote class="study-timeline-lead-quote">${activeEvt.lead}</blockquote>
          </div>

          <p class="study-timeline-desc">${activeEvt.desc}</p>
          <p class="study-timeline-desc-mr">${activeEvt.descMr}</p>

          <div class="study-timeline-details-row">
            <div class="study-sub-card">
              <h5 class="study-subcard-title">Key Figures</h5>
              <div class="study-tag-cluster">
                ${activeEvt.people.map(p => `<span class="study-tag-item">${p}</span>`).join('')}
              </div>
            </div>

            <div class="study-sub-card">
              <h5 class="study-subcard-title">Associated Books</h5>
              <div class="study-tag-cluster">
                ${activeEvt.books.map(b => `<span class="study-tag-item study-tag-gold">${b}</span>`).join('')}
              </div>
            </div>
          </div>

          <!-- Direct Scripture Link -->
          <div class="study-timeline-action-box">
            <div class="study-ref-info">
              <span>Key Anchor Passage: <strong>${activeEvt.scripture.ref}</strong></span>
            </div>
            <button class="study-btn-primary" onclick="BibleStudy.openReaderAt('${activeEvt.scripture.book}', ${activeEvt.scripture.chapter}, ${activeEvt.scripture.verse})">
              <span>Read in Bible Reader</span>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
        </article>
      </div>
    `;
  }

  // 6. PEOPLE & PLACES VIEW
  function renderPeoplePlacesHtml(subTab = 'people', query = '') {
    const isPeople = subTab === 'people';
    const qLower = query.toLowerCase().trim();

    let peopleList = BIBLE_PEOPLE_DATA;
    if (qLower && isPeople) {
      peopleList = peopleList.filter(p => p.name.toLowerCase().includes(qLower) || p.nameMr.toLowerCase().includes(qLower) || p.role.toLowerCase().includes(qLower));
    }

    let placesList = BIBLE_PLACES_DATA;
    if (qLower && !isPeople) {
      placesList = placesList.filter(p => p.name.toLowerCase().includes(qLower) || p.nameMr.toLowerCase().includes(qLower) || p.significance.toLowerCase().includes(qLower));
    }

    return `
      <div class="study-people-places-view">
        ${renderSubHeader('People & Places', 'The Geography and Figures of Faith • व्यक्ती व पवित्र स्थाने')}

        <!-- Tab Switcher & Search Row -->
        <div class="study-search-switcher-row">
          <div class="study-segmented-control">
            <button class="study-segment-btn ${isPeople ? 'active' : ''}" onclick="BibleStudy.navigateTo('people-places', { subTab: 'people' })">People • व्यक्ती (${BIBLE_PEOPLE_DATA.length})</button>
            <button class="study-segment-btn ${!isPeople ? 'active' : ''}" onclick="BibleStudy.navigateTo('people-places', { subTab: 'places' })">Places • स्थाने (${BIBLE_PLACES_DATA.length})</button>
          </div>

          <div class="study-search-input-box">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="search" placeholder="Search ${isPeople ? 'people' : 'places'}..." value="${query}" oninput="BibleStudy.searchPeoplePlaces('${subTab}', this.value)" />
          </div>
        </div>

        ${isPeople ? `
          <!-- People Grid -->
          <div class="study-people-grid">
            ${peopleList.map(p => `
              <div class="study-person-card" onclick="BibleStudy.navigateTo('person-detail', { personId: '${p.id}' })">
                <div class="study-person-badge">
                  <span>${p.period}</span>
                </div>
                <h3 class="study-person-title">${p.name} <span class="study-person-mr">${p.nameMr}</span></h3>
                <span class="study-person-role">${p.role}</span>
                <p class="study-person-summary">${p.summary}</p>
                <div class="study-person-footer">
                  <span class="study-read-link">View Profile &rarr;</span>
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <!-- Places Grid -->
          <div class="study-places-grid">
            ${placesList.map(pl => `
              <div class="study-place-card" onclick="BibleStudy.navigateTo('place-detail', { placeId: '${pl.id}' })">
                <div class="study-place-badge">
                  <span>${pl.region}</span>
                </div>
                <h3 class="study-place-title">${pl.name} <span class="study-place-mr">${pl.nameMr}</span></h3>
                <span class="study-place-sig">${pl.significance}</span>
                <p class="study-place-desc">${pl.desc}</p>
                <div class="study-place-footer">
                  <span class="study-read-link">Explore Geography &rarr;</span>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  }

  // 7. PERSON DETAIL VIEW
  function renderPersonDetailHtml(personId) {
    const person = BIBLE_PEOPLE_DATA.find(p => p.id === personId) || BIBLE_PEOPLE_DATA[0];

    return `
      <div class="study-person-detail-view">
        ${renderSubHeader(person.name, `${person.nameMr} • ${person.period}`)}

        <div class="study-profile-hero">
          <span class="study-pill-olive">${person.period}</span>
          <h1 class="study-profile-title">${person.name}</h1>
          <h3 class="study-profile-mr">${person.nameMr}</h3>
          <h4 class="study-profile-role">${person.role}</h4>
          <p class="study-profile-summary">${person.summary}</p>
          <p class="study-profile-summary-mr">${person.summaryMr}</p>
        </div>

        <div class="study-profile-grid">
          <div class="study-detail-box">
            <h4 class="study-box-title">Important Relationships</h4>
            <p>${person.relationships}</p>
          </div>

          <div class="study-detail-box">
            <h4 class="study-box-title">Key Geographical Locations</h4>
            <div class="study-tag-cluster">
              ${person.places.map(pl => `<span class="study-tag-item">${pl}</span>`).join('')}
            </div>
          </div>

          <div class="study-detail-box" style="grid-column: 1 / -1;">
            <h4 class="study-box-title">Key Scripture References</h4>
            <p><strong>${person.keyScriptures}</strong></p>
          </div>
        </div>

        <div class="study-lesson-footer-action">
          <div class="study-footer-prompt">
            <h4>Read Scripture Associated with ${person.name}</h4>
          </div>
          <button class="study-btn-primary" onclick="BibleStudy.openReaderAt('${person.scriptureLink.book}', ${person.scriptureLink.chapter}, ${person.scriptureLink.verse || 1})">
            <span>Open in Bible Reader</span>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      </div>
    `;
  }

  // 8. PLACE DETAIL VIEW
  function renderPlaceDetailHtml(placeId) {
    const place = BIBLE_PLACES_DATA.find(p => p.id === placeId) || BIBLE_PLACES_DATA[0];

    return `
      <div class="study-place-detail-view">
        ${renderSubHeader(place.name, `${place.nameMr} • ${place.region}`)}

        <div class="study-profile-hero">
          <span class="study-pill-gold">${place.region}</span>
          <h1 class="study-profile-title">${place.name}</h1>
          <h3 class="study-profile-mr">${place.nameMr}</h3>
          <h4 class="study-profile-role">${place.significance}</h4>
          <p class="study-profile-summary">${place.desc}</p>
          <p class="study-profile-summary-mr">${place.descMr}</p>
        </div>

        <div class="study-detail-box" style="margin-top: 20px;">
          <h4 class="study-box-title">Significant Scripture Passages</h4>
          <p><strong>${place.keyScriptures}</strong></p>
        </div>

        <div class="study-lesson-footer-action">
          <div class="study-footer-prompt">
            <h4>Read Passages Set in ${place.name}</h4>
          </div>
          <button class="study-btn-primary" onclick="BibleStudy.openReaderAt('${place.scriptureLink.book}', ${place.scriptureLink.chapter}, ${place.scriptureLink.verse || 1})">
            <span>Open in Bible Reader</span>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      </div>
    `;
  }

  // 9. BIBLE GENRES VIEW
  function renderGenresHtml(selectedGenreId) {
    return `
      <div class="study-genres-view">
        ${renderSubHeader('Biblical Genres', 'Understanding the Literary Forms of Scripture • साहित्यिक प्रकार')}

        <div class="study-genres-hero-card">
          <p>God chose to communicate His eternal truth through authentic human literary forms. Just as one reads a legal document differently from love poetry or personal mail, each biblical genre must be received according to its intended form to discover its true message.</p>
        </div>

        <div class="study-genres-vertical-stack">
          ${BIBLE_GENRES_DATA.map(g => `
            <article class="study-genre-card" id="genre-${g.id}">
              <div class="study-genre-header-row">
                <span class="study-genre-tag-bubble" style="background: ${g.accent};"></span>
                <div class="study-genre-titles">
                  <h3 class="study-genre-name">${g.name}</h3>
                  <span class="study-genre-mr">${g.nameMr}</span>
                </div>
              </div>
              <p class="study-genre-desc"><strong>What it is:</strong> ${g.description}</p>
              <p class="study-genre-purpose"><strong>Divine Purpose:</strong> ${g.purpose}</p>
              
              <div class="study-genre-split-info">
                <div class="study-genre-box">
                  <span class="study-genre-box-label">Example Books</span>
                  <span class="study-genre-box-val">${g.examples}</span>
                </div>
                <div class="study-genre-box">
                  <span class="study-genre-box-label">How to Approach</span>
                  <span class="study-genre-box-val">${g.howToRead}</span>
                </div>
              </div>
            </article>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 10. HISTORY & TRANSMISSION VIEW
  function renderTransmissionHtml() {
    return `
      <div class="study-transmission-view">
        ${renderSubHeader('History & Transmission', 'From Ancient Scrolls to Modern Bibles • हस्तलिखितांचा इतिहास')}

        <div class="study-transmission-hero">
          <p>How did the 66 books of the Bible survive thousands of years across wars, persecutions, and linguistic changes to arrive intact in our hands today? Explore the miraculous historical preservation of Scripture.</p>
        </div>

        <div class="study-transmission-timeline">
          ${BIBLE_HISTORY_TRANSMISSION_DATA.map(s => `
            <div class="study-transmission-step">
              <div class="study-trans-num-col">
                <span class="study-trans-badge">${s.stage}</span>
                <span class="study-trans-period">${s.period}</span>
              </div>
              <div class="study-trans-content-col">
                <h3 class="study-trans-title">${s.title}</h3>
                <h5 class="study-trans-title-mr">${s.titleMr}</h5>
                <p class="study-trans-desc">${s.desc}</p>
                <p class="study-trans-desc-mr">${s.descMr}</p>
                <div class="study-trans-highlight">
                  <span>✦ <strong>Insight:</strong> ${s.details}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 11. BIBLE LANGUAGES VIEW
  function renderLanguagesHtml(selectedLangId = 'hebrew') {
    return `
      <div class="study-languages-view">
        ${renderSubHeader('The Languages of Scripture', 'Hebrew • Aramaic • Greek (मूळ भाषांचे रहस्य व सौंदर्य)')}

        <div class="study-languages-hero">
          <p>God did not write the Bible in a celestial, inaccessible language; He communicated through the real, historical tongues of ancient people. Understanding these three languages unlocks deeper shades of meaning in familiar verses.</p>
        </div>

        <div class="study-languages-cards-stack">
          ${BIBLE_LANGUAGES_DATA.map(l => `
            <article class="study-language-card ${l.id === selectedLangId ? 'active' : ''}">
              <div class="study-lang-card-header">
                <div class="study-lang-title-group">
                  <h2 class="study-lang-name">${l.name} <span class="study-lang-script">${l.script}</span></h2>
                  <span class="study-lang-mr">${l.nameMr}</span>
                </div>
                <span class="study-pill-olive">${l.portion}</span>
              </div>

              <div class="study-lang-nature-box">
                <p><strong>Linguistic Character:</strong> ${l.nature}</p>
                <p><strong>Theological Significance:</strong> ${l.significance}</p>
              </div>

              <h4 class="study-lang-terms-heading">Authentic Key Terms & Insights</h4>
              <div class="study-lang-terms-grid">
                ${l.examples.map(ex => `
                  <div class="study-lang-term-chip">
                    <span class="study-term-original">${ex.term}</span>
                    <span class="study-term-meaning">${ex.meaning}</span>
                    <small class="study-term-ref">${ex.ref}</small>
                  </div>
                `).join('')}
              </div>
            </article>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 12. HOW TO READ (OIA) VIEW
  function renderOiaHtml() {
    const data = BIBLE_OIA_DATA;
    return `
      <div class="study-oia-view">
        ${renderSubHeader('How to Read the Bible', data.subtitle)}

        <div class="study-oia-hero">
          <h2 class="study-oia-title">${data.title}</h2>
          <h4 class="study-oia-title-mr">${data.titleMr}</h4>
          <p class="study-oia-lead">${data.lead}</p>
          <p class="study-oia-lead-mr">${data.leadMr}</p>
        </div>

        <!-- 3 Pillars Grid -->
        <div class="study-oia-steps-grid">
          ${data.steps.map(s => `
            <div class="study-oia-step-card">
              <div class="study-oia-card-top">
                <span class="study-oia-icon">${s.icon}</span>
                <span class="study-oia-badge">STEP ${s.step}</span>
              </div>
              <h3 class="study-oia-step-name">${s.name}</h3>
              <h5 class="study-oia-step-name-mr">${s.nameMr}</h5>
              <div class="study-oia-question-box">
                <span>“${s.question}”</span>
              </div>
              <ul class="study-oia-guidelines-list">
                ${s.guidelines.map(g => `<li>${g}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </div>

        <!-- Practical Hands-on Workshop Card -->
        <article class="study-oia-workshop-card">
          <div class="study-workshop-header">
            <span class="study-pill-gold">HANDS-ON STUDY WORKSHOP</span>
            <h3>Putting OIA Into Practice: ${data.workshop.passageRef}</h3>
          </div>
          
          <blockquote class="study-workshop-verse">
            ${data.workshop.passageText}
          </blockquote>
          <blockquote class="study-workshop-verse study-mr-font">
            ${data.workshop.passageTextMr}
          </blockquote>

          <div class="study-workshop-breakdown">
            <div class="study-workshop-row">
              <span class="study-ws-tag study-ws-observe">Observe</span>
              <p>${data.workshop.observeExample}</p>
            </div>
            <div class="study-workshop-row">
              <span class="study-ws-tag study-ws-interpret">Interpret</span>
              <p>${data.workshop.interpretExample}</p>
            </div>
            <div class="study-workshop-row">
              <span class="study-ws-tag study-ws-apply">Apply</span>
              <p>${data.workshop.applyExample}</p>
            </div>
          </div>

          <div class="study-lesson-footer-action" style="margin-top: 20px;">
            <button class="study-btn-primary" onclick="BibleStudy.openReaderAt('philippians', 4, 6)">
              <span>Read in Context (Philippians 4)</span>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
        </article>
      </div>
    `;
  }

  // --- PUBLIC API ---
  const BibleStudy = {
    init: function() {
      console.log("[BibleStudy] Initializing Bible Study Section...");
      renderCurrentStudyView();
    },
    navigateTo: function(view, params = {}) {
      studyNavigateTo(view, params);
    },
    goBack: function() {
      studyGoBack();
    },
    filterBooks: function(testament, genre) {
      studyNavigateTo('books', { testament, genre });
    },
    searchPeoplePlaces: function(subTab, val) {
      studyState.params.query = val;
      const root = document.getElementById('bible-study-dynamic-container');
      if (root) {
        root.innerHTML = renderPeoplePlacesHtml(subTab, val);
      }
    },
    openReaderAt: function(bookKey, chapter = 1, verse = 1) {
      if (typeof window.openReaderAndNavigate === 'function') {
        window.openReaderAndNavigate(bookKey, chapter, verse);
      } else if (typeof window.openReader === 'function') {
        if (typeof window.switchTab === 'function') window.switchTab('reader');
        window.openReader(bookKey, chapter);
      } else {
        window.location.hash = '#/reader';
      }
    }
  };

  window.BibleStudy = BibleStudy;

})();
