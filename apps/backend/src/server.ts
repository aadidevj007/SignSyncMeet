import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import { createServer } from 'http'
import { Server } from 'socket.io'
import mongoose from 'mongoose'
import { createClient } from 'redis'
import dotenv from 'dotenv'

import { authMiddleware } from './middleware/auth'
import { errorHandler } from './middleware/errorHandler'
import { setupMediaSoup } from './services/mediasoup'
import { setupSocketHandlers } from './services/socketHandlers'
import apiRoutes from './routes/api'
import { initializeFirebase } from './services/firebase'

// Load environment variables
dotenv.config()

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
})

const PORT = process.env.PORT || 3001

// Security middleware
app.use(helmet())
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "https://localhost:3000",
    "https://www.signsyncmeet.localhost.com:3000",
    "http://localhost:3000"
  ],
  credentials: true
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
})
app.use(limiter)

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Compression middleware
app.use(compression())

// Logging middleware
app.use(morgan('combined'))

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// API routes
app.use('/api', apiRoutes)

// Error handling middleware
app.use(errorHandler)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Initialize services
async function initializeServices() {
  try {
    // Connect to MongoDB
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI)
      console.log('✅ Connected to MongoDB')
    } else {
      console.warn('⚠️  MONGODB_URI not provided, skipping MongoDB connection')
    }

    // Connect to Redis (optional)
    if (process.env.REDIS_URL) {
      try {
        const redisClient = createClient({ url: process.env.REDIS_URL })
        await redisClient.connect()
        console.log('✅ Connected to Redis')
      } catch (error) {
        console.warn('⚠️  Redis connection failed, continuing without Redis:', error instanceof Error ? error.message : 'Unknown error')
      }
    } else {
      console.log('ℹ️  Redis not configured, skipping Redis connection')
    }

    // Initialize Firebase Admin
    initializeFirebase()

    // Setup MediaSoup (optional)
    try {
      await setupMediaSoup()
    } catch (error) {
      console.warn('⚠️  MediaSoup setup failed, continuing without WebRTC support:', error instanceof Error ? error.message : 'Unknown error')
    }

    // Setup Socket.IO handlers
    setupSocketHandlers(io)

    console.log('✅ All services initialized successfully')
  } catch (error) {
    console.error('❌ Error initializing services:', error)
    process.exit(1)
  }
}

// Start server
async function startServer() {
  await initializeServices()
  
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`)
    console.log(`📡 Socket.IO server ready`)
    console.log(`🌐 Health check: http://localhost:${PORT}/health`)
  })
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  server.close(() => {
    console.log('Process terminated')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  server.close(() => {
    console.log('Process terminated')
    process.exit(0)
  })
})

startServer().catch(console.error)
