# SignSync Meet - Project Structure

```
Original Project/
│
├── 📁 apps/                          # Monorepo applications
│   │
│   ├── 📁 frontend/                  # Next.js Frontend Application
│   │   ├── 📁 app/                   # Next.js App Router
│   │   │   ├── 📁 about/             # About page
│   │   │   │   └── page.tsx
│   │   │   ├── 📁 contact/           # Contact page
│   │   │   │   └── page.tsx
│   │   │   ├── 📁 create/            # Create meeting page
│   │   │   │   └── page.tsx
│   │   │   ├── 📁 join/              # Join meeting page
│   │   │   │   └── page.tsx
│   │   │   ├── 📁 login/             # Login page
│   │   │   │   └── page.tsx
│   │   │   ├── 📁 meet/              # Meeting room
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx      # Main meeting page
│   │   │   ├── 📁 profile/           # User profile page
│   │   │   │   └── page.tsx
│   │   │   ├── 📁 signup/            # Sign up page
│   │   │   │   └── page.tsx
│   │   │   ├── globals.css           # Global styles
│   │   │   ├── layout.tsx            # Root layout
│   │   │   └── page.tsx              # Homepage
│   │   │
│   │   ├── 📁 components/            # React Components
│   │   │   ├── 📁 ui/                # UI Components
│   │   │   │   └── Button.tsx
│   │   │   ├── CaptionsPanel.tsx     # Caption display
│   │   │   ├── Footer.tsx            # Footer component
│   │   │   ├── Header.tsx            # Navigation header
│   │   │   ├── Logo.tsx              # Logo component
│   │   │   ├── MediaPipeSignDetector.tsx  # Production sign detector
│   │   │   ├── MeetingControls.tsx   # Meeting controls UI
│   │   │   ├── ParticipantList.tsx   # Participants panel
│   │   │   ├── R3FHero.tsx           # 3D Hero section
│   │   │   ├── SignDetector.tsx      # Basic sign detector
│   │   │   ├── SpeechRecognition.tsx # Voice-to-text
│   │   │   └── VideoGrid.tsx         # Video grid layout
│   │   │
│   │   ├── 📁 lib/                   # Library utilities
│   │   │   ├── auth-context.tsx      # Auth context provider
│   │   │   ├── firebase.ts           # Firebase config
│   │   │   ├── fusion.ts             # Prediction fusion logic
│   │   │   └── tfjsClient.ts         # TFJS model utilities
│   │   │
│   │   ├── 📁 public/                # Static assets
│   │   │   ├── 📁 avatars/           # Avatar SVGs
│   │   │   │   ├── avatar1.svg
│   │   │   │   ├── avatar2.svg
│   │   │   │   ├── avatar3.svg
│   │   │   │   └── avatar4.svg
│   │   │   ├── 📁 models/            # ML Models
│   │   │   │   └── 📁 tfjs_landmark_model/  # TFJS model directory
│   │   │   │       └── placeholder_readme.txt
│   │   │   └── logo.svg              # Logo file
│   │   │
│   │   ├── 📁 types/                 # TypeScript types
│   │   │   └── speech-recognition.d.ts
│   │   │
│   │   ├── next.config.js            # Next.js config
│   │   ├── next-env.d.ts             # Next.js types
│   │   ├── package.json              # Frontend dependencies
│   │   ├── postcss.config.js         # PostCSS config
│   │   ├── tailwind.config.js        # Tailwind CSS config
│   │   ├── tsconfig.json             # TypeScript config
│   │   └── vercel.json               # Vercel deployment config
│   │
│   └── 📁 backend/                   # Express.js Backend
│       ├── 📁 src/
│       │   ├── 📁 controllers/       # Route controllers
│       │   │   ├── inferenceController.ts
│       │   │   ├── meetingController.ts
│       │   │   ├── supabaseStorageController.ts
│       │   │   ├── transcriptController.ts
│       │   │   └── userController.ts
│       │   │
│       │   ├── 📁 inference/         # Inference utilities
│       │   │   └── runLocalInference.ts  # Local PyTorch inference
│       │   │
│       │   ├── 📁 middleware/        # Express middleware
│       │   │   ├── auth.ts           # Auth middleware
│       │   │   └── errorHandler.ts   # Error handling
│       │   │
│       │   ├── 📁 models/            # MongoDB models
│       │   │   ├── Meeting.ts
│       │   │   ├── Transcript.ts
│       │   │   └── User.ts
│       │   │
│       │   ├── 📁 routes/            # API routes
│       │   │   ├── api.ts            # Main API router
│       │   │   ├── infer.ts          # Inference API route
│       │   │   └── supabaseStorage.ts
│       │   │
│       │   ├── 📁 services/          # Business logic services
│       │   │   ├── firebase.ts       # Firebase Admin
│       │   │   ├── mediasoup.ts      # MediaSoup SFU
│       │   │   ├── socketHandlers.ts # Socket.IO handlers
│       │   │   └── supabaseStorage.ts
│       │   │
│       │   ├── 📁 types/             # TypeScript types
│       │   │   └── inference.ts      # Inference types
│       │   │
│       │   ├── 📁 utils/             # Utility functions
│       │   │   └── saveClipUtil.ts   # Clip storage utilities
│       │   │
│       │   └── server.ts             # Express server entry point
│       │
│       ├── 📁 scripts/               # Python scripts
│       │   └── run_pytorch_infer.py  # PyTorch inference runner
│       │
│       ├── 📁 server/                # Server utilities
│       │   └── 📁 inference/
│       │       └── videoswin_client.py  # Triton/TorchServe client
│       │
│       ├── Dockerfile                # Docker configuration
│       ├── package.json              # Backend dependencies
│       ├── render.yaml               # Render deployment config
│       └── tsconfig.json             # TypeScript config
│
├── 📁 scripts/                       # Project-wide scripts
│   └── preprocess_extract_frames_and_landmarks.py  # Dataset preprocessing
│
├── 📁 models/                        # ML Model training & conversion
│   ├── convert_onnx_to_triton_config.sh    # Triton config generator
│   ├── convert_tf_to_tfjs.sh               # TFJS converter script
│   ├── export_onnx.py                      # ONNX export script
│   ├── train_landmark_tf.py                # TensorFlow landmark model training
│   └── train_videoswin_finetune.py         # Video-Swin training script
│
├── 📁 infra/                         # Infrastructure configs
│   ├── 📁 configs/                   # Config files
│   ├── 📁 scripts/
│   │   └── mongo-init.js             # MongoDB init script
│   └── docker-compose.yml            # Docker Compose config
│
├── 📁 ml/                            # Legacy ML directory (empty)
│   ├── 📁 convert/
│   └── 📁 training/
│
├── 📄 .env                           # Environment variables (not in repo)
├── 📄 env.example                    # Environment variable template
├── 📄 package.json                   # Root package.json (workspace config)
├── 📄 package-lock.json              # npm lockfile (not needed, using pnpm)
├── 📄 pnpm-lock.yaml                 # pnpm lockfile
├── 📄 pnpm-workspace.yaml            # pnpm workspace config
├── 📄 tsconfig.json                  # Root TypeScript config
├── 📄 start.bat                      # Quick start script (Windows)
│
└── 📁 Documentation/                 # Documentation files
    ├── 📄 README.md                  # Main project README
    ├── 📄 DEPLOY.md                  # Deployment guide
    ├── 📄 MONGODB_SETUP.md           # MongoDB setup guide
    ├── 📄 SIGN_DETECTION_INTEGRATION.md  # Sign detection integration guide
    └── 📄 IMPLEMENTATION_SUMMARY.md      # Implementation summary
```

## Key Directories Explanation

### `/apps/frontend`
- **Next.js 14** application with App Router
- React components for UI
- Client-side ML inference (TensorFlow.js)
- Real-time sign detection with MediaPipe

### `/apps/backend`
- **Express.js** server with TypeScript
- Socket.IO for real-time communication
- MongoDB models and controllers
- Server-side inference API
- Firebase Admin integration

### `/scripts`
- Dataset preprocessing Python scripts
- MediaPipe landmark extraction

### `/models`
- Model training scripts (PyTorch, TensorFlow)
- Model conversion utilities (TFJS, ONNX)
- Deployment configuration generators

### `/infra`
- Docker Compose configuration
- Infrastructure setup scripts
- MongoDB initialization

## Technology Stack

**Frontend:**
- Next.js 14, React 18, TypeScript
- TailwindCSS, Framer Motion
- MediaPipe Tasks, TensorFlow.js
- Firebase Auth

**Backend:**
- Node.js, Express, TypeScript
- Socket.IO, MediaSoup
- MongoDB, Redis
- Firebase Admin

**ML/AI:**
- PyTorch (Video-Swin)
- TensorFlow/Keras (Landmark models)
- MediaPipe (Hand tracking)
- TensorFlow.js (Client-side)

