#!/usr/bin/env python3
"""
Client to call Triton Inference Server or TorchServe for Video-Swin inference
"""

import argparse
import json
import requests
import base64
import numpy as np
from typing import Dict, Any, Optional
import sys
import grpc
import tritonclient.http as httpclient
from tritonclient.utils import InferenceServerException

# Optional: For gRPC client
try:
    import tritonclient.grpc as grpcclient
    GRPC_AVAILABLE = True
except ImportError:
    GRPC_AVAILABLE = False

def call_triton_rest(
    url: str,
    clip_path: str,
    model_name: str = "videoswin",
    protocol_version: str = "v2"
) -> Dict[str, Any]:
    """
    Call Triton Inference Server via REST API
    
    Args:
        url: Triton server URL (e.g., http://localhost:8000)
        clip_path: Path to video clip file
        model_name: Model name in Triton model repository
        protocol_version: Protocol version (v2)
    
    Returns:
        Inference result with label and confidence
    """
    try:
        with open(clip_path, 'rb') as f:
            clip_data = base64.b64encode(f.read()).decode('utf-8')
        
        payload = {
            "inputs": [
                {
                    "name": "VIDEO",
                    "shape": [1],
                    "datatype": "BYTES",
                    "data": [clip_data]
                }
            ],
            "outputs": [
                {"name": "LABEL"},
                {"name": "CONFIDENCE"}
            ]
        }
        
        response = requests.post(
            f"{url}/v2/models/{model_name}/infer",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        response.raise_for_status()
        result = response.json()
        
        # Extract outputs
        outputs = result.get("outputs", [])
        label_data = next((o for o in outputs if o["name"] == "LABEL"), None)
        conf_data = next((o for o in outputs if o["name"] == "CONFIDENCE"), None)
        
        if not label_data or not conf_data:
            raise ValueError("Missing outputs from Triton")
        
        label = label_data["data"][0]
        confidence = float(conf_data["data"][0])
        
        return {
            "label": label,
            "confidence": confidence,
            "model": "videoswin-triton",
            "details": result
        }
    
    except Exception as e:
        raise RuntimeError(f"Triton REST inference failed: {e}")


def call_triton_grpc(
    url: str,
    clip_path: str,
    model_name: str = "videoswin"
) -> Dict[str, Any]:
    """
    Call Triton Inference Server via gRPC (more efficient)
    
    Args:
        url: Triton server URL (host:port, e.g., localhost:8001)
        clip_path: Path to video clip file
        model_name: Model name in Triton model repository
    
    Returns:
        Inference result
    """
    if not GRPC_AVAILABLE:
        raise RuntimeError("gRPC client not available. Install tritonclient[grpc]")
    
    try:
        triton_client = grpcclient.InferenceServerClient(url=url)
        
        with open(clip_path, 'rb') as f:
            clip_data = f.read()
        
        inputs = []
        inputs.append(grpcclient.InferInput("VIDEO", [1], "BYTES"))
        inputs[0].set_data_from_numpy(np.array([clip_data], dtype=object))
        
        outputs = []
        outputs.append(grpcclient.InferRequestedOutput("LABEL"))
        outputs.append(grpcclient.InferRequestedOutput("CONFIDENCE"))
        
        result = triton_client.infer(model_name, inputs, outputs=outputs)
        
        label = result.as_numpy("LABEL")[0].decode('utf-8')
        confidence = float(result.as_numpy("CONFIDENCE")[0])
        
        return {
            "label": label,
            "confidence": confidence,
            "model": "videoswin-triton-grpc",
            "details": {}
        }
    
    except Exception as e:
        raise RuntimeError(f"Triton gRPC inference failed: {e}")


def call_torchserve(
        url: str,
    clip_path: str,
    model_name: str = "videoswin"
) -> Dict[str, Any]:
    """
    Call TorchServe REST API
    
    Args:
        url: TorchServe URL (e.g., http://localhost:8080)
        clip_path: Path to video clip file
        model_name: Model name (versioned: model_name/version)
    
    Returns:
        Inference result
    """
    try:
        with open(clip_path, 'rb') as f:
            clip_data = base64.b64encode(f.read()).decode('utf-8')
        
        response = requests.post(
            f"{url}/predictions/{model_name}",
            json={"clip": clip_data},
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        response.raise_for_status()
        result = response.json()
        
        return {
            "label": result.get("label", "unknown"),
            "confidence": float(result.get("confidence", 0.0)),
            "model": "videoswin-torchserve",
            "details": result
        }
    
    except Exception as e:
        raise RuntimeError(f"TorchServe inference failed: {e}")


def main():
    parser = argparse.ArgumentParser(description='Call inference server')
    parser.add_argument('--clip', required=True, help='Path to video clip')
    parser.add_argument('--server', choices=['triton-rest', 'triton-grpc', 'torchserve'], default='triton-rest')
    parser.add_argument('--url', default='http://localhost:8000', help='Server URL')
    parser.add_argument('--model', default='videoswin', help='Model name')
    
    args = parser.parse_args()
    
    try:
        if args.server == 'triton-rest':
            result = call_triton_rest(args.url, args.clip, args.model)
        elif args.server == 'triton-grpc':
            result = call_triton_grpc(args.url, args.clip, args.model)
        elif args.server == 'torchserve':
            result = call_torchserve(args.url, args.clip, args.model)
        
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "label": "unknown",
            "confidence": 0.0
        }), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()

