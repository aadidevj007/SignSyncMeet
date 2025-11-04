import * as tf from '@tensorflow/tfjs'

let cachedModel: tf.LayersModel | null = null
let modelLoadPromise: Promise<tf.LayersModel | null> | null = null

/**
 * Load TFJS model from URL or path
 * @param modelPath Path to model.json
 * @returns Loaded model or null if not available
 */
export async function loadTFJSModel(modelPath: string): Promise<tf.LayersModel | null> {
  if (cachedModel) {
    return cachedModel
  }

  // Prevent concurrent loads
  if (modelLoadPromise) {
    return modelLoadPromise
  }

  modelLoadPromise = (async () => {
    try {
      console.log(`Loading TFJS model from: ${modelPath}`)
      const model = await tf.loadLayersModel(modelPath)
      
      // Warm up model with dummy input
      await warmupModel(model)
      
      cachedModel = model
      console.log('✅ TFJS model loaded and warmed up')
      modelLoadPromise = null
      return model
    } catch (error) {
      console.error('❌ Error loading TFJS model:', error)
      console.warn('⚠️ Model not available. Using placeholder or speech-only mode.')
      cachedModel = null
      modelLoadPromise = null
      return null
    }
  })()

  return modelLoadPromise
}

/**
 * Warm up model with dummy input to reduce first inference latency
 */
async function warmupModel(model: tf.LayersModel) {
  try {
    // Get input shape from model
    const inputShape = model.inputs[0].shape
    if (!inputShape) return

    // Create dummy tensor: [batch=1, windowSize, features]
    // Default: [1, 32, 126] for windowSize=32, features=126 (2 hands * 21 * 3)
    const batchSize = 1
    const windowSize = inputShape[1] || 32
    const features = inputShape[2] || 126
    
    const dummyInput = tf.zeros([batchSize, windowSize, features])
    const dummyOutput = model.predict(dummyInput) as tf.Tensor
    
    // Clean up
    await dummyOutput.array()
    dummyInput.dispose()
    dummyOutput.dispose()
    
    console.log('✅ Model warmed up')
  } catch (error) {
    console.warn('⚠️ Model warmup failed:', error)
  }
}

/**
 * Predict sign from landmark buffer
 * @param model TFJS model
 * @param buffer Landmark buffer [windowSize, features]
 * @param classNames Array of class names (label mapping)
 * @returns Prediction result
 */
export async function predictSign(
  model: tf.LayersModel | null,
  buffer: number[][],
  classNames: string[]
): Promise<{ label: string; confidence: number; allScores: number[] } | null> {
  if (!model) {
    return null
  }

  try {
    // Ensure buffer has correct shape
    const inputShape = model.inputs[0].shape
    if (!inputShape) {
      throw new Error('Model input shape not defined')
    }

    const windowSize = inputShape[1] || 32
    const features = inputShape[2] || 126

    // Pad or trim buffer
    let processedBuffer = [...buffer]
    if (processedBuffer.length > windowSize) {
      processedBuffer = processedBuffer.slice(-windowSize)
    } else {
      while (processedBuffer.length < windowSize) {
        processedBuffer.unshift(new Array(features).fill(0))
      }
    }

    // Ensure each row has correct number of features
    processedBuffer = processedBuffer.map(row => {
      const paddedRow = [...row]
      while (paddedRow.length < features) {
        paddedRow.push(0)
      }
      return paddedRow.slice(0, features)
    })

    // Convert to tensor: [1, windowSize, features]
    const tensor = tf.tensor3d([processedBuffer])
    
    // Predict
    const prediction = model.predict(tensor) as tf.Tensor
    const scores = await prediction.array()

    // Clean up
    tensor.dispose()
    prediction.dispose()

    // Get top prediction
    const probabilities = scores[0] as number[]
    const maxIdx = probabilities.indexOf(Math.max(...probabilities))
    const confidence = probabilities[maxIdx]

    const label = classNames[maxIdx] || `Sign_${maxIdx}`

    return {
      label,
      confidence,
      allScores: probabilities
    }
  } catch (error) {
    console.error('Prediction error:', error)
    return null
  }
}

/**
 * Check if model is loaded
 */
export function isModelLoaded(): boolean {
  return cachedModel !== null
}

/**
 * Get cached model instance
 */
export function getCachedModel(): tf.LayersModel | null {
  return cachedModel
}

/**
 * Clear cached model
 */
export function clearCachedModel() {
  if (cachedModel) {
    cachedModel.dispose()
    cachedModel = null
  }
  modelLoadPromise = null
}
