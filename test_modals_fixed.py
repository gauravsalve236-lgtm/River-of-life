import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 412, 'height': 915})
    page.goto('http://localhost:8092/index.html?v=v87_test_' + str(int(time.time())))
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
    
    # 1. Open Church Directory Modal
    page.evaluate('''() => {
        if (window.openChurchDirectory) window.openChurchDirectory();
    }''')
    time.sleep(1)
    page.screenshot(path='v87_verified_church_directory_fixed.png')
    page.evaluate('closeModal("modal-church-directory")')
    time.sleep(0.5)

    # 2. Open Hymn Detail Modal
    page.evaluate('''() => {
        if (window.openHymnDetail) window.openHymnDetail(1);
    }''')
    time.sleep(1)
    page.screenshot(path='v87_verified_hymn_detail_fixed.png')
    page.evaluate('closeModal("modal-hymn-detail")')

    browser.close()
    print('All fixed modal screenshots captured cleanly!')
