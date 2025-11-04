import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs/promises'
import { InferenceResult } from '../types/inference'

const PYTHON_SCRIPT_PATH = path.join(__dirname, '../../scripts/run_pytorch_infer.py')
const TRITON_URL = process.env.TRITON_URL
const TORCHSERVE_URL = process.env.TORCHSERVE_URL
const MODELS_DIR = path.join(__dirname, '../../../models')
const AVAILABLE_MODEL_FILE = path.join(MODELS_DIR, 'AVAILABLE_VIDEO_MODEL.txt')

/**
 * Check if a server video model is available
 * Checks for:
 * - TorchScript models (.pt)
 * - ONNX models (.onnx)
 * - AVAILABLE_VIDEO_MODEL.txt file
 * - TorchServe/Triton endpoints
 */
export async function checkModelAvailability(): Promise<boolean> {
  // Check for TorchServe endpoint
  if (TORCHSERVE_URL) {
    try {
      const response = await fetch(`${TORCHSERVE_URL}/models`, { method: 'GET' })
      if (response.ok) {
        return true
      }
    } catch (error) {
      console.warn('TorchServe check failed:', error)
    }
  }

  // Check for Triton endpoint
  if (TRITON_URL) {
    try {
      const response = await fetch(`${TRITON_URL}/v2/models`, { method: 'GET' })
      if (response.ok) {
        return true
      }
    } catch (error) {
      console.warn('Triton check failed:', error)
    }
  }

  // Check for local model files
  try {
    // Check AVAILABLE_VIDEO_MODEL.txt
    try {
      const content = await fs.readFile(AVAILABLE_MODEL_FILE, 'utf-8')
      if (content.trim().length > 0) {
        const lines = content.trim().split('\n')
        for (const line of lines) {
          const modelPath = line.trim()
          if (modelPath && await fileExists(modelPath)) {
            return true
          }
        }
      }
    } catch (error) {
      // File doesn't exist or can't be read
    }

    // Check for common model file patterns
    const modelPatterns = [
      'videoswin*.onnx',
      'videoswin*.pt',
      'timesformer*.onnx',
      'timesformer*.pt',
      'model*.onnx',
      'model*.pt'
    ]

    const files = await fs.readdir(MODELS_DIR).catch(() => [])
    for (const file of files) {
      if (file.endsWith('.onnx') || file.endsWith('.pt')) {
        const fullPath = path.join(MODELS_DIR, file)
        const stats = await fs.stat(fullPath).catch(() => null)
        if (stats && stats.size > 1000) { // At least 1KB
          return true
        }
      }
    }
  } catch (error) {
    console.warn('Model availability check error:', error)
  }

  return false
}

/**
 * Helper to check if file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * Run inference on a video clip
 * Priority: Triton > TorchServe > Local PyTorch
 */
export async function runInference(
  clipPath: string,
  landmarks?: number[][]
): Promise<InferenceResult> {
  // Try Triton first
  if (TRITON_URL) {
    try {
      return await runTritonInference(clipPath, landmarks)
    } catch (error) {
      console.warn('Triton inference failed, falling back:', error)
    }
  }

  // Try TorchServe
  if (TORCHSERVE_URL) {
    try {
      return await runTorchServeInference(clipPath, landmarks)
    } catch (error) {
      console.warn('TorchServe inference failed, falling back:', error)
    }
  }

  // Fallback to local PyTorch
  return await runLocalPyTorchInference(clipPath, landmarks)
}

/**
 * Run inference via Triton Inference Server
 */
async function runTritonInference(
  clipPath: string,
  landmarks?: number[][]
): Promise<InferenceResult> {
  // This would call Triton's REST or gRPC API
  // For now, return placeholder
  throw new Error('Triton inference not implemented yet. See server/inference/videoswin_client.py')
}

/**
 * Run inference via TorchServe
 */
async function runTorchServeInference(
  clipPath: string,
  landmarks?: number[][]
): Promise<InferenceResult> {
  // Call TorchServe REST API
  if (!TORCHSERVE_URL) {
    throw new Error('TORCHSERVE_URL not configured')
  }

  // Read clip as base64
  const fs = require('fs/promises')
  const buffer = await fs.readFile(clipPath)
  const base64 = buffer.toString('base64')

  const response = await fetch(`${TORCHSERVE_URL}/predictions/videoswin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      clip: base64,
      landmarks: landmarks
    })
  })

  if (!response.ok) {
    throw new Error(`TorchServe inference failed: ${response.statusText}`)
  }

  const result = await response.json() as any
  return {
    label: result.label,
    confidence: result.confidence,
    model: 'videoswin-torchserve',
    details: result as Record<string, any>
  }
}

/**
 * Run inference using local PyTorch script
 */
async function runLocalPyTorchInference(
  clipPath: string,
  landmarks?: number[][]
): Promise<InferenceResult> {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [
      PYTHON_SCRIPT_PATH,
      '--clip', clipPath,
      ...(landmarks ? ['--landmarks', JSON.stringify(landmarks)] : [])
    ])

    let stdout = ''
    let stderr = ''

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python script failed: ${stderr}`))
        return
      }

      try {
        const result = JSON.parse(stdout) as any
        resolve({
          label: result.label,
          confidence: result.confidence,
          model: 'videoswin-local',
          details: result as Record<string, any>
        })
      } catch (error) {
        reject(new Error(`Failed to parse Python output: ${error}`))
      }
    })

    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to spawn Python process: ${error.message}`))
    })
  })
}

