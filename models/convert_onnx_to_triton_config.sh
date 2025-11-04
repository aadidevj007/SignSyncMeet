#!/bin/bash
# Create Triton Inference Server model repository structure for ONNX model
# Usage: ./convert_onnx_to_triton_config.sh [onnx_model_path] [model_name] [triton_repo]

ONNX_MODEL="${1:-./models/videoswin.onnx}"
MODEL_NAME="${2:-videoswin}"
TRITON_REPO="${3:-./triton_models}"

MODEL_DIR="$TRITON_REPO/$MODEL_NAME/1"

echo "📦 Creating Triton model repository..."
echo "   Model: $MODEL_NAME"
echo "   ONNX file: $ONNX_MODEL"
echo "   Output: $MODEL_DIR"

# Create directory structure
mkdir -p "$MODEL_DIR"
mkdir -p "$TRITON_REPO/$MODEL_NAME"

# Copy ONNX model
cp "$ONNX_MODEL" "$MODEL_DIR/model.onnx"

# Create config.pbtxt
cat > "$TRITON_REPO/$MODEL_NAME/config.pbtxt" <<EOF
name: "$MODEL_NAME"
platform: "onnxruntime_onnx"
max_batch_size: 8
input [
  {
    name: "video"
    data_type: TYPE_FP32
    dims: [ 32, 3, 224, 224 ]
  }
]
output [
  {
    name: "logits"
    data_type: TYPE_FP32
    dims: [ 10 ]
  }
]
instance_group [
  {
    count: 1
    kind: KIND_GPU
  }
]
EOF

echo "✅ Triton model repository created!"
echo "   Structure:"
echo "   $TRITON_REPO/"
echo "   └── $MODEL_NAME/"
echo "       ├── config.pbtxt"
echo "       └── 1/"
echo "           └── model.onnx"
echo ""
echo "📋 Next steps:"
echo "   1. Start Triton server:"
echo "      docker run --gpus all -it --rm -p 8000:8000 -p 8001:8001 -p 8002:8002 \\"
echo "        -v $TRITON_REPO:/models \\"
echo "        nvcr.io/nvidia/tritonserver:latest \\"
echo "        tritonserver --model-repository=/models"
echo ""
echo "   2. Test inference (see server/inference/videoswin_client.py)"

