import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const INFERENCE_TEMP_DIR = process.env.INFERENCE_TEMP_DIR || './tmp/infer'

/**
 * Ensure temp directory exists
 */
async function ensureTempDir() {
  try {
    await fs.mkdir(INFERENCE_TEMP_DIR, { recursive: true })
  } catch (error) {
    // Directory might already exist
  }
}

/**
 * Save base64 encoded video clip to disk
 * @param clipBase64 Base64 encoded video (without data:video/webm;base64, prefix)
 * @param clipId Unique ID for the clip
 * @returns Path to saved clip file
 */
export async function saveClip(clipBase64: string, clipId?: string): Promise<string> {
  await ensureTempDir()

  const id = clipId || uuidv4()
  const clipPath = path.join(INFERENCE_TEMP_DIR, `${id}.webm`)

  try {
    const buffer = Buffer.from(clipBase64, 'base64')
    await fs.writeFile(clipPath, buffer)
    
    console.log(`✅ Saved clip: ${clipPath} (${buffer.length} bytes)`)
    return clipPath
  } catch (error) {
    console.error('Error saving clip:', error)
    throw new Error(`Failed to save clip: ${error}`)
  }
}

/**
 * Extract frames from video clip (if needed for inference)
 * Uses ffmpeg if available, otherwise returns null
 */
export async function extractFrames(
  clipPath: string,
  outputDir?: string,
  frameRate: number = 8
): Promise<string[] | null> {
  // This would require ffmpeg to be installed
  // For now, return null and handle frames on server side
  return null
}

/**
 * Clean up old clips (older than specified hours)
 */
export async function cleanupOldClips(ageHours: number = 24): Promise<number> {
  await ensureTempDir()

  try {
    const files = await fs.readdir(INFERENCE_TEMP_DIR)
    const now = Date.now()
    let deletedCount = 0

    for (const file of files) {
      const filePath = path.join(INFERENCE_TEMP_DIR, file)
      const stats = await fs.stat(filePath)
      const ageMs = now - stats.mtimeMs
      const ageHoursCalc = ageMs / (1000 * 60 * 60)

      if (ageHoursCalc > ageHours) {
        await fs.unlink(filePath)
        deletedCount++
      }
    }

    console.log(`🧹 Cleaned up ${deletedCount} old clips`)
    return deletedCount
  } catch (error) {
    console.error('Error cleaning up clips:', error)
    return 0
  }
}

/**
 * Get clip file path
 */
export function getClipPath(clipId: string): string {
  return path.join(INFERENCE_TEMP_DIR, `${clipId}.webm`)
}

