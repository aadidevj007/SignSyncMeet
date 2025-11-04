#!/usr/bin/env python3
"""
Convert PyTorch model to TensorFlow.js

Usage:
    python convert/to_tfjs.py --config configs/tfjs_config.json --pytorch-model checkpoints/best_model.pth --model-name sign_detector
"""

import argparse
import json
import logging
from pathlib import Path
import torch
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from training.models import VideoSwinModel, PoseFormerV2Model
from training.utils.common import get_device

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def load_config(config_path: str) -> dict:
    """Load configuration from JSON"""
    with open(config_path, 'r') as f:
        config = json.load(f)
    return config


def export_to_onnx(model: torch.nn.Module, output_path: str, input_shape: tuple, normalize: bool = True):
    """Export model to ONNX"""
    try:
        import onnx
        import onnxruntime
    except ImportError:
        logger.error("ONNX not installed. Install with: pip install onnx onnxruntime")
        return False
    
    model.eval()
    device = get_device()
    model = model.to(device)
    
    # Create dummy input
    dummy_input = torch.randn(*input_shape).to(device)
    
    # Export to ONNX
    logger.info(f"Exporting to ONNX: {output_path}")
    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={'input': {0: 'batch'}, 'output': {0: 'batch'}},
        opset_version=11
    )
    
    logger.info("ONNX export successful!")
    return True


