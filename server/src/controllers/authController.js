const crypto = require('crypto');
const db = require('../db/connection');
const { generateAccessToken, createRefreshToken, verifyRefreshToken, revokeRefreshToken, revokeAllUserRefreshTokens } = require('../middleware/auth');
const { getSmsProvider } = require('../services/smsProvider');

/**
 * Normalizes phone numbers to standard format (e.g. +919876543210)
 */
function normalizePhone(phone) {
  if (!phone) return '';
  let cleaned = phone.trim().replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) {
    if (cleaned.length === 10) cleaned = '+91' + cleaned;
    else if (!cleaned.startsWith('+')) cleaned = '+' + cleaned;
  }
  return cleaned;
}

/**
 * Request OTP via clean SmsProvider (Twilio / MSG91 / Dev)
 */
async function requestOtp(req, res) {
  try {
    const { phone } = req.body;
    if (!phone || phone.trim().length < 8) {
      return res.status(400).json({ error: 'Valid phone number is required.' });
    }

    const cleanPhone = normalizePhone(phone);
    
    // Generate secure 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash('sha256').update(otpCode).digest('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min expiry
    const otpId = 'otp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

    // Save hashed OTP to database
    await db.run(
      `INSERT INTO otp_verifications (id, phone, otp_code_hash, attempts, max_attempts, expires_at) 
       VALUES (?, ?, ?, 0, 3, ?)`,
      [otpId, cleanPhone, otpHash, expiresAt]
    );

    // Dispatch SMS via provider factory
    const smsProvider = getSmsProvider();
    const smsResult = await smsProvider.sendOtp(cleanPhone, otpCode);

    // Check if user already registered
    const existingUser = await db.get(`SELECT id, full_name, username, role FROM users WHERE phone = ?`, [cleanPhone]);

    return res.json({
      message: 'OTP verification code dispatched via SMS.',
      phone: cleanPhone,
      isRegistered: !!existingUser,
      devOtp: process.env.NODE_ENV !== 'production' || process.env.SMS_PROVIDER === 'dev' ? otpCode : undefined
    });
  } catch (err) {
    console.error('Request OTP error:', err);
    return res.status(500).json({ error: 'Failed to request OTP.' });
  }
}

/**
 * Verify OTP, enforce attempt limits, single-use invalidation, and issue tokens
 */
async function verifyOtp(req, res) {
  try {
    const { phone, otp, fullName, username, email } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP are required.' });
    }

    const cleanPhone = normalizePhone(phone);
    const otpHash = crypto.createHash('sha256').update(otp.trim()).digest('hex');
    const nowIso = new Date().toISOString();

    // Fetch latest unexpired and unverified OTP for this phone
    const record = await db.get(
      `SELECT * FROM otp_verifications 
       WHERE phone = ? AND verified = 0 AND expires_at > ? 
       ORDER BY created_at DESC LIMIT 1`,
      [cleanPhone, nowIso]
    );

    if (!record) {
      return res.status(400).json({ error: 'Invalid or expired OTP code.' });
    }

    // Check attempt limits (Brute-force protection)
    const currentAttempts = (record.attempts || 0) + 1;
    if (currentAttempts > (record.max_attempts || 3)) {
      await db.run(`UPDATE otp_verifications SET verified = 1 WHERE id = ?`, [record.id]); // Invalidate code
      return res.status(429).json({ 
        error: 'Maximum OTP verification attempts exceeded. Please request a new OTP code.' 
      });
    }

    // Update attempt counter
    await db.run(`UPDATE otp_verifications SET attempts = ? WHERE id = ?`, [currentAttempts, record.id]);

    if (record.otp_code_hash !== otpHash) {
      return res.status(400).json({ 
        error: `Invalid OTP code. ${record.max_attempts - currentAttempts} attempts remaining.` 
      });
    }

    // Single-use enforcement: Mark OTP verified immediately so it cannot be reused
    await db.run(`UPDATE otp_verifications SET verified = 1 WHERE id = ?`, [record.id]);

    // Retrieve or register user
    let user = await db.get(`SELECT * FROM users WHERE phone = ?`, [cleanPhone]);

    if (!user) {
      if (!fullName || !username) {
        return res.status(400).json({ 
          error: 'Registration details required for new accounts (fullName and username).' 
        });
      }

      const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      const existingName = await db.get(`SELECT id FROM users WHERE username = ?`, [cleanUsername]);
      if (existingName) {
        return res.status(400).json({ error: 'Username is already taken. Please choose another.' });
      }

      const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      const role = 'Member';
      const status = 'Active';

      await db.run(
        `INSERT INTO users (id, full_name, username, phone, email, role, status, created_at, last_login)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, fullName.trim(), cleanUsername, cleanPhone, email ? email.trim() : null, role, status, nowIso, nowIso]
      );

      await db.run(`INSERT INTO user_preferences (user_id) VALUES (?)`, [userId]);
      user = await db.get(`SELECT * FROM users WHERE id = ?`, [userId]);
    } else {
      // Existing user: Update full_name, username, and last_login if new values provided
      const newFullName = (fullName && fullName.trim()) ? fullName.trim() : user.full_name;
      let newUsername = user.username;
      
      if (username && username.trim()) {
        const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (cleanUsername && cleanUsername !== user.username) {
          const existingName = await db.get(`SELECT id FROM users WHERE username = ? AND id != ?`, [cleanUsername, user.id]);
          if (!existingName) {
            newUsername = cleanUsername;
          }
        }
      }

      await db.run(
        `UPDATE users SET full_name = ?, username = ?, last_login = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [newFullName, newUsername, nowIso, user.id]
      );
      user = await db.get(`SELECT * FROM users WHERE id = ?`, [user.id]);
    }

    const payload = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      phone: user.phone,
      role: user.role
    };

    // Issue short-lived access token & DB-backed refresh token
    const accessToken = generateAccessToken(payload);
    const refreshToken = await createRefreshToken(user.id, req.headers['user-agent'] || 'App', req.ip || '127.0.0.1');

    return res.json({
      message: 'Authentication successful.',
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      user: {
        id: user.id,
        fullName: user.full_name,
        username: user.username,
        phone: user.phone,
        email: user.email,
        profilePhoto: user.profile_photo,
        role: user.role,
        status: user.status
      }
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({ error: 'Failed to verify OTP.' });
  }
}

