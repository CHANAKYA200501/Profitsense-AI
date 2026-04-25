# Complete Deployment Guide: Vercel (Frontend) + Render (Backend)

## Overview
- **Frontend**: React + TypeScript (Vite) → **Vercel**
- **Backend**: Python FastAPI → **Render**
- **Database**: PostgreSQL → **Render**
- **Cache**: Redis → **Render**

---

# PART 1: BACKEND DEPLOYMENT ON RENDER

## Step 1: Prepare Your Backend Code

### 1.1 Verify Backend Structure
```bash
cd /Users/chanakya01/Documents/et/etmind
ls -la
# Should see: backend/, docker-compose.yml, render.yaml
```

### 1.2 Check requirements.txt
```bash
cat backend/requirements.txt
```
✅ Ensure it includes:
- `fastapi`
- `uvicorn`
- `sqlalchemy`
- `psycopg2-binary` (PostgreSQL driver)
- `redis`
- `celery`
- `python-dotenv`

### 1.3 Verify main.py has Health Check
```python
# backend/main.py should have:
@app.get("/api/health")
def health_check():
    return {"status": "ok"}
```

### 1.4 Update .gitignore
```bash
echo "venv/
venv_310/
__pycache__/
*.pyc
.env
.env.local
.env.production
.DS_Store
*.db
data/
ml_training/
.pytest_cache/
node_modules/" >> .gitignore
```

### 1.5 Commit to Git
```bash
cd /Users/chanakya01/Documents/et
git add .
git commit -m "Prepare backend for Render deployment"
git push origin main
```

---

## Step 2: Create Render Account & Connect GitHub

### 2.1 Go to Render
- Visit https://render.com
- Click **"Sign Up"**
- Choose **"Sign up with GitHub"**
- Authorize Render to access your GitHub

### 2.2 Select Your Repository
- Click **"New"** → **"Web Service"**
- Select your repository from the list
- Click **"Connect"**

---

## Step 3: Create PostgreSQL Database

### 3.1 Create Database Instance
1. Go to Render Dashboard
2. Click **"New"** → **"PostgreSQL"**
3. Configure:
   - **Name**: `etmind-db`
   - **Database**: `etmind`
   - **User**: `postgres`
   - **Region**: Choose closest to you (e.g., "Oregon", "N. Virginia")
   - **Plan**: Free (for testing) or Standard
4. Click **"Create Database"**
5. ⏳ Wait 2-3 minutes for creation

### 3.2 Save Connection Details
Once created, you'll see:
- **Internal Database URL** (for services in same region)
- **External Database URL** (for external connections)

📌 **Copy and save**:
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@HOST:5432/etmind
```

---

## Step 4: Create Redis Instance

### 4.1 Create Redis Instance
1. Go to Render Dashboard
2. Click **"New"** → **"Redis"**
3. Configure:
   - **Name**: `etmind-redis`
   - **Region**: Same as PostgreSQL
   - **Plan**: Free (for testing) or Standard
4. Click **"Create Redis"**
5. ⏳ Wait 1-2 minutes

### 4.2 Save Connection Details
📌 **Copy and save**:
```
REDIS_URL=redis://:YOUR_PASSWORD@HOST:6379
```

---

## Step 5: Deploy Backend Web Service

### 5.1 Create Web Service
1. Go to Render Dashboard
2. Click **"New"** → **"Web Service"**
3. Select your GitHub repository
4. Configure:
   - **Name**: `etmind-api`
   - **Environment**: `Python 3`
   - **Region**: Same as DB/Redis
   - **Branch**: `main`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free (for testing) or Standard

### 5.2 Add Environment Variables
Click **"Advanced"** and add these variables:

```
ENVIRONMENT=production
DATABASE_URL=postgresql://postgres:PASSWORD@HOST:5432/etmind
REDIS_URL=redis://:PASSWORD@HOST:6379
JWT_SECRET_KEY=your_secret_key_here_at_least_32_chars
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app,https://www.your-frontend-domain.com
```

**To generate JWT_SECRET_KEY**:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 5.3 Deploy
- Click **"Create Web Service"**
- ⏳ Render will automatically build and deploy
- Once complete, you'll see a green "Live" status
- Your API URL: `https://etmind-api.onrender.com`

### 5.4 Verify Deployment
```bash
curl https://etmind-api.onrender.com/api/health
# Should return: {"status":"ok"}
```

---

## Step 6: Run Database Migrations (If Needed)

### 6.1 Check for Alembic Migrations
```bash
ls -la backend/migrations/versions/
```

### 6.2 Run Migrations on Render (Optional)
If you have migrations, you can:

**Option A**: Run migrations during build
- Update **Build Command** to:
```bash
pip install -r backend/requirements.txt && alembic upgrade head
```

**Option B**: Run migrations manually via SSH
- Click your Web Service on Render
- Go to **"Shell"** tab
- Run:
```bash
cd backend && alembic upgrade head
```

---

# PART 2: FRONTEND DEPLOYMENT ON VERCEL

## Step 1: Prepare Your Frontend Code

### 1.1 Navigate to Frontend
```bash
cd /Users/chanakya01/Documents/et/etmind/frontend
```

