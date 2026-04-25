# Environment Variables Reference & Setup Guide

## 📋 Complete Environment Variables for Render

This guide shows you exactly what environment variables you need and where to get their values.

---

## 🔴 CRITICAL - Must Set These First

### 1. Database Connection
**Variable**: `DATABASE_URL`

**Format**: `postgresql://[user]:[password]@[host]:[port]/[dbname]`

**How to get it**:
1. Create PostgreSQL instance in Render
2. Wait for creation (~2 minutes)
3. Click on database → Connection string at top
4. Copy the entire string

**Example**:
```
postgresql://postgres:abcd1234@dpg-cq2g4a1a6gdl5l6qkr10-a.oregon-postgres.render.com:5432/profitsense
```

**⚠️ Important**: 
- If password has special characters, URL encode them: `!` → `%21`, `@` → `%40`
- Use exact connection string from Render

---

### 2. Redis Connection
**Variable**: `REDIS_URL`

**Format**: `redis://[user]:[password]@[host]:[port]`

**How to get it**:
1. Create Redis instance in Render
2. Wait for creation (~2 minutes)
3. Click on Redis → Connection string at top
4. Copy the entire string

**Example**:
```
redis://:xyz789@red-cq2gbpba6gdl5l6qkr10-a.oregon-redis.render.com:6379
```

**⚠️ Important**: 
- Some Redis instances don't have username (just `:`)
- Follow exactly what Render provides

---

### 3. Environment
**Variable**: `ENVIRONMENT`
**Value**: `production`

---

## 🟡 IMPORTANT - Add These for Full Functionality

### JWT Configuration
```
JWT_SECRET_KEY=your_very_secure_random_key_at_least_32_characters_long_12345678

JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

**How to generate JWT_SECRET_KEY**:
```bash
# Using Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Using OpenSSL
openssl rand -hex 32
```

---

### CORS Origins (Your Frontend Domain)
**Variable**: `ALLOWED_ORIGINS`

**Format**: Comma-separated list of allowed domains
```
https://yourdomain.com,https://www.yourdomain.com,https://app.yourdomain.com
```

**Examples**:
- Single domain: `https://app.yoursite.com`
- Multiple: `https://yoursite.com,https://api.yoursite.com`
- Development (local): `http://localhost:5173`

---

### Telegram Alerts
```
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz1234567

TELEGRAM_CHAT_ID=987654321
```

**How to get**:
1. Create Telegram bot: Message @BotFather on Telegram
2. Get token from BotFather
3. Send message to bot, then go to: `https://api.telegram.org/bot[TOKEN]/getUpdates`
4. Find your chat ID in the response

---

## 🟢 OPTIONAL - Nice to Have

### Logging & Monitoring
```
LOG_LEVEL=INFO
# Options: DEBUG, INFO, WARNING, ERROR, CRITICAL

SENTRY_DSN=https://your-sentry-key@sentry.io/your-project-id
# For error tracking - get from Sentry.io
```

### Database Connection Pooling
```
DATABASE_POOL_SIZE=5
DATABASE_POOL_RECYCLE=3600
DATABASE_CONNECTION_TIMEOUT=30
```

### Cache Settings
```
CACHE_TTL_SECONDS=3600
REDIS_MAX_CONNECTIONS=10
```

### API Rate Limiting
```
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=1000
```

### File Uploads
```
MAX_FILE_UPLOAD_MB=10
KYC_UPLOAD_PATH=/tmp/kyc_uploads
```

### ML Models
```
ML_MODEL_PATH=/app/ml_models
VECTOR_STORE_PATH=/app/vector_store
QDRANT_HOST=localhost
QDRANT_PORT=6333
```

### Celery Configuration
```
CELERY_BROKER_URL=<same as REDIS_URL>
CELERY_RESULT_BACKEND=<same as REDIS_URL>
CELERY_TASK_SERIALIZER=json
CELERY_RESULT_SERIALIZER=json
CELERY_ACCEPT_CONTENT=json
CELERY_TASK_TRACK_STARTED=true
CELERY_TASK_TIME_LIMIT=30m
```

### APScheduler
```
SCHEDULER_JOB_STORE_TYPE=sqlalchemy
SCHEDULER_JOB_STORE_URL=<same as DATABASE_URL>
SCHEDULER_EXECUTORS_DEFAULT_TYPE=threadpool
SCHEDULER_EXECUTORS_DEFAULT_MAX_WORKERS=3
```

---

## 🔐 Sensitive Credentials (Use Secrets Manager)

