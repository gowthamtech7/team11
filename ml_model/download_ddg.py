import os
import requests
from duckduckgo_search import DDGS

import time

DATA_DIR = "dataset"
CATEGORIES = {
    "crack": ["asphalt road crack", "road surface crack detail"],
    "normal": ["clean asphalt road surface", "empty highway road background"],
    "non_road": ["powerpoint presentation slide", "human face portrait photo", "document paper text"]
}

IMAGES_PER_QUERY = 40

def download_image(url, save_path):
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            with open(save_path, 'wb') as f:
                f.write(response.content)
            return True
    except Exception as e:
        pass
    return False

def main():
    ddgs = DDGS()
    
    for category, queries in CATEGORIES.items():
        folder_path = os.path.join(DATA_DIR, category)
        os.makedirs(folder_path, exist_ok=True)
        
        # Count existing images
        existing = len([f for f in os.listdir(folder_path) if f.lower().endswith(('.png', '.jpg', '.jpeg'))])
        if existing > 20:
            print(f"Skipping {category}, already has {existing} images.")
            continue
            
        print(f"Downloading images for {category}...")
        downloaded = 0
        
        for query in queries:
            print(f"  Searching '{query}'...")
            try:
                results = ddgs.images(query, max_results=IMAGES_PER_QUERY)
                for res in results:
                    url = res.get("image")
                    if not url: continue
                    ext = url.split(".")[-1].split("?")[0]
                    if ext.lower() not in ["jpg", "jpeg", "png"]:
                        ext = "jpg"
                    
                    filename = f"{category}_{downloaded}.{ext}"
                    filepath = os.path.join(folder_path, filename)
                    
                    if download_image(url, filepath):
                        downloaded += 1
                        print(f"    Downloaded {downloaded} for {category}", end='\r')
                        time.sleep(0.1)  # Be nice to servers
            except Exception as e:
                print(f"Error searching {query}: {e}")
                
        print(f"\nCompleted {category}: {downloaded} images downloaded.\n")

if __name__ == '__main__':
    main()
