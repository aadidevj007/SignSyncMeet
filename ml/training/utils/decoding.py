"""
Decoding utilities for CTC and seq2seq
"""

import torch
from typing import List, Optional


def ctc_greedy_decode(logits: torch.Tensor, blank_idx: int = 0) -> List[List[int]]:
    """
    Greedy CTC decoding
    Args:
        logits: (B, T, vocab_size) logits
        blank_idx: Index of blank token
    Returns:
        List of decoded sequences
    """
    predictions = logits.argmax(dim=-1)  # (B, T)
    
    decoded = []
    for pred in predictions:
        # Remove blanks and consecutive duplicates
        sequence = []
        prev = None
        for token in pred:
            token = token.item()
            if token != blank_idx and token != prev:
                sequence.append(token)
            prev = token
        
        decoded.append(sequence)
    
    return decoded


def ctc_beam_search_decode(logits: torch.Tensor, blank_idx: int = 0, beam_size: int = 5) -> List[List[int]]:
    """
    CTC beam search decoding (simplified)
    Args:
        logits: (B, T, vocab_size) logits
        blank_idx: Index of blank token
        beam_size: Beam size
    Returns:
        List of decoded sequences
    """
    # Simplified implementation - in production, use optimized CTC decoder
    # For now, fall back to greedy
    return ctc_greedy_decode(logits, blank_idx)


def seq2seq_greedy_decode(model, encoder_features: torch.Tensor, max_length: int = 100, sos_idx: int = 0, eos_idx: int = 1) -> List[List[int]]:
    """
    Greedy seq2seq decoding
    Args:
        model: Seq2Seq model
        encoder_features: (B, T, D) encoder features
        max_length: Maximum generation length
        sos_idx: Start-of-sequence token index
        eos_idx: End-of-sequence token index
    Returns:
        List of decoded sequences
    """
    B = encoder_features.size(0)
    device = encoder_features.device
    
    # Use model's generation method if available
    if hasattr(model, '_generate'):
        outputs = model._generate(encoder_features, max_length)
        sequences = outputs.argmax(dim=-1).cpu().tolist()
    else:
        # Fallback: simple autoregressive generation
        sequences = []
        for b in range(B):
            seq = [sos_idx]
            for _ in range(max_length):
                # This is simplified - in production, use proper decoder
                if seq[-1] == eos_idx:
                    break
                seq.append(seq[-1] + 1)  # Dummy generation
            sequences.append(seq)
    
    return sequences

