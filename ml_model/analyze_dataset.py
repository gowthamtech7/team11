import os
import cv2
import numpy as np
from pathlib import Path
import matplotlib.pyplot as plt
from collections import Counter
import hashlib

DATA_DIR = 'dataset'
IMG_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp'}

def get_image_paths(directory):
    image_paths = []
    for root, _, files in os.walk(directory):
        for file in files:
            if os.path.splitext(file)[1].lower() in IMG_EXTENSIONS:
                image_paths.append(os.path.join(root, file))
    return image_paths

def check_class_balance(data_dir):
    classes = [d for d in os.listdir(data_dir) if os.path.isdir(os.path.join(data_dir, d))]
    stats = {}
    print("\n--- Class Balance Analysis ---")
    total_images = 0
    for cls in classes:
        cls_dir = os.path.join(data_dir, cls)
        images = get_image_paths(cls_dir)
        count = len(images)
        stats[cls] = count
        total_images += count
        print(f"Class '{cls}': {count} images")
    
    if total_images == 0:
        print("No images found! Please add images to the dataset folders.")
        return False

    avg = total_images / len(classes)
    print(f"Total Images: {total_images}")
    print(f"Average per class: {avg:.1f}")

    # Check for imbalance
    imbalanced = False
    for cls, count in stats.items():
        if count < avg * 0.5:
            print(f"WARNING: Class '{cls}' is underrepresented! (Less than 50% of average)")
            imbalanced = True
        elif count > avg * 1.5:
            print(f"WARNING: Class '{cls}' is overrepresented! (More than 150% of average)")
            imbalanced = True
            
    if not imbalanced:
        print("✅ Class balance looks good.")
    else:
        print("❌ Dataset is imbalanced. Recommendation: Add more images to underrepresented classes or remove from overrepresented ones.")
    return True

def check_image_issues(data_dir):
    print("\n--- Image Quality Analysis ---")
    image_paths = get_image_paths(data_dir)
    if not image_paths:
        return

    corrupt_count = 0
    small_count = 0
    blurry_count = 0
    hashes = {}
    duplicates = 0

    print(f"Analyzing {len(image_paths)} images (this may take a moment)...")

    for path in image_paths:
        try:
            # Check corruption
            img = cv2.imread(path)
            if img is None:
                print(f"Corrupt image found: {path}")
                corrupt_count += 1
                continue

            # Check size
            h, w = img.shape[:2]
            if h < 50 or w < 50:
                small_count += 1

            # Check blurriness (Laplacian variance)
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            score = cv2.Laplacian(gray, cv2.CV_64F).var()
            if score < 100: # Threshold for blurriness
                blurry_count += 1

            # Check duplicates (hashing)
            with open(path, 'rb') as f:
                file_hash = hashlib.md5(f.read()).hexdigest()
            
            if file_hash in hashes:
                duplicates += 1
                # print(f"Duplicate found: {path} is same as {hashes[file_hash]}")
            else:
                hashes[file_hash] = path

        except Exception as e:
            print(f"Error reading {path}: {e}")
            corrupt_count += 1

    print(f"Corrupt Files: {corrupt_count}")
    print(f"Very Small Images (<50px): {small_count}")
    print(f"potentially Blurry Images: {blurry_count}")
    print(f"Exact Duplicates: {duplicates}")

    if duplicates > 0:
        print("❌ Recommendation: Remove duplicate images to prevent overfitting.")
    if blurry_count > len(image_paths) * 0.2:
        print("⚠️ Warning: Many images seem blurry. Check your data quality.")
    if small_count > 0:
        print("⚠️ Warning: Some images are very small. They might not contain enough detail.")

if __name__ == "__main__":
    if os.path.exists(DATA_DIR):
        if check_class_balance(DATA_DIR):
            check_image_issues(DATA_DIR)
    else:
        print(f"Directory '{DATA_DIR}' not found.")