/**
 * Refresh Access Token using valid Refresh Token
 */
async function refreshToken(req, res) {
  try {
    const { refreshToken: rawToken } = req.body;
    if (!rawToken) {
      return res.status(400).json({ error: 'Refresh token is required.' });
    }

    const record = await verifyRefreshToken(rawToken);
    if (!record) {
      return res.status(401).json({ error: 'Invalid, revoked, or expired refresh token.' });
    }

    const payload = {
      id: record.user_id,
      username: record.username,
      full_name: record.full_name,
      phone: record.phone,
      role: record.role
    };

    const newAccessToken = generateAccessToken(payload);
    return res.json({
      accessToken: newAccessToken,
      expiresIn: 900
    });
  } catch (err) {
    console.error('Refresh token error:', err);
    return res.status(500).json({ error: 'Failed to refresh token.' });
  }
}

/**
 * Logout and revoke refresh token
 */
async function logout(req, res) {
  try {
    const { refreshToken: rawToken } = req.body;
    if (rawToken) {
      await revokeRefreshToken(rawToken);
    }
    if (req.user && req.user.id) {
      await revokeAllUserRefreshTokens(req.user.id);
    }
    return res.json({ message: 'Logged out successfully. Refresh tokens revoked.' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ error: 'Failed to logout.' });
  }
}

async function getProfile(req, res) {
  try {
    const user = await db.get(`SELECT id, full_name, username, phone, email, profile_photo, role, status, created_at FROM users WHERE id = ?`, [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }
    const preferences = await db.get(`SELECT * FROM user_preferences WHERE user_id = ?`, [req.user.id]);

    return res.json({
      user: {
        id: user.id,
        fullName: user.full_name,
        username: user.username,
        phone: user.phone,
        email: user.email,
        profilePhoto: user.profile_photo,
        role: user.role,
        status: user.status,
        createdAt: user.created_at
      },
      preferences: preferences || {}
    });
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
}

async function updateProfile(req, res) {
  try {
    const { fullName, username, email, profilePhoto } = req.body;
    const userId = req.user.id;

    let cleanUsername = null;
    if (username && username.trim()) {
      cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      const existing = await db.get(`SELECT id FROM users WHERE username = ? AND id != ?`, [cleanUsername, userId]);
      if (existing) {
        return res.status(400).json({ error: 'Username is already taken by another user.' });
      }
    }

    await db.run(
      `UPDATE users SET 
        full_name = COALESCE(?, full_name), 
        username = COALESCE(?, username),
        email = COALESCE(?, email), 
        profile_photo = COALESCE(?, profile_photo),
        updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [fullName ? fullName.trim() : null, cleanUsername, email || null, profilePhoto || null, userId]
    );

    const updatedUser = await db.get(`SELECT id, full_name, username, phone, email, profile_photo, role FROM users WHERE id = ?`, [userId]);

    return res.json({
      message: 'Profile updated successfully.',
      user: {
        id: updatedUser.id,
        fullName: updatedUser.full_name,
        username: updatedUser.username,
        phone: updatedUser.phone,
        email: updatedUser.email,
        profilePhoto: updatedUser.profile_photo,
        role: updatedUser.role
      }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
}

async function deleteAccount(req, res) {
  try {
    const userId = req.user.id;
    await db.run(`DELETE FROM users WHERE id = ?`, [userId]);
    return res.json({ message: 'Account deleted successfully.' });
  } catch (err) {
    console.error('Delete account error:', err);
    return res.status(500).json({ error: 'Failed to delete account.' });
  }
}

module.exports = {
  requestOtp,
  verifyOtp,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  deleteAccount,
  normalizePhone
};
