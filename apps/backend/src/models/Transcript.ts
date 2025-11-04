import mongoose, { Document, Schema } from 'mongoose'

export interface ITranscript extends Document {
  meetingId: string
  participantId: string
  participantName: string
  type: 'sign' | 'speech'
  text: string
  confidence: number
  source: 'local' | 'server'
  timestamp: Date
  language?: string
  metadata?: {
    landmarks?: any[]
    audioLevel?: number
    processingTime?: number
  }
  createdAt: Date
}

const TranscriptSchema = new Schema<ITranscript>({
  meetingId: {
    type: String,
    required: true,
    index: true
  },
  participantId: {
    type: String,
    required: true,
    index: true
  },
  participantName: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['sign', 'speech'],
    required: true,
    index: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  source: {
    type: String,
    enum: ['local', 'server'],
    required: true
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  language: {
    type: String,
    default: 'en',
    trim: true
  },
  metadata: {
    landmarks: [Schema.Types.Mixed],
    audioLevel: Number,
    processingTime: Number
  }
}, {
  timestamps: true
})

// Indexes
TranscriptSchema.index({ meetingId: 1, timestamp: 1 })
TranscriptSchema.index({ participantId: 1, timestamp: 1 })
TranscriptSchema.index({ type: 1, timestamp: 1 })
TranscriptSchema.index({ confidence: 1 })

// Virtual for formatted timestamp
TranscriptSchema.virtual('formattedTimestamp').get(function() {
  return this.timestamp.toISOString()
})

// Static methods
TranscriptSchema.statics.getByMeeting = function(meetingId: string, limit: number = 100) {
  return this.find({ meetingId })
    .sort({ timestamp: 1 })
    .limit(limit)
}

TranscriptSchema.statics.getByParticipant = function(participantId: string, limit: number = 100) {
  return this.find({ participantId })
    .sort({ timestamp: 1 })
    .limit(limit)
}

TranscriptSchema.statics.getByType = function(type: 'sign' | 'speech', limit: number = 100) {
  return this.find({ type })
    .sort({ timestamp: -1 })
    .limit(limit)
}

TranscriptSchema.statics.getHighConfidence = function(threshold: number = 0.8, limit: number = 100) {
  return this.find({ confidence: { $gte: threshold } })
    .sort({ timestamp: -1 })
    .limit(limit)
}

// Instance methods
TranscriptSchema.methods.isHighConfidence = function(threshold: number = 0.8) {
  return this.confidence >= threshold
}

TranscriptSchema.methods.getFormattedText = function() {
  return `${this.participantName}: ${this.text} (${Math.round(this.confidence * 100)}%)`
}

// Ensure virtual fields are serialized
TranscriptSchema.set('toJSON', { virtuals: true })

export default mongoose.model<ITranscript>('Transcript', TranscriptSchema)
