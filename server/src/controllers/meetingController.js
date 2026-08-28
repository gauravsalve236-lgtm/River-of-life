const db = require('../db/connection');
const { AccessToken } = require('livekit-server-sdk');

const apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
const apiSecret = process.env.LIVEKIT_API_SECRET || 'secretxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

/**
 * Get active/upcoming scheduled meetings
 */
async function getScheduledMeetings(req, res) {
  try {
    const meetings = await db.all(`
      SELECT m.*, u.full_name as host_name, u.role as host_role 
      FROM prayer_meetings m 
      LEFT JOIN users u ON m.host_id = u.id 
      ORDER BY m.scheduled_start ASC
    `);

    // Dynamically update status based on scheduled start/end times
    const now = new Date();
    const updatedMeetings = meetings.map(m => {
      const startTime = new Date(m.scheduled_start);
      const endTime = new Date(m.scheduled_end);
      let calculatedStatus = m.status;

      if (m.status !== 'Ended' && m.status !== 'Cancelled') {
        const minutesDiff = (startTime - now) / (1000 * 60);
        if (now >= startTime && now <= endTime) {
          calculatedStatus = 'Live';
        } else if (minutesDiff > 0 && minutesDiff <= 30) {
          calculatedStatus = 'Starting Soon';
        } else if (now > endTime) {
          calculatedStatus = 'Ended';
        }
      }

      return {
        id: m.id,
        title: m.title,
        description: m.description,
        topic: m.topic,
        hostId: m.host_id,
        hostName: m.host_name || 'Church Leader',
        hostRole: m.host_role || 'Prayer Host',
        meetingType: m.meeting_type,
        scheduledStart: m.scheduled_start,
        scheduledEnd: m.scheduled_end,
        actualStart: m.actual_start,
        actualEnd: m.actual_end,
        status: calculatedStatus,
        privacy: m.privacy,
        roomId: m.room_id,
        createdAt: m.created_at
      };
    });

    return res.json({ meetings: updatedMeetings });
  } catch (err) {
    console.error('Get meetings error:', err);
    return res.status(500).json({ error: 'Failed to retrieve scheduled meetings.' });
  }
}

/**
 * Create a new scheduled meeting (Host/Admin restricted)
 */
async function createScheduledMeeting(req, res) {
  try {
    const { title, description, topic, meetingType, scheduledStart, scheduledEnd, privacy } = req.body;

    if (!title || !topic || !scheduledStart || !scheduledEnd) {
      return res.status(400).json({ error: 'Title, topic, scheduledStart, and scheduledEnd are required.' });
    }

    const hostId = req.user.id;
    const meetingId = 'mtg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const roomId = 'river-' + title.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString(36);

    await db.run(`
      INSERT INTO prayer_meetings 
      (id, title, description, topic, host_id, meeting_type, scheduled_start, scheduled_end, status, privacy, room_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      meetingId, 
      title.trim(), 
      description ? description.trim() : '', 
      topic.trim(), 
      hostId, 
      meetingType || 'Morning Prayer', 
      scheduledStart, 
      scheduledEnd, 
      'Scheduled', 
      privacy || 'Public', 
      roomId
    ]);

    return res.status(201).json({
      message: 'Scheduled meeting created successfully.',
      meeting: {
        id: meetingId,
        title,
        topic,
        scheduledStart,
        scheduledEnd,
        status: 'Scheduled',
        roomId
      }
    });
  } catch (err) {
    console.error('Create meeting error:', err);
    return res.status(500).json({ error: 'Failed to create scheduled meeting.' });
  }
}

/**
 * Host/Admin updates meeting lifecycle status (Scheduled -> Live -> Ended)
 */
async function updateMeetingStatus(req, res) {
  try {
    const { meetingId } = req.params;
    const { status } = req.body;

    if (!['Scheduled', 'Starting Soon', 'Live', 'Ended', 'Cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid meeting status transition.' });
    }

    const meeting = await db.get(`SELECT * FROM prayer_meetings WHERE id = ?`, [meetingId]);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found.' });
    }

    const nowIso = new Date().toISOString();
    let actualStart = meeting.actual_start;
    let actualEnd = meeting.actual_end;

    if (status === 'Live' && !actualStart) actualStart = nowIso;
    if (status === 'Ended' && !actualEnd) actualEnd = nowIso;

    await db.run(
      `UPDATE prayer_meetings SET status = ?, actual_start = ?, actual_end = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, actualStart, actualEnd, meetingId]
    );

    return res.json({ message: `Meeting status updated to '${status}'.`, status });
  } catch (err) {
    console.error('Update meeting status error:', err);
    return res.status(500).json({ error: 'Failed to update meeting status.' });
  }
}

