# 🚀 Render Deployment - Complete Setup Files

## 📁 Files Created for You

I've created all the necessary files for deploying your backend to Render:

### 1. **render.yaml** ← MAIN FILE
   - Contains all service configurations (Web, Database, Redis, Workers)
   - Automatically syncs with Render dashboard
   - **Location**: `/etmind/render.yaml` (root of repo)
   - **What it does**: Defines all services in one file

### 2. **QUICK_START_RENDER.md** ← START HERE
   - 10-step quick deployment guide
   - TL;DR version of everything
   - Cost breakdown
   - **Read this first**

### 3. **RENDER_DEPLOYMENT_GUIDE.md** ← COMPREHENSIVE
   - Complete 10-step guide with explanations
   - Database migration instructions
   - Celery/background job setup
   - Troubleshooting section
   - Performance optimization tips

### 4. **ENV_VARIABLES_SETUP.md** ← REFERENCE
   - Exact environment variables needed
   - Where to get each value
   - How to set them in Render
   - Common mistakes to avoid
   - Testing guide

### 5. **.env.production.template**
   - Template for all environment variables
   - Copy and customize with your values
   - Reference for what's needed

### 6. **deployment-check.sh** ← OPTIONAL
   - Bash script to verify your setup
   - Checks all required files exist
   - Validates configuration
   - Run before deploying

---

## ⚡ Super Quick Start (5 minutes)

### 1. Make your code deployment-ready
```bash
cd /Users/chanakya01/Documents/et
git add .
git commit -m "Add Render deployment config"
git push origin main
```

### 2. Go to Render
- https://render.com
- Sign up with GitHub
- Click **"New"** → **"PostgreSQL"** (wait for it)
- Click **"New"** → **"Redis"** (wait for it)
- Click **"New"** → **"Web Service"**
- Select your GitHub repo
- Add environment variables (see ENV_VARIABLES_SETUP.md)
- Click **"Deploy"**

### 3. Copy connection strings
From your PostgreSQL and Redis instances:
- Get `DATABASE_URL` → paste in Web Service env vars
- Get `REDIS_URL` → paste in Web Service env vars

### 4. Done!
Your backend is live. Test it:
```
https://your-service-name.onrender.com/api/health
```

---

## 🎯 Step-by-Step Deployment

### Step 1: Prepare Code ✅ (Done for you)
```
✓ render.yaml created
✓ requirements.txt exists
✓ main.py has health check endpoint
✓ Dockerfile present
✓ Database migrations ready
```

### Step 2: Create Render Account
- Go to https://render.com
- Click "Sign up"
- Connect GitHub

