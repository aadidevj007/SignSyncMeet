import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createError } from '../middleware/errorHandler'

interface SupabaseConfig {
  url: string
  anonKey: string
  serviceRoleKey: string
}

class SupabaseStorageService {
  private supabase: SupabaseClient
  private config: SupabaseConfig

  constructor() {
    this.config = {
      url: process.env.SUPABASE_URL || 'https://mivkqnyjbxaosgmsxfan.supabase.co',
      anonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pdmtxbnlqYnhhb3NnbXN4ZmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MDU4NTAsImV4cCI6MjA3NjQ4MTg1MH0.lsLzwEYhZP3gEdh96fmpaVu_VPVj8COPyHXKvvL--pM',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pdmtxbnlqYnhhb3NnbXN4ZmFuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDkwNTg1MCwiZXhwIjoyMDc2NDgxODUwfQ.wGj7hL78qFFGOvIG6pFZHc9BZo7xTOQv-kU9wy8sYnc'
    }

    // Initialize Supabase client with service role key for server-side operations
    this.supabase = createClient(this.config.url, this.config.serviceRoleKey)
  }

  /**
   * Upload a file to Supabase Storage
   */
  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    bucketName: string = 'signsync-files',
    folderPath: string = ''
  ): Promise<{ fileId: string; publicUrl: string; path: string }> {
    try {
      const fullPath = folderPath ? `${folderPath}/${fileName}` : fileName

      const { data, error } = await this.supabase.storage
        .from(bucketName)
        .upload(fullPath, fileBuffer, {
          contentType: this.getContentType(fileName),
          upsert: true // Allow overwriting existing files
        })

      if (error) {
        throw createError(`Supabase upload error: ${error.message}`, 500)
      }

      // Get public URL
      const { data: publicUrlData } = this.supabase.storage
        .from(bucketName)
        .getPublicUrl(fullPath)

      return {
        fileId: data.path,
        publicUrl: publicUrlData.publicUrl,
        path: fullPath
      }
    } catch (error) {
      console.error('Supabase upload error:', error)
      throw createError('Failed to upload file to Supabase', 500)
    }
  }

  /**
   * Download a file from Supabase Storage
   */
  async downloadFile(bucketName: string, filePath: string): Promise<Buffer> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucketName)
        .download(filePath)

      if (error) {
        throw createError(`Supabase download error: ${error.message}`, 500)
      }

      if (!data) {
        throw createError('No data received from Supabase', 500)
      }

      // Convert blob to buffer
      const arrayBuffer = await data.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (error) {
      console.error('Supabase download error:', error)
      throw createError('Failed to download file from Supabase', 500)
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(bucketName: string, filePath: string): Promise<any> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucketName)
        .list(filePath.split('/').slice(0, -1).join('/'), {
          search: filePath.split('/').pop()
        })

      if (error) {
        throw createError(`Supabase metadata error: ${error.message}`, 500)
      }

      const file = data?.find(item => item.name === filePath.split('/').pop())
      if (!file) {
        throw createError('File not found', 404)
      }

      return {
        name: file.name,
        size: file.metadata?.size,
        lastModified: file.updated_at,
        contentType: file.metadata?.mimetype,
        path: filePath
      }
    } catch (error) {
      console.error('Supabase metadata error:', error)
      throw createError('Failed to get file metadata from Supabase', 500)
    }
  }

  /**
   * Delete a file from Supabase Storage
   */
  async deleteFile(bucketName: string, filePath: string): Promise<void> {
    try {
      const { error } = await this.supabase.storage
        .from(bucketName)
        .remove([filePath])

      if (error) {
        throw createError(`Supabase delete error: ${error.message}`, 500)
      }
    } catch (error) {
      console.error('Supabase delete error:', error)
      throw createError('Failed to delete file from Supabase', 500)
    }
  }

  /**
   * List files in a bucket/folder
   */
  async listFiles(bucketName: string, folderPath: string = ''): Promise<any[]> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucketName)
        .list(folderPath)

      if (error) {
        throw createError(`Supabase list error: ${error.message}`, 500)
      }

      return data || []
    } catch (error) {
      console.error('Supabase list error:', error)
      throw createError('Failed to list files from Supabase', 500)
    }
  }

  /**
   * Create a bucket
   */
  async createBucket(bucketName: string, isPublic: boolean = true): Promise<void> {
    try {
      const { error } = await this.supabase.storage.createBucket(bucketName, {
        public: isPublic,
        allowedMimeTypes: ['image/*', 'video/*', 'audio/*', 'application/pdf', 'text/*'],
        fileSizeLimit: 100 * 1024 * 1024 // 100MB
      })

      if (error) {
        throw createError(`Supabase bucket creation error: ${error.message}`, 500)
      }
    } catch (error) {
      console.error('Supabase bucket creation error:', error)
      throw createError('Failed to create bucket in Supabase', 500)
    }
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(bucketName: string, filePath: string): string {
    const { data } = this.supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  /**
   * Generate a signed URL for private access
   */
  async generateSignedUrl(
    bucketName: string,
    filePath: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucketName)
        .createSignedUrl(filePath, expiresIn)

      if (error) {
        throw createError(`Supabase signed URL error: ${error.message}`, 500)
      }

      return data.signedUrl
    } catch (error) {
      console.error('Supabase signed URL error:', error)
      throw createError('Failed to generate signed URL from Supabase', 500)
    }
  }

  /**
   * Get content type from file extension
   */
  private getContentType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase()
    const contentTypes: { [key: string]: string } = {
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'avi': 'video/avi',
      'mp3': 'audio/mp3',
      'wav': 'audio/wav',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'json': 'application/json'
    }
    return contentTypes[ext || ''] || 'application/octet-stream'
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return !!(this.config.url && this.config.serviceRoleKey)
  }

  /**
   * Test connection to Supabase
   */
  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.storage.listBuckets()
      return !error
    } catch (error) {
      console.error('Supabase connection test failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const supabaseStorageService = new SupabaseStorageService()
export default supabaseStorageService
