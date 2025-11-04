#!/bin/bash
# Setup HTTPS certificates for local development
# Uses mkcert to create local CA and certificates

set -e

echo "🔒 Setting up HTTPS for www.signsyncmeet.localhost.com"

# Check if mkcert is installed
if ! command -v mkcert &> /dev/null; then
  echo "❌ mkcert not found. Please install it first:"
  echo "   macOS: brew install mkcert"
  echo "   Linux: sudo apt install libnss3-tools && wget -O mkcert https://github.com/FiloSottile/mkcert/releases/latest/download/mkcert-v1.4.4-linux-amd64 && chmod +x mkcert"
  echo "   Windows: choco install mkcert"
  exit 1
fi

# Create certs directory if it doesn't exist
mkdir -p apps/frontend/certs

# Install local CA (one-time setup)
echo "📜 Installing local CA..."
mkcert -install

# Generate certificate for the custom domain
echo "🔐 Generating certificate for www.signsyncmeet.localhost.com..."
cd apps/frontend/certs
mkcert -key-file key.pem -cert-file cert.pem www.signsyncmeet.localhost.com signsyncmeet.localhost.com localhost 127.0.0.1 ::1

echo "✅ Certificate generated at apps/frontend/certs/cert.pem"
echo "✅ Key generated at apps/frontend/certs/key.pem"
echo ""
echo "Next steps:"
echo "1. Update apps/frontend/package.json dev script to use HTTPS"
echo "2. Access https://www.signsyncmeet.localhost.com:3000"



