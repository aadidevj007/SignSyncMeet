"""
Metrics for sign language recognition
"""

import torch
import numpy as np
from typing import List, Dict, Tuple


def accuracy_topk(output: torch.Tensor, target: torch.Tensor, topk: Tuple[int, ...] = (1, 5)) -> List[float]:
    """
    Compute top-k accuracy
    Args:
        output: (B, num_classes) logits
        target: (B,) target labels
        topk: tuple of k values
    Returns:
        List of top-k accuracies
    """
    with torch.no_grad():
        maxk = max(topk)
        batch_size = target.size(0)
        
        _, pred = output.topk(maxk, 1, True, True)
        pred = pred.t()
        correct = pred.eq(target.view(1, -1).expand_as(pred))
        
        res = []
        for k in topk:
            correct_k = correct[:k].reshape(-1).float().sum(0, keepdim=True)
            res.append(correct_k.mul_(100.0 / batch_size).item())
        
        return res


def compute_wer(predictions: List[str], references: List[str]) -> float:
    """
    Compute Word Error Rate (WER)
    Args:
        predictions: List of predicted strings
        references: List of reference strings
    Returns:
        WER as float
    """
    try:
        import jiwer
        transformation = jiwer.Compose([
            jiwer.ToLowerCase(),
            jiwer.RemovePunctuation(),
            jiwer.RemoveMultipleSpaces(),
            jiwer.Strip()
        ])
        
        predictions = [transformation(p) for p in predictions]
        references = [transformation(r) for r in references]
        
        wer = jiwer.wer(references, predictions)
        return wer * 100.0  # Convert to percentage
    except ImportError:
        # Fallback: simple edit distance
        total_words = 0
        total_errors = 0
        
        for pred, ref in zip(predictions, references):
            pred_words = pred.lower().split()
            ref_words = ref.lower().split()
            
            total_words += len(ref_words)
            
            # Simple word-level edit distance
            errors = abs(len(pred_words) - len(ref_words))
            for i in range(min(len(pred_words), len(ref_words))):
                if pred_words[i] != ref_words[i]:
                    errors += 1
            
            total_errors += errors
        
        return (total_errors / total_words * 100.0) if total_words > 0 else 0.0


def compute_cer(predictions: List[str], references: List[str]) -> float:
    """
    Compute Character Error Rate (CER)
    Args:
        predictions: List of predicted strings
        references: List of reference strings
    Returns:
        CER as float
    """
    try:
        import jiwer
        cer = jiwer.cer(references, predictions)
        return cer * 100.0  # Convert to percentage
    except ImportError:
        # Fallback: simple character-level edit distance
        total_chars = 0
        total_errors = 0
        
        for pred, ref in zip(predictions, references):
            pred_chars = list(pred.lower())
            ref_chars = list(ref.lower())
            
            total_chars += len(ref_chars)
            
            # Simple character-level edit distance
            errors = abs(len(pred_chars) - len(ref_chars))
            for i in range(min(len(pred_chars), len(ref_chars))):
                if pred_chars[i] != ref_chars[i]:
                    errors += 1
            
            total_errors += errors
        
        return (total_errors / total_chars * 100.0) if total_chars > 0 else 0.0


def gloss_accuracy(predictions: List[List[int]], references: List[List[int]]) -> float:
    """
    Compute gloss sequence accuracy
    Args:
        predictions: List of predicted gloss sequences
        references: List of reference gloss sequences
    Returns:
        Accuracy as float (exact match)
    """
    correct = 0
    total = len(predictions)
    
    for pred, ref in zip(predictions, references):
        if pred == ref:
            correct += 1
    
    return (correct / total * 100.0) if total > 0 else 0.0

