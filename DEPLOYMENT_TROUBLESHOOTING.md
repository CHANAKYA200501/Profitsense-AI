# 🔧 DEPLOYMENT TROUBLESHOOTING GUIDE

## BACKEND (RENDER) ISSUES

---

### ❌ Issue: Service crashes immediately after deployment

**Symptoms**:
- "Failed" status on Render
- Logs show error messages
- Service restarts in a loop

**Solutions** (try in order):
1. Check build logs for Python errors:
   ```bash
   # Run this locally to test
   cd /Users/chanakya01/Documents/et/etmind/backend
   python3 -m pip install -r requirements.txt
   python3 main.py
   ```

2. Verify Python version (should be 3.10+):
   ```bash
   python3 --version  # Should be 3.10.0+
   ```

3. Check `requirements.txt` for syntax errors:
   ```bash
   cat requirements.txt | grep -E "^[a-z]"  # Should see valid package names
   ```

4. On Render, add Python version explicitly:
   - Go to **Environment Variables**
   - Add: `PYTHON_VERSION=3.10`

5. Check main.py imports work:
   ```bash
   python3 -c "from backend.main import app; print('OK')"
   ```

---

### ❌ Issue: Database connection error

**Symptoms**:
```
psycopg2.OperationalError: could not translate host name "HOST" to address
```

**Solutions**:
1. ✅ Use **INTERNAL** database URL (not External)
   - Render dashboard → PostgreSQL → Copy internal URL
   - Should look like: `postgresql://postgres:...@dpg-xxx.oregon-postgres.render.com`

2. Check DATABASE_URL is set correctly:
   ```bash
   # On Render shell:
   echo $DATABASE_URL
   # Should show full connection string
   ```

3. Wait for database to fully initialize:
   - Databases take 2-3 minutes
   - Check status on Render dashboard is "Available"

4. Test connection locally with DATABASE_URL:
   ```bash
   # Set env var locally
   export DATABASE_URL="postgresql://..."
   python3 -c "from api.db import get_db; print('Connection OK')"
   ```

---

### ❌ Issue: Redis connection fails

**Symptoms**:
```
redis.exceptions.ConnectionError: Error 61 connecting to localhost:6379
```

**Solutions**:
1. Check REDIS_URL environment variable:
   ```bash
   # On Render shell:
   echo $REDIS_URL
   ```

2. Use INTERNAL Redis URL:
   - Render dashboard → Redis → Copy internal URL
   - Should look like: `redis://:password@red-xxx.oregon-redis.render.com:6379`

3. Verify Redis is actually created:
   - Render dashboard → Check Redis instance status is "Available"

4. Test Redis locally:
   ```bash
   # With REDIS_URL set
   python3 -c "import redis; r=redis.from_url('redis://...'); r.ping(); print('OK')"
   ```

---

### ❌ Issue: ModuleNotFoundError or ImportError

**Symptoms**:
```
ModuleNotFoundError: No module named 'fastapi'
```

**Solutions**:
1. Verify requirements.txt has all dependencies:
   ```bash
   grep "fastapi" /Users/chanakya01/Documents/et/etmind/backend/requirements.txt
   # Should find the package
   ```

2. Check for relative import issues:
   ```bash
   # Verify this works:
   cd /Users/chanakya01/Documents/et/etmind
   python3 -c "from backend.main import app"
   ```

3. On Render, check Build Command is correct:
   - Should be: `pip install -r backend/requirements.txt`
   - NOT: `pip install -r requirements.txt` (missing backend/)

4. Make sure __init__.py exists:
   ```bash
   touch /Users/chanakya01/Documents/et/etmind/backend/__init__.py
   ```

---

### ❌ Issue: CORS errors on frontend

**Symptoms**:
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solutions**:
1. Check ALLOWED_ORIGINS environment variable:
   ```bash
   # On Render shell:
   echo $ALLOWED_ORIGINS
   ```

2. Update to include frontend domain:
   - Render dashboard → Environment
   - Set: `ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app`
   - Format must be: `https://domain.com` (no trailing slash, protocol required)

3. For multiple domains:
   ```
   ALLOWED_ORIGINS=https://domain.com,https://www.domain.com,https://app.domain.com
   ```

