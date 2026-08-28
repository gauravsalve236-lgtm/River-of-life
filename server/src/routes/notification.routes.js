const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, notificationController.getNotifications);
router.put('/:notificationId/read', authenticateToken, notificationController.markNotificationAsRead);
router.get('/preferences', authenticateToken, notificationController.getNotificationPreferences);
router.put('/preferences', authenticateToken, notificationController.updateNotificationPreferences);

module.exports = router;
