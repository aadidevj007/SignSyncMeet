#!/usr/bin/env python3
"""
Fine-tune Video-Swin Transformer for sign language recognition.

Usage:
    python train_videoswin_finetune.py \
        --data-dir ./data/processed \
        --epochs 30 \
        --batch-size 8 \
        --lr 1e-4 \
        --num-classes 10 \
        --checkpoint-out ./models/checkpoints/videoswin_best.pth
"""

import argparse
import os
import json
import time
from pathlib import Path
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torch.cuda.amp import autocast, GradScaler
import torchvision.transforms as transforms
from torch.utils.tensorboard import SummaryWriter
import cv2
import numpy as np
from tqdm import tqdm

# Try importing Video-Swin (requires timm or official implementation)
try:
    import timm
    from timm import create_model
    SWIN_AVAILABLE = True
except ImportError:
    print("⚠️ Warning: timm not available. Install with: pip install timm")
    SWIN_AVAILABLE = False


class SignLanguageDataset(Dataset):
    """Dataset for sign language video clips."""
    
    def __init__(
        self,
        data_dir: Path,
        split: str = 'train',
        num_frames: int = 32,
        image_size: int = 224,
        transform=None
    ):
        self.data_dir = Path(data_dir) / split
        self.num_frames = num_frames
        self.image_size = image_size
        self.transform = transform or self._default_transform()
        
        # Load labels
        labels_csv = self.data_dir / 'labels.csv'
        if not labels_csv.exists():
            raise FileNotFoundError(f"Labels CSV not found: {labels_csv}")
        
        import pandas as pd
        self.df = pd.read_csv(labels_csv)
        
        # Get class names and create mapping
        self.classes = sorted(self.df['class_name'].unique())
        self.class_to_idx = {cls: idx for idx, cls in enumerate(self.classes)}
        self.idx_to_class = {idx: cls for cls, idx in self.class_to_idx.items()}
    
    def _default_transform(self):
        return transforms.Compose([
            transforms.ToPILImage(),
            transforms.Resize((self.image_size, self.image_size)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[緊張.229, 0.224, 0.225怨])
        ])
    
    def __len__(self):
        return len(self.df)
    
    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        clip_path = Path(row['clip_path'])
        class_name = row['class_name']
        label = self.class_to_idx[class_name]
        
        # Load frames
        frames_dir = clip_path / 'frames'
        frame_files = sorted(frames_dir.glob('frame_*.jpg'))
        
        if len(frame_files) == 0:
            raise ValueError(f"No frames found in {frames_dir}")
        
        # Sample or pad frames
        if len(frame_files) > self.num_frames:
            indices = np.linspace(0, len(frame_files) - 1, self.num_frames, dtype=int)
            frame_files = [frame_files[i] for i in indices]
        elif len(frame_files) < self.num_frames:
            # Repeat last frame
            last_frame = frame_files[-1]
            frame_files.extend([last_frame] * (self.num_frames - len(frame_files)))
        
        # Load and transform frames
        frames = []
        for frame_file in frame_files[:self.num_frames]:
            frame = cv2.imread(str(frame_file))
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frame = self.transform(frame)
            frames.append(frame)
        
        # Stack frames: [T, C, H, W]
        video_tensor = torch.stack(frames, dim=0)
        
        return video_tensor, label


def create_videoswin_model(num_classes: int, pretrained: bool = True):
    """Create Video-Swin Transformer model."""
    if not SWIN_AVAILABLE:
        # Fallback: use a simple 3D CNN
        print("⚠️ Using fallback 3D CNN model (install timm for Video-Swin)")
        return Simple3DCNN(num_classes)
    
    # Load Video-Swin from timm (if available)
    # Note: This is a placeholder - actual Video-Swin requires custom implementation
    # For now, use a Swin Transformer and adapt it
    try:
        model = create_model(
            'swin_base_patch4_window7_224',
            pretrained=pretrained,
            num_classes=num_classes
        )
        # TODO: Adapt 2D Swin to 3D for video
        print("⚠️ Using 2D Swin (adapt to 3D for production)")
        return model
    except:
        return Simple3DCNN(num_classes)


class Simple3DCNN(nn.Module):
    """Simple 3D CNN fallback model."""
    
    def __init__(self, num_classes: int):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv3d(3, 64, kernel_size=(3, 7, 7), stride=(1, 2, 2), padding=(1, 3, 3)),
            nn.BatchNorm3d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool3d(kernel_size=(1, 3, 3), stride=(1, 2, 2)),
            
            nn.Conv3d(64, 128, kernel_size=(3, 3, 3), stride=(1, 2, 2), padding=(1, 1, 1)),
            nn.BatchNorm3d(128),
            nn.ReLU(inplace=True),
            
            nn.Conv3d(128, 256, kernel_size=(3, 3, 3), stride=(1, 2, 2), padding=(1, 1, 1)),
            nn.BatchNorm3d(256),
            nn.ReLU(inplace=True),
            
            nn.AdaptiveAvgPool3d((1, 1, 1))
        )
        self.classifier = nn.Linear(256, num_classes)
    
    def forward(self, x):
        # x: [B, T, C, H, W] -> [B, C, T, H, W]
        x = x.permute(0, 2, 1, 3, 4)
        x = self.features(x)
        x = x.view(x.size(0), -1)
        x = self.classifier(x)
        return x


