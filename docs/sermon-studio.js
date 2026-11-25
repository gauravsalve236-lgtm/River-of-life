/* ==========================================================================
   RIVER OF LIFE — PREACHING & SERMON SPEECH STUDIO (MARATHI + ENGLISH)
   Provides detailed 15–30 minute sermon & family-prayer speech outlines in
   clear, easy-to-read Marathi (with English option), full Bible verse quotes
   & one-tap verse reader links, daily rotating topics, random topic shuffle,
   custom speech builder, and large-text Speaker Mode.
   ========================================================================== */
(function () {
  'use strict';

  const STORAGE_KEY = 'rol_sermon_topics_v2_mr';
  let sermonLang = 'mr'; // 'mr' (Marathi default) | 'en'
  let sermonFontSize = 15; // adjustable for easy reading while speaking

  const DEFAULT_SERMON_TOPICS = [
    {
      id: 'srm_prayer_power',
      title: 'The Power of Persistent Prayer in the Family',
      titleMr: 'कुटुंबातील अखंड प्रार्थनेचे सामर्थ्य आणि देवाची शांती',
      occasion: 'कुटुंब प्रार्थना व चर्च संदेश (Family Prayer & Sermon)',
      duration: '20–25 मिनिटे (20–25 mins)',
      scripture: 'याकोब ५:१६ • मत्तय १८:१९-२० • फिलिप्पैकर ४:६-७',
      book: 'james',
      chapter: 5,
      verse: 16,
      openingPrayerMr: 'हे स्वर्गीय पित्या, आज आम्हा सर्वांना एकत्र आणल्याबद्दल तुझे मनापासून आभार मानतो. तुझे वचन आमच्या हृदयाशी बोलू दे. आमच्या कुटुंबात आणि मंडळीत प्रार्थनेचा आत्मा ओत, जेणेकरून प्रत्येक अडचणीत आम्ही तुझ्यावर विश्वास ठेवू. प्रभू येशू ख्रिस्ताच्या नावाने, आमेन.',
      openingPrayer: 'Heavenly Father, thank You for gathering our family and church together. Open our hearts to understand how prayer changes our homes and invites Your peace. In Jesus’ name, Amen.',
      introductionMr: 'आज आपण एका अतिशय महत्त्वाच्या विषयावर बोलणार आहोत — "कुटुंबातील अखंड प्रार्थनेचे सामर्थ्य". बऱ्याच वेळा आपण फक्त संकटाच्या वेळी—आजारी पडल्यावर, आर्थिक अडचण आल्यावर किंवा भीती वाटल्यावरच प्रार्थना करतो. पण पवित्र शास्त्र सांगते की प्रार्थना ही आपल्या आत्मिक जीवनाचा श्वास आहे. ज्या घरात दररोज प्रार्थना होते, तिथे देव स्वतः शांती, ऐक्य आणि संरक्षण पाठवतो. आज आपण ३ सोप्या आणि सखोल मुद्द्यांतून पाहूया की प्रार्थना आपल्या घराचे आणि जीवनाचे रूप कसे बदलते.',
      introduction: 'Many families pray only during crises, yet Scripture invites us to make prayer the daily breath of our home. Today we explore how united, sincere prayer brings God’s peace and authority into every household.',
      points: [
        {
          headingMr: '१. उत्तर मिळण्यापूर्वीच प्रार्थना मनाला देवाची शांती देते',
          heading: '1. Prayer Brings God’s Peace Before the Answer Arrives',
          time: '६ मिनिटे',
          verseRef: 'फिलिप्पैकर ४:६-७ (Philippians 4:6-7)',
          verseQuoteMr: '“कशाचीही चिंता करू नका; तर सर्व गोष्टींविषयी प्रार्थनेने व विनंतीने उपकारस्तुतीसह तुमच्या मागण्या देवाला कळवा; म्हणजे सर्व बुद्धीच्या पलीकडे असलेली देवाची शांती तुमची अंतःकरणे व तुमचे विचार ख्रिस्त येशूमध्ये राखील.”',
          book: 'philippians',
          chapter: 4,
          verse: 6,
          explanationMr: 'प्रेषित पौलाने हे शब्द तुरुंगातून लिहिले होते! परिस्थिती कठीण असतानाही तो सांगतो—चिंता करू नका, तर प्रत्येक गोष्ट प्रार्थनेने देवाला सांगा. यात एक मोठे रहस्य आहे: कधी कधी आपल्या समस्या लगेच बदलत नाहीत, पण प्रार्थना केल्यावर देव आपल्या अंतःकरणाची स्थिती बदलतो. "सर्व बुद्धीच्या पलीकडे असलेली देवाची शांती" आपल्या मनाचे रक्षण करते. म्हणजेच वादळ बाहेर असले तरी आपल्या आत शांतता राहते.',
          explanation: 'Paul wrote this from prison: bring every worry to God with thanksgiving, and His peace—which surpasses all understanding—will guard your heart and mind even while waiting for circumstances to change.',
          illustrationMr: 'समुद्रातील दीपस्तंभ (Lighthouse) वादळ थांबवत नाही, पण वादळातही जहाजाला योग्य मार्ग दाखवून सुरक्षित ठेवतो. तसेच प्रार्थना संकटातही आपल्या मनाला ख्रिस्तामध्ये स्थिर ठेवते.',
          illustration: 'A lighthouse does not stop the storm waves, but it keeps the ship from crashing on the rocks.'
        },
        {
          headingMr: '२. एकत्र कुटुंब प्रार्थनेत विशेष सामर्थ्य आणि देवाची उपस्थिती असते',
          heading: '2. United Family Prayer Carries Special Authority',
          time: '७ मिनिटे',
          verseRef: 'मत्तय १८:१९-२० (Matthew 18:19-20)',
          verseQuoteMr: '“मी तुम्हांला खचित सांगतो की, पृथ्वीवर तुमच्यापैकी दोघांनी कोणत्याही गोष्टीविषयी एकमत होऊन मागितले, तर ते माझ्या स्वर्गीय पित्याकडून तुम्हांला मिळेल. कारण जिथे दोघे किंवा तिघे माझ्या नावाने जमतात, तिथे त्यांच्यामध्ये मी आहे.”',
          book: 'matthew',
          chapter: 18,
          verse: 19,
          explanationMr: 'प्रभू येशूने येथे एक अद्भुत वचन दिले आहे. जेव्हा पती-पत्नी, आई-वडील आणि मुले एकत्र बसून येशूच्या नावाने प्रार्थना करतात, तेव्हा येशू स्वतः त्यांच्या मध्यभागी उपस्थित असतो. जिथे मतभेद, राग किंवा तणाव असतो, तिथे एकत्र प्रार्थना केल्याने मने जुळतात. "नीतिमान माणसाची कळकळीची प्रार्थना फार प्रभावी असते" (याकोब ५:१६). जेव्हा संपूर्ण कुटुंब एकमताने प्रार्थना करते, तेव्हा सैतानाच्या सर्व योजना मोडल्या जातात.',
          explanation: 'Jesus promised that where two or three gather in His name, He is right there among them. When families pray aloud together, division breaks and spiritual unity grows.',
          illustrationMr: 'चूल किंवा शेकोटीतून एक निखारा बाजूला काढला तर तो लवकर विझतो; पण सर्व निखारे एकत्र ठेवले तर रात्रभर उष्णता आणि प्रकाश टिकतो. कुटुंबातील एकत्र प्रार्थना आपल्या विश्वासाला जिवंत ठेवते.',
          illustration: 'One coal alone cools quickly, while coals gathered together keep the fire burning.'
        },
        {
          headingMr: '३. दररोज सोप्या पद्धतीने प्रार्थना कशी करावी? (४ सोप्या पायऱ्या)',
          heading: '3. How to Pray Practically Every Day (4 Simple Steps)',
          time: '७ मिनिटे',
          verseRef: '१ थेस्सलनीकाकर ५:१६-१८ (1 Thessalonians 5:16-18)',
          verseQuoteMr: '“सर्वदा आनंद करा; नित्य प्रार्थना करा; सर्व गोष्टींत उपकार माना; कारण ख्रिस्त येशूमध्ये तुम्हांविषयी देवाची हीच इच्छा आहे.”',
          book: '1thessalonians',
          chapter: 5,
          verse: 16,
          explanationMr: 'अनेकांना वाटते की प्रार्थना खूप लांब किंवा कठीण शब्दांत असावी. पण देव आपले हृदय पाहतो. आपण ४ सोप्या पायऱ्या वापरू शकतो: (१) स्तुती — देवाच्या चांगुलपणाबद्दल त्याचे आभार मानणे, (२) क्षमा — आपल्या चुका कबूल करून इतरांना क्षमा करणे, (३) उपकारस्तुती — आज देवाने दिलेल्या ३ आशीर्वादांबद्दल धन्यवाद देणे, आणि (४) विनंती — कुटुंब, मुले, चर्च, आजारी व्यक्ती आणि देशासाठी नावाने प्रार्थना करणे.',
          explanation: 'Use a simple 4-step daily rhythm: Praise God, Confess and forgive, Give Thanks for 3 blessings today, and Pray specifically for family, church, and neighbors.',
          illustrationMr: 'लहान मूल जसे आपल्या वडिलांशी मनमोकळेपणाने बोलते, तसेच आपणही साध्या शब्दांत आपल्या स्वर्गीय पित्याशी दररोज बोलले पाहिजे.',
          illustration: 'Just as a child speaks simply and openly to a loving father, God invites us to talk with Him daily.'
        }
      ],
      applicationMr: 'आज रात्री झोपण्यापूर्वी संपूर्ण कुटुंबाने फक्त ५ ते १० मिनिटे एकत्र बसा. प्रत्येकाने देवाचे एक आभार मानावे आणि एकमेकांच्या गरजांसाठी नावाने प्रार्थना करावी. हा छोटासा नियम संपूर्ण आठवड्याचे वातावरण बदलेल!',
      application: 'Tonight before sleeping, gather for 5–10 minutes as a family. Let each person share one blessing and pray for each other by name.',
      closingPrayerMr: 'प्रभू येशू, आमचे घर प्रार्थनेचे मंदिर कर. आम्हांला दररोज तुझ्यावर विश्वास ठेवायला, एकमेकांना क्षमा करायला आणि तुझ्या शांतीत चालायला शिकव. आमच्या चर्चवर आणि प्रत्येक कुटुंबावर तुझा आशीर्वाद ठेव. आमेन.',
      closingPrayer: 'Lord Jesus, make our home a house of prayer. Bless our families and church with Your peace. Amen.',
      createdAt: 1700000001000
    },
    {
      id: 'srm_faith_storms',
      title: 'Peace in the Middle of Life’s Storms',
      titleMr: 'जीवनातील वादळातही ख्रिस्ताची शांती आणि विश्वास',
      occasion: 'रविवार संदेश / कुटुंब प्रार्थना (Sunday Sermon / Fellowship)',
      duration: '20–30 मिनिटे (20–30 mins)',
      scripture: 'मार्क ४:३५-४१ • यशया ४१:१० • स्तोत्रसंहिता ४६:१',
      book: 'mark',
      chapter: 4,
      verse: 39,
      openingPrayerMr: 'सर्वसमर्थ देवा, तू आकाश व पृथ्वी यांचा निर्माणकर्ता आहेस आणि वारा व समुद्रही तुझ्या आज्ञेत राहतात. आज येथे असलेल्या प्रत्येक अस्वस्थ अंतःकरणावर तुझी शांती बोल, हीच प्रार्थना. आमेन.',
      openingPrayer: 'Lord God, even the winds and waves obey Your voice. Speak peace over every troubled heart today. Amen.',
      introductionMr: 'कधी कधी आपण देवाच्या आज्ञेत चालत असतानाही आपल्या जीवनात मोठी वादळे येतात—नोकरीची चिंता, आजारपण, कौटुंबिक ताण किंवा भविष्याची भीती. मार्क ४ मध्ये शिष्य येशूच्याच सांगण्यावरून नावेत बसले होते, तरीही अचानक मोठे वादळ आले! आज आपण पाहूया की येशू आपल्या जीवनाच्या नावेत असताना वादळाचा सामना कसा करायचा.',
      introduction: 'Even when following Jesus closely, storms still arise. Knowing Jesus is in the boat with us transforms how we face hardship.',
      points: [
        {
          headingMr: '१. देवाच्या आज्ञेत चालतानाही संकटे येऊ शकतात, पण देव सोबत असतो',
          heading: '1. Obedience Guarantees His Presence in the Storm',
          time: '७ मिनिटे',
          verseRef: 'मार्क ४:३५-३७ • स्तोत्रसंहिता ४६:१',
          verseQuoteMr: '“देव आपला आश्रय व सामर्थ्य आहे; संकटसमयी साहाय्य करण्यास तो नेहमी तत्पर असतो.” (स्तोत्रसंहिता ४६:१)',
          book: 'psalms',
          chapter: 46,
          verse: 1,
          explanationMr: 'शिष्य येशूच्या इच्छेविरुद्ध गेले नव्हते; ते येशूच्या आज्ञेनेच पैलतीरावर निघाले होते. तरीही वादळ आले. याचा अर्थ संकटे आली म्हणजे देवाने आपल्याला सोडले असा होत नाही! त्याच नावेत येशू त्यांच्यासोबत होता. संकटाच्या वेळी आपण एकटे नाही, देव आपला आश्रय आहे.',
          explanation: 'The disciples were obeying Jesus when the storm hit. Hardship does not mean God abandoned you—Jesus is in the boat with you.'
        },
        {
          headingMr: '२. भीती शंका घेते; विश्वास देवाच्या प्रीतीवर लक्ष केंद्रित करतो',
          heading: '2. Fear Questions God; Faith Trusts His Love',
          time: '७ मिनिटे',
          verseRef: 'यशया ४१:१० (Isaiah 41:10)',
          verseQuoteMr: '“भिऊ नको, कारण मी तुझ्याबरोबर आहे; घाबरू नको, कारण मी तुझा देव आहे; मी तुला बळ देईन, मी तुला साहाय्य करीन, मी माझ्या धार्मिकतेच्या उजव्या हाताने तुला सावरीन.”',
          book: 'isaiah',
          chapter: 41,
          verse: 10,
          explanationMr: 'वादळात शिष्य घाबरून म्हणाले, "गुरुजी, आम्ही नाश पावतो याची तुम्हांला पर्वा नाही का?" जेव्हा भीती वाढते तेव्हा आपणही देवाला असेच प्रश्न विचारतो. पण क्रूसावर येशूने सिद्ध केले की तो आपल्यावर किती प्रेम करतो! भीतीला निर्णयांवर राज्य करू देऊ नका; देवाच्या वचनाचा आधार घ्या.',
          explanation: 'When panic rises, fear asks if God cares. Yet the cross proves His love forever. Replace fear with God’s promises in Isaiah 41:10.'
        },
        {
          headingMr: '३. येशूचा एक शब्द अनेक वर्षांची चिंता शांत करतो',
          heading: '3. One Word from Jesus Calms Every Storm',
          time: '७ मिनिटे',
          verseRef: 'मार्क ४:३९ (Mark 4:39)',
          verseQuoteMr: '“तेव्हा त्याने उठून वाऱ्याला धमकावले व समुद्राला म्हटले, ‘शांत हो, स्तब्ध हो!’ तेव्हा वारा राहिला आणि मोठी शांतता झाली.”',
          book: 'mark',
          chapter: 4,
          verse: 39,
          explanationMr: 'येशूने फक्त दोन शब्द उच्चारले—"शांत हो, स्तब्ध हो!" आणि तात्काळ मोठी शांतता झाली. आधी त्याने बाहेरील समुद्र शांत केला, मग शिष्यांच्या आतील भीती दूर केली. आज तुम्ही कोणत्याही मोठ्या अडचणीत असाल, तर येशूला तुमच्या परिस्थितीवर बोलण्याची विनंती करा.',
          explanation: 'Jesus spoke "Peace, be still!" and both the sea outside and the fear inside grew calm. Invite Him to speak peace into your situation today.'
        }
      ],
      applicationMr: 'या आठवड्यात तुमच्या जीवनातील सर्वात मोठी चिंता कागदावर लिहून ती प्रार्थनेत देवाला अर्पण करा. दररोज सकाळी यशया ४१:१० मोठ्याने वाचा.',
      application: 'Write down your biggest worry this week, surrender it in prayer, and read Isaiah 41:10 aloud each morning.',
      closingPrayerMr: 'हे पित्या, आमचे आरोग्य, कामकाज आणि कुटुंब आम्ही तुझ्या हातात देतो. आमच्या सभोवतालची आणि मनातील सर्व वादळे शांत कर. आमेन.',
      closingPrayer: 'Father, we place our health, work, and families in Your hands. Quiet every storm around us and within us. Amen.',
      createdAt: 1700000002000
    },
    {
      id: 'srm_forgiveness_love',
      title: 'The Healing Power of Forgiveness & Love',
      titleMr: 'क्षमा आणि प्रीतीचे जीवन बदलणारे सामर्थ्य',
      occasion: 'कुटुंब प्रार्थना / मध्यवर्ती सभा (Family Prayer / Midweek)',
      duration: '15–20 मिनिटे (15–20 mins)',
      scripture: 'इफिसकर ४:३१-३२ • कलस्सैकर ३:१३ • मत्तय ६:१४-१५',
      book: 'ephesians',
      chapter: 4,
      verse: 32,
      openingPrayerMr: 'दयाळू पित्या, आम्ही कधीही फेडू शकत नव्हतो असे आमचे पापाचे कर्ज तू क्षमा केलेस. आमचे हृदयही नम्र आणि क्षमाशील बनव, जेणेकरून तुझी प्रीती आमच्यातून दिसेल. आमेन.',
      openingPrayer: 'Loving Father, You forgave us freely. Give us humble hearts that reflect Your mercy to others. Amen.',
      introductionMr: 'कुटुंबात आणि मंडळीत अनेकदा छोट्या-छोट्या गोष्टींवरून मने दुखावली जातात. राग आणि कटुता मनात ठेवणे म्हणजे स्वतः विष पिऊन दुसऱ्याला त्रास होईल अशी अपेक्षा करणे होय. पण देव आपल्याला क्षमेद्वारे स्वातंत्र्य आणि चंगाई देऊ इच्छितो.',
      introduction: 'Unforgiveness builds walls in homes and churches. Today we see how Christ’s forgiveness frees and heals our relationships.',
      points: [
        {
          headingMr: '१. ख्रिस्ताने आपल्याला क्षमा केली म्हणून आपण क्षमा करतो',
          heading: '1. Forgiving Because Christ Forgave Us',
          time: '६ मिनिटे',
          verseRef: 'इफिसकर ४:३२ (Ephesians 4:32)',
          verseQuoteMr: '“एकमेकांशी दयाळू व कनवाळू व्हा; जसे देवाने ख्रिस्तामध्ये तुम्हांला क्षमा केली आहे, तसे तुम्हीही एकमेकांना क्षमा करा.”',
          book: 'ephesians',
          chapter: 4,
          verse: 32,
          explanationMr: 'आपण समोरच्या व्यक्तीने लायकी दाखवली म्हणून क्षमा करत नाही; तर येशूने क्रूसावर आपली सर्व पापे क्षमा केली म्हणून आपण क्षमा करतो. देवाच्या कृपेची आठवण ठेवल्यास इतरांना माफ करणे सोपे होते.',
          explanation: 'We forgive not because the other person earned it, but because Christ forgave us at the cross.'
        },
        {
          headingMr: '२. क्षमा म्हणजे काय आणि काय नाही?',
          heading: '2. What Forgiveness Is—and What It Isn’t',
          time: '६ मिनिटे',
          verseRef: 'कलस्सैकर ३:१३ (Colossians 3:13)',
          verseQuoteMr: '“कोणाचा कोणावर दोष असेल तर एकमेकांचे सहन करा व एकमेकांना क्षमा करा; जशी प्रभूने तुम्हांला क्षमा केली आहे, तशी तुम्हीही करा.”',
          book: 'colossians',
          chapter: 3,
          verse: 13,
          explanationMr: 'क्षमा करणे म्हणजे झालेल्या वेदनेला दुर्लक्ष करणे नाही, तर बदला घेण्याची भावना व कटुता देवाच्या हातात सोडून देणे होय. क्षमेमुळे समोरच्यापेक्षा आपले स्वतःचे मन अधिक मोकळे व निरोगी होते.',
          explanation: 'Forgiveness releases bitterness and vengeance into God’s hands so your own heart can heal.'
        },
        {
          headingMr: '३. घर आणि मंडळी उभारणारे शब्द बोला',
          heading: '3. Speaking Words That Build Up',
          time: '५ मिनिटे',
          verseRef: 'इफिसकर ४:२९ (Ephesians 4:29)',
          verseQuoteMr: '“तुमच्या तोंडून कोणतेही वाईट बोलणे निघू नये, तर आवश्यकतेप्रमाणे उन्नतीसाठी जे चांगले तेच निघावे, म्हणजे ऐकणाऱ्यांवर कृपा व्हावी.”',
          book: 'ephesians',
          chapter: 4,
          verse: 29,
          explanationMr: 'रागाच्या भरात बोललेले कठोर शब्द जखमा करतात, पण प्रीतीचे व प्रोत्साहनाचे शब्द कुटुंबाचे वातावरण स्वर्गीय बनवतात. आजपासून घरात टीका कमी करून आभार आणि कौतुक वाढवूया.',
          explanation: 'Replace harsh criticism at home with encouraging, grace-filled words.'
        }
      ],
      applicationMr: 'आज प्रार्थनेत पवित्र आत्म्याला विचारा की मला कोणाला क्षमा करण्याची किंवा कोणाची माफी मागण्याची गरज आहे का? या आठवड्यात शांतीचे एक पाऊल उचला.',
      application: 'Ask the Holy Spirit if there is anyone you need to forgive or apologize to this week, and take one step of peace.',
      closingPrayerMr: 'प्रभू, आमच्या कुटुंबातील व चर्चमधील दुखावलेली मने बरी कर. आमची वाणी कृपेने आणि प्रीतीने भर. आमेन.',
      closingPrayer: 'Lord, heal broken relationships in our homes and church, and fill our speech with grace. Amen.',
      createdAt: 1700000003000
    },
    {
      id: 'srm_gratitude_joy',
      title: 'Living with Gratitude in Every Season',
      titleMr: 'प्रत्येक परिस्थितीत कृतज्ञतेचे व आनंदाचे जीवन',
      occasion: 'उपकारस्तुती / कुटुंब प्रार्थना (Thanksgiving / Family)',
      duration: '15–25 मिनिटे (15–25 mins)',
      scripture: 'स्तोत्रसंहिता १०३:१-५ • स्तोत्रसंहिता १००:४ • १ थेस्सलनीकाकर ५:१८',
      book: 'psalms',
      chapter: 103,
      verse: 2,
      openingPrayerMr: 'प्रीतिमान देवा, आमचा प्रत्येक श्वास आणि प्रत्येक आशीर्वाद तुझ्याकडून येतो. तक्रार करण्याऐवजी तुझे उपकार मानणारे हृदय आम्हांला दे. आमेन.',
      openingPrayer: 'Gracious God, every breath and blessing comes from You. Teach us to live with thankful hearts. Amen.',
      introductionMr: 'तक्रार केल्याने आनंद कमी होतो, पण कृतज्ञतेमुळे देवाचे चमत्कार दिसू लागतात. दावीद राजा स्वतःच्या आत्म्याला आठवण करून देतो: "हे माझ्या जिवा, परमेश्वराचा धन्यवाद कर आणि त्याचे सर्व उपकार विसरू नको!"',
      introduction: 'Complaining shrinks our joy, while gratitude opens our eyes to God’s faithfulness.',
      points: [
        {
          headingMr: '१. कृतज्ञता आपले लक्ष कमतरतेकडून देवाकडे वळवते',
          heading: '1. Gratitude Shifts Focus from What’s Missing to God',
          time: '६ मिनिटे',
          verseRef: '१ थेस्सलनीकाकर ५:१८ (1 Thessalonians 5:18)',
          verseQuoteMr: '“सर्व गोष्टींत उपकार माना; कारण ख्रिस्त येशूमध्ये तुम्हांविषयी देवाची हीच इच्छा आहे.”',
          book: '1thessalonians',
          chapter: 5,
          verse: 18,
          explanationMr: 'प्रत्येक अडचणीबद्दल नाही, तर प्रत्येक परिस्थितीत आपण देवाचे आभार मानावेत—कारण परिस्थिती बदलली तरी देव चांगला आहे आणि तो सिंहासनावर आहे.',
          explanation: 'Give thanks in every circumstance because God remains good and faithful on the throne.'
        },
        {
          headingMr: '२. देवाचे मागील उपकार आठवल्याने पुढचा विश्वास वाढतो',
          heading: '2. Remembering Past Mercies Fuels Future Faith',
          time: '७ मिनिटे',
          verseRef: 'स्तोत्रसंहिता १०३:२-३ (Psalm 103:2-3)',
          verseQuoteMr: '“हे माझ्या जिवा, परमेश्वराचा धन्यवाद कर, आणि त्याचे सर्व उपकार विसरू नको; तो तुझे सर्व अपराध क्षमा करतो, तो तुझे सर्व रोग बरे करतो.”',
          book: 'psalms',
          chapter: 103,
          verse: 2,
          explanationMr: 'जेव्हा आपण मागे वळून पाहतो की देवाने आपल्याला संकटातून कसे वाचवले, रोग बरे केले आणि अन्न-वस्त्र दिले, तेव्हा उद्याच्या भीतीवर विश्वास विजय मिळवतो.',
          explanation: 'Remembering how God forgave, healed, and provided in the past strengthens faith for tomorrow.'
        },
        {
          headingMr: '३. उपकारस्तुती ही देवाच्या सान्निध्याचे दार उघडते',
          heading: '3. Thanksgiving Opens the Gates of Worship',
          time: '६ मिनिटे',
          verseRef: 'स्तोत्रसंहिता १००:४ (Psalm 100:4)',
          verseQuoteMr: '“उपकारस्तुती करीत त्याच्या वेशींतून प्रवेश करा, स्तोत्रे गात त्याच्या आंगणात या; त्याचा धन्यवाद करा, त्याच्या नावाला आशीर्वाद द्या.”',
          book: 'psalms',
          chapter: 100,
          verse: 4,
          explanationMr: 'प्रार्थनेची सुरुवात मागण्यांपेक्षा स्तुती आणि आभाराने केली, तर मनाचा जडपणा दूर होतो आणि देवाची उपस्थिती लगेच जाणवते.',
          explanation: 'Beginning prayer with thanksgiving lifts heaviness and ushers us into God’s presence.'
        }
      ],
      applicationMr: 'या आठवड्यात घरात एक "आशीर्वाद डायरी" सुरू करा—दररोज देवाने केलेली एक चांगली गोष्ट त्यात लिहा आणि रविवारी कुटुंबासोबत वाचा.',
      application: 'Start a family Blessing Notebook this week—write one thing God did each day and read them together on Sunday.',
      closingPrayerMr: 'हे प्रभू, तुझ्या अखंड प्रीतीबद्दल, संरक्षणाबद्दल आणि कृपेबद्दल आम्ही तुझे मनापासून उपकार मानतो. आमेन.',
      closingPrayer: 'Thank You Lord for Your unfailing love, provision, and grace over our homes. Amen.',
      createdAt: 1700000004000
    },
    {
      id: 'srm_gods_word_light',
      title: 'Building Your Life on the Rock of God’s Word',
      titleMr: 'देवाच्या वचनाच्या खडकावर आपले जीवन उभारणे',
      occasion: 'रविवार संदेश / तरुण व कुटुंब (Sunday Sermon / Youth)',
      duration: '20–30 मिनिटे (20–30 mins)',
      scripture: 'मत्तय ७:२४-२७ • स्तोत्रसंहिता ११९:१०५ • यहोशवा १:८',
      book: 'matthew',
      chapter: 7,
      verse: 24,
      openingPrayerMr: 'प्रभू, तुझे वचन आमच्या पावलांसाठी दिवा आणि मार्गावर प्रकाश आहे. आम्हांला फक्त ऐकणारे नव्हे, तर वचनाप्रमाणे वागणारे बनव. आमेन.',
      openingPrayer: 'Lord, Your Word is a lamp to our feet. Make us not just hearers, but doers of Your Word. Amen.',
      introductionMr: 'दोन जणांनी घरे बांधली—वरकरणी दोन्ही घरे सारखीच दिसत होती, पण पाऊस आणि पूर आल्यावर फक्त खडकावर बांधलेले घर टिकले. फरक वादळात नव्हता, तर पायाभरणीत होता! आज पाहूया देवाच्या वचनावर भक्कम पाया कसा बांधायचा.',
      introduction: 'Two builders faced the same storm, but only the house built on the rock stood firm. The difference was the foundation.',
      points: [
        {
          headingMr: '१. फक्त ऐकणे पुरेसे नाही — आचरण महत्त्वाचे आहे',
          heading: '1. Hearing vs. Doing God’s Word',
          time: '७ मिनिटे',
          verseRef: 'मत्तय ७:२४ (Matthew 7:24)',
          verseQuoteMr: '“म्हणून जो कोणी माझे हे शब्द ऐकतो व ते पाळतो, त्याची तुलना मी अशा शहाण्या माणसाशी करीन की, ज्याने आपले घर खडकावर बांधले.”',
          book: 'matthew',
          chapter: 7,
          verse: 24,
          explanationMr: 'रविवारी आपण वचन ऐकतो, पण सोमवार ते शनिवार आपल्या वागण्यात, बोलण्यात आणि कामात ते वचन अमलात आणणे हीच खरी आत्मिक वाढ आहे.',
          explanation: 'True spiritual growth happens when Sunday’s verse becomes Monday’s action.'
        },
        {
          headingMr: '२. दररोजचे वचन आपल्या निर्णयांना योग्य दिशा देते',
          heading: '2. Daily Scripture Guides Our Decisions',
          time: '७ मिनिटे',
          verseRef: 'स्तोत्रसंहिता ११९:१०५ (Psalm 119:105)',
          verseQuoteMr: '“तुझे वचन माझ्या पावलांसाठी दिवा आणि माझ्या मार्गावर प्रकाश आहे.”',
          book: 'psalms',
          chapter: 119,
          verse: 105,
          explanationMr: 'दिवा १० किलोमीटर पुढचा रस्ता दाखवत नाही, पण पुढचे एक पाऊल सुरक्षित टाकण्यासाठी पुरेसा प्रकाश देतो. तसेच दररोज बायबल वाचल्याने आपण चुकीच्या निर्णयांपासून वाचतो.',
          explanation: 'A lamp lights the very next step so we don’t stumble in dark times.'
        },
        {
          headingMr: '३. वचनाचे मनन केल्याने जीवनात स्थैर्य व यश येते',
          heading: '3. Meditating on Scripture Brings Strength',
          time: '६ मिनिटे',
          verseRef: 'यहोशवा १:८ (Joshua 1:8)',
          verseQuoteMr: '“हे नियमशास्त्राचे पुस्तक तुझ्या मुखातून जाऊ नये, तर त्यात जे सर्व लिहिले आहे त्याप्रमाणे करावयास तू काळजी घ्यावी म्हणून रात्रंदिवस त्याचे मनन कर.”',
          book: 'joshua',
          chapter: 1,
          verse: 8,
          explanationMr: 'दररोज फक्त १० मिनिटे बायबलमधील एक अध्याय वाचून त्यावर विचार केल्यास आपले मन शांत, बलवान आणि देवभिरू राहते.',
          explanation: 'Just 10 minutes a day reading and reflecting on one chapter shapes our speech, work, and home.'
        }
      ],
      applicationMr: 'या आठवड्यात दररोज बायबलमधील १ अध्याय (उदा. नीतिसूत्रे किंवा योहान) वाचा आणि त्यातील एक आवडलेले वचन कुटुंबातील एका सदस्याला पाठवा.',
      application: 'Read one chapter a day this week (e.g., Proverbs or John) and share one verse with a family member.',
      closingPrayerMr: 'हे प्रभू, तुझे वचन आमच्या अंतःकरणात खोलवर रुजव, जेणेकरून आमची घरे प्रत्येक संकटात स्थिर राहतील. आमेन.',
      closingPrayer: 'Lord, plant Your Word deep in our hearts so our homes stand strong in every season. Amen.',
      createdAt: 1700000005000
    },
    {
      id: 'srm_serving_church',
      title: 'Serving One Another with Humility & Purpose',
      titleMr: 'नम्रतेने एकमेकांची सेवा आणि मंडळीतील सहभाग',
      occasion: 'चर्च सेवा / तरुण सभा (Church Service / Youth)',
      duration: '20–25 मिनिटे (20–25 mins)',
      scripture: 'मार्क १०:४३-४५ • गलतीकर ५:१३ • १ पेत्र ४:१०',
      book: 'galatians',
      chapter: 5,
      verse: 13,
      openingPrayerMr: 'प्रभू येशू, तू सेवा करून घेण्यासाठी नाही तर सेवा करण्यासाठी आलास. आमच्या चर्चमध्ये आणि घरात तुझे नम्र मन आम्हांला दे. आमेन.',
      openingPrayer: 'Jesus, You came not to be served, but to serve. Give us Your servant heart. Amen.',
      introductionMr: 'जग मोठेपणा मोजते की किती लोक तुमची सेवा करतात; पण येशू मोठेपणा मोजतो की तुम्ही किती लोकांची प्रीतीने सेवा करता!',
      introduction: 'The world measures greatness by who serves you; Jesus measures greatness by how many people you love and serve.',
      points: [
        {
          headingMr: '१. येशूने स्वतः सेवा करण्याचा आदर्श ठेवला',
          heading: '1. Jesus Set the Pattern of Service',
          time: '७ मिनिटे',
          verseRef: 'मार्क १०:४५ (Mark 10:45)',
          verseQuoteMr: '“कारण मनुष्याचा पुत्रही सेवा करून घ्यावयास नाही, तर सेवा करावयास व पुष्कळांच्या खंडणीसाठी आपला जीव द्यावयास आला.”',
          book: 'mark',
          chapter: 10,
          verse: 45,
          explanationMr: 'राजांचा राजा असलेल्या येशूने शिष्यांचे पाय धुतले. घरात किंवा चर्चमध्ये केलेली कोणतीही छोटीशी मदत देवाच्या दृष्टीने मोठी आहे.',
          explanation: 'The King of Kings washed His disciples’ feet—no act of kindness is too small for God.'
        },
        {
          headingMr: '२. प्रत्येक विश्वासणाऱ्याला देवाने एक विशेष दान दिले आहे',
          heading: '2. Every Believer Has a Gift to Share',
          time: '७ मिनिटे',
          verseRef: '१ पेत्र ४:१० (1 Peter 4:10)',
          verseQuoteMr: '“तुम्हांतील प्रत्येकाला जसे कृपादान मिळाले आहे, तसे देवाच्या बहुविध कृपेचे उत्तम कारभारी या नात्याने तुम्ही एकमेकांची सेवा करा.”',
          book: '1peter',
          chapter: 4,
          verse: 10,
          explanationMr: 'गायन, प्रार्थना, संडे स्कूल शिकवणे, पाहुणचार किंवा गरजूंना मदत करणे—देवाने तुम्हांला दिलेली कला इतरांच्या आशीर्वादासाठी वापरा.',
          explanation: 'Use your God-given gifts—hospitality, prayer, teaching, worship, or helping neighbors—to bless others.'
        },
        {
          headingMr: '३. एकत्र सेवा केल्याने मंडळी अधिक मजबूत होते',
          heading: '3. Serving Together Unites the Church',
          time: '६ मिनिटे',
          verseRef: 'गलतीकर ५:१३ (Galatians 5:13)',
          verseQuoteMr: '“प्रीतीने एकमेकांची सेवा करा.”',
          book: 'galatians',
          chapter: 5,
          verse: 13,
          explanationMr: 'जेव्हा सर्वजण जबाबदारी उचलतात, तेव्हा कोणावरही भार येत नाही आणि संपूर्ण चर्च जगासमोर ख्रिस्ताचा प्रकाश दाखवते.',
          explanation: 'When everyone contributes with love, the whole church shines Christ’s light.'
        }
      ],
      applicationMr: 'या आठवड्यात घरातील किंवा चर्चमधील एका व्यक्तीला कोणताही गाजावाजा न करता मनापासून मदत करा.',
      application: 'Look for one quiet way to serve someone in your family or church this week.',
      closingPrayerMr: 'प्रभू, आमचे हात, आमची वाणी आणि आमचा वेळ तुझ्या राज्याच्या सेवेसाठी वापर. आमेन.',
      closingPrayer: 'Lord, use our hands, voices, and time to bring Your love to those around us. Amen.',
      createdAt: 1700000006000
    },
    {
      id: 'srm_psalm91_protection',
      title: 'God’s Protection & Shelter in Troubled Times',
      titleMr: 'संकटात देवाची सुरक्षा, आश्रय आणि निर्भय जीवन',
      occasion: 'कुटुंब संरक्षण प्रार्थना / चर्च संदेश (Protection & Family Prayer)',
      duration: '20–25 मिनिटे (20–25 mins)',
      scripture: 'स्तोत्रसंहिता ९१:१-१६ • स्तोत्रसंहिता १२१:१-८ • नीतिसूत्रे १८:१०',
      book: 'psalms',
      chapter: 91,
      verse: 1,
      openingPrayerMr: 'सर्वसमर्थ देवा, तू आमचा आश्रय आणि अभेद्य किल्ला आहेस. आज आमच्या घरातील लहानांपासून मोठ्यांपर्यंत सर्वांना तुझ्या पंखांखाली सुरक्षित ठेव. आमेन.',
      openingPrayer: 'Almighty God, You are our refuge and fortress. Cover our families under Your wings today. Amen.',
      introductionMr: 'आजच्या काळात प्रत्येक कुटुंबाला आरोग्याची, प्रवासाची, नोकरीची आणि भविष्याची चिंता वाटते. पण स्तोत्रसंहिता ९१ हे देवाने आपल्या लेकरांना दिलेले एक सुरक्षित अभयपत्र आहे. देवाच्या जवळ राहणाऱ्या व्यक्तीला देव कसे संरक्षण देतो ते आज पाहूया.',
      introduction: 'Psalm 91 is God’s promise of shelter and protection for every family that dwells near Him.',
      points: [
        {
          headingMr: '१. परात्पराच्या गुप्त स्थानी राहणे म्हणजे काय?',
          heading: '1. Dwelling in the Shelter of the Most High',
          time: '७ मिनिटे',
          verseRef: 'स्तोत्रसंहिता ९१:१-२ (Psalm 91:1-2)',
          verseQuoteMr: '“जो परात्पराच्या गुप्त स्थानी राहतो, तो सर्वसमर्थाच्या सावलीत विसावा पावेल. मी परमेश्वराविषयी म्हणेन, ‘तो माझा आश्रय व माझा गड आहे; माझा देव, त्याच्यावर मी भरवसा ठेवतो.’”',
          book: 'psalms',
          chapter: 91,
          verse: 1,
          explanationMr: 'फक्त संकटात देवाला भेटायला येणारा पाहुणा नव्हे, तर दररोज देवाच्या सान्निध्यात राहणारा "निवासी" बना. जेव्हा आपण दररोज प्रार्थना व वचनाद्वारे देवाशी जोडलेले असतो, तेव्हा त्याची सावली आपल्यावर राहते.',
          explanation: 'Don’t just visit God in emergencies—dwell daily in His presence through prayer and Scripture.',
          illustrationMr: 'जसे कोंबडी धोक्याची चाहूल लागताच आपल्या पिल्लांना पंखांखाली लपवते, तसेच देव आपल्या लेकरांना संकटापासून झाकून ठेवतो.'
        },
        {
          headingMr: '२. देवदूतांचे पहारे आणि देवाचे वचन',
          heading: '2. God Commands His Angels Concerning You',
          time: '७ मिनिटे',
          verseRef: 'स्तोत्रसंहिता ९१:११ (Psalm 91:11)',
          verseQuoteMr: '“कारण तुझ्या सर्व मार्गांत तुझे रक्षण करावे म्हणून तो तुझ्याविषयी आपल्या दूतांना आज्ञा देईल.”',
          book: 'psalms',
          chapter: 91,
          verse: 11,
          explanationMr: 'आपण प्रवासाला निघतो, मुले शाळेत जातात किंवा रात्री झोपतो—आपल्याला न दिसणारे देवाचे दूत आपल्या सभोवती पहारा देतात. त्यामुळे भीतीऐवजी विश्वासाने दिवस सुरू करा.',
          explanation: 'God assigns His angels to guard your ways—start each day and journey in faith, not fear.'
        },
        {
          headingMr: '३. देवाला हाक मारणाऱ्याला तो उत्तर देतो',
          heading: '3. When You Call, He Answers',
          time: '६ मिनिटे',
          verseRef: 'स्तोत्रसंहिता ९१:१५ (Psalm 91:15)',
          verseQuoteMr: '“तो मला हाक मारील, आणि मी त्याला उत्तर देईन; संकटात मी त्याच्याबरोबर राहीन; मी त्याला सोडवीन व त्याला सन्मान देईन.”',
          book: 'psalms',
          chapter: 91,
          verse: 15,
          explanationMr: 'देवाचे वचन स्पष्ट आहे: संकटात तो आपल्याला सोडून जात नाही, तर "मी त्याच्याबरोबर राहीन" असे अभिवचन देतो.',
          explanation: 'God promises: "I will be with him in trouble; I will deliver him."'
        }
      ],
      applicationMr: 'दररोज सकाळी घर सोडण्यापूर्वी कुटुंबातील सर्वांनी मिळून स्तोत्र ९१:१-२ म्हणत संरक्षण प्रार्थना करा.',
      application: 'Pray Psalm 91:1-2 together as a family every morning before leaving home.',
      closingPrayerMr: 'हे प्रभू, आमच्या घराभोवती तुझ्या रक्ताचे व अग्नीचे कुंपण घाल. आमच्या येण्या-जाण्यात तूच रक्षण कर. आमेन.',
      closingPrayer: 'Lord, surround our home with Your protection and peace. Amen.',
      createdAt: 1700000007000
    },
    {
      id: 'srm_youth_guidance',
      title: 'God’s Guidance & Purpose for Youth & Future',
      titleMr: 'तरुणांसाठी, विद्यार्थ्यांसाठी देवाचे मार्गदर्शन व भविष्य',
      occasion: 'तरुण सभा / विद्यार्थी व कुटुंब (Youth & Students)',
      duration: '20–25 मिनिटे (20–25 mins)',
      scripture: 'नीतिसूत्रे ३:५-६ • यिर्मया २९:११ • १ तीमथ्य ४:१२',
      book: 'proverbs',
      chapter: 3,
      verse: 5,
      openingPrayerMr: 'बुद्धी देणाऱ्या देवा, आजच्या तरुण पिढीसाठी आणि विद्यार्थ्यांसाठी तुझे मार्गदर्शन मागतो. त्यांच्या अभ्यासात, करिअरमध्ये आणि निर्णयांमध्ये तुझा प्रकाश दे. आमेन.',
      openingPrayer: 'God of wisdom, guide our youth and students in their studies, careers, and life choices. Amen.',
      introductionMr: 'शिक्षण, नोकरी, लग्न किंवा मोबाईल व मित्रांचा दबाव—आजच्या तरुणांसमोर अनेक प्रश्न असतात. पण देव सांगतो की माझ्याकडे तुमच्यासाठी "कल्याणाचे आणि आशेचे बेत" आहेत!',
      introduction: 'Youth face pressure about studies, career, and relationships, yet God holds plans of hope and a future.',
      points: [
        {
          headingMr: '१. स्वतःच्या समजुतीवर नव्हे, तर देवावर विश्वास ठेवा',
          heading: '1. Trust the Lord, Not Just Your Own Understanding',
          time: '७ मिनिटे',
          verseRef: 'नीतिसूत्रे ३:५-६ (Proverbs 3:5-6)',
          verseQuoteMr: '“तू आपल्या सर्व अंतःकरणाने परमेश्वरावर भरवसा ठेव, आणि आपल्याच समजुतीवर विसंबून राहू नको; तुझ्या सर्व मार्गांत त्याचे स्मरण कर, म्हणजे तो तुझे मार्ग सरळ करील.”',
          book: 'proverbs',
          chapter: 3,
          verse: 5,
          explanationMr: 'मानवी बुद्धी मर्यादित असते, पण देव पुढची १० वर्षे पाहू शकतो. कोणताही मोठा निर्णय घेताना आधी देवाला विचारा—तो योग्य दारे उघडतो.',
          explanation: 'Ask God before major decisions; He sees the whole road ahead and makes your paths straight.'
        },
        {
          headingMr: '२. देवाकडे तुमच्यासाठी उत्तम योजना आहे',
          heading: '2. God Has Plans to Give You Hope and a Future',
          time: '७ मिनिटे',
          verseRef: 'यिर्मया २९:११ (Jeremiah 29:11)',
          verseQuoteMr: '“कारण परमेश्वर म्हणतो, ‘जे बेत मी तुमच्याविषयी केले आहेत, ते मला माहीत आहेत; ते नाशाचे नसून कल्याणाचे बेत आहेत, ते तुम्हाला भविष्याची आशा देण्यासाठी आहेत.’”',
          book: 'jeremiah',
          chapter: 29,
          verse: 11,
          explanationMr: 'कधी अपयश आले किंवा उशीर झाला तरी निराश होऊ नका. देवाची वेळ आणि त्याची योजना नेहमीच सर्वोत्तम असते.',
          explanation: 'Do not lose heart over delays or setbacks—God’s timing and plan are always for your good.'
        },
        {
          headingMr: '३. तरुण वयात ख्रिस्ताचे आदर्श बना',
          heading: '3. Set an Example in Youth',
          time: '६ मिनिटे',
          verseRef: '१ तीमथ्य ४:१२ (1 Timothy 4:12)',
          verseQuoteMr: '“तू तरुण आहेस म्हणून कोणी तुला तुच्छ मानू नये; तर बोलण्यात, आचरणात, प्रीतीत, विश्वासात व शुद्धतेत विश्वासणाऱ्यांसमोर आदर्श हो.”',
          book: '1timothy',
          chapter: 4,
          verse: 12,
          explanationMr: 'देव वापरण्यासाठी वय मोठे असण्याची गरज नाही—दावीद, दानीएल आणि तीमथ्य तरुण असतानाच देवाने त्यांच्याद्वारे मोठी कामे केली!',
          explanation: 'God used David, Daniel, and Timothy in their youth—be an example in speech, conduct, and purity.'
        }
      ],
      applicationMr: 'या आठवड्यात दररोज अभ्यासापूर्वी किंवा कामापूर्वी २ मिनिटे देवाला बुद्धी व एकाग्रतेसाठी प्रार्थना करा.',
      application: 'Pray for wisdom and focus for 2 minutes every day before studying or starting work.',
      closingPrayerMr: 'प्रभू, आमच्या तरुणांना आणि विद्यार्थ्यांना योग्य मार्ग दाखव व त्यांच्या जीवनातून तुझे गौरव होऊ दे. आमेन.',
      closingPrayer: 'Lord, guide our youth and let their lives bring glory to Your name. Amen.',
      createdAt: 1700000008000
    },
    {
      id: 'srm_christian_family',
      title: 'Building a Christ-Centered Family & Parenting',
      titleMr: 'ख्रिस्तावर आधारित सुखी कुटुंब आणि सुसंस्कृत पालकत्व',
      occasion: 'कुटुंब सभा / विवाह व पालकत्व (Family & Marriage)',
      duration: '20–30 मिनिटे (20–30 mins)',
      scripture: 'यहोशवा २४:१५ • इफिसकर ५:२५ • इफिसकर ६:१-४',
      book: 'joshua',
      chapter: 24,
      verse: 15,
      openingPrayerMr: 'कुटुंबाची स्थापना करणाऱ्या देवा, आमच्या घरातील पती-पत्नी, आई-वडील आणि मुले यांच्यात तुझी प्रीती, आदर आणि शांती नांदू दे. आमेन.',
      openingPrayer: 'Creator of the family, fill our homes with Your love, respect, and peace. Amen.',
      introductionMr: 'चांगली घरे विटा-सिमेंटने नाही, तर प्रीती, आदर आणि प्रार्थनेने बनतात. यहोशवाने संपूर्ण इस्राएलसमोर ठाम निर्णय घेतला: "मी व माझे घर तर परमेश्वराची सेवा करू."',
      introduction: 'Strong homes are built on love, respect, and prayer—choosing with Joshua: "As for me and my house, we will serve the Lord."',
      points: [
        {
          headingMr: '१. कुटुंबाचा ठाम निर्णय: आम्ही प्रभूची सेवा करू',
          heading: '1. A Household Decision to Serve the Lord',
          time: '७ मिनिटे',
          verseRef: 'यहोशवा २४:१५ (Joshua 24:15)',
          verseQuoteMr: '“पण मी व माझे घर तर परमेश्वराची सेवा करू.”',
          book: 'joshua',
          chapter: 24,
          verse: 15,
          explanationMr: 'घरात देवाचे स्थान पहिले असले पाहिजे. जेव्हा आई-वडील स्वतः प्रार्थना करतात व चर्चमध्ये जातात, तेव्हा मुले आपोआप तेच शिकतात.',
          explanation: 'Put God first in the home; children naturally follow the faith they see lived by their parents.'
        },
        {
          headingMr: '२. पती-पत्नीतील प्रीती आणि आदर',
          heading: '2. Love & Respect in Marriage',
          time: '७ मिनिटे',
          verseRef: 'इफिसकर ५:२५, ३३ (Ephesians 5:25, 33)',
          verseQuoteMr: '“पतींनो, जशी ख्रिस्ताने मंडळीवर प्रीती केली... तशी तुम्हीही आपआपल्या पत्नीवर प्रीती करा.”',
          book: 'ephesians',
          chapter: 5,
          verse: 25,
          explanationMr: 'येशूने मंडळीसाठी स्वतःला दिले—तशीच निस्वार्थी प्रीती आणि सन्मान पती-पत्नीने एकमेकांना दिल्यास घरात स्वर्गीय आनंद राहतो.',
          explanation: 'Selfless love and mutual respect between husband and wife build an unshakeable home.'
        },
        {
          headingMr: '३. मुलांचे प्रभूच्या शिक्षणात संगोपन',
          heading: '3. Raising Children in the Lord',
          time: '७ मिनिटे',
          verseRef: 'इफिसकर ६:१-४ • नीतिसूत्रे २२:६',
          verseQuoteMr: '“मुलांनो, प्रभूमध्ये आपल्या आईबापांच्या आज्ञेत राहा... आणि बापांनो, आपल्या मुलांना राग आणू नका, तर प्रभूच्या शिस्तीत व शिक्षणात त्यांचे पालनपोषण करा.”',
          book: 'ephesians',
          chapter: 6,
          verse: 1,
          explanationMr: 'रागावून नव्हे, तर प्रेमाने व बायबलच्या गोष्टी सांगून मुलांना घडवा. लहानपणी लावलेली चांगली वळणे आयुष्यभर टिकतात.',
          explanation: 'Nurture children patiently with Scripture and prayer rather than anger.'
        }
      ],
      applicationMr: 'आठवड्यातून एक संध्याकाळ "फॅमिली बायबल टाइम" ठेवा—मोबाईल बाजूला ठेवून एकत्र गाणे गा, वचन वाचा आणि प्रार्थना करा.',
      application: 'Set aside one evening a week for Family Bible Time—phones away, worship, Scripture, and prayer together.',
      closingPrayerMr: 'हे प्रभू, आमच्या घरातील प्रत्येक नातेसंबंध तुझ्या कृपेने मजबूत कर. आमचे घर तुझे साक्षीदार होऊ दे. आमेन.',
      closingPrayer: 'Lord, strengthen every relationship in our home and make our family a witness of Your love. Amen.',
      createdAt: 1700000009000
    },
    {
      id: 'srm_healing_hope',
      title: 'Healing, Comfort & Hope in Times of Sickness',
      titleMr: 'आजारीपणात आणि दुःखात देवाची चंगाई व सांत्वन',
      occasion: 'चंगाई प्रार्थना / आजारी व्यक्तींसाठी (Healing & Comfort)',
      duration: '15–25 मिनिटे (15–25 mins)',
      scripture: 'यशया ५३:४-५ • याकोब ५:१४-१५ • स्तोत्रसंहिता १४७:३',
      book: 'james',
      chapter: 5,
      verse: 14,
      openingPrayerMr: 'चंगाई देणाऱ्या देवा, जे कोणी आजारी, थकलेले किंवा दुःखी आहेत त्यांना तुझा बरे करणारा स्पर्श दे आणि मनाला धीर दे. आमेन.',
      openingPrayer: 'Lord our Healer, touch everyone who is sick, weary, or grieving with Your healing hand. Amen.',
      introductionMr: 'शारीरिक आजारपण किंवा मनाचे दुःख आपल्याला खूप खचवून टाकते. पण पवित्र शास्त्र सांगते की आपला प्रभू येशू हा "यहोवा राफा" — म्हणजेच आपला वैद्य आहे!',
      introduction: 'Sickness and pain can discourage us, yet God reveals Himself as Jehovah Rapha—the Lord who heals.',
      points: [
        {
          headingMr: '१. येशूने आपले आजार व वेदना स्वतःवर घेतल्या',
          heading: '1. Jesus Carried Our Sickness and Sorrows',
          time: '६ मिनिटे',
          verseRef: 'यशया ५३:४-५ (Isaiah 53:4-5)',
          verseQuoteMr: '“खरोखर त्याने आमचे रोग स्वतःवर घेतले व आमच्या वेदना वाहिल्या... त्याच्या फटक्यांनी आम्हांला चंगाई मिळाली आहे.”',
          book: 'isaiah',
          chapter: 53,
          verse: 4,
          explanationMr: 'क्रूसावर येशूने केवळ पापाची क्षमाच नाही तर शरीर व मनाच्या चंगाईचाही पाया घातला. आपण त्याच्या कृपेवर हक्काने विश्वास ठेवू शकतो.',
          explanation: 'At the cross, Jesus bore our infirmities and sorrows—we can trust His compassion.'
        },
        {
          headingMr: '२. मंडळीची विश्वासाची प्रार्थना आजाराला उठवते',
          heading: '2. The Prayer of Faith Will Heal the Sick',
          time: '७ मिनिटे',
          verseRef: 'याकोब ५:१४-१५ (James 5:14-15)',
          verseQuoteMr: '“तुमच्यात कोणी आजारी आहे का? त्याने मंडळीच्या वडीलधाऱ्यांना बोलवावे; आणि त्यांनी प्रभूच्या नावाने त्याला तेल लावून त्याच्यासाठी प्रार्थना करावी; म्हणजे विश्वासाची प्रार्थना त्या रोग्याला बरे करील.”',
          book: 'james',
          chapter: 5,
          verse: 14,
          explanationMr: 'डॉक्टरांचे उपचार घेत असतानाही आपण प्रार्थनेचे सामर्थ्य विसरू नये. पास्टर व मंडळी जेव्हा एकमताने प्रार्थना करतात, तेव्हा देव चमत्कार करतो.',
          explanation: 'Alongside medical care, never underestimate the united prayer of pastors and the church.'
        },
        {
          headingMr: '३. देव भग्न अंतःकरणांनाही बरे करतो',
          heading: '3. He Heals the Brokenhearted',
          time: '५ मिनिटे',
          verseRef: 'स्तोत्रसंहिता १४७:३ (Psalm 147:3)',
          verseQuoteMr: '“तो भग्न अंतःकरणाच्या लोकांना बरे करतो आणि त्यांच्या जखमा बांधतो.”',
          book: 'psalms',
          chapter: 147,
          verse: 3,
          explanationMr: 'बाहेरच्या जखमांपेक्षा मनाच्या जखमा खोल असतात. येशू आपल्या हृदयातील एकटेपणा व दुःख हळुवारपणे बरे करतो.',
          explanation: 'Jesus gently binds up emotional wounds, grief, and loneliness.'
        }
      ],
      applicationMr: 'आज तुमच्या ओळखीत जे कोणी आजारी आहेत त्यांना फोन करा आणि त्यांच्यासाठी १ मिनिट प्रार्थना करा.',
      application: 'Call someone who is sick or lonely today and pray a 1-minute blessing over them.',
      closingPrayerMr: 'प्रभू येशू, तुझा चंगाईचा हात आजारी व्यक्तींवर ठेव. त्यांना पूर्ण आरोग्य, धीर आणि शांती दे. आमेन.',
      closingPrayer: 'Lord Jesus, lay Your healing hand upon the sick and grant full restoration and peace. Amen.',
      createdAt: 1700000010000
    },
    {
      id: 'srm_good_shepherd',
      title: 'The Lord Is My Shepherd (Psalm 23)',
      titleMr: 'परमेश्वर माझा मेंढपाळ आहे — मला काहीही उणे पडणार नाही',
      occasion: 'कुटुंब प्रार्थना / सांत्वन व विश्वास (Psalm 23 Meditation)',
      duration: '20–25 मिनिटे (20–25 mins)',
      scripture: 'स्तोत्रसंहिता २३:१-६ • योहान १०:११',
      book: 'psalms',
      chapter: 23,
      verse: 1,
      openingPrayerMr: 'उत्तम मेंढपाळ प्रभू येशू, तू आम्हांला नावाने ओळखतोस आणि हिरव्या कुरणांत चालवतोस. आज तुझ्या वचनाद्वारे आम्हांला तृप्त कर. आमेन.',
      openingPrayer: 'Good Shepherd Jesus, You know us by name and lead us beside still waters. Feed our souls today. Amen.',
      introductionMr: 'बायबलमधील सर्वात प्रसिद्ध आणि प्रत्येकाला धीर देणारे स्तोत्र म्हणजे स्तोत्रसंहिता २३. दावीद स्वतः मेंढपाळ होता, म्हणून त्याला माहीत होते की मेंढपाळ आपल्या मेंढरांची किती काळजी घेतो.',
      introduction: 'Psalm 23 is the most beloved Psalm because David knew firsthand how tenderly a shepherd cares for his sheep.',
      points: [
        {
          headingMr: '१. देव आपली प्रत्येक गरज पुरवतो (उणे पडणार नाही)',
          heading: '1. The Lord Provides Everything We Need',
          time: '७ मिनिटे',
          verseRef: 'स्तोत्रसंहिता २३:१-३ (Psalm 23:1-3)',
          verseQuoteMr: '“परमेश्वर माझा मेंढपाळ आहे; मला काहीही उणे पडणार नाही. तो मला हिरव्या कुरणांत बसवतो; तो मला शांत पाण्याजवळ नेतो; तो माझा जीव ताजातवाना करतो.”',
          book: 'psalms',
          chapter: 23,
          verse: 1,
          explanationMr: 'मेंढरांना स्वतःला रस्ता सापडत नाही; मेंढपाळ त्यांना चांगले चारा व शांत पाणी शोधून देतो. तसेच देव आपल्या कुटुंबाच्या अन्नाची, आरोग्याची आणि आत्मिक शांततेची काळजी घेतो.',
          explanation: 'A shepherd finds green pastures and still waters—God cares for your daily provision and inner rest.'
        },
        {
          headingMr: '२. मृत्युछायेच्या दरीतही आपण एकटे नाही',
          heading: '2. Even in the Darkest Valley, You Are Not Alone',
          time: '७ मिनिटे',
          verseRef: 'स्तोत्रसंहिता २३:४ (Psalm 23:4)',
          verseQuoteMr: '“जरी मी मृत्युछायेच्या दरीतून चाललो, तरी मी कोणत्याही वाईटास भिणार नाही; कारण तू माझ्याबरोबर आहेस; तुझी काठी व तुझा सोटा हीच मला धीर देतात.”',
          book: 'psalms',
          chapter: 23,
          verse: 4,
          explanationMr: 'कधी कधी जीवन अंधारमय दरीसारखे वाटते. पण तेथेही मेंढपाळाची काठी आपले रक्षण करते—तू माझ्याबरोबर आहेस हाच सर्वात मोठा धीर आहे!',
          explanation: 'In the darkest valleys, the Shepherd’s rod and staff protect and comfort us.'
        },
        {
          headingMr: '३. देवाची कृपा व दया आयुष्यभर आपल्या मागोमाग येते',
          heading: '3. Goodness and Mercy Follow Us All Our Days',
          time: '६ मिनिटे',
          verseRef: 'स्तोत्रसंहिता २३:६ (Psalm 23:6)',
          verseQuoteMr: '“निश्चयेकरून माझ्या आयुष्याचे सर्व दिवस चांगुलपणा व दया माझ्या मागोमाग येतील; आणि मी परमेश्वराच्या घरात सर्वकाळ राहीन.”',
          book: 'psalms',
          chapter: 23,
          verse: 6,
          explanationMr: 'आपल्या भूतकाळातील चुकांपेक्षा देवाची दया मोठी आहे, आणि आपले भविष्य अनंतकाळ त्याच्या घरात सुरक्षित आहे.',
          explanation: 'God’s goodness and mercy pursue us every day, and our eternal home is secure.'
        }
      ],
      applicationMr: 'आज कुटुंबातील सर्वांनी मिळून स्तोत्र २३ तोंडपाठ म्हणण्याचा सराव करा आणि संकटात त्याची आठवण ठेवा.',
      application: 'Memorize Psalm 23 together as a family and recite it whenever worry comes.',
      closingPrayerMr: 'उत्तम मेंढपाळा, तुझ्या कळपात आम्हांला सुरक्षित ठेवल्याबद्दल धन्यवाद. तुझी दया आमच्यावर सदैव राहो. आमेन.',
      closingPrayer: 'Good Shepherd, thank You for keeping us safe in Your flock. Amen.',
      createdAt: 1700000011000
    },
    {
      id: 'srm_salvation_newlife',
      title: 'New Life & Salvation in Jesus Christ',
      titleMr: 'ख्रिस्तामध्ये नवीन जीवन आणि तारणाचा आनंद',
      occasion: 'सुवार्ता संदेश / रविवार सेवा (Gospel & Salvation)',
      duration: '20–25 मिनिटे (20–25 mins)',
      scripture: 'योहान ३:१६ • २ करिंथकर ५:१७ • रोमन्स १०:९',
      book: 'john',
      chapter: 3,
      verse: 16,
      openingPrayerMr: 'तारणहार प्रभू येशू, तू क्रूसावर आमच्यासाठी आपले जीवन दिलेस याबद्दल आम्ही तुझे उपकार मानतो. आज प्रत्येक हृदयात तुझ्या तारणाचा आनंद भर. आमेन.',
      openingPrayer: 'Savior Jesus, thank You for giving Your life on the cross for us. Fill every heart with the joy of salvation. Amen.',
      introductionMr: 'माणूस बाहेरून कितीही बदल करण्याचा प्रयत्न करतो, पण आतले हृदय फक्त येशू ख्रिस्तच बदलू शकतो! आज आपण सुवार्तेचा मुख्य संदेश पाहूया.',
      introduction: 'Only Jesus Christ can transform a human heart from the inside out and give true eternal life.',
      points: [
        {
          headingMr: '१. देवाची अफाट प्रीती — योहान ३:१६',
          heading: '1. God’s Unconditional Love',
          time: '७ मिनिटे',
          verseRef: 'योहान ३:१६ (John 3:16)',
          verseQuoteMr: '“कारण देवाने जगावर एवढी प्रीती केली की, त्याने आपला एकुलता एक पुत्र दिला, अशासाठी की जो कोणी त्याच्यावर विश्वास ठेवतो त्याचा नाश होऊ नये तर त्याला अनंतकाळचे जीवन मिळावे.”',
          book: 'john',
          chapter: 3,
          verse: 16,
          explanationMr: 'तारण ही आपण पैशाने किंवा पुण्याने विकत घेतलेली गोष्ट नाही; ती देवाच्या प्रीतीची मोफत देणगी आहे!',
          explanation: 'Salvation is not earned by money or works—it is God’s free gift of love in Christ.'
        },
        {
          headingMr: '२. ख्रिस्तामध्ये आपण नवीन सृष्टी आहोत',
          heading: '2. A New Creation in Christ',
          time: '७ मिनिटे',
          verseRef: '२ करिंथकर ५:१७ (2 Corinthians 5:17)',
          verseQuoteMr: '“म्हणून जो कोणी ख्रिस्तामध्ये आहे, तो नवी सृष्टी आहे; जुने ते होऊन गेले, पाहा सर्व नवे झाले आहे.”',
          book: '2corinthians',
          chapter: 5,
          verse: 17,
          explanationMr: 'तुमचा भूतकाळ कितीही वाईट असला तरी येशूकडे आल्यावर तो जुने सर्व पुसून टाकतो आणि तुम्हाला नवीन सुरुवात देतो.',
          explanation: 'No matter your past, in Christ old things pass away and everything becomes new.'
        },
        {
          headingMr: '३. मुखाने कबूल करणे व हृदयाने विश्वास ठेवणे',
          heading: '3. Confess and Believe',
          time: '६ मिनिटे',
          verseRef: 'रोमन्स १०:९ (Romans 10:9)',
          verseQuoteMr: '“जर तू आपल्या मुखाने येशूला प्रभू म्हणून कबूल करशील व देवाने त्याला मेलेल्यांतून उठवले असा आपल्या अंतःकरणात विश्वास ठेवशील, तर तुझे तारण होईल.”',
          book: 'romans',
          chapter: 10,
          verse: 9,
          explanationMr: 'आजच येशूला तुमच्या जीवनाचा प्रभू व तारणारा म्हणून स्वीकारा आणि शांतीचे नवीन जीवन सुरू करा.',
          explanation: 'Confess Jesus as Lord and believe in your heart—today is the day of salvation.'
        }
      ],
      applicationMr: 'ज्यांनी अद्याप येशूला वैयक्तिक तारणारा म्हणून स्वीकारले नाही, त्यांनी आज नम्रपणे त्याचे स्वागत करावे आणि इतरांनाही ही सुवार्ता सांगावी.',
      application: 'Invite someone this week to hear the Good News of Jesus’ love and forgiveness.',
      closingPrayerMr: 'प्रभू येशू, आमच्या पापांची क्षमा करून आम्हांला नवीन जीवन दिल्याबद्दल धन्यवाद. आम्ही तुझेच आहोत. आमेन.',
      closingPrayer: 'Lord Jesus, thank You for forgiving our sins and giving us new life in You. Amen.',
      createdAt: 1700000012000
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
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (e) {}
  };

  window.getDailySermonTopic = function () {
    const list = window.getSermonTopics();
    if (!list.length) return DEFAULT_SERMON_TOPICS[0];
    return list[getDayOfYear() % list.length];
  };

  let currentSermonId = null;
  let sermonViewMode = 'list';

  window.openSermonStudio = function (topicId) {
    if (typeof switchTab === 'function') switchTab('sermons');
    sermonViewMode = topicId ? 'detail' : 'list';
    window.renderSermonStudio(topicId || null);
  };

  window.openSermonTopicDetail = function (topicId) {
    sermonViewMode = 'detail';
    window.renderSermonStudio(topicId);
    const sc = document.querySelector('#view-sermons .view-scroll-content');
    if (sc) sc.scrollTop = 0;
  };

  window.backToSermonTopicsList = function () {
    sermonViewMode = 'list';
    window.renderSermonStudio(null);
  };

  window.setSermonLang = function (lang) {
    sermonLang = lang === 'en' ? 'en' : 'mr';
    window.renderSermonStudio(currentSermonId);
  };

  window.adjustSermonFont = function (delta) {
    sermonFontSize = Math.max(13, Math.min(22, sermonFontSize + delta));
    window.renderSermonStudio(currentSermonId);
  };

  window.shuffleSermonTopic = function () {
    const list = window.getSermonTopics();
    if (!list.length) return;
    let pool = list.filter(t => t.id !== currentSermonId);
    if (!pool.length) pool = list;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    sermonViewMode = 'detail';
    window.renderSermonStudio(pick.id);
    if (typeof showToast === 'function') showToast('🎲 नवीन प्रवचन विषय निवडला!');
  };


  function getTopicVisualAndContext(active, isMr) {
    const id = active.id || '';
    const ctxMap = {
      srm_prayer_power: {
        contextMr: 'प्रेषित पौलाने फिलिप्पैकर पत्र रोममधील तुरुंगात साखळदंडात असताना लिहिले (इ.स. ६१-६२). कठीण परिस्थितीतही तो "सर्वदा आनंद करा आणि चिंता करू नका" असे सांगतो.',
        wordStudyMr: 'मूळ ग्रीक शब्द "Eirene" (शांती) / हिब्रू "Shalom" — याचा अर्थ केवळ भांडण नसणे नव्हे, तर देवाच्या उपस्थितीमुळे मनाला मिळणारे संपूर्ण स्थैर्य व कल्याण.',
        extraRefs: [
          { label: 'स्तोत्रसंहिता ५५:२२', book: 'psalms', ch: 55, v: 22 },
          { label: 'यिर्मया ३३:३', book: 'jeremiah', ch: 33, v: 3 },
          { label: 'लूक १८:१', book: 'luke', ch: 18, v: 1 }
        ],
        engageMr: 'बोलताना सर्वांना विचारा: "आज आपल्यापैकी प्रत्येकाच्या मनात कोणती एक चिंता आहे जी आपण आत्ता प्रार्थनेत देवाला देऊ शकतो?"',
        svg: '<svg viewBox="0 0 600 170" style="width:100%;max-width:560px;height:auto;display:block;margin:0 auto;"><rect x="10" y="25" width="125" height="120" rx="14" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/><text x="72" y="65" text-anchor="middle" font-size="22">🙌</text><text x="72" y="95" text-anchor="middle" font-size="13" font-weight="800" fill="#92400e">१. स्तुती</text><text x="72" y="116" text-anchor="middle" font-size="11" fill="#78350f">Adoration</text><text x="150" y="90" font-size="20" fill="#9ca3af">→</text><rect x="165" y="25" width="125" height="120" rx="14" fill="#fee2e2" stroke="#ef4444" stroke-width="2"/><text x="227" y="65" text-anchor="middle" font-size="22">🤍</text><text x="227" y="95" text-anchor="middle" font-size="13" font-weight="800" fill="#991b1b">२. क्षमा</text><text x="227" y="116" text-anchor="middle" font-size="11" fill="#7f1d1d">Confession</text><text x="305" y="90" font-size="20" fill="#9ca3af">→</text><rect x="320" y="25" width="125" height="120" rx="14" fill="#d1fae5" stroke="#10b981" stroke-width="2"/><text x="382" y="65" text-anchor="middle" font-size="22">🙏</text><text x="382" y="95" text-anchor="middle" font-size="13" font-weight="800" fill="#065f46">३. आभार</text><text x="382" y="116" text-anchor="middle" font-size="11" fill="#064e3b">Thanksgiving</text><text x="460" y="90" font-size="20" fill="#9ca3af">→</text><rect x="475" y="25" width="115" height="120" rx="14" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/><text x="532" y="65" text-anchor="middle" font-size="22">🕊️</text><text x="532" y="95" text-anchor="middle" font-size="13" font-weight="800" fill="#1e40af">४. विनंती</text><text x="532" y="116" text-anchor="middle" font-size="11" fill="#1e3a8a">Supplication</text></svg>'
      },
      srm_faith_storms: {
        contextMr: 'गालील समुद्र डोंगरांनी वेढलेला असल्यामुळे तिथे अचानक जोरदार वादळे येत असत. नावेतील अनेक शिष्य अनुभवी कोळी (Fishermen) होते, तरीही ते घाबरले—म्हणजे ते वादळ खरोखरच भयंकर होते!',
        wordStudyMr: 'ग्रीक शब्द "Galene" (मोठी शांतता) — येशूच्या एका शब्दाने निसर्गातील प्रक्षुब्ध लाटा आरशासारख्या शांत झाल्या.',
        extraRefs: [
          { label: 'स्तोत्रसंहिता २३:४', book: 'psalms', ch: 23, v: 4 },
          { label: 'योहान १४:२७', book: 'john', ch: 14, v: 27 },
          { label: 'रोमन्स ८:३१', book: 'romans', ch: 8, v: 31 }
        ],
        engageMr: 'श्रोत्यांना सांगा: "वादळ बाहेर असले तरी आपल्या नावेत येशू आहे की नाही, हे सर्वात महत्त्वाचे आहे!"',
        svg: '<svg viewBox="0 0 600 150" style="width:100%;max-width:560px;height:auto;display:block;margin:0 auto;"><rect x="15" y="20" width="165" height="110" rx="14" fill="#fee2e2" stroke="#ef4444" stroke-width="2"/><text x="97" y="58" text-anchor="middle" font-size="22">🌊</text><text x="97" y="88" text-anchor="middle" font-size="13" font-weight="800" fill="#991b1b">जीवनातील वादळ</text><text x="97" y="108" text-anchor="middle" font-size="11" fill="#7f1d1d">भीती व चिंता</text><text x="195" y="80" font-size="22" fill="#9ca3af">→</text><rect x="215" y="20" width="170" height="110" rx="14" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/><text x="300" y="58" text-anchor="middle" font-size="22">✝️</text><text x="300" y="88" text-anchor="middle" font-size="13" font-weight="800" fill="#92400e">येशूला हाक मारा</text><text x="300" y="108" text-anchor="middle" font-size="11" fill="#78350f">“शांत हो, स्तब्ध हो!”</text><text x="400" y="80" font-size="22" fill="#9ca3af">→</text><rect x="420" y="20" width="165" height="110" rx="14" fill="#d1fae5" stroke="#10b981" stroke-width="2"/><text x="502" y="58" text-anchor="middle" font-size="22">🕊️</text><text x="502" y="88" text-anchor="middle" font-size="13" font-weight="800" fill="#065f46">ख्रिस्ताची शांती</text><text x="502" y="108" text-anchor="middle" font-size="11" fill="#064e3b">अंतःकरणात स्थैर्य</text></svg>'
      },
      srm_psalm91_protection: {
        contextMr: 'स्तोत्रसंहिता ९१ हे अनेक अभ्यासकांच्या मते मोशेने किंवा दावीदाने संकटाच्या काळात रचले आहे. प्रभू येशूची परीक्षा होताना सैतानानेही यातील वचनांचा उल्लेख केला होता.',
        wordStudyMr: 'हिब्रू शब्द "Machseh" (आश्रयस्थान) — वादळात वा कडक उन्हात डोंगरातील सुरक्षित गुहा, जिथे कोणताही शत्रू पोहोचू शकत नाही.',
        extraRefs: [
          { label: 'स्तोत्रसंहिता १२१:७-८', book: 'psalms', ch: 121, v: 7 },
          { label: 'नीतिसूत्रे १८:१०', book: 'proverbs', ch: 18, v: 10 },
          { label: 'यशया ५४:१७', book: 'isaiah', ch: 54, v: 17 }
        ],
        engageMr: 'कुटुंबातील सर्वांना विचारा: "दररोज सकाळी घर सोडताना आपण देवाचे संरक्षण वचन का आठवले पाहिजे?"',
        svg: '<svg viewBox="0 0 600 140" style="width:100%;max-width:560px;height:auto;display:block;margin:0 auto;"><rect x="20" y="20" width="160" height="100" rx="14" fill="#d1fae5" stroke="#10b981" stroke-width="2"/><text x="100" y="55" text-anchor="middle" font-size="20">🛡️</text><text x="100" y="84" text-anchor="middle" font-size="13" font-weight="800" fill="#065f46">देवाचा आश्रय</text><text x="195" y="75" font-size="22" fill="#9ca3af">→</text><rect x="220" y="20" width="160" height="100" rx="14" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/><text x="300" y="55" text-anchor="middle" font-size="20">👼</text><text x="300" y="84" text-anchor="middle" font-size="13" font-weight="800" fill="#1e40af">देवदूतांचे रक्षण</text><text x="395" y="75" font-size="22" fill="#9ca3af">→</text><rect x="420" y="20" width="160" height="100" rx="14" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/><text x="500" y="55" text-anchor="middle" font-size="20">🕊️</text><text x="500" y="84" text-anchor="middle" font-size="13" font-weight="800" fill="#92400e">निर्भय जीवन</text></svg>'
      },
      srm_youth_guidance: {
        contextMr: 'शलोमोन राजाने नीतिसूत्रे ३ मध्ये तरुणांना व्यावहारिक जीवनज्ञान दिले, तर यिर्मया २९:११ हे बंदिवासात असलेल्या लोकांना आशेचा संदेश म्हणून दिले होते.',
        wordStudyMr: 'हिब्रू शब्द "Yashar" (मार्ग सरळ करणे) — रस्त्यातील खड्डे आणि अडथळे दूर करून पुढे चालण्याचा मार्ग सुगम करणे.',
        extraRefs: [
          { label: 'स्तोत्रसंहिता ११९:९', book: 'psalms', ch: 119, v: 9 },
          { label: 'याकोब १:५', book: 'james', ch: 1, v: 5 },
          { label: 'उपदेशक १२:१', book: 'ecclesiastes', ch: 12, v: 1 }
        ],
        engageMr: 'तरुणांना विचारा: "तुम्ही जीवनातील मोठा निर्णय घेताना आधी कोणाचा सल्ला घेता?"',
        svg: '<svg viewBox="0 0 600 140" style="width:100%;max-width:560px;height:auto;display:block;margin:0 auto;"><rect x="20" y="20" width="160" height="100" rx="14" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/><text x="100" y="55" text-anchor="middle" font-size="20">🙏</text><text x="100" y="84" text-anchor="middle" font-size="13" font-weight="800" fill="#92400e">देवावर भरवसा</text><text x="195" y="75" font-size="22" fill="#9ca3af">→</text><rect x="220" y="20" width="160" height="100" rx="14" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/><text x="300" y="55" text-anchor="middle" font-size="20">🧭</text><text x="300" y="84" text-anchor="middle" font-size="13" font-weight="800" fill="#1e40af">योग्य मार्गदर्शन</text><text x="395" y="75" font-size="22" fill="#9ca3af">→</text><rect x="420" y="20" width="160" height="100" rx="14" fill="#d1fae5" stroke="#10b981" stroke-width="2"/><text x="500" y="55" text-anchor="middle" font-size="20">🌟</text><text x="500" y="84" text-anchor="middle" font-size="13" font-weight="800" fill="#065f46">उज्ज्वल भविष्य</text></svg>'
      },
      srm_good_shepherd: {
        contextMr: 'दावीद राजा तरुणपणी बेथलेहेमच्या डोंगरावर मेंढरे चारत असे. सिंह व अस्वलापासून मेंढरांचे रक्षण करताना त्याला देवाच्या काळजीचा थेट अनुभव आला.',
        wordStudyMr: 'हिब्रू शब्द "Rohi" (माझा मेंढपाळ) — केवळ कळपाचा मालक नव्हे, तर प्रत्येक मेंढराची वैयक्तिक काळजी घेणारा मित्र व रक्षक.',
        extraRefs: [
          { label: 'योहान १०:११', book: 'john', ch: 10, v: 11 },
          { label: 'यशया ४०:११', book: 'isaiah', ch: 40, v: 11 },
          { label: 'फिलिप्पैकर ४:१९', book: 'philippians', ch: 4, v: 19 }
        ],
        engageMr: 'सर्वांना एकत्र म्हणायला सांगा: "परमेश्वर माझा मेंढपाळ आहे; मला काहीही उणे पडणार नाही!"',
        svg: '<svg viewBox="0 0 600 140" style="width:100%;max-width:560px;height:auto;display:block;margin:0 auto;"><rect x="20" y="20" width="160" height="100" rx="14" fill="#d1fae5" stroke="#10b981" stroke-width="2"/><text x="100" y="55" text-anchor="middle" font-size="20">🌿</text><text x="100" y="84" text-anchor="middle" font-size="13" font-weight="800" fill="#065f46">हिरवे कुरण (पुरवठा)</text><text x="195" y="75" font-size="22" fill="#9ca3af">→</text><rect x="220" y="20" width="160" height="100" rx="14" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/><text x="300" y="55" text-anchor="middle" font-size="20">🦯</text><text x="300" y="84" text-anchor="middle" font-size="13" font-weight="800" fill="#1e40af">दरीत संरक्षण</text><text x="395" y="75" font-size="22" fill="#9ca3af">→</text><rect x="420" y="20" width="160" height="100" rx="14" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/><text x="500" y="55" text-anchor="middle" font-size="20">👑</text><text x="500" y="84" text-anchor="middle" font-size="13" font-weight="800" fill="#92400e">अनंत घर</text></svg>'
      },
      srm_forgiveness_love: {
        contextMr: 'इफिसस शहर विविध संस्कृती व मतभेद असलेल्या लोकांनी भरलेले होते. पौल त्यांना आठवण करून देतो की चर्च आणि कुटुंब हे क्षमेवर टिकलेले असते.',
        wordStudyMr: 'ग्रीक शब्द "Charizomai" (क्षमा करणे) — याचे मूळ "Charis" म्हणजे "कृपा/मोफत देणगी" आहे. क्षमा ही समोरच्याला दिलेली कृपेची भेट आहे.',
        extraRefs: [
          { label: 'मत्तय १८:२१-२२', book: 'matthew', ch: 18, v: 21 },
          { label: '१ करिंथकर १३:४-७', book: '1corinthians', ch: 13, v: 4 },
          { label: 'रोमन्स १२:१८', book: 'romans', ch: 12, v: 18 }
        ],
        engageMr: 'एक छोटा प्रश्न विचारा: "कधी कधी आपण स्वतःचे मन हलके करण्यासाठी क्षमा करणे किती गरजेचे असते, याचा अनुभव तुम्ही घेतला आहे का?"',
        svg: '<svg viewBox="0 0 600 140" style="width:100%;max-width:560px;height:auto;display:block;margin:0 auto;"><rect x="20" y="20" width="160" height="100" rx="14" fill="#fce7f3" stroke="#ec4899" stroke-width="2"/><text x="100" y="55" text-anchor="middle" font-size="20">💔</text><text x="100" y="84" text-anchor="middle" font-size="13" font-weight="800" fill="#9d174d">दुखावलेले मन</text><text x="195" y="75" font-size="22" fill="#9ca3af">→</text><rect x="220" y="20" width="160" height="100" rx="14" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/><text x="300" y="55" text-anchor="middle" font-size="20">✝️</text><text x="300" y="84" text-anchor="middle" font-size="13" font-weight="800" fill="#92400e">ख्रिस्ताची क्षमा</text><text x="395" y="75" font-size="22" fill="#9ca3af">→</text><rect x="420" y="20" width="160" height="100" rx="14" fill="#d1fae5" stroke="#10b981" stroke-width="2"/><text x="500" y="55" text-anchor="middle" font-size="20">🤝</text><text x="500" y="84" text-anchor="middle" font-size="13" font-weight="800" fill="#065f46">नात्यांची चंगाई</text></svg>'
      }
    };

    return ctxMap[id] || {
      contextMr: 'पवित्र शास्त्र केवळ प्राचीन इतिहास नाही, तर आजच्या कुटुंबासाठी आणि मंडळीसाठी देवाचा जिवंत संदेश आहे. प्रत्येक वचन संदर्भासहित समजावून सांगा.',
      wordStudyMr: 'देवाचे वचन (Logos व Rhema) — वाचलेले वचन जेव्हा आपण प्रार्थनेने हृदयात घेतो, तेव्हा ते आपल्या जीवनात सामर्थ्याने कार्य करते.',
      extraRefs: [
        { label: 'स्तोत्रसंहिता ११९:१०५', book: 'psalms', ch: 119, v: 105 },
        { label: 'रोमन्स ८:२८', book: 'romans', ch: 8, v: 28 },
        { label: 'योहान ३:१६', book: 'john', ch: 3, v: 16 }
      ],
      engageMr: 'संदेश देताना श्रोत्यांशी डोळ्यांचा संपर्क ठेवा आणि प्रत्येक मुद्द्यानंतर एक व्यावहारिक उदाहरण द्या.',
      svg: '<svg viewBox="0 0 600 140" style="width:100%;max-width:560px;height:auto;display:block;margin:0 auto;"><rect x="20" y="20" width="160" height="100" rx="14" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/><text x="100" y="55" text-anchor="middle" font-size="20">📖</text><text x="100" y="84" text-anchor="middle" font-size="13" font-weight="800" fill="#1e40af">१. वचन ऐकणे</text><text x="195" y="75" font-size="22" fill="#9ca3af">→</text><rect x="220" y="20" width="160" height="100" rx="14" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/><text x="300" y="55" text-anchor="middle" font-size="20">💡</text><text x="300" y="84" text-anchor="middle" font-size="13" font-weight="800" fill="#92400e">२. समजून घेणे</text><text x="395" y="75" font-size="22" fill="#9ca3af">→</text><rect x="420" y="20" width="160" height="100" rx="14" fill="#d1fae5" stroke="#10b981" stroke-width="2"/><text x="500" y="55" text-anchor="middle" font-size="20">🏠</text><text x="500" y="84" text-anchor="middle" font-size="13" font-weight="800" fill="#065f46">३. घरात आचरण</text></svg>'
    };
  }

  window.renderSermonStudio = function (selectedId = null) {
    const root = document.getElementById('sermon-studio-root');
    if (!root) return;

    const topics = window.getSermonTopics();
    const daily = window.getDailySermonTopic();
    if (selectedId) currentSermonId = selectedId;
    const active = topics.find(t => t.id === (selectedId || currentSermonId)) || daily;
    const isMr = sermonLang === 'mr';

    const builderHtml = `
      <div id="custom-sermon-builder-panel" style="display: none; background: var(--bg-content); border: 1.5px solid var(--primary); border-radius: 18px; padding: 18px; margin-bottom: 18px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h4 style="margin: 0; font-size: 15px; font-weight: 800; color: var(--primary);">✨ नवीन १५–३० मिनिटांचे प्रवचन / भाषण तयार करा</h4>
          <button onclick="document.getElementById('custom-sermon-builder-panel').style.display='none'" style="background: transparent; border: none; font-size: 18px; cursor: pointer; color: var(--text-muted);">&times;</button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 12px;">
          <input id="ai-sermon-topic-input" type="text" placeholder="विषय लिहा (उदा. कुटुंबात प्रार्थना, क्षमा, विश्वास)" style="padding: 10px 12px; border-radius: 10px; border: 1.5px solid var(--border); background: var(--bg); color: var(--text); font-size: 13px;">
          <input id="ai-sermon-verse-input" type="text" placeholder="बायबल संदर्भ (उदा. स्तोत्र २३, योहान ३:१६)" style="padding: 10px 12px; border-radius: 10px; border: 1.5px solid var(--border); background: var(--bg); color: var(--text); font-size: 13px;">
          <select id="ai-sermon-occasion-input" style="padding: 10px 12px; border-radius: 10px; border: 1.5px solid var(--border); background: var(--bg); color: var(--text); font-size: 13px;">
            <option value="कुटुंब प्रार्थना (Family Prayer)">🏠 कुटुंब प्रार्थना (Family Prayer)</option>
            <option value="रविवार चर्च संदेश (Sunday Sermon)">⛪ रविवार चर्च संदेश (Sunday Sermon)</option>
            <option value="तरुण सभा (Youth Meeting)">🔥 तरुण सभा (Youth Meeting)</option>
            <option value="कॉटेज प्रार्थना (Cottage Prayer)">🕯️ कॉटेज प्रार्थना (Cottage Prayer)</option>
          </select>
          <select id="ai-sermon-duration-input" style="padding: 10px 12px; border-radius: 10px; border: 1.5px solid var(--border); background: var(--bg); color: var(--text); font-size: 13px;">
            <option value="15–20 मिनिटे">⏱ १५–२० मिनिटे</option>
            <option value="20–25 मिनिटे" selected>⏱ २०–२५ मिनिटे</option>
            <option value="25–30 मिनिटे">⏱ २५–३० मिनिटे</option>
          </select>
        </div>
        <button onclick="sermonViewMode='detail'; generateCustomSermonSpeech()" class="btn-primary-block" style="margin: 0; padding: 12px; border-radius: 12px; font-size: 13.5px; font-weight: 800;">
          ✨ संपूर्ण मराठी भाषण तयार करा (Generate Speech)
        </button>
      </div>
    `;

    if (sermonViewMode === 'list') {
      const topicCardsHtml = topics.map(t => {
        const isDaily = daily && t.id === daily.id;
        return `
          <div onclick="openSermonTopicDetail('${t.id}')" style="background: var(--bg-content); border: 1.5px solid ${isDaily ? 'var(--primary)' : 'var(--border)'}; border-radius: 18px; padding: 18px; cursor: pointer; display: flex; flex-direction: column; justify-content: space-between; gap: 10px; box-shadow: var(--shadow-sm);">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
                <span style="font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 999px; background: ${isDaily ? 'rgba(16,185,129,0.14)' : 'rgba(224,83,95,0.1)'}; color: ${isDaily ? '#059669' : 'var(--primary)'};">
                  ${isDaily ? '✨ आजचा विशेष विषय (Today)' : '⏱ ' + (t.duration || '20–25 मिनिटे')}
                </span>
                <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">${t.occasion || ''}</span>
              </div>
              <h3 style="margin: 0 0 4px 0; font-size: 17px; font-weight: 800; color: var(--text); line-height: 1.35;">${isMr ? (t.titleMr || t.title) : t.title}</h3>
              <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">${isMr ? t.title : (t.titleMr || '')}</div>
              <div style="font-size: 12.5px; font-weight: 700; color: var(--primary);">📖 ${t.scripture}</div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid var(--border); font-size: 12.5px; font-weight: 800; color: var(--primary);">
              <span>${(t.points || []).length} सविस्तर मुद्दे व प्रार्थना</span>
              <span>संपूर्ण माहिती पहा &rarr;</span>
            </div>
          </div>
        `;
      }).join('');

      root.innerHTML = `
        <div style="background: linear-gradient(135deg, #1f1b2e 0%, #3b1d2a 100%); color: #fff; border-radius: 20px; padding: 20px; margin-bottom: 16px; box-shadow: 0 10px 28px rgba(0,0,0,0.18);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
            <div>
              <span style="display: inline-block; background: rgba(255,255,255,0.15); padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; margin-bottom: 8px;">🎙️ प्रवचन व भाषण तयारी स्टुडिओ • SERMON AI</span>
              <h2 style="margin: 0 0 6px 0; font-size: 21px; font-weight: 800;">प्रवचन विषय निवडा (१५–३० मिनिटांची संपूर्ण माहिती)</h2>
              <p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.84);">कोणत्याही एका विषयावर क्लिक करा — त्या विषयाचे सर्व मुद्दे, बायबल वचने, उदाहरणे आणि प्रार्थना एकाच पानावर वाचता येतील.</p>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button onclick="shuffleSermonTopic()" style="background: #f59e0b; color: #111827; border: none; padding: 9px 13px; border-radius: 12px; font-size: 12.5px; font-weight: 800; cursor: pointer;">🎲 रँडम विषय उघडा</button>
              <button onclick="openCustomSermonBuilder()" style="background: rgba(255,255,255,0.18); color: #fff; border: 1px solid rgba(255,255,255,0.3); padding: 9px 13px; border-radius: 12px; font-size: 12.5px; font-weight: 800; cursor: pointer;">✨ स्वतःचा विषय तयार करा</button>
            </div>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.15); align-items: center;">
            <span style="font-size: 11.5px; color: rgba(255,255,255,0.8); font-weight: 700;">भाषा / Language:</span>
            <button onclick="setSermonLang('mr')" style="padding: 5px 11px; border-radius: 8px; border: none; font-size: 12px; font-weight: 800; cursor: pointer; background: ${isMr ? '#fff' : 'rgba(255,255,255,0.15)'}; color: ${isMr ? '#111827' : '#fff'};">मराठी (सोपी भाषा)</button>
            <button onclick="setSermonLang('en')" style="padding: 5px 11px; border-radius: 8px; border: none; font-size: 12px; font-weight: 800; cursor: pointer; background: ${!isMr ? '#fff' : 'rgba(255,255,255,0.15)'}; color: ${!isMr ? '#111827' : '#fff'};">English</button>
          </div>
        </div>
        ${builderHtml}
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px;">
          ${topicCardsHtml}
        </div>
      `;
      return;
    }

    const pointsHtml = (active.points || []).map((pt) => {
      const heading = isMr ? (pt.headingMr || pt.heading) : (pt.heading || pt.headingMr);
      const explanation = isMr ? (pt.explanationMr || pt.explanation) : (pt.explanation || pt.explanationMr);
      const illustration = isMr ? (pt.illustrationMr || pt.illustration) : (pt.illustration || pt.illustrationMr);
      const verseBtn = pt.book
        ? `<button onclick="openReaderAndNavigate('${pt.book}', ${pt.chapter || 1}, ${pt.verse || 1})" style="background: rgba(224,83,95,0.12); color: var(--primary); border: 1px solid rgba(224,83,95,0.3); padding: 4px 10px; border-radius: 8px; font-size: 11.5px; font-weight: 800; cursor: pointer;">📖 वचन वाचा</button>`
        : '';
      return `
        <div style="background: var(--bg); border: 1.5px solid var(--border); border-radius: 16px; padding: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
            <h5 style="margin: 0; font-size: ${sermonFontSize + 1}px; font-weight: 800; color: var(--primary); line-height: 1.4;">${heading}</h5>
            ${pt.time ? `<span style="font-size: 11px; font-weight: 800; padding: 3px 9px; border-radius: 999px; background: rgba(59,130,246,0.12); color: #2563eb; white-space: nowrap;">⏱ ${pt.time}</span>` : ''}
          </div>
          ${pt.verseRef || pt.verseQuoteMr ? `
            <div style="background: rgba(245,158,11,0.08); border-left: 4px solid #f59e0b; padding: 10px 12px; border-radius: 0 10px 10px 0; margin-bottom: 10px;">
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px;">
                <span style="font-size: 12px; font-weight: 800; color: #b45309;">📖 संदर्भ: ${pt.verseRef || ''}</span>
                ${verseBtn}
              </div>
              ${pt.verseQuoteMr ? `<div style="font-size: ${sermonFontSize - 0.5}px; line-height: 1.65; font-weight: 600; color: var(--text);">${pt.verseQuoteMr}</div>` : ''}
            </div>
          ` : ''}
          <p style="margin: 0; font-size: ${sermonFontSize}px; line-height: 1.75; color: var(--text);">${explanation}</p>
          ${illustration ? `<div style="margin-top: 10px; padding: 10px 12px; border-left: 3px solid #10b981; background: rgba(16,185,129,0.07); border-radius: 0 8px 8px 0; font-size: ${sermonFontSize - 1}px; line-height: 1.65; color: var(--text);"><strong>💡 दृष्टांत / उदाहरण:</strong> ${illustration}</div>` : ''}
        </div>
      `;
    }).join('');

    const openingText = isMr ? (active.openingPrayerMr || active.openingPrayer) : (active.openingPrayer || active.openingPrayerMr);
    const introText = isMr ? (active.introductionMr || active.introduction) : (active.introduction || active.introductionMr);
    const appText = isMr ? (active.applicationMr || active.application) : (active.application || active.applicationMr);
    const closingText = isMr ? (active.closingPrayerMr || active.closingPrayer) : (active.closingPrayer || active.closingPrayerMr);

    root.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 14px;">
        <button onclick="backToSermonTopicsList()" style="background: var(--bg-content); border: 1.5px solid var(--border); color: var(--text); padding: 8px 14px; border-radius: 12px; font-size: 13px; font-weight: 800; cursor: pointer;">
          &larr; सर्व विषय पहा (All Topics)
        </button>
        <div style="display: flex; gap: 6px; align-items: center;">
          <button onclick="setSermonLang('mr')" style="padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border); font-size: 12px; font-weight: 800; cursor: pointer; background: ${isMr ? 'var(--primary)' : 'var(--bg-content)'}; color: ${isMr ? '#fff' : 'var(--text)'};">मराठी</button>
          <button onclick="setSermonLang('en')" style="padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border); font-size: 12px; font-weight: 800; cursor: pointer; background: ${!isMr ? 'var(--primary)' : 'var(--bg-content)'}; color: ${!isMr ? '#fff' : 'var(--text)'};">English</button>
          <button onclick="adjustSermonFont(-1)" style="padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-content); color: var(--text); font-weight: 800; cursor: pointer;">A-</button>
          <button onclick="adjustSermonFont(1)" style="padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-content); color: var(--text); font-weight: 800; cursor: pointer;">A+</button>
        </div>
      </div>

      <div style="background: var(--bg-content); border: 1.5px solid var(--border); border-radius: 20px; padding: 20px; display: flex; flex-direction: column; gap: 16px; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px; border-bottom: 1px solid var(--border); padding-bottom: 14px;">
          <div>
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 6px;">
              <span style="font-size: 11.5px; font-weight: 800; padding: 3px 10px; border-radius: 999px; background: rgba(224,83,95,0.12); color: var(--primary);">⏱ ${active.duration || '20–25 मिनिटे'}</span>
              <span style="font-size: 11.5px; font-weight: 700; padding: 3px 10px; border-radius: 999px; background: var(--bg); border: 1px solid var(--border); color: var(--text-muted);">${active.occasion || 'कुटुंब व चर्च'}</span>
            </div>
            <h3 style="margin: 0 0 4px 0; font-size: 20px; font-weight: 800; color: var(--text); line-height: 1.35;">${isMr ? (active.titleMr || active.title) : active.title}</h3>
            <div style="font-size: 12.5px; font-weight: 600; color: var(--text-muted);">${isMr ? active.title : (active.titleMr || '')}</div>
            <div style="font-size: 13px; color: var(--primary); font-weight: 700; margin-top: 6px;">📖 मुख्य वचने: ${active.scripture}</div>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${active.book ? `<button onclick="openReaderAndNavigate('${active.book}', ${active.chapter || 1}, ${active.verse || 1})" class="btn-secondary-mini" style="padding: 8px 12px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer;">📖 मुख्य अध्याय वाचा</button>` : ''}
            <button onclick="copyActiveSermon('${active.id}')" class="btn-secondary-mini" style="padding: 8px 12px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer;">📋 भाषण कॉपी करा</button>
          </div>
        </div>

        <div style="background: rgba(16,185,129,0.07); border: 1px solid rgba(16,185,129,0.25); border-radius: 14px; padding: 15px;">
          <div style="font-size: 12px; font-weight: 800; color: #059669; margin-bottom: 5px;">🙏 १. सुरुवातीची प्रार्थना (२–३ मिनिटे)</div>
          <p style="margin: 0; font-size: ${sermonFontSize}px; line-height: 1.7; color: var(--text); font-style: italic;">"${openingText}"</p>
        </div>

        <div>
          <div style="font-size: 12px; font-weight: 800; color: var(--text-muted); margin-bottom: 6px;">💬 २. प्रस्तावना / विषयाची ओळख (३–४ मिनिटे)</div>
          <p style="margin: 0; font-size: ${sermonFontSize}px; line-height: 1.75; color: var(--text);">${introText}</p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="font-size: 12px; font-weight: 800; color: var(--text-muted);">📌 ३. सविस्तर मुद्दे व बायबल वचन संदर्भ (१५–२० मिनिटे)</div>
          ${pointsHtml}
        </div>

        <div style="background: rgba(59,130,246,0.07); border: 1px solid rgba(59,130,246,0.25); border-radius: 14px; padding: 15px;">
          <div style="font-size: 12px; font-weight: 800; color: #2563eb; margin-bottom: 5px;">🏠 ४. कुटुंब व दैनंदिन जीवनातील उपयोग (३–४ मिनिटे)</div>
          <p style="margin: 0; font-size: ${sermonFontSize}px; line-height: 1.7; color: var(--text);">${appText}</p>
        </div>

        <!-- Visual Diagram & Bible Historical Context -->
        <div style="background: var(--bg); border: 1.5px solid var(--border); border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 12px;">
          <div style="font-size: 12px; font-weight: 800; color: var(--primary);">🎨 विषयाचे चित्ररूप सादरीकरण (Visual Summary)</div>
          ${getTopicVisualAndContext(active, isMr).svg}
          <div style="background: rgba(59,130,246,0.06); border-left: 4px solid #3b82f6; padding: 10px 12px; border-radius: 0 10px 10px 0;">
            <div style="font-size: 12px; font-weight: 800; color: #1d4ed8; margin-bottom: 3px;">🏛️ बायबल ऐतिहासिक पार्श्वभूमी व शब्दार्थ (Context & Word Study)</div>
            <div style="font-size: ${sermonFontSize - 0.5}px; line-height: 1.65; color: var(--text);">${getTopicVisualAndContext(active, isMr).contextMr}</div>
            <div style="font-size: ${sermonFontSize - 0.5}px; line-height: 1.65; color: var(--text); margin-top: 6px;"><strong>📖 मूल शब्दार्थ:</strong> ${getTopicVisualAndContext(active, isMr).wordStudyMr}</div>
          </div>
          <div>
            <div style="font-size: 12px; font-weight: 800; color: var(--text-muted); margin-bottom: 6px;">🔗 भाषणासाठी अतिरिक्त बायबल संदर्भ (Extra Cross-References):</div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              ${getTopicVisualAndContext(active, isMr).extraRefs.map(r => `<button onclick="openReaderAndNavigate('${r.book}', ${r.ch}, ${r.v})" style="padding: 6px 11px; border-radius: 999px; border: 1px solid var(--border); background: var(--bg-content); color: var(--primary); font-size: 12px; font-weight: 800; cursor: pointer;">📖 ${r.label}</button>`).join('')}
            </div>
          </div>
          <div style="background: rgba(245,158,11,0.08); border-radius: 10px; padding: 10px 12px; font-size: ${sermonFontSize - 0.5}px; color: var(--text);">
            <strong>🎤 बोलताना लक्षात ठेवा (Speaker Tip):</strong> ${getTopicVisualAndContext(active, isMr).engageMr}
          </div>
        </div>

        <div style="background: rgba(168,85,247,0.07); border: 1px solid rgba(168,85,247,0.25); border-radius: 14px; padding: 15px;">
          <div style="font-size: 12px; font-weight: 800; color: #7e22ce; margin-bottom: 5px;">🕊️ ५. शेवटची प्रार्थना व आशीर्वाद (२–३ मिनिटे)</div>
          <p style="margin: 0; font-size: ${sermonFontSize}px; line-height: 1.7; color: var(--text); font-style: italic;">"${closingText}"</p>
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
    const verse = (document.getElementById('ai-sermon-verse-input')?.value || '').trim() || 'स्तोत्रसंहिता २३ • फिलिप्पैकर ४:६-७ • रोमन्स ८:२८';
    const occasion = document.getElementById('ai-sermon-occasion-input')?.value || 'कुटुंब प्रार्थना (Family Prayer)';
    const duration = document.getElementById('ai-sermon-duration-input')?.value || '20–25 मिनिटे';

    if (!topic) {
      if (typeof showToast === 'function') showToast('कृपया विषयाचे नाव लिहा / Please enter a topic');
      return;
    }

    const newSermon = {
      id: 'srm_custom_' + Date.now(),
      title: topic,
      titleMr: topic,
      occasion: occasion,
      duration: duration,
      scripture: verse,
      openingPrayerMr: `हे स्वर्गीय पित्या, आज या ${occasion} मध्ये आम्हांला एकत्र आणल्याबद्दल तुझे आभार. "${topic}" या विषयावर तुझे वचन समजून घेण्यासाठी आम्हांला ज्ञान, नम्र हृदय आणि विश्वास दे. प्रभू येशूच्या नावाने, आमेन.`,
      openingPrayer: `Heavenly Father, guide us as we reflect on "${topic}" from ${verse}. Amen.`,
      introductionMr: `सर्वांना प्रभू येशू ख्रिस्ताच्या नावात सलाम! आजच्या ${occasion} मध्ये आपण "${topic}" या महत्त्वाच्या विषयावर बोलणार आहोत. यासाठी आपण ${verse} हे पवित्र वचन पाहूया. ही शिकवण लहानांपासून मोठ्यांपर्यंत प्रत्येकाला समजेल आणि दैनंदिन जीवनात उपयोगी पडेल अशी आहे.`,
      introduction: `Today we reflect on "${topic}" anchored in ${verse}.`,
      points: [
        {
          headingMr: `१. पवित्र शास्त्र "${topic}" बद्दल काय शिकवते?`,
          heading: `1. What Scripture Teaches About ${topic}`,
          time: '६ मिनिटे',
          verseRef: verse,
          explanationMr: `${verse} या वचनाकडे लक्ष द्या. देव आपल्याला कधीही गोंधळात ठेवत नाही. जेव्हा आपण "${topic}" या विषयाचा पाया देवाच्या वचनावर ठेवतो, तेव्हा आपला विश्वास अधिक दृढ होतो आणि आपल्या कुटुंबाला योग्य दिशा मिळते.`,
          explanation: `Anchoring "${topic}" in ${verse} gives our faith a steady foundation.`,
          illustrationMr: `जसे घर बांधण्यापूर्वी नकाशा पाहिला जातो, तसेच जीवनाचा प्रत्येक निर्णय देवाच्या वचनानुसार घेतला पाहिजे.`
        },
        {
          headingMr: `२. जीवनातील अडचणी आणि देवाची कृपा`,
          heading: `2. Overcoming Daily Struggles by Grace`,
          time: '७ मिनिटे',
          verseRef: '२ करिंथकर १२:९ • फिलिप्पैकर ४:१३',
          verseQuoteMr: '“माझी कृपा तुला पुरेशी आहे; कारण दुर्बलतेतच माझे सामर्थ्य पूर्ण होते.”',
          explanationMr: `रोजच्या धावपळीत, कामाच्या ताणात किंवा घरगुती अडचणींत कधी कधी थकवा येतो. पण येशू आपल्या दुर्बलतेत आपल्याला बळ देतो. "${topic}" हे आपण स्वतःच्या ताकदीवर नाही, तर पवित्र आत्म्याच्या मदतीने जगू शकतो.`,
          explanation: `In busyness and pressure, Christ’s grace gives us strength to practice "${topic}".`
        },
        {
          headingMr: `३. कुटुंबात आणि समाजात "${topic}" कसे जगावे?`,
          heading: `3. Living Out "${topic}" at Home & Church`,
          time: '७ मिनिटे',
          verseRef: 'कलस्सैकर ३:१७ (Colossians 3:17)',
          verseQuoteMr: '“शब्दाने किंवा कृतीने तुम्ही जे काही कराल ते सर्व प्रभू येशूच्या नावाने करा.”',
          explanationMr: `आपला विश्वास फक्त चर्चपुरता मर्यादित न राहता आपल्या घरात, बोलण्यात, वागण्यात आणि शेजाऱ्यांशी असलेल्या नात्यात दिसला पाहिजे. या आठवड्यात "${topic}" या शिकवणीचा प्रत्यक्षात सराव करूया.`,
          explanation: `Let "${topic}" shape our words, patience, and prayers at home this week.`
        }
      ],
      applicationMr: `या आठवड्यात "${topic}" या विषयावर दररोज सकाळी कुटुंबासोबत ५ मिनिटे प्रार्थना करा आणि ${verse} हे वचन वाचा.`,
      application: `Pray together as a family around "${topic}" and read ${verse} each morning this week.`,
      closingPrayerMr: `प्रभू येशू, "${topic}" हा संदेश आमच्या अंतःकरणात स्थिर कर. आमचे कुटुंब आणि चर्च तुझ्या प्रीतीने व शांतीने भरून टाक. आमेन.`,
      closingPrayer: `Lord Jesus, seal "${topic}" in our hearts and bless our families. Amen.`,
      createdAt: Date.now()
    };

    const list = window.getSermonTopics();
    list.unshift(newSermon);
    window.saveSermonTopics(list);
    if (window.FirebaseApp && typeof FirebaseApp.setDoc === 'function') {
      FirebaseApp.setDoc('sermon_topics', newSermon.id, newSermon).catch(() => {});
    }

    window.renderSermonStudio(newSermon.id);
    if (typeof showToast === 'function') showToast('✨ संपूर्ण मराठी भाषण तयार व सेव्ह झाले!');
  };

  window.copyActiveSermon = function (id) {
    const s = window.getSermonTopics().find(t => t.id === id);
    if (!s) return;
    const isMr = sermonLang === 'mr';
    const text = [
      `${isMr ? (s.titleMr || s.title) : s.title} (${s.duration})`,
      `संदर्भ / Scriptures: ${s.scripture}`,
      '',
      `१. सुरुवातीची प्रार्थना:\n${isMr ? (s.openingPrayerMr || s.openingPrayer) : s.openingPrayer}`,
      '',
      `२. प्रस्तावना:\n${isMr ? (s.introductionMr || s.introduction) : s.introduction}`,
      '',
      '३. मुख्य मुद्दे:',
      ...(s.points || []).map(p => [
        `${isMr ? (p.headingMr || p.heading) : p.heading} [${p.time || ''}]`,
        p.verseRef ? `संदर्भ: ${p.verseRef}` : '',
        p.verseQuoteMr ? `वचन: ${p.verseQuoteMr}` : '',
        isMr ? (p.explanationMr || p.explanation) : p.explanation,
        (isMr ? (p.illustrationMr || p.illustration) : p.illustration) ? `दृष्टांत: ${isMr ? (p.illustrationMr || p.illustration) : p.illustration}` : ''
      ].filter(Boolean).join('\n')),
      '',
      `४. व्यावहारिक उपयोग:\n${isMr ? (s.applicationMr || s.application) : s.application}`,
      '',
      `५. शेवटची प्रार्थना:\n${isMr ? (s.closingPrayerMr || s.closingPrayer) : s.closingPrayer}`
    ].join('\n\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        if (typeof showToast === 'function') showToast('📋 संपूर्ण भाषण कॉपी झाले!');
      }).catch(() => {});
    }
  };

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
