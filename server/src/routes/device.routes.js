const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { authenticateToken } = require('../middleware/auth');

router.post('/register', authenticateToken, deviceController.registerDevice);
router.get('/', authenticateToken, deviceController.getUserDevices);
router.delete('/:deviceId', authenticateToken, deviceController.unregisterDevice);

module.exports = router;
