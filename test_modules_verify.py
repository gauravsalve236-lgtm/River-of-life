import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 412, 'height': 915})
    page.goto('http://localhost:8092/index.html?v=fresh_' + str(int(time.time())))
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
    page.screenshot(path='v84_verified_modules_home.png')
    
    # 1. Share Studio
    page.evaluate('''() => {
        const modal = document.getElementById('modal-share-studio');
        if (modal) modal.style.display = 'flex';
        if (window.renderShareStudioCanvas) window.renderShareStudioCanvas('river_teal');
    }''')
    time.sleep(1)
    page.screenshot(path='v84_verified_share_studio.png')
    page.evaluate('document.getElementById("modal-share-studio").style.display = "none"')
    
    # 2. Hymnal Hub
    page.evaluate('''() => {
        const modal = document.getElementById('modal-hymnal-hub');
        if (modal) modal.style.display = 'flex';
        if (window.renderHymnList) window.renderHymnList(window.MARATHI_HYMNAL || []);
    }''')
    time.sleep(1)
    page.screenshot(path='v84_verified_hymnal_hub.png')
    page.evaluate('document.getElementById("modal-hymnal-hub").style.display = "none"')

    # 3. Quiz Hub
    page.evaluate('''() => {
        const modal = document.getElementById('modal-quiz-hub');
        if (modal) modal.style.display = 'flex';
        if (window.renderQuizQuestion) window.renderQuizQuestion();
    }''')
    time.sleep(1)
    page.screenshot(path='v84_verified_quiz_hub.png')
    page.evaluate('document.getElementById("modal-quiz-hub").style.display = "none"')

    # 4. Church Directory
    page.evaluate('''() => {
        const modal = document.getElementById('modal-church-directory');
        if (modal) modal.style.display = 'flex';
        if (window.openChurchDirectory) window.openChurchDirectory();
    }''')
    time.sleep(1)
    page.screenshot(path='v84_verified_church_directory.png')
    page.evaluate('document.getElementById("modal-church-directory").style.display = "none"')

    browser.close()
    print('All screenshots captured cleanly!')
