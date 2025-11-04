'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  Share2,
  Hand,
  MessageSquare,
  Users,
  Subtitles,
  MoreVertical,
  AlertTriangle,
  Check
} from 'lucide-react'
import toast from 'react-hot-toast'

interface MeetingControlsProps {
  isMuted: boolean
  isVideoOff: boolean
  isScreenSharing: boolean
  showCaptions: boolean
  showParticipants: boolean
  isHost: boolean
  hasRaisedHand: boolean
  onToggleMute: () => void
  onToggleVideo: () => void
  onToggleScreenShare: () => void
  onToggleCaptions: () => void
  onToggleParticipants: () => void
  onToggleRaiseHand: () => void
  onOpenChat: () => void
  onLeaveMeeting: () => void
  onEndMeeting?: () => void
}

/**
 * Google Meet-style bottom control bar
 * Large circular buttons with icon labels
 */
export default function MeetingControls({
  isMuted,
  isVideoOff,
  isScreenSharing,
  showCaptions,
  showParticipants,
  isHost,
  hasRaisedHand,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleCaptions,
  onToggleParticipants,
  onToggleRaiseHand,
  onOpenChat,
  onLeaveMeeting,
  onEndMeeting
}: MeetingControlsProps) {
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key.toLowerCase()) {
        case 'm':
          e.preventDefault()
          onToggleMute()
          break
        case 'v':
          e.preventDefault()
          onToggleVideo()
          break
        case 'r':
          e.preventDefault()
          onToggleRaiseHand()
          break
        case 'c':
          e.preventDefault()
          onToggleCaptions()
          break
        case 'l':
          e.preventDefault()
          if (isHost) {
            setShowEndConfirm(true)
          } else {
            setShowLeaveConfirm(true)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [onToggleMute, onToggleVideo, onToggleRaiseHand, onToggleCaptions, isHost])

  const ControlButton = ({
    icon: Icon,
    label,
    onClick,
    isActive = false,
    isDanger = false,
    className = '',
    disabled = false
  }: {
    icon: React.ComponentType<{ className?: string }>
    label: string
    onClick: () => void
    isActive?: boolean
    isDanger?: boolean
    disabled?: boolean
    className?: string
  }) => (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center space-y-1.5 px-4 py-2 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
        isDanger
          ? 'hover:bg-red-50'
          : isActive
          ? 'bg-blue-50 hover:bg-blue-100'
          : 'hover:bg-gray-100'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      aria-label={label}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center ${
          isDanger
            ? 'bg-red-600'
            : isActive
            ? 'bg-blue-600'
            : 'bg-gray-600'
        }`}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>
      <span className={`text-xs ${isDanger ? 'text-red-600' : 'text-gray-700'}`}>
        {label}
      </span>
    </motion.button>
  )

  return (
    <>
      <div className="flex items-center space-x-2">
        {/* Toggle Microphone */}
        <ControlButton
          icon={isMuted ? MicOff : Mic}
          label={isMuted ? 'Unmute' : 'Mute'}
        onClick={onToggleMute}
          isActive={!isMuted}
        />

        {/* Toggle Camera */}
        <ControlButton
          icon={isVideoOff ? VideoOff : Video}
          label={isVideoOff ? 'Turn on' : 'Turn off'}
        onClick={onToggleVideo}
          isActive={!isVideoOff}
        />

        {/* Captions Toggle */}
        <ControlButton
          icon={Subtitles}
          label="Captions"
          onClick={onToggleCaptions}
          isActive={showCaptions}
        />

      {/* Screen Share */}
        <ControlButton
          icon={Share2}
          label="Present now"
        onClick={onToggleScreenShare}
          isActive={isScreenSharing}
        />

      {/* Raise Hand */}
        <ControlButton
          icon={Hand}
          label="Raise hand"
        onClick={onToggleRaiseHand}
          isActive={hasRaisedHand}
        />

        {/* Participants */}
        <ControlButton
          icon={Users}
          label="People"
          onClick={onToggleParticipants}
          isActive={showParticipants}
        />

      {/* Chat */}
        <ControlButton
          icon={MessageSquare}
          label="Chat"
        onClick={onOpenChat}
        />

      {/* More Options */}
        <ControlButton
          icon={MoreVertical}
          label="More options"
          onClick={() => {
            // Open settings or more options menu
            toast('More options: Settings, Recording, and other features', { icon: 'ℹ️' })
          }}
        />

        {/* Leave/End Meeting */}
        <ControlButton
          icon={Phone}
          label={isHost ? 'End' : 'Leave'}
          onClick={() => {
            if (isHost) {
              setShowEndConfirm(true)
            } else {
              setShowLeaveConfirm(true)
            }
          }}
          isDanger={true}
        />
      </div>

      {/* Leave Meeting Confirmation */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <>
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => setShowLeaveConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm z-50"
            >
              <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
                Leave meeting?
              </h3>
              <p className="text-sm text-gray-600 text-center mb-6">
                You'll need to be invited again to rejoin.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowLeaveConfirm(false)
                    onLeaveMeeting()
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Leave
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* End Meeting Confirmation */}
      <AnimatePresence>
        {showEndConfirm && (
          <>
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => setShowEndConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm z-50"
            >
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
                End meeting for everyone?
              </h3>
              <p className="text-sm text-gray-600 text-center mb-6">
                This will end the meeting for all participants.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowEndConfirm(false)
                    onEndMeeting?.()
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  End meeting
                </button>
    </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
