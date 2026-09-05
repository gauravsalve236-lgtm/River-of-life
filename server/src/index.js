const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/auth.routes');
const meetingRoutes = require('./routes/meeting.routes');
const prayerRoutes = require('./routes/prayer.routes');
const notificationRoutes = require('./routes/notification.routes');
const deviceRoutes = require('./routes/device.routes');
const searchRoutes = require('./routes/search.routes');
const adminRoutes = require('./routes/admin.routes');
const cmsRoutes = require('./routes/cms.routes');
const ttsRoutes = require('./routes/tts.routes');

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 7880;

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use('/api/', apiLimiter);

// Serve static frontend files from parent directory
app.use(express.static(path.join(__dirname, '../../')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/prayers', prayerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/tts', ttsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    app: 'River of Life Production API Engine',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Fallback legacy endpoint
app.post('/api/get-meeting-token', async (req, res) => {
  const { roomName, participantName, isHost } = req.body;
  const { AccessToken } = require('livekit-server-sdk');
  const apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
  const apiSecret = process.env.LIVEKIT_API_SECRET || 'secretxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName || 'Guest',
      name: participantName || 'Guest',
      ttl: '12h'
    });

    at.addGrant({
      roomJoin: true,
      room: roomName || 'river-of-life-fellowship',
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: !!isHost
    });

    const token = await at.toJwt();
    res.json({ token, url: process.env.LIVEKIT_URL || 'wss://river-of-life.livekit.cloud' });
  } catch (err) {
    console.error('Legacy token error:', err);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

// Centralized Error Handling Middleware
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`   RIVER OF LIFE PRODUCTION API SERVER IS RUNNING ON PORT ${PORT}  `);
  console.log(`================================================================`);
});

module.exports = app;
