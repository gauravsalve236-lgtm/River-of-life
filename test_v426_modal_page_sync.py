import http.server
import socketserver
import threading
import time
import os
import sys
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

PORT = 8110
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

        print("\n--- Testing openPrayerStoryPage('wedding_cana') ---")
        page.evaluate("openPrayerStoryPage('wedding_cana')")
        page.wait_for_timeout(1000)

        heading = page.inner_text("#prayer-modal-heading")
        ref = page.inner_text("#prayer-modal-scripture-ref")
        body = page.inner_text("#prayer-modal-text-content")
        print(f"Heading: {heading} | Ref: {ref}\nBody: {body[:150]}...")
        page.screenshot(path=os.path.join(DIRECTORY, "v426_story_page_modal_sync.png"))
        print("Saved screenshot: v426_story_page_modal_sync.png")

        browser.close()

if __name__ == "__main__":
    run_test()
