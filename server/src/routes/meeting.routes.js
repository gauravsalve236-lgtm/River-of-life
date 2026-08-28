const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meetingController');
const { authenticateToken, optionalToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// Public/Optional Token Endpoint for listing meetings
router.get('/scheduled', optionalToken, meetingController.getScheduledMeetings);

// Authenticated Meeting Endpoints
router.post('/token', authenticateToken, meetingController.getMeetingToken);
router.post('/prayers', authenticateToken, meetingController.submitMeetingPrayer);
router.get('/:meetingId/prayers', authenticateToken, meetingController.getMeetingPrayers);

// Role Restricted Endpoints (Prayer Host, Church Admin, Super Admin)
router.post('/create', authenticateToken, requireRole('Prayer Host', 'Church Admin', 'Super Admin'), meetingController.createScheduledMeeting);
router.put('/:meetingId/status', authenticateToken, requireRole('Prayer Host', 'Church Admin', 'Super Admin'), meetingController.updateMeetingStatus);

module.exports = router;