These should NEVER be in code or committed:
```
JWT_SECRET_KEY=<SECRET>
TELEGRAM_BOT_TOKEN=<SECRET>
BROKER_API_KEY=<SECRET>
BROKER_API_SECRET=<SECRET>
SMTP_PASSWORD=<SECRET>
AWS_SECRET_ACCESS_KEY=<SECRET>
```

---

## 📝 How to Add Environment Variables in Render

### Via Dashboard (Easy)
1. Go to your Web Service
2. Click **"Environment"** tab
3. Click **"Add Environment Variable"**
4. Fill in Key and Value
5. Click **"Save"**

### Via render.yaml (Automatic)
Already configured! The file includes:
```yaml
envVars:
  - key: DATABASE_URL
    fromDatabase:
      name: profitsense-db
      property: connectionString
```

Render automatically injects these when service starts.

---

## 🧪 Testing Your Environment Variables

After setting environment variables, test them:

### Using Render Shell
1. Go to Service → **"Shell"** tab
2. Run:
```bash
# Check if variables are set
env | grep DATABASE_URL
env | grep REDIS_URL
env | grep JWT_SECRET_KEY

# Test database connection
python3 -c "import os; print('DB:', os.getenv('DATABASE_URL')[:20])"

# Test Redis connection
python3 << 'EOF'
import redis
import os
r = redis.from_url(os.getenv('REDIS_URL'))
print(r.ping())  # Should print True
EOF
```

### Using Health Check Endpoint
```bash
# After service is running:
curl https://your-service.onrender.com/api/health
# Should return: {"status": "healthy", "service": "profitsense-backend"}
```

---

## ❌ Common Mistakes

1. **Missing `postgresql://` prefix** → Connection fails
   - ✅ Use full URL: `postgresql://user:pass@host:port/db`

2. **Special characters in password not URL encoded**
   - ✅ If password is `pass@word`, use `pass%40word` in URL

3. **Spaces in environment values**
   - ✅ Don't add spaces: `KEY=value` not `KEY = value`

4. **Hardcoding secrets in code**
   - ✅ Always use environment variables: `os.getenv('SECRET')`

5. **Not setting JWT_SECRET_KEY**
   - ✅ Set random 32+ character string

6. **ALLOWED_ORIGINS too restrictive**
   - ✅ If frontend is at `https://app.com`, add it to origins

7. **Forgetting to set variables in Celery workers**
   - ✅ Each worker (web, celery, beat) needs same database/redis URLs

---

## 🔄 Updating Environment Variables

To change environment variables after deployment:

1. **Via Dashboard** (takes effect in ~30 seconds):
   - Go to Service → Environment
   - Click variable to edit
   - Click "Save"
   - Service restarts automatically

2. **Via render.yaml** (requires git push):
   - Edit render.yaml
   - Commit and push to GitHub
   - Render redeploys automatically

---

## ✅ Pre-Deployment Checklist

Before deploying, verify you have:

- [ ] `DATABASE_URL` from PostgreSQL instance
- [ ] `REDIS_URL` from Redis instance
- [ ] `JWT_SECRET_KEY` (random 32+ chars)
- [ ] `ALLOWED_ORIGINS` set to your frontend domain
- [ ] `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` (if using alerts)
- [ ] `ENVIRONMENT=production`
- [ ] All special characters URL-encoded in passwords
- [ ] Sensitive data NOT in render.yaml or git

---

## 📊 Environment Variables by Service Type

### Web Service (Main API)
Must have:
- DATABASE_URL
- REDIS_URL
- JWT_SECRET_KEY
- ALLOWED_ORIGINS

### Celery Worker
Must have:
- DATABASE_URL
- REDIS_URL
- ENVIRONMENT

### Celery Beat
Must have:
- DATABASE_URL
- REDIS_URL
- ENVIRONMENT

---

## 🆘 Debugging Missing Variables

If you see errors like:
```
KeyError: 'DATABASE_URL'
ValueError: REDIS_URL is not set
```

1. Check the environment variable is actually set:
   ```bash
   env | grep DATABASE_URL
   ```

2. Restart the service (click "Manual Deploy")

3. Check if variable is set in correct service:
   - Web service variables don't apply to workers
   - Each service needs its own variables

4. Check render.yaml or Dashboard → Environment tab

---

## 📚 Reference

**Render Documentation**:
- [Environment Variables](https://render.com/docs/environment-variables)
- [Databases](https://render.com/docs/databases)
- [PostgreSQL](https://render.com/docs/postgres)
- [Redis](https://render.com/docs/redis)

**Your Database**:
- Connection string: `https://dashboard.render.com` → your PostgreSQL instance
- Port: Usually 5432 (PostgreSQL) or 6379 (Redis)
- Database: `profitsense` (or whatever you named it)
