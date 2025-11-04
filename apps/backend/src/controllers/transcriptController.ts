import { Request, Response } from 'express'
import Transcript, { ITranscript } from '../models/Transcript'
import Meeting from '../models/Meeting'
import { createError } from '../middleware/errorHandler'

interface AuthenticatedRequest extends Request {
  user?: {
    uid: string
    email: string
    displayName?: string
  }
}

export const getTranscripts = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params
  const { type, limit = 100, offset = 0 } = req.query
  const userId = req.user?.uid

  if (!userId) {
    throw createError('User not authenticated', 401)
  }

  // Check if user has access to the meeting
  const meeting = await Meeting.findOne({ meetingId: id })
  if (!meeting) {
    throw createError('Meeting not found', 404)
  }

  const isHost = meeting.hostId === userId
  const isParticipant = meeting.participants.some(p => p.userId === userId && p.isActive)

  if (!isHost && !isParticipant) {
    throw createError('Access denied', 403)
  }

  // Build query
  const query: any = { meetingId: id }
  if (type && (type === 'sign' || type === 'speech')) {
    query.type = type
  }

  const transcripts = await Transcript.find(query)
    .sort({ timestamp: 1 })
    .limit(Number(limit))
    .skip(Number(offset))

  const totalCount = await Transcript.countDocuments(query)

  res.json({
    success: true,
    data: {
      transcripts,
      pagination: {
        total: totalCount,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + transcripts.length < totalCount
      }
    }
  })
}

export const createTranscript = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params
  const { type, text, confidence, source, language, metadata } = req.body
  const userId = req.user?.uid
  const userName = req.user?.displayName || 'Unknown User'

  if (!userId) {
    throw createError('User not authenticated', 401)
  }

  if (!type || !text || confidence === undefined) {
    throw createError('Missing required fields: type, text, confidence', 400)
  }

  if (type !== 'sign' && type !== 'speech') {
    throw createError('Invalid type. Must be "sign" or "speech"', 400)
  }

  if (confidence < 0 || confidence > 1) {
    throw createError('Confidence must be between 0 and 1', 400)
  }

  // Check if user has access to the meeting
  const meeting = await Meeting.findOne({ meetingId: id })
  if (!meeting) {
    throw createError('Meeting not found', 404)
  }

  const isHost = meeting.hostId === userId
  const isParticipant = meeting.participants.some(p => p.userId === userId && p.isActive)

  if (!isHost && !isParticipant) {
    throw createError('Access denied', 403)
  }

  // Create transcript
  const transcript = new Transcript({
    meetingId: id,
    participantId: userId,
    participantName: userName,
    type,
    text: text.trim(),
    confidence,
    source: source || 'local',
    timestamp: new Date(),
    language: language || 'en',
    metadata
  })

  await transcript.save()

  res.status(201).json({
    success: true,
    data: {
      id: transcript._id,
      meetingId: transcript.meetingId,
      participantId: transcript.participantId,
      participantName: transcript.participantName,
      type: transcript.type,
      text: transcript.text,
      confidence: transcript.confidence,
      source: transcript.source,
      timestamp: transcript.timestamp,
      language: transcript.language,
      metadata: transcript.metadata
    }
  })
}

export const exportTranscripts = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params
  const { format = 'json' } = req.query
  const userId = req.user?.uid

  if (!userId) {
    throw createError('User not authenticated', 401)
  }

  // Check if user has access to the meeting
  const meeting = await Meeting.findOne({ meetingId: id })
  if (!meeting) {
    throw createError('Meeting not found', 404)
  }

  const isHost = meeting.hostId === userId
  const isParticipant = meeting.participants.some(p => p.userId === userId && p.isActive)

  if (!isHost && !isParticipant) {
    throw createError('Access denied', 403)
  }

  // Get all transcripts for the meeting
  const transcripts = await Transcript.find({ meetingId: id })
    .sort({ timestamp: 1 })

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="meeting-${id}-transcripts.json"`)
    res.json({
      meetingId: id,
      meetingName: meeting.name,
      exportedAt: new Date().toISOString(),
      totalTranscripts: transcripts.length,
      transcripts
    })
  } else if (format === 'txt') {
    res.setHeader('Content-Type', 'text/plain')
    res.setHeader('Content-Disposition', `attachment; filename="meeting-${id}-transcripts.txt"`)
    
    let textContent = `Meeting Transcripts\n`
    textContent += `Meeting ID: ${id}\n`
    textContent += `Meeting Name: ${meeting.name}\n`
    textContent += `Exported At: ${new Date().toISOString()}\n`
    textContent += `Total Transcripts: ${transcripts.length}\n\n`
    textContent += `--- Transcripts ---\n\n`

    transcripts.forEach((transcript, index) => {
      textContent += `${index + 1}. [${transcript.timestamp.toISOString()}] ${transcript.participantName} (${transcript.type.toUpperCase()}):\n`
      textContent += `   ${transcript.text}\n`
      textContent += `   Confidence: ${Math.round(transcript.confidence * 100)}% | Source: ${transcript.source}\n\n`
    })

    res.send(textContent)
  } else {
    throw createError('Unsupported format. Use "json" or "txt"', 400)
  }
}
