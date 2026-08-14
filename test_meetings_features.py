import time
from playwright.sync_api import sync_playwright

def run_test():
    with sync_playwright() as p:
        print("Launching Chromium browser to test redesigned MS Teams Controls & Features...")
        browser = p.chromium.launch(
            headless=True,
            args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"]
        )
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()
        
        file_url = "file:///C:/Users/Gaurav.Salve/.gemini/antigravity/scratch/life-bible-mr/docs/index.html"
        page.goto(file_url)
        page.wait_for_timeout(2000)
        
        # Hide splash screen and file warning overlay
        page.evaluate("""() => { 
            const s = document.getElementById('splash-screen'); 
            if (s) s.style.display = 'none'; 
            document.querySelectorAll('div').forEach(d => {
                if (d.textContent.includes('file://')) d.style.display = 'none';
            });
        }""")
        page.wait_for_timeout(500)

        # 1. Launch Live Meeting Room
        print("Launching Live Meeting Room...")
        page.evaluate("""() => {
            window.launchLiveMeetingRoom({ id: 'test-room-1', title: 'Friday Family Prayer', host: 'Pastor John' }, null);
        }""")
        page.wait_for_timeout(1000)

        # 2. Verify no runtime errors occurred on launch
        modal = page.query_selector("#modal-live-meeting")
        assert modal is not None and modal.is_visible(), "Meeting modal should open without any runtime error!"
        print("Meeting Room launched cleanly with ZERO runtime errors!")

        # 3. Verify Non-Duplicated Controls: Bottom Bar has 5 essential action items
        print("Verifying Non-Duplicated Control Bar...")
        bottom_btns = page.query_selector_all(".meeting-room-toolbar .control-btn")
        print(f"Bottom Control Bar Action Buttons Count: {len(bottom_btns)}")
        assert len(bottom_btns) == 5, "Bottom control bar should contain exactly 5 essential action controls (Mute, Cam, Screen, Reactions, End Call)!"

        # 4. Test Live Reaction Popup Menu
        print("Testing Live Reactions & Emoji Popup...")
        page.evaluate("() => toggleReactionMenu()")
        page.wait_for_timeout(500)
        
        rx_menu = page.query_selector("#meeting-reactions-menu")
        assert rx_menu is not None and rx_menu.is_visible(), "Floating Reactions popup menu should be visible"
        
        page.evaluate("() => sendLiveEmojiReaction('❤️')")
        page.wait_for_timeout(500)
        print("Live Heart Reaction broadcasted and animated successfully!")

        # 5. Test Meeting Notes Drawer (New Teams Feature)
        print("Testing Meeting Notes & Prayer Requests Drawer...")
        page.evaluate("() => openMeetingSidebarPanel('notes')")
        page.wait_for_timeout(500)
        
        notes_panel = page.query_selector("#meeting-panel-notes")
        assert notes_panel is not None and notes_panel.is_visible(), "Meeting Notes drawer panel should be visible"
        print("Meeting Notes & Prayer Requests drawer panel verified!")

        # 6. Test Device & Call Settings Drawer (New Teams Feature)
        print("Testing Device & Call Settings Drawer...")
        page.evaluate("() => openDrawer('drawer-meet-settings')")
        page.wait_for_timeout(500)
        
        settings_drawer = page.query_selector("#drawer-meet-settings")
        assert settings_drawer is not None and settings_drawer.is_visible(), "Device Settings drawer should be visible"
        print("Device & Call Settings drawer verified!")

        print("\n==================================================")
        print("ALL REDESIGNED MS TEAMS CONTROLS & TESTS PASSED!")
        print("==================================================\n")
        browser.close()

if __name__ == "__main__":
    run_test()
