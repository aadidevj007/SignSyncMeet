#!/usr/bin/env python3
"""
Train a small TF/Keras landmark classifier WITHOUT TensorFlow Addons.

Usage:
    python training/train_landmark_tf.py --config configs/tf_landmark_config.json
"""

import argparse
import json
import logging
from pathlib import Path
from typing import Dict, Any

import tensorflow as tf

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def load_config(config_path: str) -> Dict[str, Any]:
    with open(config_path, 'r') as f:
        return json.load(f)


def build_dataset(frames: int, features: int, num_classes: int, batch_size: int):
    def _gen():
        # Synthetic generator for smoke test; replace with real landmark pipeline
        while True:
            x = tf.random.normal([frames, features])
            y = tf.random.uniform([], minval=0, maxval=num_classes, dtype=tf.int32)
            yield x, y

    ds = tf.data.Dataset.from_generator(
        _gen,
        output_signature=(
            tf.TensorSpec(shape=(frames, features), dtype=tf.float32),
            tf.TensorSpec(shape=(), dtype=tf.int32),
        ),
    )
    # Core TF-only augmentations: random time crop/jitter, gaussian noise
    def _augment(x, y):
        # Random time shift within a small window
        max_shift = tf.cast(tf.math.maximum(1, frames // 16), tf.int32)
        shift = tf.random.uniform([], minval=-max_shift, maxval=max_shift + 1, dtype=tf.int32)
        def _shift_right():
            pad = tf.zeros([shift, tf.shape(x)[1]], dtype=x.dtype)
            return tf.concat([pad, x[:-shift]], axis=0)
        def _shift_left():
            pad = tf.zeros([-shift, tf.shape(x)[1]], dtype=x.dtype)
            return tf.concat([x[-shift:], pad], axis=0)
        def _no_shift():
            return x
        x_aug = tf.case([(tf.greater(shift, 0), _shift_right), (tf.less(shift, 0), _shift_left)], default=_no_shift)

        # Add gaussian noise
        noise = tf.random.normal(tf.shape(x_aug), stddev=0.01)
        x_aug = x_aug + noise
        return x_aug, y

    ds = ds.map(_augment, num_parallel_calls=tf.data.AUTOTUNE)
    ds = ds.batch(batch_size).prefetch(tf.data.AUTOTUNE)
    return ds


def build_model(frames: int, features: int, num_classes: int, lr: float) -> tf.keras.Model:
    inputs = tf.keras.Input(shape=(frames, features), name='landmarks')
    x = inputs
    # Simple Conv1D stack + MHAttention (core TF only)
    x = tf.keras.layers.Conv1D(128, 3, padding='same', activation='relu')(x)
    x = tf.keras.layers.Conv1D(128, 3, padding='same', activation='relu')(x)
    # Transformer-lite with core MultiHeadAttention
    attn = tf.keras.layers.MultiHeadAttention(num_heads=4, key_dim=32)
    x_attn = attn(x, x)
    x = tf.keras.layers.Add()([x, x_attn])
    x = tf.keras.layers.LayerNormalization()(x)
    x = tf.keras.layers.GlobalAveragePooling1D()(x)
    x = tf.keras.layers.Dense(256, activation='relu')(x)
    outputs = tf.keras.layers.Dense(num_classes, activation='softmax', name='probs')(x)

    model = tf.keras.Model(inputs=inputs, outputs=outputs, name='tf_landmark_no_tfa')
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=lr),
        loss=tf.keras.losses.SparseCategoricalCrossentropy(),
        metrics=[tf.keras.metrics.SparseCategoricalAccuracy(name='acc')],
    )
    return model


def main():
    parser = argparse.ArgumentParser(description='Train TF-only landmark model (no TFA)')
    parser.add_argument('--config', type=str, required=True, help='Path to config JSON')
    args = parser.parse_args()

    cfg = load_config(args.config)
    frames = int(cfg.get('frames', 32))
    features = int(cfg.get('features', 126))
    num_classes = int(cfg.get('num_classes', 50))
    batch_size = int(cfg.get('batch_size', 64))
    epochs = int(cfg.get('epochs', 10))
    lr = float(cfg.get('lr', 1e-3))
    out_dir = Path(cfg.get('output_dir', 'ml/checkpoints/tf_landmark'))
    out_dir.mkdir(parents=True, exist_ok=True)

    ds = build_dataset(frames, features, num_classes, batch_size)
    model = build_model(frames, features, num_classes, lr)

    logger.info('Starting TF-only training (no TFA)...')
    model.fit(ds, steps_per_epoch=10, epochs=max(1, epochs))

    saved_model_dir = out_dir / 'saved_model'
    tf.saved_model.save(model, str(saved_model_dir))
    logger.info(f'SavedModel written to: {saved_model_dir}')

    # Also export a small Keras H5 for reference
    model.save(out_dir / 'model.h5')
    logger.info(f'Keras H5 written to: {out_dir / "model.h5"}')


if __name__ == '__main__':
    main()


