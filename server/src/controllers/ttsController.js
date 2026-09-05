/**
 * ============================================================================
 * ttsController.js — Controller for ElevenLabs Audio Synthesis Endpoints
 * River of Life Bible App
 * ============================================================================
 */

const { ElevenLabsService, ELEVENLABS_CONFIG } = require('../services/elevenlabsService');

const ttsController = {
  /**
   * POST /api/tts/convert
   * Body: { text: "...", voiceId?: "...", modelId?: "...", voiceSettings?: {...} }
   */
  async convertText(req, res) {
    try {
      const { text, voiceId, modelId, voiceSettings, outputFormat } = req.body;
      if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ error: 'Field "text" is required and must be a non-empty string.' });
      }

      const result = await ElevenLabsService.convertVerseToSpeech(text, {
        voiceId,
        modelId,
        voiceSettings,
        outputFormat
      });

      return res.status(200).json({
        success: true,
        voiceName: result.voiceName,
        voiceId: result.voiceId,
        modelId: result.modelId,
        contentType: result.contentType,
        audioBase64: result.audioBase64,
        normalizedText: result.text
      });
    } catch (err) {
      console.error('[TTS Controller] convertText error:', err);
      const statusCode = err.status || (err.message.includes('missing') ? 401 : 500);
      return res.status(statusCode).json({
        success: false,
        error: err.message || 'Failed to synthesize audio.'
      });
    }
  },

  /**
   * POST /api/tts/stream
   * Body: { text: "...", voiceId?: "..." }
   * Streams chunked MP3 audio directly to client with low latency.
   */
  async streamText(req, res) {
    try {
      const { text, voiceId, modelId, voiceSettings } = req.body;
      if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ error: 'Field "text" is required for audio streaming.' });
      }

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('X-Voice-Name', ELEVENLABS_CONFIG.voiceName);
      res.setHeader('X-Model-Id', ELEVENLABS_CONFIG.modelId);

      await ElevenLabsService.streamVerseToSpeech(text, res, {
        voiceId,
        modelId,
        voiceSettings
      });
    } catch (err) {
      console.error('[TTS Controller] streamText error:', err);
      if (!res.headersSent) {
        return res.status(500).json({ success: false, error: err.message });
      }
      res.end();
    }
  },

  /**
   * POST /api/tts/stream-chunks
   * Body: { chunks: ["Verse 1 text...", "Verse 2 text..."], voiceId?: "..." }
   * Streams audio chunks sequentially for chunked text arrays / passages.
   */
  async streamChunks(req, res) {
    try {
      const { chunks, voiceId, modelId } = req.body;
      if (!Array.isArray(chunks) || chunks.length === 0) {
        return res.status(400).json({ error: 'Field "chunks" must be a non-empty array of text strings.' });
      }

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Cache-Control', 'no-cache');

      for await (const audioChunk of ElevenLabsService.convertChunkedTextStream(chunks, { voiceId, modelId })) {
        res.write(audioChunk);
      }
      res.end();
    } catch (err) {
      console.error('[TTS Controller] streamChunks error:', err);
      if (!res.headersSent) {
        return res.status(500).json({ success: false, error: err.message });
      }
      res.end();
    }
  },

  /**
   * GET /api/tts/voice-info
   * Returns current voice metadata & configuration status
   */
  async getVoiceInfo(req, res) {
    try {
      const status = await ElevenLabsService.verifyVoice();
      return res.status(200).json({
        success: true,
        configuredVoice: ELEVENLABS_CONFIG.voiceName,
        voiceId: ELEVENLABS_CONFIG.voiceId,
        modelId: ELEVENLABS_CONFIG.modelId,
        defaultPace: 0.92,
        language: 'mr-IN (Marathi)',
        voiceDetails: status
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }
};

module.exports = ttsController;