def train_epoch(model, dataloader, criterion, optimizer, device, scaler, epoch):
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0
    
    pbar = tqdm(dataloader, desc=f"Epoch {epoch}")
    for batch_idx, (videos, labels) in enumerate(pbar):
        videos = videos.to(device)
        labels = labels.to(device)
        
        optimizer.zero_grad()
        
        with autocast():
            outputs = model(videos)
            loss = criterion(outputs, labels)
        
        scaler.scale(loss).backward()
        scaler.step(optimizer)
        scaler.update()
        
        running_loss += loss.item()
        _, predicted = torch.max(outputs.data, 1)
        total += labels.size(0)
        correct += (predicted == labels).sum().item()
        
        pbar.set_postfix({
            'loss': running_loss / (batch_idx + 1),
            'acc': 100 * correct / total
        })
    
    epoch_loss = running_loss / len(dataloader)
    epoch_acc = 100 * correct / total
    
    return epoch_loss, epoch_acc


def validate(model, dataloader, criterion, device):
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0
    
    with torch.no_grad():
        for videos, labels in tqdm(dataloader, desc="Validating"):
            videos = videos.to(device)
            labels = labels.to(device)
            
            with autocast():
                outputs = model(videos)
                loss = criterion(outputs, labels)
            
            running_loss += loss.item()
            _, predicted = torch.max(outputs.data, 1)
            total += labels.size(0)
            correct += (predicted == labels).sum().item()
    
    epoch_loss = running_loss / len(dataloader)
    epoch_acc = 100 * correct / total
    
    return epoch_loss, epoch_acc


def main():
    parser = argparse.ArgumentParser(description='Train Video-Swin for sign language recognition')
    parser.add_argument('--data-dir', required=True, type=Path, help='Data directory')
    parser.add_argument('--epochs', type=int, default=30, help='Number of epochs')
    parser.add_argument('--batch-size', type=int, default=8, help='Batch size')
    parser.add_argument('--lr', type=float, default=1e-4, help='Learning rate')
    parser.add_argument('--num-classes', type=int, help='Number of classes (auto-detect if not provided)')
    parser.add_argument('--checkpoint-out', type=Path, default='models/checkpoints/videoswin_best.pth',
                        help='Output checkpoint path')
    parser.add_argument('--resume', type=Path, help='Resume from checkpoint')
    parser.add_argument('--num-frames', type=int, default=32, help='Number of frames per clip')
    parser.add_argument('--image-size', type=int, default=224, help='Image size')
    parser.add_argument('--workers', type=int, default=4, help='DataLoader workers')
    
    args = parser.parse_args()
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"🚀 Using device: {device}")
    
    # Load datasets
    train_dataset = SignLanguageDataset(
        args.data_dir, split='train',
        num_frames=args.num_frames,
        image_size=args.image_size
    )
    val_dataset = SignLanguageDataset(
        args.data_dir, split='val',
        num_frames=args.num_frames,
        image_size=args.image_size
    )
    
    num_classes = args.num_classes or len(train_dataset.classes)
    print(f"📊 Number of classes: {num_classes}")
    print(f"   Classes: {train_dataset.classes}")
    
    # Save class names
    args.checkpoint_out.parent.mkdir(parents=True, exist_ok=True)
    with open(args.checkpoint_out.parent / 'class_names.txt', 'w') as f:
        for cls in train_dataset.classes:
            f.write(f"{cls}\n")
    
    train_loader = DataLoader(
        train_dataset, batch_size=args.batch_size,
        shuffle=True, num_workers=args.workers,
        pin_memory=True
    )
    val_loader = DataLoader(
        val_dataset, batch_size=args.batch_size,
        shuffle=False, num_workers=args.workers,
        pin_memory=True
    )
    
    # Create model
    model = create_videoswin_model(num_classes, pretrained=True)
    model = model.to(device)
    
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=args.lr, weight_decay=0.01)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)
    scaler = GradScaler()
    
    # Resume from checkpoint
    start_epoch = 0
    best_acc = 0.0
    if args.resume and args.resume.exists():
        print(f"📂 Resuming from {args.resume}")
        checkpoint = torch.load(args.resume)
        model.load_state_dict(checkpoint['model_state_dict'])
        optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
        start_epoch = checkpoint['epoch']
        best_acc = checkpoint.get('best_acc', 0.0)
    
    # TensorBoard
    writer = SummaryWriter(log_dir=f'runs/videoswin_{int(time.time())}')
    
    # Training loop
    for epoch in range(start_epoch, args.epochs):
        train_loss, train_acc = train_epoch(
            model, train_loader, criterion, optimizer, device, scaler, epoch
        )
        val_loss, val_acc = validate(model, val_loader, criterion, device)
        
        scheduler.step()
        
        writer.add_scalar('Loss/Train', train_loss, epoch)
        writer.add_scalar('Loss/Val', val_loss, epoch)
        writer.add_scalar('Acc/Train', train_acc, epoch)
        writer.add_scalar('Acc/Val', val_acc, epoch)
        
        print(f"\nEpoch {epoch+1}/{args.epochs}:")
        print(f"  Train Loss: {train_loss:.4f}, Acc: {train_acc:.2f}%")
        print(f"  Val Loss: {val_loss:.4f}, Acc: {val_acc:.2f}%")
        
        # Save best model
        if val_acc > best_acc:
            best_acc = val_acc
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'best_acc': best_acc,
                'num_classes': num_classes
            }, args.checkpoint_out)
            print(f"  ✅ Saved best model (Acc: {best_acc:.2f}%)")
    
    writer.close()
    print(f"\n✅ Training complete! Best accuracy: {best_acc:.2f}%")


if __name__ == '__main__':
    main()

