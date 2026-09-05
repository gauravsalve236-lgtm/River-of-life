/**
 * ============================================================================
 * elevenlabsService.js — ElevenLabs Text-to-Speech Service
 * River of Life Bible App (जीवन नदी बायबल ॲप)
 *
 * Voice: Shrey - Deep Marathi Conversational
 * Voice ID: C9v09R5AIM6tOX6Fn06I
 * Model ID: eleven_v3
 * SDK: @elevenlabs/elevenlabs-js
 * ============================================================================
 */

const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');
const { Readable, PassThrough } = require('node:stream');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// 1. Voice & Model Configuration Specifications
const ELEVENLABS_CONFIG = {
  voiceName: 'Shrey - Deep Marathi Conversational',
  voiceId: process.env.ELEVENLABS_VOICE_ID || 'C9v09R5AIM6tOX6Fn06I',
  modelId: process.env.ELEVENLABS_MODEL_ID || 'eleven_v3',
  
  // Voice settings tailored for deep, reverent, conversational Marathi scripture
  defaultVoiceSettings: {
    stability: 0.68,           // Enhanced stability for calm, solemn scripture reading
    similarity_boost: 0.88,    // High fidelity to voice profile
    style: 0.06,               // Controlled devotional cadence
    use_speaker_boost: true    // Clear acoustic presence
  },

  outputFormat: 'mp3_44100_128',
  defaultLanguageCode: 'mr'
};

// 2. Client Initialization
let elevenLabsClientInstance = null;

function getClient(customApiKey = null) {
  const apiKey = customApiKey || process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ELEVENLABS_API_KEY is missing. Please set it in your environment or .env file.'
    );
  }
  if (!elevenLabsClientInstance || customApiKey) {
    const client = new ElevenLabsClient({ apiKey });
    if (!customApiKey) elevenLabsClientInstance = client;
    return client;
  }
  return elevenLabsClientInstance;
}

