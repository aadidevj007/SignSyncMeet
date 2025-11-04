# Dataset Downloads

This directory contains helpers for downloading sign language datasets.

## Quick Start

```bash
# Print all download instructions
python downloads/download_helper.py

# Print instructions for specific dataset
python downloads/download_helper.py --dataset wlasl
```

## Datasets

### WLASL
- **Source**: https://github.com/dxli94/WLASL
- **Place in**: `ml/data/raw/wlasl/`
- **License**: Check repository

### RWTH-PHOENIX-2014-T
- **Source**: https://www-i6.informatik.rwth-aachen.de/~koller/RWTH-PHOENIX/
- **Place in**: `ml/data/raw/phoenix/`
- **Note**: Registration required

### ASLLVD
- **Source**: https://asl.cs.bu.edu/
- **Place in**: `ml/data/raw/asllvd/`
- **Note**: Check website for current links

### ISL Kaggle
- **Source**: https://www.kaggle.com/datasets/vaishnavivenkatesan/indian-sign-language-dataset
- **Place in**: `ml/data/raw/isl_kaggle/`
- **Note**: Requires Kaggle API key

## Manual Download

See `download_helper.py` for detailed instructions for each dataset.

## Dataset Structure

After downloading, datasets should be organized as:

```
ml/data/raw/
  wlasl/
    annotations.json
    videos/...
  phoenix/
    annotations/manual/*.csv
    videos/...
  asllvd/
    ...
  isl_kaggle/
    ...
```

Training scripts will automatically detect and load datasets from these paths.