/**
 * Generate authenticated WebRTC LiveKit JWT Token after authorization check
 */
async function getMeetingToken(req, res) {
  try {
    const { roomId } = req.body;
    if (!roomId) {
      return res.status(400).json({ error: 'Room ID is required.' });
    }

    // Verify room exists and check privacy
    const meeting = await db.get(`SELECT * FROM prayer_meetings WHERE room_id = ?`, [roomId]);
    if (meeting && meeting.privacy === 'Invite Only') {
      // For invite only meetings, verify user authorization
      const isHost = meeting.host_id === req.user.id;
      const isAdmin = req.user.role === 'Super Admin' || req.user.role === 'Church Admin';
      if (!isHost && !isAdmin) {
        return res.status(403).json({ error: 'Access denied: This meeting is invite-only.' });
      }
    }

    const participantName = req.user.full_name || req.user.username;
    const isHost = meeting ? (meeting.host_id === req.user.id) : (req.user.role === 'Prayer Host' || req.user.role === 'Super Admin');

    const at = new AccessToken(apiKey, apiSecret, {
      identity: `${req.user.id}:${participantName}`,
      name: participantName,
      ttl: '12h'
    });

    at.addGrant({
      roomJoin: true,
      room: roomId,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: !!isHost
    });

    const token = await at.toJwt();
    return res.json({
      token,
      url: process.env.LIVEKIT_URL || 'wss://river-of-life.livekit.cloud',
      roomId,
      participantName,
      isHost
    });
  } catch (err) {
    console.error('Get meeting token error:', err);
    return res.status(500).json({ error: 'Failed to generate WebRTC meeting token.' });
  }
}

/**
 * Submit in-meeting prayer request
 */
async function submitMeetingPrayer(req, res) {
  try {
    const { meetingId, prayerText, category } = req.body;
    if (!meetingId || !prayerText) {
      return res.status(400).json({ error: 'Meeting ID and prayer text are required.' });
    }

    const prayerId = 'mpr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    await db.run(
      `INSERT INTO meeting_prayers (id, meeting_id, user_id, prayer_text, category) VALUES (?, ?, ?, ?, ?)`,
      [prayerId, meetingId, req.user.id, prayerText.trim(), category || 'Personal']
    );

    return res.status(201).json({
      message: 'Prayer request submitted to meeting successfully.',
      prayer: {
        id: prayerId,
        meetingId,
        userName: req.user.full_name,
        prayerText: prayerText.trim(),
        category: category || 'Personal',
        createdAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Submit meeting prayer error:', err);
    return res.status(500).json({ error: 'Failed to submit meeting prayer request.' });
  }
}

/**
 * Get prayers submitted in a meeting
 */
async function getMeetingPrayers(req, res) {
  try {
    const { meetingId } = req.params;
    const prayers = await db.all(
      `SELECT mp.*, u.full_name as user_name 
       FROM meeting_prayers mp 
       JOIN users u ON mp.user_id = u.id 
       WHERE mp.meeting_id = ? 
       ORDER BY mp.created_at DESC`,
      [meetingId]
    );

    return res.json({ prayers });
  } catch (err) {
    console.error('Get meeting prayers error:', err);
    return res.status(500).json({ error: 'Failed to retrieve meeting prayers.' });
  }
}

module.exports = {
  getScheduledMeetings,
  createScheduledMeeting,
  updateMeetingStatus,
  getMeetingToken,
  submitMeetingPrayer,
  getMeetingPrayers
};
