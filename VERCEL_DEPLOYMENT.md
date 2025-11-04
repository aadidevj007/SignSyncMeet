# Vercel Deployment Guide

## 🚀 Quick Deploy to Vercel

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Go to [Vercel](https://vercel.com)**
   - Sign in with GitHub
   - Click "Add New Project"

2. **Import Repository**
   - Select `aadidevj007/SignSyncMeet`
   - Click "Import"

3. **Configure Project**
   - **Framework Preset:** Next.js
   - **Root Directory:** `apps/frontend`
   - **Build Command:** `cd ../.. && pnpm install && pnpm --filter frontend build`
   - **Install Command:** `cd ../.. && pnpm install`
   - **Output Directory:** `.next` (default)

4. **Environment Variables**
   Add all Firebase and API variables:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_API_URL=https://your-backend-url.vercel.app
   ```

5. **Deploy!**
   - Click "Deploy"
   - Wait for build to complete
   - Your site will be live at `https://yoursite.vercel.app`

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to frontend directory
cd apps/frontend

# Deploy
vercel

# Follow the prompts:
# - Link to existing project? No
# - Project name? signsync-meet (or your choice)
# - Directory? ./apps/frontend
# - Override settings? Yes
# - Build command? cd ../.. && pnpm install && pnpm --filter frontend build
# - Install command? cd ../.. && pnpm install
# - Output directory? .next

# Add environment variables
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
# ... (add all other env vars)

# Deploy to production
vercel --prod
```

---

## 📋 Vercel Configuration

The project includes `apps/frontend/vercel.json` with:
```json
{
  "buildCommand": "cd ../.. && pnpm install && pnpm --filter frontend build",
  "installCommand": "cd ../.. && pnpm install",
  "framework": "nextjs",
  "rootDirectory": "apps/frontend"
}
```

This ensures Vercel:
- Installs dependencies from the monorepo root
- Builds only the frontend app
- Uses Next.js framework detection

---

## 🔧 Backend Deployment

The backend needs to be deployed separately. Options:

### Option A: Deploy Backend to Vercel (Serverless)
- Create separate Vercel project for backend
- Use serverless functions in `apps/backend/src/routes/`
- Configure API routes as Vercel serverless functions

### Option B: Deploy Backend to Render/Railway/Heroku
- Better for long-running WebSocket connections
- Use `apps/backend/render.yaml` for Render.com
- Set environment variables in hosting platform

### Option C: Keep Backend on Local/Private Server
- Update `NEXT_PUBLIC_API_URL` in frontend env vars
- Ensure backend is accessible from Vercel domain

---

## 🌐 Post-Deployment

### 1. Update Firebase Authorized Domains
- Go to Firebase Console → Authentication → Settings
- Add your Vercel domain: `yoursite.vercel.app`

### 2. Update CORS
- Backend should allow requests from Vercel domain
- Update CORS settings in `apps/backend/src/server.ts`

### 3. Test Features
- Sign language detection
- Voice-to-text
- Contact form
- Theme toggle
- All navigation

---

## 📝 Notes

- **Monorepo Structure:** Vercel needs to install from root, then build frontend
- **Environment Variables:** All Firebase vars must start with `NEXT_PUBLIC_` for client-side access
- **Build Time:** First build may take 5-10 minutes due to dependencies
- **Custom Domain:** Add your domain in Vercel project settings

---

**Repository:** https://github.com/aadidevj007/SignSyncMeet

**Ready to deploy!** 🚀

