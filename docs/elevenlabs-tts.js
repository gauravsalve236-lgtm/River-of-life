/* ==========================================================================
   elevenlabs-tts.js — ElevenLabs Text-to-Speech Frontend Adapter
   River of Life Bible App (जीवन नदी बायबल ॲप)
   
   Voice Name: Shrey - Deep Marathi Conversational
   Voice ID: C9v09R5AIM6tOX6Fn06I
   Model ID: eleven_v3
   ========================================================================== */

(function (window) {
  'use strict';

  var ELEVENLABS_CLIENT_CONFIG = {
    voiceName: 'Shrey - Deep Marathi Conversational',
    voiceId: 'C9v09R5AIM6tOX6Fn06I',
    modelId: 'eleven_v3',
    backendEndpoint: '/api/tts', // Express Backend Proxy
    directApiEndpoint: 'https://api.elevenlabs.io/v1/text-to-speech',
    defaultPace: 0.92,
    
    getApiKey: function () {
      if (typeof localStorage !== 'undefined') {
        var k = localStorage.getItem('rol_elevenlabs_api_key');
        if (k) return k;
      }
      return (typeof window !== 'undefined' && window.ELEVENLABS_API_KEY) || (typeof window !== 'undefined' && window.state && window.state.elevenlabsApiKey) || 'sk_53532f375cb8723144f7c3d6f10520e60043fc74cb1552d4';
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
  };

  var ElevenLabsFrontendTTS = {
    config: ELEVENLABS_CLIENT_CONFIG,

    /**
     * Synthesize a verse via Backend Service or Direct ElevenLabs API
     */
    synthesizeVerse: async function (verseText, options) {
      if (!options) options = {};
      var voiceId = options.voiceId || ELEVENLABS_CLIENT_CONFIG.voiceId;
      var modelId = options.modelId || ELEVENLABS_CLIENT_CONFIG.modelId;
      var apiKey = options.apiKey || ELEVENLABS_CLIENT_CONFIG.getApiKey();

      // 1. Try Backend API first if available
      try {
        var resp = await fetch('/api/tts/convert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: verseText,
            voiceId: voiceId,
            modelId: modelId
          })
        });
        if (resp.ok) {
          var data = await resp.json();
          if (data.audioBase64) {
            var binary = atob(data.audioBase64);
            var len = binary.length;
            var buffer = new Uint8Array(len);
            for (var i = 0; i < len; i++) buffer[i] = binary.charCodeAt(i);
            var blob = new Blob([buffer], { type: 'audio/mpeg' });
            return {
              audioUrl: URL.createObjectURL(blob),
              voiceName: data.voiceName || ELEVENLABS_CLIENT_CONFIG.voiceName
            };
          }
        }
      } catch (backendErr) {
        console.warn('[ElevenLabs Frontend] Backend endpoint not reachable, trying direct:', backendErr);
      }

      // 2. Direct ElevenLabs API call fallback if apiKey is provided
      if (apiKey) {
        var directUrl = `${ELEVENLABS_CLIENT_CONFIG.directApiEndpoint}/${voiceId}`;
        var directResp = await fetch(directUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': apiKey
          },
          body: JSON.stringify({
            text: verseText,
            model_id: modelId,
            voice_settings: {
              stability: 0.55,
              similarity_boost: 0.85
            }
          })
        });

        if (!directResp.ok) {
          var errText = await directResp.text();
          throw new Error(`ElevenLabs Direct Error (${directResp.status}): ${errText}`);
        }

        var blobDirect = await directResp.blob();
        return {
          audioUrl: URL.createObjectURL(blobDirect),
          voiceName: ELEVENLABS_CLIENT_CONFIG.voiceName
        };
      }

      throw new Error('Please configure ELEVENLABS_API_KEY in Settings or start backend server.');
    }
  };

  window.ElevenLabsTTS = ElevenLabsFrontendTTS;
})(window);
