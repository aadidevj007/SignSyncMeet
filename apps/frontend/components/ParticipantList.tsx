'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Mic, MicOff, Video, VideoOff, Hand, Crown, UserX, MoreVertical, Search } from 'lucide-react'

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

interface ParticipantListProps {
  participants: Participant[]
  isHost: boolean
  onMuteParticipant?: (id: string) => void
  onKickParticipant?: (id: string) => void
}

/**
 * Google Meet-style participant list sidebar
 * Search, filter, and manage participants
 */
export default function ParticipantList({ 
  participants,
  isHost,
  onMuteParticipant,
  onKickParticipant
}: ParticipantListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null)

  const filteredParticipants = participants.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const speakingCount = participants.filter(p => p.isSpeaking).length
  const handsRaisedCount = participants.filter(p => p.hasRaisedHand).length

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900">
            People ({participants.length})
          </h3>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search participants"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Stats */}
      {(speakingCount > 0 || handsRaisedCount > 0) && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center space-x-4 text-xs text-gray-600">
          {speakingCount > 0 && (
            <span>{speakingCount} {speakingCount === 1 ? 'person is' : 'people are'} speaking</span>
          )}
          {handsRaisedCount > 0 && (
            <span>{handsRaisedCount} {handsRaisedCount === 1 ? 'hand' : 'hands'} raised</span>
          )}
        </div>
      )}

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto">
        {filteredParticipants.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            {searchQuery ? 'No participants found' : 'No participants'}
          </div>
        ) : (
          filteredParticipants.map((participant, index) => (
            <motion.div
              key={participant.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
              className={`px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                selectedParticipant === participant.id ? 'bg-blue-50' : ''
              }`}
              onClick={() => setSelectedParticipant(
                selectedParticipant === participant.id ? null : participant.id
              )}
            >
              <div className="flex items-center space-x-3">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {participant.avatar ? (
                    <img
                      src={participant.avatar}
                      alt={participant.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  )}
                  
                  {/* Speaking Indicator */}
                  {participant.isSpeaking && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </div>

                {/* Participant Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {participant.name}
                    </p>
                    {participant.isHost && (
                      <Crown className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-0.5">
                    <div className="flex items-center space-x-1">
                      {participant.isMuted ? (
                        <MicOff className="w-3 h-3 text-gray-400" />
                      ) : (
                        <Mic className="w-3 h-3 text-gray-400" />
                      )}
                      {participant.isVideoOff && (
                        <VideoOff className="w-3 h-3 text-gray-400" />
                      )}
                      {participant.hasRaisedHand && (
                        <Hand className="w-3 h-3 text-yellow-500" />
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {participant.isSpeaking ? 'Speaking' : 
                       participant.hasRaisedHand ? 'Hand raised' :
                       participant.isMuted ? 'Muted' : 'Active'}
                    </span>
                  </div>
                </div>

                {/* Actions Menu */}
                {isHost && !participant.isHost && (
                  <AnimatePresence>
                    {selectedParticipant === participant.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex items-center space-x-1"
                      >
                        {onMuteParticipant && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onMuteParticipant(participant.id)
                              setSelectedParticipant(null)
                            }}
                            className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
                            aria-label={participant.isMuted ? 'Unmute' : 'Mute'}
                            title={participant.isMuted ? 'Unmute' : 'Mute'}
                          >
                            {participant.isMuted ? (
                              <Mic className="w-4 h-4 text-gray-700" />
                            ) : (
                              <MicOff className="w-4 h-4 text-gray-700" />
                            )}
                          </button>
                        )}
                        {onKickParticipant && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onKickParticipant(participant.id)
                              setSelectedParticipant(null)
                            }}
                            className="p-1.5 hover:bg-red-100 rounded-full transition-colors text-red-600"
                            aria-label="Remove participant"
                            title="Remove participant"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        )}
                      </motion.div>
                    )}
                    {selectedParticipant !== participant.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedParticipant(participant.id)
                        }}
                        className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
                        aria-label="More options"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                      </button>
                    )}
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
