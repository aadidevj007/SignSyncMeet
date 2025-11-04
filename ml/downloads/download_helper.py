#!/usr/bin/env python3
"""
Helper script for downloading sign language datasets
Provides instructions and stub commands (no credentials baked in)
"""

import os
import subprocess
import sys
from pathlib import Path
from typing import Optional


def print_instructions(dataset_name: str, instructions: str):
    """Print download instructions"""
    print(f"\n{'='*60}")
    print(f"Dataset: {dataset_name}")
    print(f"{'='*60}")
    print(instructions)
    print()


def clone_wlasl():
    """Instructions for WLASL"""
    repo_url = "https://github.com/dxli94/WLASL.git"
    target_dir = Path("ml/data/raw/wlasl")
    
    print_instructions("WLASL", f"""
1. Clone the repository:
   git clone {repo_url} {target_dir}

2. Download videos (if available):
   - Check the repository README for video download links
   - Place videos in {target_dir}/videos/ or organize by class folders

3. Place annotations.json in {target_dir}/

Note: WLASL requires proper citation and may have usage restrictions.
See: https://github.com/dxli94/WLASL
    """)


def download_phoenix():
    """Instructions for RWTH-PHOENIX-2014-T"""
    target_dir = Path("ml/data/raw/phoenix")
    
    print_instructions("RWTH-PHOENIX-2014-T", f"""
1. Register and download from:
   https://www-i6.informatik.rwth-aachen.de/~koller/RWTH-PHOENIX/

2. Extract to: {target_dir}/

3. Expected structure:
   {target_dir}/
     annotations/
       manual/
         train.corpus.csv
         dev.corpus.csv
         test.corpus.csv
     videos/
       train/
       dev/
       test/

Note: Registration required. Check license terms.
    """)


def download_asllvd():
    """Instructions for ASLLVD"""
    target_dir = Path("ml/data/raw/asllvd")
    
    print_instructions("ASLLVD", f"""
1. Download from:
   https://asl.cs.bu.edu/

2. Extract to: {target_dir}/

3. Organize videos by sign class or use provided annotations

Note: Check website for current download links and citation requirements.
    """)


def download_kaggle_dataset(dataset_name: Optional[str] = None):
    """Instructions for Kaggle datasets (e.g., ISL)"""
    target_dir = Path("ml/data/raw/isl_kaggle")
    
    # Check for Kaggle credentials
    kaggle_user = os.environ.get('KAGGLE_USERNAME')
    kaggle_key = os.environ.get('KAGGLE_KEY')
    
    if kaggle_user and kaggle_key:
        print_instructions("ISL Kaggle Dataset", f"""
Kaggle credentials found in environment.

To download:
1. Install Kaggle CLI: pip install kaggle
2. Set credentials:
   export KAGGLE_USERNAME={kaggle_user}
   export KAGGLE_KEY=*** (hidden)

3. Download dataset:
   kaggle datasets download -d <dataset-id> -p {target_dir}/
   # Example: kaggle datasets download -d vaishnavivenkatesan/indian-sign-language-dataset -p {target_dir}/

4. Extract:
   unzip {target_dir}/*.zip -d {target_dir}/
        """)
    else:
        print_instructions("ISL Kaggle Dataset", f"""
1. Install Kaggle CLI: pip install kaggle

2. Set up credentials:
   - Create ~/.kaggle/kaggle.json with:
     {{"username":"your_username","key":"your_key"}}
   - Or set environment variables:
     export KAGGLE_USERNAME=your_username
     export KAGGLE_KEY=your_key

3. Download dataset:
   kaggle datasets download -d vaishnavivenkatesan/indian-sign-language-dataset -p {target_dir}/

4. Extract:
   unzip {target_dir}/*.zip -d {target_dir}/

Note: Requires Kaggle account and API key.
See: https://www.kaggle.com/datasets/vaishnavivenkatesan/indian-sign-language-dataset
        """)


def main():
    """Main entry point"""
    import argparse
    parser = argparse.ArgumentParser(description='Dataset download helper')
    parser.add_argument('--dataset', type=str, choices=['wlasl', 'phoenix', 'asllvd', 'isl', 'all'],
                       default='all', help='Dataset to download')
    
    args = parser.parse_args()
    
    if args.dataset == 'wlasl' or args.dataset == 'all':
        clone_wlasl()
    
    if args.dataset == 'phoenix' or args.dataset == 'all':
        download_phoenix()
    
    if args.dataset == 'asllvd' or args.dataset == 'all':
        download_asllvd()
    
    if args.dataset == 'isl' or args.dataset == 'all':
        download_kaggle_dataset()
    
    print("\n" + "="*60)
    print("All dataset instructions printed above.")
    print("="*60)


if __name__ == '__main__':
    main()
