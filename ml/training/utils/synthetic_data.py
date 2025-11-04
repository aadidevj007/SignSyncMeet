"""
Synthetic data generators for dry-run and smoke testing
"""

import torch
import numpy as np
from torch.utils.data import Dataset
from typing import Dict, List, Optional


class SyntheticVideoDataset(Dataset):
    """
    Synthetic video dataset for smoke testing
    Generates random video tensors [B, T, C, H, W] with random labels
    """
    
    def __init__(
        self,
        num_samples: int = 32,
        clip_len: int = 8,
        height: int = 224,
        width: int = 224,
        num_classes: int = 10,
        channels: int = 3
    ):
        self.num_samples = num_samples
        self.clip_len = clip_len
        self.height = height
        self.width = width
        self.num_classes = num_classes
        self.channels = channels
    
    def __len__(self) -> int:
        return self.num_samples
    
    def __getitem__(self, idx: int) -> Dict:
        # Generate random video: (T, C, H, W)
        video = torch.randn(self.clip_len, self.channels, self.height, self.width)
        # Normalize to [0, 1] range
        video = (video - video.min()) / (video.max() - video.min() + 1e-8)
        
        # Random label
        label = torch.randint(0, self.num_classes, (1,)).item()
        
        return {
            'video': video,
            'label': label,
            'gloss': f'class_{label}'
        }


class SyntheticPoseDataset(Dataset):
    """
    Synthetic pose/landmark dataset for smoke testing
    Generates random landmark sequences [B, T, F] with random labels
    """
    
    def __init__(
        self,
        num_samples: int = 32,
        seq_len: int = 32,
        features: int = 225,
        num_classes: int = 10
    ):
        self.num_samples = num_samples
        self.seq_len = seq_len
        self.features = features
        self.num_classes = num_classes
    
    def __len__(self) -> int:
        return self.num_samples
    
    def __getitem__(self, idx: int) -> Dict:
        # Generate random pose sequence: (T, F)
        pose = torch.randn(self.seq_len, self.features)
        # Normalize
        pose = (pose - pose.mean()) / (pose.std() + 1e-8)
        
        # Random label
        label = torch.randint(0, self.num_classes, (1,)).item()
        
        return {
            'pose': pose,
            'label': label,
            'length': self.seq_len
        }

