import sys
import os
import asyncio
from playwright.async_api import async_playwright

async def main():
    if len(sys.argv) < 2:
        print("Usage: python quick_scrape.py <url>")
        return

    url = sys.argv[1]
    
    # Use absolute path for profile to avoid CWD issues
    # This creates a folder 'chrome_profile' in the project root to store cookies
    user_data_dir = os.path.join(os.getcwd(), 'chrome_profile')
    
    try:
        async with async_playwright() as p:
            # Launch PERSISTENT context to save Cloudflare cookies
            # Note: launch_persistent_context returns a BrowserContext, not a Browser
            context = await p.chromium.launch_persistent_context(
                user_data_dir,
                headless=True,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-infobars",
                    "--window-position=0,0",
                    "--ignore-certificate-errors",
                    "--ignore-certificate-errors-spki-list",
                    "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                ],
                viewport={'width': 1920, 'height': 1080}
            )
            
            # In persistent context, pages are already there or we use the first one
            page = context.pages[0] if context.pages else await context.new_page()
            
            # STEALTH: Remove webdriver property
            await page.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                });
            """)

            # Go to URL
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=60000)
            except:
                pass # Timeout is fine if DOM loaded

            # CF Check Loop: Wait for "Just a moment..." to disappear
            for _ in range(30):
                title = await page.title()
                if "Just a moment" not in title and "Cloudflare" not in title:
                    break
                # Helper: Random mouse movements to prove humanity during check
                try:
                     await page.mouse.move(100 + _*10, 100 + _*10)
                except: pass
                await asyncio.sleep(1)

            # Try to wait for the specific reader element
            try:
                await page.wait_for_selector("#readerarea", state="attached", timeout=15000)
            except:
                pass # Proceed anyway
            
            content = await page.content()
            
            # Print content to stdout strictly using utf-8
            sys.stdout.buffer.write(content.encode('utf-8'))
            
            # Close context (saves cookies to user_data_dir)
            await context.close()
            
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
