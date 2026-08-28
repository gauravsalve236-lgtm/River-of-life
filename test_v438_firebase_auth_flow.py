import http.server
import socketserver
import threading
import time
import os
import sys
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

PORT = 8124
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

        print("\n--- 1. Opening Registration & Secure Auth Modal ---")
        page.evaluate("openAuthModal()")
        page.wait_for_timeout(1000)

        page.screenshot(path=os.path.join(DIRECTORY, "v438_1_registration_screen.png"))
        print("Saved screenshot: v438_1_registration_screen.png")

        print("\n--- 2. Registering User with Full Name, Email, and Mobile ---")
        page.evaluate("""() => {
            setAuthMethod('mobile');
            document.getElementById('auth-input-fullname').value = 'Gaurav Salve';
            document.getElementById('auth-input-phone').value = '9876543210';
            handleRequestOtpSubmit();
        }""")
        page.wait_for_timeout(1000)

        page.screenshot(path=os.path.join(DIRECTORY, "v438_2_otp_screen_ref_userid_6digit_boxes.png"))
        print("Saved screenshot: v438_2_otp_screen_ref_userid_6digit_boxes.png")

        print("\n--- 3. Testing 6-Digit Auto-Advancing Input & 60s Resend Timer ---")
        page.evaluate("""() => {
            const otpStr = window.currentGeneratedOtp;
            for (let i = 0; i < 6; i++) {
                const box = document.getElementById('otp-d' + (i + 1));
                if (box) box.value = otpStr[i];
            }
            syncOtpFromBoxes();
        }""")
        page.wait_for_timeout(500)

        page.screenshot(path=os.path.join(DIRECTORY, "v438_3_6digit_otp_filled_countdown_timer.png"))
        print("Saved screenshot: v438_3_6digit_otp_filled_countdown_timer.png")

        print("\n--- 4. Verifying OTP Code ---")
        page.evaluate("handleVerifyOtpSubmit()")
        page.wait_for_timeout(1000)

        page.screenshot(path=os.path.join(DIRECTORY, "v438_4_otp_verified_set_password.png"))
        print("Saved screenshot: v438_4_otp_verified_set_password.png")

        print("\n--- 5. Setting Password & Completing Registration with Ref User ID ---")
        page.evaluate("""() => {
            document.getElementById('auth-input-pass').value = 'Pass1234';
            document.getElementById('auth-input-pass-confirm').value = 'Pass1234';
            handleSetPasswordSubmit();
        }""")
        page.wait_for_timeout(1500)

        page.screenshot(path=os.path.join(DIRECTORY, "v438_5_registered_logged_in_dashboard.png"))
        print("Saved screenshot: v438_5_registered_logged_in_dashboard.png")

        browser.close()

if __name__ == "__main__":
    run_test()
