/**
 * Unit tests for sign language template matching
 * Tests DTW algorithm, alphabet matching, and normalization
 */

import {
  normalizeLandmarks,
  cosineDistance,
  euclideanDistance,
  matchAlphabet,
  matchSentence,
  dtwDistance,
  hasMovement,
  AlphabetTemplate,
  SentenceTemplate
} from '@/lib/templateMatching'

describe('Landmark Normalization', () => {
  it('should normalize landmarks to 126 features', () => {
    const rawLandmarks = new Array(126).fill(0.5)
    const normalized = normalizeLandmarks(rawLandmarks)
    
    expect(normalized.length).toBe(126)
    expect(normalized.every(v => typeof v === 'number')).toBe(true)
  })

  it('should handle empty input', () => {
    const normalized = normalizeLandmarks([])
    expect(normalized.length).toBe(126)
  })
})

describe('Distance Functions', () => {
  const vec1 = [1, 2, 3, 4, 5]
  const vec2 = [2, 3, 4, 5, 6]
  
  it('should compute cosine distance', () => {
    const distance = cosineDistance(vec1, vec2)
    expect(distance).toBeGreaterThanOrEqual(0)
    expect(distance).toBeLessThanOrEqual(1)
  })

  it('should compute Euclidean distance', () => {
    const distance = euclideanDistance(vec1, vec2)
    expect(distance).toBeGreaterThan(0)
    expect(distance).toBeCloseTo(Math.sqrt(5), 1) // sqrt(1²+1²+1²+1²+1²)
  })

  it('should return 1.0 for cosine distance of orthogonal vectors', () => {
    const vec1 = [1, 0, 0]
    const vec2 = [0, 1, 0]
    const distance = cosineDistance(vec1, vec2)
    expect(distance).toBeCloseTo(1.0, 1)
  })
})

describe('Alphabet Matching', () => {
  const templates: Record<string, AlphabetTemplate> = {
    'A': {
      landmark: new Array(126).fill(0.5).map((v, i) => v + i * 0.001),
      notes: 'Template A'
    },
    'B': {
      landmark: new Array(126).fill(0.6).map((v, i) => v + i * 0.001),
      notes: 'Template B'
    }
  }

  it('should match alphabet when distance is below threshold', () => {
    // Create input similar to template A
    const input = new Array(126).fill(0.5).map((v, i) => v + i * 0.001)
    
    const match = matchAlphabet(input, templates)
    expect(match).not.toBeNull()
    expect(match?.label).toBe('A')
    expect(match?.confidence).toBeGreaterThan(0)
    expect(match?.source).toBe('template')
  })

  it('should return null when distance exceeds threshold', () => {
    // Create input very different from templates
    const input = new Array(126).fill(0.9)
    
    const match = matchAlphabet(input, templates)
    expect(match).toBeNull()
  })

  it('should handle empty templates', () => {
    const input = new Array(126).fill(0.5)
    const match = matchAlphabet(input, {})
    expect(match).toBeNull()
  })
})

describe('DTW Algorithm', () => {
  const sequence1 = [
    [1, 2, 3],
    [2, 3, 4],
    [3, 4, 5]
  ]
  
  const sequence2 = [
    [1.1, 2.1, 3.1],
    [2.1, 3.1, 4.1],
    [3.1, 4.1, 5.1]
  ]

  it('should compute DTW distance for similar sequences', () => {
    const distance = dtwDistance(sequence1, sequence2)
    expect(distance).toBeGreaterThanOrEqual(0)
    expect(distance).toBeLessThan(1.0) // Should be small for similar sequences
  })

  it('should return Infinity for empty sequences', () => {
    const distance = dtwDistance([], [])
    expect(distance).toBe(Infinity)
  })

  it('should handle different length sequences', () => {
    const short = [[1, 2], [3, 4]]
    const long = [[1, 2], [3, 4], [5, 6], [7, 8]]
    
    const distance = dtwDistance(short, long)
    expect(distance).toBeGreaterThanOrEqual(0)
    expect(distance).not.toBe(Infinity)
  })
})

describe('Sentence Matching', () => {
  const templates: Record<string, SentenceTemplate> = {
    'sentence_01': {
      text: 'Hello everyone',
      sequence: [
        new Array(126).fill(0.5),
        new Array(126).fill(0.6),
        new Array(126).fill(0.7)
      ],
      notes: 'Test sentence'
    }
  }

  it('should match sentence when DTW distance is below threshold', () => {
    // Create input sequence similar to template
    const input = [
      new Array(126).fill(0.5),
      new Array(126).fill(0.6),
      new Array(126).fill(0.7)
    ]
    
    const match = matchSentence(input, templates)
    expect(match).not.toBeNull()
    expect(match?.label).toBe('Hello everyone')
    expect(match?.confidence).toBeGreaterThan(0)
  })

  it('should return null for very short sequences', () => {
    const input = [new Array(126).fill(0.5)]
    const match = matchSentence(input, templates)
    expect(match).toBeNull()
  })

  it('should return null when distance exceeds threshold', () => {
    // Create very different sequence
    const input = Array(10).fill(null).map(() => new Array(126).fill(0.9))
    const match = matchSentence(input, templates)
    expect(match).toBeNull()
  })
})

describe('Movement Detection', () => {
  it('should detect movement in changing sequence', () => {
    const sequence = [
      new Array(126).fill(0.5),
      new Array(126).fill(0.6),
      new Array(126).fill(0.7),
      new Array(126).fill(0.8)
    ]
    
    const hasMovementResult = hasMovement(sequence, 0.05)
    expect(hasMovementResult).toBe(true)
  })

  it('should not detect movement in static sequence', () => {
    const sequence = Array(5).fill(null).map(() => new Array(126).fill(0.5))
    
    const hasMovementResult = hasMovement(sequence, 0.05)
    expect(hasMovementResult).toBe(false)
  })

  it('should handle single frame', () => {
    const sequence = [new Array(126).fill(0.5)]
    const hasMovementResult = hasMovement(sequence, 0.05)
    expect(hasMovementResult).toBe(false)
  })
})

