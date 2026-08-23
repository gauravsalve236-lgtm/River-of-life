import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 412, 'height': 915})
    page.goto('http://localhost:8092/index.html?v=v88_test_' + str(int(time.time())))
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
    
    # 1. Capture Hymn Detail in Default Dark Mode (ios-theme-dark)
    page.evaluate('''() => {
        document.body.className = "ios-theme-dark";
        if (window.openHymnDetail) window.openHymnDetail(1);
    }''')
    time.sleep(1)
    page.screenshot(path='v88_hymn_dark_theme_verified.png')
    page.evaluate('closeModal("modal-hymn-detail")')
    time.sleep(0.5)

    # 2. Capture Hymn Detail in Light Mode (ios-theme-light)
    page.evaluate('''() => {
        document.body.className = "ios-theme-light";
        if (window.openHymnDetail) window.openHymnDetail(1);
    }''')
    time.sleep(1)
    page.screenshot(path='v88_hymn_light_theme_verified.png')

    browser.close()
    print('All multi-theme hymn screenshots captured cleanly!')
