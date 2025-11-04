import express, { Request, Response } from 'express'
import admin from 'firebase-admin'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs/promises'
import path from 'path'
import { saveClip } from '../utils/saveClipUtil'
import { runInference, checkModelAvailability } from '../inference/runLocalInference'
import { InferenceRequest, InferenceResult } from '../types/inference'

const router = express.Router()

// Model availability cache
let modelAvailabilityCache: { available: boolean; checkedAt: number } | null = null
const MODEL_CACHE_TTL = 60000 // 1 minute

/**
 * POST /api/infer
 * Server-side inference endpoint using Video-Swin/TimeSformer
 * 
 * Body:
 * {
 *   clipBase64: string,
 *   landmarks: number[][],
 *   meta: {
 *     timestamp: number,
 *     localLabel?: string,
 *     localConfidence?: number
 *   }
 * }
 */
router.post('/infer', async (req: Request, res: Response) => {
  try {
    // Verify Firebase authentication
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' })
      return
    }

    const idToken = authHeader.split('Bearer ')[1]
    let decodedToken
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken)
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' })
      return
    }

    const userId = decodedToken.uid
    const { clipBase64, landmarks, meta } = req.body as InferenceRequest

    if (!clipBase64) {
      res.status(400).json({ error: 'Missing clipBase64' })
      return
    }

    // Check consent flag if provided
    const hasConsent = meta && typeof meta.consent === 'boolean' ? meta.consent : false

    // Save clip to temporary storage (only if consent is given or confidence is low)
    const clipId = uuidv4()
    let clipPath: string | null = null
    
    if (hasConsent || (meta?.localConfidence && meta.localConfidence < 0.85)) {
      clipPath = await saveClip(clipBase64, clipId)
    } else {
      // Still generate clipId for logging, but don't save clip
      console.log(`Skipping clip save for ${clipId} - no consent and high confidence`)
    }

    // Log inference request to MongoDB
    // Note: Ensure MongoDB connection is set via app.set('db', ...) in server.ts
    const db = req.app.get('db') || null
    if (db) {
      await db.collection('inference_requests').insertOne({
        userId,
        clipId,
        clipPath: clipPath || null,
        timestamp: new Date(),
        meetingId: meta?.meetingId || null,
        localLabel: meta?.localLabel || null,
        localConfidence: meta?.localConfidence || null,
        hasConsent,
        status: 'processing'
      })
    }

    // Check model availability
    const modelAvailable = await checkModelAvailability()
    if (!modelAvailable) {
      // Update status in DB
      if (db) {
        await db.collection('inference_requests').updateOne(
          { clipId },
          { $set: { status: 'failed', error: 'model_missing' } }
        )
      }
      
      res.status(503).json({
        error: 'model_missing',
        message: 'Server model not found',
        download_hint: '/api/models/download-help',
        label: meta?.localLabel || 'unknown',
        confidence: meta?.localConfidence || 0,
        model: 'local-fallback'
      })
      return
    }

    // Run inference (only if clip was saved or we have landmarks)
    let inferenceResult: InferenceResult
    try {
      if (!clipPath && (!landmarks || landmarks.length === 0)) {
        throw new Error('Cannot run inference: no clip path and no landmarks provided')
      }
      
      inferenceResult = await runInference(clipPath || '', landmarks || [])
    } catch (error: any) {
      console.error('Inference error:', error)
      
      // Update status in DB
      if (db) {
        await db.collection('inference_requests').updateOne(
          { clipId },
          { $set: { status: 'failed', error: String(error) } }
        )
      }
      
      // Check if it's a model missing error
      if (error?.message?.includes('model') || error?.message?.includes('Model')) {
        res.status(503).json({
          error: 'model_missing',
          message: 'Server model not found',
          download_hint: '/api/models/download-help',
          label: meta?.localLabel || 'unknown',
          confidence: meta?.localConfidence || 0,
          model: 'local-fallback'
        })
        return
      }
      
      res.status(500).json({ error: 'Inference failed', details: error.message })
      return
    }

    // Update inference result in DB
    if (db) {
      await db.collection('inference_requests').updateOne(
        { clipId },
        {
          $set: {
            status: 'completed',
            label: inferenceResult.label,
            confidence: inferenceResult.confidence,
            model: inferenceResult.model,
            completedAt: new Date()
          }
        }
      )
    }

    // Return result
    res.json({
      label: inferenceResult.label,
      confidence: inferenceResult.confidence,
      model: inferenceResult.model || 'videoswin-v1',
      details: inferenceResult.details || {},
      clipId
    })
  } catch (error) {
    console.error('Error in /api/infer:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/infer/status
 * Check if server model is available
 */
router.get('/infer/status', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const idToken = authHeader.split('Bearer ')[1]
    try {
      await admin.auth().verifyIdToken(idToken)
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' })
      return
    }

    const modelAvailable = await checkModelAvailability()
    
    res.json({
      modelAvailable,
      message: modelAvailable 
        ? 'Server model is available' 
        : 'Server model not found. See /api/models/download-help'
    })
  } catch (error) {
    console.error('Error in /api/infer/status:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/infer/status/:clipId
 * Get inference status for a clip
 */
router.get('/infer/status/:clipId', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const idToken = authHeader.split('Bearer ')[1]
    let decodedToken
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken)
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' })
      return
    }

    const { clipId } = req.params
    const db = req.app.get('db')

    if (!db) {
      res.status(500).json({ error: 'Database not available' })
      return
    }

    const record = await db.collection('inference_requests').findOne({
      clipId,
      userId: decodedToken.uid
    })

    if (!record) {
      res.status(404).json({ error: 'Inference request not found' })
      return
    }

    res.json({
      clipId: record.clipId,
      status: record.status,
      label: record.label || null,
      confidence: record.confidence || null,
      model: record.model || null,
      timestamp: record.timestamp,
      completedAt: record.completedAt || null
    })
  } catch (error) {
    console.error('Error in /api/infer/status:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

