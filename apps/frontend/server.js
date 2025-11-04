const { createServer } = require('https')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')
const path = require('path')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'www.signsyncmeet.localhost.com'
const port = 3000

// Certificate paths
const certPath = path.join(__dirname, 'certs', 'cert.pem')
const keyPath = path.join(__dirname, 'certs', 'key.pem')

// Check if certificates exist
if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.error('❌ HTTPS certificates not found!')
  console.error(`   Cert: ${certPath}`)
  console.error(`   Key: ${keyPath}`)
  console.error('\n📝 Please run the setup script first:')
  console.error('   Windows: powershell -ExecutionPolicy Bypass -File scripts/setup-https.ps1')
  console.error('   Linux/Mac: bash scripts/setup-https.sh')
  console.error('\n   Or install mkcert and generate certificates manually:')
  console.error('   mkcert -install')
  console.error('   mkcert -key-file certs/key.pem -cert-file certs/cert.pem www.signsyncmeet.localhost.com localhost')
  process.exit(1)
}

// Load certificates
const httpsOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
}

const app = next({ 
  dev, 
  hostname, 
  port,
  // Allow Next.js to build required files
  dir: __dirname
})
const handle = app.getRequestHandler()

// Wait for Next.js to fully prepare
app.prepare().then(() => {
  console.log('✅ Next.js app prepared successfully')
  createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      // Don't send error response if headers already sent
      if (!res.headersSent) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'text/html')
        res.end('<h1>Internal Server Error</h1><p>Please refresh the page or contact support.</p>')
      }
    }
  }).listen(port, (err) => {
    if (err) {
      console.error('Failed to start server:', err)
      process.exit(1)
    }
    console.log(`✅ Ready on https://${hostname}:${port}`)
    console.log(`   Also available at https://localhost:${port}`)
  })
}).catch((err) => {
  console.error('Failed to prepare Next.js app:', err)
  process.exit(1)
})



