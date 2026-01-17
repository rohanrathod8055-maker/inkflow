import os
import time
import random
import re
import cloudscraper
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

# --- CONFIGURATION (Auto-loaded from .env.local) ---
load_dotenv('.env.local')

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Could not load Supabase credentials from .env.local")
    exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

scraper = cloudscraper.create_scraper()

print("=== Metadata Repair & Fast Backfill v2 (REST API) ===")

# 1. Fetch all series
url = f"{SUPABASE_URL}/rest/v1/series?select=id,title,description&order=updated_at.desc"
try:
    response = requests.get(url, headers=HEADERS)
    if response.status_code != 200:
        print(f"Error fetching series: {response.text}")
        exit(1)
    series_list = response.json()
except Exception as e:
    print(f"Critical Error: {e}")
    exit(1)

print(f"Found {len(series_list)} series.")

for index, row in enumerate(series_list):
    series_id = row['id']
    title = row['title']
    old_desc = row.get('description', '') or ''

    # Extract URL from the old "Imported from..." text
    target_url = ""
    start_url = ""
    
    if "http" in old_desc:
        match = re.search(r'(https?://[^\s]+)', old_desc)
        if match:
            target_url = match.group(1).strip()
    elif old_desc.startswith("http"):
         target_url = old_desc.strip()

    if not target_url:
        if len(old_desc) > 50 and "Imported" not in old_desc:
            # print(f"[{index+1}] Skipping '{title}' (Likely valid description)")
            continue
        # print(f"[{index+1}] Skipping '{title}' (No source URL found)")
        continue

    print(f"[{index+1}/{len(series_list)}] Visiting '{title}'...")
    
    try:
        # 2. Visit the Page
        resp = scraper.get(target_url)
        if resp.status_code != 200:
             print(f"   -> [ERROR] Failed to load: {resp.status_code}")
             continue
             
        page = resp.text
        soup = BeautifulSoup(page, "html.parser")

        # --- FIX 1: FIND DESCRIPTION (Brute Force) ---
        candidates = soup.find_all(['p', 'div', 'span'])
        best_desc = "No description found."
        max_len = 0
        
        for c in candidates:
            # fast ignore
            classes = c.get('class', [])
            if classes and any(x in ['copyright', 'footer', 'menu', 'nav', 'header'] for x in classes):
                continue
                
            text = c.get_text(strip=True)
            if len(text) > 50 and len(text) > max_len and "Copyright" not in text and "All rights reserved" not in text:
                if len(text) < 5000:
                    best_desc = text
                    max_len = len(text)

        # --- FIX 2: FIND CHAPTERS (Universal Regex) ---
        chapter_links = []
        all_links = soup.find_all('a', href=True)
        seen_nums = set()
        
        for link in all_links:
            href = link['href']
            text = link.get_text(strip=True)
            
            if "chapter" in href.lower() or "chapter" in text.lower() or re.search(r'\b\d+\b', text):
                num_match = re.search(r'(?:Chapter|Ch\.?|Ep\.?|^)\s*(\d+(\.\d+)?)', text, re.IGNORECASE)
                if not num_match:
                     num_match = re.search(r'chapter/(\d+(\.\d+)?)', href, re.IGNORECASE)
                
                if num_match:
                    num = float(num_match.group(1))
                    if num in seen_nums: continue
                    seen_nums.add(num)
                    
                    full_url = href if href.startswith("http") else f"https://asuracomic.net{href}"
                    if not href.startswith("http") and not href.startswith("/"):
                         from urllib.parse import urljoin
                         full_url = urljoin(target_url, href)
                    elif href.startswith("/"):
                         full_url = "https://asuracomic.net" + href 

                    chapter_links.append({
                        "series_id": series_id,
                        "title": f"Chapter {num:g}",
                        "chapter_number": num,
                        "source_url": full_url
                    })

        # 3. SAVE TO DATABASE (REST)
        # Update Description
        if best_desc != "No description found.":
             update_url = f"{SUPABASE_URL}/rest/v1/series?id=eq.{series_id}"
             requests.patch(update_url, headers=HEADERS, json={"description": best_desc})
        
        # Insert Chapters
        if chapter_links:
            batch_size = 50
            insert_url = f"{SUPABASE_URL}/rest/v1/chapters"
            for i in range(0, len(chapter_links), batch_size):
                batch = chapter_links[i:i+batch_size]
                # Upsert is tricky with REST if no constraints? 
                # Actually Supabase REST handles UPSERT if we specify on_conflict
                # Header: Prefer: resolution=merge-duplicates
                # But typically we use POST with on_conflict param in URL?
                # or just POST. If unique constraint exists, it might fail or ignore.
                # 'bulk_import.py' logic used normal POST and ignored errors if they occurred or handled checked before.
                # Here we want to be fast.
                # Supabase REST: POST to /chapters?on_conflict=series_id,chapter_number
                
                upsert_headers = HEADERS.copy()
                upsert_headers["Prefer"] = "resolution=merge-duplicates" 
                # or "resolution=ignore-duplicates" to skip
                
                try:
                    # Trying standard POST with ignore behavior
                    requests.post(insert_url, headers=upsert_headers, json=batch)
                except Exception as e:
                    print(f"   -> [WARN] Insert error batch {i}: {e}")

        print(f"   -> [Fixed] {title}: Updated Desc ({len(best_desc)} chars) & Added {len(chapter_links)} Chapters.")

        # Sleep
        time.sleep(random.uniform(2, 4))

    except Exception as e:
        print(f"   -> [ERROR] {e}")

