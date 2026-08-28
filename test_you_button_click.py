import asyncio
from playwright.async_api import async_playwright

async def test_you_button_click():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        print("Navigating to http://127.0.0.1:7880/index.html...", flush=True)
        await page.goto("http://127.0.0.1:7880/index.html")
        await page.wait_for_timeout(1000)

        res = await page.evaluate("""() => {
            window.openAuthModal();
            const m = document.getElementById("modal-auth-login");
            const rect = m.getBoundingClientRect();
            const comp = window.getComputedStyle(m);
            return {
                width: rect.width,
                height: rect.height,
                top: rect.top,
                left: rect.left,
                opacity: comp.opacity,
                visibility: comp.visibility,
                display: comp.display,
                zIndex: comp.zIndex,
                pointerEvents: comp.pointerEvents,
                childCount: m.children.length,
                parentTag: m.parentElement ? m.parentElement.tagName + '#' + m.parentElement.id : 'none'
            };
        }""")
        print(f"Modal computed styles & bounding rect: {res}", flush=True)

        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_you_button_click())
