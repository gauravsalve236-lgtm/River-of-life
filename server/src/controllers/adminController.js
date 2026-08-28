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
    const users = await db.all("SELECT id, full_name, username, phone, email, role, status, created_at, last_login FROM users ORDER BY created_at DESC");
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users list: " + err.message });
  }
}

async function updateUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const allowedRoles = ['Member', 'Prayer Host', 'Church Admin', 'Admin', 'Super Admin'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Allowed roles: ${allowedRoles.join(', ')}` });
    }

    await db.run("UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [role, id]);

    // Record Audit Log
    const auditId = "aud_" + Date.now();
    const adminUser = req.user ? req.user.username : 'system_admin';
    await db.run(
      "INSERT INTO audit_logs (id, user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)",
      [auditId, req.user ? req.user.id : 'system', 'ROLE_CHANGE', 'user', id, `Role changed to ${role} by ${adminUser}`]
    );

    res.json({ success: true, message: `User role updated to '${role}' successfully!` });
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
