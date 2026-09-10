/**
 * Reading Progress Controller
 * Handles user reading progress tracking and cross-device sync.
 */

const { dbQuery, generateUuid } = require('../db/connection');

/**
 * Get all reading progress records for current authenticated user.
 */
async function getProgress(req, res) {
  const userId = req.user && (req.user.id || req.user.userId);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: User authentication required' });
  }

  try {
    const rows = await dbQuery.all(
      `SELECT id, book_name, chapter_number, progress_percentage, last_verse, updated_at 
       FROM reading_progress 
       WHERE user_id = $1 
       ORDER BY updated_at DESC`,
      [userId]
    );

    res.json({
      status: 'ok',
      totalBooksRead: rows.length,
      progress: rows
    });
  } catch (err) {
    console.error('[ReadingProgress] Error fetching progress:', err);
    res.status(500).json({ error: 'Failed to retrieve reading progress' });
  }
}

/**
 * Get reading progress for a specific book and chapter.
 */
async function getChapterProgress(req, res) {
  const userId = req.user && (req.user.id || req.user.userId);
  const { book, chapter } = req.params;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const cleanBook = (book || '').toLowerCase().trim();
  const chNum = parseInt(chapter, 10);

  try {
    const row = await dbQuery.get(
      `SELECT id, book_name, chapter_number, progress_percentage, last_verse, updated_at 
       FROM reading_progress 
       WHERE user_id = $1 AND LOWER(book_name) = $2 AND chapter_number = $3`,
      [userId, cleanBook, chNum]
    );

    res.json({
      status: 'ok',
      progress: row || {
        book_name: cleanBook,
        chapter_number: chNum,
        progress_percentage: 0.0,
        last_verse: 1
      }
    });
  } catch (err) {
    console.error('[ReadingProgress] Error fetching chapter progress:', err);
    res.status(500).json({ error: 'Failed to retrieve chapter reading progress' });
  }
}

/**
 * Save / sync reading progress (Upsert).
 */
async function syncProgress(req, res) {
  const userId = req.user && (req.user.id || req.user.userId);
  const { book_name, chapter_number, progress_percentage, last_verse } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!book_name || chapter_number === undefined) {
    return res.status(400).json({ error: 'Missing required fields: book_name and chapter_number are required' });
  }

  const cleanBook = String(book_name).toLowerCase().trim();
  const chNum = parseInt(chapter_number, 10);
  const pct = Math.min(100.0, Math.max(0.0, parseFloat(progress_percentage || 0.0)));
  const verse = parseInt(last_verse || 1, 10);

  try {
    const existing = await dbQuery.get(
      `SELECT id FROM reading_progress WHERE user_id = $1 AND LOWER(book_name) = $2 AND chapter_number = $3`,
      [userId, cleanBook, chNum]
    );

    let progressId = existing ? existing.id : generateUuid();

    if (existing) {
      await dbQuery.run(
        `UPDATE reading_progress 
         SET progress_percentage = $1, last_verse = $2, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $3`,
        [pct, verse, progressId]
      );
    } else {
      await dbQuery.run(
        `INSERT INTO reading_progress (id, user_id, book_name, chapter_number, progress_percentage, last_verse, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [progressId, userId, cleanBook, chNum, pct, verse]
      );
    }

    const saved = await dbQuery.get(
      `SELECT id, book_name, chapter_number, progress_percentage, last_verse, updated_at 
       FROM reading_progress WHERE id = $1`,
      [progressId]
    );

    res.json({
      status: 'ok',
      message: 'Reading progress synced successfully',
      progress: saved
    });
  } catch (err) {
    console.error('[ReadingProgress] Error saving progress:', err);
    res.status(500).json({ error: 'Failed to sync reading progress' });
  }
}

module.exports = {
  getProgress,
  getChapterProgress,
  syncProgress
};
