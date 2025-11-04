/**
 * Unit tests for fusion logic
 */

import { 
  fusePredictions, 
  fuseMultimodal, 
  shouldUseServer,
  PredictionResult 
} from '../fusion'

describe('Fusion Logic', () => {
  describe('fusePredictions', () => {
    it('should accept local prediction if confidence >= 0.90', () => {
      const local: PredictionResult = {
        label: 'Hello',
        confidence: 0.95,
        source: 'local'
      }
      const server: PredictionResult = {
        label: 'Thank You',
        confidence: 0.85,
        source: 'server'
      }

      const result = fusePredictions(local, server)
      
      expect(result.label).toBe('Hello')
      expect(result.confidence).toBe(0.95)
      expect(result.source).toBe('local')
    })

    it('should accept server prediction if server confidence >= 0.80', () => {
      const local: PredictionResult = {
        label: 'Hello',
        confidence: 0.75,
        source: 'local'
      }
      const server: PredictionResult = {
        label: 'Thank You',
        confidence: 0.85,
        source: 'server'
      }

      const result = fusePredictions(local, server)
      
      expect(result.label).toBe('Thank You')
      expect(result.confidence).toBe(0.85)
      expect(result.source).toBe('server')
    })

    it('should accept server if confidence diff >= 0.15', () => {
      const local: PredictionResult = {
        label: 'Hello',
        confidence: 0.70,
        source: 'local'
      }
      const server: PredictionResult = {
        label: 'Thank You',
        confidence: 0.88,
        source: 'server'
      }

      const result = fusePredictions(local, server)
      
      expect(result.label).toBe('Thank You')
      expect(result.confidence).toBe(0.88)
      expect(result.source).toBe('server')
    })

    it('should return local if no server result', () => {
      const local: PredictionResult = {
        label: 'Hello',
        confidence: 0.80,
        source: 'local'
      }

      const result = fusePredictions(local, null)
      
      expect(result.label).toBe('Hello')
      expect(result.confidence).toBe(0.80)
      expect(result.source).toBe('local')
    })

    it('should default to local if neither condition is met', () => {
      const local: PredictionResult = {
        label: 'Hello',
        confidence: 0.82,
        source: 'local'
      }
      const server: PredictionResult = {
        label: 'Thank You',
        confidence: 0.85,
        source: 'server'
      }

      const result = fusePredictions(local, server)
      
      expect(result.label).toBe('Hello')
      expect(result.confidence).toBe(0.82)
      expect(result.source).toBe('local')
    })
  })

  describe('fuseMultimodal', () => {
    it('should return null if no captions', () => {
      const result = fuseMultimodal(null, null)
      expect(result).toBeNull()
    })

    it('should return sign caption if only sign available', () => {
      const sign: PredictionResult = {
        label: 'Hello',
        confidence: 0.80,
        source: 'local'
      }

      const result = fuseMultimodal(sign, null)
      
      expect(result).not.toBeNull()
      expect(result!.label).toBe('Hello')
      expect(result!.source).toBe('local')
    })

    it('should return ASR caption if only ASR available', () => {
      const asr: PredictionResult = {
        label: 'Hello',
        confidence: 0.80,
        source: 'asr'
      }

      const result = fuseMultimodal(null, asr)
      
      expect(result).not.toBeNull()
      expect(result!.label).toBe('Hello')
      expect(result!.source).toBe('asr')
    })

    it('should prefer sign for high-confidence sign predictions', () => {
      const sign: PredictionResult = {
        label: 'Hello',
        confidence: 0.90,
        source: 'local'
      }
      const asr: PredictionResult = {
        label: 'Hi',
        confidence: 0.85,
        source: 'asr'
      }

      const result = fuseMultimodal(sign, asr)
      
      expect(result).not.toBeNull()
      expect(result!.label).toBe('Hello')
      expect(result!.confidence).toBeGreaterThan(0.90)
    })

    it('should prefer ASR for high-confidence ASR predictions', () => {
      const sign: PredictionResult = {
        label: 'Hello',
        confidence: 0.75,
        source: 'local'
      }
      const asr: PredictionResult = {
        label: 'Hi',
        confidence: 0.90,
        source: 'asr'
      }

      const result = fuseMultimodal(sign, asr)
      
      expect(result).not.toBeNull()
      expect(result!.label).toBe('Hi')
      expect(result!.confidence).toBeGreaterThan(0.90)
    })

    it('should fuse if labels match', () => {
      const sign: PredictionResult = {
        label: 'Hello',
        confidence: 0.80,
        source: 'local'
      }
      const asr: PredictionResult = {
        label: 'Hello',
        confidence: 0.85,
        source: 'asr'
      }

      const result = fuseMultimodal(sign, asr)
      
      expect(result).not.toBeNull()
      expect(result!.label).toBe('Hello')
      expect(result!.confidence).toBeGreaterThan(0.80)
      expect(result!.confidence).toBeLessThanOrEqual(1.0)
    })

    it('should use higher confidence if labels don\'t match', () => {
      const sign: PredictionResult = {
        label: 'Hello',
        confidence: 0.70,
        source: 'local'
      }
      const asr: PredictionResult = {
        label: 'Thank You',
        confidence: 0.85,
        source: 'asr'
      }

      const result = fuseMultimodal(sign, asr)
      
      expect(result).not.toBeNull()
      expect(result!.label).toBe('Thank You')
      expect(result!.confidence).toBe(0.85)
    })
  })

  describe('shouldUseServer', () => {
    it('should return true if local confidence < 0.90', () => {
      expect(shouldUseServer(0.85)).toBe(true)
      expect(shouldUseServer(0.80)).toBe(true)
      expect(shouldUseServer(0.50)).toBe(true)
    })

    it('should return false if local confidence >= 0.90', () => {
      expect(shouldUseServer(0.90)).toBe(false)
      expect(shouldUseServer(0.95)).toBe(false)
      expect(shouldUseServer(0.99)).toBe(false)
    })
  })
})
