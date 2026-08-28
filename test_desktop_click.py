import http.server
import socketserver
import threading
import time
import os
import sys
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

PORT = 8100
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

def test_desktop():
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    time.sleep(1.5)

    print("Server started on port", PORT)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # DESKTOP VIEWPORT
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        page.on("console", lambda msg: print("CONSOLE:", msg.text))
        page.on("pageerror", lambda err: print("PAGE ERROR:", err))

        print("Navigating to app on Desktop Viewport (1280x800)...")
        page.goto(f"http://localhost:{PORT}")
        page.wait_for_timeout(2000)

        # Dismiss splash screen
        page.evaluate("""() => {
            const splash = document.getElementById('splash-screen');
            if (splash) splash.style.display = 'none';
        }""")
        page.wait_for_timeout(500)

        # Find all prayer cards
        cards = page.query_selector_all(".prayer-image-card")
        print(f"Found {len(cards)} prayer cards on desktop layout!")

        if len(cards) > 0:
            print("\nClicking Morning Prayer card on Desktop...")
            cards[0].click()
            page.wait_for_timeout(1000)

            is_visible = page.evaluate("() => { const m = document.getElementById('modal-immersive-prayer'); return m && getComputedStyle(m).display !== 'none'; }")
            heading = page.inner_text("#prayer-modal-heading")
            ref = page.inner_text("#prayer-modal-scripture-ref")
            print(f"Desktop Modal Visible: {is_visible} | Heading: {heading} | Ref: {ref}")
            page.screenshot(path=os.path.join(DIRECTORY, "desktop_prayer_modal.png"))
            print("Saved screenshot: desktop_prayer_modal.png")
        else:
            print("ERROR: No .prayer-image-card elements found on Desktop layout!")

        browser.close()

if __name__ == "__main__":
    test_desktop()
