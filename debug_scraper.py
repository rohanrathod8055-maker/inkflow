import cloudscraper

url = "https://asuracomic.net/series?page=1"
scraper = cloudscraper.create_scraper()

try:
    print(f"Fetching {url}...")
    response = scraper.get(url)
    
    # Save raw HTML
    with open("debug_page.html", "w", encoding="utf-8") as f:
        f.write(response.text)
        
    print(f"Status Code: {response.status_code}")
    
    # Print first 500 chars to check for blocks
    print("\n--- HTML PREVIEW (First 500 chars) ---")
    print(response.text[:500])
    print("--------------------------------------\n")
    
    print("Debug file saved. Check debug_page.html")

except Exception as e:
    print(f"Error: {e}")
