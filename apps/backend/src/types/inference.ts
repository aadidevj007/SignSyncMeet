export interface InferenceRequest {
  clipBase64: string
  landmarks?: number[][]
  meta?: {
    timestamp: number
    meetingId?: string
    localLabel?: string
    localConfidence?: number
    consent?: boolean
  }
}

export interface InferenceResult {
  label: string
  confidence: number
  model: string
  details?: Record<string, any>
}

export interface InferenceRequestRecord {
  userId: string
  clipId: string
  clipPath: string
  timestamp: Date
  meetingId?: string | null
  localLabel?: string | null
  localConfidence?: number | null
  status: 'processing' | 'completed' | 'failed'
  label?: string
  confidence?: number
  model?: string
  completedAt?: Date
  error?: string
}

