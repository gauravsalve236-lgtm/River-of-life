import http.server
import socketserver
import threading
import time
import os
import sys
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

PORT = 8098
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

def run_tests():
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    time.sleep(1.5)

    print("Server started on port", PORT)

    prayers = [
        ("peace_guidance", "prayer_modal_morning.png", "Morning Prayer"),
        ("family_protection", "prayer_modal_protection.png", "Protection & Health"),
        ("strength_struggles", "prayer_modal_strength.png", "Strength & Faith"),
        ("evening_rest", "prayer_modal_evening.png", "Evening Rest")
    ]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 412, "height": 915})
        page = context.new_page()

        page.on("pageerror", lambda err: print("PAGE EXCEPTION:", err))
        page.on("console", lambda msg: print("CONSOLE:", msg.text))

        print("Navigating to app...")
        page.goto(f"http://localhost:{PORT}")
        page.wait_for_timeout(1500)

        # Dismiss splash screen
        page.evaluate("""() => {
            const splash = document.getElementById('splash-screen');
            if (splash) splash.style.display = 'none';
        }""")
        page.wait_for_timeout(500)

        for p_id, filename, name in prayers:
            print(f"\n--- Testing {name} Modal ---")
            page.evaluate(f"openImmersivePrayerModal('{p_id}')")
            page.wait_for_timeout(800)
            
            ref_text = page.inner_text("#prayer-modal-scripture-ref").strip()
            heading_text = page.inner_text("#prayer-modal-heading").strip()
            print(f"Ref: {ref_text} | Heading: {heading_text}")
            
            page.screenshot(path=os.path.join(DIRECTORY, filename))
            print(f"Saved screenshot: {filename}")

            page.evaluate("if (typeof window.closeImmersivePrayerModal === 'function') window.closeImmersivePrayerModal();")
            page.wait_for_timeout(300)

        browser.close()
        print("\nAll 4 Prayer Modals tested and captured successfully! 🎉")

if __name__ == "__main__":
    run_tests()
