/**
 * TTS proxy routes - forwards requests to Agnes AI API
 */
import { Router, type Request, type Response } from 'express'

const router = Router()
const AGNES_BASE = 'https://apihub.agnes-ai.com'

// GET /api/models - list available models
router.get('/models', async (req: Request, res: Response): Promise<void> => {
  const apiKey = req.headers.authorization?.replace('Bearer ', '')
  if (!apiKey) {
    res.status(401).json({ success: false, error: 'Missing API key' })
    return
  }

  try {
    const res2 = await fetch(`${AGNES_BASE}/v1/models`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    const data = await res2.json()
    res.status(res2.status).json(data)
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

// POST /api/audio/speech - text to speech
router.post('/audio/speech', async (req: Request, res: Response): Promise<void> => {
  const apiKey = req.headers.authorization?.replace('Bearer ', '')
  if (!apiKey) {
    res.status(401).json({ success: false, error: 'Missing API key' })
    return
  }

  try {
    console.log('[TTS] Request body:', JSON.stringify(req.body).slice(0, 200))
    const res2 = await fetch(`${AGNES_BASE}/v1/audio/speech`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    })

    console.log('[TTS] Response status:', res2.status, 'content-type:', res2.headers.get('content-type'))

    if (!res2.ok) {
      const ct = res2.headers.get('content-type') || ''
      let errorText = ''
      try {
        if (ct.includes('json')) {
          errorText = await res2.text()
        }
      } catch {}
      console.error('[TTS] Error response:', errorText)
      res.status(res2.status).json({ success: false, error: errorText || `HTTP ${res2.status}` })
      return
    }

    const contentType = res2.headers.get('content-type') || 'audio/mpeg'
    const buffer = Buffer.from(await res2.arrayBuffer())
    res.setHeader('Content-Type', contentType)
    res.send(buffer)
  } catch (err) {
    console.error('[TTS] Exception:', err)
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

// POST /api/videos - create video generation task
router.post('/videos', async (req: Request, res: Response): Promise<void> => {
  const apiKey = req.headers.authorization?.replace('Bearer ', '')
  if (!apiKey) {
    res.status(401).json({ success: false, error: 'Missing API key' })
    return
  }

  try {
    const res2 = await fetch(`${AGNES_BASE}/v1/videos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    })

    const data = await res2.json()
    res.status(res2.status).json(data)
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

// GET /api/agnes/video/:videoId - poll video generation status
router.get('/agnes/video/:videoId', async (req: Request, res: Response): Promise<void> => {
  const apiKey = req.headers.authorization?.replace('Bearer ', '')
  if (!apiKey) {
    res.status(401).json({ success: false, error: 'Missing API key' })
    return
  }

  const { videoId } = req.params

  try {
    const res2 = await fetch(
      `${AGNES_BASE}/agnesapi?video_id=${encodeURIComponent(videoId)}`,
      { headers: { 'Authorization': `Bearer ${apiKey}` } }
    )
    const data = await res2.json()
    res.status(res2.status).json(data)
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

// POST /api/audio/transcribe - transcribe audio to Chinese text via ElevenLabs Whisper
router.post('/audio/transcribe', async (req: Request, res: Response): Promise<void> => {
  const config = req.body as { apiKey: string; file: string }
  if (!config.apiKey || !config.file) {
    res.status(400).json({ success: false, error: '需要 API Key 和音频文件' })
    return
  }

  try {
    const buffer = Buffer.from(config.file, 'base64')
    const boundary = `----FormBoundary${Date.now()}`

    const body = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="audio.webm"',
      'Content-Type: audio/webm',
      '',
      buffer.toString('binary'),
      `--${boundary}`,
      'Content-Disposition: form-data; name="model"',
      '',
      'whisper-1',
      `--${boundary}`,
      'Content-Disposition: form-data; name="language"',
      '',
      'zh',
      `--${boundary}--`,
    ].join('\r\n')

    const res2 = await fetch('https://api.elevenlabs.io/v1/stt', {
      method: 'POST',
      headers: {
        'xi-api-key': config.apiKey,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
    })

    if (!res2.ok) {
      const errText = await res2.text().catch(() => '')
      res.status(res2.status).json({ success: false, error: errText })
      return
    }

    const data = await res2.json()
    const text = (data.text as string) || ''
    res.json({ success: true, text })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

export default router
