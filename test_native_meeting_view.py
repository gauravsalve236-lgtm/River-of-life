import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 412, 'height': 915})
    page.goto('http://localhost:8092/index.html?v=v108_test_' + str(int(time.time())))
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
        if (window.launchLiveMeetingRoom) {
            window.launchLiveMeetingRoom({ id: 1, title: 'River of Life Live Fellowship Room' }, null);
        }
    }''')
    time.sleep(3.5)
    page.screenshot(path='v108_unique_username_fix_verified.png')

    browser.close()
    print('Unique username fix meeting room screenshot captured cleanly!')
