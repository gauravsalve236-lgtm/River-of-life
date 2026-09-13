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
 * GET /api/prayer-requests/admin/queue
 * Admin & Pastor Queue displaying congregation requests with privacy tiers
 */
async function getAdminPrayerRequestsQueue(req, res) {
  try {
    const viewerRole = (req.user && req.user.role) ? req.user.role.toString().toLowerCase().replace(/[\s-]+/g, '_') : 'pastor';
    const isSuperAdminOrPastor = viewerRole === 'super_admin' || viewerRole === 'pastor' || viewerRole === 'admin';
    const { status, category, search } = req.query;

    let query = `
      SELECT p.id, p.user_id, p.content, p.description, p.title, p.category, p.category_tag,
             p.visibility, p.privacy_level, p.voice_note_url, p.status, p.pastor_note,
             p.created_at, p.updated_at,
             u.full_name AS requester_name, u.email AS requester_email, u.phone AS requester_phone, u.username AS requester_username
      FROM prayer_requests p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      query += ` AND p.status = ?`;
      params.push(status);
    }

    if (category && category !== 'all') {
      query += ` AND (p.category_tag = ? OR p.category = ?)`;
      params.push(category, category);
    }

    query += ` ORDER BY p.created_at DESC`;

    const rows = await db.all(query, params);

    const queue = (rows || []).map(r => {
      const rawEncrypted = r.content || r.description || '';
      const decryptedText = decryptPrayerContent(rawEncrypted);
      const privacyLevel = r.privacy_level || r.visibility || 'Private (Pastor Only)';
      const isAnonymous = privacyLevel.toLowerCase().includes('anonymous');
      const isPastorOnly = privacyLevel.toLowerCase().includes('pastor');

      // Privacy Enforcement
      let requester = {
        name: isAnonymous ? 'Anonymous Believer (निनावी विश्वासू)' : (r.requester_name || r.requester_username || 'Church Member'),
        email: isAnonymous ? null : (r.requester_email || null),
        phone: isAnonymous ? null : (r.requester_phone || null),
        userId: isAnonymous ? 'anonymous' : r.user_id
      };

      let visibleContent = decryptedText;
      let restricted = false;

      // If viewer is only prayer_team and request is Pastor Only
      if (isPastorOnly && !isSuperAdminOrPastor) {
        restricted = true;
        visibleContent = '🔒 Confidential: Visible only to pastors and elders.';
        requester.name = 'Confidential Member';
        requester.email = null;
        requester.phone = null;
      }

      // Filter by search query if provided
      if (search && search.trim()) {
        const term = search.trim().toLowerCase();
        const matchesContent = decryptedText.toLowerCase().includes(term);
        const matchesName = (requester.name || '').toLowerCase().includes(term);
        const matchesCat = (r.category_tag || '').toLowerCase().includes(term);
        if (!matchesContent && !matchesName && !matchesCat) {
          return null;
        }
      }

      return {
        id: r.id,
        userId: r.user_id,
        requester,
        content: visibleContent,
        categoryTag: r.category_tag || r.category || 'Healing',
        privacyLevel: privacyLevel,
        voiceNoteUrl: r.voice_note_url || null,
        status: r.status || 'Sent to Pastor',
        pastorNote: r.pastor_note || null,
        createdAt: r.created_at,
        restricted
      };
    }).filter(Boolean);

    return res.json({
      success: true,
      count: queue.length,
      queue
    });
  } catch (err) {
    console.error('Get admin prayer queue error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve prayer requests queue: ' + err.message });
  }
}

/**
 * POST /api/prayer-requests/:id/mark-prayed
 * Marks request as "Prayed For", generates notification handshake to believer
 */
async function markPrayerRequestAsPrayed(req, res) {
  try {
    const { id } = req.params;
    const adminUser = req.user ? (req.user.full_name || req.user.username || 'Pastor') : 'Pastor';
    const nowIso = new Date().toISOString();

    // 1. Fetch existing request
    const existing = await db.get(`SELECT * FROM prayer_requests WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Prayer request not found.' });
    }

    // 2. Update status in DB
    await db.run(`
      UPDATE prayer_requests
      SET status = 'Prayed For',
          pastor_note = COALESCE(?, pastor_note),
          updated_at = ?
      WHERE id = ?
    `, [`Prayed for with love by ${adminUser}`, nowIso, id]);

    // 3. User Notification Handshake
    if (existing.user_id && !existing.user_id.startsWith('guest_') && existing.user_id !== 'anonymous_user') {
      try {
        const notifId = 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        const catTag = existing.category_tag || existing.category || 'Prayer';
        const notifTitle = `🙏 Your ${catTag} Prayer Has Been Prayed For!`;
        const notifBody = `Pastor ${adminUser} and the River of Life prayer team have lifted your ${catTag} petition to the Lord. (पास्टर आणि प्रार्थना पथकाने तुमच्या प्रार्थनेसाठी प्रार्थना केली आहे.)`;

        await db.run(`
          INSERT INTO notifications (id, user_id, title, body, type, read, data, created_at)
          VALUES (?, ?, ?, ?, ?, 0, ?, ?)
        `, [
          notifId,
          existing.user_id,
          notifTitle,
          notifBody,
          'prayer_prayed',
          JSON.stringify({
            requestId: id,
            category: catTag,
            newStatus: 'Prayed For',
            prayedBy: adminUser,
            timestamp: nowIso
          }),
          nowIso
        ]);
      } catch (notifErr) {
        console.warn('[Notification Handshake Notice]:', notifErr.message);
      }
    }

    const updated = await db.get(`SELECT * FROM prayer_requests WHERE id = ?`, [id]);
    const decryptedContent = decryptPrayerContent(updated.content || updated.description || '');

    return res.json({
      success: true,
      message: 'Prayer request marked as Prayed For! Believer has been notified.',
      request: {
        id: updated.id,
        userId: updated.user_id,
        content: decryptedContent,
        categoryTag: updated.category_tag,
        privacyLevel: updated.privacy_level,
        status: updated.status,
        pastorNote: updated.pastor_note,
        updatedAt: updated.updated_at
      }
    });
  } catch (err) {
    console.error('Mark as prayed error:', err);
    return res.status(500).json({ success: false, error: 'Failed to mark prayer as prayed: ' + err.message });
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
  getAdminPrayerRequestsQueue,
  markPrayerRequestAsPrayed,
  updatePrayerStatus,
  encryptPrayerContent,
  decryptPrayerContent
};

