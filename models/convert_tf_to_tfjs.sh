#!/bin/bash
# Convert TensorFlow SavedModel to TensorFlow.js format
# Usage: ./convert_tf_to_tfjs.sh [input_model_path] [output_path]

INPUT_MODEL="${1:-./models/landmark_model/saved_model}"
OUTPUT_PATH="${2:-./apps/frontend/public/models/tfjs_landmark_model}"

echo "🔄 Converting TensorFlow model to TensorFlow.js..."
echo "   Input: $INPUT_MODEL"
echo "   Output: $OUTPUT_PATH"

# Check if tensorflowjs_converter is installed
if ! command -v tensorflowjs_converter &> /dev/null; then
    echo "❌ tensorflowjs_converter not found!"
    echo "   Install with: pip install tensorflowjs"
    exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_PATH"

# Convert model
tensorflowjs_converter \
    --input_format=tf_saved_model \
    --output_format=tfjs_graph_model \
    --signature_name=serving_default \
    --saved_model_tags=serve \
    "$INPUT_MODEL" \
    "$OUTPUT_PATH"

if [ $? -eq 0 ]; then
    echo "✅ Conversion successful!"
    echo "   Model files saved to: $OUTPUT_PATH"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Verify model.json exists in $OUTPUT_PATH"
    echo "   2. Check model size (should be < 10MB for browser)"
    echo "   3. Test loading in frontend: loadTFJSModel('$OUTPUT_PATH/model.json')"
else
    echo "❌ Conversion failed!"
    exit 1
fi

