"""
RWTH-PHOENIX-Weather 2014-T Dataset Loader
Continuous sign language recognition with gloss and text annotations
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


class PhoenixDataset(Dataset):
    """
    RWTH-PHOENIX-Weather 2014-T dataset for continuous sign recognition
    Supports CTC (gloss sequence) and seq2seq (text) tasks
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
        vocab_gloss: Optional[Dict[str, int]] = None,
        vocab_text: Optional[Dict[str, int]] = None
    ):
        self.root = Path(root)
        self.split = split
        self.clip_len = clip_len
        self.frame_stride = frame_stride
        self.resize = resize
        self.center_crop = center_crop
        self.transform = transform
        self.vocab_gloss = vocab_gloss or {}
        self.vocab_text = vocab_text or {}
        
        # Check if dataset exists
        if not self.root.exists():
            logger.warning(f"PHOENIX dataset not found at {self.root}. Skipping.")
            self.samples = []
            return
        
        # Load annotations
        self._load_annotations()
        
        if len(self.samples) == 0:
            logger.warning(f"No PHOENIX samples found for split '{split}'. Dataset may be empty.")
    
    def _load_annotations(self):
        """Load PHOENIX annotations from directory structure"""
        # PHOENIX structure: root/phoenix2014-release/annotations/manual/{split}.corpus.csv
        # Videos: root/phoenix2014-release/phoenix-2014-multisigner/features/fullFrame-224x224px/{split}/...
        
        annotation_file = self.root / f"annotations/manual/{self.split}.corpus.csv"
        video_root = self.root / f"videos/{self.split}"
        
        if not annotation_file.exists():
            # Try alternative structure
            annotation_file = self.root / f"{self.split}.corpus.csv"
            video_root = self.root / f"videos/{self.split}"
        
        if not annotation_file.exists():
            logger.warning(f"PHOENIX annotation file not found: {annotation_file}")
            self.samples = []
            return
        
        samples = []
        with open(annotation_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f, delimiter='|')
            for row in reader:
                name = row.get('name', '').strip()
                gloss = row.get('signer', '').strip()  # Actually gloss sequence
                text = row.get('translation', '').strip()
                
                # Find video file
                video_path = video_root / f"{name}.mp4"
                if not video_path.exists():
                    video_path = video_root / f"{name}.avi"
                
                if not video_path.exists():
                    continue
                
                # Tokenize gloss sequence
                gloss_tokens = self._tokenize_gloss(gloss)
                text_tokens = self._tokenize_text(text) if text else []
                
                samples.append({
                    'video': str(video_path),
                    'gloss': gloss_tokens,
                    'text': text_tokens,
                    'gloss_str': gloss,
                    'text_str': text,
                    'name': name
                })
        
        self.samples = samples
        logger.info(f"Loaded {len(self.samples)} PHOENIX samples for split '{self.split}'")
    
    def _tokenize_gloss(self, gloss_str: str) -> List[int]:
        """Tokenize gloss sequence to vocabulary indices"""
        if not self.vocab_gloss:
            # Create vocab on the fly if not provided
            glosses = gloss_str.split()
            return [hash(g) % 1000 for g in glosses]  # Simple hash-based tokens
        
        tokens = []
        for gloss in gloss_str.split():
            if gloss in self.vocab_gloss:
                tokens.append(self.vocab_gloss[gloss])
            else:
                tokens.append(0)  # UNK token
        return tokens
    
    def _tokenize_text(self, text_str: str) -> List[int]:
        """Tokenize text to vocabulary indices"""
        if not self.vocab_text:
            return [hash(c) % 1000 for c in text_str]  # Character-level hash
        
        tokens = []
        for char in text_str:
            if char in self.vocab_text:
                tokens.append(self.vocab_text[char])
            else:
                tokens.append(0)  # UNK token
        return tokens
    
    def __len__(self) -> int:
        return len(self.samples)
    
    def __getitem__(self, idx: int) -> Dict:
        sample = self.samples[idx]
        video_path = sample['video']
        
        # Load video frames
        frames = self._load_video(video_path)
        
        if len(frames) == 0:
            logger.warning(f"Could not load video: {video_path}")
            frames = [np.zeros((self.resize, self.resize, 3), dtype=np.uint8)] * self.clip_len
        
        # Apply transforms
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
        
        result = {
            'video': frames,
            'gloss': sample['gloss'],
            'text': sample['text'],
            'video_path': video_path
        }
        
        # Add length for variable-length sequences
        result['length'] = frames.shape[0] if isinstance(frames, torch.Tensor) else len(frames)
        
        return result
    
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
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frames.append(frame)
        
        cap.release()
        return frames

