import http.server
import socketserver
import threading
import time
import os
import sys
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

PORT = 8101
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

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
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

        print("\n--- Test 1: Clicking 'View All ➔' ---")
        view_all_btn = page.query_selector("button:has-text('View All')")
        if view_all_btn:
            view_all_btn.click()
            page.wait_for_timeout(1000)

            gallery_visible = page.evaluate("() => { const v = document.getElementById('view-daily-prayers-gallery'); return v && v.classList.contains('active'); }")
            pastor_visible = page.evaluate("() => { const v = document.getElementById('view-prayers'); return v && v.classList.contains('active'); }")
            print(f"Gallery View Active: {gallery_visible} | Pastor Request View Active: {pastor_visible}")
            page.screenshot(path=os.path.join(DIRECTORY, "v417_daily_prayers_gallery.png"))
            print("Saved screenshot: v417_daily_prayers_gallery.png")
        else:
            print("View All button not found!")

        print("\n--- Test 2: Clicking Morning Prayer Card from Gallery ---")
        morning_card = page.query_selector("#view-daily-prayers-gallery div:has-text('Morning Prayer')")
        if morning_card:
            morning_card.click()
            page.wait_for_timeout(1000)

            story_page_visible = page.evaluate("() => { const v = document.getElementById('view-immersive-prayer-story'); return v && v.classList.contains('active'); }")
            heading = page.inner_text("#page-prayer-heading")
            ref = page.inner_text("#page-prayer-scripture-ref")
            print(f"Story Page Active: {story_page_visible} | Heading: {heading} | Ref: {ref}")
            page.screenshot(path=os.path.join(DIRECTORY, "v417_prayer_story_page.png"))
            print("Saved screenshot: v417_prayer_story_page.png")
        else:
            print("Morning Prayer card not found in gallery!")

        browser.close()

if __name__ == "__main__":
    run_tests()
