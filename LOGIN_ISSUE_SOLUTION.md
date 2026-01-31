# Login Issue - Root Cause & Permanent Solution

## Problem
Users repeatedly experienced "Invalid credentials" errors when trying to login, even though the system was working previously.

## Root Cause
1. **MongoDB data is NOT persisted** between container restarts in the current setup
2. **No default users** are automatically created on system startup
3. Every time the container/services restart, the database is empty and has no user accounts

## Why This Keeps Happening
- MongoDB in this environment doesn't persist data across restarts
- The database starts empty each time
- Without an initialization script, no users exist for login

## Permanent Solution Implemented

### 1. Database Initialization Script Created
- **File**: `/app/backend/init_db.py`
- **Purpose**: Automatically creates default users on startup
- **Users Created**:
  - Admin: `username: admin, password: admin123, role: admin`
  - Staff: `username: staff, password: staff123, role: staff`

### 2. Auto-Initialization on Startup
- **Modified**: `/app/backend/server.py`
- **Added**: Startup event handler that calls `init_db.py`
- **Benefit**: Default users are recreated automatically whenever backend starts

## Default Login Credentials

### Admin Account
```
Username: admin
Password: admin123
Role: admin (full access)
```

### Staff Account
```
Username: staff
Password: staff123
Role: staff (limited access)
```

## Manual Recovery (If Needed)

If you ever face login issues again, run this command:

```bash
cd /app/backend && python3 init_db.py
```

This will recreate the default users.

## Important Notes

1. **Change default passwords** in production environments
2. **Database persistence** should be configured in production to prevent data loss
3. The initialization script checks if users exist before creating them (safe to run multiple times)
4. MongoDB uses database name from `.env` file: `DB_NAME=gold_shop_erp`

## Testing

Login should now work consistently:
```bash
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Expected response: `{"access_token": "...", "user": {...}}`

---

**Status**: ✅ RESOLVED
**Date**: 2026-01-20
**Solution**: Auto-initialization on startup + manual recovery script
