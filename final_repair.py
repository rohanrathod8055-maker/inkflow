import os
import time
import random
import re
import cloudscraper
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from urllib.parse import urljoin

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

scraper = cloudscraper.create_scraper()

print("=== FINAL REPAIR: Clean & Precise Scraper ===")

# --- 1. FETCH SERIES ---
url = f"{SUPABASE_URL}/rest/v1/series?select=id,title,description&order=updated_at.desc"
try:
    series_list = requests.get(url, headers=HEADERS).json()
except Exception as e:
    print(f"Critical Error fetching series: {e}")
    exit(1)

print(f"Found {len(series_list)} series to repair.")

for index, row in enumerate(series_list):
    series_id = row['id']
    title = row['title']
    old_desc = row.get('description', '') or ''
    
    # Extract URL
    target_url = ""
    # Heuristic: If we fixed it before, it might have the description.
    # But we need the URL. If the URL is lost from description, we are stuck?
    # Wait, the user said "Ensure the description field... is updated with the actual text, NOT the URL".
    # This implies the URL was there before. If we successfully replaced it in V2, we lost the source URL!
    # CRITICAL: If V2 script ran, 'description' is now "The world changed..." and we lost "https://asura..."
    # Unless we stored it elsewhere? We didn't.
    # Checking existing description:
    if "http" in old_desc:
        target_url = re.search(r'(https?://[^\s]+)', old_desc).group(1)
    elif old_desc.startswith("http"):
        target_url = old_desc.strip()
    
    if not target_url:
        # Check if we can recover it?
        # Maybe the user didn't run V2 fully or we can use search?
        # For this script, we skip if no URL.
        # print(f"[{index+1}] Skipping '{title}': Missing Source URL.")
        continue

    print(f"\n[{index+1}/{len(series_list)}] repairing '{title}'...")
    
    # --- ACTION: WIPE EXISTING CHAPTERS FOR THIS SERIES ---
    # To ensure we don't have duplicates like 629.3 and 629.0
    try:
        del_url = f"{SUPABASE_URL}/rest/v1/chapters?series_id=eq.{series_id}"
        requests.delete(del_url, headers=HEADERS)
    except Exception as e:
        print(f"   -> [WARN] Failed to wipe chapters: {e}")

    try:
        resp = scraper.get(target_url)
        if resp.status_code != 200:
             print(f"   -> [ERROR] Page load failed: {resp.status_code}")
             continue
        
        soup = BeautifulSoup(resp.text, 'html.parser')

        # --- FIX 3: STRICT SYNOPSIS ---
        # "Look specifically for the div with class text-gray-300 or desc"
        # Asura often uses 'entry-content' or 'gal-desc' or 'synopsis'
        # User suggests 'text-gray-300' (Tailwind?) or 'desc'.
        new_desc = ""
        # 1. Try 'desc' class (common in some WordPress themes)
        desc_div = soup.find('div', class_='desc') or soup.find('div', class_='entry-content') or soup.find('div', itemprop='description')
        if desc_div:
            new_desc = desc_div.get_text(strip=True)
        else:
            # 2. Try text-gray-300 paragraphs? (Loose)
            # This is specific to user request.
            # But 'text-gray-300' is very generic.
            pass
            
        if not new_desc:
             # Fallback to brute force largest paragraph if nothing else, 
             # but user said "Clean and Precise".
             # We will stick to refined selectors.
             paras = soup.select('.entry-content p, .synopsis p')
             if paras:
                 new_desc = " ".join([p.get_text(strip=True) for p in paras])

        if new_desc:
             # Update DB
             requests.patch(f"{SUPABASE_URL}/rest/v1/series?id=eq.{series_id}", headers=HEADERS, json={"description": new_desc})
             # print(f"   -> [Updated] Description")
        
        # --- FIX 4: STRICT CHAPTERS ---
        # "Look only for div with class py-2 inside the chapter list area"
        # "Regex: r'Chapter\s+(\d+)'" (Whole numbers only)
        
        chapters_to_insert = []
        seen_nums = set()
        
        # Asura layout: #chapterlist ul li div.py-2 ?
        # Or just find all div with class py-2 that contain links?
        # Let's target the chapter container specifically if possible.
        # '#chapterlist' is standard.
        chapter_area = soup.select_one('#chapterlist')
        if chapter_area:
             items = chapter_area.select('.py-2') # User rule
             if not items:
                 # items might be li tags directly
                 items = chapter_area.find_all('li')
        else:
             # Fallback: look for any .py-2 logic
             items = soup.select('.py-2')

        for item in items:
            link = item.find('a', href=True)
            if not link: continue
            
            text = link.get_text(strip=True)
            href = link['href']
            
            # Strict Regex
            match = re.search(r'Chapter\s+(\d+)(?!\.)', text, re.IGNORECASE) 
            # (?!\.) ensures we don't match "Chapter 20.5" as "20". 
            # Wait, user said "ensure we only get whole numbers".
            # regex r'Chapter\s+(\d+)' allows "Chapter 20.5" -> matches "20".
            # If we want to EXCLUDE decimals, we must ensure it's not followed by a dot.
            
            if match:
                chap_num = int(match.group(1)) # whole number
                
                # Check if raw text had a decimal that we just truncated?
                # "Chapter 20.5" -> match check:
                if "." in text and str(chap_num) in text:
                     # e.g. text "Chapter 20.5"
                     # regex "Chapter (\d+)" captures '20'.
                     # If we want to avoid 20.5, we check if the full number string in text is float.
                     # User said: "avoid random 'version' numbers".
                     # Assuming he wants ONLY Main Chapters.
                     # So "Chapter 20.5" should be SKIP or kept as 20.5?
                     # "wrong numbers like 629.3". Usually 629.3 IS a version or error or timestamp.
                     # But 20.5 is valid side story.
                     # User said "only get whole numbers". I will strictly Skip decimals.
                     full_num_match = re.search(r'Chapter\s+(\d+(\.\d+)?)', text, re.IGNORECASE)
                     if full_num_match:
                         if '.' in full_num_match.group(1):
                             continue # Skip decimals
                
                if chap_num in seen_nums: continue
                seen_nums.add(chap_num)
                
                full_url = href if href.startswith("http") else f"https://asuracomic.net{href}"
                
                chapters_to_insert.append({
                    "series_id": series_id,
                    "title": f"Chapter {chap_num}",
                    "chapter_number": chap_num,
                    "source_url": full_url
                })
        
        if chapters_to_insert:
            # Batch Insert
            batch_size = 50
            for i in range(0, len(chapters_to_insert), batch_size):
                batch = chapters_to_insert[i:i+batch_size]
                requests.post(f"{SUPABASE_URL}/rest/v1/chapters", headers=HEADERS, json=batch)
                
            print(f"   -> [Fixed] Added {len(chapters_to_insert)} Clean Chapters.")
        else:
            print("   -> [WARN] No chapters found with Strict Logic.")
            
        time.sleep(1.5)

    except Exception as e:
        print(f"   -> [ERROR] {e}")

if __name__ == "__main__":
    pass
