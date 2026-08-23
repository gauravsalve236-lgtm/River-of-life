import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 412, 'height': 915})
    page.goto('http://localhost:8092/index.html?v=v90_test_' + str(int(time.time())))
    time.sleep(4)
    
    # Hide notification modal & splash screen
    page.evaluate('''() => {
        const notif = document.getElementById('modal-notification-prompt');
        if (notif) {
            notif.style.display = 'none';
            notif.classList.remove('active');
        }
        const splash = document.getElementById('splash-screen');
        if (splash) splash.style.display = 'none';
    }''')
    time.sleep(0.5)
    
    # 1. Capture Home Page Header Logo (Transparent 44px)
    page.screenshot(path='v90_home_page_header_logo_verified.png')
    
    # 2. Join Live Meeting and capture native in-app view
    page.evaluate('''() => {
        if (window.triggerJoinMeetingFlow) window.triggerJoinMeetingFlow(1);
    }''')
    time.sleep(2.5)
    page.screenshot(path='v90_native_inapp_meeting_verified.png')

    browser.close()
    print('All native header logo & meeting room screenshots captured cleanly!')
