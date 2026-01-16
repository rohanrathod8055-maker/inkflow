import os
import time
import random
import re
import cloudscraper
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from urllib.parse import urljoin

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

def get_all_series():
    url = f"{SUPABASE_URL}/rest/v1/series?select=id,title,description&status=eq.ongoing"
    try:
        response = requests.get(url, headers=HEADERS)
        if response.status_code == 200:
            return response.json()
        print(f"Error fetching series: {response.text}")
        return []
    except Exception as e:
        print(f"Error fetching series: {e}")
        return []

def get_existing_chapters(series_id):
    url = f"{SUPABASE_URL}/rest/v1/chapters?series_id=eq.{series_id}&select=chapter_number"
    try:
        response = requests.get(url, headers=HEADERS)
        if response.status_code == 200:
            return {c['chapter_number'] for c in response.json()}
        return set()
    except Exception as e:
        # If it's a 404/empty, just return empty set
        return set()

def backfill_chapters():
    print("=== Supabase Chapter Backfiller (Universal Discovery) ===")
    
    series_list = get_all_series()
    print(f"Found {len(series_list)} series to check.")
    
    scraper = cloudscraper.create_scraper()
    
    for i, series in enumerate(series_list):
        series_id = series['id']
        title = series['title']
        description = series.get('description', '') or ''
        
        # 1. Extract URL
        source_url = description.replace('Imported from ', '').strip()
        
        if not source_url.startswith('http'):
            # print(f"[{i+1}/{len(series_list)}] Skipping '{title}': No valid URL.")
            continue

        print(f"\n[{i+1}/{len(series_list)}] Checking '{title}'...")
        # print(f"  URL: {source_url}")

        # Fetch existing chapters to avoid duplicates
        existing_chapters = get_existing_chapters(series_id)
        
        try:
            # 2. Universal Scrape
            response = scraper.get(source_url)
            if response.status_code != 200:
                print(f"  [ERROR] Failed to fetch. Status: {response.status_code}")
                continue

            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 3. Find ALL Links
            all_links = soup.find_all('a', href=True)
            
            chapters_to_insert = []
            seen_nums = set()
            
            for link in all_links:
                href = link['href']
                text = link.get_text(strip=True)
                
                # 4. Filter: Link or text must match 'chapter' (case-insensitive)
                if 'chapter' not in href.lower() and 'chapter' not in text.lower():
                    continue
                
                # 5. Data Extraction
                chap_num = None
                
                # Try regex on text (Handle "Chapter 14", "Chapter14", "Ch. 14")
                # now allows 0 spaces
                match_text = re.search(r'(?:Chapter|Ch\.?|Ep\.?)\s*(\d+(\.\d+)?)', text, re.IGNORECASE)
                if match_text:
                    chap_num = float(match_text.group(1))
                else:
                    # Fallback: Try regex on HREF "chapter/14"
                    match_href = re.search(r'chapter/(\d+(\.\d+)?)', href, re.IGNORECASE)
                    if match_href:
                        chap_num = float(match_href.group(1))

                if chap_num is None:
                    continue
                
                # Dedupe within this run
                if chap_num in seen_nums:
                    continue
                
                # Dedupe against database
                if chap_num in existing_chapters:
                    continue
                    
                seen_nums.add(chap_num)
                
                # Clean title: "Chapter X"
                chap_title = f"Chapter {chap_num:g}" # :g removes trailing zeros if integer
                
                # Handle relative URL
                full_url = urljoin(source_url, href)
                
                chapters_to_insert.append({
                    "series_id": series_id,
                    "title": chap_title,
                    "chapter_number": chap_num,
                    "source_url": full_url
                })
            
            found_count = len(chapters_to_insert)
            
            if found_count > 0:
                # Batch Insert
                url = f"{SUPABASE_URL}/rest/v1/chapters"
                res = requests.post(url, headers=HEADERS, json=chapters_to_insert)
                if res.status_code < 300:
                    print(f"  [SUCCESS] Found {found_count} new chapters.")
                else:
                    print(f"  [ERROR] Insert failed: {res.text}")
            else:
                total_found = len(seen_nums) # Includes existing ones we skipped
                if total_found > 0:
                     print(f"  [INFO] Found {total_found} chapters (all already exist).")
                else:
                     print(f"  [WARNING] Found 0 chapters. Check selectors/regex.")

        except Exception as e:
            print(f"  [CRITICAL] Error: {e}")

        # Safety Sleep
        sleep_time = random.uniform(3, 6)
        # print(f"  Sleeping {sleep_time:.2f}s...")
        time.sleep(sleep_time)

if __name__ == "__main__":
    backfill_chapters()
