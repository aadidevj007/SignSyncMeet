'use client'

/**
 * SpeechRecognition Component
 * 
 * Provides voice-to-text transcription using:
 * 1. Web Speech API (client-side, fast, English)
 * 2. Server ASR fallback (/api/asr) for multi-language support (ta/ml/te) or when Web Speech fails
 * 
 * Supports languages: en, ta (Tamil), ml (Malayalam), te (Telugu)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, MicOff, Globe } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/auth-context'

interface SpeechRecognitionProps {
  onTranscript?: (text: string, confidence: number, source: 'webspeech' | 'asr') => void
  language?: 'en' | 'ta' | 'ml' | 'te'
  enabled?: boolean
  useServerASR?: boolean // Force server ASR even for English
}

export default function SpeechRecognition({
  onTranscript,
  language = 'en',
  enabled = true,
  useServerASR = false
}: SpeechRecognitionProps) {
  const { user } = useAuth()
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState<string>('')
  const [confidence, setConfidence] = useState(0)
  const [source, setSource] = useState<'webspeech' | 'asr' | null>(null)
  const [useServer, setUseServer] = useState(false)

  const recognitionRef = useRef<any>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Check Web Speech API support
  useEffect(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const supported = !!SpeechRecognition

    setIsSupported(supported)

    if (supported) {
      const Recognition = SpeechRecognition
      recognitionRef.current = new Recognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = language === 'en' ? 'en-US' : language

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = ''
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' '
          } else {
            interimTranscript += transcript
          }
        }

        if (finalTranscript) {
          setCurrentTranscript(finalTranscript.trim())
          setConfidence(0.95) // Web Speech API doesn't provide confidence, use default
          setSource('webspeech')
          
          if (onTranscript) {
            onTranscript(finalTranscript.trim(), 0.95, 'webspeech')
          }
        } else if (interimTranscript) {
          setCurrentTranscript(interimTranscript)
        }
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        
        if (event.error === 'not-allowed') {
          toast.error('Microphone permission denied')
          setIsListening(false)
        } else if (event.error === 'no-speech') {
          // Silent - no speech detected
        } else {
          // Fallback to server ASR on error
          console.log('Falling back to server ASR')
          setUseServer(true)
        }
      }

      recognitionRef.current.onend = () => {
        if (isListening) {
          // Restart if still listening
          try {
            recognitionRef.current.start()
          } catch (e) {
            console.warn('Failed to restart recognition:', e)
          }
        }
      }
    } else {
      // Web Speech API not supported, use server ASR
      setUseServer(true)
    }
  }, [language, onTranscript, isListening])

  // Determine if we should use server ASR
  useEffect(() => {
    // Use server if:
    // 1. Explicitly requested
    // 2. Web Speech not supported
    // 3. Language is not English (Web Speech API has limited language support)
    const shouldUseServer = useServerASR || 
                           !isSupported || 
                           (language !== 'en' && language !== undefined)
    
    setUseServer(shouldUseServer)
  }, [useServerASR, isSupported, language])

  // Server ASR: Capture audio chunks and send to backend
  const startServerASR = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      // Send chunks every 2 seconds
      intervalRef.current = setInterval(async () => {
        if (mediaRecorder.state === 'recording' && audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          audioChunksRef.current = [] // Clear chunks

          // Convert to base64
          const reader = new FileReader()
          reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1]
            
            try {
              if (!user) {
                toast.error('Authentication required for server ASR')
                return
              }

              const idToken = await user.getIdToken()
              const response = await fetch('/api/asr', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                  audioBase64: base64,
                  audioMimeType: 'audio/webm',
                  lang: language
                })
              })

              if (!response.ok) {
                throw new Error(`ASR failed: ${response.statusText}`)
              }

              const result = await response.json()
              
              if (result.text && result.text.trim()) {
                setCurrentTranscript(result.text.trim())
                setConfidence(result.confidence || 0.85)
                setSource('asr')
                
                if (onTranscript) {
                  onTranscript(result.text.trim(), result.confidence || 0.85, 'asr')
                }
              }
            } catch (error) {
              console.error('Server ASR error:', error)
              toast.error('Server transcription failed')
            }
          }
          
          reader.readAsDataURL(audioBlob)
        }
      }, 2000) // Send every 2 seconds

      mediaRecorder.start()
    } catch (error) {
      console.error('Failed to start server ASR:', error)
      toast.error('Failed to access microphone')
      setIsListening(false)
    }
  }, [user, language, onTranscript])

  const stopServerASR = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [])

  // Start listening
  const startListening = useCallback(() => {
    if (!enabled) return

    setIsListening(true)

    if (useServer) {
      startServerASR()
    } else if (recognitionRef.current) {
      try {
        recognitionRef.current.start()
      } catch (error) {
        console.error('Failed to start recognition:', error)
        // Fallback to server
        setUseServer(true)
        startServerASR()
      }
    }
  }, [enabled, useServer, startServerASR])

  // Stop listening
  const stopListening = useCallback(() => {
    setIsListening(false)

    if (useServer) {
      stopServerASR()
    } else if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (error) {
        console.error('Failed to stop recognition:', error)
      }
    }
  }, [useServer, stopServerASR])

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  // Auto-start if enabled
  useEffect(() => {
    if (enabled && !isListening) {
      startListening()
    } else if (!enabled && isListening) {
      stopListening()
    }

    return () => {
      stopListening()
    }
  }, [enabled, isListening, startListening, stopListening])

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={toggleListening}
        disabled={!enabled}
        className={`p-2 rounded-full transition-colors ${
          isListening
            ? 'bg-red-500 text-white hover:bg-red-600'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-label={isListening ? 'Stop listening' : 'Start listening'}
      >
        {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>

      {currentTranscript && (
        <div className="flex items-center space-x-2 text-sm">
          <span className={`${source === 'asr' ? 'text-purple-400' : 'text-blue-400'}`}>
            {currentTranscript}
          </span>
          {source && (
            <span className="text-xs text-gray-500">
              ({source === 'asr' ? 'Server' : 'Web Speech'})
            </span>
          )}
        </div>
      )}

      {useServer && (
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <Globe className="w-4 h-4" />
          <span>Server ASR</span>
        </div>
      )}
    </div>
  )
}
