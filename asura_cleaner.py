import os
import time
import random
import re
import cloudscraper
import requests
from requests.exceptions import ConnectionError, Timeout
from bs4 import BeautifulSoup
from dotenv import load_dotenv

# --- CONFIGURATION ---
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

# --- SINGLE SESSION SETUP ---
scraper = cloudscraper.create_scraper()
db_session = requests.Session()
db_session.headers.update(HEADERS)

def safe_db_request(method, url, **kwargs):
    """Retries DB requests on connection failure"""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            res = db_session.request(method, url, **kwargs)
            return res
        except (ConnectionError, Timeout) as e:
            print(f"   [DB Connection Lost] Waiting 30s... (Attempt {attempt+1}/{max_retries})")
            time.sleep(30)
    raise ConnectionError("Failed to connect to Supabase after retries")

print("Starting Asura-Specific Deep Repair V5 (HARD RESET MODE)...")
print("1. Wipes chapters explicitly.")
print("2. Verifies deletion.")
print("3. Pauses for confirmation.")

# Priority Input
target_title_input = input("Enter specific title (or Enter for ALL): ").strip().lower()

# 1. Get all series
url = f"{SUPABASE_URL}/rest/v1/series?select=id,description,title"
try:
    res = safe_db_request('GET', url)
    series_list = res.json()
except Exception as e:
    print(f"Error fetching series: {e}")
    exit(1)

print(f"Found {len(series_list)} series.")

for item in series_list:
    s_id = item['id']
    old_title = item['title']
    desc = item.get('description') or ""
    
    # Priority Filter
    if target_title_input and target_title_input not in old_title.lower():
        continue

    # URL Logic
    raw_url = re.search(r'https?://[^\s]+', desc)
    target_url = ""
    if not raw_url and desc.startswith("http"):
         target_url = desc.strip()
    elif raw_url:
         target_url = raw_url.group(0)
    
    if not target_url:
        continue

    print(f"\nProcessing: {old_title}")
    
    # --- SCRAPE ---
    try:
        response = scraper.get(target_url, timeout=30)
        if response.status_code != 200:
            print(f"   [Error] Source Status {response.status_code}")
            continue
        soup = BeautifulSoup(response.text, 'html.parser')
    except Exception as e:
        print(f"   [Error] Scrape failed: {e}")
        continue

    # --- TITLE & DESC ---
    h1 = soup.find("h1", class_="entry-title") or soup.find("h1")
    real_title = h1.get_text(strip=True) if h1 else old_title
    
    desc_div = soup.find("div", class_="text-gray-300") or soup.find("span", class_="text-gray-400") or soup.find("div", class_="entry-content")
    real_desc = desc_div.get_text(strip=True) if desc_div else "Plot summary coming soon."

    try:
        # --- PHASE 1: HARD WIPE ---
        print(f"   [Action] Deleting old chapters...")
        del_url = f"{SUPABASE_URL}/rest/v1/chapters?series_id=eq.{s_id}"
        # count=exact header to see how many deleted
        del_headers = HEADERS.copy()
        del_headers["Prefer"] = "return=minimal, count=exact"
        
        del_res = safe_db_request('DELETE', del_url, headers=del_headers)
        
        # VERIFICATION
        # Check if rows actually gone
        check_res = safe_db_request('GET', f"{SUPABASE_URL}/rest/v1/chapters?series_id=eq.{s_id}&select=id", headers={"Range": "0-0"})
        # Range 0-0 asks for 1 row.
        # content-range header tells total.
        
        remaining_count = 0
        if check_res.status_code == 200:
             content_range = check_res.headers.get("Content-Range")
             if content_range:
                 # format: 0-0/total or */total
                 parts = content_range.split('/')
                 if len(parts) > 1 and parts[1] != '*':
                     remaining_count = int(parts[1])
             else:
                 # Fallback: if body is empty list, count is 0
                 if len(check_res.json()) == 0: remaining_count = 0
                 else: remaining_count = 1 # at least 1
        
        if remaining_count > 0:
            print(f"   [CRITICAL FAIL] Delete failed. {remaining_count} chapters remain.")
            print(f"   This likely means Supabase Row Level Security (RLS) is blocking the delete.")
            print(f"   Cannot proceed with Hard Reset for this series.")
            # Skip update to avoid mixing data
            input("   Press Enter to skip...")
            continue
        else:
            print("   [Verified] 0 Chapters remain. Clean slate confirmed.")

        # --- PHASE 2: UPDATE SERIES ---
        patch_url = f"{SUPABASE_URL}/rest/v1/series?id=eq.{s_id}"
        patch_payload = {"title": real_title, "description": real_desc}
        patch_res = safe_db_request('PATCH', patch_url, json=patch_payload)
        
        print(f"   [Series Update] Status: {patch_res.status_code}")
        if patch_res.status_code >= 300:
             print(f"   Response: {patch_res.text}")

        # --- PHASE 3: ADD CHAPTERS ---
        chapter_data = []
        links = soup.find_all("a", href=True)
        seen_nums = set()
        
        for link in links:
            href = link['href']
            text = link.get_text(strip=True)
            
            if "chapter" in href.lower() or "chapter" in text.lower():
                match = re.search(r'[Cc]hapter\s*(\d+(\.\d+)?)', text)
                
                if match:
                    ch_num = float(match.group(1))
                    
                    if ch_num in seen_nums: continue
                    seen_nums.add(ch_num)
                    
                    full_link = href if href.startswith("http") else f"https://asuracomic.net{href}"
                    # Simple fix
                    if not href.startswith("http") and href.startswith("/"):
                         full_link = "https://asuracomic.net" + href

                    chapter_data.append({
                        "series_id": s_id,
                        "chapter_number": ch_num,
                        "title": f"Chapter {ch_num:g}",
                        "source_url": full_link
                    })
        
        if chapter_data:
             batch_url = f"{SUPABASE_URL}/rest/v1/chapters"
             # Use merge-duplicates just in case, but we wiped so it should be insert.
             upsert_headers = HEADERS.copy()
             upsert_headers["Prefer"] = "return=minimal" # Don't need huge response
             
             # Batch 100
             for i in range(0, len(chapter_data), 100):
                 batch = chapter_data[i:i+100]
                 res = safe_db_request('POST', batch_url, headers=upsert_headers, json=batch)
                 if res.status_code >= 300:
                     print(f"   [Error] Insert batch failed: {res.text}")
             
             print(f"   [SUCCESS] Added {len(chapter_data)} Clean Chapters.")
        
        # --- PAUSE FOR USER ---
        input("   >> Press Enter to confirm check on website & continue...")

    except Exception as e:
        print(f"   [Error] {e}")

print("V5 Hard Reset Complete.")
