#!/usr/bin/env python3
"""
Train Video-Swin model for sign language recognition

Usage:
    python training/train_video_swin.py --config configs/video_swin_config.json
    python training/train_video_swin.py --config configs/video_swin_config.json --dry-run
    python training/train_video_swin.py --config configs/video_swin_config.json --eval-only --checkpoint checkpoints/best_model.pth
"""

import argparse
import json
import logging
from pathlib import Path
from typing import Dict, Any, List
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, ConcatDataset
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from training.datasets import WLASLDataset, PhoenixDataset, ASLLVDDataset, ISLKaggleDataset
from training.datasets.transforms import VideoTransform
from training.datasets.collate import collate_video
from training.models import VideoSwinModel
from training.utils.common import set_seed, get_device, setup_amp, save_checkpoint, load_checkpoint
from training.utils.train_loops import train_epoch, validate_epoch
from training.utils.logging import TensorBoardLogger
from training.utils.metrics import accuracy_topk
from training.utils.synthetic_data import SyntheticVideoDataset

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def load_config(config_path: str) -> Dict[str, Any]:
    """Load configuration from JSON"""
    with open(config_path, 'r') as f:
        config = json.load(f)
    return config


def build_datasets(config: Dict[str, Any], split: str) -> List[torch.utils.data.Dataset]:
    """Build datasets from config"""
    datasets = []
    data_config = config.get('data', {})
    
    for dataset_config in config.get('datasets', []):
        dataset_name = dataset_config.get('name', '').lower()
        root = dataset_config.get('root', '')
        
        # Check if dataset exists
        if not Path(root).exists():
            logger.warning(f"Dataset {dataset_name} not found at {root}. Skipping.")
            continue
        
        # Create transform
        transform = VideoTransform(
            resize=data_config.get('resize', 224),
            center_crop=data_config.get('center_crop', True),
            clip_len=data_config.get('clip_len', 16),
            frame_stride=data_config.get('frame_stride', 2),
            normalize=data_config.get('normalize', None)
        )
        
        try:
            if dataset_name == 'wlasl':
                dataset = WLASLDataset(
                    root=root,
                    split=split,
                    labels_json=dataset_config.get('labels_json'),
                    transform=transform,
                    **data_config
                )
                if len(dataset) > 0:
                    datasets.append(dataset)
                    logger.info(f"Loaded {dataset_name}: {len(dataset)} samples")
            
            elif dataset_name == 'phoenix':
                dataset = PhoenixDataset(
                    root=root,
                    split=split,
                    transform=transform,
                    vocab_gloss=config.get('labels', {}).get('ctc_vocab'),
                    vocab_text=config.get('labels', {}).get('seq2seq_vocab'),
                    **data_config
                )
                if len(dataset) > 0:
                    datasets.append(dataset)
                    logger.info(f"Loaded {dataset_name}: {len(dataset)} samples")
            
            elif dataset_name == 'asllvd':
                dataset = ASLLVDDataset(
                    root=root,
                    split=split,
                    transform=transform,
                    **data_config
                )
                if len(dataset) > 0:
                    datasets.append(dataset)
                    logger.info(f"Loaded {dataset_name}: {len(dataset)} samples")
            
            elif dataset_name in ['isl_kaggle', 'isl', 'kaggle']:
                dataset = ISLKaggleDataset(
                    root=root,
                    split=split,
                    csv_file=dataset_config.get('csv_file'),
                    transform=transform,
                    **data_config
                )
                if len(dataset) > 0:
                    datasets.append(dataset)
                    logger.info(f"Loaded {dataset_name}: {len(dataset)} samples")
        except Exception as e:
            logger.error(f"Error loading dataset {dataset_name}: {e}")
            continue
    
    return datasets


def build_model(config: Dict[str, Any], num_classes: int = None, vocab_size: int = None) -> VideoSwinModel:
    """Build model from config"""
    backbone_config = config.get('backbone', {})
    task = config.get('task', 'classification')
    
    model = VideoSwinModel(
        backbone_name=backbone_config.get('name', 'video_swin_base'),
        pretrained=backbone_config.get('pretrained', True),
        checkpoint=backbone_config.get('checkpoint', ''),
        num_classes=num_classes,
        vocab_size=vocab_size,
        task=task,
        input_shape=(1, config.get('data', {}).get('clip_len', 16), 3, 224, 224)
    )
    
    return model


