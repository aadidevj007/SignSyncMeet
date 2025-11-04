import mongoose, { Document, Schema } from 'mongoose'

export interface IUser extends Document {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  regNumber?: string
  department?: string
  avatar?: string
  isActive: boolean
  lastSeen: Date
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>({
  uid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  photoURL: {
    type: String,
    trim: true
  },
  regNumber: {
    type: String,
    trim: true,
    uppercase: true
  },
  department: {
    type: String,
    trim: true
  },
  avatar: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

// Indexes
UserSchema.index({ email: 1 })
UserSchema.index({ regNumber: 1 })
UserSchema.index({ isActive: 1 })

// Virtual for user's full profile
UserSchema.virtual('profile').get(function() {
  return {
    uid: this.uid,
    email: this.email,
    displayName: this.displayName,
    photoURL: this.photoURL,
    regNumber: this.regNumber,
    department: this.department,
    avatar: this.avatar,
    isActive: this.isActive,
    lastSeen: this.lastSeen
  }
})

// Ensure virtual fields are serialized
UserSchema.set('toJSON', { virtuals: true })

export default mongoose.model<IUser>('User', UserSchema)
