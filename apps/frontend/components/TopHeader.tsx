'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings,
  HelpCircle,
  User,
  LogOut,
  AlertCircle,
  Keyboard,
  Info,
  Sun,
  Moon
} from 'lucide-react'
import Logo from './Logo'
import { useAuth } from '@/lib/auth-context'
import { useTheme } from '@/lib/theme-context'
import { useRouter } from 'next/navigation'

interface TopHeaderProps {
  meetingId: string
  meetingTitle?: string
  participantCount?: number
}

export default function TopHeader({
  meetingId,
  meetingTitle,
  participantCount = 0
}: TopHeaderProps) {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <header className="h-14 bg-white dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 z-50 relative">
      {/* Left: Logo */}
      <div className="flex items-center space-x-4 flex-shrink-0">
        <Logo size="sm" />
        <div className="h-6 w-px bg-gray-300" />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {meetingTitle || `Meeting ${meetingId.substring(0, 8)}`}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
          </span>
        </div>
      </div>

      {/* Center: Meeting Info & Actions */}
      <div className="flex-1 flex items-center justify-center space-x-2">
        <button
          className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          onClick={() => setShowKeyboardShortcuts(true)}
        >
          Keyboard shortcuts
        </button>
        <div className="h-4 w-px bg-gray-300 dark:bg-gray-700" />
        <button
          className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          onClick={() => router.push('/contact')}
        >
          Help & Support
        </button>
      </div>

      {/* Right: User Avatar & Menu */}
      <div className="flex items-center space-x-2 flex-shrink-0">
        {/* Theme Toggle */}
        <button
          className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          aria-label="Toggle theme"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>

        <button
          className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          aria-label="Settings"
          onClick={() => router.push('/profile')}
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
        
        <button
          className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          aria-label="Help"
          onClick={() => router.push('/contact')}
          title="Help & Support"
        >
          <HelpCircle className="w-5 h-5" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center space-x-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            aria-label="User menu"
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
          </button>

          {/* Profile Dropdown */}
          <AnimatePresence>
            {showProfileMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowProfileMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
                >
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {user?.displayName || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user?.email}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => {
                      setShowProfileMenu(false)
                      setShowKeyboardShortcuts(true)
                    }}
                    className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <Keyboard className="w-4 h-4" />
                    <span>Keyboard shortcuts</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowProfileMenu(false)
                      router.push('/profile')
                    }}
                    className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <User className="w-4 h-4" />
                    <span>My account</span>
                  </button>
                  
                  <div className="border-t border-gray-100 my-1" />
                  
                  <button
                    onClick={handleSignOut}
                    className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      <AnimatePresence>
        {showKeyboardShortcuts && (
          <>
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => setShowKeyboardShortcuts(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Keyboard shortcuts</h2>
                <button
                  onClick={() => setShowKeyboardShortcuts(false)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Toggle microphone</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-900 dark:text-gray-100">M</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Toggle camera</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-900 dark:text-gray-100">V</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Raise hand</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-900 dark:text-gray-100">R</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Toggle captions</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-900 dark:text-gray-100">C</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Leave meeting</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-900 dark:text-gray-100">L</kbd>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}

