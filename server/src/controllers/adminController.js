const db = require('../db/connection');

async function getDashboardStats(req, res) {
  try {
    const totalUsers = await db.get("SELECT COUNT(*) AS count FROM users");
    const totalChurches = await db.get("SELECT COUNT(*) AS count FROM churches");
    const totalHymns = await db.get("SELECT COUNT(*) AS count FROM hymns");
    const totalMeetings = await db.get("SELECT COUNT(*) AS count FROM prayer_meetings");
    const totalAdmins = await db.get("SELECT COUNT(*) AS count FROM users WHERE role IN ('Super Admin', 'Admin', 'Church Admin')");

    res.json({
      success: true,
      stats: {
        totalUsers: totalUsers ? totalUsers.count : 0,
        totalChurches: totalChurches ? totalChurches.count : 0,
        totalHymns: totalHymns ? totalHymns.count : 0,
        totalMeetings: totalMeetings ? totalMeetings.count : 0,
        totalAdmins: totalAdmins ? totalAdmins.count : 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch dashboard metrics: " + err.message });
  }
}

async function getUsersList(req, res) {
  try {
    const { search, role } = req.query;
    let query = "SELECT id, full_name, username, phone, email, role, status, created_at, last_login, last_login_at FROM users WHERE 1=1";
    const params = [];

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      query += " AND (LOWER(email) LIKE ? OR LOWER(username) LIKE ? OR LOWER(full_name) LIKE ?)";
      params.push(term, term, term);
    }

    if (role && role !== 'all') {
      const rLower = role.trim().toLowerCase().replace(/[\s-]+/g, '_');
      if (rLower === 'user' || rLower === 'member') {
        query += " AND (LOWER(role) = 'user' OR LOWER(role) = 'member')";
      } else if (rLower === 'super_admin') {
        query += " AND (LOWER(role) = 'super-admin' OR LOWER(role) = 'super admin' OR LOWER(role) = 'super_admin')";
      } else if (rLower === 'prayer_team') {
        query += " AND (LOWER(role) = 'prayer team' OR LOWER(role) = 'prayer_team')";
      } else {
        query += " AND LOWER(role) = ?";
        params.push(role.trim().toLowerCase());
      }
    }

    query += " ORDER BY created_at DESC";

    const users = await db.all(query, params);
    res.json({ success: true, count: users ? users.length : 0, users: users || [] });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users list: " + err.message });
  }
}

async function updateUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'Role is required.' });
    }

    // Role normalization: map to standard canonical names
    const roleMap = {
      'user': 'User',
      'member': 'User',
      'pastor': 'Pastor',
      'prayer_team': 'Prayer Team',
      'prayer team': 'Prayer Team',
      'super_admin': 'Super-Admin',
      'super-admin': 'Super-Admin',
      'super admin': 'Super-Admin',
      'admin': 'Admin',
      'church admin': 'Admin',
      'church_admin': 'Admin'
    };

    const cleanRoleKey = role.toString().trim().toLowerCase().replace(/[\s-]+/g, '_');
    const canonicalRole = roleMap[cleanRoleKey] || role;

    const allowedCanonical = ['User', 'Pastor', 'Prayer Team', 'Super-Admin', 'Admin', 'Member', 'Prayer Host', 'Church Admin'];
    if (!allowedCanonical.includes(canonicalRole)) {
      return res.status(400).json({ 
        error: `Invalid role. Allowed roles: User, Pastor, Prayer Team, Super-Admin` 
      });
    }

    await db.run("UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [canonicalRole, id]);

    // Record Audit Log
    try {
      const auditId = "aud_" + Date.now();
      const adminUser = req.user ? (req.user.username || req.user.email || 'super_admin') : 'super_admin';
      await db.run(
        "INSERT INTO audit_logs (id, user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)",
        [auditId, req.user ? req.user.id : 'system', 'ROLE_CHANGE', 'user', id, `Role changed to ${canonicalRole} by ${adminUser}`]
      );
    } catch (auditErr) {
      console.warn('[Audit Log Notice]:', auditErr.message);
    }

    const updatedUser = await db.get("SELECT id, full_name, username, email, role, status FROM users WHERE id = ?", [id]);

    res.json({ 
      success: true, 
      message: `User role updated to '${canonicalRole}' successfully!`,
      user: updatedUser 
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to update user role: " + err.message });
  }
}

async function getAuditLogs(req, res) {
  try {
    const logs = await db.all("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100");
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch audit logs: " + err.message });
  }
}

module.exports = {
  getDashboardStats,
  getUsersList,
  updateUserRole,
  getAuditLogs
};
