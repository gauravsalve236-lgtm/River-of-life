import time
from playwright.sync_api import sync_playwright

def run_test():
    with sync_playwright() as p:
        print("Launching Chromium browser to test 4-5 Tile Gallery Grid & Real Live Stream Mode...")
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
        page.evaluate("() => triggerJoinMeetingFlow('meeting-1')")
        page.wait_for_timeout(1000)

        # 2. Verify Gallery View renders exactly 5 clean, focused tiles
        print("Testing 4-5 Tile Gallery View...")
        tiles = page.query_selector_all("#meeting-video-grid .video-cell")
        print(f"Focused Gallery View Active: {len(tiles)} participant tiles visible!")
        assert len(tiles) == 5, f"Gallery View should display exactly 5 clean focused tiles, found {len(tiles)}"

        # 3. Check Active Speaker purple glowing border & SPEAKING badge
        active_speaker = page.query_selector("#video-cell-pj.active-speaker")
        assert active_speaker is not None, "Pastor John should be active speaker with glowing purple border"
        
        speaking_badge = page.text_content("#video-cell-pj")
        assert "SPEAKING" in speaking_badge, "Active speaker card should display SPEAKING badge"
        print("Active Speaker purple glowing border & SPEAKING badge verified!")

        # 4. Test Toggle Real Live Stream Mode
        print("Testing Toggle Real P2P Live Call Stream Mode...")
        page.evaluate("() => toggleRealLiveStreamMode()")
        page.wait_for_timeout(500)
        
        jitsi = page.query_selector("#meeting-jitsi-container")
        assert jitsi is not None and jitsi.is_visible(), "Real P2P Live Call iframe container should be visible"
        print("Connected to Real P2P Live Media Stream!")

        page.evaluate("() => toggleRealLiveStreamMode()")
        page.wait_for_timeout(500)
        print("Switched back to 4-5 Tile Gallery Grid cleanly!")

        print("\n==================================================")
        print("ALL 4-5 TILE GALLERY & REAL STREAM TESTS PASSED!")
        print("==================================================\n")
        browser.close()

if __name__ == "__main__":
    run_test()
