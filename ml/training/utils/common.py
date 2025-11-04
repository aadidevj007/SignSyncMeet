"""
Common utilities for training
"""

import random
import numpy as np
import torch
import torch.backends.cudnn as cudnn
from typing import Optional


def set_seed(seed: int = 42):
    """Set random seeds for reproducibility"""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    cudnn.deterministic = True
    cudnn.benchmark = False


def get_device() -> torch.device:
    """Get device (CUDA if available)"""
    return torch.device('cuda' if torch.cuda.is_available() else 'cpu')


def setup_amp(use_amp: bool = True) -> tuple:
    """Setup automatic mixed precision"""
    if use_amp:
        scaler = torch.cuda.amp.GradScaler()
    else:
        scaler = None
    return scaler


def clip_grad_norm(model: torch.nn.Module, max_norm: float = 1.0):
    """Clip gradient norms"""
    torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm)


def save_checkpoint(
    model: torch.nn.Module,
    optimizer: torch.optim.Optimizer,
    epoch: int,
    metric: float,
    filepath: str,
    is_best: bool = False
):
    """Save checkpoint"""
    checkpoint = {
        'epoch': epoch,
        'model_state_dict': model.state_dict(),
        'optimizer_state_dict': optimizer.state_dict(),
        'metric': metric
    }
    
    torch.save(checkpoint, filepath)
    
    if is_best:
        best_path = filepath.replace('.pth', '_best.pth')
        torch.save(checkpoint, best_path)


def load_checkpoint(
    model: torch.nn.Module,
    optimizer: Optional[torch.optim.Optimizer],
    filepath: str,
    device: torch.device
) -> dict:
    """Load checkpoint"""
    checkpoint = torch.load(filepath, map_location=device)
    
    model.load_state_dict(checkpoint['model_state_dict'])
    if optimizer and 'optimizer_state_dict' in checkpoint:
        optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
    
    return {
        'epoch': checkpoint.get('epoch', 0),
        'metric': checkpoint.get('metric', 0.0)
    }

