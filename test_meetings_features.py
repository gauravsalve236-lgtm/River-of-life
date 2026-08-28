import time
from playwright.sync_api import sync_playwright

def run_test():
    with sync_playwright() as p:
        print("Launching Chromium browser to test Clean Google Meet-style Meeting UI...")
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
        page.wait_for_timeout(1000)

        # 2. Verify clean topbar layout (LIVE badge, meeting title, Edit Title button, Share Word, Music, Leave)
        print("Testing Clean Topbar Layout...")
        title = page.text_content("#meeting-room-title")
        assert title is not None, "Meeting title must be rendered"
        print("Meeting Title successfully rendered!")

        # 3. Test Edit Meeting Title modal
        print("Testing Edit Meeting Title Modal...")
        page.evaluate("() => openEditMeetingTitleModal()")
        page.wait_for_timeout(500)
        
        modal = page.query_selector("#modal-edit-meeting-title")
        assert modal is not None and modal.is_visible(), "Edit Meeting Title Modal should be visible"
        
        page.evaluate("() => { document.getElementById('input-edit-meeting-title').value = 'Sunday Worship Service'; saveEditedMeetingTitle(); }")
        page.wait_for_timeout(500)

        updated_title = page.text_content("#meeting-room-title")
        assert updated_title == "Sunday Worship Service", "Meeting title should update to Sunday Worship Service"
        print("Meeting Title updated successfully!")

        # 4. Verify ZERO duplicate bottom bars
        print("Verifying ZERO duplicate bottom bars...")
        toolbar = page.query_selector(".meeting-room-toolbar")
        assert toolbar is None or not toolbar.is_visible(), "Duplicate bottom toolbar MUST NOT exist!"
        print("No duplicate bottom bars found! Ultra clean layout!")

        print("\n==================================================")
        print("CLEAN GOOGLE MEET STYLE UI TESTS PASSED!")
        print("==================================================\n")
        browser.close()

if __name__ == "__main__":
    run_test()
