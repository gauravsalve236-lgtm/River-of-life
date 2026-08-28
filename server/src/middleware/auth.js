const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db/connection');

const JWT_SECRET = process.env.JWT_SECRET || 'river_of_life_jwt_production_secret_key_2026';
const ACCESS_TOKEN_EXPIRY = '15m'; // Short-lived access token
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.query.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Token missing.', code: 'TOKEN_MISSING' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ error: 'Access token expired or invalid.', code: 'TOKEN_EXPIRED' });
    }
    req.user = user;
    next();
  });
}

function optionalToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.query.token;

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err) req.user = user;
      next();
    });
  } else {
    next();
  }
}

function generateAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

async function createRefreshToken(userId, deviceInfo = 'Web/App Device', ipAddress = '127.0.0.1') {
  const rawRefreshToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const id = 'ref_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');

  await db.run(
    `INSERT INTO user_refresh_tokens (id, user_id, token_hash, device_info, ip_address, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, userId, tokenHash, deviceInfo, ipAddress, expiresAt]
  );

  return rawRefreshToken;
}

async function verifyRefreshToken(rawRefreshToken) {
  if (!rawRefreshToken) return null;
  const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
  const nowIso = new Date().toISOString();

  const record = await db.get(
    `SELECT r.*, u.username, u.full_name, u.phone, u.email, u.role, u.status 
     FROM user_refresh_tokens r 
     JOIN users u ON r.user_id = u.id 
     WHERE r.token_hash = ? AND r.revoked = 0 AND r.expires_at > ? AND u.status = 'Active'`,
    [tokenHash, nowIso]
  );

  return record || null;
}

async function revokeRefreshToken(rawRefreshToken) {
  if (!rawRefreshToken) return;
  const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
  await db.run(`UPDATE user_refresh_tokens SET revoked = 1 WHERE token_hash = ?`, [tokenHash]);
}

async function revokeAllUserRefreshTokens(userId) {
  await db.run(`UPDATE user_refresh_tokens SET revoked = 1 WHERE user_id = ?`, [userId]);
}

module.exports = {
  authenticateToken,
  optionalToken,
  generateAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  JWT_SECRET
};
