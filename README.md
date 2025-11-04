# SignSync Meet - AI Video Conferencing for Sign Language Translation

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/aadidevj007/SignSyncMeet)

**SignSync Meet** is a futuristic AI-powered video conferencing platform that enables bidirectional sign language ↔ speech translation in real-time. Built with Next.js, Firebase, MediaPipe, TensorFlow.js, and advanced ML models.

## 🌟 Features

### ✨ Core Functionality
- **Real-time Sign Language Detection** - Multi-tier pipeline (Template Matching → TFJS → Server Inference)
- **Real-time Voice-to-Text** - Web Speech API + Server ASR fallback
- **Multimodal Fusion** - Combines sign and voice predictions for best accuracy
- **Live Captions** - Real-time captions for both sign and voice
- **Google Meet-style UI** - Modern, responsive interface

### 🎨 User Experience
- **Light/Dark Theme Toggle** - System preference detection with persistence
- **Full Meeting Controls** - Mute, video, screen share, raise hand, participants
- **Keyboard Shortcuts** - Quick actions (M, V, R, C, L keys)
- **Contact Form** - Email integration for support

### 🔧 Technical Features
- **MediaPipe Hand Tracking** - Real-time hand landmark extraction
- **TFJS Model Inference** - Client-side AI model processing
- **Server Inference** - Video-Swin/PoseFormerV2 for complex signs
- **Multi-language ASR** - English, Tamil, Malayalam, Telugu support
- **Socket.IO** - Real-time communication
- **Firebase Auth** - Secure authentication

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and pnpm
- Firebase project
- (Optional) Gmail App Password for contact form

### Installation

```bash
# Clone the repository
git clone https://github.com/aadidevj007/SignSyncMeet.git
cd SignSyncMeet

# Install dependencies
pnpm install

# Install backend email dependency
cd apps/backend
npm install nodemailer @types/nodemailer
cd ../..
```

### Environment Setup

Create `.env.local` in `apps/frontend`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Create `.env` in `apps/backend`:
```env
EMAIL_USER=aadidevj4@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
PORT=3001
# ... Firebase/MongoDB configs
```

### Run Development

```bash
# Start both frontend and backend
pnpm dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## 📦 Deployment

### Deploy to Vercel

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Initial commit: SignSync Meet"
   git branch -M main
   git remote add origin https://github.com/aadidevj007/SignSyncMeet.git
   git push -u origin main
   ```

2. **Deploy on Vercel:**
   - Go to [Vercel](https://vercel.com)
   - Import your GitHub repository
   - Set root directory to: `apps/frontend`
   - Add environment variables (same as `.env.local`)
   - Deploy!

   Or use Vercel CLI:
   ```bash
   npm i -g vercel
   cd apps/frontend
   vercel
   ```

### Vercel Configuration

The project includes `apps/frontend/vercel.json` with:
- Root directory: `apps/frontend`
- Build command: `cd ../.. && pnpm install && pnpm --filter frontend build`
- Framework: Next.js

## 🏗️ Project Structure

```
SignSyncMeet/
├── apps/
│   ├── frontend/          # Next.js frontend
│   │   ├── app/           # Next.js app router
│   │   ├── components/    # React components
│   │   ├── lib/          # Utilities and contexts
│   │   └── public/       # Static assets
│   └── backend/          # Express.js backend
│       ├── src/
│       │   ├── routes/   # API routes
│       │   ├── controllers/
│       │   └── services/
├── ml/                    # ML training pipeline
│   ├── training/          # Training scripts
│   ├── convert/           # Model conversion
│   └── configs/          # Training configs
├── Documentation/        # Project documentation
└── README.md
```

## 📚 Documentation

- [Training Guide](Documentation/TRAINING_GUIDE.md) - ML model training
- [Datasets Guide](Documentation/DATASETS.md) - Dataset setup
- [Implementation Summary](IMPLEMENTATION_COMPLETE.md) - Complete feature list
- [Functionality Summary](FUNCTIONALITY_SUMMARY.md) - How everything works

## 🎯 Features in Detail

### Sign Language Translation
1. **MediaPipe** extracts hand landmarks (21 points × 2 hands)
2. **Template Matching** (DTW) for fast recognition
3. **TFJS Model** for classification
4. **Server Inference** (Video-Swin/PoseFormerV2) for complex signs
5. Real-time captions displayed in meeting interface

### Voice-to-Text
1. **Web Speech API** for real-time English transcription
2. **Server ASR** (faster-whisper/OpenAI) for multi-language support
3. Automatic fallback between modes
4. Real-time voice captions displayed

## 🔐 Security

- Firebase Authentication
- Environment variable protection
- Secure API endpoints
- CORS configuration
- Rate limiting

## 🤝 Contributing

This is a project by:
- Aadidev J (Section S13 | Reg No: 99230041022)
- S Dhanush (Section S13 | Reg No: 99230041087)
- S Ganesh Kumar (Section S13 | Reg No: 99230041090)
- G Sudharsan (Section S13 | Reg No: 99230041105)

## 📄 License

This project is developed for educational purposes.

## 📧 Contact

- Email: aadidevj4@gmail.com
- Contact Page: `/contact`

---

**Built with ❤️ by the SignSync Team**
