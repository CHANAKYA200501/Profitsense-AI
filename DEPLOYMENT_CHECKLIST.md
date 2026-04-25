# 🚀 DEPLOYMENT QUICK CHECKLIST

## BEFORE YOU START
- [ ] Have GitHub account with your repo
- [ ] Have Vercel account (or create at https://vercel.com)
- [ ] Have Render account (or create at https://render.com)
- [ ] Have your code committed and pushed to GitHub

---

## 🔵 STEP 1: DEPLOY BACKEND ON RENDER (15 mins)

### Phase 1A: Create Render Account
- [ ] Go to https://render.com
- [ ] Click "Sign Up with GitHub"
- [ ] Authorize and connect your GitHub repo

### Phase 1B: Create PostgreSQL Database
- [ ] Dashboard → **New** → **PostgreSQL**
- [ ] Name: `etmind-db`
- [ ] Region: Choose closest to you
- [ ] Click **Create Database**
- [ ] ⏳ Wait 2-3 minutes
- [ ] Copy `DATABASE_URL` → save somewhere safe

### Phase 1C: Create Redis Instance
- [ ] Dashboard → **New** → **Redis**
- [ ] Name: `etmind-redis`
- [ ] Region: SAME as PostgreSQL
- [ ] Click **Create Redis**
- [ ] ⏳ Wait 1-2 minutes
- [ ] Copy `REDIS_URL` → save somewhere safe

### Phase 1D: Deploy Backend API
- [ ] Dashboard → **New** → **Web Service**
- [ ] Select your GitHub repo
- [ ] Name: `etmind-api`
- [ ] Environment: Python 3
- [ ] Build Command: `pip install -r backend/requirements.txt`
- [ ] Start Command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- [ ] Click **Advanced** → Add Environment Variables:

```
ENVIRONMENT=production
DATABASE_URL=[paste from PostgreSQL]
REDIS_URL=[paste from Redis]
JWT_SECRET_KEY=[generate: python3 -c "import secrets; print(secrets.token_urlsafe(32))"]
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ALLOWED_ORIGINS=https://YOUR_VERCEL_DOMAIN.vercel.app
```

- [ ] Click **Create Web Service**
- [ ] ⏳ Wait for build to complete (5-10 minutes)
- [ ] Copy Backend URL (e.g., `https://etmind-api.onrender.com`)

### Phase 1E: Verify Backend Works
- [ ] Open: `https://etmind-api.onrender.com/api/health`
- [ ] Should see: `{"status":"ok"}`
- [ ] ✅ Backend is live!

---

## 🟠 STEP 2: DEPLOY FRONTEND ON VERCEL (10 mins)

### Phase 2A: Prepare Frontend
```bash
# Terminal - Go to frontend directory
cd /Users/chanakya01/Documents/et/etmind/frontend

# Create .env.production
echo "VITE_API_BASE_URL=https://etmind-api.onrender.com" > .env.production
echo "VITE_ENVIRONMENT=production" >> .env.production

# Test build locally
npm install
npm run build

# Should see "dist/" folder created
# If it works → commit and push
git add .
git commit -m "Add production env config"
git push origin main
```

- [ ] Build completes without errors
- [ ] Code is committed and pushed to GitHub

### Phase 2B: Create Vercel Account
- [ ] Go to https://vercel.com
- [ ] Click "Sign Up with GitHub"
- [ ] Authorize and connect your GitHub repo

### Phase 2C: Import Project to Vercel
- [ ] Click **Add New** → **Project**
- [ ] Find your GitHub repo
- [ ] Click **Import**

### Phase 2D: Configure Vercel Settings
- [ ] **Framework Preset**: Vite
- [ ] **Root Directory**: `etmind/frontend`
- [ ] **Build Command**: `npm run build`
- [ ] **Output Directory**: `dist`
- [ ] Click **Environment Variables**
- [ ] Add:
```
VITE_API_BASE_URL=https://etmind-api.onrender.com
VITE_ENVIRONMENT=production
```
- [ ] Click **Deploy**
- [ ] ⏳ Wait for build to complete (3-5 minutes)
- [ ] Copy Frontend URL (e.g., `https://your-project.vercel.app`)

### Phase 2E: Verify Frontend Works
- [ ] Open your Vercel URL in browser
- [ ] Frontend should load
- [ ] Check console for errors (F12)
- [ ] Try using the app
- [ ] ✅ Frontend is live!

---

## 🟢 STEP 3: FINAL CONFIGURATION (5 mins)

### Phase 3A: Update Backend CORS (if needed)
If frontend domain has changed:
- [ ] Go to Render Dashboard
- [ ] Click your backend service (`etmind-api`)
- [ ] Go to **Environment**
- [ ] Edit `ALLOWED_ORIGINS`:
```
ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app
```
- [ ] Click **Save**
- [ ] Service will redeploy (1-2 minutes)

### Phase 3B: Test Complete Flow
- [ ] Open frontend URL
- [ ] Try to login or make API call
- [ ] Check Network tab (F12) to see requests
- [ ] Verify requests go to `https://etmind-api.onrender.com`
- [ ] ✅ Everything working!

---

## 📋 VERIFICATION CHECKLIST

| Check | Status |
|-------|--------|
| Backend `/api/health` returns OK | ✅ / ❌ |
| Frontend loads without errors | ✅ / ❌ |
| Frontend can call backend API | ✅ / ❌ |
| Database is connected | ✅ / ❌ |
| Redis is connected | ✅ / ❌ |
| CORS is configured correctly | ✅ / ❌ |

---

## 🆘 QUICK TROUBLESHOOTING

### Backend won't deploy
```
❌ Problem: Build fails on Render
✅ Solution: 
1. Check requirements.txt exists and is valid
2. Run locally: pip install -r backend/requirements.txt
3. Check for syntax errors in main.py
```

### Frontend won't load API calls
```
❌ Problem: Network errors in console
✅ Solution:
1. Check VITE_API_BASE_URL is correct
2. Check backend ALLOWED_ORIGINS includes frontend domain
3. Verify backend is actually running
```

### Database connection error
```
❌ Problem: "could not translate host name"
✅ Solution:
1. Use INTERNAL database URL (not external)
2. Wait for database to be fully created (2-3 mins)
3. Check DATABASE_URL env var is exactly correct
```

---

## 💾 IMPORTANT LINKS TO SAVE

```
Backend API: https://etmind-api.onrender.com
Frontend: https://your-project.vercel.app

Render Dashboard: https://render.com
Vercel Dashboard: https://vercel.com
GitHub Repo: [your-repo-url]
```

---

## ⏱️ ESTIMATED TIME
- **Backend deployment**: 15 minutes (mostly waiting)
- **Frontend deployment**: 10 minutes (mostly waiting)
- **Configuration**: 5 minutes
- **Total**: 30 minutes

---

## 📞 NEXT STEPS AFTER DEPLOYMENT

1. Test with real data
2. Set up custom domain (optional)
3. Monitor logs in Render/Vercel dashboards
4. Set up error alerts
5. Configure auto-deploys on GitHub pushes

✅ You're done! Your app is live!
