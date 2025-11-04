import { Server, Socket } from 'socket.io'
import { verifyIdToken } from './firebase'
import { getRouter, createTransport, createProducer, createConsumer, isMediaSoupReady } from './mediasoup'
import Meeting from '../models/Meeting'
import Transcript from '../models/Transcript'

interface AuthenticatedSocket extends Socket {
  user?: {
    uid: string
    email: string
    displayName?: string
  }
  meetingId?: string
  transport?: any
  producers?: Map<string, any>
  consumers?: Map<string, any>
}

export const setupSocketHandlers = (io: Server) => {
  // Authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token
      if (!token) {
        return next(new Error('Authentication error'))
      }

      const decodedToken = await verifyIdToken(token)
      ;(socket as any).user = {
        uid: decodedToken.uid,
        email: decodedToken.email || '',
        displayName: decodedToken.name
      }
      next()
    } catch (error) {
      next(new Error('Authentication error'))
    }
  })

  io.on('connection', (socket: Socket) => {
    console.log(`User ${(socket as any).user?.uid} connected`)

    // Join meeting
    socket.on('join-meeting', async (data: { meetingId: string }) => {
      try {
        const { meetingId } = data
        const userId = (socket as any).user?.uid

        if (!userId) {
          socket.emit('error', { message: 'User not authenticated' })
          return
        }

        // Check if meeting exists
        const meeting = await Meeting.findOne({ meetingId })
        if (!meeting) {
          socket.emit('error', { message: 'Meeting not found' })
          return
        }

        // Join socket room
        socket.join(meetingId)
        ;(socket as any).meetingId = meetingId

        // Create MediaSoup transport only if MediaSoup is available
        if (isMediaSoupReady()) {
          const transport = await createTransport('send')
          ;(socket as any).transport = transport

          // Initialize producers and consumers maps
          ;(socket as any).producers = new Map()
          ;(socket as any).consumers = new Map()

          // Send transport parameters to client
          socket.emit('transport-created', {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters
          })
        } else {
          // MediaSoup not available - use basic WebRTC or peer-to-peer
          console.log('MediaSoup not available, using basic connection')
          socket.emit('transport-created', {
            basic: true,
            message: 'MediaSoup not available, using basic WebRTC'
          })
        }

        // Notify other participants
        socket.to(meetingId).emit('user-joined', {
          userId,
          name: (socket as any).user?.displayName
        })

        console.log(`User ${userId} joined meeting ${meetingId}`)
      } catch (error) {
        console.error('Join meeting error:', error)
        socket.emit('error', { message: 'Failed to join meeting' })
      }
    })

    // Handle transport connect
    socket.on('transport-connect', async (data: { dtlsParameters: any }) => {
      try {
        if (!isMediaSoupReady()) {
          socket.emit('transport-connected')
          return
        }
        
        if (!(socket as any).transport) {
          socket.emit('error', { message: 'No transport available' })
          return
        }

        await (socket as any).transport.connect({ dtlsParameters: data.dtlsParameters })
        socket.emit('transport-connected')
      } catch (error) {
        console.error('Transport connect error:', error)
        socket.emit('error', { message: 'Failed to connect transport' })
      }
    })

    // Handle new producer
    socket.on('new-producer', async (data: { kind: string, rtpParameters: any }) => {
      try {
        if (!isMediaSoupReady()) {
          socket.emit('error', { message: 'MediaSoup not available' })
          return
        }
        
        if (!(socket as any).transport || !(socket as any).meetingId) {
          socket.emit('error', { message: 'No transport or meeting available' })
          return
        }

        const producer = await createProducer((socket as any).transport, data.kind, data.rtpParameters)
        ;(socket as any).producers?.set(producer.id, producer)

        // Notify other participants
        socket.to((socket as any).meetingId).emit('new-producer', {
          producerId: producer.id,
          kind: producer.kind,
          userId: (socket as any).user?.uid
        })

        console.log(`New ${data.kind} producer created: ${producer.id}`)
      } catch (error) {
        console.error('New producer error:', error)
        socket.emit('error', { message: 'Failed to create producer' })
      }
    })

    // Handle new consumer
    socket.on('consume', async (data: { producerId: string, rtpCapabilities: any }) => {
      try {
        if (!isMediaSoupReady()) {
          socket.emit('error', { message: 'MediaSoup not available' })
          return
        }
        
        if (!(socket as any).transport || !(socket as any).meetingId) {
          socket.emit('error', { message: 'No transport or meeting available' })
          return
        }

        const consumer = await createConsumer((socket as any).transport, data.producerId, data.rtpCapabilities)
        ;(socket as any).consumers?.set(consumer.id, consumer)

        socket.emit('consumer-created', {
          id: consumer.id,
          producerId: consumer.producerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters
        })

        console.log(`Consumer created: ${consumer.id}`)
      } catch (error) {
        console.error('Consume error:', error)
        socket.emit('error', { message: 'Failed to create consumer' })
      }
    })

    // Handle consumer resume
    socket.on('consumer-resume', async (data: { consumerId: string }) => {
      try {
        if (!isMediaSoupReady()) {
          socket.emit('error', { message: 'MediaSoup not available' })
          return
        }
        
        const consumer = (socket as any).consumers?.get(data.consumerId)
        if (consumer) {
          await consumer.resume()
          socket.emit('consumer-resumed', { consumerId: data.consumerId })
        }
      } catch (error) {
        console.error('Consumer resume error:', error)
        socket.emit('error', { message: 'Failed to resume consumer' })
      }
    })

    // Handle sign language detection
    socket.on('sign-detected', async (data: { text: string, confidence: number, landmarks: any[] }) => {
      try {
        if (!(socket as any).meetingId || !(socket as any).user?.uid) {
          return
        }

        // Save transcript
        const transcript = new Transcript({
          meetingId: (socket as any).meetingId,
          participantId: (socket as any).user.uid,
          participantName: (socket as any).user.displayName || 'Unknown',
          type: 'sign',
          text: data.text,
          confidence: data.confidence,
          source: 'local',
          timestamp: new Date(),
          metadata: {
            landmarks: data.landmarks
          }
        })

        await transcript.save()

        // Broadcast to other participants
        socket.to((socket as any).meetingId).emit('transcript-update', {
          type: 'sign',
          text: data.text,
          confidence: data.confidence,
          participantId: (socket as any).user.uid,
          participantName: (socket as any).user.displayName,
          timestamp: new Date()
        })

        console.log(`Sign detected: ${data.text} (${data.confidence})`)
      } catch (error) {
        console.error('Sign detection error:', error)
      }
    })

    // Handle speech detection
    socket.on('speech-detected', async (data: { text: string, confidence: number }) => {
      try {
        if (!(socket as any).meetingId || !(socket as any).user?.uid) {
          return
        }

        // Save transcript
        const transcript = new Transcript({
          meetingId: (socket as any).meetingId,
          participantId: (socket as any).user.uid,
          participantName: (socket as any).user.displayName || 'Unknown',
          type: 'speech',
          text: data.text,
          confidence: data.confidence,
          source: 'local',
          timestamp: new Date()
        })

        await transcript.save()

        // Broadcast to other participants
        socket.to((socket as any).meetingId).emit('transcript-update', {
          type: 'speech',
          text: data.text,
          confidence: data.confidence,
          participantId: (socket as any).user.uid,
          participantName: (socket as any).user.displayName,
          timestamp: new Date()
        })

        console.log(`Speech detected: ${data.text} (${data.confidence})`)
      } catch (error) {
        console.error('Speech detection error:', error)
      }
    })

    // Handle chat messages
    socket.on('chat-message', async (data: { message: string }) => {
      try {
        if (!(socket as any).meetingId || !(socket as any).user?.uid) {
          return
        }

        // Broadcast to all participants in the meeting
        io.to((socket as any).meetingId).emit('chat-message', {
          message: data.message,
          userId: (socket as any).user.uid,
          userName: (socket as any).user.displayName,
          timestamp: new Date()
        })

        console.log(`Chat message from ${(socket as any).user.displayName}: ${data.message}`)
      } catch (error) {
        console.error('Chat message error:', error)
      }
    })

    // Handle raise hand
    socket.on('raise-hand', () => {
      if ((socket as any).meetingId && (socket as any).user?.uid) {
        socket.to((socket as any).meetingId).emit('user-raised-hand', {
          userId: (socket as any).user.uid,
          userName: (socket as any).user.displayName
        })
      }
    })

    // Handle mute/unmute
    socket.on('toggle-mute', (data: { isMuted: boolean }) => {
      if ((socket as any).meetingId && (socket as any).user?.uid) {
        socket.to((socket as any).meetingId).emit('user-muted', {
          userId: (socket as any).user.uid,
          isMuted: data.isMuted
        })
      }
    })

    // Handle disconnect
    socket.on('disconnect', async () => {
      try {
        if ((socket as any).meetingId && (socket as any).user?.uid) {
          // Notify other participants
          socket.to((socket as any).meetingId).emit('user-left', {
            userId: (socket as any).user.uid,
            name: (socket as any).user.displayName
          })

          // Update meeting participants
          await Meeting.findOneAndUpdate(
            { meetingId: (socket as any).meetingId },
            { $pull: { participants: { userId: (socket as any).user.uid } } }
          )

          console.log(`User ${(socket as any).user.uid} left meeting ${(socket as any).meetingId}`)
        }

        // Clean up MediaSoup resources
        if ((socket as any).producers) {
          for (const producer of (socket as any).producers.values()) {
            producer.close()
          }
        }

        if ((socket as any).consumers) {
          for (const consumer of (socket as any).consumers.values()) {
            consumer.close()
          }
        }

        if ((socket as any).transport) {
          (socket as any).transport.close()
        }
      } catch (error) {
        console.error('Disconnect cleanup error:', error)
      }
    })
  })
}
