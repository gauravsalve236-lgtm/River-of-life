const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const USE_POSTGRES = process.env.USE_POSTGRES === 'true' || !!process.env.DATABASE_URL;
let pgPool = null;
let sqliteDb = null;

if (USE_POSTGRES) {
  console.log('[DB] Connecting to Production PostgreSQL Database...');
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/river_of_life',
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
} else {
  console.log('[DB] Using SQLite database engine for local development & testing.');
  const dbPath = path.join(__dirname, '../../river_of_life.db');
  sqliteDb = new sqlite3.Database(dbPath);

  // Initialize SQLite tables matching PostgreSQL DDL
  sqliteDb.serialize(() => {
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        profile_photo TEXT,
        role TEXT NOT NULL DEFAULT 'Member',
        status TEXT NOT NULL DEFAULT 'Active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id TEXT PRIMARY KEY,
        language TEXT DEFAULT 'mr',
        theme TEXT DEFAULT 'system',
        bible_translation TEXT DEFAULT 'MARVBSI',
        notification_daily_verse INTEGER DEFAULT 1,
        notification_prayer_reminders INTEGER DEFAULT 1,
        notification_meeting_alerts INTEGER DEFAULT 1,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS user_refresh_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        device_info TEXT,
        ip_address TEXT,
        expires_at DATETIME NOT NULL,
        revoked INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS user_devices (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        push_token TEXT,
        app_version TEXT,
        last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, device_id),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS otp_verifications (
        id TEXT PRIMARY KEY,
        phone TEXT NOT NULL,
        otp_code_hash TEXT NOT NULL,
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 3,
        expires_at DATETIME NOT NULL,
        verified INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Column Migration Safety for existing SQLite databases
    sqliteDb.run(`ALTER TABLE otp_verifications ADD COLUMN attempts INTEGER DEFAULT 0`, () => {});
    sqliteDb.run(`ALTER TABLE otp_verifications ADD COLUMN max_attempts INTEGER DEFAULT 3`, () => {});
    sqliteDb.run(`ALTER TABLE otp_verifications ADD COLUMN verified INTEGER DEFAULT 0`, () => {});

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS prayer_requests (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'Personal',
        visibility TEXT NOT NULL DEFAULT 'Private',
        group_id TEXT,
        church_id TEXT,
        status TEXT NOT NULL DEFAULT 'Active',
        pastor_note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    sqliteDb.run(`ALTER TABLE prayer_requests ADD COLUMN visibility TEXT DEFAULT 'Private'`, () => {});
    sqliteDb.run(`ALTER TABLE prayer_requests ADD COLUMN group_id TEXT`, () => {});
    sqliteDb.run(`ALTER TABLE prayer_requests ADD COLUMN church_id TEXT`, () => {});

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS prayer_meetings (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        topic TEXT NOT NULL,
        host_id TEXT NOT NULL,
        meeting_type TEXT NOT NULL DEFAULT 'Morning Prayer',
        scheduled_start DATETIME NOT NULL,
        scheduled_end DATETIME NOT NULL,
        actual_start DATETIME,
        actual_end DATETIME,
        status TEXT NOT NULL DEFAULT 'Scheduled',
        privacy TEXT NOT NULL DEFAULT 'Public',
        room_id TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(host_id) REFERENCES users(id)
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS meeting_prayers (
        id TEXT PRIMARY KEY,
        meeting_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        prayer_text TEXT NOT NULL,
        category TEXT DEFAULT 'Personal',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(meeting_id) REFERENCES prayer_meetings(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        type TEXT NOT NULL,
        read INTEGER DEFAULT 0,
        data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        action TEXT NOT NULL,
        entity TEXT NOT NULL,
        entity_id TEXT,
        details TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 1. Churches Table
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS churches (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT DEFAULT 'Maharashtra',
        address TEXT,
        phone TEXT,
        email TEXT,
        website TEXT,
        pastor_name TEXT,
        cover_image TEXT,
        logo_image TEXT,
        service_timings TEXT,
        description TEXT,
        status TEXT DEFAULT 'Published',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Hymns Table
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS hymns (
        id TEXT PRIMARY KEY,
        hymn_number INTEGER UNIQUE NOT NULL,
        title_mr TEXT NOT NULL,
        title_en TEXT,
        category TEXT NOT NULL DEFAULT 'Worship',
        lyrics_mr TEXT NOT NULL,
        chords TEXT,
        audio_url TEXT,
        status TEXT DEFAULT 'Published',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Events Table
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        event_type TEXT DEFAULT 'Conference',
        start_date DATETIME NOT NULL,
        end_date DATETIME,
        location TEXT,
        church_id TEXT,
        poster_url TEXT,
        meeting_url TEXT,
        status TEXT DEFAULT 'Published',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Homepage Sections Table
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS homepage_sections (
        id TEXT PRIMARY KEY,
        section_key TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        subtitle TEXT,
        section_type TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        is_visible INTEGER DEFAULT 1,
        background_style TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Homepage Components Table
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS homepage_components (
        id TEXT PRIMARY KEY,
        section_id TEXT NOT NULL,
        component_type TEXT NOT NULL,
        title TEXT NOT NULL,
        subtitle TEXT,
        description TEXT,
        image_url TEXT,
        icon TEXT,
        button_text TEXT,
        click_action TEXT,
        design_config TEXT,
        sort_order INTEGER DEFAULT 0,
        status TEXT DEFAULT 'Published',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(section_id) REFERENCES homepage_sections(id) ON DELETE CASCADE
      )
    `);

    // 6. Navigation Menus & Items Tables
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS navigation_menus (
        id TEXT PRIMARY KEY,
        menu_key TEXT UNIQUE NOT NULL,
        label TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id TEXT PRIMARY KEY,
        menu_id TEXT NOT NULL,
        label_mr TEXT NOT NULL,
        label_en TEXT NOT NULL,
        icon TEXT,
        target_route TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        is_visible INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(menu_id) REFERENCES navigation_menus(id) ON DELETE CASCADE
      )
    `);

    // 7. App Theme Configuration Table
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS app_theme_config (
        id TEXT PRIMARY KEY DEFAULT 'current_theme',
        primary_color TEXT DEFAULT '#1e6b77',
        secondary_color TEXT DEFAULT '#d97706',
        accent_color TEXT DEFAULT '#7c3aed',
        bg_color TEXT DEFAULT '#f8fafc',
        surface_color TEXT DEFAULT '#ffffff',
        text_color TEXT DEFAULT '#0f172a',
        font_family TEXT DEFAULT 'Outfit, sans-serif',
        border_radius TEXT DEFAULT '16px',
        logo_url TEXT DEFAULT 'assets/icons/app-logo.png',
        splash_logo_url TEXT DEFAULT 'assets/icons/icon-512.png',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 8. Feature Controls Flags Table
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS app_feature_flags (
        feature_key TEXT PRIMARY KEY,
        feature_name TEXT NOT NULL,
        is_enabled INTEGER DEFAULT 1,
        min_app_version TEXT DEFAULT '1.0.0',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 9. Quizzes & Questions Tables
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT DEFAULT 'General Bible',
        difficulty TEXT DEFAULT 'Medium',
        points_reward INTEGER DEFAULT 10,
        status TEXT DEFAULT 'Published',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS quiz_questions (
        id TEXT PRIMARY KEY,
        quiz_id TEXT NOT NULL,
        question_text TEXT NOT NULL,
        scripture_reference TEXT,
        explanation TEXT,
        sort_order INTEGER DEFAULT 0,
        FOREIGN KEY(quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS quiz_options (
        id TEXT PRIMARY KEY,
        question_id TEXT NOT NULL,
        option_text TEXT NOT NULL,
        is_correct INTEGER DEFAULT 0,
        FOREIGN KEY(question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE
      )
    `);

    // 10. CMS Pages Table
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS cms_pages (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        content_html TEXT NOT NULL,
        status TEXT DEFAULT 'Published',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 11. Announcements Table
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS announcements (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        banner_image TEXT,
        priority TEXT DEFAULT 'Normal',
        action_url TEXT,
        start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_date DATETIME,
        status TEXT DEFAULT 'Published',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 12. Media Library Table
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS media_library (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        file_url TEXT NOT NULL,
        uploaded_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed default admin user & demo scheduled meeting & platform defaults if not existing
    sqliteDb.get("SELECT COUNT(*) AS count FROM users", (err, row) => {
      if (!err && row && row.count === 0) {
        const now = new Date().toISOString();
        const adminId = 'usr_admin_default_01';
        sqliteDb.run(
          `INSERT INTO users (id, full_name, username, phone, email, role, status, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [adminId, 'River Admin', 'admin', '+919999999999', 'admin@riveroflife.org', 'Super Admin', 'Active', now]
        );
        
        const hostId = 'usr_pastor_default_01';
        sqliteDb.run(
          `INSERT INTO users (id, full_name, username, phone, email, role, status, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [hostId, 'Pastor John', 'pastor_john', '+919888888888', 'pastor@riveroflife.org', 'Prayer Host', 'Active', now]
        );

        // Seed scheduled meeting
        const startToday = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        const endToday = new Date(Date.now() + 90 * 60 * 1000).toISOString();
        sqliteDb.run(
          `INSERT INTO prayer_meetings (id, title, description, topic, host_id, meeting_type, scheduled_start, scheduled_end, status, privacy, room_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ['mtg_evening_prayer_01', 'Evening Fellowship & Healing Prayer', 'Join us for evening intercession and biblical meditation.', 'Healing & Protection', hostId, 'Evening Prayer', startToday, endToday, 'Scheduled', 'Public', 'river-evening-fellowship-2026']
        );
      }
    });

    // Seed default App Theme Config
    sqliteDb.get("SELECT COUNT(*) AS count FROM app_theme_config", (err, row) => {
      if (!err && row && row.count === 0) {
        sqliteDb.run(`
          INSERT INTO app_theme_config (id, primary_color, secondary_color, accent_color, bg_color, surface_color, text_color, font_family, border_radius)
          VALUES ('current_theme', '#1e6b77', '#d97706', '#7c3aed', '#f8fafc', '#ffffff', '#0f172a', 'Outfit, sans-serif', '16px')
        `);
      }
    });

    // Seed default Feature Control Flags
    sqliteDb.get("SELECT COUNT(*) AS count FROM app_feature_flags", (err, row) => {
      if (!err && row && row.count === 0) {
        const defaultFlags = [
          ['bible_reader', 'Holy Bible Scripture Reader', 1],
          ['hymnal', 'Marathi & English Church Hymnal', 1],
          ['prayer_meetings', 'Live Fellowship Video Meetings', 1],
          ['churches', 'Multi-Church Directory & Pastors', 1],
          ['events', 'Church Events & Conferences', 1],
          ['quiz', 'Gamified Bible Quizzes & Rewards', 1],
          ['devotionals', 'Daily Devotionals & Reading Plans', 1],
          ['announcements', 'App Announcements & Alerts', 1]
        ];
        defaultFlags.forEach(([key, name, enabled]) => {
          sqliteDb.run(`INSERT INTO app_feature_flags (feature_key, feature_name, is_enabled) VALUES (?, ?, ?)`, [key, name, enabled]);
        });
      }
    });

    // Seed default Navigation Menus & Items
    sqliteDb.get("SELECT COUNT(*) AS count FROM navigation_menus", (err, row) => {
      if (!err && row && row.count === 0) {
        sqliteDb.run(`INSERT INTO navigation_menus (id, menu_key, label) VALUES ('menu_bottom_01', 'bottom_nav', 'Bottom Mobile Navigation')`);
        
        const bottomNavItems = [
          ['nav_home', 'menu_bottom_01', 'मुख्य', 'Home', '🏠', '#/home', 1, 1],
          ['nav_bible', 'menu_bottom_01', 'बायबल', 'Bible', '📖', '#/reader', 2, 1],
          ['nav_discover', 'menu_bottom_01', 'शोध', 'Discover', '🔍', '#/discover', 3, 1],
          ['nav_hymns', 'menu_bottom_01', 'गीत', 'Hymn', '🎵', '#/hymns', 4, 1],
          ['nav_meetings', 'menu_bottom_01', 'प्रार्थना सभा', 'Prayer Meeting', '📹', '#/meetings', 5, 1],
          ['nav_you', 'menu_bottom_01', 'तुम्ही', 'You', '👤', '#/you', 6, 1]
        ];
        bottomNavItems.forEach(item => {
          sqliteDb.run(`INSERT INTO menu_items (id, menu_id, label_mr, label_en, icon, target_route, sort_order, is_visible) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, item);
        });
      }
    });

    // Seed default Homepage Sections
    sqliteDb.get("SELECT COUNT(*) AS count FROM homepage_sections", (err, row) => {
      if (!err && row && row.count === 0) {
        const sections = [
          ['sec_hero_01', 'welcome_banner', 'Welcome & Verse of the Day', 'Daily Scripture Meditation', 'Hero', 1, 1],
          ['sec_quick_02', 'quick_actions', 'Quick Access / जलद प्रवेश', 'Key Spiritual Features', 'Grid', 2, 1],
          ['sec_meetings_03', 'live_prayer_meetings', 'Live Fellowship Meetings / थेट सभा', 'Connect in Live Prayer', 'Card', 3, 1],
          ['sec_topical_04', 'topical_guides', 'Topical Scripture Guides / जीवन मार्गदर्शक', 'Scriptures for Life Situations', 'Grid', 4, 1],
          ['sec_churches_05', 'churches_directory', 'Multi-Church Directory / चर्च मार्गदर्शिका', 'Registered Fellowships', 'Carousel', 5, 1],
          ['sec_quiz_06', 'bible_quiz', 'Bible Quiz & Trivia / क्विझ व बॅजेस', 'Test Your Knowledge', 'Banner', 6, 1]
        ];
        sections.forEach(sec => {
          sqliteDb.run(`INSERT INTO homepage_sections (id, section_key, title, subtitle, section_type, sort_order, is_visible) VALUES (?, ?, ?, ?, ?, ?, ?)`, sec);
        });
      }
    });
  });
}

// Convert PostgreSQL $1, $2 placeholders to SQLite ? if using SQLite
function adaptSql(sql) {
  if (USE_POSTGRES) return sql;
  return sql.replace(/\$\d+/g, '?');
}

const dbQuery = {
  isPostgres: USE_POSTGRES,

  all: (sql, params = []) => {
    const querySql = adaptSql(sql);
    if (USE_POSTGRES) {
      return pgPool.query(querySql, params).then(res => res.rows);
    } else {
      return new Promise((resolve, reject) => {
        sqliteDb.all(querySql, params, (err, rows) => err ? reject(err) : resolve(rows));
      });
    }
  },

  get: (sql, params = []) => {
    const querySql = adaptSql(sql);
    if (USE_POSTGRES) {
      return pgPool.query(querySql, params).then(res => res.rows[0] || null);
    } else {
      return new Promise((resolve, reject) => {
        sqliteDb.get(querySql, params, (err, row) => err ? reject(err) : resolve(row || null));
      });
    }
  },

  run: (sql, params = []) => {
    const querySql = adaptSql(sql);
    if (USE_POSTGRES) {
      return pgPool.query(querySql, params);
    } else {
      return new Promise((resolve, reject) => {
        sqliteDb.run(querySql, params, function(err) { err ? reject(err) : resolve(this); });
      });
    }
  },

  withTransaction: async (callback) => {
    if (USE_POSTGRES) {
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        const result = await callback({
          query: (sql, params) => client.query(sql, params),
          get: (sql, params) => client.query(sql, params).then(res => res.rows[0] || null),
          all: (sql, params) => client.query(sql, params).then(res => res.rows)
        });
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      return new Promise((resolve, reject) => {
        sqliteDb.serialize(async () => {
          try {
            sqliteDb.run('BEGIN TRANSACTION');
            const result = await callback(dbQuery);
            sqliteDb.run('COMMIT');
            resolve(result);
          } catch (err) {
            sqliteDb.run('ROLLBACK');
            reject(err);
          }
        });
      });
    }
  }
};

module.exports = {
  dbQuery,
  ...dbQuery
};
