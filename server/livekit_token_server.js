/**
 * River of Life - Secure LiveKit Access Token Server
 * 
 * Generates secure JWT access tokens for River of Life native video meetings.
 * Environment Variables required:
 *   LIVEKIT_URL=wss://river-of-life-xxxx.livekit.cloud
 *   LIVEKIT_API_KEY=APIxxxxxxxxxxxx
 *   LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   PORT=7880
 */

const express = require('express');
const cors = require('cors');
const { AccessToken } = require('livekit-server-sdk');

const app = express();
app.use(cors());
app.use(express.json());

const apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
const apiSecret = process.env.LIVEKIT_API_SECRET || 'secretxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const port = process.env.PORT || 7880;

app.post('/api/get-meeting-token', (req, res) => {
  try {
    const { roomName, participantName, isHost } = req.body;
    if (!roomName || !participantName) {
      return res.status(400).json({ error: 'roomName and participantName are required' });
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      name: participantName,
      ttl: '24h',
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: !!isHost,
    });

    const token = at.toJwt();
    res.json({ token, url: process.env.LIVEKIT_URL || 'wss://river-of-life.livekit.cloud' });
  } catch (err) {
    console.error('Token generation error:', err);
    res.status(500).json({ error: 'Failed to generate access token' });
  }
});

app.listen(port, () => {
  console.log(`River of Life LiveKit Token Server running on port ${port}`);
});
