#!/usr/bin/env python3
"""
Minimal local Whisper runner example using faster-whisper.

Reads JSON from stdin: { audioBase64, mime, modelPath }
Prints JSON: { text, confidence }

Install: pip install faster-whisper soundfile
Note: This is an example. Adapt device, compute_type, and VAD as needed.
"""

import sys
import json
import base64
import io


def main() -> int:
    try:
        payload = json.loads(sys.stdin.read())
    except Exception as e:
        print(json.dumps({"error": f"invalid input: {e}"}))
        return 1

    audio_b64 = payload.get("audioBase64")
    model_path = payload.get("modelPath")
    if not audio_b64 or not model_path:
        print(json.dumps({"error": "audioBase64 and modelPath required"}))
        return 1

    try:
        import soundfile as sf
        from faster_whisper import WhisperModel
    except Exception as e:
        print(json.dumps({"error": f"missing deps: {e}"}))
        return 1

    audio_bytes = base64.b64decode(audio_b64)
    audio_io = io.BytesIO(audio_bytes)
    data, sr = sf.read(audio_io)

    # Load model
    model = WhisperModel(model_path, device="auto", compute_type="auto")
    segments, info = model.transcribe(data, language=payload.get("lang"))

    text = " ".join(s.text for s in segments)
    conf = getattr(info, 'avg_logprob', None)
    print(json.dumps({"text": text.strip(), "confidence": conf}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


