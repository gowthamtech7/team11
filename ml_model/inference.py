import os
os.environ['CUDA_VISIBLE_DEVICES'] = '-1'  # Force CPU-only mode
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'   # Suppress logging

import numpy as np
import cv2
from PIL import Image
import tensorflow as tf

# Limit threads to conserve memory on Render Free Tier (512MB RAM limit)
tf.config.threading.set_intra_op_parallelism_threads(1)
tf.config.threading.set_inter_op_parallelism_threads(1)

from tensorflow.keras.models import load_model

MODEL_PATH = 'road_damage_model.h5'
IMG_SIZE = 224

# The model is trained on 4 classes: 0=crack, 1=non_road, 2=normal, 3=pothole
CLASSES = ['Crack', 'Non_Road', 'Normal', 'Pothole']  # Must match training order

# Severity scoring based on confidence bands
SEVERITY_BANDS = {
    'Pothole': {
        (0.92, 1.01): ('High', 'Critical road failure. Immediate repair required.'),
        (0.78, 0.92): ('Medium', 'Significant pothole detected. Schedule repair soon.'),
        (0.60, 0.78): ('Low', 'Minor pothole or surface distress. Monitor regularly.'),
    },
    'Crack': {
        (0.85, 1.01): ('Medium', 'Significant cracking. May lead to structural failure.'),
        (0.50, 0.85): ('Low', 'Minor surface cracking. Monitor regularly.'),
    },
    'Normal': {
        (0.0, 1.01): ('None', 'Road surface appears undamaged.'),
    }
}

def preprocess_image(image_path):
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError("Could not open image.")
    
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # 1. Resize
    img_resized = cv2.resize(img, (IMG_SIZE, IMG_SIZE))
    
    # 2. Denoising
    img_denoised = cv2.fastNlMeansDenoisingColored(img_resized, None, 10, 10, 7, 21)
    
    # 3. CLAHE (Contrast Limited Adaptive Histogram Equalization)
    lab = cv2.cvtColor(img_denoised, cv2.COLOR_RGB2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    cl = clahe.apply(l)
    limg = cv2.merge((cl,a,b))
    img_clahe = cv2.cvtColor(limg, cv2.COLOR_LAB2RGB)
    
    # 4. Normalize to [0,1]
    img_normalized = img_clahe / 255.0
    
    # Expand dims for batch size of 1
    return np.expand_dims(img_normalized, axis=0), img_resized

def is_road_like_image(img_array):
    if img_array.dtype != np.uint8:
        img_uint8 = (img_array * 255).astype(np.uint8)
    else:
        img_uint8 = img_array

    brightness = np.mean(img_uint8)
    if brightness < 30:
        return False, "Image is too dark. Please upload a well-lit road photo."
    if brightness > 220:
        return False, "Image is too bright or appears to be a document. Please upload a real road photo."

    hsv = cv2.cvtColor(img_uint8, cv2.COLOR_RGB2HSV)
    mean_saturation = np.mean(hsv[:, :, 1])
    
    if mean_saturation > 60:
        return False, "This appears to be a face, indoor scene, or graphic (too much color). Please upload a standard road photo."

    return True, "OK"

class RoadDamagePredictor:
    def __init__(self, model_path=MODEL_PATH):
        self.model_path = model_path
        self.model = None
        self._load_model()

    def _load_model(self):
        if os.path.exists(self.model_path):
            try:
                self.model = load_model(self.model_path)
                print("Model loaded successfully!")
            except Exception as e:
                print(f"Error loading model: {e}")
        else:
            print(f"Model not found at {os.path.abspath(self.model_path)}. Please run train.py first.")

    def _get_severity(self, damage_class, confidence):
        bands = SEVERITY_BANDS.get(damage_class, {})
        for (low, high), (severity, description) in bands.items():
            if low <= confidence < high:
                return severity, description
        return "Low", "Minor damage detected."

    def _get_damage_type_label(self, base_class, confidence):
        if base_class == "Normal":
            return "Normal Road Surface"
        elif base_class == "Crack":
            return "Surface Cracking"
        elif base_class == "Pothole":
            if confidence >= 0.88:
                return "Pothole (Severe)"
            elif confidence >= 0.70:
                return "Pothole (Moderate)"
            else:
                return "Pothole (Minor)"
        return base_class

    def predict(self, image_path):
        if self.model is None:
            return {"error": "Model not loaded. Please retrain."}

        try:
            processed_img, raw_img = preprocess_image(image_path)
        except Exception as e:
            return {"error": f"Could not process image: {e}"}

        # Validate if it looks like a road
        is_road, reason = is_road_like_image(raw_img)
        if not is_road:
            return {"error": f"⚠️ Not a road image: {reason}"}

        try:
            predictions = self.model.predict(processed_img)
            
            predicted_class_idx = int(np.argmax(predictions[0]))
            confidence = float(predictions[0][predicted_class_idx])
            base_class = CLASSES[predicted_class_idx]

            # Reject non-road classifications
            if base_class == "Non_Road":
                return {"error": "⚠️ AI determined this is not a road surface."}

            if base_class == "Normal" and confidence < 0.60:
                 return {
                    "class": "Unknown",
                    "confidence": round(confidence, 4),
                    "severity": "Unknown",
                    "description": "Image is ambiguous or unclear. Could not confidently classify.",
                    "damage_score": 0
                 }

            severity, description = self._get_severity(base_class, confidence)
            damage_label = self._get_damage_type_label(base_class, confidence)
            
            # Simple 0-10 severity score (10 = absolute worst)
            damage_score = 0
            if base_class != "Normal":
                damage_score = round(confidence * 10, 1)

            result = {
                "class": damage_label,
                "confidence": round(confidence, 4),
                "severity": severity,
                "description": description,
                "damage_score": damage_score
            }

            return result

        except Exception as e:
            return {"error": str(e)}

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        img_path = sys.argv[1]
        predictor = RoadDamagePredictor()
        result = predictor.predict(img_path)
        print("\n===== PREDICTION RESULT =====")
        for k, v in result.items():
            print(f"  {k}: {v}")
        print("="*29)
    else:
        print("Usage: python inference.py <image_path>")
