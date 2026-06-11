# Roadmap to Better Accuracy: Dataset Guide

To improve the accuracy of the Road Damage Detection model, you need a high-quality dataset. The current model is set up to learn from images of **Potholes**, **Cracks**, and **Normal** roads.

## 1. Where to Get Data

We recommend using the **RDD2022 (Road Damage Dataset 2022)** or similar public datasets.

- **RDD2022**: [https://github.com/sekilab/RoadDamageDetector/](https://github.com/sekilab/RoadDamageDetector/)
- **Kaggle Pothole Datasets**: Search for "pothole detection" on Kaggle.

## 2. How to Organize Data

You need to organize your images into the following folder structure inside the `ml_model/dataset` directory:

```
ml_model/
  └── dataset/
      ├── crack/      <-- Put images of road cracks here
      ├── normal/     <-- Put images of normal roads (no damage) here
      └── pothole/    <-- Put images of potholes here
```

### Tips for Better Accuracy:
1.  **Balance your data**: Try to have roughly the same number of images for each class (e.g., 500 cracks, 500 potholes, 500 normal).
2.  **Variety**: Include images with different lighting conditions, angles, and road types.
3.  **Clean Data**: Remove blurry or ambiguous images.

## 3. Training the Model

Once you have placed the images in the folders, run the training script:

```bash
# Navigate to the ml_model directory
cd ml_model

# Run the training script (default 20 epochs)
python train.py --epochs 20
```

The script will automatically:
- Load the images.
- Split them into training and validation sets.
- Train the model.
- Save the best version of the model to `road_damage_model.h5`.

## 4. Verifying

After training, the new `road_damage_model.h5` will be used by the backend automatically (you may need to restart the backend server).
