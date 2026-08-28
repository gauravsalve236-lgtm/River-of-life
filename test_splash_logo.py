import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 412, 'height': 915})
    page.goto('http://localhost:8092/index.html?v=v89_test_' + str(int(time.time())))
    
    # Capture splash screen logo immediately
    time.sleep(1)
    page.screenshot(path='v89_splash_logo_verified.png')
    
    # Hide splash screen and capture home screen hero logo
    time.sleep(3.5)
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
    page.screenshot(path='v89_hero_logo_verified.png')

    browser.close()
    print('All splash & hero logo screenshots captured cleanly!')
