import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    page.goto('http://localhost:8092/index.html?v=v113_test_' + str(int(time.time())))
    time.sleep(3.5)
    
    # Hide notification modal & splash screen
    page.evaluate('''() => {
        const notif = document.getElementById('modal-notification-prompt');
        if (notif) {
            notif.style.display = 'none';
            notif.classList.remove('active');
        }
        const splash = document.getElementById('splash-screen');
        if (splash) splash.style.display = 'none';
        
        // Launch live meeting room modal directly
        if (window.triggerJoinMeetingFlow) {
            window.triggerJoinMeetingFlow('meeting_1723046400000');
        }
    }''')
    time.sleep(3.5)
    page.screenshot(path='v113_chrome_desktop_stage_verified.png')

    browser.close()
    print('Desktop Chrome meeting view screenshot captured cleanly!')
