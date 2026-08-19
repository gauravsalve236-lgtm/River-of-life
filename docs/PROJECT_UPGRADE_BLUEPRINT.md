# River of Life — Product Upgrade Blueprint

## Goal
Turn River of Life into a polished bilingual Christian Bible and prayer-community platform while preserving existing Bible, prayer, church, quiz, profile, and meeting functionality.

## Current architecture observed
- Vanilla JavaScript SPA (`app.js`) with large HTML/CSS presentation layer.
- GitHub Pages deployment with `docs/` output.
- Capacitor Android/iOS project directories.
- Current client-side state/auth/data uses localStorage.
- Native meeting UI is already present and LiveKit client SDK is loaded.
- Native meeting plan targets LiveKit SFU and server-side short-lived tokens.
- Meeting UI already includes Bible sharing, media/audio controls, participant/chat drawers, device settings, and host-oriented controls.

## Upgrade strategy
Do not rewrite the application wholesale. Refactor incrementally around stable feature boundaries. Every change must preserve existing working routes and data. Prefer additive modules and adapters over duplicating logic.

## Product information architecture
1. Today — devotional verse, continue reading, streak, prayer status, upcoming meeting, church updates, quiz, reading plans.
2. Bible — Marathi/English reader, book/chapter navigation, search, bookmarks/highlights/notes, reading history, TTS.
3. Study — reading plans, devotional topics, study notes, cross references, saved verses.
4. Prayer — personal prayer journal, church prayer requests, privacy controls, answered prayers, pastor/admin workflow.
5. Meetings — live, upcoming, my meetings, past meetings, scheduling, native meeting room.
6. Churches — church profile, announcements, sermons, events, members/roles, prayer circles.
7. Discover — Scripture search, topic search, Bible quiz, devotional discovery.
8. Profile — account, church, saved content, prayer history, streaks, badges, settings.

## Home redesign
Create a calm premium Christian visual hierarchy:
- Hero: today's Scripture with Marathi + English toggle.
- Continue Reading card with exact book/chapter/verse progress.
- Prayer pulse card: pending requests, answered prayers, and today's prayer focus.
- Next Prayer Meeting card with countdown, host, participant count, Join/Add-to-calendar actions.
- Church companion card with announcements/events.
- Daily Bible Quiz card.
- Reading plan progress.
- Quick actions: Read Bible, Pray, Join Meeting, Search Scripture.
- Responsive desktop sidebar + mobile bottom navigation.

## Bible experience
- Fast book/chapter/verse navigation.
- Persistent translation selector.
- Verse actions: save, highlight, note, copy/share, add to prayer.
- Parallel Marathi/English mode where data exists.
- Reading progress and history.
- Search by exact words, phrase, topic and reference.
- Avoid inventing Bible text. Scripture content must come from the app's licensed/approved dataset.

## Prayer system
Introduce clear entities and lifecycle states:
- `prayer_requests`: id, author_id, church_id, text, category, visibility, status, created_at, answered_at, updated_at.
- `prayer_interactions`: request_id, user_id, type, created_at.
- `prayer_notes`: request_id, author_id, note, visibility, created_at.
States: active, answered, archived.
Privacy: private, pastor_only, church, public.

## Meeting system
Use the existing LiveKit direction; do not return to third-party iframe meeting providers.
Meeting entities:
- `meetings`: id, room_name, title, description, host_id, church_id, scheduled_at, started_at, ended_at, status, visibility, password_hash/reference, participant_limit, created_at, updated_at.
- `meeting_participants`: meeting_id, user_id, role, joined_at, left_at, mic_enabled, camera_enabled.
- `meeting_events`: meeting_id, actor_id, event_type, payload, created_at.
- `meeting_messages`: meeting_id, sender_id, message, created_at.

Meeting room UX:
- Active-speaker-first responsive grid.
- Participant tiles with name, mic/camera state, speaking indicator.
- Bottom control bar: mic, camera, audio route, Bible, share screen, media, participants, chat, raise hand, more, leave.
- Host controls: mute participant, remove, lock room, waiting room, end for everyone.
- Prayer-specific side panel: prayer requests, Scripture, meeting notes.
- Connection quality indicator and reconnect state.
- Device test before joining.
- Mobile safe-area handling and orientation support.

## Audio/video reliability requirements
- Centralize media lifecycle; never create duplicate mic/camera streams unnecessarily.
- Handle permission denied, device unavailable, device change, track ended, reconnect, and page visibility.
- Remote audio elements must be created/cleaned deterministically.
- Respect browser autoplay/user-gesture restrictions.
- Use system/default speaker routing on platforms that do not expose `setSinkId`.
- Desktop speaker selection only when supported.
- Add visible connection diagnostics instead of silently failing.
- Shared media audio must be a real published media track when supported; never pretend a local player is shared with participants.

## Data/backend direction
The current localStorage approach is acceptable for offline preferences/prototypes but not for production multi-user church/community data. Introduce a real backend/database before relying on cross-device synchronization.

Recommended logical layers:
- Auth service
- User/profile service
- Church service
- Bible content service
- Prayer service
- Meeting metadata service
- LiveKit token service
- Notifications service

Never store passwords or LiveKit API secrets in frontend/localStorage. Password authentication must use a proper server-side auth mechanism with salted password hashing or an external identity provider. LiveKit API secret remains server-side.

## Roles
- Member: read, save, pray, join permitted meetings, submit prayer requests.
- Pastor: manage church prayer requests, host meetings, publish church content.
- Church Admin: manage church profile, events, announcements, members and meetings.
- Super Admin: platform-wide configuration and moderation.

## Notifications
Add a notification abstraction supporting:
- upcoming meeting reminders
- meeting starting now
- prayer request interaction
- prayer request answered
- church announcements
- reading-plan reminders
- quiz/streak milestones

## Quality gates
For every feature:
1. Inspect current implementation and dependencies.
2. Make the smallest coherent change.
3. Validate desktop and mobile layouts.
4. Validate logged-out and logged-in states.
5. Validate pastor/admin role behavior.
6. Test existing Bible and prayer flows after meeting changes.
7. Run available lint/build/tests.
8. Never expose secrets in frontend code.

## Phase order
### Phase 1 — Stabilize
Audit duplicate functions, stale cache/service-worker behavior, meeting media lifecycle, localStorage data integrity, and route/state consistency.

### Phase 2 — Design system
Create reusable cards, buttons, segmented controls, drawers, modals, empty states, loading states, error states, typography, spacing, and responsive breakpoints.

### Phase 3 — Home + Bible
Redesign Today and Bible reader around the new component system without changing Bible data semantics.

### Phase 4 — Prayer
Strengthen request lifecycle, privacy, pastor workflow, answered prayer history, and meeting integration.

### Phase 5 — Meetings
Complete LiveKit integration, room UX, audio/video reliability, screen/media sharing, participant controls, chat, Scripture broadcast, prayer panel, scheduling, and reconnection.

### Phase 6 — Backend/data
Move shared community data from localStorage to authenticated server/database storage with migrations and validation.

### Phase 7 — Mobile/PWA
Verify Capacitor Android/iOS behavior, permissions, safe areas, audio routing, notifications, and offline Bible reading.

### Phase 8 — QA/release
Regression test every navigation route and critical workflow before production deployment.

## Non-negotiable rule
Do not sacrifice working Bible content or existing user data to improve visual design. UI redesign and backend migration must be incremental and reversible.
