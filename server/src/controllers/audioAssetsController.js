/**
 * Audio Assets Controller
 * Manages high-definition Marathi & English audio stream URLs backed by Cloud Storage (R2 / S3).
 */

const storageService = require('../services/storageService');

/**
 * Get the verified cloud audio stream URL for a given book and chapter.
 */
async function getChapterAudio(req, res) {
  const { book, chapter } = req.params;
  const lang = req.query.lang || req.query.language || 'mr';

  if (!book || !chapter) {
    return res.status(400).json({ error: 'Missing book or chapter parameter' });
  }

  const chNum = parseInt(chapter, 10);
  if (isNaN(chNum) || chNum < 1) {
    return res.status(400).json({ error: 'Invalid chapter number' });
  }

  try {
    const asset = await storageService.resolveAudioAsset(book, chNum, lang);
    res.json({
      status: 'ok',
      asset: {
        id: asset.id,
        book: asset.book_name,
        chapter: asset.chapter_number,
        language: asset.language,
        audioUrl: asset.audio_url,
        storageProvider: asset.storage_provider
      }
    });
  } catch (err) {
    console.error('[AudioAssets] Error resolving audio asset:', err);
    res.status(500).json({ error: 'Failed to resolve audio asset' });
  }
}

module.exports = {
  getChapterAudio
};