// 3. Bible Text Optimizer & Scripture Normalizer for Marathi
const ScriptureTextOptimizer = {
  /**
   * Cleans and normalizes Bible verse text for natural conversational Marathi narration.
   * @param {string} text - Raw Bible verse text (Devanagari / English)
   * @returns {string} - Cleaned text ready for TTS synthesis
   */
  normalizeVerseText(text) {
    if (!text || typeof text !== 'string') return '';
    let cleaned = text;

    // Remove bracketed footnotes, reference tags [1], (a), *, †, ‡
    cleaned = cleaned.replace(/\s*\[[a-zA-Z0-9]+\]/g, '');
    cleaned = cleaned.replace(/\s*\([a-zA-Z0-9]+\)/g, '');
    cleaned = cleaned.replace(/[*†‡§]/g, '');

    // Remove leading verse numbers (e.g., '1 इन द बिगिनिंग' / '१ सुरुवातीला')
    cleaned = cleaned.replace(/^[\d\u0966-\u096F]+[\.\:\s\-]+/g, '');

    // Replace abrupt em-dashes and semicolons with natural pause commas
    cleaned = cleaned.replace(/[—–]/g, ', ');
    cleaned = cleaned.replace(/\s*;\s*/g, ', ');
    cleaned = cleaned.replace(/\s*,\s*/g, ', ');
    cleaned = cleaned.replace(/\s*\.\s*/g, '. ');

    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Ensure ending punctuation for proper sentence cadencing
    if (cleaned && !/[.!?:,;।]$/.test(cleaned)) {
      cleaned += /[\u0900-\u097F]/.test(cleaned) ? ' ।' : '.';
    }

    return cleaned;
  },

  /**
   * Splits lengthy scripture chapters or devotionals into natural sentence chunks.
   * @param {string} text - Scripture text
   * @param {number} maxChars - Maximum characters per chunk (default: 400)
   * @returns {string[]} - Array of natural sentence chunks
   */
  chunkTextIntoSentences(text, maxChars = 400) {
    if (!text) return [];
    if (text.length <= maxChars) return [text];

    const sentenceRegex = /[^.!?।,;\n]+[.!?।,;\n]*/g;
    const sentences = text.match(sentenceRegex) || [text];
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      const s = sentence.trim();
      if (!s) continue;

      if ((currentChunk + ' ' + s).length > maxChars) {
        if (currentChunk.trim()) chunks.push(currentChunk.trim());
        currentChunk = s;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + s;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
};

// 4. Core ElevenLabs Service API
const ElevenLabsService = {
  config: ELEVENLABS_CONFIG,
  optimizer: ScriptureTextOptimizer,

  /**
   * Converts a Bible verse or passage to an audio Buffer using ElevenLabs eleven_v3.
   * @param {string} text - Scripture text to synthesize
   * @param {object} options - Optional overrides (voiceId, modelId, voiceSettings, apiKey)
   * @returns {Promise<{ audioBuffer: Buffer, audioBase64: string, contentType: string }>}
   */
  async convertVerseToSpeech(text, options = {}) {
    const client = getClient(options.apiKey);
    const cleanedText = ScriptureTextOptimizer.normalizeVerseText(text);

    if (!cleanedText) {
      throw new Error('No valid text provided for audio conversion.');
    }

    const voiceId = options.voiceId || ELEVENLABS_CONFIG.voiceId;
    const modelId = options.modelId || ELEVENLABS_CONFIG.modelId;
    const voiceSettings = {
      ...ELEVENLABS_CONFIG.defaultVoiceSettings,
      ...(options.voiceSettings || {})
    };

    // Call official ElevenLabs SDK convert method
    const audioStream = await client.textToSpeech.convert(voiceId, {
      model_id: modelId,
      text: cleanedText,
      voice_settings: voiceSettings,
      output_format: options.outputFormat || ELEVENLABS_CONFIG.outputFormat
    });

    // Collect stream chunks into Buffer
    const chunks = [];
    if (Buffer.isBuffer(audioStream)) {
      chunks.push(audioStream);
    } else if (typeof audioStream[Symbol.asyncIterator] === 'function') {
      for await (const chunk of audioStream) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
    } else if (audioStream instanceof Readable) {
      for await (const chunk of audioStream) {
        chunks.push(chunk);
      }
    }

    const audioBuffer = Buffer.concat(chunks);
    const audioBase64 = audioBuffer.toString('base64');

    return {
      audioBuffer,
      audioBase64,
      contentType: 'audio/mpeg',
      voiceId,
      modelId,
      voiceName: ELEVENLABS_CONFIG.voiceName,
      text: cleanedText
    };
  },

  /**
   * Converts a Bible verse to a real-time audio stream and pipes it directly
   * to a writable stream (e.g. Express HTTP Response or File Stream).
   * @param {string} text - Scripture text
   * @param {WritableStream} outputStream - Stream to pipe audio bytes into
   * @param {object} options - Optional parameters
   */
  async streamVerseToSpeech(text, outputStream, options = {}) {
    const client = getClient(options.apiKey);
    const cleanedText = ScriptureTextOptimizer.normalizeVerseText(text);

    const voiceId = options.voiceId || ELEVENLABS_CONFIG.voiceId;
    const modelId = options.modelId || ELEVENLABS_CONFIG.modelId;
    const voiceSettings = {
      ...ELEVENLABS_CONFIG.defaultVoiceSettings,
      ...(options.voiceSettings || {})
    };

    // Call ElevenLabs convertAsStream for low-latency chunked audio streaming
    const audioStream = await client.textToSpeech.convertAsStream(voiceId, {
      model_id: modelId,
      text: cleanedText,
      voice_settings: voiceSettings,
      output_format: options.outputFormat || ELEVENLABS_CONFIG.outputFormat
    });

    if (typeof audioStream[Symbol.asyncIterator] === 'function') {
      for await (const chunk of audioStream) {
        outputStream.write(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      outputStream.end();
    } else if (audioStream instanceof Readable) {
      audioStream.pipe(outputStream);
    } else {
      outputStream.write(Buffer.from(audioStream));
      outputStream.end();
    }
  },

  /**
   * Handles an asynchronous stream of incoming text chunks (e.g., streaming Bible verses,
   * live devotional prayers from an AI assistant, or sentence-by-sentence reading).
   * Sequentially converts each text chunk and yields audio chunks for continuous listening.
   *
   * @param {AsyncIterable<string>|Array<string>} textStream - Async iterator or array of text chunks
   * @param {object} options - Voice and synthesis configuration
   * @returns {AsyncGenerator<Buffer>} - Async generator yielding audio chunks in real-time
   */
  async *convertChunkedTextStream(textStream, options = {}) {
    const client = getClient(options.apiKey);
    const voiceId = options.voiceId || ELEVENLABS_CONFIG.voiceId;
    const modelId = options.modelId || ELEVENLABS_CONFIG.modelId;
    const voiceSettings = {
      ...ELEVENLABS_CONFIG.defaultVoiceSettings,
      ...(options.voiceSettings || {})
    };

    for await (const rawChunk of textStream) {
      const normalizedChunk = ScriptureTextOptimizer.normalizeVerseText(rawChunk);
      if (!normalizedChunk) continue;

      try {
        const audioStream = await client.textToSpeech.convertAsStream(voiceId, {
          model_id: modelId,
          text: normalizedChunk,
          voice_settings: voiceSettings,
          output_format: options.outputFormat || ELEVENLABS_CONFIG.outputFormat
        });

        if (typeof audioStream[Symbol.asyncIterator] === 'function') {
          for await (const audioChunk of audioStream) {
            yield typeof audioChunk === 'string' ? Buffer.from(audioChunk) : audioChunk;
          }
        } else if (Buffer.isBuffer(audioStream)) {
          yield audioStream;
        }
      } catch (chunkError) {
        console.error(`[ElevenLabs Service] Error synthesizing chunk "${normalizedChunk.slice(0, 30)}...":`, chunkError);
        // Continue processing subsequent chunks without terminating the whole stream
      }
    }
  },

  /**
   * Batch converts an array of Bible verses for a complete chapter.
   * Includes verse reference tagging and duration metadata.
   * @param {Array<{ verseNum: number|string, text: string }>} versesArray
   * @param {object} options
   */
  async convertChapterVerses(versesArray, options = {}) {
    const results = [];
    for (const item of versesArray) {
      try {
        const audioRes = await this.convertVerseToSpeech(item.text, options);
        results.push({
          verseNum: item.verseNum,
          success: true,
          audioBase64: audioRes.audioBase64,
          text: audioRes.text
        });
      } catch (err) {
        results.push({
          verseNum: item.verseNum,
          success: false,
          error: err.message,
          text: item.text
        });
      }
    }
    return results;
  },

  /**
   * Health check / Voice verification helper
   */
  async verifyVoice(apiKey = null) {
    const client = getClient(apiKey);
    try {
      const voice = await client.voices.get(ELEVENLABS_CONFIG.voiceId);
      return {
        success: true,
        voiceId: voice.voice_id,
        voiceName: voice.name || ELEVENLABS_CONFIG.voiceName,
        category: voice.category,
        labels: voice.labels
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        voiceId: ELEVENLABS_CONFIG.voiceId,
        voiceName: ELEVENLABS_CONFIG.voiceName
      };
    }
  }
};

module.exports = {
  ElevenLabsService,
  ELEVENLABS_CONFIG,
  ScriptureTextOptimizer
};
