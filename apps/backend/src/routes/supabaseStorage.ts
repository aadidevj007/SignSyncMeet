import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import {
  uploadFile,
  downloadFile,
  getFileMetadata,
  deleteFile,
  listFiles,
  getStorageStatus,
  upload
} from '../controllers/supabaseStorageController'

const router = Router()

// Apply authentication middleware to all routes
router.use(authMiddleware)

/**
 * @route POST /api/storage/upload
 * @desc Upload a file to Supabase Storage
 * @access Private
 */
router.post('/upload', upload.single('file'), uploadFile)

/**
 * @route GET /api/storage/download/:fileId
 * @desc Download a file from Supabase Storage
 * @access Private
 */
router.get('/download/:fileId', downloadFile)

/**
 * @route GET /api/storage/metadata/:fileId
 * @desc Get file metadata from Supabase Storage
 * @access Private
 */
router.get('/metadata/:fileId', getFileMetadata)

/**
 * @route DELETE /api/storage/delete/:fileId
 * @desc Delete a file from Supabase Storage
 * @access Private
 */
router.delete('/delete/:fileId', deleteFile)

/**
 * @route GET /api/storage/files
 * @desc List files in Supabase Storage
 * @access Private
 */
router.get('/files', listFiles)

/**
 * @route GET /api/storage/status
 * @desc Get Supabase Storage configuration status
 * @access Private
 */
router.get('/status', getStorageStatus)

export default router
