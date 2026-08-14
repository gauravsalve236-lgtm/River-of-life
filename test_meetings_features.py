import time
from playwright.sync_api import sync_playwright

def run_test():
    with sync_playwright() as p:
        print("Launching Chromium browser to test Main App Navigation Bar on Home Page...")
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

        # 1. Verify Main App Navigation Bar is visible on Home Page
        print("Verifying Main App Navigation Bar on Home Page...")
        main_tabs = page.query_selector(".mobile-bottom-tabs")
        assert main_tabs is not None and main_tabs.is_visible(), "Main App bottom navigation bar MUST be visible on Home page!"
        
        tab_buttons = page.query_selector_all(".mobile-bottom-tabs .tab-btn")
        print(f"Main App Bottom Navigation Tabs Count: {len(tab_buttons)}")
        assert len(tab_buttons) == 6, "Main App bottom navigation bar should contain 6 tabs (Home, Bible, Meetings, Plans, Prayers, You)!"

        # 2. Verify Meeting Room Toolbar is NOT visible on Home Page
        print("Verifying Meeting Room Toolbar is hidden on Home Page...")
        meeting_toolbar = page.query_selector("#modal-live-meeting .meeting-room-toolbar")
        assert meeting_toolbar is None or not meeting_toolbar.is_visible(), "Meeting Room toolbar MUST NOT show up on Home page!"
        print("Meeting Room Toolbar is cleanly hidden on Home page!")

        # 3. Launch meeting and then exit to verify main navigation bar is restored cleanly
        print("Launching meeting and exiting to verify smooth navigation restoration...")
        page.evaluate("() => triggerJoinMeetingFlow('meeting-1')")
        page.wait_for_timeout(1000)
        
        page.evaluate("() => exitLiveMeetingRoom()")
        page.wait_for_timeout(500)

        main_tabs_after = page.query_selector(".mobile-bottom-tabs")
        assert main_tabs_after is not None and main_tabs_after.is_visible(), "Main App bottom navigation bar MUST be restored after exiting meeting!"
        print("Main App Bottom Navigation bar cleanly restored after exiting meeting!")

        print("\n==================================================")
        print("MAIN HOME PAGE MENU RESTORATION TESTS PASSED!")
        print("==================================================\n")
        browser.close()

if __name__ == "__main__":
    run_test()
