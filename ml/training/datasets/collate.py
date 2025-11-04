"""
Collation functions for variable-length sequences
"""

import torch
from typing import Dict, List, Tuple, Any
from torch.nn.utils.rnn import pad_sequence


def collate_video(batch: List[Dict[str, Any]]) -> Dict[str, torch.Tensor]:
    """
    Collate function for video clips
    Args:
        batch: List of dicts with keys: 'video', 'label', etc.
    Returns:
        Batched dict with padded sequences
    """
    videos = [item['video'] for item in batch]  # List of (T, C, H, W)
    labels = torch.tensor([item['label'] for item in batch], dtype=torch.long)
    
    # Pad videos to same length
    max_len = max(v.shape[0] for v in videos)
    padded_videos = []
    video_lengths = []
    
    for video in videos:
        T = video.shape[0]
        video_lengths.append(T)
        
        if T < max_len:
            # Pad with last frame
            padding = video[-1:].repeat(max_len - T, 1, 1, 1)
            padded_video = torch.cat([video, padding], dim=0)
        else:
            padded_video = video
        
        padded_videos.append(padded_video)
    
    # Stack to (B, T, C, H, W)
    batch_video = torch.stack(padded_videos)
    batch_lengths = torch.tensor(video_lengths, dtype=torch.long)
    
    result = {
        'video': batch_video,
        'label': labels,
        'lengths': batch_lengths
    }
    
    # Add optional fields
    if 'gloss' in batch[0]:
        glosses = [item['gloss'] for item in batch]
        gloss_lengths = torch.tensor([len(g) for g in glosses], dtype=torch.long)
        padded_glosses = pad_sequence(
            [torch.tensor(g, dtype=torch.long) for g in glosses],
            batch_first=True,
            padding_value=0
        )
        result['gloss'] = padded_glosses
        result['gloss_lengths'] = gloss_lengths
    
    if 'text' in batch[0]:
        result['text'] = [item['text'] for item in batch]
    
    return result


def collate_poses(batch: List[Dict[str, Any]]) -> Dict[str, torch.Tensor]:
    """
    Collate function for pose/landmark sequences
    Args:
        batch: List of dicts with keys: 'pose', 'label', etc.
    Returns:
        Batched dict with padded sequences
    """
    poses = [item['pose'] for item in batch]  # List of (T, D)
    labels = torch.tensor([item['label'] for item in batch], dtype=torch.long)
    
    # Pad sequences
    padded_poses = pad_sequence(poses, batch_first=True, padding_value=0.0)
    pose_lengths = torch.tensor([p.shape[0] for p in poses], dtype=torch.long)
    
    result = {
        'pose': padded_poses,
        'label': labels,
        'lengths': pose_lengths
    }
    
    # Add optional fields
    if 'gloss' in batch[0]:
        glosses = [item['gloss'] for item in batch]
        gloss_lengths = torch.tensor([len(g) for g in glosses], dtype=torch.long)
        padded_glosses = pad_sequence(
            [torch.tensor(g, dtype=torch.long) for g in glosses],
            batch_first=True,
            padding_value=0
        )
        result['gloss'] = padded_glosses
        result['gloss_lengths'] = gloss_lengths
    
    return result

