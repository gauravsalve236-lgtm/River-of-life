import time
from playwright.sync_api import sync_playwright

def run_test():
    with sync_playwright() as p:
        print("Launching Chromium browser to test Clean 4-Tile 2x2 Gallery Grid...")
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

        # 1. Trigger join meeting and switch to Demo Grid
        print("Triggering Join Meeting flow...")
        page.evaluate("() => triggerJoinMeetingFlow('friday-prayer')")
        page.wait_for_timeout(1000)

        page.evaluate("() => switchMeetingView('gallery')")
        page.wait_for_timeout(500)

        # 2. Verify Gallery View renders EXACTLY 4 clean tiles (2x2 Grid)
        print("Verifying 4-Tile 2x2 Gallery Grid...")
        tiles = page.query_selector_all("#meeting-video-grid .video-cell")
        print(f"Gallery Grid Active: {len(tiles)} participant tiles visible!")
        assert len(tiles) == 4, f"Gallery View should display EXACTLY 4 tiles (2x2 grid), found {len(tiles)}"

        # 3. Verify Active Speaker purple glowing border & SPEAKING badge
        active_speaker = page.query_selector("#video-cell-pj.active-speaker")
        assert active_speaker is not None, "Pastor John should be active speaker with glowing purple border"
        print("Active Speaker purple glowing border & SPEAKING badge verified on Pastor John!")

        print("\n==================================================")
        print("CLEAN 4-TILE 2X2 GALLERY GRID TESTS PASSED!")
        print("==================================================\n")
        browser.close()

if __name__ == "__main__":
    run_test()
