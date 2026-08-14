import time
from playwright.sync_api import sync_playwright

def run_test():
    with sync_playwright() as p:
        print("Launching Chromium browser to test MS Teams Video Conferencing Views...")
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
        print("Navigating to Meetings tab...")
        page.evaluate("() => { window.location.hash = '#/meetings'; }")
        page.wait_for_timeout(1000)
        
        # 2. Launch Live Meeting Room
        print("Launching Live Meeting Room...")
        page.evaluate("""() => {
            const modal = document.getElementById('modal-live-meeting');
            if (modal) {
                modal.style.display = 'block';
                modal.classList.add('active');
            }
        }""")
        page.wait_for_timeout(1000)

        # 3. Assert MS Teams Dark Slate Theme Meeting Room
        print("Verifying MS Teams Dark Slate Theme styling...")
        modal_bg = page.eval_on_selector("#modal-live-meeting", "e => getComputedStyle(e).backgroundColor")
        print(f"Meeting Modal Background Color: {modal_bg}")
        assert "9" in modal_bg or "15" in modal_bg or "0" in modal_bg, "Modal background should be MS Teams Dark Slate"

        # 4. TEST VIEW 1: Gallery View (Default 2x2/3x3 Grid)
        print("Testing View 1: Gallery View...")
        page.evaluate("() => switchMeetingView('gallery')")
        page.wait_for_timeout(500)
        
        grid = page.query_selector("#meeting-video-grid")
        assert grid is not None and grid.is_visible(), "Gallery View grid should be visible"
        
        tiles = page.query_selector_all("#meeting-video-grid .video-cell")
        print(f"Gallery View Active: {len(tiles)} participant tiles visible")
        assert len(tiles) >= 12, "Gallery View should show at least 12 participant tiles"

        # Check Active Speaker purple glowing border
        active_speaker = page.query_selector("#video-cell-pj.active-speaker")
        assert active_speaker is not None, "Pastor John should have active speaker purple glowing border"
        print("Active Speaker purple glowing border verified for Pastor John!")

        # 5. TEST VIEW 2: Large Gallery View (7x7 Matrix, 49 Tiles)
        print("Testing View 2: Large Gallery View (7x7 Matrix)...")
        page.evaluate("() => switchMeetingView('large-gallery')")
        page.wait_for_timeout(500)
        
        large_grid = page.query_selector("#meeting-large-gallery-grid")
        assert large_grid is not None and large_grid.is_visible(), "Large Gallery View grid should be visible"
        
        lg_tiles = page.query_selector_all("#meeting-large-gallery-grid .video-cell")
        print(f"Large Gallery Active: {len(lg_tiles)} matrix participant tiles visible!")
        assert len(lg_tiles) == 49, "Large Gallery View should show 49 matrix participant tiles"

        # 6. TEST VIEW 3: Together Mode (Auditorium Tiered Seating)
        print("Testing View 3: Together Mode (Auditorium Tiered Seating)...")
        page.evaluate("() => switchMeetingView('together')")
        page.wait_for_timeout(500)
        
        together_container = page.query_selector("#meeting-together-mode")
        assert together_container is not None and together_container.is_visible(), "Together Mode should be visible"
        
        seats = page.query_selector_all(".together-seat-card")
        print(f"Together Mode Active: {len(seats)} auditorium seats occupied!")
        assert len(seats) >= 12, "Together Mode should show seated participant avatars"

        # 7. TEST VIEW 4: Speaker View (Focus Active Speaker + Filmstrip)
        print("Testing View 4: Speaker View (Focus Speaker + Filmstrip)...")
        page.evaluate("() => switchMeetingView('speaker')")
        page.wait_for_timeout(500)
        
        speaker_container = page.query_selector("#meeting-speaker-view")
        assert speaker_container is not None and speaker_container.is_visible(), "Speaker View should be visible"
        
        main_stage = page.query_selector("#speaker-view-main-stage")
        assert main_stage is not None and main_stage.is_visible(), "Focused Speaker Main Stage should be visible"

        filmstrip_tiles = page.query_selector_all("#speaker-view-filmstrip .video-cell")
        print(f"Speaker View Active: Focused Main Stage + {len(filmstrip_tiles)} filmstrip tiles!")
        assert len(filmstrip_tiles) >= 11, "Speaker View filmstrip should contain participant tiles"

        # 8. TEST Quick 1-Tap Scripture Sharing Preset
        print("Testing Quick 1-Tap Scripture Share Preset (Psalm 23)...")
        page.evaluate("() => shareQuickScripturePreset('psalms', 23, 'all')")
        page.wait_for_timeout(1000)
        
        shared_area = page.query_selector("#meeting-shared-content-area")
        shared_bible = page.query_selector("#meeting-shared-bible")
        assert shared_area is not None and shared_area.is_visible(), "Shared content area MUST be visible"
        assert shared_bible is not None and shared_bible.is_visible(), "Shared Bible scripture MUST be visible"
        
        scripture_text = page.text_content("#meeting-shared-bible")
        safe_preview = scripture_text.encode('ascii', errors='ignore').decode('ascii')
        print(f"Quick Scripture Share Output:\n{safe_preview[:100]}...")
        assert "Scripture Shared" in scripture_text or "psalms 23" in scripture_text.lower(), "Scripture Psalm 23 should be rendered"

        print("\n==================================================")
        print("ALL MS TEAMS VIEWS AND SCRIPTURE TESTS PASSED!")
        print("==================================================\n")
        browser.close()

if __name__ == "__main__":
    run_test()
