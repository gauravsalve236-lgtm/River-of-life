/**
 * ============================================================================
 * tts.routes.js — ElevenLabs Audio TTS Routes
 * River of Life Bible App API
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const ttsController = require('../controllers/ttsController');

// Synthesize single verse or text passage
router.post('/convert', ttsController.convertText);

// Direct low-latency chunked audio streaming
router.post('/stream', ttsController.streamText);

// Sequential chunked text stream conversion
router.post('/stream-chunks', ttsController.streamChunks);

// Voice info & configuration check
router.get('/voice-info', ttsController.getVoiceInfo);

module.exports = router;
