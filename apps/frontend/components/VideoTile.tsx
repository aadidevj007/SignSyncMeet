'use client'

import React, { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { User, Mic, MicOff, Video, VideoOff, Hand, Crown } from 'lucide-react'

interface Participant {
  id: string
  name: string
  avatar?: string
  isHost: boolean
  isMuted: boolean
  isVideoOff: boolean
  isSpeaking: boolean
  hasRaisedHand: boolean
  stream?: MediaStream
}

interface VideoTileProps {
  participant: Participant
  isActiveSpeaker?: boolean
  isSpotlight?: boolean
  localVideoRef?: React.RefObject<HTMLVideoElement>
  index: number
  onTileClick?: () => void
}

export default function VideoTile({
  participant,
  isActiveSpeaker = false,
  isSpotlight = false,
  localVideoRef,
  index,
  onTileClick
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [audioLevel, setAudioLevel] = useState(0)

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream
    }
  }, [participant.stream])

  // Audio level detection for speaking indicator
  useEffect(() => {
    if (!participant.stream || participant.isMuted) {
      setAudioLevel(0)
      return
    }

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const analyser = audioContext.createAnalyser()
    const microphone = audioContext.createMediaStreamSource(participant.stream)
    
    analyser.fftSize = 256
    microphone.connect(analyser)

    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    
    const updateAudioLevel = () => {
      analyser.getByteFrequencyData(dataArray)
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length
      setAudioLevel(average / 255)
    }

    const interval = setInterval(updateAudioLevel, 100)

    return () => {
      clearInterval(interval)
      audioContext.close()
    }
  }, [participant.stream, participant.isMuted])

  const isSpeaking = isActiveSpeaker || audioLevel > 0.1 || participant.isSpeaking

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className={`relative bg-gray-900 rounded-2xl overflow-hidden ${
        isSpotlight ? 'ring-4 ring-blue-500' : ''
      } ${isSpeaking ? 'ring-2 ring-green-500' : ''}`}
      onClick={onTileClick}
    >
      {/* Video or Avatar */}
      <div className="relative w-full h-full aspect-video">
        {participant.isVideoOff ? (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            {participant.avatar ? (
              <img
                src={participant.avatar}
                alt={participant.name}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <User className="w-12 h-12 text-white" />
              </div>
            )}
          </div>
        ) : (
          <video
            ref={localVideoRef || videoRef}
            autoPlay
            muted={true}
            playsInline
            className="w-full h-full object-cover"
          />
        )}

        {/* Speaking Indicator (Green Ring) */}
        {isSpeaking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 ring-4 ring-green-500 rounded-2xl pointer-events-none"
            style={{ ringWidth: 4 }}
          />
        )}

        {/* Bottom Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <span className="text-white text-sm font-medium truncate">
                {participant.name}
              </span>
              {participant.isHost && (
                <Crown className="w-4 h-4 text-yellow-400 flex-shrink-0" />
              )}
            </div>
            
            <div className="flex items-center space-x-1.5 flex-shrink-0">
              {participant.hasRaisedHand && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="bg-yellow-500 p-1 rounded"
                >
                  <Hand className="w-3.5 h-3.5 text-black" />
                </motion.div>
              )}
              
              <div className={`p-1 rounded ${participant.isMuted ? 'bg-red-500' : 'bg-black/50'}`}>
                {participant.isMuted ? (
                  <MicOff className="w-3.5 h-3.5 text-white" />
                ) : (
                  <Mic className="w-3.5 h-3.5 text-white" />
                )}
              </div>
              
              {participant.isVideoOff && (
                <div className="bg-black/50 p-1 rounded">
                  <VideoOff className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active Speaker Badge */}
        {isActiveSpeaker && !isSpotlight && (
          <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            <span>Speaking</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