4. For development/testing:
   ```
   ALLOWED_ORIGINS=http://localhost:5173,https://your-frontend.vercel.app
   ```

5. Backend code should have CORS middleware:
   ```python
   # backend/main.py should have:
   from fastapi.middleware.cors import CORSMiddleware
   
   app.add_middleware(
       CORSMiddleware,
       allow_origins=[os.getenv("ALLOWED_ORIGINS", "").split(",")],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

---

### ❌ Issue: Health check returns 404

**Symptoms**:
- Curl returns: `404 Not Found`
- Render dashboard shows: "Health check failed"

**Solutions**:
1. Check health endpoint exists:
   ```python
   # backend/main.py should have:
   @app.get("/api/health")
   def health_check():
       return {"status": "ok"}
   ```

2. Verify endpoint is at root:
   - Should be `/api/health`, not `/backend/api/health`

3. Check main.py runs without errors:
   ```bash
   python3 /Users/chanakya01/Documents/et/etmind/backend/main.py
   ```

4. On Render, update Health Check Path:
   - Service settings → Health Check Path: `/api/health`

---

### ❌ Issue: Logs are empty or not showing

**Symptoms**:
- Render logs tab shows nothing
- Can't see build output

**Solutions**:
1. Click on the **"Logs"** tab in Render service
2. Make sure **"All Logs"** is selected (not just errors)
3. Check service status (should be "Running" or "Deploying")
4. If still empty, trigger a rebuild:
   - Render dashboard → Service → **Manual Deploy** → **Deploy latest commit**

---

## FRONTEND (VERCEL) ISSUES

---

### ❌ Issue: Build fails with npm errors

**Symptoms**:
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Solutions**:
1. Test build locally first:
   ```bash
   cd /Users/chanakya01/Documents/et/etmind/frontend
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

2. Check TypeScript errors:
   ```bash
   npm run build
   # Look for tsc errors
   ```

3. Update problematic dependencies:
   ```bash
   npm update
   npm install
   ```

4. On Vercel, add build flag:
   - Settings → Build & Development Settings
   - **Build Command**: `npm run build --verbose`

---

### ❌ Issue: Build succeeds but frontend won't load

**Symptoms**:
- Vercel shows "Ready"
- But page shows blank or error

**Solutions**:
1. Check build output directory:
   - Vercel settings → Output Directory should be `dist`
   - vite.config.ts should have:
     ```typescript
     export default {
       build: {
         outDir: 'dist'
       }
     }
     ```

2. Check public/ folder has files:
   ```bash
   ls -la /Users/chanakya01/Documents/et/etmind/frontend/public/
   ```

3. Check index.html exists:
   ```bash
   ls /Users/chanakya01/Documents/et/etmind/frontend/index.html
   ```

4. Verify build output:
   ```bash
   npm run build
   ls dist/  # Should show index.html and JS files
   ```

---

### ❌ Issue: API calls fail with 404

**Symptoms**:
```
Fetch failed: 404 Not Found
GET https://etmind-api.onrender.com/api/users
```

**Solutions**:
1. Check VITE_API_BASE_URL is correct:
   ```bash
   cat /Users/chanakya01/Documents/et/etmind/frontend/.env.production
   # Should show: VITE_API_BASE_URL=https://etmind-api.onrender.com
   ```

2. Verify it's used in code:
   ```typescript
   // Should be used like:
   const apiBase = import.meta.env.VITE_API_BASE_URL;
   ```

3. Check backend actually has the endpoint:
   ```bash
   curl https://etmind-api.onrender.com/api/users
   # Should return data, not 404
   ```

4. If endpoint doesn't exist:
   - Backend needs to have the route defined
   - Check `backend/api/` for the route file

5. On Vercel, verify environment variable is set:
   - Settings → Environment Variables
   - Should show `VITE_API_BASE_URL`

---

### ❌ Issue: Blank page or console errors

**Symptoms**:
- Frontend loads but shows nothing
- F12 console shows JavaScript errors

**Solutions**:
1. Check for VITE errors:
   ```bash
   npm run build
   # Look for: "error during build"
   ```

2. Check environment variables are used:
   ```typescript
   // In component:
   console.log(import.meta.env.VITE_API_BASE_URL);
   // Should log the URL, not undefined
   ```

