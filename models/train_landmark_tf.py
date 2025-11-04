#!/usr/bin/env python3
"""
Train TensorFlow/Keras landmark-based model for sign language recognition.

This model takes landmark sequences (from MediaPipe) as input and classifies signs.

Usage:
    python train_landmark_tf.py \
        --data-dir ./data/processed \
        --epochs 50 \
        --batch-size 64 \
        --window-size 32 \
        --features 126 \
        --output-dir ./models/landmark_model
"""

import argparse
import os
import json
from pathlib import Path
import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, models, callbacks
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import tensorflow_addons as tfa  # For time warping augmentation

print(f"TensorFlow version: {tf.__version__}")


class LandmarkDataset:
    """Dataset for landmark sequences."""
    
    def __init__(self, data_dir: Path, split: str = 'train', window_size: int = 32, features: int = 126):
        self.data_dir = Path(data_dir) / split
        self.window_size = window_size
        self.features = features
        
        # Load labels
        labels_csv = self.data_dir / 'labels.csv'
        if not labels_csv.exists():
            raise FileNotFoundError(f"Labels CSV not found: {labels_csv}")
        
        self.df = pd.read_csv(labels_csv)
        
        # Load class names
        self.classes = sorted(self.df['class_name'].unique())
        self.label_encoder = LabelEncoder()
        self.label_encoder.fit(self.classes)
    
    def load_landmarks(self, clip_path: Path):
        """Load landmarks.npy file."""
        landmarks_path = clip_path / 'landmarks.npy'
        if not landmarks_path.exists():
            raise FileNotFoundError(f"Landmarks not found: {landmarks_path}")
        
        landmarks = np.load(str(landmarks_path))  # Shape: [T, features]
        return landmarks
    
    def pad_or_trim(self, landmarks: np.ndarray):
        """Pad or trim landmarks to window_size."""
        T = landmarks.shape[0]
        
        if T > self.window_size:
            # Uniformly sample
            indices = np.linspace(0, T - 1, self.window_size, dtype=int)
            return landmarks[indices]
        elif T < self.window_size:
            # Pad with last frame
            padding = np.repeat(landmarks[-1:], self.window_size - T, axis=0)
            return np.vstack([landmarks, padding])
        else:
            return landmarks
    
    def get_data(self):
        """Load all data."""
        X = []
        y = []
        
        for _, row in self.df.iterrows():
            clip_path = Path(row['clip_path'])
            
            try:
                landmarks = self.load_landmarks(clip_path)
                landmarks = self.pad_or_trim(landmarks)
                
                # Ensure correct feature dimension
                if landmarks.shape[1] < self.features:
                    padding = np.zeros((self.window_size, self.features - landmarks.shape[1]))
                    landmarks = np.hstack([landmarks, padding])
                elif landmarks.shape[1] > self.features:
                    landmarks = landmarks[:, :self.features]
                
                X.append(landmarks)
                y.append(row['class_name'])
            except Exception as e:
                print(f"⚠️ Error loading {clip_path}: {e}")
                continue
        
        X = np.array(X)  # [N, window_size, features]
        y = self.label_encoder.transform(y)
        
        return X, y, self.label_encoder


