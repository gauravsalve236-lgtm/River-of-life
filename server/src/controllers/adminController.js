const db = require('../db/connection');
const bcrypt = require('bcryptjs');
const { sendInvitationEmail } = require('../services/emailService');

async function getDashboardStats(req, res) {
  try {
    const totalUsers = await db.get("SELECT COUNT(*) AS count FROM users");
    const totalChurches = await db.get("SELECT COUNT(*) AS count FROM churches");
    const totalHymns = await db.get("SELECT COUNT(*) AS count FROM hymns");
    const totalMeetings = await db.get("SELECT COUNT(*) AS count FROM prayer_meetings");
    const totalAdmins = await db.get("SELECT COUNT(*) AS count FROM users WHERE role IN ('Super-Admin', 'Pastor', 'Prayer Team')");

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

/**
 * POST /api/admin/users — Create a new user and send invitation email
 */
async function createUser(req, res) {
  try {
    const { fullName, email, role, phone, sendEmail } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({ error: 'Full name and email are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check for duplicate email
    const existing = await db.get("SELECT id FROM users WHERE LOWER(email) = ?", [cleanEmail]);
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    // Generate a temporary password
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Generate username from email
    const baseUsername = cleanEmail.split('@')[0].replace(/[^a-z0-9_]/g, '').substring(0, 20);
    let username = baseUsername;
    let usernameCheck = await db.get("SELECT id FROM users WHERE username = ?", [username]);
    if (usernameCheck) {
      username = baseUsername + '_' + Math.floor(Math.random() * 1000);
    }

    const canonicalRole = normalizeRole(role || 'User');
    const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const cleanPhone = phone ? phone.trim() : null;

    // Determine invited_by name
    const invitedByName = req.user ? (req.user.full_name || req.user.username || 'Admin') : 'Admin';

    // Create DB columns for email_verified and invited_by (safe migrations)
    try {
      await db.run("ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0");
    } catch (e) { /* column may already exist */ }
    try {
      await db.run("ALTER TABLE users ADD COLUMN invited_by TEXT");
    } catch (e) { /* column may already exist */ }

    await db.run(
      `INSERT INTO users (id, full_name, username, phone, email, password_hash, role, status, email_verified, invited_by, created_at, last_login_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [userId, fullName.trim(), username, cleanPhone, cleanEmail, passwordHash, canonicalRole, 'Active', 0, invitedByName]
    );

    // Audit log
    try {
      const auditId = "aud_" + Date.now();
      await db.run(
        "INSERT INTO audit_logs (id, user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)",
        [auditId, req.user ? req.user.id : 'system', 'USER_CREATED', 'user', userId, `User ${cleanEmail} created as ${canonicalRole} by ${invitedByName}`]
      );
    } catch (auditErr) {
      console.warn('[Audit Log Notice]:', auditErr.message);
    }

    // Send invitation email
    let emailResult = { success: false, devMode: true, message: 'Email not requested' };
    if (sendEmail !== false) {
      emailResult = await sendInvitationEmail(cleanEmail, fullName.trim(), tempPassword, canonicalRole, invitedByName);
    }

    const newUser = await db.get(
      "SELECT id, full_name, username, email, phone, role, status, created_at FROM users WHERE id = ?",
      [userId]
    );

    return res.status(201).json({
      success: true,
      message: `User '${fullName}' created as ${canonicalRole}!`,
      emailSent: emailResult.success,
      emailDevMode: emailResult.devMode || false,
      tempPassword: process.env.NODE_ENV !== 'production' ? tempPassword : undefined,
      user: newUser
    });
  } catch (err) {
    console.error('[createUser] Error:', err);
    res.status(500).json({ error: "Failed to create user: " + err.message });
  }
}

/**
 * DELETE /api/admin/users/:id — Permanently delete a user
 */
async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'User ID is required.' });
    }

    // Prevent self-deletion
    if (req.user && req.user.id === id) {
      return res.status(403).json({ error: 'You cannot delete your own account from the admin panel.' });
    }

    const user = await db.get("SELECT id, full_name, email, role FROM users WHERE id = ?", [id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Extra safety: prevent deleting other Super-Admins unless you are one
    if (user.role === 'Super-Admin' && (!req.user || req.user.role !== 'Super-Admin')) {
      return res.status(403).json({ error: 'Only Super-Admins can delete other Super-Admin accounts.' });
    }

    await db.run("DELETE FROM users WHERE id = ?", [id]);

    // Audit log
    try {
      const auditId = "aud_" + Date.now();
      const adminUser = req.user ? (req.user.username || req.user.email || 'system') : 'system';
      await db.run(
        "INSERT INTO audit_logs (id, user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)",
        [auditId, req.user ? req.user.id : 'system', 'USER_DELETED', 'user', id, `User ${user.email} (${user.role}) deleted by ${adminUser}`]
      );
    } catch (auditErr) {
      console.warn('[Audit Log Notice]:', auditErr.message);
    }

    return res.json({
      success: true,
      message: `User '${user.full_name || user.email}' has been permanently deleted.`
    });
  } catch (err) {
    console.error('[deleteUser] Error:', err);
    res.status(500).json({ error: "Failed to delete user: " + err.message });
  }
}

/**
 * PATCH /api/admin/users/:id — Update user details (name, email, role, status)
 */
async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { fullName, email, role, status, phone } = req.body;

    const user = await db.get("SELECT id, full_name, email, role FROM users WHERE id = ?", [id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const newRole = role ? normalizeRole(role) : user.role;
    const newStatus = status || user.status || 'Active';
    const newFullName = fullName ? fullName.trim() : user.full_name;
    const newEmail = email ? email.trim().toLowerCase() : user.email;
    const newPhone = phone !== undefined ? phone : user.phone;

    // Check email uniqueness
    if (newEmail !== user.email) {
      const emailCheck = await db.get("SELECT id FROM users WHERE LOWER(email) = ? AND id != ?", [newEmail, id]);
      if (emailCheck) {
        return res.status(409).json({ error: 'This email is already used by another account.' });
      }
    }

    await db.run(
      "UPDATE users SET full_name = ?, email = ?, role = ?, status = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [newFullName, newEmail, newRole, newStatus, newPhone, id]
    );

    // Audit log
    try {
      const auditId = "aud_" + Date.now();
      const adminUser = req.user ? (req.user.username || req.user.email || 'system') : 'system';
      await db.run(
        "INSERT INTO audit_logs (id, user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)",
        [auditId, req.user ? req.user.id : 'system', 'USER_UPDATED', 'user', id, `User ${newEmail} updated (role: ${newRole}, status: ${newStatus}) by ${adminUser}`]
      );
    } catch (auditErr) {
      console.warn('[Audit Log Notice]:', auditErr.message);
    }

    const updatedUser = await db.get("SELECT id, full_name, username, email, phone, role, status FROM users WHERE id = ?", [id]);

    return res.json({
      success: true,
      message: `User updated successfully!`,
      user: updatedUser
    });
  } catch (err) {
    console.error('[updateUser] Error:', err);
    res.status(500).json({ error: "Failed to update user: " + err.message });
  }
}

async function updateUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'Role is required.' });
    }

    const canonicalRole = normalizeRole(role);
    const allowedCanonical = ['User', 'Member', 'Pastor', 'Prayer Team', 'Super-Admin', 'Admin'];
    if (!allowedCanonical.includes(canonicalRole)) {
      return res.status(400).json({
        error: `Invalid role. Allowed: User, Pastor, Prayer Team, Super-Admin`
      });
    }

    await db.run("UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [canonicalRole, id]);

    // Audit log
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
  let pwd = '';
  for (let i = 0; i < 10; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  return pwd;
}

function normalizeRole(role) {
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
  const key = (role || '').toString().trim().toLowerCase().replace(/[\s-]+/g, '_');
  // Also try original with space
  const keySpace = (role || '').toString().trim().toLowerCase();
  return roleMap[key] || roleMap[keySpace] || role;
}

module.exports = {
  getDashboardStats,
  getUsersList,
  createUser,
  deleteUser,
  updateUser,
  updateUserRole,
  getAuditLogs
};