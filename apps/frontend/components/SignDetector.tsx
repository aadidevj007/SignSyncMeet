'use client'

import React, { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, Eye, EyeOff } from 'lucide-react'
import { HandLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision'

interface SignDetectorProps {
  onSignDetected?: (sign: string, confidence: number, landmarks?: any[]) => void
}

export default function SignDetector({ onSignDetected }: SignDetectorProps) {
  const [isActive, setIsActive] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  const [currentSign, setCurrentSign] = useState<string | null>(null)
  const [confidence, setConfidence] = useState(0)
  const [isEnabled, setIsEnabled] = useState(true)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationRef = useRef<number>()
  const handLandmarkerRef = useRef<HandLandmarker | null>(null)
  const lastVideoTimeRef = useRef(-1)

  const startDetection = async () => {
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
    }
  }

  const stopDetection = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    
    setIsActive(false)
    setIsDetecting(false)
    setCurrentSign(null)
    setConfidence(0)
  }

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
        
        if (isEnabled) {
          startDetection()
        }
      } catch (error) {
        console.error('❌ Error initializing MediaPipe:', error)
        if (isEnabled) {
          startDetection()
        }
      }
    }

    initializeHandLandmarker()

    return () => {
      stopDetection()
    }
  }, [isEnabled])

  const detectSigns = () => {
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
            const sign = classifySign(results.landmarks[0])
            if (sign) {
              setCurrentSign(sign.text)
              setConfidence(sign.confidence)
              
              if (onSignDetected) {
                onSignDetected(sign.text, sign.confidence, results.landmarks[0])
              }
            }
          }
        } catch (error) {
          console.error('Detection error:', error)
        }
      }
    }

    animationRef.current = requestAnimationFrame(detectSigns)
  }

  const classifySign = (landmarks: any) => {
    if (!landmarks || landmarks.length < 21) return null

    const thumb = landmarks[4]
    const index = landmarks[8]
    const middle = landmarks[12]
    const ring = landmarks[16]
    const pinky = landmarks[20]

    const thumbExtended = thumb.y < landmarks[3].y
    const indexExtended = index.y < landmarks[7].y
    const middleExtended = middle.y < landmarks[11].y
    const ringExtended = ring.y < landmarks[15].y
    const pinkyExtended = pinky.y < landmarks[19].y

    if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended && !thumbExtended) {
      return { text: 'One', confidence: 0.85 }
    }
    if (indexExtended && middleExtended && !ringExtended && !pinkyExtended && !thumbExtended) {
      return { text: 'Two', confidence: 0.85 }
    }
    if (indexExtended && middleExtended && ringExtended && !pinkyExtended && !thumbExtended) {
      return { text: 'Three', confidence: 0.85 }
    }
    if (indexExtended && middleExtended && ringExtended && pinkyExtended && !thumbExtended) {
      return { text: 'Four', confidence: 0.85 }
    }
    if (indexExtended && middleExtended && ringExtended && pinkyExtended && thumbExtended) {
      return { text: 'Five', confidence: 0.90 }
    }
    if (!thumbExtended && indexExtended && middleExtended) {
      return { text: 'Hello', confidence: 0.80 }
    }
    if (thumbExtended && !indexExtended && !middleExtended) {
      return { text: 'Good', confidence: 0.75 }
    }

    return null
  }

  const drawLandmarks = (results?: any) => {
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
  }

  const toggleDetection = () => {
    setIsEnabled(!isEnabled)
  }

  return (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-black/80 backdrop-blur-sm rounded-lg p-3 mb-2"
      >
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            isDetecting ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
          }`} />
          <span className="text-white text-xs font-medium">
            {isDetecting ? 'Detecting' : 'Idle'}
          </span>
          {currentSign && (
            <>
              <span className="text-cyan-400 text-xs">|</span>
              <span className="text-cyan-400 text-xs">{currentSign}</span>
              <span className="text-yellow-400 text-xs">
                {Math.round(confidence * 100)}%
              </span>
            </>
          )}
        </div>
      </motion.div>

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

      <button
        onClick={toggleDetection}
        className="mt-2 w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
      >
        {isEnabled ? <EyeOff className="w-4 h-4 inline mr-2" /> : <Eye className="w-4 h-4 inline mr-2" />}
        {isEnabled ? 'Disable' : 'Enable'} Detection
      </button>
    </div>
  )
}

