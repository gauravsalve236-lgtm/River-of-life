-- =============================================================================
-- RIVER OF LIFE BILINGUAL BIBLE APP (ENGLISH / MARATHI)
-- PRODUCTION POSTGRESQL DATABASE SCHEMA (SUPABASE / AWS RDS / POSTGRESQL 14+)
-- =============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. USERS TABLE
-- Core user identity, authentication, language preference, and session tracking
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  username VARCHAR(100) UNIQUE,
  phone VARCHAR(20) UNIQUE,
  profile_photo TEXT,
  preferred_language VARCHAR(10) DEFAULT 'mr', -- 'mr' (Marathi) or 'en' (English)
  role VARCHAR(50) DEFAULT 'Member',           -- 'Member', 'Pastor', 'Super Admin'
  status VARCHAR(50) DEFAULT 'Active',         -- 'Active', 'Suspended', 'Pending'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- -----------------------------------------------------------------------------
-- 2. USER PREFERENCES TABLE
-- UI configurations, theme, and notification toggles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  language VARCHAR(10) DEFAULT 'mr',
  theme VARCHAR(20) DEFAULT 'system',
  bible_translation VARCHAR(20) DEFAULT 'MARVBSI',
  notification_daily_verse BOOLEAN DEFAULT TRUE,
  notification_prayer_reminders BOOLEAN DEFAULT TRUE,
  notification_meeting_alerts BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 3. USER REFRESH TOKENS TABLE
-- Secure JWT refresh session rotation
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  device_info VARCHAR(255),
  ip_address VARCHAR(45),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON user_refresh_tokens(user_id);

-- -----------------------------------------------------------------------------
-- 4. READING PROGRESS TABLE
-- Cross-device sync for book reading percentage, chapter, and last verse
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_name VARCHAR(100) NOT NULL,
  chapter_number INTEGER NOT NULL,
  progress_percentage NUMERIC(5,2) DEFAULT 0.00,
  last_verse INTEGER DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_user_book_chapter UNIQUE(user_id, book_name, chapter_number)
);

CREATE INDEX IF NOT EXISTS idx_reading_progress_user ON reading_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_lookup ON reading_progress(user_id, book_name, chapter_number);

-- -----------------------------------------------------------------------------
-- 5. BOOKMARKS TABLE
-- Saved scriptures with thematic tags (e.g. Faith, Peace, Healing)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reference_text VARCHAR(255) NOT NULL,       -- e.g. "योहान ३:१६" or "John 3:16"
  verse_tag VARCHAR(100) DEFAULT 'General',    -- e.g. "Faith", "Peace", "Grace", "Family"
  verse_text TEXT,                            -- The scripture text content
  book_name VARCHAR(100),
  chapter_number INTEGER,
  verse_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_tag ON bookmarks(user_id, verse_tag);

-- -----------------------------------------------------------------------------
-- 6. AUDIO ASSETS TABLE
-- Cloud Object Storage (AWS S3 or Cloudflare R2) asset resolution for Marathi Bible Audio
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audio_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_name VARCHAR(100) NOT NULL,
  chapter_number INTEGER NOT NULL,
  language VARCHAR(10) DEFAULT 'mr',          -- 'mr' (Marathi BSI), 'en' (NLT)
  audio_url TEXT NOT NULL,                    -- Direct CDN / S3 / R2 URL
  storage_provider VARCHAR(50) DEFAULT 'cloudflare_r2', -- 'cloudflare_r2', 'aws_s3', 'local_proxy'
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_audio_book_chapter_lang UNIQUE(book_name, chapter_number, language)
);

CREATE INDEX IF NOT EXISTS idx_audio_assets_lookup ON audio_assets(book_name, chapter_number, language);

-- -----------------------------------------------------------------------------
-- 7. INITIAL DEMO SEED DATA
-- -----------------------------------------------------------------------------
-- Sample Admin User (password: 'Admin@123', bcrypt hash with salt 10)
INSERT INTO users (id, email, password_hash, full_name, username, role, status)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'admin@riveroflife.org',
  '$2a$10$7R0Zq8hS1GjN5N0v1k0Zgei8F8nKqJ6dK9N1QZ4nZg1K8N1QZ4nZg',
  'River of Life Admin',
  'admin',
  'Super Admin',
  'Active'
) ON CONFLICT (email) DO NOTHING;

-- Seed Audio Assets for initial chapters (Genesis 1, Psalms 23, John 3)
INSERT INTO audio_assets (book_name, chapter_number, language, audio_url, storage_provider, duration_seconds)
VALUES 
  ('genesis', 1, 'mr', 'https://d1hkpuz2o5a2xw.cloudfront.net/source/555476c2390c102d-04/GEN_001.mp3', 'cloudflare_r2', 612),
  ('psalms', 23, 'mr', 'https://d1hkpuz2o5a2xw.cloudfront.net/source/555476c2390c102d-04/PSA_023.mp3', 'cloudflare_r2', 88),
  ('john', 3, 'mr', 'https://d1hkpuz2o5a2xw.cloudfront.net/source/555476c2390c102d-04/JHN_003.mp3', 'cloudflare_r2', 342)
ON CONFLICT (book_name, chapter_number, language) DO NOTHING;
