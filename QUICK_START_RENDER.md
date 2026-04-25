# Quick Start: Deploy to Render in 10 Steps

## 📌 TL;DR - Fastest Deployment Path

### Step 1: Prepare Your Code
```bash
# Make sure render.yaml is in your repo root
# Already created for you!

# Ensure code is committed
git add .
git commit -m "Add Render deployment config"
git push origin main
```

### Step 2: Create Render Account
- Go to https://render.com
- Sign up with GitHub
- Authorize Render to access your repositories

### Step 3: Create PostgreSQL Database
1. Dashboard → **"New"** → **"PostgreSQL"**
2. Name: `profitsense-db`
3. Click **"Create Database"**
4. Copy the connection string (you'll need it)

### Step 4: Create Redis Instance
1. Dashboard → **"New"** → **"Redis"**
2. Name: `profitsense-redis`
3. Click **"Create Redis"**
4. Copy the connection string

### Step 5: Create Web Service
1. Dashboard → **"New"** → **"Web Service"**
2. Select your GitHub repo
3. Configure:
   - **Name**: `profitsense-backend`
   - **Root Directory**: Leave empty (render.yaml will handle it)
   - **Build Command**: `pip install -r backend/requirements.txt && cd backend && alembic upgrade head`
   - **Start Command**: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`

### Step 6: Add Environment Variables
In Render Web Service → **Environment**:
```
DATABASE_URL=postgresql://user:password@host:port/profitsense
REDIS_URL=redis://user:password@host:port
ALLOWED_ORIGINS=https://your-frontend.com
ENVIRONMENT=production
JWT_SECRET_KEY=your-secret-key-here
TELEGRAM_BOT_TOKEN=your-token
TELEGRAM_CHAT_ID=your-chat-id
```

Replace values with your actual database/Redis connection strings.

### Step 7: Deploy
- Click **"Create Web Service"**
- Render automatically starts building and deploying
- Wait 3-5 minutes for deployment to complete

### Step 8: Check Status
- Go to **Logs** tab
- Should see: `Application startup complete`
- Test: `https://your-service.onrender.com/api/health`

### Step 9: Create Celery Worker (Optional but Recommended)
1. Dashboard → **"New"** → **"Background Worker"**
2. Configure:
   - **Name**: `profitsense-celery-worker`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `cd backend && celery -A tasks.celery_app worker --loglevel=info`
   - Add same `DATABASE_URL`, `REDIS_URL`, `ENVIRONMENT` variables

### Step 10: Create Celery Beat (For Scheduled Tasks)
1. Dashboard → **"New"** → **"Background Worker"**
2. Configure:
   - **Name**: `profitsense-celery-beat`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `cd backend && celery -A tasks.celery_app beat --loglevel=info`
   - Add same `DATABASE_URL`, `REDIS_URL`, `ENVIRONMENT` variables

---

## ✅ Verification Checklist

After deployment:

- [ ] Health check returns 200: `https://your-service.onrender.com/api/health`
- [ ] Database migrations ran successfully (check logs)
- [ ] Celery worker is running (if created)
- [ ] All API endpoints are accessible
- [ ] No errors in logs
- [ ] Frontend can reach the backend API

---

## 🔗 Service URLs

After deployment, your services will be at:

```
Web Service: https://profitsense-backend.onrender.com
API Health: https://profitsense-backend.onrender.com/api/health
API Base: https://profitsense-backend.onrender.com/api/
```

Configure your frontend to use these URLs.

---

## 🆘 Quick Troubleshooting

### Service won't start
```bash
# Check logs for errors
# Common issues:
# 1. Missing environment variables
# 2. Wrong start command
# 3. Port not set to $PORT
```

### Database connection fails
```bash
# Verify DATABASE_URL format:
# postgresql://user:password@host:port/dbname
# Check password doesn't have special characters (URL encode if needed)
```

### Health check fails
```bash
# Make sure main.py has:
# @app.get("/api/health")
# async def health_check():
#     return {"status": "healthy"}
```

### Celery not working
```bash
# Verify REDIS_URL is set in worker environment
# Check worker logs for connection errors
```

---

## 💡 Pro Tips

1. **Enable Auto-Deploy**: Service Settings → Auto-deploy ON
2. **Monitor Metrics**: Dashboard → Metrics tab
3. **Scale as needed**: Upgrade plan from Standard to Professional
4. **Use persistent disks**: For file uploads or data storage
5. **Set health check timeout**: 30+ seconds (if migrations take time)

---

## 📚 Full Documentation

For more details, see: `RENDER_DEPLOYMENT_GUIDE.md`

---

## 🚨 Important Security Notes

1. **NEVER commit `.env` files** - Always use Render's environment variables
2. **NEVER hardcode secrets** - Use environment variables
3. **Enable HTTPS** - Render provides free SSL certificates
4. **Use strong JWT_SECRET_KEY** - At least 32 random characters
5. **Limit CORS origins** - Only allow your frontend domains
6. **Enable database backups** - Use Render's backup feature

---

## 💰 Expected Costs (Monthly)

- Web Service (Standard): $7
- PostgreSQL (Standard): $15
- Redis (Standard): $5
- Celery Worker (Standard): $7
- Celery Beat (Standard): $7

**Total**: ~$41/month for full production setup

(Free tier available for testing)

---

## 🎯 What's Next?

1. ✅ Backend is deployed
2. 📌 Configure frontend to use new API URL
3. 🔐 Set up proper secrets management
4. 📊 Configure monitoring/alerts
5. 🔄 Set up CI/CD for automatic deployments
6. 📈 Monitor performance and scale as needed
