const db = require('../db/connection');

/**
 * Get prayer requests visible to current user based on strict privacy rules
 */
async function getPrayerRequests(req, res) {
  try {
    const userId = req.user ? req.user.id : null;
    const userRole = req.user ? req.user.role : null;

    let prayers = [];
    if (userRole === 'Super Admin' || userRole === 'Church Admin') {
      // Admins can review public, church, group, and assigned pastoral prayers
      prayers = await db.all(`
        SELECT p.*, u.full_name as author_name, u.username as author_username 
        FROM prayer_requests p 
        JOIN users u ON p.user_id = u.id 
        ORDER BY p.created_at DESC
      `);
    } else if (userId) {
      // Regular members & hosts see: Public prayers OR their own Private/Group/Church prayers
      prayers = await db.all(`
        SELECT p.*, u.full_name as author_name, u.username as author_username 
        FROM prayer_requests p 
        JOIN users u ON p.user_id = u.id 
        WHERE p.visibility = 'Public' OR p.user_id = ? 
        ORDER BY p.created_at DESC
      `, [userId]);
    } else {
      // Unauthenticated users see ONLY Public prayers
      prayers = await db.all(`
        SELECT p.*, u.full_name as author_name, u.username as author_username 
        FROM prayer_requests p 
        JOIN users u ON p.user_id = u.id 
        WHERE p.visibility = 'Public' 
        ORDER BY p.created_at DESC
      `);
    }

    return res.json({ prayers });
  } catch (err) {
    console.error('Get prayer requests error:', err);
    return res.status(500).json({ error: 'Failed to retrieve prayer requests.' });
  }
}

/**
 * Create a prayer request with specified privacy setting
 */
async function createPrayerRequest(req, res) {
  try {
    const { title, description, category, visibility, groupId, churchId } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required.' });
    }

    const validVisibility = ['Private', 'Group', 'Church', 'Public'].includes(visibility) ? visibility : 'Private';
    const prayerId = 'prq_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const userId = req.user.id;

    await db.run(`
      INSERT INTO prayer_requests (id, user_id, title, description, category, visibility, group_id, church_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active')
    `, [prayerId, userId, title.trim(), description.trim(), category || 'Personal', validVisibility, groupId || null, churchId || null]);

    return res.status(201).json({
      message: 'Prayer request created successfully.',
      prayer: {
        id: prayerId,
        userId,
        title: title.trim(),
        description: description.trim(),
        category: category || 'Personal',
        visibility: validVisibility,
        status: 'Active',
        createdAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Create prayer error:', err);
    return res.status(500).json({ error: 'Failed to create prayer request.' });
  }
}

/**
 * Get single prayer request with strict privacy authorization check
 */
async function getPrayerById(req, res) {
  try {
    const { prayerId } = req.params;
    const prayer = await db.get(`SELECT p.*, u.full_name as author_name FROM prayer_requests p JOIN users u ON p.user_id = u.id WHERE p.id = ?`, [prayerId]);

    if (!prayer) {
      return res.status(404).json({ error: 'Prayer request not found.' });
    }

    // Privacy Authorization Check
    const userId = req.user ? req.user.id : null;
    const userRole = req.user ? req.user.role : null;
    const isOwner = userId === prayer.user_id;
    const isAdmin = userRole === 'Super Admin' || userRole === 'Church Admin';

    if (prayer.visibility === 'Private' && !isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Access denied: This prayer request is private.' });
    }

    return res.json({ prayer });
  } catch (err) {
    console.error('Get prayer by ID error:', err);
    return res.status(500).json({ error: 'Failed to retrieve prayer request.' });
  }
}

/**
 * Delete prayer request (Owner or Admin restricted)
 */
async function deletePrayerRequest(req, res) {
  try {
    const { prayerId } = req.params;
    const prayer = await db.get(`SELECT * FROM prayer_requests WHERE id = ?`, [prayerId]);

    if (!prayer) {
      return res.status(404).json({ error: 'Prayer request not found.' });
    }

    const isOwner = req.user.id === prayer.user_id;
    const isAdmin = req.user.role === 'Super Admin' || req.user.role === 'Church Admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Access denied: You do not have permission to delete this prayer request.' });
    }

    await db.run(`DELETE FROM prayer_requests WHERE id = ?`, [prayerId]);
    return res.json({ message: 'Prayer request deleted successfully.' });
  } catch (err) {
    console.error('Delete prayer error:', err);
    return res.status(500).json({ error: 'Failed to delete prayer request.' });
  }
}

/**
 * Increment "I Prayed for You" count for a prayer request
 */
async function incrementPrayerCount(req, res) {
  try {
    const { prayerId } = req.params;
    const prayer = await db.get(`SELECT * FROM prayer_requests WHERE id = ?`, [prayerId]);

    if (!prayer) {
      return res.status(404).json({ error: 'Prayer request not found.' });
    }

    const newCount = (prayer.prayer_count || 0) + 1;
    await db.run(`UPDATE prayer_requests SET prayer_count = ? WHERE id = ?`, [newCount, prayerId]);

    return res.json({ message: 'Prayer count updated', prayerId, count: newCount });
  } catch (err) {
    console.error('Increment prayer count error:', err);
    return res.status(500).json({ error: 'Failed to update prayer count.' });
  }
}

module.exports = {
  getPrayerRequests,
  createPrayerRequest,
  getPrayerById,
  deletePrayerRequest,
  incrementPrayerCount
};
