import asyncio
from playwright.async_api import async_playwright

async def test_profile_click():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        page.on("console", lambda msg: print(f"[Browser Console] {msg.type}: {msg.text}", flush=True))

        print("Navigating to http://127.0.0.1:7880/index.html...", flush=True)
        await page.goto("http://127.0.0.1:7880/index.html")
        await page.wait_for_timeout(2000)

        # Inspect static-header-auth-btn visibility
        btn_visible = await page.is_visible("#static-header-auth-btn")
        print(f"#static-header-auth-btn visible: {btn_visible}", flush=True)

        # Click static-header-auth-btn
        print("Clicking #static-header-auth-btn...", flush=True)
        await page.click("#static-header-auth-btn", force=True)
        await page.wait_for_timeout(1000)

        # Check if auth modal or account drawer became visible
        auth_modal_visible = await page.is_visible("#modal-auth-login")
        drawer_visible = await page.is_visible("#drawer-account-settings")
        
        print(f"Auth Modal visible: {auth_modal_visible}", flush=True)
        print(f"Account Drawer visible: {drawer_visible}", flush=True)

        await page.screenshot(path="C:/Users/Gaurav.Salve/.gemini/antigravity/scratch/life-bible-mr/profile_click_test.png")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_profile_click())
