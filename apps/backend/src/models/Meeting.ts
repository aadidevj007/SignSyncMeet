import mongoose, { Document, Schema } from 'mongoose'

export interface IMeeting extends Document {
  meetingId: string
  name: string
  hostId: string
  hostName: string
  participants: Array<{
    userId: string
    name: string
    joinedAt: Date
    leftAt?: Date
    isActive: boolean
  }>
  settings: {
    enableLobby: boolean
    enableSignToText: boolean
    enableSpeechToText: boolean
    allowScreenShare: boolean
    allowChat: boolean
    allowRecordings: boolean
    password?: string
    duration: number
  }
  status: 'scheduled' | 'active' | 'ended'
  startedAt?: Date
  endedAt?: Date
  createdAt: Date
  updatedAt: Date
  // Virtual fields
  activeParticipantsCount: number
  duration: number | null
  // Methods
  addParticipant(userId: string, name: string): Promise<IMeeting>
  removeParticipant(userId: string): Promise<IMeeting>
  startMeeting(): Promise<IMeeting>
  endMeeting(): Promise<IMeeting>
}

const MeetingSchema = new Schema<IMeeting>({
  meetingId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  hostId: {
    type: String,
    required: true,
    index: true
  },
  hostName: {
    type: String,
    required: true,
    trim: true
  },
  participants: [{
    userId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  settings: {
    enableLobby: {
      type: Boolean,
      default: true
    },
    enableSignToText: {
      type: Boolean,
      default: true
    },
    enableSpeechToText: {
      type: Boolean,
      default: true
    },
    allowScreenShare: {
      type: Boolean,
      default: true
    },
    allowChat: {
      type: Boolean,
      default: true
    },
    allowRecordings: {
      type: Boolean,
      default: false
    },
    password: {
      type: String,
      trim: true
    },
    duration: {
      type: Number,
      default: 60 // minutes
    }
  },
  status: {
    type: String,
    enum: ['scheduled', 'active', 'ended'],
    default: 'scheduled',
    index: true
  },
  startedAt: {
    type: Date
  },
  endedAt: {
    type: Date
  }
}, {
  timestamps: true
})

// Indexes (removed duplicates - already defined in schema fields)

// Virtual for active participants count
MeetingSchema.virtual('activeParticipantsCount').get(function() {
  return this.participants.filter(p => p.isActive).length
})

// Virtual for meeting duration
MeetingSchema.virtual('duration').get(function() {
  if (this.startedAt && this.endedAt) {
    return Math.floor((this.endedAt.getTime() - this.startedAt.getTime()) / 1000 / 60)
  }
  return null
})

// Methods
MeetingSchema.methods.addParticipant = function(userId: string, name: string) {
  const existingParticipant = this.participants.find((p: any) => p.userId === userId)
  
  if (existingParticipant) {
    existingParticipant.isActive = true
    existingParticipant.joinedAt = new Date()
    existingParticipant.leftAt = undefined
  } else {
    this.participants.push({
      userId,
      name,
      joinedAt: new Date(),
      isActive: true
    })
  }
  
  return this.save()
}

MeetingSchema.methods.removeParticipant = function(userId: string) {
  const participant = this.participants.find((p: any) => p.userId === userId)
  if (participant) {
    participant.isActive = false
    participant.leftAt = new Date()
  }
  return this.save()
}

MeetingSchema.methods.startMeeting = function() {
  this.status = 'active'
  this.startedAt = new Date()
  return this.save()
}

MeetingSchema.methods.endMeeting = function() {
  this.status = 'ended'
  this.endedAt = new Date()
  this.participants.forEach((p: any) => {
    p.isActive = false
    if (!p.leftAt) {
      p.leftAt = new Date()
    }
  })
  return this.save()
}

// Ensure virtual fields are serialized
MeetingSchema.set('toJSON', { virtuals: true })

export default mongoose.model<IMeeting>('Meeting', MeetingSchema)
