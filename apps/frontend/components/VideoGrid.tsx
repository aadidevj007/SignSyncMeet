'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import VideoTile from './VideoTile'

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

interface VideoGridProps {
  participants: Participant[]
  localVideoRef: React.RefObject<HTMLVideoElement>
  localParticipantId?: string
  activeSpeakerId?: string
  spotlightId?: string
  onTileClick?: (participantId: string) => void
}

/**
 * Google Meet-style video grid
 * Auto-resizes based on participant count:
 * - 1: center big tile
 * - 2: side-by-side
 * - 3-4: 2x2 grid
 * - 5-9: 3x3 grid
 * - 10+: paginated with scroll
 */
export default function VideoGrid({
  participants,
  localVideoRef,
  localParticipantId,
  activeSpeakerId,
  spotlightId,
  onTileClick
}: VideoGridProps) {
  const gridConfig = useMemo(() => {
    const count = participants.length
    
    if (count === 0) return { cols: 1, rows: 1, class: 'grid-cols-1' }
    if (count === 1) return { cols: 1, rows: 1, class: 'grid-cols-1' }
    if (count === 2) return { cols: 2, rows: 1, class: 'grid-cols-2' }
    if (count <= 4) return { cols: 2, rows: 2, class: 'grid-cols-2' }
    if (count <= 9) return { cols: 3, rows: 3, class: 'grid-cols-3' }
    return { cols: 3, rows: Math.ceil(count / 3), class: 'grid-cols-3' }
  }, [participants.length])

  const spotlightParticipant = spotlightId
    ? participants.find(p => p.id === spotlightId)
    : null

  const gridParticipants = spotlightParticipant
    ? [spotlightParticipant]
    : participants

  return (
    <div className="h-full w-full p-4 overflow-auto bg-gray-100">
      {spotlightParticipant ? (
        // Spotlight mode: single large tile
        <div className="h-full flex items-center justify-center">
          <div className="w-full max-w-7xl aspect-video">
            <VideoTile
              participant={spotlightParticipant}
              isActiveSpeaker={true}
              isSpotlight={true}
              localVideoRef={spotlightParticipant.id === localParticipantId ? localVideoRef : undefined}
              index={0}
              onTileClick={() => onTileClick?.(spotlightParticipant.id)}
            />
          </div>
        </div>
      ) : (
        // Grid mode
        <div
          className={`grid ${gridConfig.class} gap-4 h-full auto-rows-fr ${
            participants.length > 9 ? 'pb-4' : ''
          }`}
        >
          {gridParticipants.map((participant, index) => (
            <VideoTile
              key={participant.id}
              participant={participant}
              isActiveSpeaker={participant.id === activeSpeakerId}
              isSpotlight={false}
              localVideoRef={participant.id === localParticipantId ? localVideoRef : undefined}
              index={index}
              onTileClick={() => onTileClick?.(participant.id)}
            />
          ))}
        </div>
      )}
      
      {/* Empty State */}
      {participants.length === 0 && (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">Waiting for participants to join...</p>
          </div>
        </div>
      )}
    </div>
  )
}