def create_landmark_model(window_size: int, features: int, num_classes: int):
    """
    Create landmark-based model.
    Architecture: 1D Convolution → Transformer Encoder → Dense Head
    """
    inputs = layers.Input(shape=(window_size, features))
    
    # 1D Convolutional layers for temporal feature extraction
    x = layers.Conv1D(128, kernel_size=3, padding='same', activation='relu')(inputs)
    x = layers.BatchNormalization()(x)
    x = layers.Conv1D(256, kernel_size=3, padding='same', activation='relu')(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(0.3)(x)
    
    # Transformer encoder block (small, efficient)
    # Multi-head self-attention
    attention_output = layers.MultiHeadAttention(
        num_heads=4, key_dim=64, dropout=0.2
    )(x, x)
    x = layers.Add()([x, attention_output])
    x = layers.LayerNormalization()(x)
    
    # Feed-forward
    ffn_output = layers.Dense(512, activation='relu')(x)
    ffn_output = layers.Dense(features)(ffn_output)
    x = layers.Add()([x, ffn_output])
    x = layers.LayerNormalization()(x)
    
    # Global pooling
    x = layers.GlobalAveragePooling1D()(x)
    x = layers.Dropout(0.4)(x)
    
    # Classification head
    x = layers.Dense(256, activation='relu')(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(num_classes, activation='softmax')(x)
    
    model = models.Model(inputs=inputs, outputs=outputs)
    return model


def augment_landmarks(landmarks: np.ndarray, noise_std: float = 0.01, jitter_prob: float = 0.3):
    """Simple augmentation: add noise/jitter to landmarks."""
    if np.random.random() < jitter_prob:
        noise = np.random.normal(0, noise_std, landmarks.shape)
        landmarks = landmarks + noise
    return landmarks


def main():
    parser = argparse.ArgumentParser(description='Train landmark-based TF model')
    parser.add_argument('--data-dir', required=True, type=Path, help='Data directory')
    parser.add_argument('--epochs', type=int, default=50, help='Number of epochs')
    parser.add_argument('--batch-size', type=int, default=64, help='Batch size')
    parser.add_argument('--window-size', type=int, default=32, help='Number of frames per sequence')
    parser.add_argument('--features', type=int, default=126, help='Number of landmark features (2 hands * 21 * 3)')
    parser.add_argument('--output-dir', type=Path, default='./models/landmark_model', help='Output directory')
    parser.add_argument('--val-split', type=float, default=0.2, help='Validation split ratio')
    parser.add_argument('--lr', type=float, default=1e-3, help='Learning rate')
    
    args = parser.parse_args()
    
    print(f"📂 Loading data from {args.data_dir}")
    
    # Load train data
    train_dataset = LandmarkDataset(
        args.data_dir, split='train',
        window_size=args.window_size,
        features=args.features
    )
    X_train, y_train, label_encoder = train_dataset.get_data()
    
    print(f"✅ Loaded {len(X_train)} training samples")
    print(f"📊 Number of classes: {len(train_dataset.classes)}")
    print(f"   Classes: {train_dataset.classes}")
    
    # Split validation
    X_train, X_val, y_train, y_val = train_test_split(
        X_train, y_train, test_size=args.val_split, random_state=42, stratify=y_train
    )
    
    print(f"📊 Train: {len(X_train)}, Val: {len(X_val)}")
    
    # Create model
    num_classes = len(train_dataset.classes)
    model = create_landmark_model(args.window_size, args.features, num_classes)
    
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=args.lr),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy', 'top_k_categorical_accuracy']
    )
    
    print("\n📐 Model summary:")
    model.summary()
    
    # Callbacks
    args.output_dir.mkdir(parents=True, exist_ok=True)
    checkpoint_path = args.output_dir / 'best_model.ckpt'
    
    callbacks_list = [
        callbacks.ModelCheckpoint(
            str(checkpoint_path),
            monitor='val_accuracy',
            save_best_only=True,
            verbose=1
        ),
        callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            verbose=1
        ),
        callbacks.EarlyStopping(
            monitor='val_loss',
            patience=10,
            restore_best_weights=True
        )
    ]
    
    # Data augmentation (simple wrapper)
    def generator(X, y, batch_size, augment=False):
        while True:
            indices = np.random.permutation(len(X))
            for i in range(0, len(X), batch_size):
                batch_indices = indices[i:i+batch_size]
                batch_X = X[batch_indices]
                batch_y = y[batch_indices]
                
                if augment:
                    batch_X = np.array([augment_landmarks(x) for x in batch_X])
                
                yield batch_X, batch_y
    
    # Training
    print("\n🚀 Starting training...")
    history = model.fit(
        X_train, y_train,
        batch_size=args.batch_size,
        epochs=args.epochs,
        validation_data=(X_val, y_val),
        callbacks=callbacks_list,
        verbose=1
    )
    
    # Save final model
    saved_model_path = args.output_dir / 'saved_model'
    model.save(str(saved_model_path))
    print(f"\n✅ Saved model to {saved_model_path}")
    
    # Save class names
    with open(args.output_dir / 'class_names.txt', 'w') as f:
        for cls in train_dataset.classes:
            f.write(f"{cls}\n")
    
    # Save training history
    with open(args.output_dir / 'history.json', 'w') as f:
        json.dump({k: [float(v) for v in vals] for k, vals in history.history.items()}, f, indent=2)
    
    print(f"\n✅ Training complete!")
    print(f"   Best val accuracy: {max(history.history['val_accuracy']):.4f}")


if __name__ == '__main__':
    main()

