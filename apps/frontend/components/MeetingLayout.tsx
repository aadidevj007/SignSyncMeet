'use client'

import React, { ReactNode } from 'react'
import TopHeader from './TopHeader'

interface MeetingLayoutProps {
  meetingId: string
  meetingTitle?: string
  participantCount?: number
  children: ReactNode
  sidebar?: ReactNode
  footer?: ReactNode
}

/**
 * Google Meet-style meeting layout
 * Top header + Center content area + Right sidebar + Bottom controls
 */
export default function MeetingLayout({
  meetingId,
  meetingTitle,
  participantCount,
  children,
  sidebar,
  footer
}: MeetingLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Top Header */}
      <TopHeader
        meetingId={meetingId}
        meetingTitle={meetingTitle}
        participantCount={participantCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Center: Video Grid */}
        <div className="flex-1 relative bg-gray-100 overflow-hidden">
          {children}
        </div>

        {/* Right Sidebar */}
        {sidebar && (
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
            {sidebar}
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      {footer && (
        <div className="bg-white border-t border-gray-200 py-4 px-6 flex items-center justify-center">
          {footer}
        </div>
      )}
    </div>
  )
}
