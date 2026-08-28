import asyncio
import json
import urllib.request
from playwright.async_api import async_playwright

async def run_phase1_e2e():
    print("==========================================================================", flush=True)
    print("            RUNNING PHASE 1 MASTER END-TO-END INTEGRATION TEST            ", flush=True)
    print("==========================================================================", flush=True)

    # 1. Verify Backend Health Endpoint via HTTP
    print("\n--- 1. Checking Backend API Health Endpoint ---", flush=True)
    try:
        with urllib.request.urlopen("http://127.0.0.1:7880/api/health") as response:
            data = json.loads(response.read().decode())
            print("Backend API Health Response:", data, flush=True)
            assert data["status"] == "healthy", "Backend server is not healthy!"
            print("PASS: Backend API is running healthy.", flush=True)
    except Exception as e:
        print("FAIL: Could not connect to backend API:", e, flush=True)
        raise e

    # 2. Launch Browser E2E Test Suite
    print("\n--- 2. Launching Playwright Browser E2E Test ---", flush=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        page.on("console", lambda msg: print(f"[Browser Console] {msg.type}: {msg.text}", flush=True))

        print("Navigating to http://127.0.0.1:7880/index.html...", flush=True)
        await page.goto("http://127.0.0.1:7880/index.html")
        await page.wait_for_selector("#app", timeout=10000)

        # Wait for splash screen & dismiss notification prompt overlay
        await page.wait_for_timeout(3000)
        await page.evaluate("""() => {
            const splash = document.getElementById("splash-screen");
            if (splash) splash.style.display = "none";
            const notiModal = document.getElementById("modal-notification-prompt");
            if (notiModal) notiModal.style.display = "none";
        }""")
        print("PASS: App loaded & overlays cleared.", flush=True)

        # 3. Test Phone + OTP Auth Modal Flow
        print("\n--- 3. Testing Phone + OTP Authentication Modal ---", flush=True)
        phone_num = "+919876543210"

        # Open Auth Modal
        await page.evaluate("openAuthModal()")
        await page.wait_for_selector("#modal-auth-login", state="visible")
        print("PASS: Auth modal opened.", flush=True)

        # Fill Step 1
        print("Filling phone number and name...", flush=True)
        await page.fill("#auth-input-phone", phone_num, force=True)
        await page.fill("#auth-input-fullname", "Phase1 Test User", force=True)
        print("Filled Step 1 inputs.", flush=True)

        # Submit Step 1
        print("Submitting Step 1 form...", flush=True)
        async with page.expect_response("**/api/auth/request-otp") as resp_info:
            await page.evaluate("handleRequestOtpSubmit()")
        
        otp_resp = await resp_info.value
        otp_data = await otp_resp.json()
        dev_otp = otp_data.get("devOtp")
        print(f"Captured Dev OTP from backend response: {dev_otp}", flush=True)

        await page.wait_for_selector("#form-auth-step2", state="visible")
        print("PASS: Step 1 submitted, OTP verification form active.", flush=True)

        # Fill OTP and verify
        print("Filling OTP code...", flush=True)
        await page.fill("#auth-input-otp", str(dev_otp), force=True)
        
        async with page.expect_response("**/api/auth/verify-otp") as verify_resp_info:
            await page.evaluate("handleVerifyOtpSubmit()")

        verify_resp = await verify_resp_info.value
        verify_data = await verify_resp.json()
        print("Verify OTP Response:", verify_data.get("message"), flush=True)

        await page.wait_for_selector("#modal-auth-login", state="hidden")
        print("PASS: OTP verified, user signed in and modal closed!", flush=True)

        # Take screenshot after login
        await page.screenshot(path="C:/Users/Gaurav.Salve/.gemini/antigravity/scratch/life-bible-mr/phase1_auth_verified.png")

        # 4. Check Meetings Dashboard Sync
        print("\n--- 4. Checking Scheduled Meetings Dashboard ---", flush=True)
        await page.evaluate("""() => {
            switchTab('meetings');
            if (typeof initMeetings === 'function') initMeetings();
            if (typeof getMeetingsFromStorage === 'function') getMeetingsFromStorage();
            if (typeof renderMeetingsDashboard === 'function') renderMeetingsDashboard();
        }""")
        await page.wait_for_timeout(1500)
        
        meetings_count = await page.evaluate("document.querySelectorAll('#view-meetings .meeting-card').length")
        print(f"Meetings count on UI dashboard: {meetings_count}", flush=True)
        assert meetings_count >= 1, "Scheduled meetings should be rendered on dashboard!"
        print("PASS: Scheduled meeting lifecycle dashboard verified.", flush=True)

        # Take final dashboard screenshot
        await page.screenshot(path="C:/Users/Gaurav.Salve/.gemini/antigravity/scratch/life-bible-mr/phase1_meetings_verified.png")

        await browser.close()
        print("\n==========================================================================", flush=True)
        print("           ALL PHASE 1 FOUNDATION & AUTH E2E TESTS PASSED 100%!           ", flush=True)
        print("==========================================================================", flush=True)

if __name__ == "__main__":
    asyncio.run(run_phase1_e2e())
