"""
Video and pose transforms for sign language datasets
"""

import torch
import torchvision.transforms as transforms
from torchvision.transforms import functional as F
import numpy as np
from typing import Tuple, List, Optional
import random


class VideoTransform:
    """Video transforms for temporal-spatial augmentation"""
    
    def __init__(
        self,
        resize: int = 224,
        center_crop: bool = True,
        normalize: Optional[List[Tuple[float, float]]] = None,
        clip_len: int = 16,
        frame_stride: int = 2,
        temporal_jitter: bool = False,
        rand_augment: bool = False
    ):
        self.resize = resize
        self.center_crop = center_crop
        self.normalize = normalize or ([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        self.clip_len = clip_len
        self.frame_stride = frame_stride
        self.temporal_jitter = temporal_jitter
        self.rand_augment = rand_augment
        
        # Spatial transforms
        if self.center_crop:
            self.spatial_transform = transforms.Compose([
                transforms.Resize(self.resize),
                transforms.CenterCrop(self.resize),
                transforms.ToTensor(),
                transforms.Normalize(mean=self.normalize[0], std=self.normalize[1])
            ])
        else:
            self.spatial_transform = transforms.Compose([
                transforms.Resize((self.resize, self.resize)),
                transforms.ToTensor(),
                transforms.Normalize(mean=self.normalize[0], std=self.normalize[1])
            ])
    
    def __call__(self, frames: List[np.ndarray]) -> torch.Tensor:
        """
        Apply transforms to a list of frames
        Args:
            frames: List of PIL Images or numpy arrays (H, W, C)
        Returns:
            Tensor of shape (T, C, H, W)
        """
        from PIL import Image
        
        # Convert to PIL if needed
        pil_frames = []
        for frame in frames:
            if isinstance(frame, np.ndarray):
                if frame.dtype != np.uint8:
                    frame = (frame * 255).astype(np.uint8)
                pil_frames.append(Image.fromarray(frame))
            else:
                pil_frames.append(frame)
        
        # Temporal sampling
        sampled_frames = self._temporal_sampling(pil_frames)
        
        # Apply spatial transforms
        transformed = [self.spatial_transform(frame) for frame in sampled_frames]
        
        # Stack to (T, C, H, W)
        video_tensor = torch.stack(transformed)
        
        return video_tensor
    
    def _temporal_sampling(self, frames: List) -> List:
        """Uniform or jittered temporal sampling"""
        if len(frames) <= self.clip_len:
            # Pad or repeat
            if len(frames) < self.clip_len:
                frames = frames + [frames[-1]] * (self.clip_len - len(frames))
            return frames[:self.clip_len]
        
        # Sample uniformly
        indices = np.linspace(0, len(frames) - 1, self.clip_len, dtype=int)
        
        if self.temporal_jitter:
            # Add small random jitter
            jitter = np.random.randint(-1, 2, size=len(indices))
            indices = np.clip(indices + jitter, 0, len(frames) - 1)
        
        return [frames[i] for i in indices]


class PoseTransform:
    """Transforms for pose/landmark sequences"""
    
    def __init__(
        self,
        normalize: bool = True,
        augment: bool = False,
        noise_std: float = 0.01
    ):
        self.normalize = normalize
        self.augment = augment
        self.noise_std = noise_std
    
    def __call__(self, pose_sequence: np.ndarray) -> torch.Tensor:
        """
        Apply transforms to pose sequence
        Args:
            pose_sequence: (T, D) array where D is pose dimension
        Returns:
            Tensor of shape (T, D)
        """
        if isinstance(pose_sequence, torch.Tensor):
            pose_sequence = pose_sequence.numpy()
        
        # Augmentation
        if self.augment:
            # Add noise
            noise = np.random.normal(0, self.noise_std, pose_sequence.shape)
            pose_sequence = pose_sequence + noise
        
        # Normalize
        if self.normalize:
            mean = pose_sequence.mean(axis=0, keepdims=True)
            std = pose_sequence.std(axis=0, keepdims=True) + 1e-8
            pose_sequence = (pose_sequence - mean) / std
        
        return torch.from_numpy(pose_sequence).float()