### 1.2 Check package.json Exists
```bash
cat package.json
```
✅ Should have scripts:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  }
}
```

### 1.3 Create .env.production File
```bash
cat > .env.production << 'EOF'
VITE_API_BASE_URL=https://etmind-api.onrender.com
VITE_ENVIRONMENT=production
EOF
```

### 1.4 Verify Vite Config
```bash
cat vite.config.ts
```
Should include build configuration.

### 1.5 Install Dependencies Locally
```bash
npm install
```

### 1.6 Test Build Locally
```bash
npm run build
```
Should create a `dist/` folder without errors.

### 1.7 Commit to Git
```bash
cd /Users/chanakya01/Documents/et
git add etmind/frontend/
git commit -m "Prepare frontend for Vercel deployment"
git push origin main
```

---

## Step 2: Create Vercel Account & Connect GitHub

### 2.1 Go to Vercel
- Visit https://vercel.com
- Click **"Sign Up"**
- Choose **"Continue with GitHub"**
- Authorize Vercel to access your GitHub

### 2.2 Import Project
1. Click **"Add New"** → **"Project"**
2. Select your GitHub repository
3. Click **"Import"**

---

## Step 3: Configure Project Settings

### 3.1 Select Framework
- **Framework Preset**: Vite
- **Root Directory**: `etmind/frontend` (if monorepository)

### 3.2 Set Build Settings
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 3.3 Add Environment Variables
Click **"Environment Variables"** and add:

```
VITE_API_BASE_URL=https://etmind-api.onrender.com
VITE_ENVIRONMENT=production
```

**For Preview/Staging (optional)**:
```
VITE_API_BASE_URL=https://etmind-api.onrender.com
VITE_ENVIRONMENT=staging
```

### 3.4 Deploy
- Click **"Deploy"**
- ⏳ Vercel will build and deploy automatically
- Once complete, you'll get your live URL: `https://YOUR_PROJECT.vercel.app`

---

## Step 4: Configure Custom Domain (Optional)

### 4.1 Add Domain
1. Go to your project on Vercel
2. Click **"Settings"** → **"Domains"**
3. Add your custom domain
4. Follow Vercel's instructions for DNS configuration

### 4.2 Update Backend CORS
In Render backend settings, update:
```
ALLOWED_ORIGINS=https://your-custom-domain.com,https://www.your-custom-domain.com
```

---

# PART 3: ENVIRONMENT VARIABLES REFERENCE

## Backend (Render) - Complete List

| Variable | Example | Required |
|----------|---------|----------|
| `ENVIRONMENT` | `production` | ✅ |
| `DATABASE_URL` | `postgresql://...` | ✅ |
| `REDIS_URL` | `redis://...` | ✅ |
| `JWT_SECRET_KEY` | `abc123def...` | ✅ |
| `JWT_ALGORITHM` | `HS256` | ✅ |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | ✅ |
| `ALLOWED_ORIGINS` | `https://domain.com` | ✅ |
| `TELEGRAM_BOT_TOKEN` | `123456:ABC...` | ❌ |
| `BROKER_API_KEY` | `your-key` | ❌ |

## Frontend (Vercel) - Complete List

| Variable | Example | Required |
|----------|---------|----------|
| `VITE_API_BASE_URL` | `https://etmind-api.onrender.com` | ✅ |
| `VITE_ENVIRONMENT` | `production` | ✅ |
| `VITE_LOG_LEVEL` | `info` | ❌ |

---

# PART 4: VERIFICATION CHECKLIST

## Backend Verification
- [ ] Created PostgreSQL database on Render
- [ ] Created Redis instance on Render
- [ ] Deployed backend Web Service on Render
- [ ] Backend is responding to `/api/health`
- [ ] Database migrations are applied
- [ ] Environment variables are set correctly

## Frontend Verification
- [ ] Imported project from GitHub on Vercel
- [ ] Build completes successfully
- [ ] Frontend is accessible at Vercel URL
- [ ] API calls are reaching backend correctly
- [ ] Custom domain is configured (if applicable)

---

# PART 5: TROUBLESHOOTING

## Backend Issues

### Service won't start
1. Check build logs on Render
2. Verify Python version is 3.10+
3. Check requirements.txt syntax
4. Verify all environment variables are set

### Database connection error
```
Error: could not translate host name "HOST" to address
```
- ✅ Use Internal Database URL for services in same region
- ❌ Don't use External Database URL

### CORS errors on frontend
- Check `ALLOWED_ORIGINS` includes your Vercel domain
- Format: `https://domain.com` (no trailing slash)

## Frontend Issues

### Build fails
1. Check build logs in Vercel
2. Run `npm run build` locally to reproduce
3. Verify `vite.config.ts` is correct
4. Check for missing dependencies in `package.json`

### API calls fail
- Verify `VITE_API_BASE_URL` is correct
- Check backend is responding
- Check CORS settings on backend

### Slow performance
- Check frontend is not calling API in loops
- Verify Redis is working on backend
- Check database query performance

---

# PART 6: QUICK REFERENCE COMMANDS

```bash
# Test backend locally
cd /Users/chanakya01/Documents/et/etmind/backend
python3 -m pip install -r requirements.txt
uvicorn main:app --reload

# Test frontend locally
cd /Users/chanakya01/Documents/et/etmind/frontend
npm install
npm run dev

# Build frontend for production
npm run build

# Check git status before deploying
git status

# Push changes to GitHub
git push origin main
```

---

# PART 7: ESTIMATED COSTS (Monthly)

| Service | Free Tier | Standard |
|---------|-----------|----------|
| Vercel Frontend | ✅ Included | ~$20/mo |
| Render Web Service | ✅ Included | $7/mo |
| Render PostgreSQL | ❌ 90 days free | $7/mo |
| Render Redis | ❌ 90 days free | $7/mo |
| **Total** | **✅ FREE** | **~$41/mo** |

---

## Next Steps
1. ✅ Create Render account
2. ✅ Create databases (PostgreSQL + Redis)
3. ✅ Deploy backend on Render
4. ✅ Create Vercel account
5. ✅ Deploy frontend on Vercel
6. ✅ Update CORS settings
7. ✅ Test end-to-end

**Estimated time**: 30-45 minutes for first deployment
