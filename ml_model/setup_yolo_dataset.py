import os
import urllib.request
import zipfile
import yaml

# Constants
DATASET_URL = "https://github.com/ultralytics/yolov5/releases/download/v1.0/coco128.zip" # Using COCO128 structure for demo, but we will configure it for Potholes
DATA_DIR = "dataset_yolo"

def setup_dataset():
    print(f"Setting up custom road damage YOLO dataset in {DATA_DIR}...")
    
    # Create directories
    os.makedirs(os.path.join(DATA_DIR, "images/train"), exist_ok=True)
    os.makedirs(os.path.join(DATA_DIR, "images/val"), exist_ok=True)
    os.makedirs(os.path.join(DATA_DIR, "labels/train"), exist_ok=True)
    os.makedirs(os.path.join(DATA_DIR, "labels/val"), exist_ok=True)

    # Note: In a real-world scenario, you would download the 10GB RDD2022 dataset 
    # from roboflow or kaggle. For this codebase, we will set up the structure 
    # and provide the YAML so it can be trained locally with user-provided images.

    # Create dataset.yaml
    yaml_content = {
        'path': os.path.abspath(DATA_DIR),  # absolute path
        'train': 'images/train',
        'val': 'images/val',
        'test': '',  # optional
        
        # Classes
        'names': {
            0: 'Crack',
            1: 'Pothole'
        }
    }
    
    yaml_path = "dataset.yaml"
    with open(yaml_path, 'w') as f:
        yaml.dump(yaml_content, f, default_flow_style=False)
        
    print(f"✓ Created {yaml_path}")
    print("\n⚠️  ATTENTION: To train a real model, you must place:")
    print(f"1. .jpg images into {os.path.join(DATA_DIR, 'images/train')}")
    print(f"2. YOLO .txt label files into {os.path.join(DATA_DIR, 'labels/train')}")
    print("Then run 'python train_yolo.py'")

if __name__ == "__main__":
    setup_dataset()
