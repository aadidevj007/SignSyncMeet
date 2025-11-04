import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'
import * as meetingController from '../controllers/meetingController'
import * as userController from '../controllers/userController'
import * as transcriptController from '../controllers/transcriptController'
import * as inferenceController from '../controllers/inferenceController'
import supabaseStorageRoutes from './supabaseStorage'
import inferRoutes from './infer'
import asrRoutes from './asr'
import modelsRoutes from './models'
import contactRoutes from './contact'

const router = Router()

// User routes
router.get('/users/profile', authMiddleware, asyncHandler(userController.getProfile))
router.put('/users/profile', authMiddleware, asyncHandler(userController.updateProfile))
router.get('/users/:id', authMiddleware, asyncHandler(userController.getUserById))

// Meeting routes
router.post('/meetings', authMiddleware, asyncHandler(meetingController.createMeeting))
router.get('/meetings/:id', authMiddleware, asyncHandler(meetingController.getMeeting))
router.post('/meetings/:id/join', authMiddleware, asyncHandler(meetingController.joinMeeting))
router.post('/meetings/:id/leave', authMiddleware, asyncHandler(meetingController.leaveMeeting))
router.put('/meetings/:id/end', authMiddleware, asyncHandler(meetingController.endMeeting))
router.get('/meetings/:id/participants', authMiddleware, asyncHandler(meetingController.getParticipants))
router.post('/meetings/:id/participants/:userId/mute', authMiddleware, asyncHandler(meetingController.muteParticipant))
router.post('/meetings/:id/participants/:userId/kick', authMiddleware, asyncHandler(meetingController.kickParticipant))

// Transcript routes
router.get('/meetings/:id/transcripts', authMiddleware, asyncHandler(transcriptController.getTranscripts))
router.post('/meetings/:id/transcripts', authMiddleware, asyncHandler(transcriptController.createTranscript))
router.get('/meetings/:id/transcripts/export', authMiddleware, asyncHandler(transcriptController.exportTranscripts))

// Inference routes
router.post('/inference/sign-to-text', authMiddleware, asyncHandler(inferenceController.signToText))
router.post('/inference/speech-to-text', authMiddleware, asyncHandler(inferenceController.speechToText))
router.post('/inference/process-video', authMiddleware, asyncHandler(inferenceController.processVideo))

// Storage routes (Supabase)
router.use('/storage', supabaseStorageRoutes)

// Inference routes
router.use('/', inferRoutes)
router.use('/', asrRoutes)
router.use('/', modelsRoutes)
router.use('/', contactRoutes)

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

export default router
