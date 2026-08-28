const db = require('../db/connection');

async function getNotifications(req, res) {
  try {
    const userId = req.user.id;
    const notifications = await db.all(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );
    return res.json({ notifications });
  } catch (err) {
    console.error('Get notifications error:', err);
    return res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
}

async function markNotificationAsRead(req, res) {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;
    await db.run(
      `UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?`,
      [notificationId, userId]
    );
    return res.json({ message: 'Notification marked as read.' });
  } catch (err) {
    console.error('Mark notification read error:', err);
    return res.status(500).json({ error: 'Failed to update notification.' });
  }
}

async function getNotificationPreferences(req, res) {
  try {
    const userId = req.user.id;
    const prefs = await db.get(`SELECT * FROM user_preferences WHERE user_id = ?`, [userId]);
    return res.json({ preferences: prefs || {} });
  } catch (err) {
    console.error('Get notification preferences error:', err);
    return res.status(500).json({ error: 'Failed to retrieve notification preferences.' });
  }
}

async function updateNotificationPreferences(req, res) {
  try {
    const userId = req.user.id;
    const { dailyVerse, prayerReminders, meetingAlerts, language, theme } = req.body;

    await db.run(`
      INSERT INTO user_preferences (user_id, notification_daily_verse, notification_prayer_reminders, notification_meeting_alerts, language, theme)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        notification_daily_verse = COALESCE(EXCLUDED.notification_daily_verse, notification_daily_verse),
        notification_prayer_reminders = COALESCE(EXCLUDED.notification_prayer_reminders, notification_prayer_reminders),
        notification_meeting_alerts = COALESCE(EXCLUDED.notification_meeting_alerts, notification_meeting_alerts),
        language = COALESCE(EXCLUDED.language, language),
        theme = COALESCE(EXCLUDED.theme, theme),
        updated_at = CURRENT_TIMESTAMP
    `, [
      userId, 
      dailyVerse !== undefined ? (dailyVerse ? 1 : 0) : 1,
      prayerReminders !== undefined ? (prayerReminders ? 1 : 0) : 1,
      meetingAlerts !== undefined ? (meetingAlerts ? 1 : 0) : 1,
      language || 'mr',
      theme || 'system'
    ]);

    return res.json({ message: 'Notification preferences updated successfully.' });
  } catch (err) {
    console.error('Update preferences error:', err);
    return res.status(500).json({ error: 'Failed to update notification preferences.' });
  }
}

module.exports = {
  getNotifications,
  markNotificationAsRead,
  getNotificationPreferences,
  updateNotificationPreferences
};
