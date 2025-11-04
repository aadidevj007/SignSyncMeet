# Datasets Guide

This document explains how to obtain and place datasets for training.

## Directory Layout

```
ml/
  data/
    raw/
      wlasl/
      phoenix/
      asllvd/
      isl_kaggle/
    processed/           # created by loaders/transforms
```

## WLASL (Word-Level ASL)
- **Direct link**: https://github.com/dxli94/WLASL
- **License**: CC BY 4.0 (check repository for current terms)
- **Note**: Check repository for citation requirements
- Place annotations and videos:
```
ml/data/raw/wlasl/
  ├── annotations.json
  └── videos/
      ├── HELLO/
      │   ├── clip1.mp4
      │   └── ...
      └── THANK_YOU/
          └── ...
```
- Config example:
```json
{
  "name": "wlasl",
  "root": "ml/data/raw/wlasl",
  "labels_json": "ml/data/raw/wlasl/annotations.json",
  "split_strategy": "official"
}
```

## RWTH-PHOENIX-Weather 2014-T (Continuous)
- **Direct link**: https://www-i6.informatik.rwth-aachen.de/~forster/database-rwth-phoenix-2014-t/
- **Registration**: Required (see website)
- **License**: Check website for terms
- Place files:
```
ml/data/raw/phoenix/
  ├── annotations/
  │   └── manual/
  │       ├── train.corpus.csv
  │       ├── dev.corpus.csv (or val.corpus.csv)
  │       └── test.corpus.csv
  └── videos/
      ├── train/
      ├── dev/ (or val/)
      └── test/
```
- Used for CTC/Seq2Seq tasks (gloss/text).

## ASLLVD (Multi-Angle Isolated)
- Access: https://asl.cs.bu.edu/
- Place files:
```
ml/data/raw/asllvd/
  ├── annotations.json  # or labels.json, metadata.json
  └── videos/
      ├── SIGN_A/
      │   └── sample1.mp4
      └── SIGN_B/
          └── ...
```
- Split is signer-based by default.

## ISL Kaggle (Indian Sign Language)
- **Direct link**: https://www.kaggle.com/datasets/vaishnavivenkatesan/indian-sign-language-dataset
- **License**: Check Kaggle dataset page
- **Download**:
```bash
pip install kaggle
export KAGGLE_USERNAME=...; export KAGGLE_KEY=...
kaggle datasets download -d vaishnavivenkatesan/indian-sign-language-dataset -p ml/data/raw/isl_kaggle/
```
- Place as directory-per-class:
```
ml/data/raw/isl_kaggle/
  ├── CLASS_1/
  │   └── vid1.mp4
  └── CLASS_2/
      └── ...
```

## Missing Data Handling
- If a dataset path is missing/empty, training will **automatically use synthetic data** for smoke testing.
- Scripts log a WARN and continue with synthetic fallback.
- Use `--dry-run` flag for explicit synthetic-only testing.

## Transforms & Params
Common JSON snippet in configs:
```json
{
  "clip_len": 16,
  "frame_stride": 2,
  "resize": 224,
  "center_crop": true,
  "normalize": [[0.485,0.456,0.406],[0.229,0.224,0.225]]
}
```

## Licensing
- Always review each dataset's license and citation requirements before use.
- Do not commit dataset files to the repository.

## Helper
- See `ml/downloads/download_helper.py` for automation (WLASL clone, Kaggle notes, PHOENIX instructions).


