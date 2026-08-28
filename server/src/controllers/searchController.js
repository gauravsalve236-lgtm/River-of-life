const fs = require('fs');
const path = require('path');

// Cache metadata in memory
let booksMetaMr = null;
let booksMetaEng = null;

function loadMetadata() {
  if (!booksMetaMr) {
    const pMr = path.join(__dirname, '../../../assets/bible/books_mr.json');
    if (fs.existsSync(pMr)) {
      booksMetaMr = JSON.parse(fs.readFileSync(pMr, 'utf-8'));
    }
  }
  if (!booksMetaEng) {
    const pEng = path.join(__dirname, '../../../assets/bible/books.json');
    if (fs.existsSync(pEng)) {
      booksMetaEng = JSON.parse(fs.readFileSync(pEng, 'utf-8'));
    }
  }
}

/**
 * Full-Text Scripture Search Endpoint
 */
async function searchScriptures(req, res) {
  try {
    const query = req.query.q ? req.query.q.trim() : '';
    const filter = req.query.filter || 'ALL'; // 'ALL', 'OT', 'NT'
    const lang = req.query.lang || (query && /[\u0900-\u097f]/.test(query) ? 'mar' : 'eng');
    const limit = parseInt(req.query.limit || '50', 10);
    const page = parseInt(req.query.page || '1', 10);

    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters.' });
    }

    loadMetadata();
    const metaList = lang === 'mar' ? booksMetaMr : booksMetaEng;
    if (!metaList) {
      return res.status(500).json({ error: 'Scripture metadata unavailable.' });
    }

    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    let results = [];

    const baseDir = path.join(__dirname, `../../../assets/bible/${lang === 'mar' ? 'books_mr' : 'books'}`);

    for (const book of metaList) {
      if (filter === 'OT' && book.testament !== 'OT') continue;
      if (filter === 'NT' && book.testament !== 'NT') continue;

      const bookFilename = book.filename || `${book.key || book.id}.json`;
      const file = path.join(baseDir, bookFilename);
      if (!fs.existsSync(file)) continue;

      const bookData = JSON.parse(fs.readFileSync(file, 'utf-8'));
      if (!bookData || !bookData.chapters) continue;

      bookData.chapters.forEach((chapter, cIdx) => {
        chapter.forEach((text, vIdx) => {
          const textLower = text.toLowerCase();
          const matchesAll = words.every(w => textLower.includes(w));

          if (matchesAll) {
            // Generate highlighted snippet
            let highlighted = text;
            words.forEach(w => {
              const regex = new RegExp(`(${w})`, 'gi');
              highlighted = highlighted.replace(regex, '<mark>$1</mark>');
            });

            results.push({
              bookName: book.name || book.engName,
              bookKey: book.filename.replace('.json', ''),
              testament: book.testament,
              chapter: cIdx + 1,
              verse: vIdx + 1,
              ref: `${book.name || book.engName} ${cIdx + 1}:${vIdx + 1}`,
              text,
              highlightedText: highlighted
            });
          }
        });
      });

      if (results.length >= limit * page + 100) break;
    }

    const startIndex = (page - 1) * limit;
    const paginatedResults = results.slice(startIndex, startIndex + limit);

    return res.json({
      query,
      lang,
      filter,
      totalMatches: results.length,
      page,
      limit,
      results: paginatedResults
    });
  } catch (err) {
    console.error('Search scriptures error:', err);
    return res.status(500).json({ error: 'Failed to search scriptures.' });
  }
}

module.exports = {
  searchScriptures
};
