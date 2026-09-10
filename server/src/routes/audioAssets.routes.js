const express = require('express');
const router = express.Router();
const audioAssetsController = require('../controllers/audioAssetsController');
const { optionalToken } = require('../middleware/auth');

// GET /api/audio-assets/:book/:chapter?lang=mr - resolve cloud audio asset stream
router.get('/:book/:chapter', optionalToken, audioAssetsController.getChapterAudio);

module.exports = router;
