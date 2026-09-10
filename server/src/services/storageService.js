/**
 * Cloud Object Storage Service (AWS S3 & Cloudflare R2)
 * Manages high-definition bilingual audio Bible streaming assets.
 * Compatible with standard S3 API (AWS S3, Cloudflare R2, MinIO).
 */

const { dbQuery, generateUuid } = require('../db/connection');
const dotenv = require('dotenv');

dotenv.config();

const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'cloudflare_r2';
const S3_ENDPOINT = process.env.S3_ENDPOINT || null; // e.g. https://<account-id>.r2.cloudflarestorage.com
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || 'river-of-life-marathi-audio';
const S3_PUBLIC_DOMAIN = process.env.S3_PUBLIC_DOMAIN || 'https://audio.riveroflife.org';
const S3_REGION = process.env.S3_REGION || 'auto';

// Standard USFM Book Mapping for high-definition audio filenames
const BSI_USFM_MAP = {
  "genesis": "GEN", "exodus": "EXO", "leviticus": "LEV", "numbers": "NUM",
  "deuteronomy": "DEU", "joshua": "JOS", "judges": "JDG", "ruth": "RUT",
  "1samuel": "1SA", "2samuel": "2SA", "1kings": "1KI", "2kings": "2KI",
  "1chronicles": "1CH", "2chronicles": "2CH", "ezra": "EZR", "nehemiah": "NEH",
  "esther": "EST", "job": "JOB", "psalms": "PSA", "proverbs": "PRO",
  "ecclesiastes": "ECC", "songofsolomon": "SNG", "isaiah": "ISA", "jeremiah": "JER",
  "lamentations": "LAM", "ezekiel": "EZK", "daniel": "DAN", "hosea": "HOS",
  "joel": "JOL", "amos": "AMO", "obadiah": "OBA", "jonah": "JON",
  "micah": "MIC", "nahum": "NAM", "habakkuk": "HAB", "zephaniah": "ZEP",
  "haggai": "HAG", "zechariah": "ZEC", "malachi": "MAL", "matthew": "MAT",
  "mark": "MRK", "luke": "LUK", "john": "JHN", "acts": "ACT",
  "romans": "ROM", "1corinthians": "1CO", "2corinthians": "2CO", "galatians": "GAL",
  "ephesians": "EPH", "philippians": "PHP", "colossians": "COL", "1thessalonians": "1TH",
  "2thessalonians": "2TH", "1timothy": "1TI", "2timothy": "2TI", "titus": "TIT",
  "philemon": "PHM", "hebrews": "HEB", "james": "JAS", "1peter": "1PE",
  "2peter": "2PE", "1john": "1JN", "2john": "2JN", "3john": "3JN",
  "jude": "JUD", "revelation": "REV"
};

/**
 * Constructs the canonical audio filename and storage key for a book and chapter.
 * Format: "audio/mr/GEN_001.mp3"
 */
function getStorageKey(bookName, chapterNumber, language = 'mr') {
  const cleanBook = (bookName || 'genesis').toLowerCase().replace('.json', '');
  const usfm = BSI_USFM_MAP[cleanBook] || cleanBook.substring(0, 3).toUpperCase();
  const chStr = String(chapterNumber || 1).padStart(3, '0');
  return `audio/${language.toLowerCase()}/${usfm}_${chStr}.mp3`;
}

/**
 * Builds the public CDN / Cloudflare R2 / AWS S3 asset URL.
 */
function getPublicAudioUrl(storageKey) {
  if (S3_PUBLIC_DOMAIN && S3_PUBLIC_DOMAIN.startsWith('http')) {
    return `${S3_PUBLIC_DOMAIN.replace(/\/+$/, '')}/${storageKey}`;
  }
  if (S3_ENDPOINT && S3_BUCKET_NAME) {
    return `${S3_ENDPOINT.replace(/\/+$/, '')}/${S3_BUCKET_NAME}/${storageKey}`;
  }
  // Default cloud CDN asset fallback
  const fname = storageKey.split('/').pop();
  return `https://d1hkpuz2o5a2xw.cloudfront.net/source/555476c2390c102d-04/${fname}`;
}

/**
 * Resolves an audio asset from the database or registers it dynamically if not yet indexed.
 */
async function resolveAudioAsset(bookName, chapterNumber, language = 'mr') {
  const cleanBook = (bookName || 'genesis').toLowerCase().replace('.json', '');
  const chNum = parseInt(chapterNumber || 1, 10);
  const lang = (language || 'mr').toLowerCase();

  // 1. Query database for existing asset record
  const existing = await dbQuery.get(
    `SELECT * FROM audio_assets WHERE LOWER(book_name) = $1 AND chapter_number = $2 AND LOWER(language) = $3`,
    [cleanBook, chNum, lang]
  );

  if (existing && existing.audio_url) {
    return existing;
  }

  // 2. Generate canonical storage key and public URL
  const storageKey = getStorageKey(cleanBook, chNum, lang);
  const audioUrl = getPublicAudioUrl(storageKey);
  const assetId = generateUuid();

  // 3. Persist asset link into audio_assets table
  try {
    await dbQuery.run(
      `INSERT INTO audio_assets (id, book_name, chapter_number, language, audio_url, storage_provider, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [assetId, cleanBook, chNum, lang, audioUrl, STORAGE_PROVIDER]
    );
  } catch (err) {
    // If unique constraint collided concurrently, fetch the inserted record
    console.warn(`[StorageService] Notice inserting audio asset:`, err.message);
  }

  return {
    id: assetId,
    book_name: cleanBook,
    chapter_number: chNum,
    language: lang,
    audio_url: audioUrl,
    storage_provider: STORAGE_PROVIDER
  };
}

module.exports = {
  STORAGE_PROVIDER,
  S3_BUCKET_NAME,
  S3_PUBLIC_DOMAIN,
  BSI_USFM_MAP,
  getStorageKey,
  getPublicAudioUrl,
  resolveAudioAsset
};
