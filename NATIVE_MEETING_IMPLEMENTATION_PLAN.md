# Native Meeting Implementation Plan — River of Life Built-in Video Meetings

Replaces the MiroTalk iframe integration with **River of Life's own native video meeting application** powered by **WebRTC + LiveKit SFU infrastructure**.

Users will experience a 100% native River of Life video meeting interface without third-party redirects or cross-origin iframes.

---

## 🏛️ 1. Current Architecture vs Target Architecture

### Current Architecture
```text
River of Life App → MiroTalk Iframe → https://p2p.mirotalk.com
(Fails on iOS Safari due to 3rd-party cross-origin iframe media sandbox rules)
```

### Target Architecture
```text
                    RIVER OF LIFE
                         │
              ┌──────────┴──────────┐
              │                     │
        River of Life UI       River of Life API / Token Generator
              │                     │
              │                Authentication
              │                     │
              │                  Database
              │
              ▼
          LiveKit Client SDK
              │
              ▼
        LiveKit SFU Server (WebRTC Infrastructure)
              │
       ┌──────┼──────┐
       │      │      │
     iPhone Android Windows
```

---

## 🔍 2. Existing System Inspection

1. **Frontend Framework**: Vanilla JavaScript (`app.js`), HTML5 (`index.html`), Vanilla CSS (`index.css`) SPA architecture.
2. **Backend / Server**: GitHub Pages static hosting (`docs/`) + local Node environment.
3. **Database**: `localStorage` (meetings, users, session state, preferences).
4. **Authentication System**: `state.currentUser` manager with local user credentials storage.
5. **Existing Meeting Implementation**: Found in `app.js` (`initMeetings()`, `createNewMeeting()`, `launchLiveMeetingRoom()`).
6. **MiroTalk Integration**: Cross-origin iframe embedded in `#meeting-jitsi-container` inside modal `#modal-live-meeting`.
7. **Meeting ID Generation**: Slug format `ROL-ABC123` / `RiverOfLife_Sanctuary_${id}`.
8. **Deployment Architecture**: GitHub Pages repository [`gauravsalve236-lgtm/River-of-life`](https://github.com/gauravsalve236-lgtm/River-of-life.git).

---

## 🛠️ 3. Files and Components to Create & Modify

### Proposed New Files
- `server/livekit_token_server.js` [NEW]: Lightweight Node.js Express backend for generating secure LiveKit JWT access tokens.
- `NATIVE_MEETING_IMPLEMENTATION_PLAN.md` [NEW]: Implementation blueprint document.

### Proposed Modifications
- [app.js](file:///C:/Users/Gaurav.Salve/.gemini/antigravity/scratch/life-bible-mr/app.js) [MODIFY]:
  - Add `LiveKitNativeMeetingManager` class managing `LiveKit.Room` connection, local track publishing, remote track attachment, active speaker detection, and in-room chat.
  - Update `triggerJoinMeetingFlow()` to connect to LiveKit SFU natively in the top-level DOM window.
  - Add host management controls (`muteParticipant`, `removeParticipant`, `endMeetingForEveryone`).
- [index.html](file:///C:/Users/Gaurav.Salve/.gemini/antigravity/scratch/life-bible-mr/index.html) [MODIFY]:
  - Include official LiveKit Client JS library script tag (`livekit-client.umd.min.js`).
  - Replace `#meeting-jitsi-container` with native River of Life video room DOM layout:
    - `#river-video-grid` (Responsive grid layout for participant video tiles)
    - `#river-active-speaker-overlay` (Glowing border and speech indicator)
    - `#river-meet-toolbar` (Native toolbar: Mic, Camera, Audio, Participants, Chat, Screen Share, Leave)
    - `#drawer-meet-participants` (Host participant roster & control drawer)
    - `#drawer-meet-chat` (In-room text chat overlay)
- [index.css](file:///C:/Users/Gaurav.Salve/.gemini/antigravity/scratch/life-bible-mr/index.css) [MODIFY]:
  - Add glassmorphic dark-theme styles for video tiles, active speaker indicators, mobile grid scaling, and control buttons.

---

## 🗄️ 4. Database & Entity Schemas

### `meetings` Schema
- `id`: Unique River of Life ID (`ROL-ABC123`)
- `room_name`: `RiverOfLife_Sanctuary_${id}`
- `title`: Meeting title string
- `description`: Purpose / details
- `host`: Host username string
- `scheduled_at`: ISO timestamp string
- `status`: `'scheduled'` | `'live'` | `'ended'` | `'cancelled'`
- `visibility`: `'public'` | `'private'`
- `password`: Optional access passcode string
- `participant_limit`: Optional max capacity number
- `created_at`: ISO timestamp string

### `meeting_participants` Schema
- `meeting_id`: Meeting ID string
- `user_id`: Participant username
- `role`: `'host'` | `'participant'`
- `is_muted`: Boolean
- `is_cam_off`: Boolean
- `joined_at`: ISO timestamp string

---

## 🔐 5. Environment Variables & Security

```env
LIVEKIT_URL=wss://river-of-life-xxxx.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PORT=7880
```
> **Security Rule**: `LIVEKIT_API_SECRET` remains server-side. The frontend receives only short-lived room access tokens scoped specifically to the user's role (`host` vs `participant`).

---

## 📱 6. Platform Compatibility Plan

### iOS (iPhone / iPad Safari)
- **Top-Level WebRTC Connection**: Built directly inside the main document window (no cross-origin iframe).
- **Audio Unlock & Playback**: Attaches remote tracks using `track.attach(audioEl)` with explicit `playsInline = true` and user-gesture `AudioContext` resumption.
- **Camera Switching**: Supports front/back camera toggling (`facingMode: "user"` vs `"environment"`).

### Android (Mobile Chrome)
- **Low-Latency Opus**: Hardware audio capture and WebAudio rendering with low-latency Opus codec streaming.
- **Speaker Route**: Graceful system audio routing and mobile UI toolbar controls.

### Windows / Desktop (Chrome / Edge / Firefox)
- **High-Definition Media**: Multi-camera support, `setSinkId` speaker routing, and browser-native screen sharing (`getDisplayMedia`).

---

## 🚀 7. Phased Implementation Plan

- **Phase 1: Foundation & LiveKit Client SDK**: Add LiveKit JS SDK, token generator endpoint, and room connection logic.
- **Phase 2: Video Grid & Audio/Video Track Publishing**: Build `#river-video-grid`, local mic/camera publishing, and remote track attachment.
- **Phase 3: Native Controls & Host Roster**: Implement bottom toolbar, mute/unmute, camera toggle, and host participant management drawer.
- **Phase 4: In-Room Chat & Screen Sharing**: Add real-time text chat using LiveKit Data Messages and screen share publishing.
- **Phase 5: Scheduling, Migration & Cleanup**: Update meeting creation (`ROL-ABC123`), test iOS/Android/Windows, and deprecate MiroTalk iframe code.

---

## 🧪 8. Acceptance Test Matrix

| Test Case | Description | Expected Outcome |
| :--- | :--- | :--- |
| **Test 1** | iPhone ↔ Windows PC | Bi-directional video & audio streaming; mute/unmute operational on both ends. |
| **Test 2** | iPhone ↔ Android | Bi-directional video & audio streaming; mobile camera switching works. |
| **Test 3** | iPhone ↔ iPhone | Direct native WebRTC connection; zero iframe blocks on iOS Safari. |
| **Test 4** | 3-Way Multi-Platform | iPhone + Android + Windows in same room with active speaker highlights. |
| **Test 5** | Screen Sharing | Windows PC shares screen; iOS and Android participants view stream live. |
| **Test 6** | Host Controls | Host mutes participant or ends meeting for all participants. |
