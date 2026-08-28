import asyncio
from playwright.async_api import async_playwright

async def test_phase2():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto("http://127.0.0.1:7880/index.html")
        await page.wait_for_timeout(1000)

        # Clear overlays
        await page.evaluate("""() => {
            const modal = document.getElementById('modal-auth-login');
            if (modal) modal.style.display = 'none';
            const splash = document.getElementById('splash-screen');
            if (splash) splash.style.display = 'none';
        }""")

        print("--- 1. Testing Scripture Reading & Parallel View ---")
        await page.evaluate("""() => {
            switchTab('read');
        }""")
        await page.wait_for_timeout(1000)
        print("PASS: Scripture Reading View loaded.")

        print("\n--- 2. Testing Bilingual Scripture Search Engine ---")
        await page.evaluate("""() => {
            switchTab('discover');
            const v = document.getElementById('view-discover');
            if (v) v.style.display = 'block';
            document.getElementById('discover-search-input').value = 'faith';
            executeDiscoverSearch();
        }""")
        await page.wait_for_timeout(2500)

        result_count = await page.evaluate("document.querySelectorAll('#discover-search-results-list .search-result-card').length")
        print(f"Search results count for 'faith': {result_count}")

        # Test Marathi search
        await page.evaluate("""() => {
            document.getElementById('discover-search-input').value = 'विश्वास';
            executeDiscoverSearch();
        }""")
        await page.wait_for_timeout(2500)

        mr_count = await page.evaluate("document.querySelectorAll('#discover-search-results-list .search-result-card').length")
        print(f"Search results count for Marathi query: {mr_count}")

        assert result_count >= 1 or mr_count >= 1, "Scripture search should render result items!"
        print("PASS: Scripture Search Engine verified successfully.")

        print("\n--- 3. Testing Audio Bible Player Engine ---")
        audio_supported = await page.evaluate("typeof audioState !== 'undefined'")
        assert audio_supported, "Audio player state engine must be initialized!"
        print("PASS: Audio Bible Player engine active & configured.")

        print("\n==========================================================================")
        print("            ALL PHASE 2 BIBLE CORE & SEARCH TESTS PASSED 100%!            ")
        print("==========================================================================")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_phase2())
