/**
 * Socket.IO client for meeting signaling
 * Handles participant management, captions, and meeting events
 */

import { io, Socket } from 'socket.io-client'

export interface Participant {
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

export interface CaptionEvent {
  id: string
  text: string
  type: 'sign' | 'voice'
  confidence: number
  source: 'local' | 'server' | 'asr'
  participantId: string
  timestamp: Date
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

let socketInstance: Socket | null = null

export function createSocketClient() {
  return {
    socket: socketInstance,
    
    connect(meetingId: string, token: string) {
      if (socketInstance?.connected) {
        console.log('Socket already connected')
        return
      }

      socketInstance = io(BACKEND_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      })

      socketInstance.on('connect', () => {
        console.log('Socket connected:', socketInstance?.id)
        socketInstance?.emit('join-meeting', { meetingId })
      })

      socketInstance.on('disconnect', () => {
        console.log('Socket disconnected')
      })

      socketInstance.on('error', (error) => {
        console.error('Socket error:', error)
      })

      socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error)
      })
    },

    disconnect() {
      if (socketInstance) {
        socketInstance.disconnect()
        socketInstance = null
      }
    },

    // Meeting Events
    joinMeeting(meetingId: string) {
      if (socketInstance?.connected) {
        socketInstance.emit('join-meeting', { meetingId })
      }
    },

    leaveMeeting() {
      if (socketInstance?.connected) {
        socketInstance.emit('leave-meeting')
      }
    },

    endMeeting() {
      if (socketInstance?.connected) {
        socketInstance.emit('end-meeting')
      }
    },

    // Media Controls
    toggleMic(isMuted: boolean) {
      if (socketInstance?.connected) {
        socketInstance.emit('toggle-mic', { muted: isMuted })
      }
    },

    toggleCam(isVideoOff: boolean) {
      if (socketInstance?.connected) {
        socketInstance.emit('toggle-cam', { videoOff: isVideoOff })
      }
    },

    raiseHand(raised: boolean) {
      if (socketInstance?.connected) {
        socketInstance.emit('raise-hand', { raised })
      }
    },

    // Captions
    sendCaption(caption: Omit<CaptionEvent, 'id' | 'timestamp'>) {
      if (socketInstance?.connected) {
        socketInstance.emit('caption', {
          ...caption,
          timestamp: new Date().toISOString()
        })
      }
    },

    // Host Actions
    muteParticipant(participantId: string) {
      if (socketInstance?.connected) {
        socketInstance.emit('mute-participant', { participantId })
      }
    },

    kickParticipant(participantId: string) {
      if (socketInstance?.connected) {
        socketInstance.emit('kick-participant', { participantId })
      }
    },

    // Event Listeners
    on(event: string, callback: (data: any) => void) {
      if (socketInstance) {
        socketInstance.on(event, callback)
      }
    },

    off(event: string, callback?: (data: any) => void) {
      if (socketInstance) {
        if (callback) {
          socketInstance.off(event, callback)
        } else {
          socketInstance.off(event)
        }
      }
    },

    // Typed Event Helpers
    onParticipants(callback: (participants: Participant[]) => void) {
      this.on('participants-update', callback)
    },

    onParticipantJoined(callback: (participant: Participant) => void) {
      this.on('user-joined', callback)
    },

    onParticipantLeft(callback: (participantId: string) => void) {
      this.on('user-left', callback)
    },

    onActiveSpeaker(callback: (participantId: string) => void) {
      this.on('active-speaker', callback)
    },

    onCaption(callback: (caption: CaptionEvent) => void) {
      this.on('caption', (data) => {
        callback({
          ...data,
          timestamp: new Date(data.timestamp)
        })
      })
    },

    onMeetingEnded(callback: () => void) {
      this.on('meeting-ended', callback)
    },

    onError(callback: (error: { message: string }) => void) {
      this.on('error', callback)
    }
  }
}

export function getSocketInstance(): Socket | null {
  return socketInstance
}

export type SocketClient = ReturnType<typeof createSocketClient>
