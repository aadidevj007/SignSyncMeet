import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'

// ASR route: accepts audio chunk (base64 PCM/WAV or webm) and returns { text, lang, confidence }
// Backends: 'whisper' (local runner), 'vosk' (placeholder), 'openai' (cloud API)

const router = Router()

type AsrRequestBody = {
  audioBase64?: string
  audioMimeType?: string
  lang?: 'en' | 'ta' | 'ml' | 'te'
  meta?: Record<string, unknown>
}

router.post('/asr', authMiddleware, async (req, res) => {
  const body = req.body as AsrRequestBody
  const backend = process.env.ASR_BACKEND || 'whisper'
  const lang = body.lang || 'en'

  if (!body?.audioBase64) {
    return res.status(400).json({ error: 'audioBase64 required' })
  }

  try {
    if (backend === 'openai') {
      const key = process.env.WHISPER_API_KEY
      if (!key) {
        return res.status(500).json({ error: 'WHISPER_API_KEY missing' })
      }
      // Minimal example using REST fetch rather than SDK to avoid extra deps
      // Note: for production, switch to official SDK and multipart/form-data streaming
      const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`
        },
        body: (() => {
          const formData = new FormData()
          const bytes = Buffer.from(body.audioBase64!, 'base64')
          const file = new Blob([bytes], { type: body.audioMimeType || 'audio/webm' })
          formData.append('file', file, 'chunk.webm')
          formData.append('model', 'whisper-1')
          formData.append('language', lang)
          return formData
        })()
      } as any)

      if (!resp.ok) {
        const t = await resp.text()
        res.status(502).json({ error: 'OpenAI Whisper failed', details: t })
        return
      }
      const data = await resp.json() as any
      res.json({ text: data.text, lang, confidence: data.confidence ?? null, source: 'openai' })
    }

    if (backend === 'whisper') {
      // Check if WHISPER_LOCAL is set, otherwise use faster-whisper
      const useLocal = process.env.WHISPER_LOCAL === 'true' || process.env.WHISPER_LOCAL
      const whisperModel = process.env.WHISPER_MODEL || 'base'
      
      // Spawn a python subprocess that reads base64 from stdin and prints JSON { text, confidence }
      const { spawn } = await import('child_process')
      const path = await import('path')
      const scriptPath = path.join(__dirname, '../../scripts/run_asr_infer.py')
      
      const py = spawn('python', ['-u', scriptPath, '--lang', lang, '--model', whisperModel], {
        cwd: path.join(__dirname, '../..')
      })

      let out = ''
      let err = ''
      py.stdout.on('data', (d) => (out += d.toString()))
      py.stderr.on('data', (d) => (err += d.toString()))
      
      // Send JSON input via stdin
      py.stdin.write(JSON.stringify({ 
        audioBase64: body.audioBase64, 
        audioMimeType: body.audioMimeType || 'audio/webm'
      }))
      py.stdin.end()

      py.on('close', (code) => {
        if (code !== 0) {
          // Try OpenAI fallback if local fails and key is available
          if (process.env.WHISPER_API_KEY) {
            // Fallback logic would go here, but for now just return error
            return res.status(502).json({ 
              error: 'local whisper failed', 
              details: err,
              fallback: 'OpenAI API available - set ASR_BACKEND=openai to use'
            })
          }
          return res.status(502).json({ error: 'local whisper failed', details: err })
        }
        try {
          const obj = JSON.parse(out)
          return res.json({ 
            text: obj.text, 
            lang, 
            confidence: obj.confidence ?? null, 
            source: 'whisper-local' 
          })
        } catch (e) {
          return res.status(500).json({ error: 'Invalid JSON from local whisper', details: out })
        }
      })
      return
    }

    if (backend === 'vosk') {
      return res.status(501).json({ error: 'Vosk backend not implemented in this example' })
    }

    return res.status(400).json({ error: `Unsupported ASR_BACKEND: ${backend}` })
  } catch (e: any) {
    return res.status(500).json({ error: 'ASR error', details: e?.message || String(e) })
  }
})

export default router


