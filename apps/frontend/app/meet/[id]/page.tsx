'use client'

/**
 * Meeting Page - Google Meet Style
 * 
 * How to run and test:
 * 1. `pnpm install` (ensure lucide-react, framer-motion, socket.io-client are installed)
 * 2. `pnpm dev` (starts both frontend and backend)
 * 3. Open `http://localhost:3000/meet/demo123` (or any meeting ID)
 * 4. Allow camera/microphone permissions
 * 5. Sign captions will appear from TFJS model (if available)
 * 6. Voice captions will appear from Web Speech API or server ASR
 * 
 * Demo participants: The page includes 2 demo participants for local testing
 * without requiring a backend connection.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

// Components
import MeetingLayout from '@/components/MeetingLayout'
import VideoGrid from '@/components/VideoGrid'
import MeetingControls from '@/components/MeetingControls'
import ParticipantList from '@/components/ParticipantList'
import CaptionsPanel, { Caption } from '@/components/CaptionsPanel'
import MediaPipeSignDetector from '@/components/MediaPipeSignDetector'
import SpeechRecognition from '@/components/SpeechRecognition'

// Utils
import { createSocketClient, Participant } from '@/lib/socketClient'
import { fuseMultimodal } from '@/lib/fusion'
import { isModelLoaded } from '@/lib/tfjsClient'

interface MeetingPageProps {
  params: { id: string }
}

export default function MeetingPage({ params }: MeetingPageProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const meetingId = params.id
  
  // State
  const [participants, setParticipants] = useState<Participant[]>([])
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [showCaptions, setShowCaptions] = useState(true)
  const [showParticipants, setShowParticipants] = useState(false)
  const [hasRaisedHand, setHasRaisedHand] = useState(false)
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null)
  const [spotlightId, setSpotlightId] = useState<string | null>(null)
  
  // Captions
  const [signCaptions, setSignCaptions] = useState<Caption[]>([])
  const [voiceCaptions, setVoiceCaptions] = useState<Caption[]>([])
  const [modelMissing, setModelMissing] = useState(false)
  
  // Media permission states
  const [mediaPermissionDenied, setMediaPermissionDenied] = useState(false)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  
  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const socketClientRef = useRef(createSocketClient())
  const signDetectorHiddenRef = useRef<HTMLDivElement>(null)

  // Initialize meeting
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    if (user && !isInitializing && !localStreamRef.current) {
      initializeMeeting()
    }

    return () => {
      // Cleanup
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop())
        localStreamRef.current = null
      }
      socketClientRef.current.disconnect()
    }
  }, [user, loading]) // Removed router from deps to prevent re-initialization

  // Setup socket connection separately
  const setupSocketConnection = async () => {
    if (!user) return
    
    try {
      const token = await user.getIdToken()
      socketClientRef.current.connect(meetingId, token)

      // Setup socket event handlers
      socketClientRef.current.onParticipants((participants: Participant[]) => {
        // Merge with local user
        setParticipants(prev => {
          const local = prev.find(p => p.id === user.uid)
          return local ? [local, ...participants.filter(p => p.id !== user.uid)] : participants
        })
      })

      socketClientRef.current.onParticipantJoined((participant: Participant) => {
        setParticipants(prev => [...prev, participant])
      })

      socketClientRef.current.onParticipantLeft((participantId: string) => {
        setParticipants(prev => prev.filter(p => p.id !== participantId))
      })

      socketClientRef.current.onActiveSpeaker((participantId: string) => {
        setActiveSpeakerId(participantId)
      })

      socketClientRef.current.onMeetingEnded(() => {
        toast.error('Meeting ended by host')
        router.push('/')
      })

      socketClientRef.current.onCaption((caption: any) => {
        // Handle captions from other participants if needed
        if (caption.type === 'sign') {
          addSignCaption(caption.text, caption.confidence, caption.source || 'template')
        } else {
          addVoiceCaption(caption.text, caption.confidence, caption.source || 'asr')
        }
      })
    } catch (error) {
      console.error('Error setting up socket connection:', error)
    }
  }

  const initializeMeeting = async () => {
    if (isInitializing) {
      return // Prevent multiple simultaneous initialization attempts
    }
    
    setIsInitializing(true)
    setMediaPermissionDenied(false)
    setMediaError(null)
    
    // Check if mediaDevices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost'
      const errorMsg = isSecure 
        ? 'Media devices API not available in this browser.'
        : 'Media devices require HTTPS. Please use https:// or localhost.'
      setMediaPermissionDenied(true)
      setMediaError(errorMsg)
      setIsInitializing(false)
      toast.error(errorMsg, { duration: 5000 })
      
      // Still allow user to join without media
      const currentUser: Participant = {
        id: user!.uid,
        name: user!.displayName || user!.email || 'Anonymous',
        avatar: user!.photoURL || undefined,
        isHost: true,
        isMuted: true,
        isVideoOff: true,
        isSpeaking: false,
        hasRaisedHand: false
      }
      
      const demoParticipants: Participant[] = [
        currentUser,
        {
          id: 'demo-1',
          name: 'Demo Participant 1',
          isHost: false,
          isMuted: false,
          isVideoOff: false,
          isSpeaking: false,
          hasRaisedHand: false
        },
        {
          id: 'demo-2',
          name: 'Demo Participant 2',
          isHost: false,
          isMuted: true,
          isVideoOff: false,
          isSpeaking: true,
          hasRaisedHand: false
        }
      ]
      
      setParticipants(demoParticipants)
      setupSocketConnection()
      return
    }
    
    try {
      // Try to get user media with graceful fallback
      let stream: MediaStream | null = null
      let hasVideo = false
      let hasAudio = false
      
      try {
        // Try with both video and audio first
        stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
            autoGainControl: true
          }
        })
        hasVideo = stream.getVideoTracks().length > 0
        hasAudio = stream.getAudioTracks().length > 0
      } catch (audioError: any) {
        console.warn('Failed to get both video and audio, trying video only:', audioError)
        
        // If audio permission denied, try video only
        if (audioError.name === 'NotAllowedError' || audioError.name === 'NotFoundError') {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
              }
            })
            hasVideo = stream.getVideoTracks().length > 0
            hasAudio = false
            setIsMuted(true)
            setMediaPermissionDenied(true)
            toast('Microphone access denied. You can join without audio.', { 
              icon: '🎤',
              duration: 5000
            })
          } catch (videoError: any) {
            // If video also fails, try audio only
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true
                }
              })
              hasVideo = false
              hasAudio = stream.getAudioTracks().length > 0
              setIsVideoOff(true)
              toast('Camera access denied. You can join without video.', { 
                icon: '📹',
                duration: 5000
              })
            } catch (finalError: any) {
              // Both failed - allow user to join without media
              stream = null
              hasVideo = false
              hasAudio = false
              setMediaPermissionDenied(true)
              setMediaError(finalError.message || 'Media access denied')
              toast.error('Camera and microphone access denied. You can still join the meeting.', { duration: 5000 })
            }
          }
        } else {
          throw audioError
        }
      }
      
      localStreamRef.current = stream
      
      if (localVideoRef.current && stream && hasVideo) {
        localVideoRef.current.srcObject = stream
        localVideoRef.current.muted = true
        try {
          await localVideoRef.current.play()
        } catch (playError) {
          console.warn('Video playback error:', playError)
        }
      }

      // Add current user as participant
      const currentUser: Participant = {
        id: user!.uid,
        name: user!.displayName || user!.email || 'Anonymous',
        avatar: user!.photoURL || undefined,
        isHost: true,
        isMuted: !hasAudio || isMuted,
        isVideoOff: !hasVideo || isVideoOff,
        isSpeaking: false,
        hasRaisedHand: false,
        stream: stream || undefined
      }

      // Add demo participants for local testing
      const demoParticipants: Participant[] = [
        currentUser,
        {
          id: 'demo-1',
          name: 'Demo Participant 1',
          isHost: false,
          isMuted: false,
          isVideoOff: false,
          isSpeaking: false,
          hasRaisedHand: false
        },
        {
          id: 'demo-2',
          name: 'Demo Participant 2',
          isHost: false,
          isMuted: true,
          isVideoOff: false,
          isSpeaking: true,
          hasRaisedHand: false
        }
      ]

      setParticipants(demoParticipants)
      await setupSocketConnection()

      // Check if TFJS model is loaded
      setTimeout(() => {
        if (!isModelLoaded()) {
          setModelMissing(true)
        }
      }, 2000)

      if (hasVideo || hasAudio) {
      toast.success('Joined meeting successfully!')
      } else {
        toast('Joined meeting without camera/microphone. You can still participate via captions.', {
          icon: 'ℹ️',
          duration: 5000
        })
      }
    } catch (error: any) {
      console.error('Error initializing meeting:', error)
      setMediaPermissionDenied(true)
      setMediaError(error.message || 'Failed to initialize meeting')
      toast.error('Failed to access media. You can still join without camera/microphone.', { duration: 5000 })
    } finally {
      setIsInitializing(false)
    }
  }

  // Media controls
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        const newMuted = !audioTrack.enabled
        setIsMuted(newMuted)
        
        setParticipants(prev => prev.map(p => 
          p.id === user?.uid ? { ...p, isMuted: newMuted } : p
        ))

        socketClientRef.current.toggleMic(newMuted)
      }
    }
  }, [user])

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        const newVideoOff = !videoTrack.enabled
        setIsVideoOff(newVideoOff)
        
        setParticipants(prev => prev.map(p => 
          p.id === user?.uid ? { ...p, isVideoOff: newVideoOff } : p
        ))

        socketClientRef.current.toggleCam(newVideoOff)
      }
    }
  }, [user])

  const toggleScreenShare = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      toast.error('Screen sharing not available. Please use HTTPS or a modern browser.')
      return
    }
    
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        })
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream
        }
        
        setIsScreenSharing(true)
        toast.success('Started screen sharing')
      } else {
        if (localStreamRef.current && localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current
        }
        setIsScreenSharing(false)
        toast.success('Stopped screen sharing')
      }
    } catch (error) {
      console.error('Error toggling screen share:', error)
      toast.error('Failed to toggle screen sharing')
    }
  }

  const toggleRaiseHand = useCallback(() => {
    const newRaised = !hasRaisedHand
    setHasRaisedHand(newRaised)
    
    setParticipants(prev => prev.map(p => 
      p.id === user?.uid ? { ...p, hasRaisedHand: newRaised } : p
    ))

    socketClientRef.current.raiseHand(newRaised)
  }, [hasRaisedHand, user])

  const leaveMeeting = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
    }
    socketClientRef.current.leaveMeeting()
    router.push('/')
  }

  const endMeeting = () => {
    socketClientRef.current.endMeeting()
    router.push('/')
  }

  // Caption handlers
  const addSignCaption = useCallback((text: string, confidence: number, source: 'template' | 'tfjs' | 'server' = 'template') => {
    const caption: Caption = {
      id: Date.now().toString() + '-sign',
      text,
      type: 'sign',
      confidence,
      timestamp: new Date(),
      source
    }
    setSignCaptions(prev => [...prev.slice(-2), caption])
    
    // Send to socket if enabled
    socketClientRef.current.sendCaption({
      text,
      type: 'sign',
      confidence,
      source,
      participantId: user?.uid || 'unknown'
    })
  }, [user])

  const addVoiceCaption = useCallback((text: string, confidence: number, source: 'webspeech' | 'asr' = 'asr') => {
    const caption: Caption = {
      id: Date.now().toString() + '-voice',
      text,
      type: 'voice',
      confidence,
      timestamp: new Date(),
      source
    }
    setVoiceCaptions(prev => [...prev.slice(-1), caption])
    
    // Send to socket if enabled
    socketClientRef.current.sendCaption({
      text,
      type: 'voice',
      confidence,
      source: 'asr',
      participantId: user?.uid || 'unknown'
    })
  }, [user])

  const handleCaptionCorrect = async (captionId: string, correctedText: string) => {
    try {
      const idToken = await user?.getIdToken()
      const response = await fetch('/api/corrections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          captionId,
          correctedText,
          meetingId
        })
      })

      if (response.ok) {
        toast.success('Correction sent')
      }
    } catch (error) {
      console.error('Error sending correction:', error)
    }
  }

  const handleTileClick = (participantId: string) => {
    if (spotlightId === participantId) {
      setSpotlightId(null)
    } else {
      setSpotlightId(participantId)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading meeting...</div>
      </div>
    )
  }

  const isHost = participants.find(p => p.id === user?.uid)?.isHost || false

  return (
    <MeetingLayout
      meetingId={meetingId}
      meetingTitle={`Meeting ${meetingId.substring(0, 8)}`}
      participantCount={participants.length}
      sidebar={
        showParticipants ? (
            <ParticipantList 
              participants={participants}
            isHost={isHost}
              onMuteParticipant={(id) => {
              socketClientRef.current.muteParticipant(id)
                setParticipants(prev => prev.map(p => 
                  p.id === id ? { ...p, isMuted: !p.isMuted } : p
                ))
              }}
              onKickParticipant={(id) => {
              socketClientRef.current.kickParticipant(id)
                setParticipants(prev => prev.filter(p => p.id !== id))
              }}
            />
        ) : null
      }
      footer={
        <MeetingControls
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isScreenSharing={isScreenSharing}
          showCaptions={showCaptions}
          showParticipants={showParticipants}
          isHost={isHost}
          hasRaisedHand={hasRaisedHand}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onToggleScreenShare={toggleScreenShare}
          onToggleCaptions={() => setShowCaptions(!showCaptions)}
          onToggleParticipants={() => setShowParticipants(!showParticipants)}
          onToggleRaiseHand={toggleRaiseHand}
          onOpenChat={() => {
            // TODO: Open chat panel
            toast('Chat feature coming soon', { icon: 'ℹ️' })
          }}
          onLeaveMeeting={leaveMeeting}
          onEndMeeting={endMeeting}
        />
      }
    >
      {/* Hidden sign detector (or visible small canvas) */}
      <div ref={signDetectorHiddenRef} className="absolute top-4 left-4 w-0 h-0 overflow-hidden">
        <MediaPipeSignDetector
          onCaption={addSignCaption}
          options={{
            windowSize: 32,
            confidenceThreshold: 0.85,
            enableServerFallback: true,
            autoSendToServer: true
              }}
            />
          </div>

      {/* Hidden speech recognition */}
      <div className="absolute top-4 right-4 w-0 h-0 overflow-hidden">
        <SpeechRecognition
          onTranscript={addVoiceCaption}
          language="en"
          enabled={true}
          useServerASR={false}
        />
      </div>

      {/* Video Grid */}
      <VideoGrid
        participants={participants}
        localVideoRef={localVideoRef}
        localParticipantId={user?.uid}
        activeSpeakerId={activeSpeakerId || undefined}
        spotlightId={spotlightId || undefined}
        onTileClick={handleTileClick}
      />

      {/* Model Missing Banner */}
      <AnimatePresence>
        {modelMissing && !isModelLoaded() && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 shadow-lg z-50 max-w-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-yellow-800">
                  Sign model not loaded — captions will be audio-only.
                </span>
              </div>
              <button
                onClick={() => {
                  // TODO: Install sample model
                  toast('Model installation coming soon', { icon: 'ℹ️' })
                }}
                className="ml-4 text-sm text-yellow-700 hover:text-yellow-900 underline"
              >
                Install sample model
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Permission Error Banner */}
      <AnimatePresence>
        {mediaPermissionDenied && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 shadow-lg z-50 max-w-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-sm text-orange-800">
                  {mediaError || 'Microphone/camera access denied'}
                  <br />
                  <span className="text-xs text-orange-600">
                    You can still join and participate. Check browser permissions to enable audio/video.
                  </span>
                </span>
              </div>
              <button
                onClick={() => {
                  setMediaPermissionDenied(false)
                  setMediaError(null)
                  if (localStreamRef.current) {
                    localStreamRef.current.getTracks().forEach(track => track.stop())
                    localStreamRef.current = null
                  }
                  initializeMeeting()
                }}
                disabled={isInitializing}
                className="ml-4 px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isInitializing ? 'Retrying...' : 'Retry'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Captions Panel */}
      {showCaptions && (
        <CaptionsPanel
          signCaptions={signCaptions}
          voiceCaptions={voiceCaptions}
          onCorrect={handleCaptionCorrect}
        />
      )}
    </MeetingLayout>
  )
}
