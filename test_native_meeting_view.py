import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 412, 'height': 915})
    page.goto('http://localhost:8092/index.html?v=v102_test_' + str(int(time.time())))
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
        
        // Trigger iPhone Mic guide modal directly for testing
        if (window.showIPhoneMicGuideModal) {
            window.showIPhoneMicGuideModal();
        }
    }''')
    time.sleep(2.5)
    page.screenshot(path='v102_iphone_mic_guide_verified.png')

    browser.close()
    print('iPhone Mic guide modal screenshot captured cleanly!')