3. If undefined, regenerate environment variables:
   ```bash
   # Create .env.production in frontend:
   VITE_API_BASE_URL=https://etmind-api.onrender.com
   VITE_ENVIRONMENT=production
   ```

4. Rebuild and redeploy:
   ```bash
   git add etmind/frontend/.env.production
   git commit -m "Fix environment variables"
   git push origin main
   # Vercel will auto-redeploy
   ```

---

### ❌ Issue: CORS errors in browser

**Symptoms**:
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solutions**:
1. This is a BACKEND issue, not frontend:
   - See "CORS errors on frontend" under Backend section above

2. Check backend is sending CORS headers:
   ```bash
   curl -i https://etmind-api.onrender.com/api/health
   # Should see: Access-Control-Allow-Origin: https://your-vercel-domain.vercel.app
   ```

3. Verify ALLOWED_ORIGINS in backend:
   - Render → Backend service → Environment Variables
   - Check `ALLOWED_ORIGINS` includes your Vercel domain

---

### ❌ Issue: Environment variables not loading

**Symptoms**:
- `import.meta.env.VITE_API_BASE_URL` is undefined
- API calls go to wrong URL

**Solutions**:
1. Verify .env.production exists:
   ```bash
   ls -la /Users/chanakya01/Documents/et/etmind/frontend/.env*
   # Should show .env.production
   ```

2. Check Vercel environment variables:
   - Vercel Dashboard → Project Settings → Environment Variables
   - Should have `VITE_API_BASE_URL` set

3. Rebuild on Vercel:
   - Deployments → Select latest → **Redeploy**
   - Environment variables are only available during build

4. Local test:
   ```bash
   VITE_API_BASE_URL=https://test.com npm run build
   # Check .env is read during build
   ```

---

## GENERAL ISSUES

---

### ❌ Issue: Service keeps restarting

**Symptoms**:
- Render shows spinning "Spinning" status
- Logs show repeated restarts

**Solutions**:
1. Check for infinite loops in code:
   ```bash
   # Search for while True:
   grep -r "while True" /Users/chanakya01/Documents/et/etmind/backend/
   ```

2. Check health check isn't blocking:
   ```python
   # Health check should be fast:
   @app.get("/api/health")
   def health_check():
       return {"status": "ok"}
   # This is correct - simple response
   ```

3. Check database isn't required for startup:
   ```python
   # Bad: requires DB on startup
   # Good: lazy loads when needed
   ```

4. Increase health check timeout:
   - Render dashboard → Service → Health Check settings
   - Increase timeout to 30 seconds

---

### ❌ Issue: Can't find environment variable

**Symptoms**:
```
KeyError: 'DATABASE_URL'
```

**Solutions**:
1. Verify environment variable is set:
   ```bash
   # On Render shell:
   env | grep DATABASE_URL
   ```

2. Add fallback in code:
   ```python
   db_url = os.getenv("DATABASE_URL")
   if not db_url:
       raise ValueError("DATABASE_URL not set")
   ```

3. Check spelling is exact:
   - `DATABASE_URL` not `DATABASE_url` (case-sensitive)

4. Environment variables are set during deployment:
   - Changes take effect only after redeploy
   - Manual Deploy → Deploy latest commit

---

## 🆘 GETTING HELP

If issue isn't listed above:

1. **Check logs**:
   - Render: Service → Logs
   - Vercel: Deployments → Build logs & Runtime logs

2. **Try local test**:
   ```bash
   # Run backend locally
   cd /Users/chanakya01/Documents/et/etmind/backend
   python3 main.py
   
   # Run frontend locally
   cd /Users/chanakya01/Documents/et/etmind/frontend
   npm run dev
   ```

3. **Check GitHub Issues**:
   - FastAPI: https://github.com/tiangolo/fastapi/issues
   - Vite: https://github.com/vitejs/vite/issues

4. **Ask for help**:
   - Include error message (full text)
   - Include logs from Render/Vercel
   - Include what you were doing when it failed

---

## ✅ QUICK VERIFICATION

Run this to check everything is working:

```bash
# Backend health check
curl https://etmind-api.onrender.com/api/health

# Should return:
# {"status":"ok"}

# Frontend
open https://your-project.vercel.app

# Should load without errors
```

If both return OK, your deployment is working! 🎉
