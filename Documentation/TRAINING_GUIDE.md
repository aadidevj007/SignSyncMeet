# Training Guide

This guide walks you through training sign-language models (Video-Swin + PoseFormerV2) and converting to TFJS.

## Environment

```bash
# From repo root
cd ml
python -m venv .venv
# Windows PowerShell
. .venv\Scripts\Activate.ps1
# macOS/Linux
# source .venv/bin/activate

pip install -r requirements.txt
```

GPU tips:
- Recommended: NVIDIA GPU with ≥12GB VRAM (Video-Swin), ≥8GB (PoseFormerV2)
- Enable AMP (mixed precision) by default in configs

## Datasets (quick overview)
- Place raw datasets under `ml/data/raw/*` (see Documentation/DATASETS.md)
- Transform parameters come from JSON configs

## Exact Commands (as requested)

**Note**: tensorflow-addons is NOT required anywhere. All scripts work with only the packages listed in `ml/requirements.txt`.

### 1) Video-Swin Training
```bash
cd ml
python training/train_video_swin.py --config configs/video_swin_config.json
```

### 2) PoseFormerV2 Training
```bash
python training/train_poseformer.py --config configs/poseformer_config.json
```

### 3) TFJS Model Conversion
```bash
python convert/to_tfjs.py --config configs/tfjs_config.json --pytorch-model checkpoints/best_model.pth --model-name sign_detector
```

### 4) TF-only Landmark Model (Optional)
```bash
python training/train_landmark_tf.py --config configs/tf_landmark_config.json
python convert/to_tfjs.py --config configs/tfjs_config.json
```

Notes:
- Best checkpoint from Video-Swin training is saved to `ml/checkpoints/videoswin/best_model.pth`.
- Adjust the `--pytorch-model` path for conversion accordingly.

## Useful Flags

- Dry run (sanity check one batch):
```bash
python training/train_video_swin.py --config configs/video_swin_config.json --dry-run
```

- Evaluate only (on a checkpoint):
```bash
python training/train_video_swin.py --config configs/video_swin_config.json --eval-only --checkpoint ml/checkpoints/videoswin/best_model.pth
```

- Resume training:
```bash
python training/train_video_swin.py --config configs/video_swin_config.json --resume --checkpoint ml/checkpoints/videoswin/last_model.pth
```

## Outputs

### PyTorch Models
- Checkpoints: `ml/checkpoints/<exp>/best_model.pth` and `ml/checkpoints/best_model.pth`
- TensorBoard logs: `ml/checkpoints/<exp>/runs/<exp_name>`

### TF SavedModel
- SavedModel: `ml/checkpoints/tf_landmark/saved_model/`
- Keras H5: `ml/checkpoints/tf_landmark/model.h5`

### TFJS Models
- TFJS: `apps/frontend/public/models/tfjs_landmark_model/sign_detector/model.json`
- ONNX (fallback): `apps/frontend/public/models/tfjs_landmark_model/onnx/sign_detector.onnx`

## Expected Hardware
- Video-Swin: ~8–12GB VRAM (batch_size=8, clip_len=16)
- PoseFormerV2: ~6–8GB VRAM (batch_size=16, seq_len=32)

## Configuration Files
- `ml/configs/video_swin_config.json`: datasets, training hyperparams, data aug, task type
- `ml/configs/poseformer_config.json`: PoseFormerV2 dims and training params
- `ml/configs/tfjs_config.json`: TFJS export shape and output path

## Conversion Details
The TFJS conversion path is: PyTorch → ONNX → TFJS. If ONNX→TFJS is not available on your machine, the script falls back to exporting TorchScript and prints manual steps to complete TFJS conversion.

- ONNX export: `ml/convert/export_onnx.py`
- TorchScript export: `ml/convert/export_torchscript.py`
- Triton template: `ml/convert/triton/model_config_template.pbtxt`

## Troubleshooting
- Missing dataset paths: training will WARN and skip; training proceeds if at least one dataset is present.
- Install errors: ensure CUDA/PyTorch versions match your driver; check `ml/requirements.txt`.
- TFJS errors: install `tensorflowjs` and follow the manual command printed by the script.

---

## Quick Smoke Test (No Datasets)

Training scripts automatically use synthetic data when datasets are missing. For explicit dry-run:

```bash
# 1) Video-Swin dry-run (creates checkpoint)
python training/train_video_swin.py --config configs/video_swin_config.json --dry-run

# 2) PoseFormerV2 dry-run (creates checkpoint)
python training/train_poseformer.py --config configs/poseformer_config.json --dry-run

# 3) Convert to TFJS
python convert/to_tfjs.py --config configs/tfjs_config.json --pytorch-model checkpoints/best_model.pth --model-name sign_detector
```

Expected results:
- `ml/checkpoints/best_model.pth` exists
- `ml/checkpoints/videoswin/best_model.pth` or `ml/checkpoints/poseformer/best_model.pth` exists
- If ONNX→TFJS conversion fails, ONNX model is placed in `apps/frontend/public/models/tfjs_landmark_model/onnx/` with README

---

For full dataset setup, see Documentation/DATASETS.md.
