#!/usr/bin/env python3
"""
Train PoseFormerV2 model for sign language recognition from pose/landmarks

Usage:
    python training/train_poseformer.py --config configs/poseformer_config.json
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

from training.models import PoseFormerV2Model
from training.utils.common import set_seed, get_device, setup_amp, save_checkpoint, load_checkpoint
from training.utils.train_loops import train_epoch, validate_epoch
from training.utils.logging import TensorBoardLogger
from training.utils.synthetic_data import SyntheticPoseDataset
from training.datasets.collate import collate_poses

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def load_config(config_path: str) -> Dict[str, Any]:
    """Load configuration from JSON"""
    with open(config_path, 'r') as f:
        config = json.load(f)
    return config


def build_model(config: Dict[str, Any], num_classes: int = None, vocab_size: int = None) -> PoseFormerV2Model:
    """Build PoseFormerV2 model from config"""
    model_config = config.get('model', {})
    task = config.get('task', 'classification')
    
    model = PoseFormerV2Model(
        input_dim=model_config.get('input_dim', 225),
        d_model=model_config.get('d_model', 512),
        nhead=model_config.get('nhead', 8),
        num_layers=model_config.get('num_layers', 6),
        dim_feedforward=model_config.get('dim_feedforward', 2048),
        dropout=model_config.get('dropout', 0.1),
        num_classes=num_classes,
        vocab_size=vocab_size,
        task=task
    )
    
    return model


def main():
    parser = argparse.ArgumentParser(description='Train PoseFormerV2 model')
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
    
    # For PoseFormerV2, we need pose/landmark data
    # This is a simplified version - in production, load from preprocessed landmarks
    logger.info("PoseFormerV2 training requires preprocessed pose/landmark data.")
    logger.info("Please ensure your dataset provides pose sequences (T x 225) format.")
    
    # Get num_classes/vocab
    num_classes = config.get('num_classes', 100)
    vocab_size = config.get('vocab_size', 1000)
    task = config.get('task', 'classification')
    
    # Build model
    model = build_model(config, num_classes, vocab_size)
    model = model.to(device)
    
    logger.info(f"Model: {model.__class__.__name__}")
    logger.info(f"Task: {task}")
    logger.info(f"Parameters: {sum(p.numel() for p in model.parameters()):,}")
    
    # Build datasets (placeholder - in production, implement pose dataset loaders)
    # For now, use synthetic data
    use_synthetic = True
    data_cfg = config.get('data', {})
    model_cfg = config.get('model', {})
    seq_len = int(data_cfg.get('clip_len', 32))
    pose_dim = int(model_cfg.get('input_dim', 225))
    synthetic_classes = int(config.get('num_classes', 100))
    
    if use_synthetic or args.dry_run:
        logger.warning("Using synthetic pose data for smoke test.")
        train_dataset = SyntheticPoseDataset(num_samples=16, seq_len=seq_len, features=pose_dim, num_classes=synthetic_classes)
        val_dataset = SyntheticPoseDataset(num_samples=8, seq_len=seq_len, features=pose_dim, num_classes=synthetic_classes)
    else:
        # In production, load real pose datasets here
        logger.error("Real pose dataset loaders not implemented. Using synthetic data.")
        train_dataset = SyntheticPoseDataset(num_samples=16, seq_len=seq_len, features=pose_dim, num_classes=synthetic_classes)
        val_dataset = SyntheticPoseDataset(num_samples=8, seq_len=seq_len, features=pose_dim, num_classes=synthetic_classes)
    
    # Build dataloaders
    train_config = config.get('train', {})
    train_loader = DataLoader(
        train_dataset,
        batch_size=train_config.get('batch_size', 16),
        shuffle=True,
        num_workers=train_config.get('num_workers', 4),
        collate_fn=collate_poses,
        pin_memory=True
    )
    
    val_loader = None
    if val_dataset:
        val_loader = DataLoader(
            val_dataset,
            batch_size=train_config.get('batch_size', 16),
            shuffle=False,
            num_workers=train_config.get('num_workers', 4),
            collate_fn=collate_poses,
            pin_memory=True
        )
    
    # Dry run: run a tiny step and save checkpoint
    if args.dry_run:
        logger.info("Dry-run: running 2 training steps and saving checkpoint...")
        criterion_smoke = nn.CrossEntropyLoss()
        optimizer_smoke = AdamW(model.parameters(), lr=1e-4)
        model.train()
        for i, batch in enumerate(train_loader):
            poses = batch['pose'].to(device)
            labels = batch['label'].to(device)
            out = model(poses)
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
        output_dir = Path(config.get('output_dir', 'ml/checkpoints/poseformer'))
        output_dir.mkdir(parents=True, exist_ok=True)
        checkpoint_path = output_dir / 'best_model.pth'
        torch.save({
            'model_state_dict': model.state_dict(),
            'num_classes': synthetic_classes,
            'task': task
        }, checkpoint_path)
        # Also save flat path
        flat_best = Path('ml/checkpoints/best_model.pth')
        flat_best.parent.mkdir(parents=True, exist_ok=True)
        torch.save({
            'model_state_dict': model.state_dict(),
            'num_classes': synthetic_classes,
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
        logger.info("Evaluation requires pose dataset loader - implement based on your data format")
        return
    
    # Setup optimizer and scheduler
    train_config = config.get('train', {})
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
    output_dir = Path(config.get('output_dir', 'ml/checkpoints/poseformer'))
    output_dir.mkdir(parents=True, exist_ok=True)
    
    exp_name = config.get('exp_name', 'poseformer_train')
    logger_tb = TensorBoardLogger(str(output_dir), exp_name)
    
    # Resume
    start_epoch = 0
    best_metric = 0.0
    
    if args.resume and args.checkpoint:
        checkpoint_data = load_checkpoint(model, optimizer, args.checkpoint, device)
        start_epoch = checkpoint_data['epoch'] + 1
        best_metric = checkpoint_data['metric']
        logger.info(f"Resumed from epoch {start_epoch}, best metric: {best_metric}")
    
    # Full training loop (when not dry-run)
    logger.info("Starting full training...")
    epochs = train_config.get('epochs', 1)
    logger.info(f"Training for {epochs} epochs on {len(train_dataset)} samples")
    
    # Setup optimizer and scheduler
    optimizer = AdamW(
        model.parameters(),
        lr=train_config.get('lr', 5e-5),
        weight_decay=train_config.get('weight_decay', 0.01)
    )
    scheduler = CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-7)
    
    # Setup criterion
    criterion = nn.CrossEntropyLoss()
    
    # Training loop
    output_dir = Path(config.get('output_dir', 'ml/checkpoints/poseformer'))
    output_dir.mkdir(parents=True, exist_ok=True)
    best_metric = 0.0
    
    for epoch in range(epochs):
        logger.info(f"Epoch {epoch+1}/{epochs}")
        
        # Train
        model.train()
        total_loss = 0.0
        correct = 0
        total = 0
        
        for batch in train_loader:
            poses = batch['pose'].to(device)
            labels = batch['label'].to(device)
            
            optimizer.zero_grad()
            out = model(poses)
            logits = out.get('logits', out.get('classification', out))
            if isinstance(logits, dict):
                logits = logits.get('logits', list(logits.values())[0])
            
            loss = criterion(logits, labels)
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
            pred = logits.argmax(dim=1)
            correct += (pred == labels).sum().item()
            total += labels.size(0)
        
        logger.info(f"Train loss: {total_loss/len(train_loader):.4f}, Acc: {100*correct/total:.2f}%")
        
        # Validate
        if val_loader:
            model.eval()
            val_loss = 0.0
            val_correct = 0
            val_total = 0
            with torch.no_grad():
                for batch in val_loader:
                    poses = batch['pose'].to(device)
                    labels = batch['label'].to(device)
                    out = model(poses)
                    logits = out.get('logits', out.get('classification', out))
                    if isinstance(logits, dict):
                        logits = logits.get('logits', list(logits.values())[0])
                    loss = criterion(logits, labels)
                    val_loss += loss.item()
                    pred = logits.argmax(dim=1)
                    val_correct += (pred == labels).sum().item()
                    val_total += labels.size(0)
            
            val_acc = 100 * val_correct / val_total if val_total > 0 else 0.0
            logger.info(f"Val loss: {val_loss/len(val_loader):.4f}, Acc: {val_acc:.2f}%")
            
            if val_acc > best_metric:
                best_metric = val_acc
                checkpoint_path = output_dir / 'best_model.pth'
                torch.save({
                    'model_state_dict': model.state_dict(),
                    'num_classes': synthetic_classes,
                    'task': task,
                    'epoch': epoch,
                    'metric': best_metric
                }, checkpoint_path)
                # Also save flat path
                flat_best = Path('ml/checkpoints/best_model.pth')
                flat_best.parent.mkdir(parents=True, exist_ok=True)
                torch.save({
                    'model_state_dict': model.state_dict(),
                    'num_classes': synthetic_classes,
                    'task': task,
                    'epoch': epoch,
                    'metric': best_metric
                }, flat_best)
                logger.info(f"Saved best checkpoint: {checkpoint_path}")
        
        scheduler.step()
    
    logger.info("Training complete!")


if __name__ == '__main__':
    main()

