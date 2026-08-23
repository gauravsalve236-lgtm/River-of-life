import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 412, 'height': 915})
    page.goto('http://localhost:8092/index.html?v=v85_test_' + str(int(time.time())))
    time.sleep(4)
    
    # Hide notification modal & splash
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
    page.screenshot(path='v85_clean_home_view.png')
    
    # 1. Click Hymn tab in bottom menu
    page.evaluate('switchTab("hymnal")')
    time.sleep(1)
    page.screenshot(path='v85_hymns_tab_view.png')

    # 2. Click Prayer Meeting tab in bottom menu
    page.evaluate('switchTab("meetings")')
    time.sleep(1)
    page.screenshot(path='v85_prayer_meeting_tab_view.png')

    browser.close()
    print('All 5-tab clean screenshots captured cleanly!')
