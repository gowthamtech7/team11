import sys
import os

# Add ml_model to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ml_model')))

from inference import RoadDamagePredictor

class MLService:
    _instance = None
    _predictor = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = MLService()
            # Initialize predictor
            # Get the project root directory (parent of backend)
            backend_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.dirname(backend_dir)
            model_path = os.path.join(project_root, 'ml_model', 'road_damage_model.h5')
            
            # Debug: print the path
            print(f"[DEBUG] Model path: {model_path}")
            print(f"[DEBUG] Model exists: {os.path.exists(model_path)}")
            
            cls._predictor = RoadDamagePredictor(model_path)
        return cls._instance

    def predict(self, image_path):
        if self._predictor:
            return self._predictor.predict(image_path)
        return {"error": "Model not initialized"}
