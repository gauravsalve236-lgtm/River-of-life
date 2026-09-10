const express = require('express');
const router = express.Router();
const bookmarksController = require('../controllers/bookmarksController');
const { authenticateToken } = require('../middleware/auth');

// All bookmark endpoints require JWT authentication
router.use(authenticateToken);

// GET /api/bookmarks - list user bookmarks, optional ?tag=xxx
router.get('/', bookmarksController.getBookmarks);

// POST /api/bookmarks - create new bookmark
router.post('/', bookmarksController.createBookmark);

// DELETE /api/bookmarks/:id - delete a bookmark
router.delete('/:id', bookmarksController.deleteBookmark);

module.exports = router;
