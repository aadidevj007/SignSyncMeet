import { createWorker, types as MediasoupTypes } from 'mediasoup'

let worker: MediasoupTypes.Worker | null = null
let router: MediasoupTypes.Router | null = null
let webRtcServer: MediasoupTypes.WebRtcServer | null = null

export const setupMediaSoup = async () => {
  // Skip MediaSoup on Windows - it requires native binaries that may not be available
  if (process.platform === 'win32' && !process.env.FORCE_MEDIASOUP) {
    console.log('ℹ️  MediaSoup skipped on Windows (native binaries not available)')
    console.log('ℹ️  For production, use Linux-based hosting or set FORCE_MEDIASOUP=1 to attempt setup')
    return
  }

  try {
    // Create MediaSoup worker with error handling
    worker = await createWorker({
      logLevel: (process.env.MEDIASOUP_WORKER_LOG_LEVEL as MediasoupTypes.WorkerLogLevel) || 'debug',
      logTags: (process.env.MEDIASOUP_WORKER_LOG_TAG || 'info,ice,dtls,rtp,srtp,rtcp').split(',') as any,
      rtcMinPort: parseInt(process.env.MEDIASOUP_WORKER_RTC_MIN_PORT || '40000'),
      rtcMaxPort: parseInt(process.env.MEDIASOUP_WORKER_RTC_MAX_PORT || '49999')
    })

    console.log('✅ MediaSoup worker created')

    // Create router
    router = await worker.createRouter({
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2
        },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000
          }
        },
        {
          kind: 'video',
          mimeType: 'video/VP9',
          clockRate: 90000,
          parameters: {
            'profile-id': 2,
            'x-google-start-bitrate': 1000
          }
        },
        {
          kind: 'video',
          mimeType: 'video/h264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '4d0032',
            'level-asymmetry-allowed': 1,
            'x-google-start-bitrate': 1000
          }
        }
      ]
    })

    console.log('✅ MediaSoup router created')

    // Create WebRTC server
    webRtcServer = await worker.createWebRtcServer({
      listenInfos: [
        {
          protocol: 'udp',
          ip: '0.0.0.0',
          announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP,
          port: parseInt(process.env.MEDIASOUP_WEBRTC_PORT || '44444')
        },
        {
          protocol: 'tcp',
          ip: '0.0.0.0',
          announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP,
          port: parseInt(process.env.MEDIASOUP_WEBRTC_PORT || '44444')
        }
      ]
    })

    console.log('✅ MediaSoup WebRTC server created')

    // Handle worker events
    worker.on('died', () => {
      console.error('❌ MediaSoup worker died, exiting...')
      process.exit(1)
    })

  } catch (error) {
    console.error('❌ Error setting up MediaSoup:', error)
    throw error
  }
}

export const isMediaSoupReady = () => {
  return worker !== null && router !== null && webRtcServer !== null
}

export const getRouter = () => {
  if (!router) {
    throw new Error('MediaSoup router not initialized')
  }
  return router
}

export const getWebRtcServer = () => {
  if (!webRtcServer) {
    throw new Error('MediaSoup WebRtcServer not initialized')
  }
  return webRtcServer
}

export const getWorker = () => {
  if (!worker) {
    throw new Error('MediaSoup worker not initialized')
  }
  return worker
}

export const getRtpCapabilities = () => {
  if (!router) {
    throw new Error('MediaSoup router not initialized')
  }
  return router.rtpCapabilities
}

export const createTransport = async (direction: 'send' | 'recv') => {
  if (!router || !webRtcServer) {
    throw new Error('MediaSoup not initialized')
  }

  const transport = await router.createWebRtcTransport({
    webRtcServer
  })

  return transport
}

export const createProducer = async (transport: any, kind: string, rtpParameters: any) => {
  if (!router) {
    throw new Error('MediaSoup router not initialized')
  }

  const producer = await transport.produce({
    kind,
    rtpParameters,
    appData: { kind }
  })

  return producer
}

export const createConsumer = async (transport: any, producerId: string, rtpCapabilities: any) => {
  if (!router) {
    throw new Error('MediaSoup router not initialized')
  }

  if (!router.canConsume({ producerId, rtpCapabilities })) {
    throw new Error('Cannot consume this producer')
  }

  const consumer = await transport.consume({
    producerId,
    rtpCapabilities,
    paused: true
  })

  return consumer
}
