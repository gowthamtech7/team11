# Model Training Guide - Step by Step

## Step 1: Prepare Dataset

### Option A: Quick Download (Recommended)

```cmd
cd ml_model
python download_dataset.py
```

This will show you all available datasets to download.

### Option B: Manual Download

**Best dataset for India: RDD2020**
1. Go to: https://github.com/sekilab/RDD2020
2. Download the repository (green "Code" button → Download ZIP)
3. Extract and copy India images to:
   - `ml_model/dataset/pothole/` (potholes)
   - `ml_model/dataset/crack/` (cracks)
   - `ml_model/dataset/normal/` (normal roads)

**Each folder should have 100+ images minimum** (200+ is better)

### Verify Your Data:
```cmd
cd ml_model
python
>>> from dataset_utils import verify_images
>>> verify_images('dataset')
```

---

## Step 2: Configure Training Parameters

Edit the command below based on your needs:

### **Fast Training (Quick Test)** - 30 mins
```cmd
python train.py --epochs 20 --batch_size 32
```

### **Balanced Training (Good Accuracy)** - 2 hours ⭐ RECOMMENDED
```cmd
python train.py --epochs 50 --batch_size 16
```

### **Deep Training (Best Accuracy)** - 4-6 hours
```cmd
python train.py --epochs 100 --batch_size 16 --fine_tune
```

### **Fine-tuning (After initial training)**
```cmd
python train.py --epochs 30 --batch_size 8 --fine_tune --learning_rate 0.00001
```

---

## Step 3: Run Training

```cmd
cd ml_model
python train.py --epochs 50 --batch_size 16
```

**Expected Output:**
```
Building model with MobileNetV2 base...
Model: "functional_1"
...
✓ Training data found:
  Training samples: 320
  Validation samples: 80
  Classes: {'crack': 0, 'normal': 1, 'pothole': 2}

Starting training for 50 epochs...
Epoch 1/50
...
Epoch 50/50
✓ Training complete!
Final validation accuracy: 94.50%
```

---

## Step 4: Monitor Training

### What to Look For:

**Good Training:**
- Training accuracy keeps increasing ↗️
- Validation accuracy increases (not too much lag)
- Validation loss keeps decreasing ↘️

```
Epoch 10/50 - loss: 0.45, accuracy: 0.88, val_loss: 0.52, val_accuracy: 0.85
Epoch 20/50 - loss: 0.32, accuracy: 0.92, val_loss: 0.38, val_accuracy: 0.91
Epoch 50/50 - loss: 0.18, accuracy: 0.96, val_loss: 0.31, val_accuracy: 0.94 ✓
```

**Over-fitting (Bad):**
- Training accuracy: 99% but Validation accuracy: 70% ❌
- Validation loss starts increasing while training loss decreases ❌

**Solution for Over-fitting:** Reduce `batch_size` to 8 or increase `dropout`

---

## Step 5: Test Your Model

After training completes, test with a single image:

```cmd
python inference.py path/to/test_image.jpg
```

**Expected Output:**
```python
{
    "class": "Crack",
    "confidence": 0.94,
    "severity": "High"
}
```

---

## Step 6: Deploy

Once you're happy with accuracy (>90%), restart the backend:

```cmd
# Stop backend (Ctrl+C)
# Then run:
python -m uvicorn main:app --reload
```

Now when you upload images through the frontend, they'll be analyzed with your trained model!

---

## Tips for Best Results

### 1. **Data Quality > Quantity**
- Clear, well-lit images are better than blurry ones
- Remove any images that aren't road damage
- Ensure images show actual Indian roads

### 2. **Balanced Dataset**
- Each class (pothole, crack, normal) should have roughly equal images
- If one class has 500 images and another has 50, accuracy will suffer

### 3. **Data Augmentation**
- Already enabled in `dataset_utils.py`
- Automatically rotates, flips, zooms images during training

### 4. **If Accuracy is Low (<80%)**
- Add more training data (target: 300+ per class)
- Use `--epochs 100` for longer training
- Enable `--fine_tune` to train the base model too

### 5. **If Training is Slow**
- Reduce image size in `dataset_utils.py`: `IMG_SIZE = 150` (from 224)
- Use `--batch_size 32` instead of 16
- Disable fine-tuning: remove `--fine_tune` flag

---

## Troubleshooting

### Error: "No training data found"
```
Solution: Make sure you have images in:
  ml_model/dataset/pothole/
  ml_model/dataset/crack/
  ml_model/dataset/normal/
```

### Error: "CUDA out of memory"
```
Solution: Reduce batch size
python train.py --epochs 50 --batch_size 8
```

### Model accuracy is only 60%
```
Solutions:
1. Add more training images (200+ per class)
2. Improve image quality (clear, well-lit)
3. Train longer: python train.py --epochs 100
4. Enable fine-tuning: python train.py --epochs 50 --fine_tune
```

### Training takes too long
```
Solution: Reduce epochs or batch size
python train.py --epochs 30 --batch_size 32
```

---

## Performance Metrics

### Expected Accuracy by Training Data

| Dataset Size | Epochs | Expected Accuracy |
|-------------|--------|------------------|
| 50 images/class | 20 | 70-75% |
| 100 images/class | 50 | 80-85% |
| 200+ images/class | 100 | 90-95% |
| 500+ images/class | 100 + fine-tune | 95%+ |

---

## Next Steps

1. **Download RDD2020 dataset** (5,000+ Indian road images)
2. **Run training** with recommended settings
3. **Monitor accuracy** in console output
4. **Test predictions** on new images
5. **Deploy to production** once accuracy > 90%

Good luck! 🚀
