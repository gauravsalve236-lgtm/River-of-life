const db = require('../db/connection');

async function registerDevice(req, res) {
  try {
    const userId = req.user.id;
    const { deviceId, platform, pushToken, appVersion } = req.body;

    if (!deviceId || !platform) {
      return res.status(400).json({ error: 'Device ID and platform (ios/android/web) are required.' });
    }

    const cleanPlatform = ['ios', 'android', 'web'].includes(platform.toLowerCase()) ? platform.toLowerCase() : 'web';
    const id = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

    await db.run(`
      INSERT INTO user_devices (id, user_id, device_id, platform, push_token, app_version, last_active)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, device_id) DO UPDATE SET
        push_token = COALESCE(EXCLUDED.push_token, push_token),
        app_version = COALESCE(EXCLUDED.app_version, app_version),
        platform = EXCLUDED.platform,
        last_active = CURRENT_TIMESTAMP
    `, [id, userId, deviceId.trim(), cleanPlatform, pushToken || null, appVersion || '1.0.0']);

    return res.status(201).json({
      message: 'Device registered successfully.',
      device: {
        userId,
        deviceId: deviceId.trim(),
        platform: cleanPlatform,
        pushToken: pushToken || null,
        appVersion: appVersion || '1.0.0'
      }
    });
  } catch (err) {
    console.error('Register device error:', err);
    return res.status(500).json({ error: 'Failed to register device.' });
  }
}

async function getUserDevices(req, res) {
  try {
    const userId = req.user.id;
    const devices = await db.all(`SELECT id, device_id, platform, push_token, app_version, last_active FROM user_devices WHERE user_id = ?`, [userId]);
    return res.json({ devices });
  } catch (err) {
    console.error('Get user devices error:', err);
    return res.status(500).json({ error: 'Failed to retrieve user devices.' });
  }
}

async function unregisterDevice(req, res) {
  try {
    const userId = req.user.id;
    const { deviceId } = req.params;
    await db.run(`DELETE FROM user_devices WHERE user_id = ? AND device_id = ?`, [userId, deviceId]);
    return res.json({ message: 'Device unregistered successfully.' });
  } catch (err) {
    console.error('Unregister device error:', err);
    return res.status(500).json({ error: 'Failed to unregister device.' });
  }
}

module.exports = {
  registerDevice,
  getUserDevices,
  unregisterDevice
};