def main():
    parser = argparse.ArgumentParser(description='Train Video-Swin model')
    parser.add_argument('--config', type=str, required=True, help='Path to config JSON')
    parser.add_argument('--dry-run', action='store_true', help='Run one batch only')
    parser.add_argument('--no-tfa', action='store_true', help='Ignore any TensorFlow Addons usage (compat flag)')
    parser.add_argument('--eval-only', action='store_true', help='Evaluate only')
    parser.add_argument('--checkpoint', type=str, help='Checkpoint path for eval/resume')
    parser.add_argument('--resume', action='store_true', help='Resume from checkpoint')
    
    args = parser.parse_args()
    
    # Load config
    config = load_config(args.config)
    
    # Set seed
    set_seed(config.get('seed', 42))
    
    # Setup device
    device = get_device()
    logger.info(f"Using device: {device}")
    
    # Setup AMP
    scaler = setup_amp(config.get('train', {}).get('amp', True))
    
    # Build datasets
    train_datasets = build_datasets(config, 'train')
    val_datasets = build_datasets(config, 'val')
    
    # If no dataset is available, fall back to synthetic dataset
    use_synthetic = len(train_datasets) == 0
    if use_synthetic or args.dry_run:
        logger.warning("Using synthetic random data for smoke test (dry-run mode or no datasets found).")
        data_cfg = config.get('data', {})
        syn_clip = int(data_cfg.get('clip_len', 8))
        syn_resize = int(data_cfg.get('resize', 224))
        synthetic_classes = int(config.get('num_classes', 10))
        train_dataset = SyntheticVideoDataset(num_samples=16, clip_len=syn_clip, height=syn_resize, width=syn_resize, num_classes=synthetic_classes)
        val_dataset = SyntheticVideoDataset(num_samples=8, clip_len=syn_clip, height=syn_resize, width=syn_resize, num_classes=synthetic_classes)
    else:
        # Concatenate datasets
        train_dataset = ConcatDataset(train_datasets) if len(train_datasets) > 1 else train_datasets[0]
        val_dataset = ConcatDataset(val_datasets) if len(val_datasets) > 1 else (val_datasets[0] if len(val_datasets) > 0 else None)
        logger.info(f"Training samples: {len(train_dataset)}")
        if val_dataset:
            logger.info(f"Validation samples: {len(val_dataset)}")
    
    # Get number of classes/vocab
    num_classes = None
    vocab_size = None
    task = config.get('task', 'classification')
    
    if task in ['classification', 'hybrid']:
        # Get num_classes from first dataset
        if hasattr(train_dataset, 'datasets'):
            first_ds = train_dataset.datasets[0]
        else:
            first_ds = train_dataset
        if hasattr(first_ds, 'label_to_idx'):
            num_classes = len(first_ds.label_to_idx)
        else:
            num_classes = config.get('num_classes', 100)  # Default
    
    if task in ['ctc', 'seq2seq', 'hybrid']:
        vocab_size = config.get('vocab_size', 1000)  # Default
    
    # Build model
    model = build_model(config, num_classes, vocab_size)
    model = model.to(device)
    
    logger.info(f"Model: {model.__class__.__name__}")
    logger.info(f"Task: {task}")
    logger.info(f"Parameters: {sum(p.numel() for p in model.parameters()):,}")
    
    # Build dataloaders
    train_config = config.get('train', {})
    # Simple default collate for synthetic data: stack dict['video'] into (N,T,C,H,W)
    def _default_collate(batch):
        videos = torch.stack([b['video'] for b in batch], dim=0)
        labels = torch.tensor([b.get('label', 0) for b in batch], dtype=torch.long)
        return { 'video': videos, 'label': labels }

    collate_fn = _default_collate if use_synthetic else collate_video

    train_loader = DataLoader(
        train_dataset,
        batch_size=train_config.get('batch_size', 8),
        shuffle=True,
        num_workers=train_config.get('num_workers', 4),
        collate_fn=collate_fn,
        pin_memory=True
    )
    
    val_loader = None
    if val_dataset:
        val_loader = DataLoader(
            val_dataset,
            batch_size=train_config.get('batch_size', 8),
            shuffle=False,
            num_workers=train_config.get('num_workers', 4),
            collate_fn=collate_fn if use_synthetic else collate_video,
            pin_memory=True
        )
    
    # Dry run: run a tiny step and save a checkpoint
    if args.dry_run:
        logger.info("Dry-run: running 2 training steps and saving checkpoint...")
        criterion_smoke = nn.CrossEntropyLoss()
        optimizer_smoke = AdamW(model.parameters(), lr=1e-4)
        model.train()
        for i, batch in enumerate(train_loader):
            video = batch['video'].to(device)
            labels = batch['label'].to(device)
            out = model(video)
            logits = out.get('logits', out.get('classification', out))
            if isinstance(logits, dict):
                logits = logits.get('logits', list(logits.values())[0])
            loss = criterion_smoke(logits, labels)
            optimizer_smoke.zero_grad()
            loss.backward()
            optimizer_smoke.step()
            logger.info(f"Step {i+1}/2 loss={loss.item():.4f}")
            if i+1 >= 2:
                break
        # Save checkpoint
        output_dir = Path(config.get('output_dir', 'ml/checkpoints/videoswin'))
        output_dir.mkdir(parents=True, exist_ok=True)
        checkpoint_path = output_dir / 'best_model.pth'
        torch.save({
            'model_state_dict': model.state_dict(),
            'num_classes': num_classes or 10,
            'task': task
        }, checkpoint_path)
        # Also save flat path for convenience
        flat_best = Path('ml/checkpoints/best_model.pth')
        flat_best.parent.mkdir(parents=True, exist_ok=True)
        torch.save({
            'model_state_dict': model.state_dict(),
            'num_classes': num_classes or 10,
            'task': task
        }, flat_best)
        logger.info(f"Checkpoints saved: {checkpoint_path} and {flat_best}")
        logger.info("Dry-run complete!")
        return
    
    # Eval only
    if args.eval_only:
        if not args.checkpoint:
            logger.error("--checkpoint required for --eval-only")
            return
        
        load_checkpoint(model, None, args.checkpoint, device)
        logger.info(f"Loaded checkpoint: {args.checkpoint}")
        
        if val_loader:
            criterion = nn.CrossEntropyLoss()
            metrics = validate_epoch(model, val_loader, criterion, device, task)
            logger.info(f"Validation metrics: {metrics}")
        return
    
    # Setup optimizer and scheduler
    optimizer = AdamW(
        model.parameters(),
        lr=train_config.get('lr', 5e-5),
        weight_decay=train_config.get('weight_decay', 0.01)
    )
    
    epochs = train_config.get('epochs', 40)
    scheduler = CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-7)
    
    # Setup criterion
    criterion = nn.CrossEntropyLoss()
    if task == "hybrid":
        criterion = {
            'classification': nn.CrossEntropyLoss(),
            'ctc': nn.CTCLoss(blank=0, reduction='mean'),
            'seq2seq': nn.CrossEntropyLoss(ignore_index=0)
        }
    
    # Setup logging
    output_dir = Path(config.get('output_dir', 'ml/checkpoints/videoswin'))
    output_dir.mkdir(parents=True, exist_ok=True)
    
    exp_name = config.get('exp_name', 'videoswin_train')
    logger_tb = TensorBoardLogger(str(output_dir), exp_name)
    
    # Resume
    start_epoch = 0
    best_metric = 0.0
    
    if args.resume and args.checkpoint:
        checkpoint_data = load_checkpoint(model, optimizer, args.checkpoint, device)
        start_epoch = checkpoint_data['epoch'] + 1
        best_metric = checkpoint_data['metric']
        logger.info(f"Resumed from epoch {start_epoch}, best metric: {best_metric}")
    
    # Training loop
    logger.info("Starting training...")
    
    for epoch in range(start_epoch, epochs):
        logger.info(f"Epoch {epoch+1}/{epochs}")
        
        # Train
        train_metrics = train_epoch(
            model,
            train_loader,
            criterion,
            optimizer,
            device,
            scaler,
            task,
            loss_weights=config.get('loss_weights', {'classification': 1.0, 'ctc': 0.7, 'seq2seq': 0.7})
        )
        
        logger.info(f"Train metrics: {train_metrics}")
        logger_tb.log_dict(train_metrics, epoch, 'train')
        
        # Validate
        if val_loader:
            val_metrics = validate_epoch(model, val_loader, criterion, device, task)
            logger.info(f"Val metrics: {val_metrics}")
            logger_tb.log_dict(val_metrics, epoch, 'val')
            
            # Save checkpoint
            metric_key = 'acc1' if task == 'classification' else 'wer'
            current_metric = val_metrics.get(metric_key, 0.0)
            
            # For WER, lower is better
            is_best = (current_metric > best_metric) if metric_key == 'acc1' else (current_metric < best_metric)
            
            if is_best:
                best_metric = current_metric
                save_checkpoint(
                    model,
                    optimizer,
                    epoch,
                    current_metric,
                    str(output_dir / 'best_model.pth'),
                    is_best=True
                )
        
        # Save last checkpoint
        save_checkpoint(
            model,
            optimizer,
            epoch,
            best_metric,
            str(output_dir / 'last_model.pth'),
            is_best=False
        )
        
        # Update scheduler
        scheduler.step()
        
        logger.info(f"LR: {scheduler.get_last_lr()[0]:.6f}")
    
    logger_tb.close()
    logger.info("Training complete!")
    
    # Save metrics summary
    metrics_summary = {
        'best_metric': best_metric,
        'final_epoch': epochs
    }
    
    with open(output_dir / 'metrics.json', 'w') as f:
        json.dump(metrics_summary, f, indent=2)


if __name__ == '__main__':
    main()

