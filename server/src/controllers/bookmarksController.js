/**
 * Bookmarks Controller
 * Handles user scripture bookmarks, thematic categorization, and retrieval.
 */

const { dbQuery, generateUuid } = require('../db/connection');

/**
 * Get all bookmarks for the authenticated user, optionally filtered by tag.
 */
async function getBookmarks(req, res) {
  const userId = req.user && (req.user.id || req.user.userId);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: User authentication required' });
  }

  const { tag, verse_tag } = req.query;
  const filterTag = tag || verse_tag;

  try {
    let rows;
    if (filterTag) {
      rows = await dbQuery.all(
        `SELECT id, reference_text, verse_tag, verse_text, book_name, chapter_number, verse_number, created_at 
         FROM bookmarks 
         WHERE user_id = $1 AND LOWER(verse_tag) = LOWER($2) 
         ORDER BY created_at DESC`,
        [userId, filterTag]
      );
    } else {
      rows = await dbQuery.all(
        `SELECT id, reference_text, verse_tag, verse_text, book_name, chapter_number, verse_number, created_at 
         FROM bookmarks 
         WHERE user_id = $1 
         ORDER BY created_at DESC`,
        [userId]
      );
    }

    res.json({
      status: 'ok',
      totalBookmarks: rows.length,
      bookmarks: rows
    });
  } catch (err) {
    console.error('[Bookmarks] Error fetching bookmarks:', err);
    res.status(500).json({ error: 'Failed to retrieve bookmarks' });
  }
}

/**
 * Create a new scripture bookmark.
 */
async function createBookmark(req, res) {
  const userId = req.user && (req.user.id || req.user.userId);
  const { reference_text, verse_tag, verse_text, book_name, chapter_number, verse_number } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!reference_text) {
    return res.status(400).json({ error: 'Missing required field: reference_text is required' });
  }

  const bookmarkId = generateUuid();
  const tag = verse_tag || 'General';

  try {
    await dbQuery.run(
      `INSERT INTO bookmarks (id, user_id, reference_text, verse_tag, verse_text, book_name, chapter_number, verse_number, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
      [
        bookmarkId,
        userId,
        reference_text.trim(),
        tag.trim(),
        verse_text || '',
        book_name || null,
        chapter_number !== undefined ? parseInt(chapter_number, 10) : null,
        verse_number !== undefined ? parseInt(verse_number, 10) : null
      ]
    );

    const created = await dbQuery.get(
      `SELECT id, reference_text, verse_tag, verse_text, book_name, chapter_number, verse_number, created_at 
       FROM bookmarks WHERE id = $1`,
      [bookmarkId]
    );

    res.status(201).json({
      status: 'ok',
      message: 'Bookmark saved successfully',
      bookmark: created
    });
  } catch (err) {
    console.error('[Bookmarks] Error creating bookmark:', err);
    res.status(500).json({ error: 'Failed to create bookmark' });
  }
}

/**
 * Delete a bookmark by ID.
 */
async function deleteBookmark(req, res) {
  const userId = req.user && (req.user.id || req.user.userId);
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const existing = await dbQuery.get(
      `SELECT id FROM bookmarks WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Bookmark not found or permission denied' });
    }

    await dbQuery.run(`DELETE FROM bookmarks WHERE id = $1 AND user_id = $2`, [id, userId]);

    res.json({
      status: 'ok',
      message: 'Bookmark removed successfully',
      id
    });
  } catch (err) {
    console.error('[Bookmarks] Error deleting bookmark:', err);
    res.status(500).json({ error: 'Failed to delete bookmark' });
  }
}

module.exports = {
  getBookmarks,
  createBookmark,
  deleteBookmark
};
