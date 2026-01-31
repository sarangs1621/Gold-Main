# Troubleshooting Guide - Gold Inventory Management System

## Common Issues and Solutions

### 🚨 Issue: "Web server returned an unknown error"

**Cause:** One or more services (backend/frontend) are not running.

**Solution:**

1. **Quick Fix - Run Startup Check:**
   ```bash
   bash /app/scripts/startup_check.sh
   ```
   This script will automatically detect and restart any stopped services.

2. **Manual Check - Check Service Status:**
   ```bash
   sudo supervisorctl status
   ```
   
   Expected output:
   ```
   backend         RUNNING   pid 123, uptime 0:05:00
   frontend        RUNNING   pid 456, uptime 0:05:00
   mongodb         RUNNING   pid 789, uptime 0:05:00
   ```

3. **Manual Restart - Restart All Services:**
   ```bash
   sudo supervisorctl restart all
   ```

4. **If Frontend Fails to Start:**
   ```bash
   cd /app/frontend
   yarn install --frozen-lockfile
   sudo supervisorctl restart frontend
   ```

---

### 🚨 Issue: Frontend Shows "BACKOFF" or "Exited too quickly"

**Cause:** Missing `craco` dependency or other npm packages.

**Solution:**

1. Check if craco is installed:
   ```bash
   ls -la /app/frontend/node_modules/.bin/craco
   ```

2. If missing, install dependencies:
   ```bash
   cd /app/frontend
   yarn cache clean
   yarn install --frozen-lockfile
   ```

3. Restart frontend:
   ```bash
   sudo supervisorctl restart frontend
   ```

4. Monitor the startup:
   ```bash
   tail -f /var/log/supervisor/frontend.err.log
   ```

---

### 🚨 Issue: Backend Not Responding

**Cause:** Backend service stopped or crashed.

**Solution:**

1. Check backend logs:
   ```bash
   tail -n 50 /var/log/supervisor/backend.err.log
   ```

2. Check for Python errors:
   ```bash
   grep -i "error\|exception" /var/log/supervisor/backend.err.log | tail -20
   ```

3. Restart backend:
   ```bash
   sudo supervisorctl restart backend
   ```

4. Verify backend is responding:
   ```bash
   curl -f http://localhost:8001/api/health
   ```

---

### 🚨 Issue: Services Keep Stopping

**Cause:** Possible memory issue, code error, or configuration problem.

**Solution:**

1. Check system resources:
   ```bash
   free -h
   df -h
   ```

2. Check supervisor configuration:
   ```bash
   cat /etc/supervisor/conf.d/supervisord.conf
   ```

3. Ensure autorestart is enabled (should already be):
   ```
   autorestart=true
   ```

4. Check for code errors in logs:
   ```bash
   # Backend logs
   tail -n 100 /var/log/supervisor/backend.err.log
   
   # Frontend logs
   tail -n 100 /var/log/supervisor/frontend.err.log
   ```

---

### 🚨 Issue: Changes Not Reflecting in Browser

**Cause:** Browser caching or frontend not recompiling.

**Solution:**

1. Hard refresh browser: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

2. Clear browser cache and reload

3. Check if frontend is in hot-reload mode:
   ```bash
   tail -f /var/log/supervisor/frontend.out.log | grep "webpack compiled"
   ```

4. If needed, restart frontend:
   ```bash
   sudo supervisorctl restart frontend
   ```

---

## Automated Health Checks

### Run Health Check Manually

To check all services and auto-restart if needed:
```bash
bash /app/scripts/health_check.sh
```

### View Health Check Logs

```bash
tail -f /var/log/health_check.log
```

---

## Service Management Commands

### Check Status
```bash
sudo supervisorctl status
```

### Restart Single Service
```bash
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
sudo supervisorctl restart mongodb
```

### Restart All Services
```bash
sudo supervisorctl restart all
```

### Start Single Service
```bash
sudo supervisorctl start backend
sudo supervisorctl start frontend
```

### Stop Single Service (use with caution)
```bash
sudo supervisorctl stop backend
sudo supervisorctl stop frontend
```

### View Logs in Real-time
```bash
# Backend
tail -f /var/log/supervisor/backend.err.log

# Frontend
tail -f /var/log/supervisor/frontend.err.log

# MongoDB
tail -f /var/log/mongodb.err.log
```

---

## Environment Variables

### Backend Environment Variables
Location: `/app/backend/.env`

Key variables:
- `MONGO_URL` - MongoDB connection string (DO NOT modify)
- Other API keys and configuration

### Frontend Environment Variables
Location: `/app/frontend/.env`

Key variables:
- `REACT_APP_BACKEND_URL` - Backend API URL (DO NOT modify)

**⚠️ CRITICAL:** Never hardcode URLs or modify the .env files unless explicitly required.

---

## Port Configuration

- **Backend:** 0.0.0.0:8001 (internal)
- **Frontend:** 0.0.0.0:3000 (internal)
- **MongoDB:** 27017 (internal)

All external routing is handled by Kubernetes ingress with `/api` prefix for backend routes.

---

## Dependency Management

### Backend (Python)
```bash
cd /app/backend
pip install -r requirements.txt
```

### Frontend (Node.js)
```bash
cd /app/frontend
yarn install --frozen-lockfile
```

**⚠️ Always use `yarn` for frontend, never `npm`** (npm can cause breaking changes).

---

## Quick Diagnostics

Run this command to get a complete system overview:
```bash
echo "=== Service Status ===" && \
sudo supervisorctl status && \
echo "" && \
echo "=== Backend Health ===" && \
curl -f http://localhost:8001/api/health 2>&1 && \
echo "" && \
echo "=== Frontend Status ===" && \
curl -I http://localhost:3000 2>&1 | head -1 && \
echo "" && \
echo "=== MongoDB Status ===" && \
pgrep -f mongod && echo "MongoDB is running" || echo "MongoDB is not running"
```

---

## When to Call Support/Troubleshoot Agent

If after trying the above solutions:
- Services still won't start after 3 attempts
- Same error appears repeatedly
- Logs show errors you don't understand
- System behaves unexpectedly

Call the troubleshoot agent or contact support with:
1. Output of `sudo supervisorctl status`
2. Last 50 lines of relevant log files
3. Steps you've already tried

---

## Prevention Tips

1. ✅ **Always use the startup check script after any major changes:**
   ```bash
   bash /app/scripts/startup_check.sh
   ```

2. ✅ **Run health checks periodically:**
   ```bash
   bash /app/scripts/health_check.sh
   ```

3. ✅ **Monitor logs when making changes:**
   ```bash
   # In one terminal
   tail -f /var/log/supervisor/backend.err.log
   
   # In another terminal
   tail -f /var/log/supervisor/frontend.err.log
   ```

4. ✅ **Don't modify .env files** unless you know what you're doing

5. ✅ **Always use yarn for frontend** package management

6. ✅ **Restart services after installing new dependencies:**
   ```bash
   # After pip install
   sudo supervisorctl restart backend
   
   # After yarn install
   sudo supervisorctl restart frontend
   ```

---

## Contact Information

For issues that cannot be resolved with this guide:
- Check `/app/test_result.md` for testing history
- Review `/app/README.md` for system documentation
- Call troubleshoot_agent for complex issues

---

**Last Updated:** January 2025
**System Version:** Gold Inventory Management System v1.0
