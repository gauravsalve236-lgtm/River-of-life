const crypto = require('crypto');
const db = require('../db/connection');

// Derive 32-byte encryption key from environment secret
const ENCRYPTION_SECRET = process.env.PRAYER_ENCRYPTION_SECRET || 'rol_pastoral_prayer_vault_secret_2026';
const ENCRYPTION_SALT = 'rol_prayer_vault_salt_secure_99';
const ENCRYPTION_KEY = crypto.scryptSync(ENCRYPTION_SECRET, ENCRYPTION_SALT, 32);

/**
 * Encrypts prayer content with AES-256-CBC
 */
function encryptPrayerContent(plainText) {
  if (!plainText) return '';
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (err) {
    console.error('[Prayer Encryption Error]:', err);
    return plainText;
  }
}

/**
 * Decrypts prayer content with AES-256-CBC
 */
function decryptPrayerContent(cipherText) {
  if (!cipherText) return '';
  try {
    if (!cipherText.includes(':')) {
      return cipherText; // Legacy unencrypted plaintext fallback
    }
    const [ivHex, encryptedHex] = cipherText.split(':');
    if (!ivHex || !encryptedHex) return cipherText;
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('[Prayer Decryption Error]:', err);
    return cipherText;
  }
}

/**
 * POST /api/prayer-requests
 * Submits prayer request, encrypts content, alerts pastor dashboard
 */
async function createPrayerRequest(req, res) {
  try {
    const {
      content,
      privacy_level = 'Private (Pastor Only)',
      category_tag = 'Healing',
      voice_note_url = null,
      title = null
    } = req.body;

    const prayerText = (content || '').trim();
    if (!prayerText) {
      return res.status(400).json({ success: false, error: 'Prayer request content is required.' });
    }

    // Determine user ID from auth token or request body / device
    const userId = (req.user && req.user.id) || req.body.user_id || req.body.deviceId || 'anonymous_user';
    const requestId = 'prq_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const encryptedContent = encryptPrayerContent(prayerText);
    const createdAt = new Date().toISOString();
    const initialStatus = 'Sent to Pastor';

    // Insert into prayer_requests table
    await db.run(`
      INSERT INTO prayer_requests (
        id, user_id, title, description, content, category, category_tag,
        visibility, privacy_level, voice_note_url, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      requestId,
      userId,
      title || `${category_tag} Prayer Request`,
      encryptedContent,
      encryptedContent,
      category_tag,
      category_tag,
      privacy_level,
      privacy_level,
      voice_note_url || null,
      initialStatus,
      createdAt,
      createdAt
    ]);

    // Create a real-time notification in the notifications table for the pastor dashboard
    try {
      const notifId = 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      const notifTitle = `New Prayer: ${category_tag} (${privacy_level})`;
      const notifBody = privacy_level === 'Anonymous'
        ? `An anonymous believer requested prayer for ${category_tag}.`
        : `A member requested confidential pastoral prayer for ${category_tag}.`;

      await db.run(`
        INSERT INTO notifications (id, user_id, title, body, type, read, data, created_at)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?)
      `, [
        notifId,
        'pastor',
        notifTitle,
        notifBody,
        'prayer_request',
        JSON.stringify({ requestId, category: category_tag, privacy: privacy_level }),
        createdAt
      ]);
    } catch (notifErr) {
      console.warn('[Pastor Alert Notice]:', notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Prayer request submitted and routed to pastor successfully.',
      request: {
        id: requestId,
        user_id: userId,
        content: prayerText,
        privacy_level,
        category_tag,
        voice_note_url: voice_note_url || null,
        status: initialStatus,
        created_at: createdAt
      }
    });
  } catch (err) {
    console.error('Create prayer request error:', err);
    return res.status(500).json({ success: false, error: 'Failed to submit prayer request: ' + err.message });
  }
}

/**
 * GET /api/prayer-requests
 * Fetches authenticated user's historical requests with decrypted content and status
 */
async function getUserPrayerRequests(req, res) {
  try {
    const userId = (req.user && req.user.id) || req.query.user_id || req.query.deviceId || null;
    const userRole = req.user ? req.user.role : null;

    let rows = [];
    if (userRole === 'Super Admin' || userRole === 'Church Admin' || userRole === 'Pastor') {
      rows = await db.all(`
        SELECT id, user_id, content, description, privacy_level, visibility, category_tag, category,
               voice_note_url, status, pastor_note, created_at
        FROM prayer_requests
        ORDER BY created_at DESC
      `);
    } else if (userId) {
      rows = await db.all(`
        SELECT id, user_id, content, description, privacy_level, visibility, category_tag, category,
               voice_note_url, status, pastor_note, created_at
        FROM prayer_requests
        WHERE user_id = ?
        ORDER BY created_at DESC
      `, [userId]);
    } else {
      rows = await db.all(`
        SELECT id, user_id, content, description, privacy_level, visibility, category_tag, category,
               voice_note_url, status, pastor_note, created_at
        FROM prayer_requests
        WHERE visibility = 'Public' OR privacy_level = 'Church Prayer Team'
        ORDER BY created_at DESC
        LIMIT 50
      `);
    }

    const requests = (rows || []).map(r => {
      const rawEncrypted = r.content || r.description || '';
      return {
        id: r.id,
        user_id: r.user_id,
        content: decryptPrayerContent(rawEncrypted),
        privacy_level: r.privacy_level || r.visibility || 'Private (Pastor Only)',
        category_tag: r.category_tag || r.category || 'Healing',
        voice_note_url: r.voice_note_url || null,
        status: r.status || 'Sent to Pastor',
        pastor_note: r.pastor_note || null,
        created_at: r.created_at
      };
    });

    return res.json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (err) {
    console.error('Get user prayer requests error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve prayer requests.' });
  }
}

/**
 * PATCH /api/prayer-requests/:id/status
 */
async function updatePrayerStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, pastor_note } = req.body;

    const validStatuses = ['Sent to Pastor', 'Prayed For', 'Answered'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status value.' });
    }

    await db.run(`
      UPDATE prayer_requests
      SET status = COALESCE(?, status),
          pastor_note = COALESCE(?, pastor_note),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, pastor_note, id]);

    return res.json({ success: true, message: 'Status updated successfully.' });
  } catch (err) {
    console.error('Update prayer status error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update prayer status.' });
  }
}

module.exports = {
  createPrayerRequest,
  getUserPrayerRequests,
  updatePrayerStatus,
  encryptPrayerContent,
  decryptPrayerContent
};
