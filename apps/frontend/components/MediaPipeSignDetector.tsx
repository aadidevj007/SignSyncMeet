'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Activity, Eye, EyeOff, Send, Server } from 'lucide-react'
import { HandLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision'
import * as tf from '@tensorflow/tfjs'
import { loadTFJSModel } from '@/lib/tfjsClient'
import { fusePredictions } from '@/lib/fusion'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/auth-context'
import {
  normalizeLandmarks as normalizeLandmarksUtil,
  matchAlphabet,
  matchSentence,
  hasMovement,
  loadAlphabetTemplates,
  loadSentenceTemplates,
  MatchResult,
  AlphabetTemplate,
  SentenceTemplate
} from '@/lib/templateMatching'

interface MediaPipeSignDetectorProps {
  onCaption?: (text: string, confidence: number, source: 'template' | 'tfjs' | 'server') => void
  options?: {
    windowSize?: number
    confidenceThreshold?: number
    enableServerFallback?: boolean
    autoSendToServer?: boolean
    enableTemplates?: boolean
  }
}

interface LandmarkBuffer {
  landmarks: number[][]
  timestamps: number[]
}

export default function MediaPipeSignDetector({
  onCaption,
  options = {}
}: MediaPipeSignDetectorProps) {
  const {
    windowSize = 32,
    confidenceThreshold = 0.85,
    enableServerFallback = true,
    autoSendToServer = true,
    enableTemplates = true
  } = options

  const { user } = useAuth()
  const [isActive, setIsActive] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  const [currentCaption, setCurrentCaption] = useState<string | null>(null)
  const [confidence, setConfidence] = useState(0)
  const [predictionSource, setPredictionSource] = useState<'template' | 'tfjs' | 'server' | null>(null)
  const [isSendingToServer, setIsSendingToServer] = useState(false)
  const [tfjsModel, setTfjsModel] = useState<tf.LayersModel | null>(null)
  const [hasConsent, setHasConsent] = useState(false)
  const [serverModelAvailable, setServerModelAvailable] = useState<boolean | null>(null)
  const [classNames, setClassNames] = useState<string[]>([])
  const [alphabetTemplates, setAlphabetTemplates] = useState<Record<string, AlphabetTemplate>>({})
  const [sentenceTemplates, setSentenceTemplates] = useState<Record<string, SentenceTemplate>>({})
  const [templatesLoaded, setTemplatesLoaded] = useState(false)
  const alphabetStableFramesRef = useRef<Map<string, number>>(new Map())
  const lastAlphabetMatchRef = useRef<MatchResult | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationRef = useRef<number>()
  const handLandmarkerRef = useRef<HandLandmarker | null>(null)
  const lastVideoTimeRef = useRef(-1)
  const landmarkBufferRef = useRef<LandmarkBuffer>({
    landmarks: [],
    timestamps: []
  })
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const lastPredictionTimeRef = useRef(0)

  // Initialize MediaPipe Hand Landmarker
  useEffect(() => {
    const initializeHandLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        )
        
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2
        })
        
        console.log('✅ MediaPipe Hand Landmarker initialized')
      } catch (error) {
        console.error('❌ Error initializing MediaPipe:', error)
        toast.error('Failed to initialize hand detector')
      }
    }

    initializeHandLandmarker()
  }, [])

  // Load templates
  useEffect(() => {
    if (!enableTemplates) return
    
    const loadTemplates = async () => {
      try {
        const [alphabets, sentences] = await Promise.all([
          loadAlphabetTemplates(),
          loadSentenceTemplates()
        ])
        
        setAlphabetTemplates(alphabets)
        setSentenceTemplates(sentences)
        setTemplatesLoaded(true)
        console.log('✅ Templates loaded:', Object.keys(alphabets).length, 'alphabets,', Object.keys(sentences).length, 'sentences')
      } catch (error) {
        console.error('❌ Error loading templates:', error)
        toast.error('Templates not found. Using TFJS/model only.')
      }
    }

    loadTemplates()
  }, [enableTemplates])

  // Load TFJS model
  useEffect(() => {
    const loadModel = async () => {
      try {
        const model = await loadTFJSModel('/models/tfjs_landmark_model/model.json')
        setTfjsModel(model)
        
        // Try to load class names
        try {
          const response = await fetch('/models/tfjs_landmark_model/class_names.json')
          if (response.ok) {
            const names = await response.json()
            setClassNames(names)
          } else {
            // Default class names
            setClassNames(['Hello', 'Thank You', 'Yes', 'No', 'Please', 'Sorry', 'Good', 'Bad', 'Help', 'Welcome'])
          }
        } catch (e) {
          setClassNames(['Hello', 'Thank You', 'Yes', 'No', 'Please', 'Sorry', 'Good', 'Bad', 'Help', 'Welcome'])
        }
        
        console.log('✅ TFJS model loaded')
      } catch (error) {
        console.error('❌ Error loading TFJS model:', error)
        // Don't show error toast - templates can work without TFJS
      }
    }

    loadModel()
  }, [])

  // Check server model availability
  useEffect(() => {
    const checkServerModel = async () => {
      try {
        if (!user) return
        
        const idToken = await user.getIdToken()
        const response = await fetch('/api/infer/status', {
          headers: { Authorization: `Bearer ${idToken}` }
        })
        
        if (response.ok) {
          const data = await response.json()
          setServerModelAvailable(data.modelAvailable === true)
        }
      } catch (error) {
        console.warn('Could not check server model status:', error)
        setServerModelAvailable(null)
      }
    }

    if (user && enableServerFallback) {
      checkServerModel()
    }
  }, [user, enableServerFallback])

  // Load consent from profile/localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const v = localStorage.getItem('allowLowConfidenceSaves') === 'true'
      setHasConsent(v)
    }
  }, [])

  // Normalize landmarks to feature vector (for TFJS compatibility)
  const normalizeLandmarks = useCallback((landmarks: any[]): number[] => {
    if (!landmarks || landmarks.length === 0) return []
    
    const features: number[] = []
    const numHands = Math.min(landmarks.length, 2)
    
    for (let handIdx = 0; handIdx < numHands; handIdx++) {
      const hand = landmarks[handIdx]
      if (hand && hand.length >= 21) {
        // Extract 21 landmarks * 3 (x, y, z) = 63 features per hand
        for (const point of hand) {
          features.push(point.x, point.y, point.z || 0)
        }
      }
    }
    
    // Pad to 2 hands * 21 * 3 = 126 features
    while (features.length < 126) {
      features.push(0, 0, 0)
    }
    
    return features.slice(0, 126)
  }, [])

  // Predict using templates (alphabet + sentence DTW)
  const predictWithTemplates = useCallback((
    buffer: number[][]
  ): { label: string; confidence: number; source: 'template' } | null => {
    if (!templatesLoaded || buffer.length === 0) return null

    // Normalize latest frame for template matching
    const latestFrame = buffer[buffer.length - 1]
    if (!latestFrame || latestFrame.length !== 126) return null

    const normalizedFrame = normalizeLandmarksUtil(latestFrame)
    
    // Check for movement to decide between alphabet (static) vs sentence (dynamic)
    const hasMovementNow = hasMovement(buffer.slice(-8), 0.05) // Check last 8 frames
    
    if (!hasMovementNow && Object.keys(alphabetTemplates).length > 0) {
      // Static handshape - try alphabet matching
      const alphabetMatch = matchAlphabet(normalizedFrame, alphabetTemplates)
      
      if (alphabetMatch) {
        // Debounce: require stable match for 5 frames
        const letter = alphabetMatch.label
        const currentCount = alphabetStableFramesRef.current.get(letter) || 0
        alphabetStableFramesRef.current.set(letter, currentCount + 1)
        
        // Reset other letters
        for (const [key] of alphabetStableFramesRef.current) {
          if (key !== letter) {
            alphabetStableFramesRef.current.delete(key)
          }
        }
        
        // Only emit if stable for threshold frames
        if (currentCount + 1 >= 5) {
          lastAlphabetMatchRef.current = alphabetMatch
          return {
            label: letter,
            confidence: alphabetMatch.confidence,
            source: 'template'
          }
        }
      } else {
        // Reset all counters if no match
        alphabetStableFramesRef.current.clear()
      }
    } else if (hasMovementNow && buffer.length >= 8 && Object.keys(sentenceTemplates).length > 0) {
      // Dynamic movement - try sentence matching with DTW
      const sentenceMatch = matchSentence(buffer, sentenceTemplates)
      
      if (sentenceMatch) {
        return {
          label: sentenceMatch.label,
          confidence: sentenceMatch.confidence,
          source: 'template'
        }
      }
    }

    return null
  }, [templatesLoaded, alphabetTemplates, sentenceTemplates])

  // Predict using TFJS model
  const predictWithTFJS = useCallback(async (buffer: number[][]): Promise<{ label: string; confidence: number } | null> => {
    if (!tfjsModel || buffer.length < windowSize) return null

    try {
      // Pad or trim buffer to windowSize
      let processedBuffer = [...buffer]
      if (processedBuffer.length > windowSize) {
        processedBuffer = processedBuffer.slice(-windowSize)
      } else {
        while (processedBuffer.length < windowSize) {
          processedBuffer.unshift(new Array(126).fill(0))
        }
      }

      // Convert to tensor: [1, windowSize, features]
      const tensor = tf.tensor3d([processedBuffer])
      const prediction = tfjsModel.predict(tensor) as tf.Tensor

      // Get label and confidence
      const predictions = await prediction.array()
      await tensor.dispose()
      await prediction.dispose()

      const scores = predictions[0] as number[]
      const maxIdx = scores.indexOf(Math.max(...scores))
      const conf = scores[maxIdx]

      // Map index to label using loaded class names or default
      const labels = classNames.length > 0 ? classNames : ['Hello', 'Thank You', 'Yes', 'No', 'Please', 'Sorry', 'Good', 'Bad', 'Help', 'Welcome']
      const label = labels[maxIdx] || `Sign_${maxIdx}`

      return { label, confidence: conf }
    } catch (error) {
      console.error('TFJS prediction error:', error)
      return null
    }
  }, [tfjsModel, windowSize])

  // Send clip to server for inference
  const sendToServer = useCallback(async (
    clipBase64: string,
    landmarks: number[][],
    meta: { timestamp: number; localLabel?: string; localConfidence?: number }
  ) => {
    if (!user || !enableServerFallback) return null

    setIsSendingToServer(true)
    
    try {
      const idToken = await user.getIdToken()
      
      const response = await fetch('/api/infer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          clipBase64,
          landmarks,
          meta: { ...meta, consent: hasConsent }
        })
      })

      if (!response.ok) {
        throw new Error(`Server inference failed: ${response.statusText}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Server inference error:', error)
      toast.error('Server inference failed')
      return null
    } finally {
      setIsSendingToServer(false)
    }
  }, [user, enableServerFallback, hasConsent])

  // Capture video clip
  const captureClip = useCallback(async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!streamRef.current) {
        reject(new Error('No stream available'))
        return
      }

      recordedChunksRef.current = []
      
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp8'
      })
      
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
        const reader = new FileReader()
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1]
          resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
      }

      mediaRecorder.start()
      setTimeout(() => {
        mediaRecorder.stop()
      }, 2500) // 2.5 second clip
    })
  }, [])

  // Main detection loop
  const detectSigns = useCallback(() => {
    if (!isDetecting || !videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const startTimeMs = performance.now()

    if (lastVideoTimeRef.current !== video.currentTime) {
      lastVideoTimeRef.current = video.currentTime

      if (handLandmarkerRef.current) {
        try {
          const results = handLandmarkerRef.current.detectForVideo(video, startTimeMs)
          
          drawLandmarks(results)

          if (results.landmarks && results.landmarks.length > 0) {
            // Normalize and add to buffer
            const normalized = normalizeLandmarks(results.landmarks)
            landmarkBufferRef.current.landmarks.push(normalized)
            landmarkBufferRef.current.timestamps.push(startTimeMs)

            // Keep buffer size
            if (landmarkBufferRef.current.landmarks.length > windowSize * 2) {
              landmarkBufferRef.current.landmarks.shift()
              landmarkBufferRef.current.timestamps.shift()
            }

            // Predict when buffer is ready (throttle to ~5Hz)
            const now = Date.now()
            if (landmarkBufferRef.current.landmarks.length >= 8 && 
                now - lastPredictionTimeRef.current > 200) {
              lastPredictionTimeRef.current = now
              
              // Priority 1: Try template matching (fast, deterministic)
              let templateResult: { label: string; confidence: number; source: 'template' } | null = null
              if (enableTemplates && templatesLoaded) {
                templateResult = predictWithTemplates(landmarkBufferRef.current.landmarks)
              }

              // Priority 2: Try TFJS model (if available)
              let tfjsResult: { label: string; confidence: number } | null = null
              if (tfjsModel && landmarkBufferRef.current.landmarks.length >= windowSize) {
                predictWithTFJS(landmarkBufferRef.current.landmarks).then(async (prediction) => {
                  if (prediction) {
                    tfjsResult = prediction
                    
                    // Use best result between template and TFJS
                    let bestResult = templateResult
                    if (!bestResult || (tfjsResult && tfjsResult.confidence > bestResult.confidence)) {
                      bestResult = {
                        label: tfjsResult.label,
                        confidence: tfjsResult.confidence,
                        source: 'tfjs'
                      }
                    }

                    // Check if server inference needed
                    if (bestResult && bestResult.confidence < confidenceThreshold && 
                        autoSendToServer && 
                        hasConsent && 
                        serverModelAvailable !== false) {
                      // Capture clip and send to server
                      try {
                        const clipBase64 = await captureClip()
                        const serverResult = await sendToServer(
                          clipBase64,
                          landmarkBufferRef.current.landmarks.slice(-windowSize),
                          {
                            timestamp: startTimeMs,
                            localLabel: bestResult.label,
                            localConfidence: bestResult.confidence
                          }
                        )

                        if (serverResult) {
                          // Fuse predictions
                          const fused = fusePredictions(
                            { label: bestResult.label, confidence: bestResult.confidence },
                            serverResult
                          )

                          setCurrentCaption(fused.label)
                          setConfidence(fused.confidence)
                          setPredictionSource('server')
                          
                          if (onCaption) {
                            onCaption(fused.label, fused.confidence, 'server')
                          }
                        }
                      } catch (error) {
                        console.error('Server inference pipeline error:', error)
                      }
                    } else if (bestResult) {
                      // Use local prediction
                      setCurrentCaption(bestResult.label)
                      setConfidence(bestResult.confidence)
                      setPredictionSource(bestResult.source)
                      
                      if (onCaption) {
                        onCaption(bestResult.label, bestResult.confidence, bestResult.source)
                      }
                    }
                  }
                })
              } else if (templateResult) {
                // Use template result if TFJS not available
                setCurrentCaption(templateResult.label)
                setConfidence(templateResult.confidence)
                setPredictionSource('template')
                
                if (onCaption) {
                  onCaption(templateResult.label, templateResult.confidence, 'template')
                }
              }
            }
          }
        } catch (error) {
          console.error('Detection error:', error)
        }
      }
    }

    animationRef.current = requestAnimationFrame(detectSigns)
  }, [isDetecting, tfjsModel, windowSize, normalizeLandmarks, predictWithTFJS, confidenceThreshold, autoSendToServer, hasConsent, captureClip, sendToServer, onCaption])

  // Draw landmarks
  const drawLandmarks = useCallback((results?: any) => {
    const canvas = canvasRef.current
    const video = videoRef.current
    
    if (!canvas || !video) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (results && results.landmarks) {
      const drawingUtils = new DrawingUtils(ctx)
      
      for (const landmarks of results.landmarks) {
        drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
          color: "#00FF00",
          lineWidth: 2
        })
        drawingUtils.drawLandmarks(landmarks, {
          color: "#FF0000",
          lineWidth: 1,
          radius: 3
        })
      }
    }
  }, [])

  // Start detection
  const startDetection = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        }
      })
      
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      
      setIsActive(true)
      setIsDetecting(true)
      
      detectSigns()
    } catch (error) {
      console.error('Error accessing camera:', error)
      toast.error('Failed to access camera')
    }
  }, [detectSigns])

  // Stop detection
  const stopDetection = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    
    setIsActive(false)
    setIsDetecting(false)
    setCurrentCaption(null)
    setConfidence(0)
    setPredictionSource(null)
  }, [])

  // Manual server verification
  const handleManualServerVerify = useCallback(async () => {
    if (!hasConsent) {
      toast.error('Please provide consent for server verification')
      return
    }

    if (landmarkBufferRef.current.landmarks.length < windowSize) {
      toast.error('Insufficient frames. Wait for buffer to fill.')
      return
    }

    setIsSendingToServer(true)
    
    try {
      const clipBase64 = await captureClip()
      const result = await sendToServer(
        clipBase64,
        landmarkBufferRef.current.landmarks.slice(-windowSize),
        {
          timestamp: performance.now(),
          localLabel: currentCaption || undefined,
          localConfidence: confidence
        }
      )

      if (result) {
        toast.success(`Server result: ${result.label} (${(result.confidence * 100).toFixed(1)}%)`)
        
        if (result.confidence > confidence) {
          setCurrentCaption(result.label)
          setConfidence(result.confidence)
          setPredictionSource('server')
          
          if (onCaption) {
            onCaption(result.label, result.confidence, 'server')
          }
        }
      }
    } catch (error) {
      console.error('Manual server verify error:', error)
    } finally {
      setIsSendingToServer(false)
    }
  }, [hasConsent, windowSize, currentCaption, confidence, captureClip, sendToServer, onCaption, confidenceThreshold])

  useEffect(() => {
    if (isDetecting) {
      detectSigns()
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isDetecting, detectSigns])

  const toggleDetection = () => {
    if (isDetecting) {
      stopDetection()
    } else {
      startDetection()
    }
  }

  return (
    <div className="relative">
      {/* Consent Modal */}
      {enableServerFallback && !hasConsent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-black/90 backdrop-blur-sm rounded-lg p-4 mb-4 border border-yellow-500/50"
        >
          <p className="text-white text-sm mb-3">
            Enable server verification for improved accuracy? Low-confidence clips may be stored for training (with your consent).
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setHasConsent(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
            >
              Accept
            </button>
            <button
              onClick={() => setHasConsent(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
            >
              Local Only
            </button>
          </div>
        </motion.div>
      )}

      {/* Detection Status */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-black/80 backdrop-blur-sm rounded-lg p-3 mb-2"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              isDetecting ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
            }`} />
            <span className="text-white text-xs font-medium">
              {isDetecting ? 'Detecting' : 'Idle'}
            </span>
            {currentCaption && (
              <>
                <span className="text-cyan-400 text-xs">|</span>
                <span className="text-cyan-400 text-xs font-semibold">{currentCaption}</span>
                <span className={`text-xs ${predictionSource === 'server' ? 'text-purple-400' : 'text-yellow-400'}`}>
                  {Math.round(confidence * 100)}% {predictionSource === 'server' && '🖥️'}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isDetecting && enableServerFallback && hasConsent && (
              <button
                onClick={handleManualServerVerify}
                disabled={isSendingToServer}
                className="p-1.5 text-purple-400 hover:text-purple-300 disabled:opacity-50 transition-colors"
                title="Force server verification"
              >
                <Server className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={toggleDetection}
              className="p-1 text-gray-400 hover:text-white transition-colors"
            >
              {isDetecting ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        {isSendingToServer && (
          <div className="mt-2 text-xs text-purple-400 flex items-center gap-1">
            <Activity className="w-3 h-3 animate-spin" />
            Sending to server...
          </div>
        )}
      </motion.div>

      {/* Video with Landmark Overlay */}
      <div className="relative">
        <video
          ref={videoRef}
          className="w-full h-auto rounded-lg"
          autoPlay
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full rounded-lg pointer-events-none"
        />
      </div>

      {/* Model Status */}
      <div className="mt-2 text-xs text-gray-400 space-y-1">
        {enableTemplates && templatesLoaded && (
          <div className="text-green-400">✅ Templates loaded ({Object.keys(alphabetTemplates).length} alphabets, {Object.keys(sentenceTemplates).length} sentences)</div>
        )}
        {!tfjsModel && !templatesLoaded && (
          <div className="text-yellow-400">⚠️ No models loaded. Using templates or TFJS model.</div>
        )}
        {tfjsModel && <div>✅ TFJS model loaded</div>}
        {hasConsent && <div>✅ Server verification enabled</div>}
      </div>
    </div>
  )
}

