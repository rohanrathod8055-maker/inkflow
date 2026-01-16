import asyncio
import os
import re
from datetime import datetime, timezone
from urllib.parse import urljoin

import httpx
from playwright.async_api import async_playwright
from dotenv import load_dotenv

load_dotenv('.env.local')

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing Supabase credentials in .env.local")
    exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# --- Database Helpers ---

async def get_series_by_title(client, title):
    url = f"{SUPABASE_URL}/rest/v1/series?title=eq.{title}&select=id,title"
    try:
        response = await client.get(url, headers=HEADERS)
        response.raise_for_status()
        data = response.json()
        return data[0] if data else None
    except Exception as e:
        print(f"Error checking series existence: {e}")
        return None

async def get_latest_chapter(client, series_id):
    url = f"{SUPABASE_URL}/rest/v1/chapters?series_id=eq.{series_id}&select=chapter_number&order=chapter_number.desc&limit=1"
    try:
        response = await client.get(url, headers=HEADERS)
        response.raise_for_status()
        data = response.json()
        return data[0]['chapter_number'] if data else 0
    except Exception as e:
        print(f"Error fetching latest chapter: {e}")
        return 0

async def upsert_series(client, title, description, cover_url, status="ongoing"):
    url = f"{SUPABASE_URL}/rest/v1/series"
    payload = {
        "title": title,
        "description": description,
        "cover_image_url": cover_url,
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    existing = await get_series_by_title(client, title)
    
    try:
        if existing:
            patch_url = f"{SUPABASE_URL}/rest/v1/series?id=eq.{existing['id']}"
            response = await client.patch(patch_url, headers=HEADERS, json=payload)
            response.raise_for_status()
            print(f"Updated series: {title}")
            return existing['id']
        else:
            response = await client.post(url, headers=HEADERS, json=payload)
            response.raise_for_status()
            data = response.json()
            print(f"Inserted new series: {title}")
            return data[0]['id']
    except Exception as e:
        print(f"Error upserting series {title}: {e}")
        return None

async def insert_chapters(client, series_id, chapters):
    url = f"{SUPABASE_URL}/rest/v1/chapters"
    headers = HEADERS.copy()
    headers['Prefer'] = 'resolution=ignore-duplicates'
    
    payloads = []
    for ch in chapters:
        payloads.append({
            "series_id": series_id,
            "chapter_number": ch['number'],
            "title": ch.get('title', f"Chapter {ch['number']}"),
            "source_url": ch['url'],
            "release_date": datetime.now(timezone.utc).isoformat()
        })
        
    if not payloads:
        return

    try:
        response = await client.post(url, headers=headers, json=payloads)
        response.raise_for_status()
        # print(f"Inserted/Ignored {len(payloads)} chapters for Series ID {series_id}")
    except Exception as e:
        print(f"Error batch inserting chapters: {e}")


# --- Scraper Logic ---

async def parse_number(text):
    match = re.search(r'(\d+(\.\d+)?)', text)
    if match:
        return float(match.group(1))
    return 0.0

async def scrape_series_details_and_chapters(page, series_url, title_hint=None):
    print(f"Visiting series page: {series_url}")
    await page.goto(series_url, wait_until="domcontentloaded")
    
    # Metadata
    # Title: Found as span.text-xl.font-bold
    title_el = await page.query_selector('span.text-xl.font-bold')
    title = await title_el.inner_text() if title_el else (title_hint or "Unknown")
    
    # Description
    description = ""
    # Strategy 2: Specific class found in debug
    desc_el = await page.query_selector(r'span.font-medium.text-sm.text-\[\#A2A2A2\]')
    if desc_el:
        description = await desc_el.inner_text()
        
    # Cover Image
    cover_el = await page.query_selector('img.rounded.mx-auto')
    if not cover_el:
        cover_el = await page.query_selector('img[alt="' + title + '"]')
        
    cover_url = await cover_el.get_attribute('src') if cover_el else ""
    
    if not cover_url:
         # Fallback
         cover_el = await page.query_selector('.grid img') 
         if cover_el:
            cover_url = await cover_el.get_attribute('src')

    status = "ongoing"

    # Chapters
    chapter_links = await page.query_selector_all('a[href*="/chapter/"]')
    
    chapters = []
    seen_nums = set()
    
    for link in chapter_links:
        href = await link.get_attribute('href')
        text = await link.inner_text()
        num = await parse_number(text)
        if num == 0 and "prologue" not in text.lower():
             num = await parse_number(href)
             
        if num not in seen_nums:
            seen_nums.add(num)
            chapters.append({
                "number": num,
                "url": href,
                "title": text.strip()
            })
            
    print(f"Scraped {len(chapters)} chapters for {title}")
    return {
        "title": title,
        "description": description,
        "cover_url": cover_url,
        "status": status,
        "chapters": chapters
    }

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # 1. Go to Homepage
        print("Scraper Started. Navigating to https://asuracomic.net/ ...")
        await page.goto("https://asuracomic.net/", wait_until="domcontentloaded")
        
        # 2. Extract Data from Homepage Grid
        # Selector for series card: div.w-full.p-1.border-b-\[1px\].border-b-\[\#312f40\]
        cards = await page.query_selector_all(r'div.w-full.p-1.border-b-\[1px\].border-b-\[\#312f40\]')
        print(f"Found {len(cards)} series cards on homepage.")
        
        series_candidates = []
        for card in cards:
            try:
                # Title & Link Selector: span.text-\[15px\].font-medium a
                title_link_el = await card.query_selector(r'span.text-\[15px\].font-medium a')
                if title_link_el:
                     title = await title_link_el.inner_text()
                     href = await title_link_el.get_attribute('href')
                     full_url = urljoin("https://asuracomic.net/", href)
                     
                     # Latest Chapter Selector: div.flex.flex-col.gap-y-1.5 a p
                     # Finding the chapter text is slightly nested
                     latest_ch_text = "0"
                     ch_el = await card.query_selector(r'div.flex.flex-col.gap-y-1.5 a')
                     if ch_el:
                         latest_ch_text = await ch_el.inner_text()
                     
                     latest_ch_num = await parse_number(latest_ch_text)
                     
                     series_candidates.append({
                         "title": title.strip(),
                         "url": full_url,
                         "latest_chapter": latest_ch_num
                     })
            except Exception as e:
                print(f"Error parsing card: {e}")
                continue

        print(f"Successfully parsed {len(series_candidates)} candidates.")
        
        async with httpx.AsyncClient() as client:
            for candidate in series_candidates:
                url = candidate['url']
                title = candidate['title']
                home_latest_chapter = candidate['latest_chapter']
                
                print(f"Processing: {title} (Latest: {home_latest_chapter})")

                try:
                    # Smart Logic Check
                    existing = await get_series_by_title(client, title)
                    
                    if existing:
                        db_latest = await get_latest_chapter(client, existing['id'])
                        if home_latest_chapter <= db_latest and home_latest_chapter > 0:
                            print(f"  [SKIP] Up to date (DB: {db_latest}, Web: {home_latest_chapter})")
                            continue
                        else:
                            print(f"  [UPDATE] Checking for new chapters (DB: {db_latest}, Web: {home_latest_chapter})")
                    else:
                        print("  [NEW] Series detected.")

                    # If not skipped, scrape detailed page
                    data = await scrape_series_details_and_chapters(page, url, title_hint=title)
                    
                    if not data['title'] or data['title'] == "Unknown":
                        print("  [ERROR] Missing title after scrape.")
                        continue
                        
                    series_id = existing['id'] if existing else None
                    if not existing:
                        series_id = await upsert_series(client, data['title'], data['description'], data['cover_url'], data['status'])
                    
                    # Insert all chapters (duplicates ignored by DB)
                    if series_id:
                        await insert_chapters(client, series_id, data['chapters'])
                        print(f"  [SUCCESS] Synced {title}")

                except Exception as e:
                    print(f"  [ERROR] Failed to process {title}: {e}")
                    continue
                
                print("-" * 20)

        await browser.close()
        print("Auto-discovery complete.")

if __name__ == "__main__":
    asyncio.run(main())
