# Complete Render Deployment Guide for ProfitSense Backend

## Prerequisites
- Render.com account (free or paid)
- GitHub repository with your code
- PostgreSQL database (can use Render's managed DB)
- Redis instance (can use Render's managed Redis)

---

## Step 1: Prepare Your Repository

### 1.1 Create render.yaml in Root Directory
This file tells Render how to deploy your services.

```yaml
# render.yaml (place in root of your repo)
services:
  - type: web
    name: profitsense-backend
    env: python
    plan: standard
    buildCommand: "pip install -r backend/requirements.txt"
    startCommand: "uvicorn backend.main:app --host 0.0.0.0 --port $PORT"
    healthCheckPath: /api/health
    envVars:
      - key: PYTHON_VERSION
        value: "3.10"
      - key: DATABASE_URL
        fromDatabase:
          name: profitsense-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          name: profitsense-redis
          property: connectionString
      - key: ENVIRONMENT
        value: production
      - key: PORT
        value: "8000"

  - type: pserver
    name: profitsense-db
    plan: standard
    ipAllowList: []

  - type: redis
    name: profitsense-redis
    plan: standard
    maxmemoryPolicy: noevict
```

### 1.2 Update requirements.txt
Ensure your requirements.txt is in the backend directory (already done).

### 1.3 Create .gitignore (if needed)
```
venv/
venv_310/
__pycache__/
*.pyc
.env
.DS_Store
*.db
data/
ml_training/
.pytest_cache/
```

---

## Step 2: Set Up Render Infrastructure

### 2.1 Go to Render Dashboard
1. Visit [render.com](https://render.com)
2. Sign up or log in
3. Go to Dashboard

### 2.2 Create PostgreSQL Database
1. Click **"New"** → **"PostgreSQL"**
2. Configure:
   - **Name**: `profitsense-db`
   - **Database**: `profitsense`
   - **User**: `postgres` (default or custom)
   - **Region**: Choose closest to you
   - **Plan**: Standard (or Free for testing)
3. Click **"Create Database"**
4. **Save the connection details** - you'll need them

### 2.3 Create Redis Instance
1. Click **"New"** → **"Redis"**
2. Configure:
   - **Name**: `profitsense-redis`
   - **Region**: Same as PostgreSQL
   - **Plan**: Standard (or Free for testing)
3. Click **"Create Redis"**
4. **Save the connection string**

---

## Step 3: Create Web Service

### 3.1 Connect GitHub Repository
1. Click **"New"** → **"Web Service"**
2. Select **"Connect a repository"**
3. Authorize and select your repository
4. Configure:
   - **Name**: `profitsense-backend`
   - **Root Directory**: `etmind` (or leave blank if render.yaml is in root)
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`

### 3.2 Set Environment Variables
In the web service settings, add these environment variables:

```
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/profitsense
REDIS_URL=redis://[user]:[password]@[host]:[port]
ENVIRONMENT=production
JWT_SECRET_KEY=your_secret_key_here
TELEGRAM_BOT_TOKEN=your_telegram_token
TELEGRAM_CHAT_ID=your_chat_id
# Add other API keys/tokens as needed
```

**Get DATABASE_URL and REDIS_URL from the instances you created in Step 2.**

### 3.3 Configure Instance Settings
- **Plan**: Standard or Professional
- **Auto-deploy**: ON (auto-deploy on git push)
- **Health Check Path**: `/api/health`

### 3.4 Click **"Create Web Service"**

---

## Step 4: Database Migrations

### 4.1 Run Alembic Migrations
After your service is deployed:

1. Go to your service → **"Shell"** tab
2. Run:
   ```bash
   cd etmind/backend
   alembic upgrade head
   ```

Or create a migration job in Render:

**Option A: Using Render's Job Feature**
1. Click **"New"** → **"Background Job"**
2. Configure:
   - **Name**: `db-migration`
   - **Repository**: Same repo
   - **Command**: `cd etmind/backend && alembic upgrade head`
   - **Environment**: Python 3
   - **Schedule**: Manual (run on demand)
3. **Create Job**
4. Run it once to apply migrations

**Option B: Add build step to render.yaml**
```yaml
services:
  - type: web
    # ... other config ...
    buildCommand: "pip install -r backend/requirements.txt && cd backend && alembic upgrade head"
```

---

## Step 5: Set Up Background Jobs (Celery)

### 5.1 Create Worker Service
Add to your `render.yaml`:

```yaml
  - type: background_worker
    name: profitsense-celery-worker
    env: python
    plan: standard
    buildCommand: "pip install -r backend/requirements.txt"
    startCommand: "cd backend && celery -A tasks.celery_app worker --loglevel=info --concurrency=2"
    envVars:
      - key: REDIS_URL
        fromService:
          name: profitsense-redis
          property: connectionString
      - key: DATABASE_URL
        fromDatabase:
          name: profitsense-db
          property: connectionString
      - key: ENVIRONMENT
        value: production
```

### 5.2 Create Beat Scheduler (for scheduled tasks)
Add to your `render.yaml`:

```yaml
  - type: background_worker
    name: profitsense-celery-beat
    env: python
    plan: standard
    buildCommand: "pip install -r backend/requirements.txt"
    startCommand: "cd backend && celery -A tasks.celery_app beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler"
    envVars:
      - key: REDIS_URL
        fromService:
          name: profitsense-redis
          property: connectionString
      - key: DATABASE_URL
        fromDatabase:
          name: profitsense-db
          property: connectionString
      - key: ENVIRONMENT
        value: production
```

---

## Step 6: Update CORS for Production

### 6.1 Update main.py
Modify the CORS configuration for production:

```python
import os

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 6.2 Add to Environment Variables
```
ALLOWED_ORIGINS=https://your-frontend-domain.com,https://www.your-frontend-domain.com
```

---

## Step 7: Monitoring & Logs

### 7.1 View Logs
1. Go to your service
2. Click **"Logs"** tab
3. Filter by service name to see output

### 7.2 Set Up Error Alerts
1. Services → **Select your service** → **"Settings"** → **"Notifications"**
2. Add email/webhook for deployment failures

---

## Step 8: SSL Certificate & Custom Domain (Optional)

1. Go to Service → **"Settings"** → **"Custom Domain"**
2. Add your domain (e.g., `api.yoursite.com`)
3. Add DNS record (Render will provide instructions)
4. SSL certificate is auto-generated (free Let's Encrypt)

---

## Step 9: Initial Deployment Checklist

Before pushing to GitHub:

- [ ] `render.yaml` created in repository root
- [ ] `requirements.txt` in `backend/` directory
- [ ] Environment variables defined in Render dashboard
- [ ] Database and Redis instances created
- [ ] GitHub repository connected to Render
- [ ] `main.py` uses `$PORT` environment variable
- [ ] CORS origins updated for production
- [ ] Alembic migrations are ready
- [ ] `.env` file in `.gitignore`

---

## Step 10: Deploy

### Method A: Automatic (Recommended)
1. Push to GitHub:
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```
2. Render automatically starts deployment
3. Monitor in Render dashboard

### Method B: Manual
1. In Render dashboard, select your service
2. Click **"Manual Deploy"** → **"Deploy Latest Commit"**

---

## Troubleshooting

### Service Won't Start
1. Check logs in **"Logs"** tab
2. Verify `PYTHON_VERSION=3.10` is set
3. Ensure start command is correct: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`

### Database Connection Fails
1. Verify `DATABASE_URL` environment variable is set
2. Check database is created and running
3. Run migrations: Access service shell and run `alembic upgrade head`

### Redis Connection Fails
1. Verify `REDIS_URL` is correctly set
2. Check Redis instance is running
3. Remove `redis://` prefix if it causes issues (Render may handle this)

### Celery Not Processing Tasks
1. Verify `REDIS_URL` and `DATABASE_URL` are set in worker
2. Check worker logs
3. Ensure Celery app is properly imported: `from tasks.celery_app import app`

### Static Files/Assets Not Found
If serving static content:
```bash
# Add to start command
python backend/main.py --reload
# Or use Nginx for static files (separate Render service)
```

---

## Performance Optimization

1. **Use Standard or Professional plan** for production
2. **Enable auto-scaling** if traffic increases
3. **Use PostgreSQL instead of SQLite**
4. **Enable Redis connection pooling**
5. **Monitor usage**: Dashboard → **"Metrics"** tab

---

## Next Steps After Deployment

1. **Test endpoints**: `https://your-service.onrender.com/api/health`
2. **Run migrations**: Use Render shell or background job
3. **Configure Celery beat** for scheduled tasks
4. **Set up monitoring** with Sentry or similar
5. **Configure frontend** to point to new API URL
6. **Test all integrations** (Telegram alerts, broker APIs, etc.)

---

## Cost Estimation

- **Web Service** (Standard): ~$7/month
- **PostgreSQL** (Standard): ~$15/month
- **Redis** (Standard): ~$5/month
- **Background Worker** (Standard): ~$7/month each
- Total: ~$34-$50/month for production setup

(Free tier available for testing with limitations)

---

## Support Resources

- [Render Docs](https://render.com/docs)
- [Render Python Deployment](https://render.com/docs/deploy-python)
- [Render Databases](https://render.com/docs/databases)
- [Render Background Jobs](https://render.com/docs/background-workers)

