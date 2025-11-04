/**
 * Template matching utilities for sign language recognition
 * Implements DTW (Dynamic Time Warping) for sentence matching
 * and static distance matching for alphabet recognition
 */

export interface AlphabetTemplate {
  landmark: number[]
  notes?: string
}

export interface SentenceTemplate {
  text: string
  sequence: number[][]
  notes?: string
}

export interface MatchResult {
  label: string
  confidence: number
  distance: number
  source: 'template' | 'tfjs' | 'server'
}

// Configuration thresholds (tunable)
const ALPHABET_THRESHOLD = 0.15  // Normalized distance threshold for alphabet
const SENTENCE_THRESHOLD = 0.25  // Normalized distance threshold for sentence
const ALPHABET_STABILITY_FRAMES = 5  // Frames to hold before emitting
const SENTENCE_MIN_FRAMES = 8  // Minimum frames for sentence detection
const SENTENCE_MAX_FRAMES = 48  // Maximum window size
const CONFIDENCE_SCALE = 2.0  // Scale factor for confidence calculation

/**
 * Normalize landmarks to signer-centered coordinates
 * Translates by wrist position and scales by hand bounding box
 */
export function normalizeLandmarks(rawLandmarks: number[]): number[] {
  if (rawLandmarks.length !== 126) {
    console.warn(`Expected 126 landmarks, got ${rawLandmarks.length}`)
    return rawLandmarks
  }

  const normalized = [...rawLandmarks]

  // Normalize each hand separately
  for (let hand = 0; hand < 2; hand++) {
    const handOffset = hand * 63  // 21 landmarks × 3 coordinates
    
    // Find wrist position (landmark 0)
    const wristX = rawLandmarks[handOffset]
    const wristY = rawLandmarks[handOffset + 1]
    const wristZ = rawLandmarks[handOffset + 2]

    // Find bounding box of hand
    let minX = wristX, maxX = wristX
    let minY = wristY, maxY = wristY
    let minZ = wristZ, maxZ = wristZ

    for (let i = 0; i < 21; i++) {
      const idx = handOffset + i * 3
      const x = rawLandmarks[idx]
      const y = rawLandmarks[idx + 1]
      const z = rawLandmarks[idx + 2]

      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
      minZ = Math.min(minZ, z)
      maxZ = Math.max(maxZ, z)
    }

    // Scale factors
    const scaleX = maxX !== minX ? 1 / (maxX - minX) : 1
    const scaleY = maxY !== minY ? 1 / (maxY - minY) : 1
    const scaleZ = maxZ !== minZ ? 1 / (maxZ - minZ) : 1
    const scale = Math.max(scaleX, scaleY, scaleZ)

    // Normalize: translate by wrist, scale by bbox
    for (let i = 0; i < 21; i++) {
      const idx = handOffset + i * 3
      normalized[idx] = (rawLandmarks[idx] - wristX) * scale + 0.5
      normalized[idx + 1] = (rawLandmarks[idx + 1] - wristY) * scale + 0.5
      normalized[idx + 2] = (rawLandmarks[idx + 2] - wristZ) * scale + 0.5
    }
  }

  return normalized
}

/**
 * Compute cosine distance between two landmark vectors
 */
export function cosineDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    return 1.0  // Maximum distance
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  if (denominator === 0) return 1.0

  const cosine = dotProduct / denominator
  return 1 - cosine  // Convert to distance
}

/**
 * Compute Euclidean distance between two landmark vectors
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    return Infinity
  }

  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i]
    sum += diff * diff
  }

  return Math.sqrt(sum)
}

/**
 * Match alphabet against templates using static distance matching
 */
export function matchAlphabet(
  normalizedLandmarks: number[],
  alphabetTemplates: Record<string, AlphabetTemplate>
): MatchResult | null {
  let bestMatch: MatchResult | null = null
  let bestDistance = Infinity

  for (const [letter, template] of Object.entries(alphabetTemplates)) {
    const distance = cosineDistance(normalizedLandmarks, template.landmark)
    
    if (distance < bestDistance) {
      bestDistance = distance
      bestMatch = {
        label: letter,
        confidence: Math.max(0, 1 - distance * CONFIDENCE_SCALE),
        distance,
        source: 'template'
      }
    }
  }

  // Only return match if distance is below threshold
  if (bestMatch && bestDistance < ALPHABET_THRESHOLD) {
    return bestMatch
  }

  return null
}

