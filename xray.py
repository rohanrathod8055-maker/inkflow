from bs4 import BeautifulSoup

# Open the file you downloaded earlier
try:
    with open("debug_page.html", "r", encoding="utf-8") as f:
        html = f.read()

    soup = BeautifulSoup(html, "html.parser")
    
    print(f"Page Title: {soup.title.string.strip() if soup.title else 'No Title'}")
    print("-" * 40)
    
    # Find ALL links
    links = soup.find_all("a", href=True)
    
    print(f"found {len(links)} total links. Here are the first 15:")
    for i, link in enumerate(links[:15]):
        print(f"[{i}] Text: {link.get_text(strip=True)[:20]}... | URL: {link['href']}")

    print("-" * 40)
    print("SEARCHING FOR MANGA TITLES...")
    # Try to find a known title to see where it lives
    # Replace 'Solo' with part of a title you know is on Page 1
    sample = soup.find(string=lambda text: text and "Solo" in text)
    if sample:
        print(f"Found text 'Solo'! Parent tag: <{sample.parent.name}>")
        print(f"Parent Class: {sample.parent.get('class')}")
    else:
        print("❌ Could not find 'Solo' in the text.")

except FileNotFoundError:
    print("Error: Could not find 'debug_page.html'. Did you run debug_scraper.py?")
