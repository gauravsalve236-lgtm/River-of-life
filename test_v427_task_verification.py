import http.server
import socketserver
import threading
import time
import os
import sys
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

PORT = 8111
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

        print("\n--- 1. Testing English Prayer Modal Rendering ---")
        page.evaluate("openImmersivePrayerModal('wedding_cana')")
        page.wait_for_timeout(1000)

        heading_eng = page.inner_text("#prayer-modal-heading")
        ref_eng = page.inner_text("#prayer-modal-scripture-ref")
        body_eng = page.inner_text("#prayer-modal-text-content")
        print(f"English Heading: {heading_eng}\nEnglish Ref: {ref_eng}\nEnglish Prayer Body Snippet: {body_eng[:120]}...")
        page.screenshot(path=os.path.join(DIRECTORY, "v427_verification_english_modal.png"))
        print("Saved screenshot: v427_verification_english_modal.png")

        print("\n--- 2. Testing Marathi Localization ---")
        page.evaluate("() => { if (typeof state !== 'undefined') state.translation = 'mr'; openImmersivePrayerModal('wedding_cana'); }")
        page.wait_for_timeout(1000)

        heading_mr = page.inner_text("#prayer-modal-heading")
        ref_mr = page.inner_text("#prayer-modal-scripture-ref")
        body_mr = page.inner_text("#prayer-modal-text-content")
        print(f"Marathi Heading: {heading_mr}\nMarathi Ref: {ref_mr}\nMarathi Prayer Body Snippet: {body_mr[:120]}...")
        page.screenshot(path=os.path.join(DIRECTORY, "v427_verification_marathi_modal.png"))
        print("Saved screenshot: v427_verification_marathi_modal.png")

        print("\n--- 3. Testing Backdrop Close Functionality ---")
        page.click(".prayer-immersive-backdrop")
        page.wait_for_timeout(500)
        is_visible = page.evaluate("() => { const m = document.getElementById('modal-immersive-prayer'); return m ? (m.style.display !== 'none') : false; }")
        print(f"Modal visible after backdrop click: {is_visible}")

        browser.close()

if __name__ == "__main__":
    run_test()
