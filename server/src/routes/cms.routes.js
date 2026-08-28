const express = require('express');
const router = express.Router();
const cmsController = require('../controllers/cmsController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// --- Public Endpoints (User App Dynamic Config) ---
router.get('/homepage', cmsController.getHomepageLayout);
router.get('/navigation', cmsController.getNavigation);
router.get('/theme', cmsController.getThemeConfig);
router.get('/features', cmsController.getFeatureFlags);
router.get('/churches', cmsController.getChurches);
router.get('/hymns', cmsController.getHymns);
router.get('/events', cmsController.getEvents);
router.get('/announcements', cmsController.getAnnouncements);

// --- Protected Admin Endpoints (Require Super Admin, Admin, or Church Admin Role) ---
router.post('/churches', authenticateToken, requireRole('Super Admin', 'Admin', 'Church Admin'), cmsController.createChurch);
router.put('/churches/:id', authenticateToken, requireRole('Super Admin', 'Admin', 'Church Admin'), cmsController.updateChurch);
router.delete('/churches/:id', authenticateToken, requireRole('Super Admin', 'Admin'), cmsController.deleteChurch);

router.post('/hymns', authenticateToken, requireRole('Super Admin', 'Admin'), cmsController.createHymn);
router.put('/hymns/:id', authenticateToken, requireRole('Super Admin', 'Admin'), cmsController.updateHymn);
router.delete('/hymns/:id', authenticateToken, requireRole('Super Admin', 'Admin'), cmsController.deleteHymn);

router.put('/homepage/sections', authenticateToken, requireRole('Super Admin', 'Admin'), cmsController.updateHomepageSections);
router.post('/homepage/components', authenticateToken, requireRole('Super Admin', 'Admin'), cmsController.createHomepageComponent);

router.put('/navigation', authenticateToken, requireRole('Super Admin', 'Admin'), cmsController.updateNavigationItems);
router.put('/theme', authenticateToken, requireRole('Super Admin', 'Admin'), cmsController.updateThemeConfig);
router.put('/features', authenticateToken, requireRole('Super Admin', 'Admin'), cmsController.updateFeatureFlag);

router.post('/events', authenticateToken, requireRole('Super Admin', 'Admin'), cmsController.createEvent);
router.delete('/events/:id', authenticateToken, requireRole('Super Admin', 'Admin'), cmsController.deleteEvent);

router.post('/announcements', authenticateToken, requireRole('Super Admin', 'Admin'), cmsController.createAnnouncement);
router.delete('/announcements/:id', authenticateToken, requireRole('Super Admin', 'Admin'), cmsController.deleteAnnouncement);

module.exports = router;