/**
 * Dynamic Time Warping (DTW) algorithm for sequence matching
 * Returns normalized distance between two sequences
 */
export function dtwDistance(sequence1: number[][], sequence2: number[][]): number {
  const n = sequence1.length
  const m = sequence2.length

  if (n === 0 || m === 0) {
    return Infinity
  }

  // Initialize DP table
  const dp: number[][] = Array(n + 1).fill(null).map(() => Array(m + 1).fill(Infinity))
  dp[0][0] = 0

  // Fill DP table
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = euclideanDistance(sequence1[i - 1], sequence2[j - 1])
      dp[i][j] = cost + Math.min(
        dp[i - 1][j],      // Insertion
        dp[i][j - 1],      // Deletion
        dp[i - 1][j - 1]   // Match
      )
    }
  }

  // Normalize by path length
  const pathLength = Math.max(n, m)
  return dp[n][m] / pathLength
}

/**
 * Match sentence using sliding window DTW matching
 */
export function matchSentence(
  landmarkSequence: number[][],
  sentenceTemplates: Record<string, SentenceTemplate>
): MatchResult | null {
  if (landmarkSequence.length < SENTENCE_MIN_FRAMES) {
    return null
  }

  // Use sliding window of appropriate size
  const windowSize = Math.min(landmarkSequence.length, SENTENCE_MAX_FRAMES)
  const window = landmarkSequence.slice(-windowSize)

  let bestMatch: MatchResult | null = null
  let bestDistance = Infinity

  for (const [id, template] of Object.entries(sentenceTemplates)) {
    const distance = dtwDistance(window, template.sequence)
    
    if (distance < bestDistance) {
      bestDistance = distance
      bestMatch = {
        label: template.text,
        confidence: Math.max(0, 1 - distance * CONFIDENCE_SCALE),
        distance,
        source: 'template'
      }
    }
  }

  // Only return match if distance is below threshold
  if (bestMatch && bestDistance < SENTENCE_THRESHOLD) {
    return bestMatch
  }

  return null
}

/**
 * Detect if sequence shows movement (unstable)
 * Used to distinguish between static alphabet and dynamic sentence
 */
export function hasMovement(landmarkSequence: number[][], threshold: number = 0.05): boolean {
  if (landmarkSequence.length < 2) {
    return false
  }

  // Compute average frame-to-frame distance
  let totalDistance = 0
  for (let i = 1; i < landmarkSequence.length; i++) {
    totalDistance += euclideanDistance(landmarkSequence[i - 1], landmarkSequence[i])
  }

  const avgDistance = totalDistance / (landmarkSequence.length - 1)
  return avgDistance > threshold
}

/**
 * Load alphabet templates from JSON
 */
export async function loadAlphabetTemplates(): Promise<Record<string, AlphabetTemplate>> {
  try {
    const response = await fetch('/models/templates/alphabets.json')
    if (!response.ok) {
      throw new Error(`Failed to load alphabets: ${response.statusText}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Error loading alphabet templates:', error)
    return {}
  }
}

/**
 * Load sentence templates from JSON
 */
export async function loadSentenceTemplates(): Promise<Record<string, SentenceTemplate>> {
  try {
    const response = await fetch('/models/templates/sentences.json')
    if (!response.ok) {
      throw new Error(`Failed to load sentences: ${response.statusText}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Error loading sentence templates:', error)
    return {}
  }
}

// Export configuration for external tuning
export const TemplateMatchingConfig = {
  ALPHABET_THRESHOLD,
  SENTENCE_THRESHOLD,
  ALPHABET_STABILITY_FRAMES,
  SENTENCE_MIN_FRAMES,
  SENTENCE_MAX_FRAMES,
  CONFIDENCE_SCALE
}

