/* ==========================================================================
   sarvam-tts.js — Sarvam AI Bulbul V3 Indian Voice Narration Engine
   River of Life Bible App - Modern Devotional Audio System
   ========================================================================== */

(function (window) {
  'use strict';

  // 1. Default Configuration
  var SARVAM_CONFIG = {
    endpoint: 'https://api.sarvam.ai/text-to-speech',
    model: 'bulbul:v3',
    defaultPace: 0.92, // Calm, warm, mature Indian male Bible reading pace
    loudness: 1.2,
    speechSampleRate: 22050,
    enablePreprocessing: true,
    
    // Voice Mapping for Bulbul V3
    speakers: {
      'en-IN': 'ratan', // Primary English Indian Male: Mature, calm, deep, spiritual
      'hi-IN': 'shubh', // Primary Hindi Indian Male: Devotional, natural, peaceful
      'mr-IN': 'shubh'  // Marathi Indian Male: Clear Devanagari cadence
    },

    // Alternative voices available in Bulbul V3 for user preference
    availableVoices: [
      { id: 'ratan', name: 'Ratan (Indian Male - Mature & Spiritual)', lang: 'en-IN', gender: 'male' },
      { id: 'shubh', name: 'Shubh (Indian Male - Calm & Devotional)', lang: 'hi-IN', gender: 'male' },
      { id: 'aditya', name: 'Aditya (Indian Male - Deep & Warm)', lang: 'en-IN', gender: 'male' },
      { id: 'aravind', name: 'Aravind (Indian Male - Gentle Voice)', lang: 'en-IN', gender: 'male' },
      { id: 'priya', name: 'Priya (Indian Female - Warm & Soft)', lang: 'en-IN', gender: 'female' }
    ],

    // API Key resolution (Settings > LocalStorage > Default)
    getApiKey: function () {
      return localStorage.getItem('rol_sarvam_api_key') || 
             window.SARVAM_API_KEY || 
             (window.state && window.state.sarvamApiKey) || 
             '';
    },
    
    setApiKey: function (key) {
      if (key) {
        localStorage.setItem('rol_sarvam_api_key', key.trim());
      } else {
        localStorage.removeItem('rol_sarvam_api_key');
      }
    }
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
        var req = indexedDB.open('RiverOfLife_TTS_Cache', 1);
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

  // Generate deterministic cache key
  function getCacheKey(text, lang, speaker, pace) {
    var hash = 0;
    var str = text + '_' + lang + '_' + speaker + '_' + (typeof pace === 'number' ? pace.toFixed(2) : pace);
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return 'sarvam_v3_' + hash;
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
      console.warn('[Sarvam TTS] Failed to cache to IndexedDB:', e);
    }
  }

  // 3. Bible Text Optimizer & Scripture Normalizer
  var SarvamTextOptimizer = {
    // Clean scripture for natural narration
    optimizeForNarration: function (text, lang) {
      if (!text) return '';
      var cleaned = text;

      // 1. Remove bracketed cross-references and footnote markers [a], [1], (1), *, †, ‡
      cleaned = cleaned.replace(/\s*\[[a-zA-Z0-9]+\]/g, '');
      cleaned = cleaned.replace(/\s*\([0-9]+\)/g, '');
      cleaned = cleaned.replace(/[*†‡§]/g, '');

      // 2. Strip leading standalone verse numbers (e.g. '1 In the beginning' -> 'In the beginning')
      cleaned = cleaned.replace(/^\s*\d+[\.\:\s]+/g, '');

      // 3. Replace abrupt em-dashes and semicolons with natural pause commas
      cleaned = cleaned.replace(/—|–/g, ', ');
      cleaned = cleaned.replace(/\s*;\s*/g, ', ');
      cleaned = cleaned.replace(/\s*,\s*/g, ', ');
      cleaned = cleaned.replace(/\s*\.\s*/g, '. ');
      
      // 4. Normalize multiple spaces
      cleaned = cleaned.replace(/\s+/g, ' ').trim();

      // 5. Ensure terminal punctuation for natural cadence
      if (cleaned && !/[.!?:,;।]$/.test(cleaned)) {
        cleaned += (lang === 'mr-IN' || lang === 'hi-IN') ? ' ।' : '.';
      }

      return cleaned;
    },

    // Split long passages into sensible sentence chunks (~300-400 chars)
    chunkPassage: function (text, maxChars) {
      if (!maxChars) maxChars = 400;
      if (!text) return [];
      if (text.length <= maxChars) return [text];

      // Split along sentence endings (. ! ? । \n)
      var sentences = text.match(/[^.!?।\n]+[.!?।\n]+/g) || [text];
      var chunks = [];
      var currentChunk = '';

      for (var i = 0; i < sentences.length; i++) {
        var s = sentences[i];
        if ((currentChunk + s).length > maxChars && currentChunk.trim()) {
          chunks.push(currentChunk.trim());
          currentChunk = s;
        } else {
          currentChunk += ' ' + s;
        }
      }

      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }

      return chunks;
    }
  };

  // Convert Base64 Audio string from Sarvam to Blob
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

  // 4. Sarvam AI Text-to-Speech API Client
  var SarvamTTSClient = {
    // Core synthesis method
    synthesizeText: async function (text, options) {
      if (!options) options = {};
      var lang = options.lang || 'en-IN';
      var speaker = options.speaker || SARVAM_CONFIG.speakers[lang] || 'ratan';
      var pace = options.pace !== undefined ? options.pace : SARVAM_CONFIG.defaultPace;
      
      var optimizedText = SarvamTextOptimizer.optimizeForNarration(text, lang);
      if (!optimizedText) throw new Error('Empty text provided for narration');

      // Check Cache first
      var cacheKey = getCacheKey(optimizedText, lang, speaker, pace);
      var cachedBlob = await getCachedAudio(cacheKey);
      if (cachedBlob) {
        return {
          audioUrl: URL.createObjectURL(cachedBlob),
          fromCache: true
        };
      }

      var apiKey = SARVAM_CONFIG.getApiKey();
      if (!apiKey) {
        throw new Error('NO_API_KEY');
      }

      var payload = {
        inputs: [optimizedText],
        target_language_code: lang,
        speaker: speaker,
        pitch: 0,
        pace: pace,
        loudness: SARVAM_CONFIG.loudness,
        speech_sample_rate: SARVAM_CONFIG.speechSampleRate,
        enable_preprocessing: SARVAM_CONFIG.enablePreprocessing,
        model: SARVAM_CONFIG.model
      };

      var response = await fetch(SARVAM_CONFIG.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': apiKey
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        var errMessage = 'HTTP ' + response.status;
        try {
          var errData = await response.json();
          if (errData.detail) errMessage = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
          else if (errData.message) errMessage = errData.message;
        } catch (_) {}
        throw new Error('Sarvam API Error: ' + errMessage);
      }

      var data = await response.json();
      if (!data.audios || !data.audios[0]) {
        throw new Error('Sarvam API returned no audio content');
      }

      var audioBlob = base64ToBlob(data.audios[0], 'audio/wav');
      await setCachedAudio(cacheKey, audioBlob);

      return {
        audioUrl: URL.createObjectURL(audioBlob),
        fromCache: false
      };
    }
  };

  // 5. High-Level Playback Queue & Gapless Narration Controller
  class SarvamNarrationQueue {
    constructor() {
      this.verses = [];
      this.currentIndex = 0;
      this.isPlaying = false;
      this.isPaused = false;
      this.currentAudio = null;
      this.prefetchMap = new Map(); // verseIndex -> Promise<audioUrl>
      this.options = {
        lang: 'en-IN',
        speaker: 'ratan',
        pace: 0.92
      };
      this.listeners = {
        onVerseChange: null,
        onStateChange: null,
        onComplete: null,
        onError: null
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
    }

    async play() {
      if (this.verses.length === 0) return;
      if (this.isPaused && this.currentAudio) {
        this.isPaused = false;
        this.isPlaying = true;
        this.currentAudio.play();
        if (this.listeners.onStateChange) this.listeners.onStateChange('playing');
        return;
      }

      this.isPlaying = true;
      this.isPaused = false;
      await this._playVerse(this.currentIndex);
    }

    pause() {
      if (this.currentAudio && !this.currentAudio.paused) {
        this.currentAudio.pause();
        this.isPaused = true;
        if (this.listeners.onStateChange) this.listeners.onStateChange('paused');
      }
    }

    resume() {
      if (this.isPaused && this.currentAudio) {
        this.currentAudio.play();
        this.isPaused = false;
        this.isPlaying = true;
        if (this.listeners.onStateChange) this.listeners.onStateChange('playing');
      } else if (!this.isPlaying) {
        this.play();
      }
    }

    stop() {
      this.isPlaying = false;
      this.isPaused = false;
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio.src = '';
        this.currentAudio = null;
      }
      this.prefetchMap.clear();
      if (this.listeners.onStateChange) this.listeners.onStateChange('stopped');
    }

    async jumpToVerse(index) {
      if (index < 0 || index >= this.verses.length) return;
      this.currentIndex = index;
      if (this.isPlaying) {
        if (this.currentAudio) {
          this.currentAudio.pause();
          this.currentAudio = null;
        }
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

    // Pre-fetch next verse audio in background for continuous stream
    _prefetchVerse(index) {
      var self = this;
      if (index < 0 || index >= this.verses.length) return;
      if (this.prefetchMap.has(index)) return;

      var verse = this.verses[index];
      var promise = SarvamTTSClient.synthesizeText(verse.text, this.options)
        .then(function (res) { return res.audioUrl; })
        .catch(function (err) {
          console.warn('[Sarvam TTS] Background prefetch failed for verse ' + index + ':', err);
          return null;
        });

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

      try {
        var audioUrl = null;
        // Check if prefetch already started
        if (this.prefetchMap.has(index)) {
          audioUrl = await this.prefetchMap.get(index);
          this.prefetchMap.delete(index);
        }

        if (!audioUrl) {
          var res = await SarvamTTSClient.synthesizeText(verse.text, this.options);
          audioUrl = res.audioUrl;
        }

        if (!this.isPlaying) return; // cancelled during fetch

        var audio = new Audio(audioUrl);
        this.currentAudio = audio;

        // Kick off prefetch of the next verse immediately
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
          console.error('[Sarvam TTS] Playback audio error on verse ' + index + ':', e);
          if (self.isPlaying) {
            self.next(); // advance on error
          }
        };

        await audio.play();
      } catch (err) {
        console.error('[Sarvam TTS] Synthesis failed on verse ' + index + ':', err);
        if (this.listeners.onError) {
          this.listeners.onError(err, index, verse);
        }
      }
    }
  }

  // Create singleton queue instance
  var narrationQueueInstance = new SarvamNarrationQueue();

  // Export to Global Window
  window.SarvamTTS = {
    config: SARVAM_CONFIG,
    optimizer: SarvamTextOptimizer,
    client: SarvamTTSClient,
    queue: narrationQueueInstance,
    
    // Quick Helper for single verse / VOD
    speakText: async function (text, options) {
      return SarvamTTSClient.synthesizeText(text, options);
    }
  };

})(window);
