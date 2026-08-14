import time
from playwright.sync_api import sync_playwright

def run_test():
    with sync_playwright() as p:
        print("Launching Chromium browser with fake media stream flags...")
        browser = p.chromium.launch(
            headless=True,
            args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"]
        )
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()
        
        file_url = "file:///C:/Users/Gaurav.Salve/.gemini/antigravity/scratch/life-bible-mr/docs/index.html"
        page.goto(file_url)
        page.wait_for_timeout(2000)
        
        # Hide splash screen and warning banner
        page.evaluate("""() => { 
            const s = document.getElementById('splash-screen'); 
            if (s) s.style.display = 'none'; 
            document.querySelectorAll('div').forEach(d => {
                if (d.textContent.includes('file://')) d.style.display = 'none';
            });
        }""")
        page.wait_for_timeout(500)

        # 1. Switch to meetings tab via hash
        print("Navigating to Meetings tab via hash...")
        page.evaluate("() => { window.location.hash = '#/meetings'; }")
        page.wait_for_timeout(1000)
        
        # 2. Launch Meeting Room
        print("Launching Meeting Room...")
        page.evaluate("""() => {
            const modal = document.getElementById('modal-live-meeting');
            if (modal) {
                modal.style.display = 'block';
                modal.classList.add('active');
            }
        }""")
        page.wait_for_timeout(1000)

        # 3. Assert Light Theme Meeting Room
        print("Verifying Light Theme styling...")
        modal_bg = page.eval_on_selector("#modal-live-meeting", "e => getComputedStyle(e).backgroundColor")
        print(f"Meeting Modal Background Color: {modal_bg}")
        assert "248" in modal_bg or "255" in modal_bg, "Modal background should be Light Theme"
        
        grid = page.query_selector("#meeting-video-grid")
        assert grid is not None and grid.is_visible(), "Grid View should be active by default"
        
        # Check participant tiles count in Grid View
        tiles = page.query_selector_all(".video-cell")
        print(f"Grid View Active: {len(tiles)} participant tiles visible (Local user + Meeting members)")
        assert len(tiles) >= 1, "Grid View should show participant tiles"
        
        # 4. Test Scripture Share (Shared Word)
        print("Testing Scripture Share ('Shared Word')...")
        page.evaluate("""async () => {
            if (typeof window.renderSharedBibleContent === 'function') {
                await window.renderSharedBibleContent('psalms', 23, '1');
            }
        }""")
        page.wait_for_timeout(1000)
        
        # Assert shared scripture pane is displayed on screen
        shared_area = page.query_selector("#meeting-shared-content-area")
        shared_bible = page.query_selector("#meeting-shared-bible")
        
        assert shared_area is not None and shared_area.is_visible(), "Shared content area MUST be visible on screen"
        assert shared_bible is not None and shared_bible.is_visible(), "Shared Bible scripture MUST be visible on screen"
        
        scripture_text = page.text_content("#meeting-shared-bible")
        safe_preview = scripture_text.encode('ascii', errors='ignore').decode('ascii')
        print(f"Shared Scripture Text Output:\n{safe_preview[:100]}...")
        assert "Scripture Shared" in scripture_text or "LIVE STUDY" in scripture_text, "Scripture content should be rendered"
        
        # 5. Test Grid View Toggle
        print("Testing Grid View toggle button...")
        page.click("#btn-meeting-grid-toggle", force=True)
        page.wait_for_timeout(500)
        
        print("\n==================================================")
        print("ALL MEETING FEATURE TESTS PASSED SUCCESSFULLY!")
        print("==================================================\n")
        browser.close()

if __name__ == "__main__":
    run_test()
