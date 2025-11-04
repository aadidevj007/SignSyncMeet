"""
Shared training and validation loops
"""

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from typing import Dict, Optional, Callable
import logging
from tqdm import tqdm

from .common import clip_grad_norm, setup_amp
from .metrics import accuracy_topk, compute_wer, compute_cer, gloss_accuracy

logger = logging.getLogger(__name__)


def train_epoch(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    optimizer: torch.optim.Optimizer,
    device: torch.device,
    scaler: Optional[torch.cuda.amp.GradScaler] = None,
    task: str = "classification",
    max_grad_norm: float = 1.0,
    loss_weights: Optional[Dict[str, float]] = None
) -> Dict[str, float]:
    """
    Training loop for one epoch
    """
    model.train()
    total_loss = 0.0
    total_samples = 0
    
    # Metrics
    if task == "classification":
        correct_top1 = 0
        correct_top5 = 0
    elif task == "ctc":
        all_preds = []
        all_refs = []
    elif task == "seq2seq":
        all_preds = []
        all_refs = []
    
    pbar = tqdm(dataloader, desc="Training")
    
    for batch_idx, batch in enumerate(pbar):
        # Move to device
        video = batch['video'].to(device)
        labels = batch['label'].to(device)
        
        # Forward pass
        optimizer.zero_grad()
        
        if scaler:
            with torch.cuda.amp.autocast():
                if task == "hybrid":
                    outputs = model(video)
                    # Compute weighted loss
                    loss = 0.0
                    if 'classification' in outputs:
                        loss += loss_weights.get('classification', 1.0) * criterion['classification'](outputs['classification'], labels)
                    if 'ctc' in outputs:
                        loss += loss_weights.get('ctc', 0.7) * criterion['ctc'](outputs['ctc'].permute(1, 0, 2), batch['gloss'].to(device), None, batch['gloss_lengths'].to(device))
                    if 'seq2seq' in outputs:
                        loss += loss_weights.get('seq2seq', 0.7) * criterion['seq2seq'](outputs['seq2seq'], batch['text'].to(device))
                else:
                    outputs = model(video)
                    if task == "classification":
                        loss = criterion(outputs['logits'], labels)
                    elif task == "ctc":
                        import torch.nn.functional as F
                        loss = F.ctc_loss(
                            outputs['logits'].permute(1, 0, 2),  # (T, B, vocab_size)
                            batch['gloss'].to(device),
                            batch.get('lengths', torch.tensor([outputs['logits'].size(1)] * len(labels)).to(device)),
                            batch['gloss_lengths'].to(device),
                            blank=0,
                            reduction='mean'
                        )
                    elif task == "seq2seq":
                        loss = criterion(outputs['logits'].view(-1, outputs['logits'].size(-1)), batch['text'].to(device).view(-1))
            
            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            clip_grad_norm(model, max_grad_norm)
            scaler.step(optimizer)
            scaler.update()
        else:
            if task == "hybrid":
                outputs = model(video)
                loss = 0.0
                if 'classification' in outputs:
                    loss += loss_weights.get('classification', 1.0) * criterion['classification'](outputs['classification'], labels)
                if 'ctc' in outputs:
                    import torch.nn.functional as F
                    loss += loss_weights.get('ctc', 0.7) * F.ctc_loss(
                        outputs['ctc'].permute(1, 0, 2),
                        batch['gloss'].to(device),
                        None,
                        batch['gloss_lengths'].to(device),
                        blank=0
                    )
            else:
                outputs = model(video)
                if task == "classification":
                    loss = criterion(outputs['logits'], labels)
                elif task == "ctc":
                    import torch.nn.functional as F
                    loss = F.ctc_loss(
                        outputs['logits'].permute(1, 0, 2),
                        batch['gloss'].to(device),
                        None,
                        batch['gloss_lengths'].to(device),
                        blank=0
                    )
                elif task == "seq2seq":
                    loss = criterion(outputs['logits'].view(-1, outputs['logits'].size(-1)), batch['text'].to(device).view(-1))
            
            loss.backward()
            clip_grad_norm(model, max_grad_norm)
            optimizer.step()
        
        # Update metrics
        total_loss += loss.item()
        total_samples += len(labels)
        
        if task == "classification":
            acc1, acc5 = accuracy_topk(outputs['logits'], labels)
            correct_top1 += acc1 * len(labels) / 100.0
            correct_top5 += acc5 * len(labels) / 100.0
            pbar.set_postfix({'loss': loss.item(), 'acc1': acc1, 'acc5': acc5})
        
        pbar.set_postfix({'loss': loss.item()})
    
    metrics = {
        'loss': total_loss / len(dataloader),
    }
    
    if task == "classification":
        metrics['acc1'] = correct_top1 / total_samples * 100.0
        metrics['acc5'] = correct_top5 / total_samples * 100.0
    
    return metrics


def validate_epoch(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    device: torch.device,
    task: str = "classification",
    idx_to_label: Optional[Dict[int, str]] = None
) -> Dict[str, float]:
    """
    Validation loop
    """
    model.eval()
    total_loss = 0.0
    total_samples = 0
    
    # Metrics
    if task == "classification":
        correct_top1 = 0
        correct_top5 = 0
    elif task == "ctc":
        all_preds = []
        all_refs = []
    elif task == "seq2seq":
        all_preds = []
        all_refs = []
    
    with torch.no_grad():
        for batch in tqdm(dataloader, desc="Validation"):
            video = batch['video'].to(device)
            labels = batch['label'].to(device)
            
            outputs = model(video)
            
            if task == "classification":
                loss = criterion(outputs['logits'], labels)
                acc1, acc5 = accuracy_topk(outputs['logits'], labels)
                correct_top1 += acc1 * len(labels) / 100.0
                correct_top5 += acc5 * len(labels) / 100.0
            elif task == "ctc":
                import torch.nn.functional as F
                loss = F.ctc_loss(
                    outputs['logits'].permute(1, 0, 2),
                    batch['gloss'].to(device),
                    None,
                    batch['gloss_lengths'].to(device),
                    blank=0
                )
                # Decode predictions
                from .decoding import ctc_greedy_decode
                preds = ctc_greedy_decode(outputs['logits'])
                refs = batch['gloss'].cpu().tolist()
                all_preds.extend(preds)
                all_refs.extend(refs)
            elif task == "seq2seq":
                loss = criterion(outputs['logits'].view(-1, outputs['logits'].size(-1)), batch['text'].to(device).view(-1))
            
            total_loss += loss.item()
            total_samples += len(labels)
    
    metrics = {
        'loss': total_loss / len(dataloader),
    }
    
    if task == "classification":
        metrics['acc1'] = correct_top1 / total_samples * 100.0
        metrics['acc5'] = correct_top5 / total_samples * 100.0
    elif task == "ctc":
        metrics['wer'] = compute_wer(
            [' '.join(map(str, p)) for p in all_preds],
            [' '.join(map(str, r)) for r in all_refs]
        )
        metrics['gloss_acc'] = gloss_accuracy(all_preds, all_refs)
    
    return metrics

