import { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import Meeting, { IMeeting } from '../models/Meeting'
import User from '../models/User'
import { createError } from '../middleware/errorHandler'

interface AuthenticatedRequest extends Request {
  user?: {
    uid: string
    email: string
    displayName?: string
  }
}

export const createMeeting = async (req: AuthenticatedRequest, res: Response) => {
  const { name, settings } = req.body
  const userId = req.user?.uid
  const userName = req.user?.displayName || 'Unknown User'

  if (!userId) {
    throw createError('User not authenticated', 401)
  }

  if (!name) {
    throw createError('Meeting name is required', 400)
  }

  // Generate unique meeting ID
  const meetingId = generateMeetingId()

  // Create meeting
  const meeting = new Meeting({
    meetingId,
    name,
    hostId: userId,
    hostName: userName,
    participants: [{
      userId,
      name: userName,
      joinedAt: new Date(),
      isActive: true
    }],
    settings: {
      enableLobby: settings?.enableLobby ?? true,
      enableSignToText: settings?.enableSignToText ?? true,
      enableSpeechToText: settings?.enableSpeechToText ?? true,
      allowScreenShare: settings?.allowScreenShare ?? true,
      allowChat: settings?.allowChat ?? true,
      allowRecordings: settings?.allowRecordings ?? false,
      password: settings?.password,
      duration: settings?.duration ?? 60
    },
    status: 'scheduled'
  })

  await meeting.save()

  res.status(201).json({
    success: true,
    data: {
      meetingId: meeting.meetingId,
      name: meeting.name,
      hostId: meeting.hostId,
      hostName: meeting.hostName,
      settings: meeting.settings,
      status: meeting.status,
      createdAt: meeting.createdAt,
      joinUrl: `${process.env.FRONTEND_URL}/meet/${meeting.meetingId}`
    }
  })
}

export const getMeeting = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params
  const userId = req.user?.uid

  if (!userId) {
    throw createError('User not authenticated', 401)
  }

  const meeting = await Meeting.findOne({ meetingId: id })

  if (!meeting) {
    throw createError('Meeting not found', 404)
  }

  // Check if user is host or participant
  const isHost = meeting.hostId === userId
  const isParticipant = meeting.participants.some(p => p.userId === userId && p.isActive)

  if (!isHost && !isParticipant) {
    throw createError('Access denied', 403)
  }

  res.json({
    success: true,
    data: {
      meetingId: meeting.meetingId,
      name: meeting.name,
      hostId: meeting.hostId,
      hostName: meeting.hostName,
      participants: meeting.participants,
      settings: meeting.settings,
      status: meeting.status,
      startedAt: meeting.startedAt,
      endedAt: meeting.endedAt,
      createdAt: meeting.createdAt,
      activeParticipantsCount: meeting.activeParticipantsCount
    }
  })
}

export const joinMeeting = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params
  const { password } = req.body
  const userId = req.user?.uid
  const userName = req.user?.displayName || 'Unknown User'

  if (!userId) {
    throw createError('User not authenticated', 401)
  }

  const meeting = await Meeting.findOne({ meetingId: id })

  if (!meeting) {
    throw createError('Meeting not found', 404)
  }

  if (meeting.status === 'ended') {
    throw createError('Meeting has ended', 400)
  }

  // Check password if required
  if (meeting.settings.password && meeting.settings.password !== password) {
    throw createError('Invalid meeting password', 401)
  }

  // Add participant
  await meeting.addParticipant(userId, userName)

  // Start meeting if it's the first participant after host
  if (meeting.status === 'scheduled' && meeting.activeParticipantsCount > 1) {
    await meeting.startMeeting()
  }

  res.json({
    success: true,
    data: {
      meetingId: meeting.meetingId,
      name: meeting.name,
      status: meeting.status,
      participants: meeting.participants.filter(p => p.isActive),
      settings: meeting.settings
    }
  })
}

export const leaveMeeting = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params
  const userId = req.user?.uid

  if (!userId) {
    throw createError('User not authenticated', 401)
  }

  const meeting = await Meeting.findOne({ meetingId: id })

  if (!meeting) {
    throw createError('Meeting not found', 404)
  }

  await meeting.removeParticipant(userId)

  res.json({
    success: true,
    message: 'Left meeting successfully'
  })
}

export const endMeeting = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params
  const userId = req.user?.uid

  if (!userId) {
    throw createError('User not authenticated', 401)
  }

  const meeting = await Meeting.findOne({ meetingId: id })

  if (!meeting) {
    throw createError('Meeting not found', 404)
  }

  if (meeting.hostId !== userId) {
    throw createError('Only the host can end the meeting', 403)
  }

  await meeting.endMeeting()

  res.json({
    success: true,
    message: 'Meeting ended successfully'
  })
}

export const getParticipants = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params
  const userId = req.user?.uid

  if (!userId) {
    throw createError('User not authenticated', 401)
  }

  const meeting = await Meeting.findOne({ meetingId: id })

  if (!meeting) {
    throw createError('Meeting not found', 404)
  }

  const isHost = meeting.hostId === userId
  const isParticipant = meeting.participants.some(p => p.userId === userId && p.isActive)

  if (!isHost && !isParticipant) {
    throw createError('Access denied', 403)
  }

  res.json({
    success: true,
    data: {
      participants: meeting.participants.filter(p => p.isActive),
      totalCount: meeting.activeParticipantsCount
    }
  })
}

export const muteParticipant = async (req: AuthenticatedRequest, res: Response) => {
  const { id, userId: targetUserId } = req.params
  const userId = req.user?.uid

  if (!userId) {
    throw createError('User not authenticated', 401)
  }

  const meeting = await Meeting.findOne({ meetingId: id })

  if (!meeting) {
    throw createError('Meeting not found', 404)
  }

  if (meeting.hostId !== userId) {
    throw createError('Only the host can mute participants', 403)
  }

  // This would typically be handled by socket.io for real-time updates
  res.json({
    success: true,
    message: 'Participant muted successfully'
  })
}

export const kickParticipant = async (req: AuthenticatedRequest, res: Response) => {
  const { id, userId: targetUserId } = req.params
  const userId = req.user?.uid

  if (!userId) {
    throw createError('User not authenticated', 401)
  }

  const meeting = await Meeting.findOne({ meetingId: id })

  if (!meeting) {
    throw createError('Meeting not found', 404)
  }

  if (meeting.hostId !== userId) {
    throw createError('Only the host can kick participants', 403)
  }

  await meeting.removeParticipant(targetUserId)

  res.json({
    success: true,
    message: 'Participant removed successfully'
  })
}

// Helper function to generate meeting ID
function generateMeetingId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