def onnx_to_tfjs(onnx_path: str, tfjs_path: str):
    """Convert ONNX to TensorFlow.js"""
    try:
        import subprocess
        import sys
        
        # Try tensorflow-onnx
        logger.info("Converting ONNX to TensorFlow...")
        result = subprocess.run(
            [sys.executable, '-m', 'tf2onnx.convert', '--saved-model', onnx_path, '--output', tfjs_path],
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            logger.warning("tf2onnx conversion failed. Trying alternative method...")
            # Alternative: export to TensorFlow first
            logger.info("Please use ONNX -> TensorFlow -> TFJS conversion pipeline")
            logger.info("See: https://github.com/onnx/onnx-tensorflow")
            return False
        
        # Convert TensorFlow to TFJS
        logger.info("Converting TensorFlow to TensorFlow.js...")
        try:
            import tensorflowjs
            tensorflowjs.converters.convert_tf_saved_model(
                tfjs_path,
                tfjs_path.replace('.pb', '_tfjs')
            )
            logger.info("TFJS conversion successful!")
            return True
        except ImportError:
            logger.warning("tensorflowjs not installed. Install with: pip install tensorflowjs")
            logger.info("Manual conversion: Use tensorflowjs_converter command")
            return False
    
    except Exception as e:
        logger.error(f"ONNX to TFJS conversion failed: {e}")
        return False


def export_to_torchscript(model: torch.nn.Module, output_path: str, input_shape: tuple):
    """Export model to TorchScript"""
    model.eval()
    device = get_device()
    model = model.to(device)
    
    # Create dummy input
    dummy_input = torch.randn(*input_shape).to(device)
    
    # Export to TorchScript
    logger.info(f"Exporting to TorchScript: {output_path}")
    traced_model = torch.jit.trace(model, dummy_input)
    traced_model.save(output_path)
    
    logger.info("TorchScript export successful!")
    return True


def main():
    parser = argparse.ArgumentParser(description='Convert model to TensorFlow.js (PyTorch or TF SavedModel)')
    parser.add_argument('--config', type=str, required=True, help='Path to TFJS config JSON')
    parser.add_argument('--pytorch-model', type=str, help='Path to PyTorch checkpoint (optional if using TF SavedModel)')
    parser.add_argument('--model-name', type=str, default='sign_detector', help='Model name for output')
    parser.add_argument('--no-tfa', action='store_true', help='Do not use TensorFlow Addons (compat flag)')
    
    args = parser.parse_args()
    
    # Load config
    config = load_config(args.config)

    # If no PyTorch model is provided, try TF SavedModel route
    if not args.pytorch_model:
        saved_model_dir = config.get('tf_saved_model')
        if not saved_model_dir:
            # default expected path from TF training script
            saved_model_dir = 'ml/checkpoints/tf_landmark/saved_model'
        saved_model_dir = Path(saved_model_dir)
        
        if not saved_model_dir.exists():
            logger.error(f"TF SavedModel not found at: {saved_model_dir}")
            logger.info("Please train TF model first: python training/train_landmark_tf.py --config configs/tf_landmark_config.json")
            return

        output_dir = Path(config.get('tfjs_out', f"apps/frontend/public/models/tfjs_landmark_model/{args.model_name}"))
        output_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Keras/SavedModel route: converting {saved_model_dir} -> {output_dir}")
        
        # Try tensorflowjs_converter CLI first
        try:
            import subprocess
            import sys
            result = subprocess.run(
                [sys.executable, '-m', 'tensorflowjs.converters.convert_tf_saved_model',
                 str(saved_model_dir), str(output_dir)],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                logger.info(f"TFJS model saved to: {output_dir}")
                logger.info(f"Model files: {list(output_dir.glob('*'))}")
                return
            else:
                logger.warning(f"tensorflowjs_converter failed: {result.stderr}")
        except Exception as e:
            logger.warning(f"Subprocess conversion failed: {e}")
        
        # Fallback to direct import
        try:
            import tensorflowjs.converters.tf_saved_model_conversion_v2 as converter
            converter.convert_tf_saved_model(
                str(saved_model_dir),
                str(output_dir)
            )
            logger.info(f"TFJS model saved to: {output_dir}")
            return
        except Exception as e:
            logger.error(f"TFJS conversion from SavedModel failed: {e}")
            logger.info("Try installing tensorflowjs>=4.10.0")
            logger.info(f"Or use CLI: tensorflowjs_converter --input_format=tf_saved_model {saved_model_dir} {output_dir}")
            return

    # PyTorch route
    logger.info(f"Loading PyTorch model: {args.pytorch_model}")
    checkpoint = torch.load(args.pytorch_model, map_location='cpu')
    
    # Determine model type from config or checkpoint
    model_type = config.get('model_type', 'video_swin')
    num_classes = config.get('num_classes', checkpoint.get('num_classes', 100))
    vocab_size = config.get('vocab_size', checkpoint.get('vocab_size', 1000))
    task = config.get('task', 'classification')
    
    # Build model
    if model_type == 'video_swin':
        model = VideoSwinModel(
            num_classes=num_classes if task == 'classification' else None,
            vocab_size=vocab_size if task in ['ctc', 'seq2seq'] else None,
            task=task
        )
    elif model_type == 'poseformer':
        model = PoseFormerV2Model(
            num_classes=num_classes if task == 'classification' else None,
            vocab_size=vocab_size if task in ['ctc', 'seq2seq'] else None,
            task=task
        )
    else:
        raise ValueError(f"Unknown model type: {model_type}")
    
    # Load weights
    if 'model_state_dict' in checkpoint:
        model.load_state_dict(checkpoint['model_state_dict'])
    else:
        model.load_state_dict(checkpoint)
    
    model.eval()
    
    # Get input shape
    input_shape = config.get('input_shape', [1, 16, 3, 224, 224])
    if isinstance(input_shape, list):
        input_shape = tuple(input_shape)
    
    # Setup output directory
    output_dir = Path(config.get('tfjs_out', f"apps/frontend/public/models/tfjs_landmark_model/{args.model_name}"))
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Export to ONNX first
    onnx_path = str(output_dir / f"{args.model_name}.onnx")
    logger.info("Step 1: Exporting to ONNX...")
    if not export_to_onnx(model, onnx_path, input_shape, config.get('normalize', True)):
        logger.error("ONNX export failed. Falling back to TorchScript...")
        # Fallback to TorchScript
        torchscript_path = str(output_dir / f"{args.model_name}.torchscript")
        export_to_torchscript(model, torchscript_path, input_shape)
        logger.info(f"Exported TorchScript model: {torchscript_path}")
        logger.info("For TFJS conversion, see README in output directory")
        return
    
    # Convert ONNX to TFJS
    logger.info("Step 2: Converting ONNX to TensorFlow.js...")
    tfjs_path = str(output_dir)
    
    if not onnx_to_tfjs(onnx_path, tfjs_path):
        logger.warning("ONNX to TFJS conversion failed.")
        # Always produce usable artifacts: place ONNX in a public onnx dir with README
        onnx_pub_dir = Path("apps/frontend/public/models/tfjs_landmark_model/onnx")
        onnx_pub_dir.mkdir(parents=True, exist_ok=True)
        onnx_pub_path = onnx_pub_dir / f"{args.model_name}.onnx"
        try:
            import shutil
            shutil.copyfile(onnx_path, onnx_pub_path)
        except Exception as e:
            logger.error(f"Failed to copy ONNX to public dir: {e}")
        readme_path = onnx_pub_dir / "README.md"
        readme_path.write_text(
            """
This directory contains an ONNX model intended for use with ONNX Runtime Web in the frontend.

Quick start (frontend):
- Load with onnxruntime-web (wasm/webgl)
- Ensure input tensor shape matches config input_shape

If you still prefer TFJS graph model, conversion from ONNX can be non-trivial.
Try: tensorflowjs_converter --input_format=onnx --output_format=tfjs_graph_model <model.onnx> <out_dir>
            """.strip()
        )
        logger.info(f"ONNX model placed at: {onnx_pub_path}")
        logger.info(f"README written at: {readme_path}")
        return
    
    logger.info(f"TensorFlow.js model saved at: {output_dir}")
    logger.info("Model conversion complete!")


if __name__ == '__main__':
    main()

