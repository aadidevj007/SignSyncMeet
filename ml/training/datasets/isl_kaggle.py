"""
ISL Kaggle Dataset Loader
Simple directory-based structure for Indian Sign Language
"""

import os
import csv
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import cv2
import numpy as np
from PIL import Image
import torch
from torch.utils.data import Dataset
import logging

logger = logging.getLogger(__name__)


class ISLKaggleDataset(Dataset):
    """
    ISL Kaggle dataset loader
    Supports simple directory-per-class structure and optional CSV
    """
    
    def __init__(
        self,
        root: str,
        split: str = 'train',
        csv_file: Optional[str] = None,
        clip_len: int = 16,
        frame_stride: int = 2,
        resize: int = 224,
        center_crop: bool = True,
        normalize: Optional[List[Tuple[float, float]]] = None,
        transform=None
    ):
        self.root = Path(root)
        self.split = split
        self.clip_len = clip_len
        self.frame_stride = frame_stride
        self.resize = resize
        self.center_crop = center_crop
        self.transform = transform
        
        # Check if dataset exists
        if not self.root.exists():
            logger.warning(f"ISL Kaggle dataset not found at {self.root}. Skipping.")
            self.samples = []
            self.label_to_idx = {}
            self.idx_to_label = {}
            return
        
        # Load annotations
        if csv_file and Path(csv_file).exists():
            self._load_from_csv(csv_file)
        else:
            self._load_from_directory()
        
        if len(self.samples) == 0:
            logger.warning(f"No ISL Kaggle samples found for split '{split}'. Dataset may be empty.")
    
    def _load_from_csv(self, csv_file: str):
        """Load from CSV file"""
        samples = []
        label_set = set()
        
        with open(csv_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                label = row.get('label', row.get('class', row.get('sign', '')))
                video_path = self.root / row.get('video', row.get('path', ''))
                
                if video_path.exists():
                    label_set.add(label)
                    samples.append({
                        'video': str(video_path),
                        'label_str': label
                    })
        
        # Build label mapping
        all_labels = sorted(label_set)
        self.label_to_idx = {label: idx for idx, label in enumerate(all_labels)}
        self.idx_to_label = {idx: label for label, idx in self.label_to_idx.items()}
        
        # Add label indices
        for sample in samples:
            sample['label'] = self.label_to_idx[sample['label_str']]
        
        # Split
        split_samples = {'train': [], 'val': [], 'test': []}
        for sample in samples:
            hash_val = hash(sample['video']) % 10
            if hash_val < 8:
                split_samples['train'].append(sample)
            elif hash_val < 9:
                split_samples['val'].append(sample)
            else:
                split_samples['test'].append(sample)
        
        self.samples = split_samples.get(self.split, [])
        logger.info(f"Loaded {len(self.samples)} ISL Kaggle samples for split '{self.split}' from CSV")
    
    def _load_from_directory(self):
        """Load from directory structure: root/class_name/*.mp4"""
        samples = []
        class_dirs = [d for d in self.root.iterdir() if d.is_dir()]
        
        if len(class_dirs) == 0:
            logger.warning(f"No class directories found in {self.root}")
            self.samples = []
            self.label_to_idx = {}
            self.idx_to_label = {}
            return
        
        all_labels = sorted([d.name for d in class_dirs])
        self.label_to_idx = {label: idx for idx, label in enumerate(all_labels)}
        self.idx_to_label = {idx: label for label, idx in self.label_to_idx.items()}
        
        for label_idx, label in enumerate(all_labels):
            class_dir = self.root / label
            videos = list(class_dir.glob('*.mp4')) + list(class_dir.glob('*.avi')) + list(class_dir.glob('*.mov'))
            
            if len(videos) == 0:
                continue
            
            split_videos = {'train': [], 'val': [], 'test': []}
            for video in videos:
                hash_val = hash(video.name) % 10
                if hash_val < 8:
                    split_videos['train'].append(video)
                elif hash_val < 9:
                    split_videos['val'].append(video)
                else:
                    split_videos['test'].append(video)
            
            for video in split_videos.get(self.split, []):
                samples.append({
                    'video': str(video),
                    'label': label_idx,
                    'gloss': label
                })
        
        self.samples = samples
        logger.info(f"Loaded {len(self.samples)} ISL Kaggle samples for split '{self.split}' from directory structure")
    
    def __len__(self) -> int:
        return len(self.samples)
    
    def __getitem__(self, idx: int) -> Dict:
        sample = self.samples[idx]
        video_path = sample['video']
        
        frames = self._load_video(video_path)
        
        if len(frames) == 0:
            frames = [np.zeros((self.resize, self.resize, 3), dtype=np.uint8)] * self.clip_len
        
        if self.transform:
            frames = self.transform(frames)
        else:
            from .transforms import VideoTransform
            transform = VideoTransform(
                resize=self.resize,
                center_crop=self.center_crop,
                clip_len=self.clip_len,
                frame_stride=self.frame_stride
            )
            frames = transform(frames)
        
        return {
            'video': frames,
            'label': sample['label'],
            'gloss': sample.get('gloss', self.idx_to_label.get(sample['label'], '')),
            'video_path': video_path
        }
    
    def _load_video(self, video_path: str) -> List[np.ndarray]:
        """Load video frames"""
        cap = cv2.VideoCapture(video_path)
        frames = []
        
        if not cap.isOpened():
            return frames
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frames.append(frame)
        
        cap.release()
        return frames

