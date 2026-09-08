/* ==========================================================================
   sarvam-tts.js — Multi-Engine Scripture Narration System
   River of Life Bible App - Natural Marathi & Multi-Voice Audio System
   
   Supported Voice Engines:
     - Google Natural Marathi Neural Voice (Fast, 100% Free, Authentic Marathi)
     - Sarvam AI Bulbul V3 (Shubh, Ratan, Aditya, Priya - Devotional Marathi)
     - ElevenLabs (GEE: QWwKUPVe8SndiTgtz6yz, Shrey: C9v09R5AIM6tOX6Fn06I)
     - High-Quality Device Web Speech (Offline Fallback)
   ========================================================================== */

(function (window) {
  'use strict';

  // 1. Master Configuration
  var TTS_CONFIG = {
    // Default Voice Selection
    defaultVoice: 'google_natural_mr',

    // Google Natural Audio Engine Specs
    google_natural: {
      endpoint: 'https://translate.google.com/translate_tts',
      client: 'tw-ob',
      maxChunkLen: 160
    },

    // ElevenLabs Specs
    elevenlabs: {
      endpoint: 'https://api.elevenlabs.io/v1/text-to-speech',
      defaultVoiceId: 'QWwKUPVe8SndiTgtz6yz', // GEE - Custom Authentic Marathi Voice
      defaultModelId: 'eleven_multilingual_v2',
      defaultVoiceSettings: {
        stability: 0.38,
        similarity_boost: 0.82,
        style: 0.42,
        use_speaker_boost: true
      },
      defaultPace: 0.88,
      getApiKey: function () {
        var localKey = (typeof localStorage !== 'undefined') ? localStorage.getItem('rol_elevenlabs_api_key') : null;
        return localKey || (typeof window !== 'undefined' && window.ELEVENLABS_API_KEY) || (typeof window !== 'undefined' && window.state && window.state.elevenlabsApiKey) || '';
      },
      setApiKey: function (key) {
        if (typeof localStorage !== 'undefined') {
          if (key && key.trim()) {
            localStorage.setItem('rol_elevenlabs_api_key', key.trim());
          } else {
            localStorage.removeItem('rol_elevenlabs_api_key');
          }
        }
      }
    },

    // Sarvam AI Specs
    sarvam: {
      endpoint: 'https://api.sarvam.ai/text-to-speech',
      model: 'bulbul:v3',
      defaultPace: 0.86,
      loudness: 1.1,
      speechSampleRate: 24000,
      enablePreprocessing: true,
      speakers: {
        'mr-IN': 'shubh',
        'en-IN': 'shubh',
        'hi-IN': 'shubh'
      },
      getApiKey: function () {
        var localKey = (typeof localStorage !== 'undefined') ? localStorage.getItem('rol_sarvam_api_key') : null;
        return localKey || (typeof window !== 'undefined' && window.SARVAM_API_KEY) || (typeof window !== 'undefined' && window.state && window.state.sarvamApiKey) || '';
      },
      setApiKey: function (key) {
        if (typeof localStorage !== 'undefined') {
          if (key && key.trim()) {
            localStorage.setItem('rol_sarvam_api_key', key.trim());
          } else {
            localStorage.removeItem('rol_sarvam_api_key');
          }
        }
      }
    },

    availableVoices: [
      { id: 'google_natural_mr', name: '🌟 नैसर्गिक मराठी आवाज (Google Natural Marathi - Recommended)', lang: 'mr-IN', provider: 'google_natural' },
      { id: 'shubh', name: '🕊️ Shubh (शांत, गंभीर व भावपूर्ण मराठी आवाज - Sarvam AI)', lang: 'mr-IN', provider: 'sarvam' },
      { id: 'ratan', name: '🎙️ Ratan (नैसर्गिक व स्पष्ट मराठी आवाज - Sarvam AI)', lang: 'mr-IN', provider: 'sarvam' },
      { id: 'gee_elevenlabs', name: '🎙️ GEE - Custom Marathi Voice (ElevenLabs)', lang: 'mr-IN', provider: 'elevenlabs', voiceId: 'QWwKUPVe8SndiTgtz6yz', modelId: 'eleven_multilingual_v2' },
      { id: 'shrey_elevenlabs', name: '✨ Shrey - Deep Marathi Conversational (ElevenLabs)', lang: 'mr-IN', provider: 'elevenlabs', voiceId: 'C9v09R5AIM6tOX6Fn06I', modelId: 'eleven_v3' },
      { id: 'google_natural_en', name: '📖 Natural English Voice (Google Natural)', lang: 'en-US', provider: 'google_natural' },
      { id: 'google_natural_hi', name: '🕊️ Natural Hindi Voice (Google Natural)', lang: 'hi-IN', provider: 'google_natural' },
      { id: 'device_webspeech', name: '📱 डिव्हाइस आवाज (Device Web Speech)', lang: 'mr-IN', provider: 'webspeech' }
    ]
  };

  // 2. High-Performance Audio Cache (In-Memory + IndexedDB)
  var memoryAudioCache = new Map();
  var dbInstance = null;

  function initIndexedDB() {
    return new Promise(function (resolve) {
      if (!window.indexedDB) {
        resolve(null);
        return;
      }
      try {
        var req = indexedDB.open('RiverOfLife_Universal_TTS_Cache', 3);
        req.onupgradeneeded = function (e) {
          var db = e.target.result;
          if (!db.objectStoreNames.contains('audio_blobs')) {
            db.createObjectStore('audio_blobs');
          }
        };
        req.onsuccess = function (e) {
          dbInstance = e.target.result;
          resolve(dbInstance);
        };
        req.onerror = function () {
          resolve(null);
        };
      } catch (err) {
        resolve(null);
      }
    });
  }

  function getCacheKey(text, lang, speaker, pace) {
    var hash = 0;
    var str = text + '_' + lang + '_' + speaker + '_' + (typeof pace === 'number' ? pace.toFixed(2) : pace);
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return 'tts_v6_' + hash;
  }

  async function getCachedAudio(key) {
    if (memoryAudioCache.has(key)) {
      return memoryAudioCache.get(key);
    }
    if (!dbInstance) await initIndexedDB();
    if (!dbInstance) return null;

    return new Promise(function (resolve) {
      try {
        var tx = dbInstance.transaction('audio_blobs', 'readonly');
        var store = tx.objectStore('audio_blobs');
        var req = store.get(key);
        req.onsuccess = function () {
          if (req.result) {
            memoryAudioCache.set(key, req.result);
            resolve(req.result);
          } else {
            resolve(null);
          }
        };
        req.onerror = function () { resolve(null); };
      } catch (e) {
        resolve(null);
      }
    });
  }

  async function setCachedAudio(key, blob) {
    memoryAudioCache.set(key, blob);
    if (!dbInstance) await initIndexedDB();
    if (!dbInstance) return;

    try {
      var tx = dbInstance.transaction('audio_blobs', 'readwrite');
      var store = tx.objectStore('audio_blobs');
      store.put(blob, key);
    } catch (e) {
      console.warn('[TTS Cache] Failed to cache to IndexedDB:', e);
    }
  }

  // 3. AudioContext Unlocker for Mobile WebKit / Chrome
  var globalAudioCtx = null;
  function unlockAudioContext() {
    try {
      var AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass && !globalAudioCtx) {
        globalAudioCtx = new AudioCtxClass();
      }
      if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
        globalAudioCtx.resume();
      }
    } catch (e) {}
  }

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    ['touchstart', 'touchend', 'click', 'keydown'].forEach(function(ev) {
      window.addEventListener(ev, unlockAudioContext, { once: true, passive: true });
    });
  }

  // 4. Bible Text Optimizer & Scripture Normalizer
  var ScriptureOptimizer = {
    optimizeForNarration: function (text, lang) {
      if (!text) return '';
      var cleaned = text;

      // Remove footnote tags & verse numbers
      cleaned = cleaned.replace(/\s*\[[a-zA-Z0-9]+\]/g, '');
      cleaned = cleaned.replace(/\s*\([0-9]+\)/g, '');
      cleaned = cleaned.replace(/[*†‡§]/g, '');
      cleaned = cleaned.replace(/^[\d\u0966-\u096F]+[\.\:\s\-]+/g, '');

      // Replace abrupt dashes with devotional pauses
      cleaned = cleaned.replace(/[—–]/g, ', ');
      cleaned = cleaned.replace(/\s*;\s*/g, ', ');
      cleaned = cleaned.replace(/\s*,\s*/g, ', ');
      cleaned = cleaned.replace(/\s*\.\s*/g, '. ');

      // Insert subtle devotional breath pauses for key spiritual vocatives and connectors
      cleaned = cleaned.replace(/(हे स्वर्गीय पित्या|हे प्रभू|हे देवा|प्रियांनो|आमेन|परमेश्वरा|पवित्र आत्म्या|येशू ख्रिस्ता)/g, '$1, ');
      cleaned = cleaned.replace(/\s+(आणि|तेव्हा|म्हणून|कारण|तर|म्हणजे|परंतु|तथापि)\s+/g, ', $1 ');

      // Normalize whitespace
      cleaned = cleaned.replace(/\s+/g, ' ').trim();

      if (cleaned && !/[.!?:,;।]$/.test(cleaned)) {
        cleaned += (lang === 'mr-IN' || lang === 'hi-IN' || /[\u0900-\u097F]/.test(cleaned)) ? ' ।' : '.';
      }

      return cleaned;
    },

    chunkPassage: function (text, maxChars) {
      if (!maxChars) maxChars = 160;
      if (!text) return [];
      if (text.length <= maxChars) return [text];

      var parts = text.split(/([,;।\.\?\!]\s*)/);
      var chunks = [];
      var currentChunk = '';

      for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        if (!part) continue;
        if ((currentChunk + part).length > maxChars) {
          if (currentChunk.trim()) chunks.push(currentChunk.trim());
          currentChunk = part;
        } else {
          currentChunk += part;
        }
      }

      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }

      return chunks;
    }
  };

  function base64ToBlob(base64Data, contentType) {
    if (!contentType) contentType = 'audio/wav';
    var sliceSize = 1024;
    var byteCharacters = atob(base64Data);
    var bytesLength = byteCharacters.length;
    var slicesCount = Math.ceil(bytesLength / sliceSize);
    var byteArrays = new Array(slicesCount);

    for (var sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
      var begin = sliceIndex * sliceSize;
      var end = Math.min(begin + sliceSize, bytesLength);

      var bytes = new Array(end - begin);
      for (var offset = begin, i = 0; offset < end; ++i, ++offset) {
        bytes[i] = byteCharacters.charCodeAt(offset);
      }
      byteArrays[sliceIndex] = new Uint8Array(bytes);
    }

    return new Blob(byteArrays, { type: contentType });
  }

  // 5. Multi-Engine Synthesis Client
  var MultiEngineTTSClient = {
    // Master synthesis entry point with graceful multi-tier fallback
    synthesizeText: async function (text, options) {
      if (!options) options = {};
      var isDevanagari = /[\u0900-\u097F]/.test(text || '');
      var lang = options.lang || (isDevanagari ? 'mr-IN' : 'en-IN');
      var speaker = (options.speaker || TTS_CONFIG.defaultVoice || 'google_natural_mr').toLowerCase();

      var voiceDef = TTS_CONFIG.availableVoices.find(function(v) { return v.id.toLowerCase() === speaker; });

      // 1. Google Natural Audio Engine (Default & Rock-solid)
      if (!voiceDef || voiceDef.provider === 'google_natural' || speaker.includes('google') || speaker === 'natural') {
        try {
          return await MultiEngineTTSClient.synthesizeGoogleNatural(text, options);
        } catch (gErr) {
          console.warn('[TTS Cascade] Google Natural Audio error, falling back...', gErr);
        }
      }

      // 2. ElevenLabs Custom Voice (if user configured)
      if (
        (voiceDef && voiceDef.provider === 'elevenlabs') ||
        speaker.includes('elevenlabs') ||
        speaker === 'gee' ||
        speaker === 'shrey' ||
        speaker === 'brian'
      ) {
        var mergedOpts = Object.assign({}, options);
        if (voiceDef) {
          if (!mergedOpts.voiceId) mergedOpts.voiceId = voiceDef.voiceId;
          if (!mergedOpts.modelId) mergedOpts.modelId = voiceDef.modelId;
        }
        try {
          return await MultiEngineTTSClient.synthesizeElevenLabs(text, mergedOpts);
        } catch (elErr) {
          console.warn('[TTS Cascade] ElevenLabs unavailable, auto-cascading to Google Natural Marathi voice...', elErr);
          try {
            return await MultiEngineTTSClient.synthesizeGoogleNatural(text, options);
          } catch (gErr) {
            console.warn('[TTS Cascade] Fallback to Web Speech...', gErr);
          }
        }
      }

      // 3. Sarvam AI Voice (if user configured)
      if ((voiceDef && voiceDef.provider === 'sarvam') || speaker === 'shubh' || speaker === 'ratan' || speaker === 'aditya' || speaker === 'priya') {
        try {
          return await MultiEngineTTSClient.synthesizeSarvam(text, options);
        } catch (sarvamErr) {
          console.warn('[TTS Cascade] Sarvam AI unavailable, auto-cascading to Google Natural Marathi voice...', sarvamErr);
          try {
            return await MultiEngineTTSClient.synthesizeGoogleNatural(text, options);
          } catch (gErr) {
            console.warn('[TTS Cascade] Fallback to Web Speech...', gErr);
          }
        }
      }

      // Default fallback to Google Natural
      return await MultiEngineTTSClient.synthesizeGoogleNatural(text, options);
    },

    // 5A. Google Natural Audio Synthesis (100% Free, High Quality Marathi MP3)
    synthesizeGoogleNatural: async function (text, options) {
      if (!options) options = {};
      var isDevanagari = /[\u0900-\u097F]/.test(text || '');
      var lang = (options.lang && options.lang.startsWith('en')) ? 'en' : (options.lang && options.lang.startsWith('hi') ? 'hi' : (isDevanagari ? 'mr' : 'en'));
      var pace = options.pace !== undefined ? options.pace : 0.92;

      var optimizedText = ScriptureOptimizer.optimizeForNarration(text, (lang === 'mr' ? 'mr-IN' : (lang === 'hi' ? 'hi-IN' : 'en-US')));
      if (!optimizedText) throw new Error('Empty text provided for narration');

      var chunks = ScriptureOptimizer.chunkPassage(optimizedText, 160);
      if (chunks.length === 0) chunks = [optimizedText];

      var directAudioUrls = chunks.map(function(c) {
        return 'https://translate.google.com/translate_tts?ie=UTF-8&tl=' + lang + '&client=tw-ob&q=' + encodeURIComponent(c);
      });

      var singleUrl = directAudioUrls[0];
      return {
        audioUrl: singleUrl,
        directUrls: directAudioUrls,
        chunks: chunks,
        fromCache: false,
        voiceName: 'नैसर्गिक मराठी आवाज (Natural Marathi)',
        isDirectStream: true
      };
    },

    // 5B. ElevenLabs Synthesis
    synthesizeElevenLabs: async function (text, options) {
      if (!options) options = {};
      var isDevanagari = /[\u0900-\u097F]/.test(text || '');
      var lang = options.lang || (isDevanagari ? 'mr-IN' : 'en-IN');
      var voiceId = options.voiceId || TTS_CONFIG.elevenlabs.defaultVoiceId;
      var modelId = options.modelId || TTS_CONFIG.elevenlabs.defaultModelId;
      var pace = options.pace !== undefined ? options.pace : 0.88;

      var optimizedText = ScriptureOptimizer.optimizeForNarration(text, lang);
      if (!optimizedText) throw new Error('Empty text provided for narration');

      var cacheKey = 'elevenlabs_' + modelId + '_' + voiceId + '_' + getCacheKey(optimizedText, lang, voiceId, pace);
      var cachedBlob = await getCachedAudio(cacheKey);
      if (cachedBlob) {
        return {
          audioUrl: URL.createObjectURL(cachedBlob),
          fromCache: true,
          voiceName: 'GEE (Authentic Marathi Voice)'
        };
      }

      var apiKey = TTS_CONFIG.elevenlabs.getApiKey();
      if (!apiKey) {
        var errNoKey = new Error('NO_ELEVENLABS_KEY');
        errNoKey.isAuthError = true;
        errNoKey.friendlyMessage = 'Please enter ElevenLabs API Key in Settings.';
        throw errNoKey;
      }

      var payload = {
        text: optimizedText,
        model_id: modelId,
        voice_settings: {
          stability: 0.38,
          similarity_boost: 0.82,
          style: 0.42,
          use_speaker_boost: true
        }
      };

      var response = await fetch(TTS_CONFIG.elevenlabs.endpoint + '/' + voiceId, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        var errBody = await response.text();
        var customErr = new Error('ElevenLabs ' + response.status);
        customErr.status = response.status;
        customErr.rawBody = errBody;
        if (response.status === 401 || errBody.includes('invalid_api_key')) {
          customErr.isAuthError = true;
          customErr.friendlyMessage = 'Invalid ElevenLabs API Key.';
        } else if (response.status === 402 || errBody.includes('quota_exceeded') || errBody.includes('credits')) {
          customErr.isQuotaExhausted = true;
          customErr.friendlyMessage = 'ElevenLabs credits quota exceeded.';
        }
        throw customErr;
      }

      var finalBlob = await response.blob();
      await setCachedAudio(cacheKey, finalBlob);

      return {
        audioUrl: URL.createObjectURL(finalBlob),
        fromCache: false,
        voiceName: 'GEE (Authentic Marathi Voice)'
      };
    },

    // 5C. Sarvam AI Synthesis (Bulbul V3)
    synthesizeSarvam: async function (text, options) {
      if (!options) options = {};
      var isDevanagari = /[\u0900-\u097F]/.test(text || '');
      var lang = options.lang || (isDevanagari ? 'mr-IN' : 'en-IN');
      var speaker = (options.speaker || 'shubh').toLowerCase();
      var pace = options.pace !== undefined ? options.pace : TTS_CONFIG.sarvam.defaultPace;

      var optimizedText = ScriptureOptimizer.optimizeForNarration(text, lang);
      if (!optimizedText) throw new Error('Empty text provided for narration');

      var cacheKey = 'sarvam_' + getCacheKey(optimizedText, lang, speaker, pace);
      var cachedBlob = await getCachedAudio(cacheKey);
      if (cachedBlob) {
        return {
          audioUrl: URL.createObjectURL(cachedBlob),
          fromCache: true,
          voiceName: speaker
        };
      }

      var apiKey = TTS_CONFIG.sarvam.getApiKey();
      if (!apiKey) {
        var errNoKey = new Error('NO_SARVAM_KEY');
        errNoKey.isAuthError = true;
        errNoKey.friendlyMessage = 'कृपया Sarvam AI API Key प्रविष्ट करा.';
        throw errNoKey;
      }

      var chunks = ScriptureOptimizer.chunkPassage(optimizedText, 450);
      if (chunks.length === 0) chunks = [optimizedText];

      var audioBlobs = [];

      for (var i = 0; i < chunks.length; i++) {
        var chunkText = chunks[i];
        var payload = {
          inputs: [chunkText],
          language_code: lang,
          target_language_code: lang,
          speaker: speaker,
          pace: pace,
          speech_sample_rate: TTS_CONFIG.sarvam.speechSampleRate,
          enable_preprocessing: TTS_CONFIG.sarvam.enablePreprocessing,
          model: TTS_CONFIG.sarvam.model
        };

        var response = await fetch(TTS_CONFIG.sarvam.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-subscription-key': apiKey
          },
          body: JSON.stringify(payload)
        });

        const bodyText = await response.text();

        if (!response.ok) {
          var customErr = new Error('Sarvam ' + response.status);
          customErr.status = response.status;
          customErr.rawBody = bodyText;
          if (response.status === 402 || bodyText.includes('insufficient_quota') || bodyText.includes('No credits')) {
            customErr.isQuotaExhausted = true;
          } else if (response.status === 401 || bodyText.includes('Unauthorized')) {
            customErr.isAuthError = true;
          }
          throw customErr;
        }

        var data = JSON.parse(bodyText);
        if (!data.audios || !data.audios[0]) {
          throw new Error('Sarvam API returned no audio content');
        }

        audioBlobs.push(base64ToBlob(data.audios[0], 'audio/wav'));
      }

      var finalBlob = audioBlobs.length === 1 ? audioBlobs[0] : new Blob(audioBlobs, { type: 'audio/wav' });
      await setCachedAudio(cacheKey, finalBlob);

      return {
        audioUrl: URL.createObjectURL(finalBlob),
        fromCache: false,
        voiceName: speaker
      };
    },

    // 5D. High-Quality Web Speech Synthesis Fallback
    speakViaWebSpeech: function (text, options, onEnd, onError) {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        if (onError) onError(new Error('SpeechSynthesis not supported'));
        return null;
      }

      try {
        window.speechSynthesis.cancel();
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch (e) {}

      var isDevanagari = /[\u0900-\u097F]/.test(text || '');
      var lang = (options && options.lang) || (isDevanagari ? 'mr-IN' : 'en-IN');
      var pace = (options && options.pace !== undefined) ? options.pace : 0.88;
      var cleanText = ScriptureOptimizer.optimizeForNarration(text, lang);

      var utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = Math.max(0.75, Math.min(1.2, pace));
      utterance.pitch = 0.90;

      var voices = (window.speechSynthesis.getVoices && window.speechSynthesis.getVoices()) || [];
      var selectedVoice = null;
      if (isDevanagari) {
        selectedVoice = voices.find(function (v) { 
          var n = v.name.toLowerCase();
          return (v.lang.startsWith('mr') || v.lang.startsWith('hi')) && (n.includes('male') || n.includes('madhav') || n.includes('hemant') || n.includes('manohar') || n.includes('mohan') || n.includes('ravi') || n.includes('natural') || n.includes('google'));
        }) ||
        voices.find(function (v) { return v.lang === 'mr-IN' || v.lang === 'mr_IN' || v.lang.startsWith('mr'); }) ||
        voices.find(function (v) { return v.lang === 'hi-IN' || v.lang === 'hi_IN' || v.lang.startsWith('hi'); }) ||
        voices.find(function (v) { return v.lang.includes('IN') || (v.name && v.name.toLowerCase().includes('india')); });
      } else {
        selectedVoice = voices.find(function (v) { 
          var n = v.name.toLowerCase();
          return (n.includes('natural') || n.includes('neural') || n.includes('male') || n.includes('george') || n.includes('david') || n.includes('brian')) && (v.lang.startsWith('en'));
        }) ||
        voices.find(function (v) { return v.lang === 'en-IN' || v.lang === 'en-GB' || v.lang.startsWith('en'); });
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      } else {
        utterance.lang = isDevanagari ? 'mr-IN' : 'en-IN';
      }

      var keepAliveTimer = setInterval(function () {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        } else {
          clearInterval(keepAliveTimer);
        }
      }, 10000);

      utterance.onend = function () {
        clearInterval(keepAliveTimer);
        window._activeSpeechUtterance = null;
        if (onEnd) onEnd();
      };

      utterance.onerror = function (e) {
        clearInterval(keepAliveTimer);
        window._activeSpeechUtterance = null;
        if (e.error === 'canceled' || e.error === 'interrupted') return;
        console.warn('[WebSpeech Fallback] Notice:', e);
        if (onError) onError(e);
      };

      window._activeSpeechUtterance = utterance;
      window.speechSynthesis.speak(utterance);
      return utterance;
    }
  };

  // 6. Universal Narration Queue (Smooth Verse-by-Verse Scripture Reader)
  class UniversalNarrationQueue {
    constructor() {
      this.verses = [];
      this.currentIndex = 0;
      this.isPlaying = false;
      this.isPaused = false;
      this.currentAudio = null;
      this.activeUtterance = null;
      this.options = {
        speaker: 'google_natural_mr',
        lang: 'mr-IN',
        pace: 0.90
      };
      this.listeners = {
        onVerseChange: null,
        onStateChange: null,
        onComplete: null,
        onError: null
      };
      this.prefetchMap = new Map();
      this.fallbackMode = false;
    }

    setOptions(opts) {
      if (!opts) opts = {};
      this.options = Object.assign(this.options, opts);
      if (this.currentAudio && opts.pace) {
        try {
          this.currentAudio.playbackRate = opts.pace;
        } catch(e) {}
      }
    }

    setListeners(listeners) {
      if (!listeners) listeners = {};
      this.listeners = Object.assign(this.listeners, listeners);
    }

    loadVerses(verses, initialIndex, options) {
      if (initialIndex === undefined) initialIndex = 0;
      if (!options) options = {};
      this.stop();
      this.verses = verses || [];
      this.currentIndex = initialIndex;
      this.options = Object.assign(this.options, options);
      this.prefetchMap.clear();
      this.fallbackMode = false;
    }

    async play() {
      if (this.verses.length === 0) return;
      unlockAudioContext();

      if (this.isPaused) {
        this.resume();
        return;
      }

      this.isPlaying = true;
      this.isPaused = false;
      await this._playVerse(this.currentIndex);
    }

    pause() {
      if (!this.isPlaying) return;
      this.isPaused = true;

      if (this.fallbackMode && typeof window.speechSynthesis !== 'undefined') {
        window.speechSynthesis.pause();
      } else if (this.currentAudio && !this.currentAudio.paused) {
        this.currentAudio.pause();
      }

      if (this.listeners.onStateChange) this.listeners.onStateChange('paused');
    }

    resume() {
      if (!this.isPaused && this.isPlaying) return;
      unlockAudioContext();
      this.isPaused = false;
      this.isPlaying = true;

      if (this.fallbackMode && typeof window.speechSynthesis !== 'undefined') {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        } else {
          this._playVerse(this.currentIndex);
        }
      } else if (this.currentAudio) {
        this.currentAudio.play().catch(function() {});
      } else {
        this._playVerse(this.currentIndex);
      }

      if (this.listeners.onStateChange) this.listeners.onStateChange('playing');
    }

    stop() {
      this.isPlaying = false;
      this.isPaused = false;
      if (this.currentAudio) {
        try {
          this.currentAudio.pause();
          this.currentAudio.src = '';
        } catch(e) {}
        this.currentAudio = null;
      }
      if (typeof window.speechSynthesis !== 'undefined') {
        try { window.speechSynthesis.cancel(); } catch(e) {}
      }
      this.prefetchMap.clear();
      if (this.listeners.onStateChange) this.listeners.onStateChange('stopped');
    }

    async jumpToVerse(index) {
      if (index < 0 || index >= this.verses.length) return;
      unlockAudioContext();
      this.currentIndex = index;
      if (this.currentAudio) {
        try {
          this.currentAudio.pause();
        } catch(e) {}
        this.currentAudio = null;
      }
      if (typeof window.speechSynthesis !== 'undefined') {
        try { window.speechSynthesis.cancel(); } catch(e) {}
      }

      if (this.isPlaying) {
        await this._playVerse(this.currentIndex);
      }
    }

    next() {
      if (this.currentIndex + 1 < this.verses.length) {
        this.jumpToVerse(this.currentIndex + 1);
      } else {
        this.stop();
        if (this.listeners.onComplete) this.listeners.onComplete();
      }
    }

    previous() {
      if (this.currentIndex - 1 >= 0) {
        this.jumpToVerse(this.currentIndex - 1);
      }
    }

    async _playVerse(index) {
      var self = this;
      if (!this.isPlaying || index >= this.verses.length || index < 0) {
        this.stop();
        if (this.listeners.onComplete) this.listeners.onComplete();
        return;
      }

      this.currentIndex = index;
      var verse = this.verses[index];

      if (this.listeners.onVerseChange) {
        this.listeners.onVerseChange(index, verse);
      }

      if (this.listeners.onStateChange) {
        this.listeners.onStateChange('loading');
      }

      if (this.fallbackMode) {
        this._playVerseWithFallback(index, verse);
        return;
      }

      try {
        var res = await MultiEngineTTSClient.synthesizeText(verse.text, this.options);
        if (!this.isPlaying) return;

        var audioUrls = (res && res.directUrls && res.directUrls.length > 0) ? res.directUrls : [res.audioUrl];
        self._playAudioSequence(audioUrls, 0, index, verse);
      } catch (err) {
        console.warn('[Audio Synthesis Error] Verse ' + index + ':', err);
        self._activateFallbackAndPlay(index, verse, err);
      }
    }

    _playAudioSequence(urls, urlIndex, verseIndex, verse) {
      var self = this;
      if (!this.isPlaying || urlIndex >= urls.length) {
        if (self.isPlaying) self.next();
        return;
      }

      var currentUrl = urls[urlIndex];
      var audio = new Audio();
      this.currentAudio = audio;

      audio.oncanplay = function () {
        try {
          audio.playbackRate = self.options.pace || 0.90;
        } catch(e) {}
      };

      audio.onplay = function () {
        if (self.listeners.onStateChange) self.listeners.onStateChange('playing');
      };

      audio.onended = function () {
        if (!self.isPlaying) return;
        if (urlIndex + 1 < urls.length) {
          self._playAudioSequence(urls, urlIndex + 1, verseIndex, verse);
        } else {
          self.next();
        }
      };

      audio.onerror = function (e) {
        console.warn('[Audio Chunk Error] Falling back to Web Speech:', e);
        self._activateFallbackAndPlay(verseIndex, verse);
      };

      audio.src = currentUrl;
      var playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(function (err) {
          console.warn('[Audio Play Promise Error]:', err);
          self._activateFallbackAndPlay(verseIndex, verse, err);
        });
      }
    }

    _activateFallbackAndPlay(index, verse, err) {
      this.fallbackMode = true;
      this._playVerseWithFallback(index, verse);
    }

    _playVerseWithFallback(index, verse) {
      var self = this;
      if (!this.isPlaying) return;

      if (this.listeners.onStateChange) {
        this.listeners.onStateChange('playing');
      }

      this.activeUtterance = MultiEngineTTSClient.speakViaWebSpeech(
        verse.text,
        this.options,
        function onEnd() {
          if (self.isPlaying) self.next();
        },
        function onError() {
          if (self.isPlaying) self.next();
        }
      );
    }
  }

  // Create singleton queue instance
  var narrationQueueInstance = new UniversalNarrationQueue();

  // Export to Global Window
  var SarvamTTSObj = {
    config: TTS_CONFIG.sarvam,
    optimizer: ScriptureOptimizer,
    client: MultiEngineTTSClient,
    queue: narrationQueueInstance,
    unlockAudio: unlockAudioContext,
    
    speakText: async function (text, options) {
      try {
        return await MultiEngineTTSClient.synthesizeText(text, options);
      } catch (err) {
        MultiEngineTTSClient.speakViaWebSpeech(text, options);
        return { fromFallback: true };
      }
    },

    testVoice: async function (voiceId) {
      var speaker = voiceId || 'google_natural_mr';
      var sampleText = 'परमेश्वर माझा मेंढपाळ आहे, मला काही उणे पडणार नाही.';
      try {
        var res = await MultiEngineTTSClient.synthesizeText(sampleText, {
          lang: 'mr-IN',
          speaker: speaker,
          pace: 0.90
        });
        
        if (res && res.audioUrl) {
          var audio = new Audio(res.audioUrl);
          audio.playbackRate = 0.90;
          audio.play().catch(function() {});
        }
        
        return {
          success: true,
          audioUrl: res.audioUrl,
          fromCache: res.fromCache,
          voiceName: res.voiceName || speaker,
          message: '✨ आवाज यशस्वीरीत्या सुरू झाला!'
        };
      } catch (err) {
        MultiEngineTTSClient.speakViaWebSpeech(sampleText, { lang: 'mr-IN', pace: 0.90 });
        return {
          success: false,
          quotaExhausted: !!err.isQuotaExhausted,
          authError: !!err.isAuthError,
          message: err.friendlyMessage || 'Previewing via Device Marathi voice.'
        };
      }
    }
  };

  var ElevenLabsTTSObj = {
    config: TTS_CONFIG.elevenlabs,
    synthesizeVerse: async function (text, options) {
      return MultiEngineTTSClient.synthesizeElevenLabs(text, options);
    }
  };

  if (typeof window !== 'undefined') {
    window.SarvamTTS = SarvamTTSObj;
    window.ElevenLabsTTS = ElevenLabsTTSObj;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SarvamTTS: SarvamTTSObj, ElevenLabsTTS: ElevenLabsTTSObj };
  }

})(typeof window !== 'undefined' ? window : global);