### Step 3: Create PostgreSQL Database
1. Dashboard → **"New"** → **"PostgreSQL"**
2. Name: `profitsense-db`
3. Click **"Create Database"**
4. ⏳ Wait ~2 minutes for creation
5. **Copy connection string** (you'll need it)

### Step 4: Create Redis Cache
1. Dashboard → **"New"** → **"Redis"**
2. Name: `profitsense-redis`
3. Click **"Create Redis"**
4. ⏳ Wait ~2 minutes for creation
5. **Copy connection string**

### Step 5: Deploy Web Service
1. Dashboard → **"New"** → **"Web Service"**
2. Select your GitHub repo
3. Settings:
   - **Name**: `profitsense-backend`
   - **Root Directory**: (leave empty)
   - **Build Command**: `pip install -r backend/requirements.txt && cd backend && alembic upgrade head`
   - **Start Command**: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Click **"Create Web Service"**
5. ⏳ Wait 3-5 minutes for first build

### Step 6: Add Environment Variables
In your Web Service settings → **"Environment"**, add:
```
DATABASE_URL=postgresql://...  (from PostgreSQL instance)
REDIS_URL=redis://...           (from Redis instance)
ALLOWED_ORIGINS=https://your-frontend.com
ENVIRONMENT=production
JWT_SECRET_KEY=your-random-32-char-secret-key
TELEGRAM_BOT_TOKEN=your-token (if using)
TELEGRAM_CHAT_ID=your-id (if using)
```

See **ENV_VARIABLES_SETUP.md** for exact values.

### Step 7: Verify Deployment
1. Go to Web Service → **"Logs"** tab
2. Look for: `Application startup complete`
3. Test endpoint:
   ```bash
   curl https://your-service-name.onrender.com/api/health
   ```
4. Should return: `{"status": "healthy", "service": "profitsense-backend"}`

### Step 8: Deploy Celery Worker (Optional but Recommended)
1. Dashboard → **"New"** → **"Background Worker"**
2. Same repo, settings:
   - **Name**: `profitsense-celery-worker`
   - **Build**: `pip install -r backend/requirements.txt`
   - **Start**: `cd backend && celery -A tasks.celery_app worker --loglevel=info`
3. Add environment variables: `DATABASE_URL`, `REDIS_URL`, `ENVIRONMENT`
4. Click **"Create Worker"**

### Step 9: Deploy Celery Beat (Optional)
1. Dashboard → **"New"** → **"Background Worker"**
2. Settings:
   - **Name**: `profitsense-celery-beat`
   - **Build**: `pip install -r backend/requirements.txt`
   - **Start**: `cd backend && celery -A tasks.celery_app beat --loglevel=info`
3. Add environment variables: `DATABASE_URL`, `REDIS_URL`, `ENVIRONMENT`
4. Click **"Create Worker"**

### Step 10: Configure Frontend
Update your frontend to use the new API:
```
https://your-service-name.onrender.com/api/
```

---

## 📊 What Each File Does

| File | Purpose | When to Use |
|------|---------|------------|
| **render.yaml** | Service configuration | For Render to know what to deploy |
| **QUICK_START_RENDER.md** | Fast 10-step guide | First time deploying |
| **RENDER_DEPLOYMENT_GUIDE.md** | Detailed instructions | Need more details/troubleshooting |
| **ENV_VARIABLES_SETUP.md** | Environment variables | Setting up credentials |
| **.env.production.template** | Variables template | Reference for what's needed |
| **deployment-check.sh** | Verification script | Validate setup before deploying |

---

## 🔍 Verify Everything is Ready

### Option 1: Run the check script (Recommended)
```bash
cd /Users/chanakya01/Documents/et
chmod +x deployment-check.sh
./deployment-check.sh
```

### Option 2: Manual checks
```bash
# Check render.yaml exists
test -f render.yaml && echo "✓ render.yaml found"

# Check requirements.txt exists
test -f etmind/backend/requirements.txt && echo "✓ requirements.txt found"

# Check health endpoint
grep "health" etmind/backend/main.py && echo "✓ Health endpoint found"

# Check migrations
test -d etmind/backend/migrations && echo "✓ Migrations directory found"
```

---

## 📋 Pre-Deployment Checklist

Before clicking "Deploy" on Render:

- [ ] **Code committed** to GitHub
- [ ] **render.yaml** in repository root
- [ ] **DATABASE_URL** value copied (from PostgreSQL instance)
- [ ] **REDIS_URL** value copied (from Redis instance)
- [ ] **JWT_SECRET_KEY** generated (run: `openssl rand -hex 32`)
- [ ] **Frontend domain** ready (for ALLOWED_ORIGINS)
- [ ] **.env file in .gitignore** (don't commit secrets!)
- [ ] **Health endpoint** exists in main.py
- [ ] **All requirements** in requirements.txt

---

## 🆘 Quick Troubleshooting

### Service won't deploy
**Check**: render.yaml syntax, requirements.txt exists, start command correct

### Health check fails
**Check**: Add `@app.get("/api/health")` to main.py

### Database won't connect
**Check**: DATABASE_URL format, password URL-encoded if special chars

### Celery not working
**Check**: REDIS_URL set in worker, Redis instance running

### CORS errors in browser
**Check**: ALLOWED_ORIGINS includes your frontend domain

---

## 💬 Getting Help

1. **Read** RENDER_DEPLOYMENT_GUIDE.md (detailed troubleshooting)
2. **Check** Render docs: https://render.com/docs
3. **Review** logs in Render dashboard
4. **Test locally** if deployment fails:
   ```bash
   cd etmind/backend
   uvicorn main:app --reload
   ```

---

## 🎓 Next Learning Steps

After successful deployment:
1. Set up monitoring (Sentry, DataDog)
2. Configure SSL certificate (auto with Render)
3. Set up CI/CD for automatic deployments
4. Monitor costs and scale as needed
5. Implement database backups

---

## 📞 Support Resources

- **Render Docs**: https://render.com/docs
- **FastAPI Deployment**: https://fastapi.tiangolo.com/deployment/
- **PostgreSQL**: https://www.postgresql.org/docs/
- **Celery**: https://docs.celeryproject.io/

---

## 🎉 When Deployment is Complete

1. ✅ Backend is live at: `https://your-service.onrender.com`
2. ✅ Health check works: `https://your-service.onrender.com/api/health`
3. ✅ Database is connected
4. ✅ Redis cache is working
5. ✅ API endpoints are accessible
6. ✅ (Optional) Celery workers are processing tasks

**You're ready to connect your frontend!**

---

## 📝 Summary

| Task | Time | Difficulty |
|------|------|-----------|
| Create Render account | 5 min | Easy |
| Create PostgreSQL DB | 5 min | Easy |
| Create Redis | 5 min | Easy |
| Deploy web service | 5 min | Easy |
| Set environment vars | 5 min | Easy |
| Test deployment | 5 min | Easy |
| **Total** | **~30 min** | **Easy** |

---

**Everything is prepared for you. You just need to follow the steps!** 🚀

For detailed instructions, see: **QUICK_START_RENDER.md** or **RENDER_DEPLOYMENT_GUIDE.md**
