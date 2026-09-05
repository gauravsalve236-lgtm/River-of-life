/* ==========================================================================
   sarvam-tts.js — Multi-Engine TTS Client (ElevenLabs & Sarvam AI)
   River of Life Bible App - Modern Devotional Audio System
   
   Supported Voices:
     - Shrey - Deep Marathi Conversational (ElevenLabs eleven_v3: C9v09R5AIM6tOX6Fn06I)
     - Shubh (Sarvam AI Bulbul V3: Devotional Marathi)
     - Ratan (Sarvam AI Bulbul V3: Natural Marathi/English)
     - Aditya, Priya, Aravind (Sarvam AI Bulbul V3)
     - High-Quality Marathi Device Voice (Offline Fallback)
   ========================================================================== */

(function (window) {
  'use strict';

  // 1. Default Configuration
  var TTS_CONFIG = {
    // ElevenLabs Specs
    elevenlabs: {
      endpoint: 'https://api.elevenlabs.io/v1/text-to-speech',
      defaultVoiceId: 'QWwKUPVe8SndiTgtz6yz', // GEE - Custom Authentic Marathi Voice
      defaultModelId: 'eleven_multilingual_v2',
      defaultVoiceSettings: {
        stability: 0.38,           // Natural human pitch inflection and warmth
        similarity_boost: 0.82,    // High vocal timbre fidelity with smooth texture
        style: 0.42,               // Expressive, soulful devotional cadence
        use_speaker_boost: true
      },
      defaultPace: 0.86,
      getApiKey: function () {
        var localKey = (typeof localStorage !== 'undefined') ? localStorage.getItem('rol_elevenlabs_api_key') : null;
        return localKey || (typeof window !== 'undefined' && window.ELEVENLABS_API_KEY) || (typeof window !== 'undefined' && window.state && window.state.elevenlabsApiKey) || 'sk_53532f375cb8723144f7c3d6f10520e60043fc74cb1552d4';
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
      defaultPace: 0.86,           // Solemn devotional reading speed
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
        return localKey || (typeof window !== 'undefined' && window.SARVAM_API_KEY) || (typeof window !== 'undefined' && window.state && window.state.sarvamApiKey) || 'sk_odv5l3f4_XdZubK80ecSfBa6YYCLWDCNI';
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
      { id: 'gee_elevenlabs', name: '🎙️ GEE - Custom Marathi Voice (Your ElevenLabs Account)', lang: 'mr-IN', provider: 'elevenlabs', voiceId: 'QWwKUPVe8SndiTgtz6yz', modelId: 'eleven_multilingual_v2' },
      { id: 'shrey_elevenlabs', name: '✨ Shrey - Deep Marathi Conversational (ElevenLabs eleven_v3)', lang: 'mr-IN', provider: 'elevenlabs', voiceId: 'C9v09R5AIM6tOX6Fn06I', modelId: 'eleven_v3' },
      { id: 'brian_elevenlabs', name: '📖 Brian - Deep Reverent Resonant (ElevenLabs)', lang: 'mr-IN', provider: 'elevenlabs', voiceId: 'nPczCjzI2devNBz1zQrb', modelId: 'eleven_multilingual_v2' },
      { id: 'shubh', name: '🕊️ Shubh (शांत, गंभीर व भावपूर्ण मराठी आवाज - Sarvam AI)', lang: 'mr-IN', provider: 'sarvam' },
      { id: 'ratan', name: '🎙️ Ratan (नैसर्गिक व स्पष्ट मराठी आवाज - Sarvam AI)', lang: 'mr-IN', provider: 'sarvam' }
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
        var req = indexedDB.open('RiverOfLife_Universal_TTS_Cache', 2);
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
    return 'tts_v4_' + hash;
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

  // 3. Bible Text Optimizer & Scripture Normalizer
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
      cleaned = cleaned.replace(/—|–/g, ', ');
      cleaned = cleaned.replace(/\s*;\s*/g, ', ');
      cleaned = cleaned.replace(/\s*,\s*/g, ', ');
      cleaned = cleaned.replace(/\s*\.\s*/g, '. ');

      // Insert subtle devotional breath pauses for key spiritual connectors and vocatives
      cleaned = cleaned.replace(/(हे स्वर्गीय पित्या|हे प्रभू|हे देवा|प्रियांनो|आमेन)/g, '$1... ');
      cleaned = cleaned.replace(/\s+(आणि|तेव्हा|म्हणून|कारण|तर|म्हणजे)\s+/g, ', $1 ');

      // Normalize whitespace
      cleaned = cleaned.replace(/\s+/g, ' ').trim();

      if (cleaned && !/[.!?:,;।]$/.test(cleaned)) {
        cleaned += (lang === 'mr-IN' || lang === 'hi-IN' || /[\u0900-\u097F]/.test(cleaned)) ? ' ।' : '.';
      }

      return cleaned;
    },

    chunkPassage: function (text, maxChars) {
      if (!maxChars) maxChars = 380;
      if (!text) return [];
      if (text.length <= maxChars) return [text];

      var sentences = text.match(/[^.!?।,;\n]+[.!?।,;\n]*/g) || [text];
      var chunks = [];
      var currentChunk = '';

      for (var i = 0; i < sentences.length; i++) {
        var s = sentences[i].trim();
        if (!s) continue;
        
        if (s.length > maxChars) {
          var words = s.split(/\s+/);
          for (var j = 0; j < words.length; j++) {
            var w = words[j];
            if ((currentChunk + ' ' + w).length > maxChars) {
              if (currentChunk.trim()) chunks.push(currentChunk.trim());
              currentChunk = w;
            } else {
              currentChunk += (currentChunk ? ' ' : '') + w;
            }
          }
        } else {
          if ((currentChunk + ' ' + s).length > maxChars) {
            if (currentChunk.trim()) chunks.push(currentChunk.trim());
            currentChunk = s;
          } else {
            currentChunk += (currentChunk ? ' ' : '') + s;
          }
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

  // 4. Multi-Engine Synthesis Client (ElevenLabs & Sarvam AI)
  var MultiEngineTTSClient = {
    // Master synthesis entry point (with Auto-Cascade between ElevenLabs and Sarvam AI)
    synthesizeText: async function (text, options) {
      if (!options) options = {};
      var isDevanagari = /[\u0900-\u097F]/.test(text || '');
      var lang = options.lang || (isDevanagari ? 'mr-IN' : 'en-IN');
      var speaker = (options.speaker || 'gee_elevenlabs').toLowerCase();

      var voiceDef = TTS_CONFIG.availableVoices.find(function(v) { return v.id.toLowerCase() === speaker; });

      // Prefer ElevenLabs GEE / Shrey for authentic Marathi voice
      if (
        (voiceDef && voiceDef.provider === 'elevenlabs') ||
        speaker.includes('elevenlabs') ||
        speaker === 'gee' ||
        speaker === 'shrey' ||
        speaker === 'brian' ||
        options.provider === 'elevenlabs'
      ) {
        var mergedOpts = Object.assign({}, options);
        if (voiceDef) {
          if (!mergedOpts.voiceId) mergedOpts.voiceId = voiceDef.voiceId;
          if (!mergedOpts.modelId) mergedOpts.modelId = voiceDef.modelId;
        }
        try {
          return await MultiEngineTTSClient.synthesizeElevenLabs(text, mergedOpts);
        } catch (elErr) {
          console.warn('[TTS Cascade] ElevenLabs failed, trying Sarvam AI...', elErr);
          try {
            return await MultiEngineTTSClient.synthesizeSarvam(text, Object.assign({}, options, { speaker: 'shubh' }));
          } catch (sErr) {
            throw elErr;
          }
        }
      }

      // If Sarvam AI voice requested, try Sarvam and auto-fallback to ElevenLabs if quota/error
      try {
        return await MultiEngineTTSClient.synthesizeSarvam(text, options);
      } catch (sarvamErr) {
        console.log('[TTS Cascade] Sarvam AI unavailable, auto-cascading to ElevenLabs GEE...');
        try {
          return await MultiEngineTTSClient.synthesizeElevenLabs(text, Object.assign({}, options, {
            voiceId: 'QWwKUPVe8SndiTgtz6yz',
            modelId: 'eleven_multilingual_v2'
          }));
        } catch (elErr) {
          throw sarvamErr;
        }
      }
    },

    // 4A. ElevenLabs Synthesis (Shrey - Deep Marathi Conversational, Model: eleven_v3)
    synthesizeElevenLabs: async function (text, options) {
      if (!options) options = {};
      var isDevanagari = /[\u0900-\u097F]/.test(text || '');
      var lang = options.lang || (isDevanagari ? 'mr-IN' : 'en-IN');
      var voiceId = options.voiceId || TTS_CONFIG.elevenlabs.defaultVoiceId;
      var modelId = options.modelId || TTS_CONFIG.elevenlabs.defaultModelId;
      var pace = options.pace !== undefined ? options.pace : 0.92;

      var optimizedText = ScriptureOptimizer.optimizeForNarration(text, lang);
      if (!optimizedText) throw new Error('Empty text provided for narration');

      var cacheKey = 'elevenlabs_' + modelId + '_' + voiceId + '_' + getCacheKey(optimizedText, lang, voiceId, pace);
      var cachedBlob = await getCachedAudio(cacheKey);
      if (cachedBlob) {
        return {
          audioUrl: URL.createObjectURL(cachedBlob),
          fromCache: true,
          voiceName: 'Shrey - Deep Marathi Conversational'
        };
      }

      var apiKey = TTS_CONFIG.elevenlabs.getApiKey();

      // 1. Try Backend Node API Proxy first if available
      try {
        var backendResp = await fetch('/api/tts/convert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: optimizedText,
            voiceId: voiceId,
            modelId: modelId
          })
        });
        if (backendResp.ok) {
          var data = await backendResp.json();
          if (data.audioBase64) {
            var blob = base64ToBlob(data.audioBase64, 'audio/mpeg');
            await setCachedAudio(cacheKey, blob);
            return {
              audioUrl: URL.createObjectURL(blob),
              fromCache: false,
              voiceName: 'Shrey - Deep Marathi Conversational'
            };
          }
        }
      } catch (be) {}

      // 2. Direct ElevenLabs API Call
      if (!apiKey) {
        var errNoKey = new Error('NO_ELEVENLABS_KEY');
        errNoKey.isAuthError = true;
        errNoKey.friendlyMessage = 'Please enter your ElevenLabs API Key in Audio Settings for Shrey voice.';
        throw errNoKey;
      }

      var directUrl = `${TTS_CONFIG.elevenlabs.endpoint}/${voiceId}`;
      var response = await fetch(directUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify({
          text: optimizedText,
          model_id: modelId,
          voice_settings: TTS_CONFIG.elevenlabs.defaultVoiceSettings
        })
      });

      if (!response.ok) {
        var errBody = await response.text();
        console.warn('[ElevenLabs API Error]', response.status, errBody);

        // Auto-cascade: If Library voice Shrey hits 402 (paid plan required), cascade to GEE (your account Marathi voice) or Brian!
        if (response.status === 402 || errBody.includes('paid_plan_required')) {
          if (!options._cascaded) {
            console.log('[ElevenLabs] Auto-cascading to GEE (Custom Account Marathi Voice)...');
            try {
              return await MultiEngineTTSClient.synthesizeElevenLabs(text, Object.assign({}, options, {
                voiceId: 'QWwKUPVe8SndiTgtz6yz', // GEE
                modelId: 'eleven_multilingual_v2',
                _cascaded: true
              }));
            } catch (geeErr) {
              console.log('[ElevenLabs] Auto-cascading to Brian (Premade)...');
              try {
                return await MultiEngineTTSClient.synthesizeElevenLabs(text, Object.assign({}, options, {
                  voiceId: 'nPczCjzI2devNBz1zQrb', // Brian
                  modelId: 'eleven_multilingual_v2',
                  _cascaded: true
                }));
              } catch (brianErr) {
                console.log('[ElevenLabs] Cascading to Sarvam AI Shubh...');
                return await MultiEngineTTSClient.synthesizeSarvam(text, Object.assign({}, options, { speaker: 'shubh' }));
              }
            }
          }
        }

        var customErr = new Error(`ElevenLabs ${response.status}`);
        customErr.status = response.status;
        customErr.rawBody = errBody;
        if (response.status === 401 || errBody.includes('invalid_api_key')) {
          customErr.isAuthError = true;
          customErr.friendlyMessage = 'Invalid ElevenLabs API Key. Please verify key in Settings.';
        } else if (response.status === 402 || errBody.includes('quota_exceeded') || errBody.includes('credits')) {
          customErr.isQuotaExhausted = true;
          customErr.friendlyMessage = 'ElevenLabs credits quota exceeded. Using Marathi voice.';
        } else {
          customErr.friendlyMessage = `ElevenLabs error (${response.status}). Using Marathi voice.`;
        }
        throw customErr;
      }

      var finalBlob = await response.blob();
      await setCachedAudio(cacheKey, finalBlob);

      var voiceDisplayName = (voiceId === 'QWwKUPVe8SndiTgtz6yz') ? 'GEE (Authentic Marathi)' : ((voiceId === 'C9v09R5AIM6tOX6Fn06I') ? 'Shrey (Deep Marathi)' : 'ElevenLabs Voice');
      return {
        audioUrl: URL.createObjectURL(finalBlob),
        fromCache: false,
        voiceName: voiceDisplayName
      };
    },

    // 4B. Sarvam AI Synthesis (Shubh, Ratan, Aditya, Priya, Aravind)
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
        var errNoKey = new Error('NO_API_KEY');
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
          console.warn('[Sarvam AI API]', response.status, bodyText);
          var customErr = new Error(`Sarvam ${response.status}`);
          customErr.status = response.status;
          customErr.rawBody = bodyText;

          if (response.status === 402 || bodyText.includes('insufficient_quota') || bodyText.includes('No credits')) {
            customErr.isQuotaExhausted = true;
            customErr.friendlyMessage = 'Sarvam AI quota exhausted. Using high-quality Marathi device voice.';
          } else if (response.status === 401 || bodyText.includes('Unauthorized') || bodyText.includes('invalid_api_key')) {
            customErr.isAuthError = true;
            customErr.friendlyMessage = 'Invalid Sarvam AI Key. Using high-quality Marathi device voice.';
          } else if (response.status === 429) {
            customErr.isRateLimit = true;
            customErr.friendlyMessage = 'Sarvam AI busy. Using high-quality Marathi device voice.';
          } else {
            customErr.friendlyMessage = `Sarvam error (${response.status}). Using Marathi device voice.`;
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

    // 4C. High-Quality Web Speech Synthesis Fallback
    speakViaWebSpeech: function (text, options, onEnd, onError) {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        if (onError) onError(new Error('SpeechSynthesis not supported'));
        return null;
      }

      try {
        window.speechSynthesis.cancel();
      } catch (e) {}

      var isDevanagari = /[\u0900-\u097F]/.test(text || '');
      var lang = options.lang || (isDevanagari ? 'mr-IN' : 'en-IN');
      var pace = options.pace !== undefined ? options.pace : 0.92;
      var cleanText = ScriptureOptimizer.optimizeForNarration(text, lang);

      var utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = lang;
      utterance.rate = Math.max(0.75, Math.min(1.4, pace));
      utterance.pitch = 0.85; // Deep male pitch

      var voices = window.speechSynthesis.getVoices();
      var selectedVoice = null;
      if (isDevanagari) {
        // Prioritize male voices
        selectedVoice = voices.find(function (v) { 
          var n = v.name.toLowerCase();
          return (v.lang.startsWith('mr') || v.lang.startsWith('hi')) && (n.includes('male') || n.includes('madhav') || n.includes('hemant') || n.includes('manohar') || n.includes('mohan') || n.includes('ravi') || n.includes('david'));
        }) ||
        voices.find(function (v) { return v.lang === 'mr-IN' || v.lang === 'mr_IN' || v.lang.startsWith('mr'); }) ||
        voices.find(function (v) { return v.lang === 'hi-IN' || v.lang === 'hi_IN' || v.lang.startsWith('hi'); }) ||
        voices.find(function (v) { return v.lang.includes('IN'); });
      } else {
        selectedVoice = voices.find(function (v) { 
          var n = v.name.toLowerCase();
          return (n.includes('male') || n.includes('george') || n.includes('david') || n.includes('guy') || n.includes('brian')) && (v.lang.startsWith('en'));
        }) ||
        voices.find(function (v) { return v.lang === 'en-IN' || v.lang === 'en-GB' || v.lang.startsWith('en'); });
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onend = function () {
        if (onEnd) onEnd();
      };

      utterance.onerror = function (e) {
        if (e.error === 'canceled' || e.error === 'interrupted') return;
        console.warn('[WebSpeech Fallback] Error:', e);
        if (onError) onError(e);
      };

      window.speechSynthesis.speak(utterance);
      return utterance;
    }
  };

  // 5. Universal Playback Queue & Gapless Narration Controller
  class UniversalNarrationQueue {
    constructor() {
      this.verses = [];
      this.currentIndex = 0;
      this.isPlaying = false;
      this.isPaused = false;
      this.currentAudio = null;
      this.activeUtterance = null;
      this.fallbackMode = false;
      this.fallbackNotified = false;
      this.prefetchMap = new Map();
      this.options = {
        lang: 'mr-IN',
        speaker: 'shubh',
        pace: 0.86
      };
      this.listeners = {
        onVerseChange: null,
        onStateChange: null,
        onComplete: null,
        onError: null,
        onFallbackActive: null
      };
    }

    setOptions(opts) {
      if (!opts) opts = {};
      this.options = Object.assign(this.options, opts);
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
      this.fallbackNotified = false;
    }

    async play() {
      if (this.verses.length === 0) return;
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
      this.isPaused = false;
      this.isPlaying = true;

      if (this.fallbackMode && typeof window.speechSynthesis !== 'undefined') {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        } else {
          this._playVerse(this.currentIndex);
        }
      } else if (this.currentAudio) {
        this.currentAudio.play();
      } else {
        this._playVerse(this.currentIndex);
      }

      if (this.listeners.onStateChange) this.listeners.onStateChange('playing');
    }

    stop() {
      this.isPlaying = false;
      this.isPaused = false;
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio.src = '';
        this.currentAudio = null;
      }
      if (typeof window.speechSynthesis !== 'undefined') {
        window.speechSynthesis.cancel();
      }
      this.prefetchMap.clear();
      if (this.listeners.onStateChange) this.listeners.onStateChange('stopped');
    }

    async jumpToVerse(index) {
      if (index < 0 || index >= this.verses.length) return;
      this.currentIndex = index;
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio = null;
      }
      if (typeof window.speechSynthesis !== 'undefined') {
        window.speechSynthesis.cancel();
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

    _prefetchVerse(index) {
      if (this.fallbackMode) return;
      if (index < 0 || index >= this.verses.length) return;
      if (this.prefetchMap.has(index)) return;

      var verse = this.verses[index];
      var promise = MultiEngineTTSClient.synthesizeText(verse.text, this.options)
        .then(function (res) { return res.audioUrl; })
        .catch(function () { return null; });

      this.prefetchMap.set(index, promise);
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
        var audioUrl = null;
        if (this.prefetchMap.has(index)) {
          audioUrl = await this.prefetchMap.get(index);
          this.prefetchMap.delete(index);
        }

        if (!audioUrl) {
          var res = await MultiEngineTTSClient.synthesizeText(verse.text, this.options);
          audioUrl = res.audioUrl;
        }

        if (!this.isPlaying) return;

        var audio = new Audio(audioUrl);
        this.currentAudio = audio;

        if (index + 1 < this.verses.length) {
          this._prefetchVerse(index + 1);
        }

        audio.onplay = function () {
          if (self.listeners.onStateChange) self.listeners.onStateChange('playing');
        };

        audio.onended = function () {
          if (self.isPlaying) {
            self.next();
          }
        };

        audio.onerror = function (e) {
          console.warn('[Audio Playback Error] Falling back to Web Speech:', e);
          self._activateFallbackAndPlay(index, verse);
        };

        await audio.play();
      } catch (err) {
        console.warn('[Audio Synthesis Error] Verse ' + index + ':', err);
        self._activateFallbackAndPlay(index, verse, err);
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

  // Export to Global Window (Supporting both SarvamTTS & ElevenLabsTTS interfaces)
  window.SarvamTTS = {
    config: TTS_CONFIG.sarvam,
    optimizer: ScriptureOptimizer,
    client: MultiEngineTTSClient,
    queue: narrationQueueInstance,
    
    speakText: async function (text, options) {
      try {
        return await MultiEngineTTSClient.synthesizeText(text, options);
      } catch (err) {
        MultiEngineTTSClient.speakViaWebSpeech(text, options);
        return { fromFallback: true };
      }
    },

    testVoice: async function (voiceId) {
      var speaker = voiceId || 'shrey_elevenlabs';
      var sampleText = 'परमेश्वर माझा मेंढपाळ आहे, मला काही उणे पडणार नाही.';
      try {
        var res = await MultiEngineTTSClient.synthesizeText(sampleText, {
          lang: 'mr-IN',
          speaker: speaker,
          pace: 0.92
        });
        return {
          success: true,
          audioUrl: res.audioUrl,
          fromCache: res.fromCache,
          voiceName: res.voiceName || speaker
        };
      } catch (err) {
        MultiEngineTTSClient.speakViaWebSpeech(sampleText, { lang: 'mr-IN', pace: 0.92 });
        return {
          success: false,
          quotaExhausted: !!err.isQuotaExhausted,
          authError: !!err.isAuthError,
          noKey: (err.message === 'NO_ELEVENLABS_KEY' || err.message === 'NO_API_KEY'),
          message: err.friendlyMessage || 'Previewing via Marathi voice.'
        };
      }
    }
  };

  window.ElevenLabsTTS = {
    config: TTS_CONFIG.elevenlabs,
    synthesizeVerse: async function (text, options) {
      return MultiEngineTTSClient.synthesizeElevenLabs(text, options);
    }
  };

})(window);
