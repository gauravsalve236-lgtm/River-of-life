const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// Protected Admin Dashboard & Management APIs
router.get('/dashboard-stats', authenticateToken, requireRole('super_admin', 'pastor', 'admin'), adminController.getDashboardStats);
router.get('/users', authenticateToken, requireRole('super_admin', 'pastor', 'admin'), adminController.getUsersList);
router.post('/users', authenticateToken, requireRole('super_admin', 'admin'), adminController.createUser);
router.patch('/users/:id', authenticateToken, requireRole('super_admin', 'admin'), adminController.updateUser);
router.delete('/users/:id', authenticateToken, requireRole('super_admin', 'admin'), adminController.deleteUser);
router.put('/users/:id/role', authenticateToken, requireRole('super_admin', 'admin'), adminController.updateUserRole);
router.patch('/users/:id/role', authenticateToken, requireRole('super_admin', 'admin'), adminController.updateUserRole);
router.get('/audit-logs', authenticateToken, requireRole('super_admin', 'admin'), adminController.getAuditLogs);

module.exports = router;
