import os
import argparse
import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau
from dataset_utils import create_data_generators, IMG_SIZE, BATCH_SIZE, VALIDATION_SPLIT
import numpy as np
from sklearn.utils.class_weight import compute_class_weight

DATA_DIR = 'dataset'
MODEL_SAVE_PATH = 'road_damage_model.h5'
NUM_CLASSES = 2  # Binary classification: Pothole (1) or Normal (0)

def build_model(num_classes, learning_rate=0.0001, fine_tune=False):
    """Builds the model using MobileNetV2 as a base."""
    base_model = MobileNetV2(weights='imagenet', include_top=False, input_shape=(IMG_SIZE, IMG_SIZE, 3))
    
    # Fine-tuning: unfreeze last 30 layers for better accuracy
    if fine_tune:
        base_model.trainable = True
        for layer in base_model.layers[:-30]:
            layer.trainable = False
        print("✓ Fine-tuning enabled - will train last 30 layers")
    else:
        # Initial training: freeze base model
        base_model.trainable = False
        print("✓ Transfer learning mode - base model frozen")

    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dropout(0.3)(x)  # Increased from 0.2
    x = Dense(256, activation='relu')(x)  # Increased from 128
    x = Dropout(0.3)(x)  # Added extra dropout layer
    x = Dense(128, activation='relu')(x)  # Added extra dense layer
    predictions = Dense(num_classes, activation='softmax')(x)

    model = Model(inputs=base_model.input, outputs=predictions)
    
    model.compile(optimizer=Adam(learning_rate=learning_rate),
                  loss='categorical_crossentropy',
                  metrics=['accuracy'])
    
    return model

def train(args):
    print(f"Preparing data generators from {DATA_DIR} with {VALIDATION_SPLIT*100}% validation split...")
    try:
        train_gen, val_gen = create_data_generators(DATA_DIR, args.batch_size)
    except Exception as e:
        print(f"Error creating data generators: {e}")
        return

    if train_gen.samples == 0:
        print("No training data found in 'dataset' folder.")
        print("\n⚠️  ATTENTION: Please add training images first!")
        return

    num_classes = train_gen.num_classes
    print(f"Building model with MobileNetV2 base for {num_classes} classes...")
    model = build_model(num_classes, args.learning_rate, fine_tune=args.fine_tune)
    model.summary()

    print(f"\n✓ Training data found:")
    print(f"  Training samples: {train_gen.samples}")
    print(f"  Validation samples: {val_gen.samples}")
    print(f"  Classes: {train_gen.class_indices}")
    
    # Compute class weights to handle imbalanced dataset (e.g. 1000 potholes vs 70 cracks)
    class_weights = compute_class_weight(
        'balanced',
        classes=np.unique(train_gen.classes),
        y=train_gen.classes
    )
    class_weight_dict = dict(enumerate(class_weights))
    print(f"  Class weights: {class_weight_dict}")
    
    print(f"\nStarting training for {args.epochs} epochs...")
    print(f"Batch size: {args.batch_size}, Learning rate: {args.learning_rate}")
    
    callbacks = [
        ModelCheckpoint(MODEL_SAVE_PATH, save_best_only=True, monitor='val_loss', mode='min', verbose=1),
        EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True, verbose=1),
        ReduceLROnPlateau(monitor='val_loss', factor=0.2, patience=3, min_lr=1e-6, verbose=1)
    ]

    history = model.fit(
        train_gen,
        steps_per_epoch=max(1, train_gen.samples // args.batch_size),
        validation_data=val_gen,
        validation_steps=max(1, val_gen.samples // args.batch_size),
        epochs=args.epochs,
        callbacks=callbacks,
        class_weight=class_weight_dict
    )

    print("\n" + "="*60)
    print("✓ Training complete!")
    print("="*60)
    print(f"Model saved to: {MODEL_SAVE_PATH}")
    print(f"Final validation accuracy: {history.history['val_accuracy'][-1]:.2%}")
    print("="*60)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Road Damage Detection Model")
    parser.add_argument("--epochs", type=int, default=50, help="Number of epochs (default: 50)")
    parser.add_argument("--batch_size", type=int, default=16, help="Batch size (default: 16)")
    parser.add_argument("--learning_rate", type=float, default=0.0001, help="Learning rate (default: 0.0001)")
    parser.add_argument("--fine_tune", action="store_true", help="Enable fine-tuning of base model")
    
    args = parser.parse_args()
    train(args)
