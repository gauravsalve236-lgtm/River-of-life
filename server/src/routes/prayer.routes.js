const express = require('express');
const router = express.Router();
const prayerController = require('../controllers/prayerController');
const { authenticateToken, optionalToken } = require('../middleware/auth');

router.get('/', optionalToken, prayerController.getPrayerRequests);
router.post('/', authenticateToken, prayerController.createPrayerRequest);
router.get('/:prayerId', optionalToken, prayerController.getPrayerById);
router.post('/:prayerId/pray', optionalToken, prayerController.incrementPrayerCount);
router.delete('/:prayerId', authenticateToken, prayerController.deletePrayerRequest);

module.exports = router;
