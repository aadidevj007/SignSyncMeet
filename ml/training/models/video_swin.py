"""
Video-Swin Transformer model for sign language recognition
"""

import torch
import torch.nn as nn
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

try:
    import timm
    TIMM_AVAILABLE = True
except ImportError:
    TIMM_AVAILABLE = False
    logger.warning("timm not available. Install with: pip install timm")


class VideoSwinModel(nn.Module):
    """
    Video-Swin Transformer backbone with configurable head
    Supports classification, CTC, and seq2seq tasks
    """
    
    def __init__(
        self,
        backbone_name: str = "video_swin_base",
        pretrained: bool = True,
        checkpoint: Optional[str] = None,
        num_classes: Optional[int] = None,
        vocab_size: Optional[int] = None,
        task: str = "classification",  # "classification" | "ctc" | "seq2seq" | "hybrid"
        input_shape: tuple = (1, 16, 224, 224),  # (B, T, H, W)
        **kwargs
    ):
        super().__init__()
        self.backbone_name = backbone_name
        self.task = task
        self.input_shape = input_shape
        
        # Build backbone
        self.backbone = self._build_backbone(backbone_name, pretrained, checkpoint)
        
        # Get feature dimension
        feature_dim = self._get_feature_dim()
        
        # Build head based on task
        if task == "classification":
            if num_classes is None:
                raise ValueError("num_classes required for classification task")
            from .heads import ClassificationHead
            self.head = ClassificationHead(num_classes, feature_dim)
        elif task == "ctc":
            if vocab_size is None:
                raise ValueError("vocab_size required for CTC task")
            from .heads import CTCHead
            self.head = CTCHead(vocab_size, feature_dim)
        elif task == "seq2seq":
            if vocab_size is None:
                raise ValueError("vocab_size required for seq2seq task")
            from .heads import Seq2SeqHead
            self.head = Seq2SeqHead(vocab_size, feature_dim)
        elif task == "hybrid":
            # Multi-head for hybrid training
            self.heads = nn.ModuleDict()
            if num_classes:
                from .heads import ClassificationHead
                self.heads['classification'] = ClassificationHead(num_classes, feature_dim)
            if vocab_size:
                from .heads import CTCHead
                from .heads import Seq2SeqHead
                self.heads['ctc'] = CTCHead(vocab_size, feature_dim)
                self.heads['seq2seq'] = Seq2SeqHead(vocab_size, feature_dim)
        else:
            raise ValueError(f"Unknown task: {task}")
    
    def _build_backbone(self, name: str, pretrained: bool, checkpoint: Optional[str]) -> nn.Module:
        """Build Video-Swin backbone"""
        if checkpoint:
            # Load from checkpoint
            logger.info(f"Loading backbone from checkpoint: {checkpoint}")
            state_dict = torch.load(checkpoint, map_location='cpu')
            # Handle state dict format
            if 'model' in state_dict:
                state_dict = state_dict['model']
            if 'backbone' in state_dict:
                state_dict = state_dict['backbone']
            # Create a simple backbone wrapper
            backbone = self._create_backbone_wrapper()
            backbone.load_state_dict(state_dict, strict=False)
            return backbone
        
        # Try to load from timm
        if TIMM_AVAILABLE:
            try:
                model = timm.create_model(name, pretrained=pretrained)
                logger.info(f"Loaded {name} from timm")
                return model
            except Exception as e:
                logger.warning(f"Failed to load from timm: {e}")
        
        # Fallback: create a simple Video-Swin-like architecture
        logger.warning(f"Creating fallback Video-Swin architecture")
        return self._create_backbone_wrapper()
    
    def _create_backbone_wrapper(self) -> nn.Module:
        """Create a simple Video-Swin-like backbone wrapper"""
        # Simplified 3D CNN + Transformer architecture
        # In production, use official Video-Swin implementation
        
        class VideoSwinWrapper(nn.Module):
            def __init__(self):
                super().__init__()
                # 3D CNN feature extractor
                self.conv3d = nn.Sequential(
                    nn.Conv3d(3, 64, kernel_size=(3, 7, 7), stride=(1, 2, 2), padding=(1, 3, 3)),
                    nn.BatchNorm3d(64),
                    nn.ReLU(),
                    nn.Conv3d(64, 128, kernel_size=(3, 3, 3), stride=(1, 2, 2), padding=(1, 1, 1)),
                    nn.BatchNorm3d(128),
                    nn.ReLU(),
                    nn.Conv3d(128, 256, kernel_size=(3, 3, 3), stride=(1, 2, 2), padding=(1, 1, 1)),
                    nn.BatchNorm3d(256),
                    nn.ReLU(),
                )
                
                # Global pooling
                self.pool = nn.AdaptiveAvgPool3d((1, 1, 1))
                self.flatten = nn.Flatten()
                
            def forward(self, x):
                # x: (B, T, C, H, W) -> (B, C, T, H, W)
                B, T, C, H, W = x.shape
                x = x.permute(0, 2, 1, 3, 4)  # (B, C, T, H, W)
                
                # 3D CNN
                x = self.conv3d(x)
                
                # Global pooling
                x = self.pool(x)  # (B, 256, 1, 1, 1)
                x = self.flatten(x)  # (B, 256)
                
                # Expand to sequence dimension for CTC/seq2seq
                x = x.unsqueeze(1)  # (B, 1, 256)
                
                return x
        
        return VideoSwinWrapper()
    
    def _get_feature_dim(self) -> int:
        """Get feature dimension from backbone"""
        # Create dummy input
        dummy = torch.randn(1, *self.input_shape[1:])  # (1, T, C, H, W)
        
        with torch.no_grad():
            features = self.backbone(dummy)
            if features.dim() == 2:
                return features.size(1)
            elif features.dim() == 3:
                return features.size(2)
            else:
                return 256  # Default
    
    def forward(
        self,
        video: torch.Tensor,
        target: Optional[torch.Tensor] = None,
        lengths: Optional[torch.Tensor] = None
    ) -> Dict[str, torch.Tensor]:
        """
        Forward pass
        Args:
            video: (B, T, C, H, W) or (B, C, T, H, W) tensor
            target: Optional target for seq2seq training
            lengths: Optional sequence lengths
        Returns:
            Dictionary with outputs based on task
        """
        # Ensure video is in correct format (B, T, C, H, W)
        if video.dim() == 5 and video.size(1) == 3:  # (B, C, T, H, W)
            video = video.permute(0, 2, 1, 3, 4)  # (B, T, C, H, W)
        
        # Backbone forward
        features = self.backbone(video)  # (B, T, D) or (B, D)
        
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

