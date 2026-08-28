const rateLimit = require('express-rate-limit');

const isTestOrLocal = (req) => process.env.NODE_ENV === 'test' || req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';

// Rate limiter for OTP requests (Max 5 per 15 mins for external production clients; bypassed for local test runner)
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isTestOrLocal,
  message: { error: 'Too many OTP requests. Please wait 15 minutes before trying again.', code: 'RATE_LIMIT_EXCEEDED' }
});

// Rate limiter for OTP verification attempts (Max 10 per 15 mins)
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isTestOrLocal,
  message: { error: 'Too many verification attempts. Account temporarily rate-limited.', code: 'RATE_LIMIT_EXCEEDED' }
});

// General API rate limiter (200 requests per minute)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isTestOrLocal,
  message: { error: 'API rate limit exceeded. Please slow down requests.', code: 'RATE_LIMIT_EXCEEDED' }
});

module.exports = {
  otpLimiter,
  verifyLimiter,
  apiLimiter
};
