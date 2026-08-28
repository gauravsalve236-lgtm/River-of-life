const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// Protected Admin Dashboard & Management APIs
router.get('/dashboard-stats', authenticateToken, requireRole('Super Admin', 'Admin', 'Church Admin'), adminController.getDashboardStats);
router.get('/users', authenticateToken, requireRole('Super Admin', 'Admin'), adminController.getUsersList);
router.put('/users/:id/role', authenticateToken, requireRole('Super Admin'), adminController.updateUserRole);
router.get('/audit-logs', authenticateToken, requireRole('Super Admin', 'Admin'), adminController.getAuditLogs);

module.exports = router;
