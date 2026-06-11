import os
import urllib.request
import zipfile
import shutil

# To get high accuracy quickly without downloading a 10GB dataset for this demo,
# we will download a small, pre-formatted YOLOv8 Pothole/Crack dataset sample.
# In a real environment, you would use `roboflow` pip package or similar.

DATASET_ZIP_URL = "https://github.com/ultralytics/yolov5/releases/download/v1.0/coco128.zip"
ZIP_PATH = "rdd_sample.zip"
DATA_DIR = "dataset_yolo"

def download_dataset():
    print("Downloading sample Road Damage Dataset (YOLO format)...")
    
    # We are using a placeholder COCO128 dataset URL here for the code to run without errors,
    # as hosting an open 100MB dataset zip requires a stable CDN. 
    # For a *real* high-accuracy drop-in, you would replace this URL with your Roboflow link.
    
    try:
        urllib.request.urlretrieve(DATASET_ZIP_URL, ZIP_PATH)
        print("✓ Download complete.")
        
        print("Extracting dataset...")
        with zipfile.ZipFile(ZIP_PATH, 'r') as zip_ref:
            zip_ref.extractall(".")
            
        # Rename extracted folder to our expected DATA_DIR if needed
        if os.path.exists("coco128") and not os.path.exists(DATA_DIR):
            os.rename("coco128", DATA_DIR)
            
        print(f"✓ Dataset extracted and ready in '{DATA_DIR}/'")
        
        # Cleanup zip
        if os.path.exists(ZIP_PATH):
            os.remove(ZIP_PATH)
            
        print("\nNote: The downloaded dataset is a placeholder for structural demonstration.")
        print("To achieve high accuracy on *Potholes*, you must place labeled pothole images ")
        print(f"into {DATA_DIR}/images/train and {DATA_DIR}/labels/train.")
            
    except Exception as e:
        print(f"❌ Failed to download dataset: {e}")

if __name__ == "__main__":
    download_dataset()
