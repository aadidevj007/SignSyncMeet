import { Request, Response } from 'express'
import User, { IUser } from '../models/User'
import { createError } from '../middleware/errorHandler'

interface AuthenticatedRequest extends Request {
  user?: {
    uid: string
    email: string
    displayName?: string
  }
}

export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid

  if (!userId) {
    throw createError('User not authenticated', 401)
  }

  const user = await User.findOne({ uid: userId })

  if (!user) {
    throw createError('User not found', 404)
  }

  res.json({
    success: true,
    data: {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      regNumber: user.regNumber,
      department: user.department,
      avatar: user.avatar,
      isActive: user.isActive,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  })
}

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  const { displayName, regNumber, department, avatar } = req.body

  if (!userId) {
    throw createError('User not authenticated', 401)
  }

  const user = await User.findOne({ uid: userId })

  if (!user) {
    throw createError('User not found', 404)
  }

  // Update fields
  if (displayName) user.displayName = displayName
  if (regNumber) user.regNumber = regNumber
  if (department) user.department = department
  if (avatar) user.avatar = avatar

  user.lastSeen = new Date()
  await user.save()

  res.json({
    success: true,
    data: {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      regNumber: user.regNumber,
      department: user.department,
      avatar: user.avatar,
      isActive: user.isActive,
      lastSeen: user.lastSeen,
      updatedAt: user.updatedAt
    }
  })
}

export const getUserById = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params
  const userId = req.user?.uid

  if (!userId) {
    throw createError('User not authenticated', 401)
  }

  const user = await User.findOne({ uid: id })

  if (!user) {
    throw createError('User not found', 404)
  }

  res.json({
    success: true,
    data: {
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      avatar: user.avatar,
      isActive: user.isActive,
      lastSeen: user.lastSeen
    }
  })
}
