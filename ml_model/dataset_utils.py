import os
import cv2
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator

IMG_SIZE = 224
BATCH_SIZE = 32
VALIDATION_SPLIT = 0.2 # 20% of data will be used for validation/testing

from PIL import Image

def load_and_preprocess_image(path):
    """Loads an image, resizes, denoises, and enhances contrast for the model."""
    try:
        img = Image.open(path)
        img = img.convert('RGB')
        img = img.resize((IMG_SIZE, IMG_SIZE))
        img = np.array(img)
        # Denoising (OpenCV fastNlMeansDenoisingColored)
        import cv2
        img = cv2.fastNlMeansDenoisingColored(img, None, 10, 10, 7, 21)
        # Contrast enhancement (CLAHE)
        lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        cl = clahe.apply(l)
        limg = cv2.merge((cl,a,b))
        img = cv2.cvtColor(limg, cv2.COLOR_LAB2RGB)
        img = img / 255.0  # Normalize
        return img
    except Exception as e:
        print(f"Error loading image {path}: {e}")
        return None

def verify_images(data_dir):
    """Verifies that all images in the directory are readable and removes corrupt ones."""
    print(f"Verifying images in {data_dir}...")
    valid_extensions = {'.jpg', '.jpeg', '.png', '.bmp'}
    
    for root, dirs, files in os.walk(data_dir):
        for file in files:
            file_path = os.path.join(root, file)
            ext = os.path.splitext(file)[1].lower()
            
            if ext not in valid_extensions:
                continue
                
            try:
                img = Image.open(file_path)
                img.verify() # Verify it's an image
            except (IOError, SyntaxError) as e:
                print(f"Removing corrupt image: {file_path} ({e})")
                os.remove(file_path)
    print("Verification complete.")

def create_data_generators(data_dir, batch_size=BATCH_SIZE):
    """Creates training and validation data generators."""
    # Verify images first
    verify_images(data_dir)
    
    # Check if directory exists, if not create basic structure to avoid errors
    if not os.path.exists(data_dir):
        os.makedirs(os.path.join(data_dir, 'pothole'))
        os.makedirs(os.path.join(data_dir, 'normal'))
        print(f"Created placeholder directories in {data_dir}. Please add images.")

    datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=20,
        width_shift_range=0.2,
        height_shift_range=0.2,
        shear_range=0.2,
        zoom_range=0.2,
        brightness_range=[0.8, 1.2],
        horizontal_flip=True,
        fill_mode='nearest',
        validation_split=VALIDATION_SPLIT
    )

    train_generator = datagen.flow_from_directory(
        data_dir,
        target_size=(IMG_SIZE, IMG_SIZE),
        batch_size=batch_size,
        class_mode='categorical',
        subset='training'
    )

    validation_generator = datagen.flow_from_directory(
        data_dir,
        target_size=(IMG_SIZE, IMG_SIZE),
        batch_size=batch_size,
        class_mode='categorical',
        subset='validation'
    )

    return train_generator, validation_generator
