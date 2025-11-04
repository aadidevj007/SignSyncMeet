#!/usr/bin/env python3
"""
Run PyTorch inference on a video clip
Usage: python run_pytorch_infer.py --clip <path> [--landmarks <json>]
"""

import argparse
import json
import sys
import os
import torch
import numpy as np
from pathlib import Path

# Try to import ONNX Runtime for ONNX models
try:
    import onnxruntime as ort
    ONNX_AVAILABLE = True
except ImportError:
    ONNX_AVAILABLE = False

# Default class names (can be overridden by model config)
DEFAULT_CLASS_NAMES = [
    'Hello', 'Thank You', 'Yes', 'No', 'Please',
    'Sorry', 'Good', 'Bad', 'Help', 'Welcome'
]

def check_model_availability() -> tuple[str | None, str]:
    """Check if a model is available (TorchScript or ONNX)"""
    models_dir = Path(__file__).parent.parent.parent / 'models'
    
    # Check for ONNX models
    onnx_files = list(models_dir.glob('*.onnx'))
    if onnx_files:
        return str(onnx_files[0]), 'onnx'
    
    # Check for TorchScript models
    torchscript_files = list(models_dir.glob('*.pt'))
    if torchscript_files:
        return str(torchscript_files[0]), 'torchscript'
    
    # Check AVAILABLE_VIDEO_MODEL.txt
    model_file = models_dir / 'AVAILABLE_VIDEO_MODEL.txt'
    if model_file.exists():
        with open(model_file, 'r') as f:
            lines = [line.strip() for line in f if line.strip()]
            if lines:
                model_path = Path(lines[0])
                if model_path.exists():
                    if model_path.suffix == '.onnx':
                        return str(model_path), 'onnx'
                    elif model_path.suffix == '.pt':
                        return str(model_path), 'torchscript'
    
    return None, 'none'

def load_onnx_model(model_path: str, num_classes: int = 10):
    """Load ONNX model"""
    if not ONNX_AVAILABLE:
        raise ImportError('onnxruntime not installed. Run: pip install onnxruntime')
    
    session = ort.InferenceSession(model_path)
    return session

def load_torchscript_model(model_path: str, device: str = 'cpu'):
    """Load TorchScript model"""
    device_obj = torch.device(device)
    model = torch.jit.load(model_path, map_location=device_obj)
    model.eval()
    return model

def preprocess_clip(clip_path: str, num_frames: int = 32) -> np.ndarray:
    """
    Preprocess video clip to tensor
    For now, returns dummy data - in production, use OpenCV or ffmpeg-python
    """
    # TODO: Implement actual video preprocessing
    # This would use cv2 or ffmpeg to extract frames
    # For now, return dummy input
    return np.random.randn(1, num_frames, 3, 224, 224).astype(np.float32)

def predict_onnx(session: ort.InferenceSession, clip_tensor: np.ndarray) -> tuple[str, float]:
    """Run inference with ONNX model"""
    input_name = session.get_inputs()[0].name
    output = session.run(None, {input_name: clip_tensor})
    logits = output[0]
    
    probabilities = torch.nn.functional.softmax(torch.tensor(logits), dim=1)
    confidence, predicted_idx = torch.max(probabilities, 1)
    
    # Load class names
    class_names = DEFAULT_CLASS_NAMES
    class_names_file = Path(session.model_path).parent / 'class_names.txt'
    if class_names_file.exists():
        with open(class_names_file, 'r') as f:
            class_names = [line.strip() for line in f if line.strip()]
    
    label = class_names[predicted_idx.item()] if predicted_idx.item() < len(class_names) else f'Sign_{predicted_idx.item()}'
    confidence_val = confidence.item()
    
    return label, confidence_val

def predict_torchscript(model: torch.jit.ScriptModule, clip_tensor: torch.Tensor) -> tuple[str, float]:
    """Run inference with TorchScript model"""
    with torch.no_grad():
        output = model(clip_tensor)
        probabilities = torch.nn.functional.softmax(output, dim=1)
        confidence, predicted_idx = torch.max(probabilities, 1)
    
    # Load class names
    class_names = DEFAULT_CLASS_NAMES
    class_names_file = Path(model.__file__ if hasattr(model, '__file__') else '').parent / 'class_names.txt'
    if not class_names_file.exists():
        class_names_file = Path(__file__).parent.parent.parent / 'models' / 'class_names.txt'
    
    if class_names_file.exists():
        with open(class_names_file, 'r') as f:
            class_names = [line.strip() for line in f if line.strip()]
    
    label = class_names[predicted_idx.item()] if predicted_idx.item() < len(class_names) else f'Sign_{predicted_idx.item()}'
    confidence_val = confidence.item()
    
    return label, confidence_val

def main():
    parser = argparse.ArgumentParser(description='Run inference on video clip')
    parser.add_argument('--clip', required=True, help='Path to video clip')
    parser.add_argument('--landmarks', help='JSON string of landmarks array')
    parser.add_argument('--num-classes', type=int, default=10, help='Number of sign classes')
    parser.add_argument('--num-frames', type=int, default=32, help='Number of frames in clip')
    parser.add_argument('--device', default='cpu', choices=['cpu', 'cuda'], help='Device to run inference on')
    
    args = parser.parse_args()

    if not os.path.exists(args.clip):
        result = {
            'error': f'Clip not found: {args.clip}',
            'label': 'unknown',
            'confidence': 0.0
        }
        print(json.dumps(result))
        sys.exit(1)

    try:
        # Check for available model
        model_path, model_type = check_model_availability()
        
        if not model_path or model_type == 'none':
            result = {
                'error': 'No model found. Please download and convert a pretrained model.',
                'message': 'See /api/models/download-help for instructions',
                'label': 'unknown',
                'confidence': 0.0,
                'model': 'none'
            }
            print(json.dumps(result))
            sys.exit(1)
        
        # Preprocess clip
        clip_tensor = preprocess_clip(args.clip, args.num_frames)
        
        # Load and run model
        if model_type == 'onnx':
            session = load_onnx_model(model_path, args.num_classes)
            label, confidence = predict_onnx(session, clip_tensor)
        elif model_type == 'torchscript':
            device = 'cuda' if args.device == 'cuda' and torch.cuda.is_available() else 'cpu'
            model = load_torchscript_model(model_path, device)
            clip_torch = torch.from_numpy(clip_tensor)
            if device == 'cuda':
                clip_torch = clip_torch.cuda()
                model = model.cuda()
            label, confidence = predict_torchscript(model, clip_torch)
        else:
            raise ValueError(f'Unknown model type: {model_type}')
        
        result = {
            'label': label,
            'confidence': float(confidence),
            'model': f'videoswin-local-{model_type}',
            'details': {
                'model_path': model_path,
                'model_type': model_type
            }
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        result = {
            'error': str(e),
            'label': 'unknown',
            'confidence': 0.0
        }
        print(json.dumps(result))
        sys.exit(1)

if __name__ == '__main__':
    main()
