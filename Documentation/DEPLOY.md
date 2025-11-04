# 🚀 Deploy SignSync Meet for Free

## Overview
This guide will help you deploy SignSync Meet completely free using:
- **Frontend**: Vercel (optimized for Next.js)
- **Backend**: Render (free tier)
- **Database**: MongoDB Atlas (free tier)
- **Storage**: Supabase (already configured)

## 📋 Prerequisites
- GitHub account
- Vercel account (free)
- Render account (free)
- MongoDB Atlas account (free)

---

## 🌐 Step 1: Deploy Frontend on Vercel

### Option A: One-Click Deploy
1. Go to [Vercel](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Set **Root Directory** to: `apps/frontend`
5. Add environment variables:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBLFqMz6Uj3kQNTEVXtKpXQm6xe8bGJ4Ts
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=signsync-meet-f2053.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=signsync-meet-f2053
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=signsync-meet-f2053.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=747400022903
   NEXT_PUBLIC_FIREBASE_APP_ID=1:747400022903:web:49c171ac0e3ea1cbfaef72
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-QLJFQJ8VW2
   NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
   NEXT_PUBLIC_SUPABASE_URL=https://mivkqnyjbxaosgmsxfan.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pdmtxbnlqYnhhb3NnbXN4ZmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MDU4NTAsImV4cCI6MjA3NjQ4MTg1MH0.lsLzwEYhZP3gEdh96fmpaVu_VPVj8COPyHXKvvL--pM
   ```
6. Click "Deploy"
7. Done! Your frontend will be live at `https://your-project.vercel.app`

### Option B: Manual Deploy via CLI
```bash
cd apps/frontend
npm install -g vercel
vercel login
vercel
```

---

## 🖥️ Step 2: Deploy Backend on Render

### 1. Create Render Account
- Go to [render.com](https://render.com)
- Sign up with GitHub

### 2. Create Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `signsync-backend`
   - **Environment**: `Node`
   - **Build Command**: `cd apps/backend && npm install && npm run build`
   - **Start Command**: `cd apps/backend && npm start`
   - **Root Directory**: Leave empty (Render handles this)

### 3. Add Environment Variables
In Render dashboard, add these variables:
```
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://your-frontend.vercel.app
SUPABASE_URL=https://mivkqnyjbxaosgmsxfan.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pdmtxbnlqYnhhb3NnbXN4ZmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MDU4NTAsImV4cCI6MjA3NjQ4MTg1MH0.lsLzwEYhZP3gEdh96fmpaVu_VPVj8COPyHXKvvL--pM
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pdmtxbnlqYnhhb3NnbXN4ZmFuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDkwNTg1MCwiZXhwIjoyMDc2NDgxODUwfQ.wGj7hL78qFFGOvIG6pFZHc9BZo7xTOQv-kU9wy8sYnc
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_random_secret_key_here
```

### 4. Deploy
- Click "Create Web Service"
- Render will build and deploy automatically
- Your backend will be at `https://your-backend.onrender.com`

---

## 🗄️ Step 3: Setup MongoDB Atlas (Free)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free account
3. Create a new cluster (free tier M0)
4. Create database user
5. Whitelist IP: `0.0.0.0/0` (allow all IPs)
6. Get connection string
7. Replace `<password>` with your actual password
8. Add to Render environment variables as `MONGODB_URI`

---

## 🔄 Step 4: Update Frontend to Use Production Backend

1. Go back to Vercel dashboard
2. Navigate to your project settings
3. Go to Environment Variables
4. Update `NEXT_PUBLIC_API_URL` to your Render URL
5. Redeploy

---

## 🎯 Alternative: All-in-One Deployment (Vercel)

You can also deploy everything on Vercel using API Routes:

1. Move backend logic to `apps/frontend/app/api` folder
2. Deploy only frontend on Vercel
3. All routes will be handled by Next.js API routes
4. This is simpler but less scalable

---

## 🆓 Free Tier Limits

### Vercel
- Unlimited projects
- 100GB bandwidth/month
- Automatic HTTPS
- Custom domains

### Render
- 750 hours/month free
- Sleeps after 15 minutes idle (first request wakes it up)
- Free SSL
- Persistent disk available

### MongoDB Atlas
- 512MB storage
- Shared CPU and RAM
- Perfect for development

---

## 📝 Quick Deploy Checklist

- [ ] Create GitHub repository
- [ ] Push code to GitHub
- [ ] Sign up for Vercel
- [ ] Deploy frontend on Vercel
- [ ] Sign up for Render
- [ ] Deploy backend on Render
- [ ] Create MongoDB Atlas cluster
- [ ] Add environment variables
- [ ] Test deployment
- [ ] Share your live URL!

---

## 🎉 Your Live Website Will Be At:

- **Frontend**: `https://signsync-meet.vercel.app`
- **Backend**: `https://signsync-backend.onrender.com`
- **Total Cost**: $0/month

---

## 💡 Tips

1. **Keep Render awake**: Use [cron-job.org](https://cron-job.org) to ping your Render URL every 10 minutes
2. **Monitor**: Check Render dashboard for logs
3. **SSL**: Both platforms provide free SSL certificates
4. **Custom domain**: Add your own domain for free on both platforms

Enjoy your live SignSync Meet! 🚀

