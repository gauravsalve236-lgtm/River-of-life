import http.server
import socketserver
import threading
import time
import os
import sys
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

PORT = 8105
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

        print("\n--- Testing Large Hero Image Modal for Morning Prayer ---")
        page.evaluate("openImmersivePrayerModal('peace_guidance')")
        page.wait_for_timeout(1000)

        heading = page.inner_text("#prayer-modal-heading")
        ref = page.inner_text("#prayer-modal-scripture-ref")
        print(f"Heading: {heading} | Ref: {ref}")
        page.screenshot(path=os.path.join(DIRECTORY, "v421_large_hero_morning_prayer.png"))
        print("Saved screenshot: v421_large_hero_morning_prayer.png")

        print("\n--- Testing Large Hero Image Modal for Wedding at Cana ---")
        page.evaluate("openImmersivePrayerModal('wedding_cana')")
        page.wait_for_timeout(1000)

        heading_cana = page.inner_text("#prayer-modal-heading")
        ref_cana = page.inner_text("#prayer-modal-scripture-ref")
        print(f"Heading: {heading_cana} | Ref: {ref_cana}")
        page.screenshot(path=os.path.join(DIRECTORY, "v421_large_hero_wedding_cana.png"))
        print("Saved screenshot: v421_large_hero_wedding_cana.png")

        print("\n--- Testing Mute / Unmute Audio Toggle Pill ---")
        page.click("#btn-prayer-audio-toggle")
        page.wait_for_timeout(500)

        toggle_txt = page.inner_text("#btn-prayer-audio-toggle")
        print(f"Audio Toggle Pill Text after click: {toggle_txt}")

        browser.close()

if __name__ == "__main__":
    run_test()
