#!/usr/bin/env python3
"""
ASR Inference Runner
Transcribes audio chunks using faster-whisper (local) or OpenAI API (cloud)

Usage:
    python run_asr_infer.py --lang en --model base
    echo '{"audioBase64": "...", "audioMimeType": "audio/webm"}' | python run_asr_infer.py --lang en
"""

import json
import sys
import argparse
import base64
import tempfile
import os
from pathlib import Path

def transcribe_with_faster_whisper(audio_bytes: bytes, lang: str = 'en', model_size: str = 'base'):
    """Transcribe using faster-whisper (local)"""
    try:
        from faster_whisper import WhisperModel
        
        # Initialize model
        model = WhisperModel(model_size, device="cpu", compute_type="int8")
        
        # Save audio to temp file
        with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as f:
            f.write(audio_bytes)
            temp_path = f.name
        
        try:
            # Transcribe
            segments, info = model.transcribe(
                temp_path,
                language=lang,
                beam_size=5,
                vad_filter=True
            )
            
            # Concatenate all segments
            text_parts = []
            for segment in segments:
                text_parts.append(segment.text.strip())
            
            text = ' '.join(text_parts).strip()
            
            # Estimate confidence (faster-whisper doesn't provide per-segment confidence)
            # Use average log probability if available
            confidence = 0.85  # Default confidence
            
            return {
                'text': text,
                'lang': lang,
                'confidence': confidence,
                'model': f'faster-whisper-{model_size}'
            }
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
                
    except ImportError:
        print(json.dumps({
            'error': 'faster-whisper not installed. Install with: pip install faster-whisper'
        }), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({
            'error': f'Transcription failed: {str(e)}'
        }), file=sys.stderr)
        sys.exit(1)

def transcribe_with_openai(audio_bytes: bytes, lang: str = 'en', api_key: str = None):
    """Transcribe using OpenAI API (cloud)"""
    try:
        import requests
        
        if not api_key:
            api_key = os.getenv('WHISPER_API_KEY')
            if not api_key:
                raise ValueError('WHISPER_API_KEY not set')
        
        # Save audio to temp file
        with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as f:
            f.write(audio_bytes)
            temp_path = f.name
        
        try:
            # Upload to OpenAI API
            with open(temp_path, 'rb') as audio_file:
                response = requests.post(
                    'https://api.openai.com/v1/audio/transcriptions',
                    headers={
                        'Authorization': f'Bearer {api_key}'
                    },
                    files={
                        'file': ('audio.webm', audio_file, 'audio/webm')
                    },
                    data={
                        'model': 'whisper-1',
                        'language': lang
                    },
                    timeout=30
                )
            
            if response.status_code != 200:
                raise Exception(f'OpenAI API error: {response.status_code} - {response.text}')
            
            result = response.json()
            
            return {
                'text': result.get('text', ''),
                'lang': lang,
                'confidence': 0.95,  # OpenAI doesn't provide confidence
                'model': 'openai-whisper-1'
            }
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)
                
    except ImportError:
        print(json.dumps({
            'error': 'requests not installed. Install with: pip install requests'
        }), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({
            'error': f'OpenAI transcription failed: {str(e)}'
        }), file=sys.stderr)
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description='ASR Inference Runner')
    parser.add_argument('--lang', type=str, default='en', choices=['en', 'ta', 'ml', 'te'],
                        help='Language code')
    parser.add_argument('--model', type=str, default='base',
                        choices=['tiny', 'base', 'small', 'medium', 'large'],
                        help='Whisper model size (for faster-whisper)')
    parser.add_argument('--backend', type=str, default='whisper',
                        choices=['whisper', 'openai'],
                        help='ASR backend')
    
    args = parser.parse_args()
    
    # Read JSON input from stdin
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(json.dumps({
            'error': f'Invalid JSON input: {str(e)}'
        }), file=sys.stderr)
        sys.exit(1)
    
    audio_base64 = input_data.get('audioBase64')
    if not audio_base64:
        print(json.dumps({
            'error': 'audioBase64 required'
        }), file=sys.stderr)
        sys.exit(1)
    
    # Decode base64 audio
    try:
        audio_bytes = base64.b64decode(audio_base64)
    except Exception as e:
        print(json.dumps({
            'error': f'Failed to decode audio: {str(e)}'
        }), file=sys.stderr)
        sys.exit(1)
    
    # Transcribe based on backend
    if args.backend == 'openai' or os.getenv('ASR_BACKEND') == 'openai':
        result = transcribe_with_openai(audio_bytes, args.lang)
    else:
        result = transcribe_with_faster_whisper(audio_bytes, args.lang, args.model)
    
    # Output result as JSON
    print(json.dumps(result))
    sys.exit(0)

if __name__ == '__main__':
    main()
