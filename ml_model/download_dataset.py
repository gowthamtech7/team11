"""
Download Road Damage Dataset for Indian Roads
Downloads images from public sources and organizes them
"""

import os
import urllib.request
import zipfile
import shutil
from pathlib import Path

DATASET_DIR = "dataset"

def create_directories():
    """Create dataset folder structure"""
    os.makedirs(os.path.join(DATASET_DIR, "pothole"), exist_ok=True)
    os.makedirs(os.path.join(DATASET_DIR, "crack"), exist_ok=True)
    os.makedirs(os.path.join(DATASET_DIR, "normal"), exist_ok=True)
    print(f"✓ Created dataset structure in {DATASET_DIR}/")

def download_rdd2020_sample():
    """
    Download sample RDD2020 dataset images
    Note: Full dataset requires git clone, this shows the process
    """
    print("\n" + "="*60)
    print("DATASET DOWNLOAD GUIDE")
    print("="*60)
    
    print("\nOption 1: RDD2020 (Best for India) - Recommended")
    print("-" * 60)
    print("Download from: https://github.com/sekilab/RDD2020")
    print("Steps:")
    print("  1. Visit: https://github.com/sekilab/RDD2020")
    print("  2. Download the repository (ZIP or Clone)")
    print("  3. Extract India images to:")
    print(f"     - {os.path.abspath(os.path.join(DATASET_DIR, 'pothole'))}")
    print(f"     - {os.path.abspath(os.path.join(DATASET_DIR, 'crack'))}")
    print(f"     - {os.path.abspath(os.path.join(DATASET_DIR, 'normal'))}")
    
    print("\n\nOption 2: Kaggle Datasets")
    print("-" * 60)
    print("Search & download from: https://www.kaggle.com")
    print("Popular datasets:")
    print("  - Road Damage Detection Challenge")
    print("  - Indian Pothole Detection Dataset")
    print("  - Road Crack Detection")
    
    print("\n\nOption 3: Google Colab (Free GPU Training)")
    print("-" * 60)
    print("Upload dataset & train in cloud:")
    print("  1. Go to: https://colab.research.google.com")
    print("  2. Create new notebook")
    print("  3. Upload dataset images")
    print("  4. Run training script (uses free GPU)")
    
    print("\n" + "="*60)
    print(f"Current dataset status:")
    print("="*60)
    
    for category in ["pothole", "crack", "normal"]:
        path = os.path.join(DATASET_DIR, category)
        count = len([f for f in os.listdir(path) if f.lower().endswith(('.jpg', '.png', '.jpeg'))])
        status = "✓ Has images" if count > 0 else "✗ Empty - Add images here"
        print(f"{category:12} ({path:30}) - {count:3} images - {status}")

def verify_images():
    """Remove corrupted images"""
    from PIL import Image
    
    print("\nVerifying images...")
    removed = 0
    
    for category in ["pothole", "crack", "normal"]:
        folder = os.path.join(DATASET_DIR, category)
        for filename in os.listdir(folder):
            filepath = os.path.join(folder, filename)
            if os.path.isfile(filepath):
                try:
                    img = Image.open(filepath)
                    img.verify()
                except:
                    print(f"  Removing corrupted: {filename}")
                    os.remove(filepath)
                    removed += 1
    
    print(f"✓ Verification complete. Removed {removed} corrupted images.")

if __name__ == "__main__":
    print("\n" + "="*60)
    print("ROAD DAMAGE DETECTION - DATASET SETUP")
    print("="*60)
    
    create_directories()
    download_rdd2020_sample()
    verify_images()
    
    print("\n" + "="*60)
    print("Next steps:")
    print("="*60)
    print("1. Download images from the sources above")
    print("2. Extract images to the dataset folders")
    print("3. Run: python train.py --epochs 50")
    print("="*60 + "\n")
