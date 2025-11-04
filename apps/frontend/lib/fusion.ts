/**
 * Fusion logic for combining local (TFJS), server (Video-Swin), and ASR predictions
 * Supports multimodal fusion (sign + voice)
 */

export interface PredictionResult {
  label: string
  confidence: number
  model?: string
  source?: 'local' | 'server' | 'asr'
}

export interface FusionOptions {
  localThreshold?: number
  serverThreshold?: number
  confidenceMargin?: number
  preferSignForSigners?: boolean
  preferASRForSpeech?: boolean
}

const DEFAULT_OPTIONS: Required<FusionOptions> = {
  localThreshold: 0.90,
  serverThreshold: 0.80,
  confidenceMargin: 0.15,
  preferSignForSigners: true,
  preferASRForSpeech: true
}

/**
 * Fuse local and server sign predictions
 * Rules:
 * - Accept local if conf >= 0.90
 * - Else accept server if serverConf >= localConf + 0.15 or serverConf >= 0.80
 * - Otherwise use local
 */
export function fusePredictions(
  local: PredictionResult,
  server: PredictionResult | null,
  options: FusionOptions = {}
): PredictionResult {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // If no server result, return local
  if (!server) {
    return {
      ...local,
      source: 'local'
    }
  }

  // High confidence local prediction - trust it (fast path)
  if (local.confidence >= opts.localThreshold) {
    return {
      label: local.label,
      confidence: local.confidence,
      model: 'local',
      source: 'local'
    }
  }

  // Server has high confidence
  if (server.confidence >= opts.serverThreshold) {
    return {
      label: server.label,
      confidence: server.confidence,
      model: server.model || 'server',
      source: 'server'
    }
  }

  // Server is significantly better than local
  const confidenceDiff = server.confidence - local.confidence
  if (confidenceDiff >= opts.confidenceMargin) {
    return {
      label: server.label,
      confidence: server.confidence,
      model: server.model || 'server',
      source: 'server'
    }
  }

  // Default: trust local
  return {
    label: local.label,
    confidence: local.confidence,
    model: 'local',
    source: 'local'
  }
}

/**
 * Multimodal fusion: combine sign and voice predictions
 * Strategy:
 * - If sign confidence is high (>= 0.85) and user is signing: prefer sign
 * - If ASR confidence is high (>= 0.85) and audio is speech: prefer ASR
 * - Otherwise: combine both if labels match, or use higher confidence
 */
export function fuseMultimodal(
  signCaption: PredictionResult | null,
  asrCaption: PredictionResult | null,
  options: FusionOptions = {}
): PredictionResult | null {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // No captions
  if (!signCaption && !asrCaption) {
    return null
  }

  // Only sign
  if (signCaption && !asrCaption) {
    return { ...signCaption, source: 'local' }
  }

  // Only ASR
  if (!signCaption && asrCaption) {
    return { ...asrCaption, source: 'asr' }
  }

  // Both available - fuse them
  const sign = signCaption!
  const asr = asrCaption!

  // High confidence sign - prefer it for signers
  if (opts.preferSignForSigners && sign.confidence >= 0.85) {
    return {
      label: sign.label,
      confidence: Math.min(sign.confidence + 0.05, 1.0), // Slight boost
      model: sign.model || 'multimodal-sign',
      source: 'local'
    }
  }

  // High confidence ASR - prefer it for speech
  if (opts.preferASRForSpeech && asr.confidence >= 0.85) {
    return {
      label: asr.label,
      confidence: Math.min(asr.confidence + 0.05, 1.0), // Slight boost
      model: asr.model || 'multimodal-asr',
      source: 'asr'
    }
  }

  // Labels match - combine confidences
  if (sign.label.toLowerCase() === asr.label.toLowerCase()) {
    const fusedConf = Math.min(
      (sign.confidence * 0.6) + (asr.confidence * 0.4),
      1.0
    )
    return {
      label: sign.label,
      confidence: fusedConf,
      model: 'multimodal-fused',
      source: 'asr' // Prefer ASR source for fused
    }
  }

  // Labels don't match - use higher confidence
  return sign.confidence >= asr.confidence ? sign : asr
}

/**
 * Check if server inference is needed based on local confidence
 */
export function shouldUseServer(
  localConfidence: number,
  options: FusionOptions = {}
): boolean {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  return localConfidence < opts.localThreshold
}

/**
 * Calculate weighted average of predictions (alternative fusion method)
 */
export function weightedFusion(
  local: PredictionResult,
  server: PredictionResult,
  localWeight: number = 0.3,
  serverWeight: number = 0.7
): PredictionResult {
  // Only fuse if labels match
  if (local.label === server.label) {
    const fusedConfidence = 
      (local.confidence * localWeight) + 
      (server.confidence * serverWeight)
    
    return {
      label: local.label,
      confidence: Math.min(fusedConfidence, 1.0),
      model: 'fused',
      source: 'server'
    }
  }

  // Labels don't match - use higher confidence
  return local.confidence >= server.confidence ? local : server
}

