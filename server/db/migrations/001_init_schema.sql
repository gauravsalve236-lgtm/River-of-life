-- River of Life PostgreSQL Production Schema Initializer
-- Migration Version: 001_init_schema.sql

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    username VARCHAR(60) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE,
    profile_photo TEXT,
    role VARCHAR(30) NOT NULL DEFAULT 'Member' CHECK (role IN ('Member', 'Prayer Host', 'Church Admin', 'Super Admin')),
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Deleted')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id VARCHAR(50) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(10) DEFAULT 'mr',
    theme VARCHAR(20) DEFAULT 'system',
    bible_translation VARCHAR(20) DEFAULT 'MARVBSI',
    notification_daily_verse BOOLEAN DEFAULT true,
    notification_prayer_reminders BOOLEAN DEFAULT true,
    notification_meeting_alerts BOOLEAN DEFAULT true,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. User Refresh Tokens Table (DB-backed Session Management)
CREATE TABLE IF NOT EXISTS user_refresh_tokens (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    device_info VARCHAR(200),
    ip_address VARCHAR(45),
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON user_refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON user_refresh_tokens(token_hash);

-- 4. User Devices Table (Multi-device per user)
CREATE TABLE IF NOT EXISTS user_devices (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(100) NOT NULL,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    push_token TEXT,
    app_version VARCHAR(20),
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_device UNIQUE (user_id, device_id)
);
CREATE INDEX IF NOT EXISTS idx_devices_user ON user_devices(user_id);

-- 5. OTP Verifications Log Table (Hashed, Single-Use & Rate Limited)
CREATE TABLE IF NOT EXISTS otp_verifications (
    id VARCHAR(50) PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    otp_code_hash VARCHAR(255) NOT NULL,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_verifications(phone);

-- 6. Prayer Requests Table (Enforced Privacy Levels)
CREATE TABLE IF NOT EXISTS prayer_requests (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'Personal',
    visibility VARCHAR(20) NOT NULL DEFAULT 'Private' CHECK (visibility IN ('Private', 'Group', 'Church', 'Public')),
    group_id VARCHAR(50),
    church_id VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Acknowledged', 'Answered', 'Archived')),
    pastor_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_prayers_user_visibility ON prayer_requests(user_id, visibility);

-- 7. Scheduled Prayer Meetings Table
CREATE TABLE IF NOT EXISTS prayer_meetings (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    topic VARCHAR(100) NOT NULL,
    host_id VARCHAR(50) NOT NULL REFERENCES users(id),
    meeting_type VARCHAR(50) NOT NULL DEFAULT 'Morning Prayer',
    scheduled_start TIMESTAMP NOT NULL,
    scheduled_end TIMESTAMP NOT NULL,
    actual_start TIMESTAMP,
    actual_end TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Starting Soon', 'Live', 'Ended', 'Cancelled')),
    privacy VARCHAR(20) NOT NULL DEFAULT 'Public' CHECK (privacy IN ('Public', 'Church', 'Group', 'Invite Only')),
    room_id VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_meetings_status_start ON prayer_meetings(status, scheduled_start);

-- 8. Meeting In-App Prayer Submissions Table
CREATE TABLE IF NOT EXISTS meeting_prayers (
    id VARCHAR(50) PRIMARY KEY,
    meeting_id VARCHAR(50) NOT NULL REFERENCES prayer_meetings(id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prayer_text TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'Personal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('daily_verse', 'prayer_reminder', 'meeting_alert', 'church_event', 'announcement')),
    read BOOLEAN DEFAULT false,
    data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);

-- 10. Scheduled Notifications Table
CREATE TABLE IF NOT EXISTS scheduled_notifications (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    channel VARCHAR(20) DEFAULT 'push' CHECK (channel IN ('push', 'in_app', 'email', 'sms', 'whatsapp')),
    scheduled_time TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
