import http.server
import socketserver
import threading
import time
import os
import sys
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

PORT = 8097
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
        context = browser.new_context(viewport={"width": 412, "height": 915})
        page = context.new_page()

        print("Navigating to app...")
        page.goto(f"http://localhost:{PORT}")
        page.wait_for_timeout(300)

        # Capture White Splash Screen
        page.screenshot(path=os.path.join(DIRECTORY, "splash_screen_white.png"))

        # Dismiss splash screen
        page.evaluate("""() => {
            const splash = document.getElementById('splash-screen');
            if (splash) splash.style.display = 'none';
        }""")
        page.wait_for_timeout(500)

        print("\n--- 1. Testing Immersive Prayer Modal Component ---")
        page.evaluate("openImmersivePrayerModal('wedding_cana')")
        page.wait_for_timeout(800)
        
        prayer_modal = page.query_selector("#modal-immersive-prayer")
        assert prayer_modal is not None, "Immersive prayer modal element missing"
        
        ref_text = page.inner_text("#prayer-modal-scripture-ref").strip()
        print(f"Scripture Ref Rendered: {ref_text}")
        assert "JOHN 2:1-11" in ref_text or "योहान २:१-११" in ref_text
        
        page.screenshot(path=os.path.join(DIRECTORY, "prayer_modal_immersive.png"))
        print("Saved screenshot: prayer_modal_immersive.png")

        # Close modal
        page.evaluate("if (typeof window.closeImmersivePrayerModal === 'function') window.closeImmersivePrayerModal();")
        page.wait_for_timeout(300)

        page.screenshot(path=os.path.join(DIRECTORY, "youversion_today_view.png"))

        browser.close()
        print("\nImmersive Prayer Modal Component tested successfully! 🎉")

if __name__ == "__main__":
    run_tests()
