"""
Dataset Augmentation via icrawler - downloads images using Bing image search
Works reliably to download real road damage images.
"""
import os
import shutil
import time
from pathlib import Path

# Install icrawler if needed
try:
    from icrawler.builtin import BingImageCrawler
except ImportError:
    import subprocess, sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "icrawler"])
    from icrawler.builtin import BingImageCrawler

DATASET_DIR = Path(__file__).parent / "dataset"

# How many NEW images to download per class
DOWNLOAD_CONFIG = {
    "pothole": {
        "queries": ["road pothole damage", "pothole street asphalt", "deep road pothole"],
        "count_each": 100,           # per query → 300 total pothole
    },
    "crack": {
        "queries": ["road surface crack", "asphalt crack pavement", "longitudinal road crack"],
        "count_each": 80,            # per query → 240 total crack
    },
    "normal": {
        "queries": ["smooth asphalt road surface", "paved road no damage", "normal road top view"],
        "count_each": 80,            # per query → 240 total normal
    },
}

def download_for_class(class_name: str, queries: list, count_each: int):
    folder = DATASET_DIR / class_name
    folder.mkdir(parents=True, exist_ok=True)
    
    initial = len(list(folder.glob("*.*")))
    print(f"\n[{class_name.upper()}] Existing: {initial} images")
    
    for query in queries:
        # Use a temp folder so icrawler doesn't overwrite existing files
        tmp_dir = DATASET_DIR / f"_tmp_{class_name}"
        tmp_dir.mkdir(exist_ok=True)
        
        print(f"  Searching: '{query}' ({count_each} images)")
        try:
            crawler = BingImageCrawler(
                storage={"root_dir": str(tmp_dir)},
                feeder_threads=1,
                parser_threads=1,
                downloader_threads=4,
            )
            crawler.crawl(
                keyword=query,
                max_num=count_each,
                file_idx_offset=0,
            )
        except Exception as e:
            print(f"  [ERROR] {e}")
        
        # Move downloaded images to the real folder with unique names
        downloaded = list(tmp_dir.glob("*.*"))
        ts = int(time.time())
        for i, img_path in enumerate(downloaded):
            ext = img_path.suffix.lower()
            if ext not in (".jpg", ".jpeg", ".png", ".webp"):
                continue
            dst = folder / f"{class_name}_bing_{ts}_{i:04d}{ext}"
            shutil.move(str(img_path), str(dst))
        
        # Clean up temp folder
        shutil.rmtree(tmp_dir, ignore_errors=True)
        time.sleep(1)
    
    final = len(list(folder.glob("*.*")))
    print(f"  [DONE] {class_name}: {initial} → {final} images (+{final - initial})")


if __name__ == "__main__":
    print("=" * 60)
    print("Road Damage Dataset Augmentation via Bing Image Crawler")
    print("=" * 60)
    
    for cls, cfg in DOWNLOAD_CONFIG.items():
        download_for_class(cls, cfg["queries"], cfg["count_each"])
    
    print("\n" + "=" * 60)
    print("Dataset augmentation complete!")
    print("Run 'python train.py --fine_tune' to retrain the model.")
    print("=" * 60)
