import os
import requests
from dotenv import load_dotenv

load_dotenv('.env.local')

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Credentials missing.")
    exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation, count=exact"
}

print("=== NUCLEAR CLEANUP: Chapters > 1000 ===")

# DELETE /chapters?chapter_number=gt.1000
url = f"{SUPABASE_URL}/rest/v1/chapters?chapter_number=gt.1000"

try:
    print("Executing Delete Request...")
    res = requests.delete(url, headers=HEADERS)
    
    if res.status_code < 300:
        # Check count header if available
        count = "Unknown"
        if "Content-Range" in res.headers:
            count = res.headers["Content-Range"].split('/')[-1]
        elif len(res.json()) > 0:
            count = len(res.json())
        elif res.text: 
            # If body returned deleted rows
            try:
                count = len(res.json())
            except:
                pass
        
        print(f"[SUCCESS] 'Ghost' Chapters Deleted.")
        print(f"Status: {res.status_code}")
        print(f"Items Removed: {count}")
    else:
        print(f"[FAIL] Status {res.status_code}: {res.text}")

except Exception as e:
    print(f"[ERROR] {e}")
