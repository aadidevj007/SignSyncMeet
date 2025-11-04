/**
 * Model download and management routes
 */

import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import path from 'path'
import fs from 'fs/promises'

const router = Router()

/**
 * GET /api/models/download-help
 * Returns instructions for downloading and setting up server models
 */
router.get('/models/download-help', async (req: Request, res: Response) => {
  try {
    const helpPage = {
      title: 'Server Model Setup Guide',
      message: 'High-accuracy server models are not installed. Follow the instructions below to set them up.',
      instructions: [
        {
          title: 'Option 1: Automated Download Script',
          steps: [
            'On Linux/macOS: Run `./scripts/download_pretrained_video_models.sh`',
            'On Windows: Run `scripts/download_pretrained_video_models.ps1` (if available)',
            'The script will clone repositories and provide download links for checkpoints'
          ]
        },
        {
          title: 'Option 2: Manual Download',
          steps: [
            'Video-Swin Transformer:',
            '  1. Clone: `git clone https://github.com/SwinTransformer/Video-Swin-Transformer.git models/videoswin`',
            '  2. Download checkpoint from: https://github.com/SwinTransformer/Video-Swin-Transformer#pretrained-models',
            '  3. Place checkpoint in `models/videoswin/`',
            '',
            'TimeSformer:',
            '  1. Clone: `git clone https://github.com/facebookresearch/TimeSformer.git models/timesformer`',
            '  2. Download checkpoint from: https://github.com/facebookresearch/TimeSformer#pretrained-models',
            '  3. Place checkpoint in `models/timesformer/`'
          ]
        },
        {
          title: 'Convert Models to ONNX',
          steps: [
            'Run: `python models/export_onnx.py --checkpoint <path> --out models/videoswin.onnx --model-type videoswin`',
            'See `models/export_onnx.py` for model-specific conversion requirements'
          ]
        },
        {
          title: 'Register Models',
          steps: [
            'Create or update `models/AVAILABLE_VIDEO_MODEL.txt` with model paths:',
            '  models/videoswin.onnx',
            '  models/timesformer.onnx'
          ]
        },
        {
          title: 'Restart Server',
          steps: [
            'After adding models, restart the backend server',
            'The server will automatically detect available models'
          ]
        }
      ],
      documentation: {
        link: '/Documentation/SIGN_DETECTION_INTEGRATION.md',
        description: 'See full documentation for detailed setup instructions'
      },
      currentStatus: {
        modelsDir: path.join(process.cwd(), 'models'),
        availableModelFile: path.join(process.cwd(), 'models', 'AVAILABLE_VIDEO_MODEL.txt'),
        modelsDirExists: false,
        availableModels: [] as string[]
      }
    }

    // Check if models directory exists
    const modelsDir = path.join(process.cwd(), 'models')
    try {
      const stats = await fs.stat(modelsDir)
      helpPage.currentStatus.modelsDirExists = stats.isDirectory()
    } catch {
      helpPage.currentStatus.modelsDirExists = false
    }

    // Check for available models file
    const modelFile = path.join(modelsDir, 'AVAILABLE_VIDEO_MODEL.txt')
    try {
      const content = await fs.readFile(modelFile, 'utf-8')
      helpPage.currentStatus.availableModels = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
    } catch {
      helpPage.currentStatus.availableModels = []
    }

    res.json(helpPage)
  } catch (error) {
    console.error('Error in /api/models/download-help:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/models/reload
 * Reload model registry (checks AVAILABLE_VIDEO_MODEL.txt)
 */
router.post('/models/reload', authMiddleware, async (req: Request, res: Response) => {
  try {
    const modelFile = path.join(process.cwd(), 'models', 'AVAILABLE_VIDEO_MODEL.txt')
    
    let models: string[] = []
    try {
      const content = await fs.readFile(modelFile, 'utf-8')
      models = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
    } catch {
      res.status(404).json({
        error: 'AVAILABLE_VIDEO_MODEL.txt not found',
        message: 'Create this file with model paths to register models'
      })
      return
    }

    // Verify models exist
    const existingModels: string[] = []
    const missingModels: string[] = []

    for (const modelPath of models) {
      try {
        const fullPath = path.isAbsolute(modelPath) 
          ? modelPath 
          : path.join(process.cwd(), modelPath)
        
        const stats = await fs.stat(fullPath)
        if (stats.isFile() && stats.size > 1000) {
          existingModels.push(modelPath)
        } else {
          missingModels.push(modelPath)
        }
      } catch {
        missingModels.push(modelPath)
      }
    }

    res.json({
      success: true,
      message: 'Model registry reloaded',
      existingModels,
      missingModels,
      total: models.length
    })
  } catch (error) {
    console.error('Error in /api/models/reload:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router


