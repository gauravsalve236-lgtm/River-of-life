import http.server
import socketserver
import threading
import time
import os
import sys
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

PORT = 8123
DIRECTORY = r"C:\Users\Gaurav.Salve\.gemini\antigravity\scratch\life-bible-mr"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def start_server():
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            httpd.serve_forever()
    except Exception as e:
        print("Server error:", e)

def run_test():
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    time.sleep(1.5)

    print("Server started on port", PORT)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 950})
        page = context.new_page()

        page.on("console", lambda msg: print("CONSOLE:", msg.text))

        print("Navigating to app...")
        page.goto(f"http://localhost:{PORT}")
        page.wait_for_timeout(2000)

        # Dismiss splash screen
        page.evaluate("""() => {
            const splash = document.getElementById('splash-screen');
            if (splash) splash.style.display = 'none';
        }""")
        page.wait_for_timeout(500)

        print("\n--- 1. Opening Mobile Registration Modal ---")
        page.evaluate("openAuthModal()")
        page.wait_for_timeout(1000)

        page.screenshot(path=os.path.join(DIRECTORY, "v437_1_mobile_otp_form.png"))
        print("Saved screenshot: v437_1_mobile_otp_form.png")

        print("\n--- 2. Entering Mobile Number & Sending Live Mobile SMS ---")
        page.evaluate("""() => {
            document.getElementById('auth-input-fullname').value = 'Gaurav Salve';
            document.getElementById('auth-input-phone').value = '9876543210';
            handleRequestOtpSubmit();
        }""")
        page.wait_for_timeout(1000)

        page.screenshot(path=os.path.join(DIRECTORY, "v437_2_live_sms_dispatched_empty_input.png"))
        print("Saved screenshot: v437_2_live_sms_dispatched_empty_input.png")

        print("\n--- 3. Entering 6-Digit OTP Received on Mobile ---")
        page.evaluate("""() => {
            document.getElementById('auth-input-otp').value = window.currentGeneratedOtp;
            handleVerifyOtpSubmit();
        }""")
        page.wait_for_timeout(1000)

        page.screenshot(path=os.path.join(DIRECTORY, "v437_3_mobile_otp_verified.png"))
        print("Saved screenshot: v437_3_mobile_otp_verified.png")

        print("\n--- 4. Setting Password & Logging In ---")
        page.evaluate("""() => {
            document.getElementById('auth-input-pass').value = 'Pass1234';
            document.getElementById('auth-input-pass-confirm').value = 'Pass1234';
            handleSetPasswordSubmit();
        }""")
        page.wait_for_timeout(1500)

        page.screenshot(path=os.path.join(DIRECTORY, "v437_4_user_signed_in_dashboard.png"))
        print("Saved screenshot: v437_4_user_signed_in_dashboard.png")

        browser.close()

if __name__ == "__main__":
    run_test()
