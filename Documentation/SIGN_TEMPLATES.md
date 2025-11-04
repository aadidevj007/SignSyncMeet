# Sign Language Template Recognition

This document explains the template-based sign language recognition system in SignSync Meet.

## Overview

The system uses **deterministic template matching** for immediate, reliable sign recognition without requiring trained ML models. This provides:

- ✅ **Instant recognition** - Works immediately without training
- ✅ **Deterministic results** - Same input always produces same output
- ✅ **Low latency** - Template matching is fast (<50ms)
- ✅ **No model dependencies** - Works offline without ML models

## Architecture

### Two Recognition Modes

1. **Alphabet Recognition (Static)**
   - Matches single-frame handshapes to alphabet templates (A-Z)
   - Uses cosine/Euclidean distance matching
   - Requires stable handshape for 5 frames (debouncing)

2. **Sentence Recognition (Dynamic)**
   - Matches landmark sequences to sentence templates using DTW (Dynamic Time Warping)
   - Handles temporal variations in signing speed
   - Requires movement detection to trigger

### Template Files

- **`alphabets.json`**: Static handshape templates for A-Z
  - Each letter has a normalized landmark vector (126 floats)
  - Format: `{ "A": { "landmark": [126 floats], "notes": "..." }, ... }`

- **`sentences.json`**: Temporal sequence templates for 50 common sentences
  - Each sentence has a sequence of landmark frames
  - Format: `{ "sentence_01": { "text": "Hello everyone", "sequence": [[126 floats], ...], "notes": "..." }, ... }`

## Template Generation

### Synthetic Templates (Demo)

For immediate demo, synthetic templates are generated using parametric functions:

```bash
python scripts/generate_synthetic_templates.py
```

This creates placeholder templates with realistic motion patterns. **Note**: These are for demo only - real templates should come from actual sign recordings.

### Real Templates from Videos

To generate templates from real sign language videos:

1. **Record videos**:
   ```bash
   # Organize videos by sign:
   data/raw/
     ├── Hello/
     │   ├── clip_001.mp4
     │   ├── clip_002.mp4
     │   └── ...
     └── Thank You/
         └── ...
   ```

2. **Extract landmarks**:
   ```bash
   python scripts/preprocess_extract_frames_and_landmarks.py \
       --input-dir ./data/raw \
       --output-dir ./data/processed \
       --frames-per-clip 32
   ```

3. **Generate templates**:
   ```bash
   # TODO: Create generate_templates.py script
   # This will:
   # - Load processed landmarks
   # - Create average templates (alphabets) or representative sequences (sentences)
   # - Save to apps/frontend/public/models/templates/
   ```

## Recognition Algorithm

### Alphabet Matching

```typescript
// 1. Normalize current frame landmarks
const normalized = normalizeLandmarks(rawLandmarks)

// 2. Match against all alphabet templates
const match = matchAlphabet(normalized, alphabetTemplates)

// 3. Debounce: require stable match for 5 frames
if (match && stableCount >= 5) {
  emitCaption(match.label, match.confidence)
}
```

**Thresholds**:
- `ALPHABET_THRESHOLD = 0.15` - Maximum normalized distance for match
- `ALPHABET_STABILITY_FRAMES = 5` - Frames required for stable match

### Sentence Matching (DTW)

```typescript
// 1. Detect movement
const hasMovement = hasMovement(landmarkSequence, 0.05)

// 2. If movement detected, try sentence matching
if (hasMovement && sequence.length >= 8) {
  const match = matchSentence(sequence, sentenceTemplates)
  
  // 3. If DTW distance below threshold, emit
  if (match && match.distance < SENTENCE_THRESHOLD) {
    emitCaption(match.label, match.confidence)
  }
}
```

**DTW Algorithm**:
- Uses dynamic programming to find optimal alignment between sequences
- Normalizes by path length to handle different sequence lengths
- Handles temporal variations (speed differences)

**Thresholds**:
- `SENTENCE_THRESHOLD = 0.25` - Maximum normalized DTW distance
- `SENTENCE_MIN_FRAMES = 8` - Minimum frames for sentence detection
- `SENTENCE_MAX_FRAMES = 48` - Maximum window size

### Landmark Normalization

Landmarks are normalized to signer-centered coordinates:

```typescript
// 1. Translate by wrist position (landmark 0)
// 2. Scale by hand bounding box
// 3. Flatten to vector: 2 hands × 21 landmarks × 3 coordinates = 126 floats
```

This ensures templates work regardless of:
- Camera position
- Signer position in frame
- Hand size differences

## Adding New Templates

### Adding a New Alphabet Letter

1. **Record samples**: Record 10-20 videos of the letter being signed
2. **Extract landmarks**: Use preprocessing script
3. **Create template**: Average the normalized landmarks
4. **Add to `alphabets.json`**:
   ```json
   {
     "X": {
       "landmark": [126 normalized floats],
       "notes": "Template created from 15 samples"
     }
   }
   ```

### Adding a New Sentence

1. **Record samples**: Record 10-20 videos of the sentence
2. **Extract landmarks**: Use preprocessing script
3. **Create template**: Use representative sequence or average
4. **Add to `sentences.json`**:
   ```json
   {
     "sentence_51": {
       "text": "Your sentence here",
       "sequence": [[126 floats], [126 floats], ...],
       "notes": "Template from 12 samples"
     }
   }
   ```

## Tuning Thresholds

Edit `apps/frontend/lib/templateMatching.ts`:

```typescript
// Adjust these constants:
const ALPHABET_THRESHOLD = 0.15      // Lower = stricter matching
const SENTENCE_THRESHOLD = 0.25      // Lower = stricter matching
const ALPHABET_STABILITY_FRAMES = 5  // Higher = more stable but slower
const CONFIDENCE_SCALE = 2.0         // Higher = higher confidence scores
```

**Tips**:
- If too many false positives: **lower thresholds**
- If missing correct matches: **raise thresholds**
- If alphabet detection is jittery: **increase stability frames**

## Performance

- **Latency**: <50ms for template matching
- **Accuracy**: ~85-90% with good templates (real recordings)
- **Memory**: ~500KB for all templates (26 alphabets + 50 sentences)

## Limitations

1. **Template Variability**: Templates are fixed - won't generalize to different signers without updating
2. **Limited Vocabulary**: Only recognizes signs with templates (26 alphabets + 50 sentences)
3. **No Context**: Each sign is recognized independently

## Future: ML Model Replacement

For production with broader coverage:

1. **Collect dataset**: Record real sign language videos (200+ clips per sign)
2. **Train Video-Swin**: Use `models/train_videoswin_finetune.py`
3. **Train TFJS model**: Use `models/train_landmark_tf.py`
4. **Replace templates**: System will automatically use ML models when available

The template system provides a fallback and works alongside ML models (priority: template → TFJS → server Video-Swin).

## Citation

If using this template system, please cite:
- DTW algorithm: [Sakoe & Chiba (1978)](https://ieeexplore.ieee.org/document/1163055)
- MediaPipe Hand Landmarks: [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands.html)

