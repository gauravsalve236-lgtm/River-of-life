import time
from playwright.sync_api import sync_playwright

def run_test():
    with sync_playwright() as p:
        print("\n==================================================")
        print("TESTING NATIVE RIVER OF LIFE WEBRTC VIDEO MEETINGS")
        print("==================================================\n")

        browser = p.chromium.launch(
            headless=True,
            args=[
                "--use-fake-ui-for-media-stream",
                "--use-fake-device-for-media-stream",
                "--no-sandbox",
                "--disable-setuid-sandbox"
            ]
        )
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()
        
        page.on("console", lambda msg: print(f"[BROWSER] {msg.text.encode('ascii', errors='ignore').decode('ascii')}"))
        page.on("pageerror", lambda err: print(f"[PAGE ERROR] {str(err).encode('ascii', errors='ignore').decode('ascii')}"))
        url = "http://127.0.0.1:8001/index.html"
        page.goto(url)
        page.wait_for_timeout(2000)

        # Hide splash screen
        page.evaluate("""() => { 
            const s = document.getElementById('splash-screen'); 
            if (s) s.style.display = 'none'; 
        }""")
        page.wait_for_timeout(500)

        # 1. Launch Live Meeting Room
        print("1. Launching Live Fellowship Video Meeting Room...")
        page.evaluate("""() => {
            const meeting = { id: 'ROL-TEST01', title: 'Sunday Morning Live Worship', host: 'Pastor John' };
            launchLiveMeetingRoom(meeting, null);
        }""")
        page.wait_for_timeout(1000)

        styles = page.evaluate("""() => {
            const el = document.getElementById('modal-live-meeting');
            return {
                display: el ? el.style.display : null,
                computedDisplay: el ? window.getComputedStyle(el).display : null,
                visibility: el ? window.getComputedStyle(el).visibility : null,
                offsetWidth: el ? el.offsetWidth : null,
                offsetHeight: el ? el.offsetHeight : null,
                classList: el ? Array.from(el.classList) : []
            };
        }""")
        print(f"   [DIAGNOSTIC] modal-live-meeting info: {styles}")

        modal_active = page.evaluate("""() => {
            const el = document.getElementById('modal-live-meeting');
            return el && (el.style.display === 'flex' || el.classList.contains('active'));
        }""")
        assert modal_active, "Meeting room modal must be active"
        print("   [OK] Meeting room modal is active and rendered!")

        # 2. Verify Local Participant Video Tile
        print("2. Verifying Local Participant Hardware Capture & Video Tile...")
        local_tile = page.query_selector("#tile-local-participant")
        assert local_tile is not None, "Local participant tile must exist in #river-video-grid"
        
        local_video = page.query_selector("#local-video-element")
        assert local_video is not None, "Local video element must exist"
        print("   [OK] Local video element rendered in video grid!")

        # 3. Test Microphone Toggle
        print("3. Testing Microphone Toggle (Mute/Unmute)...")
        page.evaluate("() => toggleNativeMic()")
        page.wait_for_timeout(500)
        
        lbl_mic = page.text_content("#teams-lbl-mic")
        assert "off" in lbl_mic.lower(), "Mic label should indicate Mic off"
        print("   [OK] Microphone muted successfully!")

        page.evaluate("() => toggleNativeMic()")
        page.wait_for_timeout(500)
        lbl_mic_on = page.text_content("#teams-lbl-mic")
        assert "on" in lbl_mic_on.lower(), "Mic label should indicate Mic on"
        print("   [OK] Microphone unmuted successfully!")

        # 4. Test Camera Toggle
        print("4. Testing Camera Toggle (Cam Off / Cam On)...")
        page.evaluate("() => toggleNativeCam()")
        page.wait_for_timeout(500)
        
        lbl_cam = page.text_content("#teams-lbl-cam")
        assert "off" in lbl_cam.lower(), "Camera label should indicate Video off"
        print("   [OK] Camera toggled OFF!")

        page.evaluate("() => toggleNativeCam()")
        page.wait_for_timeout(500)
        lbl_cam_on = page.text_content("#teams-lbl-cam")
        assert "on" in lbl_cam_on.lower(), "Camera label should indicate Video on"
        print("   [OK] Camera toggled back ON!")

        # 5. Test Live In-Room Fellowship Chat Drawer
        print("5. Testing Live Fellowship Chat Drawer & Message Broadcast...")
        page.evaluate("() => openDrawer('drawer-meet-chat')")
        page.wait_for_timeout(500)

        chat_active = page.evaluate("() => document.getElementById('drawer-meet-chat').classList.contains('active')")
        assert chat_active, "Chat drawer must be active"

        page.evaluate("""() => {
            const input = document.getElementById('river-chat-input');
            if (input) input.value = "Praise the Lord! Blessings to everyone in the fellowship 🙏";
            const form = document.querySelector("#drawer-meet-chat form");
            if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }""")
        page.wait_for_timeout(500)

        chat_content = page.text_content("#river-chat-messages-container")
        assert "Praise the Lord!" in chat_content, "Chat message must appear in scroll container"
        print("   [OK] Live Chat message posted successfully!")

        page.evaluate("() => closeDrawer('drawer-meet-chat')")
        page.wait_for_timeout(300)

        # 6. Test Meeting Participants Roster Drawer
        print("6. Testing Participants Roster Drawer...")
        page.evaluate("() => openDrawer('drawer-meet-participants')")
        page.wait_for_timeout(500)

        roster_active = page.evaluate("() => document.getElementById('drawer-meet-participants').classList.contains('active')")
        assert roster_active, "Participants drawer must be active"

        roster_content = page.text_content("#river-participants-list")
        assert len(roster_content.strip()) > 0, "Participants roster must render active participants"
        print("   [OK] Participants roster rendered successfully!")

        page.evaluate("() => closeDrawer('drawer-meet-participants')")
        page.wait_for_timeout(300)

        # 7. Test Meeting Exit
        print("7. Testing Direct Meeting Exit...")
        page.evaluate("() => exitLiveMeetingRoomDirectly()")
        page.wait_for_timeout(500)

        modal_hidden = not page.is_visible("#modal-live-meeting")
        assert modal_hidden, "Meeting room modal must be hidden after exit"
        print("   [OK] Left meeting room cleanly; UI restored!")

        print("\n==================================================")
        print("ALL NATIVE WEBRTC VIDEO MEETING TESTS PASSED SUCCESSFULLY!")
        print("==================================================\n")
        browser.close()

if __name__ == "__main__":
    run_test()
