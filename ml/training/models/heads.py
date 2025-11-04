"""
Classification, CTC, and Seq2Seq heads for sign language recognition
"""

import torch
import torch.nn as nn
from typing import Optional, Dict, Any


class ClassificationHead(nn.Module):
    """Classification head for word-level sign recognition"""
    
    def __init__(
        self,
        num_classes: int,
        input_dim: int = 1024,
        dropout: float = 0.1
    ):
        super().__init__()
        self.num_classes = num_classes
        self.input_dim = input_dim
        
        self.head = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(input_dim, input_dim // 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(input_dim // 2, num_classes)
        )
    
    def forward(self, features: torch.Tensor) -> torch.Tensor:
        """
        Args:
            features: (B, T, D) or (B, D) tensor
        Returns:
            logits: (B, num_classes) or (B, T, num_classes)
        """
        if features.dim() == 3:
            # (B, T, D) -> (B, D) via global average pooling
            features = features.mean(dim=1)
        
        return self.head(features)


class CTCHead(nn.Module):
    """CTC head for continuous sign recognition"""
    
    def __init__(
        self,
        vocab_size: int,
        input_dim: int = 1024,
        hidden_dim: int = 512,
        num_layers: int = 2,
        dropout: float = 0.1
    ):
        super().__init__()
        self.vocab_size = vocab_size
        self.input_dim = input_dim
        
        # LSTM for sequence modeling
        self.lstm = nn.LSTM(
            input_dim,
            hidden_dim,
            num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0,
            bidirectional=True
        )
        
        # Output projection
        self.projection = nn.Linear(hidden_dim * 2, vocab_size)
    
    def forward(self, features: torch.Tensor, lengths: Optional[torch.Tensor] = None) -> torch.Tensor:
        """
        Args:
            features: (B, T, D) tensor
            lengths: (B,) tensor of sequence lengths
        Returns:
            logits: (B, T, vocab_size) tensor
        """
        # LSTM forward
        lstm_out, _ = self.lstm(features)
        
        # Project to vocabulary
        logits = self.projection(lstm_out)
        
        return logits


class Seq2SeqHead(nn.Module):
    """Seq2Seq head with Transformer decoder for text generation"""
    
    def __init__(
        self,
        vocab_size: int,
        input_dim: int = 1024,
        d_model: int = 512,
        nhead: int = 8,
        num_layers: int = 4,
        dropout: float = 0.1
    ):
        super().__init__()
        self.vocab_size = vocab_size
        self.d_model = d_model
        
        # Input projection
        self.input_proj = nn.Linear(input_dim, d_model)
        
        # Transformer decoder
        decoder_layer = nn.TransformerDecoderLayer(
            d_model=d_model,
            nhead=nhead,
            dim_feedforward=d_model * 4,
            dropout=dropout,
            batch_first=True
        )
        self.decoder = nn.TransformerDecoder(decoder_layer, num_layers=num_layers)
        
        # Output projection
        self.output_proj = nn.Linear(d_model, vocab_size)
        
        # Embedding for target tokens
        self.embedding = nn.Embedding(vocab_size, d_model)
        
        # Positional encoding
        self.pos_encoding = nn.Parameter(torch.randn(1, 1000, d_model))
    
    def forward(
        self,
        encoder_features: torch.Tensor,
        target: Optional[torch.Tensor] = None,
        max_length: int = 100
    ) -> torch.Tensor:
        """
        Args:
            encoder_features: (B, T, input_dim) from encoder
            target: (B, T_tgt) optional target sequence for training
            max_length: maximum generation length
        Returns:
            logits: (B, T_tgt, vocab_size) or (B, max_length, vocab_size)
        """
        # Project encoder features
        memory = self.input_proj(encoder_features)  # (B, T, d_model)
        
        if target is not None:
            # Training: use target sequence
            tgt_emb = self.embedding(target)  # (B, T_tgt, d_model)
            tgt_emb = tgt_emb + self.pos_encoding[:, :target.size(1), :]
            
            # Decoder forward
            output = self.decoder(tgt_emb, memory)  # (B, T_tgt, d_model)
        else:
            # Inference: autoregressive generation
            output = self._generate(memory, max_length)
        
        # Project to vocabulary
        logits = self.output_proj(output)
        
        return logits
    
    def _generate(self, memory: torch.Tensor, max_length: int) -> torch.Tensor:
        """Autoregressive generation (simplified)"""
        B = memory.size(0)
        device = memory.device
        
        # Start with SOS token (0)
        tgt = torch.zeros(B, 1, dtype=torch.long, device=device)
        outputs = []
        
        for _ in range(max_length):
            tgt_emb = self.embedding(tgt)  # (B, T, d_model)
            tgt_emb = tgt_emb + self.pos_encoding[:, :tgt.size(1), :]
            
            output = self.decoder(tgt_emb, memory)
            logits = self.output_proj(output)
            
            # Get next token
            next_token = logits[:, -1:, :].argmax(dim=-1)
            tgt = torch.cat([tgt, next_token], dim=1)
            
            outputs.append(logits[:, -1:, :])
            
            # Stop if EOS token (1)
            if (next_token == 1).all():
                break
        
        return torch.cat(outputs, dim=1)

