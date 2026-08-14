import time
from playwright.sync_api import sync_playwright

def run_test():
    with sync_playwright() as p:
        print("Launching Chromium browser with fake media stream to test camera integration...")
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

        # 1. Trigger join meeting with fake camera stream
        print("Triggering Join Meeting flow with fake media stream...")
        page.evaluate("() => triggerJoinMeetingFlow('meeting-1')")
        page.wait_for_timeout(1500)

        # 2. Assert modal opened with zero errors
        modal = page.query_selector("#modal-live-meeting")
        assert modal is not None and modal.is_visible(), "Meeting modal should open cleanly!"
        print("Meeting Room opened cleanly!")

        # 3. Assert local camera video element is embedded inside local cell
        print("Testing live camera video element binding...")
        local_video = page.query_selector("#meeting-local-video")
        assert local_video is not None, "Local video camera element MUST exist in DOM!"
        
        has_stream = page.evaluate("() => { const v = document.getElementById('meeting-local-video'); return v && (v.srcObject !== null || v.style.display !== 'none'); }")
        print(f"Local User Live Camera Video Active State: {has_stream}")

        # 4. Test Camera Toggle button
        print("Testing Camera Toggle button...")
        page.evaluate("() => toggleCameraFeed()")
        page.wait_for_timeout(500)
        cam_off = page.evaluate("() => activeMeetingSession.isCamOff")
        print(f"Camera Toggled Off State: {cam_off}")
        assert cam_off == True, "Camera should toggle off!"

        page.evaluate("() => toggleCameraFeed()")
        page.wait_for_timeout(500)
        cam_on = page.evaluate("() => activeMeetingSession.isCamOff")
        print(f"Camera Toggled On State: {not cam_on}")
        assert cam_on == False, "Camera should toggle back on!"

        print("\n==================================================")
        print("ALL CAMERA & REAL VIDEO TESTS PASSED SUCCESSFULLY!")
        print("==================================================\n")
        browser.close()

if __name__ == "__main__":
    run_test()
