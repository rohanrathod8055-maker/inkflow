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
    # Fetch series even if status is not ongoing, just in case
    url = f"{SUPABASE_URL}/rest/v1/series?select=id,title,description&order=updated_at.desc"
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
        return set()

def update_series_description(series_id, description):
    url = f"{SUPABASE_URL}/rest/v1/series?id=eq.{series_id}"
    payload = {"description": description.strip()}
    try:
        requests.patch(url, headers=HEADERS, json=payload)
    except Exception as e:
        print(f"Error updating description: {e}")

def fix_metadata_and_backfill():
    print("=== Fix Metadata & Fast Backfill ===")
    
    series_list = get_all_series()
    print(f"Found {len(series_list)} series.")
    
    scraper = cloudscraper.create_scraper()
    
    for i, series in enumerate(series_list):
        series_id = series['id']
        title = series['title']
        current_desc = series.get('description', '') or ''
        
        # 1. Extract URL logic
        source_url = ""
        if "Imported from " in current_desc:
            source_url = current_desc.replace('Imported from ', '').strip()
        elif current_desc.startswith('http'):
            source_url = current_desc.strip()
            
        if not source_url.startswith('http'):
             # If it's real text or empty, validation check?
             # User specifically said "The Description is just a URL (e.g., 'Imported from...')."
             # So we skip if we can't find a URL.
            # print(f"[{i+1}] Skipping '{title}': Description seems valid or no URL.")
            continue

        print(f"\n[{i+1}/{len(series_list)}] Visiting '{title}'...")

        try:
            # 2. Scrape Page
            response = scraper.get(source_url)
            if response.status_code != 200:
                print(f"  [ERROR] Failed to load page: {response.status_code}")
                continue
                
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # --- 3. Scrape Description ---
            # Try multiple selectors
            new_description = ""
            desc_selectors = [
                '.entry-content p', 
                '.synopsis p', 
                'div[itemprop="description"] p',
                '.description-summary p',
                '#synopsis'
            ]
            
            for selector in desc_selectors:
                elements = soup.select(selector)
                texts = [el.get_text(strip=True) for el in elements if el.get_text(strip=True)]
                if texts:
                    new_description = " ".join(texts)
                    break
            
            if not new_description:
                 # Last resort: look for any block of text?
                 # Keep old description (the URL) if failed? No, user said "Update Supabase".
                 # If empty, maybe put "No description available."
                 pass
            
            if new_description:
                update_series_description(series_id, new_description)
                desc_status = "Updated Description"
            else:
                desc_status = "Desc Not Found"

            # --- 4. Scrape Chapters (Universal Logic) ---
            existing_chapters = get_existing_chapters(series_id)
            all_links = soup.find_all('a', href=True)
            chapters_to_insert = []
            seen_nums = set()
            
            for link in all_links:
                href = link['href']
                text = link.get_text(strip=True)
                
                if 'chapter' not in href.lower() and 'chapter' not in text.lower():
                    continue
                
                chap_num = None
                match_text = re.search(r'(?:Chapter|Ch\.?|Ep\.?)\s*(\d+(\.\d+)?)', text, re.IGNORECASE)
                if match_text:
                    chap_num = float(match_text.group(1))
                else:
                    match_href = re.search(r'chapter/(\d+(\.\d+)?)', href, re.IGNORECASE)
                    if match_href:
                        chap_num = float(match_href.group(1))
                        
                if chap_num is None: continue
                if chap_num in seen_nums: continue
                if chap_num in existing_chapters: continue
                
                seen_nums.add(chap_num)
                
                full_url = urljoin(source_url, href)
                 # Clean title
                chap_title = f"Chapter {chap_num:g}"

                chapters_to_insert.append({
                    "series_id": series_id,
                    "title": chap_title,
                    "chapter_number": chap_num,
                    "source_url": full_url
                })
            
            count = 0
            if chapters_to_insert:
                url = f"{SUPABASE_URL}/rest/v1/chapters"
                res = requests.post(url, headers=HEADERS, json=chapters_to_insert)
                if res.status_code < 300:
                    count = len(chapters_to_insert)
                else:
                    print(f"  [ERROR] Chapter insert failed: {res.text}")
            
            print(f"  [Fixed] {title}: {desc_status} & Added {count} Chapters.")
            
        except Exception as e:
            print(f"  [CRITICAL] Error: {e}")
            
        time.sleep(3)

if __name__ == "__main__":
    fix_metadata_and_backfill()
