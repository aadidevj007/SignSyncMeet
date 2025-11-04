# Sign Detection Integration Guide

This document explains how to set up and use the production-ready sign language detection pipeline in SignSync Meet.

## Architecture Overview

The sign detection system uses a **two-tier approach**:

1. **Client-side (Fast Path)**: 
   - MediaPipe Hand Landmarker extracts 21 hand landmarks per frame
   - TensorFlow.js micro-model classifies landmark sequences in real-time (<100ms)
   - Shows instant captions when confidence > 0.85

2. **Server-side (Slow Path)**:
   - Low-confidence clips (< 0.85) are sent to server
   - Video-Swin Transformer (heavy model) provides high-accuracy inference (~300-1200ms)
   - Results fused with local predictions for best accuracy

## Installation

### Prerequisites

```bash
# Frontend dependencies (already installed)
pnpm install

# Backend dependencies
cd apps/backend
npm install

# Python dependencies for training
pip install -r requirements.txt
```

### Environment Variables

Add to `.env`:

```env
# Inference Configuration
INFERENCE_TEMP_DIR=./tmp/infer
CONFIDENCE_THRESHOLD=0.85
TFJS_MODEL_URL=/models/tfjs_landmark_model/model.json

# Server Inference (optional)
TRITON_URL=http://localhost:8000
TORCHSERVE_URL=http://localhost:8080

# Firebase (already configured)
FIREBASE_PROJECT_ID=signsync-meet-f2053

# MongoDB (already configured)
MONGODB_URI=...
```

## Quick Start

### 1. Place TFJS Model

Place your trained TensorFlow.js model in:
```
apps/frontend/public/models/tfjs_landmark_model/
  ├── model.json
  └── *.bin (weight files)
```

**Note**: If no model is present, the system will show a warning but MediaPipe detection will still work.

### 2. Start Servers

```bash
# From project root
pnpm dev

# Or use start.bat (Windows)
./start.bat
```

### 3. Test Detection

1. Join a meeting
2. Click "Sign to Text" button (cyan)
3. Position hands in front of camera
4. See real-time sign detection!

## Training Your Own Models

### Step 1: Prepare Dataset

Download datasets and organize them:

```bash
# Create data directory
mkdir -p data/raw

# Download WLASL (example)
# Follow instructions at: https://github.com/dxli94/WLASL
# Place videos in: data/raw/wlasl/videos/{class_name}/*.mp4

# Or use custom structure:
# data/raw/{class_name}/*.mp4
```

### Step 2: Preprocess Videos

Extract frames and landmarks:

```bash
python scripts/preprocess_extract_frames_and_landmarks.py \
    --input-dir ./data/raw \
    --output-dir ./data/processed \
    --frames-per-clip 32 \
    --dataset-format custom
```

Output structure:
```
data/processed/train/
  ├── Hello/
  │   ├── clip_001/
  │   │   ├── frames/
  │   │   │   ├── frame_0000.jpg
  │   │   │   └── ...
  │   │   ├── landmarks.npy
  │   │   └── metadata.json
  │   └── ...
  └── labels.csv
```

### Step 3: Train Landmark Model (TFJS)

Train lightweight model for client-side:

```bash
python models/train_landmark_tf.py \
    --data-dir ./data/processed \
    --epochs 50 \
    --batch-size 64 \
    --window-size 32 \
    --features 126 \
    --output-dir ./models/landmark_model
```

### Step 4: Convert to TensorFlow.js

```bash
chmod +x models/convert_tf_to_tfjs.sh
./models/convert_tf_to_tfjs.sh
```

This creates:
```
apps/frontend/public/models/tfjs_landmark_model/
  ├── model.json
  └── *.bin
```

### Step 5: Train Video-Swin (Server-side)

For high-accuracy server inference:

```bash
python models/train_videoswin_finetune.py \
    --data-dir ./data/processed \
    --epochs 30 \
    --batch-size 8 \
    --lr 1e-4 \
    --num-classes 10 \
    --checkpoint-out ./models/checkpoints/videoswin_best.pth
```

### Step 6: Export for Server (Optional)

Export to ONNX for Triton Inference Server:

```bash
python models/export_onnx.py \
    --checkpoint ./models/checkpoints/videoswin_best.pth \
    --output ./models/videoswin.onnx \
    --num-classes 10

# Create Triton config
chmod +x models/convert_onnx_to_triton_config.sh
./models/convert_onnx_to_triton_config.sh
```

