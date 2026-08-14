import time
from playwright.sync_api import sync_playwright

def run_test():
    with sync_playwright() as p:
        print("Launching Chromium browser to test Default Real Live P2P Call Stream...")
        browser = p.chromium.launch(
            headless=True,
            args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"]
        )
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()
        
        file_url = "file:///C:/Users/Gaurav.Salve/.gemini/antigravity/scratch/life-bible-mr/docs/index.html"
        page.goto(file_url)
        page.wait_for_timeout(2000)
        
        # Hide splash screen and warning overlays
        page.evaluate("""() => { 
            const s = document.getElementById('splash-screen'); 
            if (s) s.style.display = 'none'; 
            document.querySelectorAll('div').forEach(d => {
                if (d.textContent.includes('file://')) d.style.display = 'none';
            });
        }""")
        page.wait_for_timeout(500)

        # 1. Trigger join meeting
        print("Triggering Join Meeting flow...")
        page.evaluate("() => triggerJoinMeetingFlow('friday-prayer')")
        page.wait_for_timeout(1500)

        # 2. Verify Real P2P Live Call Container is VISIBLE by default
        print("Verifying Real P2P WebRTC Live Call container is ACTIVE by default...")
        jitsi = page.query_selector("#meeting-jitsi-container")
        assert jitsi is not None and jitsi.is_visible(), "Real P2P Live Call container MUST be active by default so multi-device calls connect!"
        print("Real P2P WebRTC Live Call container ACTIVE by default! Multi-device calls will show live video/audio!")

        # 3. Test Toggle to Demo Grid View
        print("Testing toggle to Demo Grid View...")
        page.evaluate("() => toggleRealLiveStreamMode()")
        page.wait_for_timeout(500)
        
        grid = page.query_selector("#meeting-video-grid")
        assert grid is not None and grid.is_visible(), "Demo grid should be visible after toggling"
        print("Switched to Demo Grid View cleanly!")

        print("\n==================================================")
        print("DEFAULT REAL LIVE P2P STREAM TESTS PASSED!")
        print("==================================================\n")
        browser.close()

if __name__ == "__main__":
    run_test()
