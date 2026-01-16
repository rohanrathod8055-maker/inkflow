import os
import time
import random
import cloudscraper
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from urllib.parse import urljoin
from datetime import datetime, timezone

# Load environment variables
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

def get_series_by_title(title):
    # Sanitize title for URL param
    safe_title = title.replace("'", "''") 
    url = f"{SUPABASE_URL}/rest/v1/series?title=eq.{safe_title}&select=id"
    try:
        response = requests.get(url, headers=HEADERS)
        if response.status_code == 200:
            data = response.json()
            return data[0] if data else None
        return None
    except Exception as e:
        print(f"Error checking series: {e}")
        return None

def upsert_series(title, description, cover_url, source_url):
    try:
        existing = get_series_by_title(title)
        
        payload = {
            "title": title,
            "description": description,
            "cover_image_url": cover_url,
            "status": "ongoing",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

        if existing:
            # Update
            url = f"{SUPABASE_URL}/rest/v1/series?id=eq.{existing['id']}"
            requests.patch(url, headers=HEADERS, json=payload)
        else:
            # Insert
            url = f"{SUPABASE_URL}/rest/v1/series"
            res = requests.post(url, headers=HEADERS, json=payload)
            if res.status_code < 300:
                print(f"  [INSERTED] {title}")
            else:
                print(f"  [ERROR] Insert failed: {res.text}")
            
    except Exception as e:
        print(f"  [ERROR] Upsert failed for {title}: {e}")

def scrape_page(scraper, url):
    try:
        response = scraper.get(url)
        if response.status_code != 200:
            print(f"  [ERROR] Failed to fetch {url} (Status: {response.status_code})")
            return 0

        soup = BeautifulSoup(response.text, 'html.parser')
        
        # --- Universal Selector Strategy ---
        # 1. Find all links
        links = soup.find_all('a', href=True)
        
        # 2. Filter for 'series/' (Asura uses relative paths like "series/name")
        series_links = [l for l in links if l.get('href') and ('series/' in l['href'] or 'manga/' in l['href'])]
        
        # 3. Deduplicate
        seen_urls = set()
        unique_entries = []
        
        for link in series_links:
            href = link['href']
            # Handle relative URL correctly
            full_url = urljoin(url, href)
            
            if full_url in seen_urls:
                continue
            seen_urls.add(full_url)
            unique_entries.append(link)

        count = 0
        for link in unique_entries:
            try:
                # Extract Data
                # Title: X-Ray found it in <span class="block text-[13.3px] font-bold">
                title_span = link.find('span', class_=lambda x: x and 'font-bold' in x and 'block' in x)
                
                if title_span:
                    title = title_span.get_text(strip=True)
                else:
                    # Fallback: strict strip
                    title = link.get_text(strip=True)

                # Filter out "Chapter" or empty titles
                if not title or (title.startswith("Chapter") and len(title) < 20):
                    continue

                full_url = urljoin(url, link['href'])

                # Image
                img_tag = link.find('img')
                if not img_tag:
                    # Try finding previous sibling?
                    pass
                
                cover_url = img_tag['src'] if img_tag and 'src' in img_tag.attrs else ""
                
                print(f"  [FOUND] {title[:30]}... - {full_url}")

                upsert_series(title, f"Imported from {full_url}", cover_url, full_url)
                count += 1
                
            except Exception as e:
                # print(f"Error parsing link: {e}")
                continue

        return count

    except Exception as e:
        print(f"  [CRITICAL] Error scraping page: {e}")
        return 0

def main():
    print("=== Supabase Bulk Manga Importer (GOD MODE) ===")
    
    # Helper to allow piping or manual input
    try:
        default_url = "https://asuracomic.net/series?page="
        base_url = input(f"Enter the base URL (default: {default_url}): ").strip()
        if not base_url:
            base_url = default_url
    except EOFError:
        base_url = "https://asuracomic.net/series?page="

    print(f"\nStarting GOD MODE scrape on {base_url}...")
    scraper = cloudscraper.create_scraper()

    total_series = 0
    page = 1
    
    while True:
        target_url = f"{base_url}{page}"
        print(f"[PAGE {page}] Scraping {target_url}...")
        
        found = scrape_page(scraper, target_url)
        
        if found == 0:
            print(f"  -> Found 0 series. Assuming end of library (or IP block).")
            print("  Library Import Complete.")
            break
            
        total_series += found
        print(f"  -> Found {found} series. Total so far: {total_series}")
        
        sleep_time = random.uniform(3, 6)
        print(f"  Sleeping {sleep_time:.2f}s...")
        time.sleep(sleep_time)
        
        page += 1

    print(f"\nJob Complete! Total Series Processed: {total_series}")

if __name__ == "__main__":
    main()