## Adding New Signs

To add new signs to your model:

### 1. Record Data

- Record **200+ clips** per sign
- Include diverse signers, lighting, backgrounds
- Clips should be 2-5 seconds
- Save as MP4 files

### 2. Organize Data

```bash
data/raw/
  ├── NewSign/
  │   ├── clip_001.mp4
  │   ├── clip_002.mp4
  │   └── ...
  └── AnotherSign/
      └── ...
```

### 3. Preprocess

```bash
python scripts/preprocess_extract_frames_and_landmarks.py \
    --input-dir ./data/raw \
    --output-dir ./data/processed \
    --dataset-format custom
```

### 4. Retrain Models

**Landmark model:**
```bash
python models/train_landmark_tf.py --data-dir ./data/processed
./models/convert_tf_to_tfjs.sh
```

**Video-Swin (if needed):**
```bash
python models/train_videoswin_finetune.py --data-dir ./data/processed
```

### 5. Deploy

- Copy new TFJS model to `public/models/tfjs_landmark_model/`
- Restart frontend
- Update server checkpoint if using Video-Swin

## API Usage

### Client-Side Component

```tsx
import MediaPipeSignDetector from '@/components/MediaPipeSignDetector'

<MediaPipeSignDetector
  onCaption={(text, confidence, source) => {
    console.log(`${text} (${confidence}) from ${source}`)
  }}
  options={{
    windowSize: 32,
    confidenceThreshold: 0.85,
    enableServerFallback: true,
    autoSendToServer: true
  }}
/>
```

### Server Inference API

**POST /api/infer**

```javascript
const response = await fetch('/api/infer', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${idToken}`
  },
  body: JSON.stringify({
    clipBase64: base64VideoClip,
    landmarks: [...], // Optional
    meta: {
      timestamp: Date.now(),
      localLabel: 'Hello',
      localConfidence: 0.75
    }
  })
})

const result = await response.json()
// { label: 'Hello', confidence: 0.92, model: 'videoswin-v1' }
```

## Dataset Links

### Public Datasets

- **WLASL**: https://github.com/dxli94/WLASL
  - 2000 signs, 21k videos
  - License: CC BY 4.0
  
- **RWTH-PHOENIX**: https://www-i6.informatik.rwth-aachen.de/~forster/database-rwth-phoenix-weather-2014-t/
  - German Sign Language
  - 1295 signs
  
- **ASLLVD**: https://asl.cs.bu.edu/
  - American Sign Language Lexicon Video Dataset
  
- **Kaggle ISL**: https://www.kaggle.com/datasets/vaishnavivenkatesan/indian-sign-language-dataset
  - Indian Sign Language

**Note**: Download datasets separately. Do NOT commit raw dataset files to repository.

## Performance Expectations

- **TFJS Model**: 
  - Latency: < 100ms
  - Accuracy: 85-90% (with good dataset)
  - Model size: < 10MB

- **Video-Swin (Server)**:
  - Latency: 300-1200ms (depends on GPU)
  - Accuracy: 95%+ (with 200+ examples per sign)
  - Throughput: ~10-50 req/s (GPU dependent)

## Troubleshooting

### TFJS Model Not Loading

- Check browser console for errors
- Verify `model.json` exists in `public/models/tfjs_landmark_model/`
- Check CORS settings if loading from CDN
- Ensure model size < 10MB

### Low Detection Accuracy

- Increase training data (200+ clips per sign)
- Check landmark quality in preprocessing
- Adjust confidence thresholds
- Use server inference for better accuracy

### Server Inference Failing

- Verify Firebase authentication token
- Check `INFERENCE_TEMP_DIR` is writable
- Ensure Python dependencies installed
- Check Triton/TorchServe URLs if using external server

## Security & Privacy

- User consent required for server inference
- Clips stored temporarily (auto-deleted after 24h)
- Authentication required for all inference requests
- Opt-out available for data collection

## Citation

If using public datasets, please cite:

- WLASL: [WLASL Paper](https://arxiv.org/abs/1910.11006)
- RWTH-PHOENIX: [Phoenix Dataset](https://www-i6.informatik.rwth-aachen.de/~forster/database-rwth-phoenix-weather-2014-t/)
- ASLLVD: [ASLLVD Website](https://asl.cs.bu.edu/)

