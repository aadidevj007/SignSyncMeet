"""
Logging utilities for training
"""

import os
from pathlib import Path
from typing import Optional, Dict, Any
import logging

try:
    from torch.utils.tensorboard import SummaryWriter
    TENSORBOARD_AVAILABLE = True
except ImportError:
    TENSORBOARD_AVAILABLE = False


class TensorBoardLogger:
    """TensorBoard logger wrapper"""
    
    def __init__(self, log_dir: str, exp_name: str):
        self.log_dir = Path(log_dir)
        self.exp_name = exp_name
        self.writer = None
        
        if TENSORBOARD_AVAILABLE:
            self.log_path = self.log_dir / "runs" / exp_name
            self.log_path.mkdir(parents=True, exist_ok=True)
            self.writer = SummaryWriter(str(self.log_path))
        else:
            logging.warning("TensorBoard not available. Install with: pip install tensorboard")
    
    def log_scalar(self, tag: str, value: float, step: int):
        """Log scalar value"""
        if self.writer:
            self.writer.add_scalar(tag, value, step)
    
    def log_dict(self, metrics: Dict[str, float], step: int, prefix: str = ""):
        """Log dictionary of metrics"""
        for key, value in metrics.items():
            tag = f"{prefix}/{key}" if prefix else key
            self.log_scalar(tag, value, step)
    
    def close(self):
        """Close writer"""
        if self.writer:
            self.writer.close()

