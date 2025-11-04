"""
WLASL (Word-Level American Sign Language) Dataset Loader
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import cv2
import numpy as np
from PIL import Image
import torch
from torch.utils.data import Dataset
import logging

logger = logging.getLogger(__name__)


class WLASLDataset(Dataset):
    """
    WLASL dataset for word-level sign classification
    Supports official JSON annotations and directory-based structure
    """
    
    def __init__(
        self,
        root: str,
        split: str = 'train',
        labels_json: Optional[str] = None,
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
            logger.warning(f"WLASL dataset not found at {self.root}. Skipping.")
            self.samples = []
            self.label_to_idx = {}
            self.idx_to_label = {}
            return
        
        # Load annotations
        if labels_json and Path(labels_json).exists():
            self._load_from_json(labels_json)
        else:
            self._load_from_directory()
        
        if len(self.samples) == 0:
            logger.warning(f"No WLASL samples found for split '{split}'. Dataset may be empty.")
    
    def _load_from_json(self, labels_json: str):
        """Load from official WLASL JSON format"""
        with open(labels_json, 'r') as f:
            data = json.load(f)
        
        # Build label mapping
        all_labels = sorted(set(item['gloss'] for item in data))
        self.label_to_idx = {label: idx for idx, label in enumerate(all_labels)}
        self.idx_to_label = {idx: label for label, idx in self.label_to_idx.items()}
        
        # Filter by split (if available in JSON) or use default split
        samples = []
        for item in data:
            video_path = self.root / item['video']
            if video_path.exists():
                label = item['gloss']
                label_idx = self.label_to_idx[label]
                
                # Use split from JSON if available, otherwise default to train
                item_split = item.get('split', 'train')
                
                if item_split == self.split or (self.split == 'train' and item_split not in ['val', 'test']):
                    samples.append({
                        'video': str(video_path),
                        'label': label_idx,
                        'gloss': label
                    })
        
        self.samples = samples
        logger.info(f"Loaded {len(self.samples)} WLASL samples for split '{self.split}'")
    
    def _load_from_directory(self):
        """Load from directory structure: root/class_name/*.mp4"""
        samples = []
        
        # Find all class directories
        class_dirs = [d for d in self.root.iterdir() if d.is_dir()]
        
        if len(class_dirs) == 0:
            logger.warning(f"No class directories found in {self.root}")
            self.samples = []
            self.label_to_idx = {}
            self.idx_to_label = {}
            return
        
        # Build label mapping from directory names
        all_labels = sorted([d.name for d in class_dirs])
        self.label_to_idx = {label: idx for idx, label in enumerate(all_labels)}
        self.idx_to_label = {idx: label for label, idx in self.label_to_idx.items()}
        
        # Create train/val/test split (80/10/10)
        for label_idx, label in enumerate(all_labels):
            class_dir = self.root / label
            videos = list(class_dir.glob('*.mp4')) + list(class_dir.glob('*.avi'))
            
            if len(videos) == 0:
                continue
            
            # Simple split based on hash
            split_videos = {'train': [], 'val': [], 'test': []}
            for video in videos:
                hash_val = hash(video.name) % 10
                if hash_val < 8:
                    split_videos['train'].append(video)
                elif hash_val < 9:
                    split_videos['val'].append(video)
                else:
                    split_videos['test'].append(video)
            
            # Add samples for current split
            for video in split_videos.get(self.split, []):
                samples.append({
                    'video': str(video),
                    'label': label_idx,
                    'gloss': label
                })
        
        self.samples = samples
        logger.info(f"Loaded {len(self.samples)} WLASL samples for split '{self.split}' from directory structure")
    
    def __len__(self) -> int:
        return len(self.samples)
    
    def __getitem__(self, idx: int) -> Dict:
        sample = self.samples[idx]
        video_path = sample['video']
        
        # Load video frames
        frames = self._load_video(video_path)
        
        if len(frames) == 0:
            # Return dummy data if video can't be loaded
            logger.warning(f"Could not load video: {video_path}")
            frames = [np.zeros((self.resize, self.resize, 3), dtype=np.uint8)] * self.clip_len
        
        # Apply transforms
        if self.transform:
            frames = self.transform(frames)
        else:
            # Default transform
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
            'gloss': sample['gloss'],
            'video_path': video_path
        }
    
    def _load_video(self, video_path: str) -> List[np.ndarray]:
        """Load video frames using OpenCV"""
        cap = cv2.VideoCapture(video_path)
        frames = []
        
        if not cap.isOpened():
            return frames
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            # Convert BGR to RGB
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frames.append(frame)
        
        cap.release()
        return frames

