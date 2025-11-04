### ASR backends

The backend route `/api/asr` supports local Whisper or cloud API. Languages supported: `en`, `ta`, `ml`, `te`.

- Local: use `faster-whisper` via a small Python runner (recommended GPU with >=6GB VRAM; FP16 supported)
- Cloud: OpenAI Whisper API (requires `WHISPER_API_KEY`)

Set these environment variables:

```
ASR_BACKEND=whisper|vosk|openai
WHISPER_LOCAL=/path/to/faster-whisper-model  # for local
WHISPER_API_KEY=sk-...                        # for cloud
```

### Local setup example

```bash
pip install faster-whisper soundfile
```

The backend will spawn a Python process to transcribe chunks if `ASR_BACKEND=whisper` and `WHISPER_LOCAL` is set.

### Cloud setup example

```bash
export ASR_BACKEND=openai
export WHISPER_API_KEY=... 
```

### Performance tips

- Use FP16 on supported GPUs
- Batch chunks for throughput
- For long-form meetings, prefer chunked streaming and incremental decoding


