const express = require('express');
const router = express.Router();
const prayerRequestController = require('../controllers/prayerRequestController');
const { authenticateToken, optionalToken } = require('../middleware/auth');

// POST /api/prayer-requests - submit prayer request
router.post('/', optionalToken, prayerRequestController.createPrayerRequest);

// GET /api/prayer-requests/admin/queue - fetch queue for pastor & prayer team
router.get('/admin/queue', optionalToken, prayerRequestController.getAdminPrayerRequestsQueue);

// POST /api/prayer-requests/:id/mark-prayed - quick action: mark as prayed & notify believer
router.post('/:id/mark-prayed', optionalToken, prayerRequestController.markPrayerRequestAsPrayed);

// GET /api/prayer-requests - fetch user history
router.get('/', optionalToken, prayerRequestController.getUserPrayerRequests);

// PATCH /api/prayer-requests/:id/status - update prayer status (pastor/user)
router.patch('/:id/status', optionalToken, prayerRequestController.updatePrayerStatus);

module.exports = router;
