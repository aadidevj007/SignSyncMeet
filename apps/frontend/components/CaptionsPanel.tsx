'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Edit3, Check, X, Server, ChevronDown, ChevronUp, Settings } from 'lucide-react'

export interface Caption {
  id: string
  text: string
  type: 'sign' | 'voice'
  confidence: number
  timestamp: Date
  source?: 'template' | 'tfjs' | 'server' | 'webspeech' | 'asr' | 'local'
  isVerifying?: boolean
}

interface CaptionsPanelProps {
  signCaptions?: Caption[]
  voiceCaptions?: Caption[]
  onCorrect?: (captionId: string, correctedText: string) => void
  className?: string
}

/**
 * Google Meet-style floating captions panel
 * Left-bottom pinned with Sign (large) and Voice (smaller) lanes
 */
export default function CaptionsPanel({
  signCaptions = [],
  voiceCaptions = [],
  onCorrect,
  className = ''
}: CaptionsPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [showSignCaptions, setShowSignCaptions] = useState(true)
  const [showVoiceCaptions, setShowVoiceCaptions] = useState(true)
  const panelRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new captions arrive
  useEffect(() => {
    if (panelRef.current && !isCollapsed) {
      panelRef.current.scrollTop = panelRef.current.scrollHeight
    }
  }, [signCaptions, voiceCaptions, isCollapsed])

  const handleEdit = (caption: Caption) => {
    setEditingId(caption.id)
    setEditText(caption.text)
  }

  const handleSave = async () => {
    if (editingId && onCorrect && editText.trim()) {
      await onCorrect(editingId, editText.trim())
    }
    setEditingId(null)
    setEditText('')
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditText('')
  }

  if (isCollapsed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`fixed bottom-24 left-6 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-40 ${className}`}
      >
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center space-x-2 text-sm text-gray-700 hover:text-gray-900"
          aria-label="Expand captions"
        >
          <ChevronUp className="w-4 h-4" />
          <span>Captions</span>
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`fixed bottom-24 left-6 bg-white rounded-2xl shadow-xl border border-gray-200 w-96 max-w-[calc(100vw-3rem)] z-40 flex flex-col max-h-[400px] ${className}`}
      ref={panelRef}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-semibold text-gray-900">Captions</h3>
          {(signCaptions.length > 0 || voiceCaptions.length > 0) && (
            <span className="text-xs text-gray-500">
              ({signCaptions.length + voiceCaptions.length})
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Caption settings"
          >
            <Settings className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Collapse captions"
          >
            <ChevronDown className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Settings Dropdown */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-gray-200 px-4 py-2 bg-gray-50"
          >
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={showSignCaptions}
                  onChange={(e) => setShowSignCaptions(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">Show sign captions</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={showVoiceCaptions}
                  onChange={(e) => setShowVoiceCaptions(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">Show voice captions</span>
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Captions Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4" aria-live="polite" aria-atomic="true">
        {/* Sign Captions Lane - Large */}
        {showSignCaptions && (
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-cyan-500 rounded-full" />
              <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                Sign Captions
              </h4>
            </div>
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {signCaptions.slice(-3).map((caption) => (
                  <motion.div
                    key={caption.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="group relative bg-cyan-50 rounded-lg p-3 border-l-4 border-cyan-500"
                  >
                    {editingId === caption.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="flex-1 px-2 py-1 border border-cyan-500 rounded text-gray-900 text-lg font-semibold bg-white"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave()
                            if (e.key === 'Escape') handleCancel()
                          }}
                        />
                        <button
                          onClick={handleSave}
                          className="p-1 text-green-600 hover:text-green-700"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancel}
                          className="p-1 text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-xl font-bold text-gray-900 mb-1">
                          {caption.text}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-600">
                          <span className={`px-2 py-0.5 rounded ${
                            caption.confidence >= 0.85 ? 'bg-green-100 text-green-700' :
                            caption.confidence >= 0.70 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {Math.round(caption.confidence * 100)}%
                          </span>
                          {caption.source === 'server' && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded flex items-center space-x-1">
                              <Server className="w-3 h-3" />
                              <span>Verified</span>
                            </span>
                          )}
                          {caption.isVerifying && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded animate-pulse">
                              Verifying...
                            </span>
                          )}
                        </div>
                        {onCorrect && (
                          <button
                            onClick={() => handleEdit(caption)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-cyan-100 rounded"
                            aria-label="Correct caption"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-cyan-700" />
                          </button>
                        )}
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              {signCaptions.length === 0 && (
                <p className="text-sm text-gray-400 italic text-center py-4">
                  No sign language detected yet
                </p>
              )}
            </div>
          </div>
        )}

        {/* Voice Captions Lane - Smaller */}
        {showVoiceCaptions && (
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                Voice Captions
              </h4>
            </div>
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {voiceCaptions.slice(-2).map((caption) => (
                  <motion.div
                    key={caption.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="group relative bg-emerald-50 rounded-lg p-2.5 border-l-4 border-emerald-500"
                  >
                    {editingId === caption.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="flex-1 px-2 py-1 border border-emerald-500 rounded text-gray-900 text-sm font-medium bg-white"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave()
                            if (e.key === 'Escape') handleCancel()
                          }}
                        />
                        <button
                          onClick={handleSave}
                          className="p-1 text-green-600 hover:text-green-700"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={handleCancel}
                          className="p-1 text-red-600 hover:text-red-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          {caption.text}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-600">
                          <span className={`px-2 py-0.5 rounded ${
                            caption.confidence >= 0.85 ? 'bg-green-100 text-green-700' :
                            caption.confidence >= 0.70 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {Math.round(caption.confidence * 100)}%
                          </span>
                          {caption.source === 'asr' && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                              ASR
                            </span>
                          )}
                        </div>
                        {onCorrect && (
                          <button
                            onClick={() => handleEdit(caption)}
                            className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-emerald-100 rounded"
                            aria-label="Correct caption"
                          >
                            <Edit3 className="w-3 h-3 text-emerald-700" />
                          </button>
                        )}
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              {voiceCaptions.length === 0 && (
                <p className="text-xs text-gray-400 italic text-center py-2">
                  No speech detected yet
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
