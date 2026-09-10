const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { otpLimiter, verifyLimiter } = require('../middleware/rateLimiter');

// Public Auth Endpoints
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/google', authController.googleAuth);

// Legacy OTP Endpoints with Rate Limiting
router.post('/request-otp', otpLimiter, authController.requestOtp);
router.post('/verify-otp', verifyLimiter, authController.verifyOtp);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);

// Authenticated User / Profile Endpoints
router.get('/me', authenticateToken, authController.getCurrentUser);
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);
router.delete('/account', authenticateToken, authController.deleteAccount);

module.exports = router;
