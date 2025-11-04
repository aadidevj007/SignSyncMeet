#!/usr/bin/env python3
"""
Export PyTorch model to ONNX
"""

import argparse
import torch
import logging
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from training.models import VideoSwinModel, PoseFormerV2Model
from training.utils.common import get_device

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(description='Export PyTorch model to ONNX')
    parser.add_argument('--checkpoint', type=str, required=True, help='Path to PyTorch checkpoint')
    parser.add_argument('--output', type=str, required=True, help='Output ONNX path')
    parser.add_argument('--input-shape', type=int, nargs='+', default=[1, 16, 3, 224, 224], help='Input shape')
    parser.add_argument('--model-type', type=str, default='video_swin', choices=['video_swin', 'poseformer'])
    parser.add_argument('--num-classes', type=int, default=100)
    
    args = parser.parse_args()
    
    # Load model
    checkpoint = torch.load(args.checkpoint, map_location='cpu')
    
    if args.model_type == 'video_swin':
        model = VideoSwinModel(num_classes=args.num_classes, task='classification')
    else:
        model = PoseFormerV2Model(num_classes=args.num_classes, task='classification')
    
    if 'model_state_dict' in checkpoint:
        model.load_state_dict(checkpoint['model_state_dict'])
    else:
        model.load_state_dict(checkpoint)
    
    model.eval()
    device = get_device()
    model = model.to(device)
    
    # Create dummy input
    input_shape = tuple(args.input_shape)
    dummy_input = torch.randn(*input_shape).to(device)
    
    # Export
    logger.info(f"Exporting to ONNX: {args.output}")
    torch.onnx.export(
        model,
        dummy_input,
        args.output,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={'input': {0: 'batch'}, 'output': {0: 'batch'}},
        opset_version=11
    )
    
    logger.info("ONNX export complete!")


if __name__ == '__main__':
    main()

