import { Request, Response } from 'express'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import { createError } from '../middleware/errorHandler'
import supabaseStorageService from '../services/supabaseStorage'

interface AuthenticatedRequest extends Request {
  user?: {
    uid: string
    email: string
    displayName?: string
  }
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common media and document types
    const allowedMimes = [
      'video/mp4',
      'video/webm',
      'video/avi',
      'audio/mp3',
      'audio/wav',
      'audio/mpeg',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
      'application/json'
    ]

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('File type not allowed') as any, false)
    }
  }
})

/**
 * Upload a file to Supabase Storage
 */
export const uploadFile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.uid
    if (!userId) {
      throw createError('User not authenticated', 401)
    }

    if (!req.file) {
      throw createError('No file uploaded', 400)
    }

    // Check if Supabase is configured
    if (!supabaseStorageService.isConfigured()) {
      throw createError('Supabase is not configured', 500)
    }

    // Generate unique filename
    const fileExtension = req.file.originalname.split('.').pop()
    const fileName = `${uuidv4()}.${fileExtension}`

    // Upload to Supabase
    const result = await supabaseStorageService.uploadFile(
      req.file.buffer,
      fileName,
      'signsync-files',
      `user-${userId}`
    )

    res.status(201).json({
      success: true,
      data: {
        fileId: result.fileId,
        fileName: fileName,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        publicUrl: result.publicUrl,
        path: result.path,
        uploadedBy: userId,
        uploadedAt: new Date()
      }
    })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    })
  }
}

/**
 * Download a file from Supabase Storage
 */
export const downloadFile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fileId } = req.params
    const userId = req.user?.uid

    if (!userId) {
      throw createError('User not authenticated', 401)
    }

    if (!fileId) {
      throw createError('File ID is required', 400)
    }

    // Check if Supabase is configured
    if (!supabaseStorageService.isConfigured()) {
      throw createError('Supabase is not configured', 500)
    }

    // Download file content
    const fileBuffer = await supabaseStorageService.downloadFile('signsync-files', fileId)

    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${fileId}"`)
    res.setHeader('Content-Length', fileBuffer.length)
    
    res.send(fileBuffer)
  } catch (error) {
    console.error('Download error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Download failed'
    })
  }
}

/**
 * Get file metadata
 */
export const getFileMetadata = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fileId } = req.params
    const userId = req.user?.uid

    if (!userId) {
      throw createError('User not authenticated', 401)
    }

    if (!fileId) {
      throw createError('File ID is required', 400)
    }

    // Check if Supabase is configured
    if (!supabaseStorageService.isConfigured()) {
      throw createError('Supabase is not configured', 500)
    }

    const fileMetadata = await supabaseStorageService.getFileMetadata('signsync-files', fileId)

    res.json({
      success: true,
      data: {
        fileId: fileId,
        ...fileMetadata
      }
    })
  } catch (error) {
    console.error('Get metadata error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get file metadata'
    })
  }
}

/**
 * Delete a file from Supabase Storage
 */
export const deleteFile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fileId } = req.params
    const userId = req.user?.uid

    if (!userId) {
      throw createError('User not authenticated', 401)
    }

    if (!fileId) {
      throw createError('File ID is required', 400)
    }

    // Check if Supabase is configured
    if (!supabaseStorageService.isConfigured()) {
      throw createError('Supabase is not configured', 500)
    }

    await supabaseStorageService.deleteFile('signsync-files', fileId)

    res.json({
      success: true,
      message: 'File deleted successfully'
    })
  } catch (error) {
    console.error('Delete error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed'
    })
  }
}

/**
 * List files in Supabase Storage
 */
export const listFiles = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.uid
    const { folder } = req.query

    if (!userId) {
      throw createError('User not authenticated', 401)
    }

    // Check if Supabase is configured
    if (!supabaseStorageService.isConfigured()) {
      throw createError('Supabase is not configured', 500)
    }

    const files = await supabaseStorageService.listFiles(
      'signsync-files',
      `user-${userId}/${folder || ''}`
    )

    res.json({
      success: true,
      data: {
        files: files
      }
    })
  } catch (error) {
    console.error('List files error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list files'
    })
  }
}

/**
 * Get Supabase configuration status
 */
export const getStorageStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.uid

    if (!userId) {
      throw createError('User not authenticated', 401)
    }

    const isConfigured = supabaseStorageService.isConfigured()
    const isConnected = isConfigured ? await supabaseStorageService.testConnection() : false

    res.json({
      success: true,
      data: {
        provider: 'supabase',
        configured: isConfigured,
        connected: isConnected,
        checkedBy: userId,
        checkedAt: new Date()
      }
    })
  } catch (error) {
    console.error('Get storage status error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get storage status'
    })
  }
}

// Export multer middleware for file uploads
export { upload }
