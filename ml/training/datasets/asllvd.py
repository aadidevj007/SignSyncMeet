"""
ASLLVD (American Sign Language Lexicon Video Dataset) Loader
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


class ASLLVDDataset(Dataset):
    """
    ASLLVD dataset loader
    Supports multi-angle videos with signer-based splits
    """
    
    def __init__(
        self,
        root: str,
        split: str = 'train',
        clip_len: int = 16,
        frame_stride: int = 2,
        resize: int = 224,
        center_crop: bool = True,
        normalize: Optional[List[Tuple[float, float]]] = None,
        transform=None,
        primary_view: str = 'front'  # 'front', 'side', 'top'
    ):
        self.root = Path(root)
        self.split = split
        self.clip_len = clip_len
        self.frame_stride = frame_stride
        self.resize = resize
        self.center_crop = center_crop
        self.transform = transform
        self.primary_view = primary_view
        
        # Check if dataset exists
        if not self.root.exists():
            logger.warning(f"ASLLVD dataset not found at {self.root}. Skipping.")
            self.samples = []
            self.label_to_idx = {}
            self.idx_to_label = {}
            return
        
        # Load annotations
        self._load_annotations()
        
        if len(self.samples) == 0:
            logger.warning(f"No ASLLVD samples found for split '{split}'. Dataset may be empty.")
    
    def _load_annotations(self):
        """Load ASLLVD annotations"""
        # ASLLVD structure varies - try common patterns
        annotation_files = [
            self.root / "annotations.json",
            self.root / "labels.json",
            self.root / "metadata.json"
        ]
        
        annotation_file = None
        for af in annotation_files:
            if af.exists():
                annotation_file = af
                break
        
        if annotation_file:
            # Load from JSON
            with open(annotation_file, 'r') as f:
                data = json.load(f)
            
            # Build label mapping
            all_labels = sorted(set(item.get('label', item.get('sign', '')) for item in data))
            self.label_to_idx = {label: idx for idx, label in enumerate(all_labels)}
            self.idx_to_label = {idx: label for label, idx in self.label_to_idx.items()}
            
            # Filter by split (signer-based or random)
            samples = []
            for item in data:
                label = item.get('label', item.get('sign', ''))
                signer = item.get('signer', 'unknown')
                video_path = self.root / item.get('video', item.get('path', ''))
                
                if not video_path.exists():
                    continue
                
                # Simple split based on signer hash
                signer_hash = hash(signer) % 10
                item_split = 'train' if signer_hash < 8 else ('val' if signer_hash < 9 else 'test')
                
                if item_split == self.split:
                    samples.append({
                        'video': str(video_path),
                        'label': self.label_to_idx[label],
                        'gloss': label,
                        'signer': signer
                    })
            
            self.samples = samples
        else:
            # Try directory-based structure
            self._load_from_directory()
        
        logger.info(f"Loaded {len(self.samples)} ASLLVD samples for split '{self.split}'")
    
    def _load_from_directory(self):
        """Load from directory structure"""
        samples = []
        class_dirs = [d for d in self.root.iterdir() if d.is_dir()]
        
        if len(class_dirs) == 0:
            self.samples = []
            self.label_to_idx = {}
            self.idx_to_label = {}
            return
        
        all_labels = sorted([d.name for d in class_dirs])
        self.label_to_idx = {label: idx for idx, label in enumerate(all_labels)}
        self.idx_to_label = {idx: label for label, idx in self.label_to_idx.items()}
        
        for label_idx, label in enumerate(all_labels):
            class_dir = self.root / label
            videos = list(class_dir.glob('*.mp4')) + list(class_dir.glob('*.avi'))
            
            # Simple split
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
            'gloss': sample['gloss'],
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

