import { Request, Response, NextFunction } from 'express'
import admin from 'firebase-admin'
import jwt from 'jsonwebtoken'

interface AuthenticatedRequest extends Request {
  user?: {
    uid: string
    email: string
    displayName?: string
  }
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' })
      return
    }

    const token = authHeader.split(' ')[1]
    
    if (!token) {
      res.status(401).json({ error: 'No token provided' })
      return
    }

    // Verify Firebase token
    try {
      const decodedToken = await admin.auth().verifyIdToken(token)
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email || '',
        displayName: decodedToken.name
      }
      next()
    } catch (firebaseError) {
      // If Firebase verification fails, try JWT verification as fallback
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any
        req.user = {
          uid: decoded.uid,
          email: decoded.email,
          displayName: decoded.displayName
        }
        next()
      } catch (jwtError) {
        res.status(401).json({ error: 'Invalid token' })
        return
      }
    }
  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(500).json({ error: 'Authentication error' })
    return
  }
}

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      
      if (token) {
        try {
          const decodedToken = await admin.auth().verifyIdToken(token)
          req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email || '',
            displayName: decodedToken.name
          }
        } catch (error) {
          // Ignore auth errors for optional auth
          console.log('Optional auth failed:', error)
        }
      }
    }
    
    next()
  } catch (error) {
    console.error('Optional auth middleware error:', error)
    next()
  }
}
