#!/bin/bash
# Download pretrained video models (Video-Swin Transformer and TimeSformer)
# This script downloads checkpoints and converts them to ONNX/TorchScript

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MODELS_DIR="$PROJECT_ROOT/models"
DATA_DIR="$PROJECT_ROOT/data"

echo "📦 SignSync Model Downloader"
echo "============================"
echo ""

# Create models directory if it doesn't exist
mkdir -p "$MODELS_DIR"

# Function to download file with wget or curl
download_file() {
    local url=$1
    local output=$2
    
    if command -v wget &> /dev/null; then
        wget -q --show-progress -O "$output" "$url"
    elif command -v curl &> /dev/null; then
        curl -L --progress-bar -o "$output" "$url"
    else
        echo "❌ Error: wget or curl not found. Please install one of them."
        exit 1
    fi
}

# Function to check if file exists and is valid
check_file() {
    local file=$1
    if [ -f "$file" ] && [ -s "$file" ]; then
        return 0
    else
        return 1
    fi
}

# Video-Swin Transformer
echo "🔍 Checking for Video-Swin Transformer..."
VIDEOSWIN_DIR="$MODELS_DIR/videoswin"

if [ ! -d "$VIDEOSWIN_DIR" ]; then
    echo "📥 Cloning Video-Swin Transformer repository..."
    cd "$MODELS_DIR"
    git clone https://github.com/SwinTransformer/Video-Swin-Transformer.git videoswin || {
        echo "⚠️  Git clone failed. Please clone manually:"
        echo "   cd $MODELS_DIR"
        echo "   git clone https://github.com/SwinTransformer/Video-Swin-Transformer.git videoswin"
        echo ""
        echo "   Then download pretrained weights from:"
        echo "   https://github.com/SwinTransformer/Video-Swin-Transformer#pretrained-models"
    }
fi

# Check for pretrained checkpoints
VIDEOSWIN_CHECKPOINT="$VIDEOSWIN_DIR/swin_base_patch244_window877_kinetics400_22k.pth"
if [ ! -f "$VIDEOSWIN_CHECKPOINT" ]; then
    echo "⚠️  Video-Swin checkpoint not found at: $VIDEOSWIN_CHECKPOINT"
    echo "   Please download from: https://github.com/SwinTransformer/Video-Swin-Transformer#pretrained-models"
    echo "   Place it in: $VIDEOSWIN_DIR/"
fi

# TimeSformer
echo ""
echo "🔍 Checking for TimeSformer..."
TIMESFORMER_DIR="$MODELS_DIR/timesformer"

if [ ! -d "$TIMESFORMER_DIR" ]; then
    echo "📥 Cloning TimeSformer repository..."
    cd "$MODELS_DIR"
    git clone https://github.com/facebookresearch/TimeSformer.git timesformer || {
        echo "⚠️  Git clone failed. Please clone manually:"
        echo "   cd $MODELS_DIR"
        echo "   git clone https://github.com/facebookresearch/TimeSformer.git timesformer"
    }
fi

# Check for TimeSformer checkpoints
TIMESFORMER_CHECKPOINT="$TIMESFORMER_DIR/TimeSformer_divST_8x32_224_K400.pyth"
if [ ! -f "$TIMESFORMER_CHECKPOINT" ]; then
    echo "⚠️  TimeSformer checkpoint not found at: $TIMESFORMER_CHECKPOINT"
    echo "   Please download from: https://github.com/facebookresearch/TimeSformer#pretrained-models"
    echo "   Place it in: $TIMESFORMER_DIR/"
fi

# Convert to ONNX/TorchScript
echo ""
echo "🔄 Converting models to ONNX/TorchScript..."
cd "$PROJECT_ROOT"

if [ -f "$VIDEOSWIN_CHECKPOINT" ]; then
    echo "   Converting Video-Swin..."
    python models/export_onnx.py \
        --checkpoint "$VIDEOSWIN_CHECKPOINT" \
        --out "$MODELS_DIR/videoswin.onnx" \
        --model-type videoswin || echo "⚠️  Conversion failed. Check dependencies."
fi

if [ -f "$TIMESFORMER_CHECKPOINT" ]; then
    echo "   Converting TimeSformer..."
    python models/export_onnx.py \
        --checkpoint "$TIMESFORMER_CHECKPOINT" \
        --out "$MODELS_DIR/timesformer.onnx" \
        --model-type timesformer || echo "⚠️  Conversion failed. Check dependencies."
fi

# Create AVAILABLE_VIDEO_MODEL.txt
echo ""
echo "📝 Creating model registry..."
AVAILABLE_FILE="$MODELS_DIR/AVAILABLE_VIDEO_MODEL.txt"
> "$AVAILABLE_FILE"

if check_file "$MODELS_DIR/videoswin.onnx"; then
    echo "$MODELS_DIR/videoswin.onnx" >> "$AVAILABLE_FILE"
    echo "✅ Video-Swin ONNX model available"
elif check_file "$VIDEOSWIN_CHECKPOINT"; then
    echo "$VIDEOSWIN_CHECKPOINT" >> "$AVAILABLE_FILE"
    echo "✅ Video-Swin checkpoint available (needs conversion)"
fi

if check_file "$MODELS_DIR/timesformer.onnx"; then
    echo "$MODELS_DIR/timesformer.onnx" >> "$AVAILABLE_FILE"
    echo "✅ TimeSformer ONNX model available"
elif check_file "$TIMESFORMER_CHECKPOINT"; then
    echo "$TIMESFORMER_CHECKPOINT" >> "$AVAILABLE_FILE"
    echo "✅ TimeSformer checkpoint available (needs conversion)"
fi

echo ""
echo "✅ Model download script completed!"
echo "   Check $AVAILABLE_FILE for available models"
echo ""
echo "📚 Next steps:"
echo "   1. If models were downloaded, run: python models/export_onnx.py --checkpoint <path> --out <path.onnx>"
echo "   2. Update AVAILABLE_VIDEO_MODEL.txt with the path to your converted model"
echo "   3. Restart the backend server"
echo ""


