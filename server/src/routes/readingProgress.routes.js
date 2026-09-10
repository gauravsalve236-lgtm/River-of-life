const express = require('express');
const router = express.Router();
const readingProgressController = require('../controllers/readingProgressController');
const { authenticateToken } = require('../middleware/auth');

// All reading progress endpoints require JWT authentication
router.use(authenticateToken);

// GET /api/reading-progress - list all reading progress records for user
router.get('/', readingProgressController.getProgress);

// GET /api/reading-progress/:book/:chapter - progress for specific chapter
router.get('/:book/:chapter', readingProgressController.getChapterProgress);

// POST /api/reading-progress - sync/upsert reading progress
router.post('/', readingProgressController.syncProgress);

module.exports = router;
