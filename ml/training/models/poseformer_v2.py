"""
PoseFormerV2 model for sign language recognition from pose/landmarks
"""

import torch
import torch.nn as nn
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


class PoseFormerV2Model(nn.Module):
    """
    PoseFormerV2 encoder for pose/landmark sequences
    Supports classification, CTC, and seq2seq tasks
    """
    
    def __init__(
        self,
        input_dim: int = 225,  # 75 keypoints * 3 (x, y, z) or 2 hands * 21 * 3 + pose
        d_model: int = 512,
        nhead: int = 8,
        num_layers: int = 6,
        dim_feedforward: int = 2048,
        dropout: float = 0.1,
        num_classes: Optional[int] = None,
        vocab_size: Optional[int] = None,
        task: str = "classification",
        **kwargs
    ):
        super().__init__()
        self.input_dim = input_dim
        self.d_model = d_model
        self.task = task
        
        # Input projection
        self.input_proj = nn.Linear(input_dim, d_model)
        
        # Positional encoding
        self.pos_encoding = nn.Parameter(torch.randn(1, 1000, d_model))
        
        # Transformer encoder
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=nhead,
            dim_feedforward=dim_feedforward,
            dropout=dropout,
            batch_first=True
        )
        self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        
        # Build head
        if task == "classification":
            if num_classes is None:
                raise ValueError("num_classes required for classification task")
            from .heads import ClassificationHead
            self.head = ClassificationHead(num_classes, d_model)
        elif task == "ctc":
            if vocab_size is None:
                raise ValueError("vocab_size required for CTC task")
            from .heads import CTCHead
            self.head = CTCHead(vocab_size, d_model)
        elif task == "seq2seq":
            if vocab_size is None:
                raise ValueError("vocab_size required for seq2seq task")
            from .heads import Seq2SeqHead
            self.head = Seq2SeqHead(vocab_size, d_model)
        elif task == "hybrid":
            self.heads = nn.ModuleDict()
            if num_classes:
                from .heads import ClassificationHead
                self.heads['classification'] = ClassificationHead(num_classes, d_model)
            if vocab_size:
                from .heads import CTCHead
                from .heads import Seq2SeqHead
                self.heads['ctc'] = CTCHead(vocab_size, d_model)
                self.heads['seq2seq'] = Seq2SeqHead(vocab_size, d_model)
        else:
            raise ValueError(f"Unknown task: {task}")
    
    def forward(
        self,
        pose: torch.Tensor,
        lengths: Optional[torch.Tensor] = None,
        target: Optional[torch.Tensor] = None
    ) -> Dict[str, torch.Tensor]:
        """
        Forward pass
        Args:
            pose: (B, T, input_dim) tensor of pose/landmark sequences
            lengths: (B,) tensor of sequence lengths
            target: Optional target for seq2seq training
        Returns:
            Dictionary with outputs based on task
        """
        # Project input
        x = self.input_proj(pose)  # (B, T, d_model)
        
        # Add positional encoding
        T = x.size(1)
        x = x + self.pos_encoding[:, :T, :]
        
        # Create attention mask if lengths provided
        mask = None
        if lengths is not None:
            max_len = x.size(1)
            mask = torch.arange(max_len, device=x.device).expand(len(lengths), max_len) >= lengths.unsqueeze(1)
        
        # Transformer encoder
        features = self.encoder(x, src_key_padding_mask=mask)  # (B, T, d_model)
        
        # Head forward
        if self.task == "classification":
            logits = self.head(features)
            return {'logits': logits}
        elif self.task == "ctc":
            logits = self.head(features, lengths)
            return {'logits': logits}
        elif self.task == "seq2seq":
            logits = self.head(features, target)
            return {'logits': logits}
        elif self.task == "hybrid":
            outputs = {}
            if 'classification' in self.heads:
                outputs['classification'] = self.heads['classification'](features)
            if 'ctc' in self.heads:
                outputs['ctc'] = self.heads['ctc'](features, lengths)
            if 'seq2seq' in self.heads:
                outputs['seq2seq'] = self.heads['seq2seq'](features, target)
            return outputs
        else:
            raise ValueError(f"Unknown task: {self.task}")

