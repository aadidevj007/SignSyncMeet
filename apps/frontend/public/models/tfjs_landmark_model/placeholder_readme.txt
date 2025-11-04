TensorFlow.js Landmark Model Placeholder

This directory should contain your trained TensorFlow.js model files.

Required Files:
- model.json (model architecture and weights manifest)
- *.bin or *.weights.bin files (model weights)

Model Requirements:
- Input shape: [1, 32, 126] (batch, frames, features)
- Features: 126 (2 hands * 21 landmarks * 3 coordinates)
- Output: [num_classes] (softmax probabilities)
- Model size: < 10MB recommended for browser

How to add your model:

1. Train the landmark model:
   python models/train_landmark_tf.py --data-dir ./data/processed --epochs 50

2. Convert to TensorFlow.js:
   ./models/convert_tf_to_tfjs.sh

3. Copy model files here:
   cp -r models/landmark_model/tfjs_model/* public/models/tfjs_landmark_model/

Or download a pre-trained model and place the files in this directory.

For more details, see SIGN_LANGUAGE_PRODUCTION_IMPLEMENTATION.md

