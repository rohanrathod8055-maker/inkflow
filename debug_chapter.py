import cloudscraper
from bs4 import BeautifulSoup

# This is the link for "The Berserker's Second Playthrough" (which failed in your logs)
url = "https://asuracomic.net/series/the-berserkers-second-playthrough-8a65d632"

scraper = cloudscraper.create_scraper()
print(f"Spying on: {url}")

try:
    resp = scraper.get(url)
    soup = BeautifulSoup(resp.content, "html.parser")

    print(f"Page Title: {soup.title.string.strip()}")
    
    # 1. Look for ANYTHING that looks like a chapter list
    print("\n--- SCANNING FOR LINKS ---")
    links = soup.find_all("a", href=True)
    
    # Print the first 100 links to find the pattern
    count = 0
    for link in links:
        text = link.get_text(strip=True)
        href = link['href']
        
        # We only care about links that might be chapters
        # (Usually they have numbers or 'chapter' in the url)
        # Also check if it's a numeric text link which might be just a number
        if "chapter" in href or any(char.isdigit() for char in text):
            print(f"[{count}] Text: '{text}'  |  Link: {href}")
            count += 1
            if count > 15: # Stop after 15 examples
                break
                
    if count == 0:
        print("NO CHAPTER LINKS FOUND. The site might use JavaScript to load them.")
        print("Dump of raw HTML (First 500 chars):")
        print(resp.text[:500])

except Exception as e:
    print(f"Error: {e}")
