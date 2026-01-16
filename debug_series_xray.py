import cloudscraper
from bs4 import BeautifulSoup
import time

url = "https://asuracomic.net/series/the-berserkers-second-playthrough-8a65d632"
print(f"Scraping {url}...")

scraper = cloudscraper.create_scraper()
try:
    response = scraper.get(url)
    print(f"Status Code: {response.status_code}")
    
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Save for manual inspection if needed
    with open("debug_series.html", "w", encoding="utf-8") as f:
        f.write(response.text)
        
    print(f"Page Title: {soup.title.string.strip() if soup.title else 'No Title'}")
    
    links = soup.find_all('a', href=True)
    print(f"Found {len(links)} links. Printing first 50 containing 'chapter':")
    
    count = 0
    for link in links:
        href = link['href']
        text = link.get_text(strip=True)
        
        if 'chapter' in href.lower() or 'chapter' in text.lower():
            print(f"  [LINK] Text: '{text}' | Href: '{href}'")
            count += 1
            if count >= 20:
                break
                
    if count == 0:
        print("  No links containing 'chapter' found. Printing FIRST 20 links of any kind:")
        for link in links[:20]:
             print(f"  [ANY] Text: '{link.get_text(strip=True)}' | Href: '{link['href']}'")

except Exception as e:
    print(f"Error: {e}")
