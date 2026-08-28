import http.server
import socketserver
import threading
import time
import os
import sys
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

PORT = 8117
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

        print("\n--- 1. Testing Clean Home View (No Clutter Emojis, Conditional Banner Hidden) ---")
        page.screenshot(path=os.path.join(DIRECTORY, "v434_clean_home_view_ui.png"))
        print("Saved screenshot: v434_clean_home_view_ui.png")

        print("\n--- 2. Clicking Wedding at Cana Prayer Card ---")
        page.click(".prayer-image-card[data-prayer-id='wedding_cana']")
        page.wait_for_timeout(1000)

        page.screenshot(path=os.path.join(DIRECTORY, "v434_exact_mockup_modal_opened.png"))
        print("Saved screenshot: v434_exact_mockup_modal_opened.png")

        browser.close()

if __name__ == "__main__":
    run_test()
