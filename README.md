<<<<<<< HEAD
# Testing 6
=======
# Testing 3
>>>>>>> b31b2899369e7f105da7aa8839d08cfdd4516b95

A comprehensive full-stack ERP system for managing gold jewelry business operations including inventory, job cards, invoices, purchases, parties, transactions, and financial reports.

## 🚀 Quick Start

### Check System Health

If you encounter any errors like "Web server returned an unknown error", run:

```bash
bash /app/scripts/startup_check.sh
```

This will automatically detect and fix any service issues.

### Manual Service Management

```bash
# Check service status
sudo supervisorctl status

# Restart all services
sudo supervisorctl restart all

# Restart specific service
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
```

## 🏗️ System Architecture

### Technology Stack

- **Backend:** FastAPI (Python) - Port 8001
- **Frontend:** React with Tailwind CSS - Port 3000  
- **Database:** MongoDB - Port 27017
- **Process Management:** Supervisor with auto-restart
- **Routing:** Kubernetes Ingress (all `/api` routes → backend)

### Key Features

1. **Module 1:** Gold Ledger (Party Gold Balance System)
2. **Module 2:** Party Reports (Gold + Money Combined Summary)
3. **Module 3:** Purchases (Stock IN + Vendor Payable)
4. **Module 4:** Purchase Payments + Gold Settlement
5. **Module 7:** Invoice Discount (Amount-Based)
6. **Module 8:** Job Card Gold Rate + Auto-fill Invoice
7. **Module 10:** Gold Exchange Payment Mode

## 🛠️ Maintenance & Troubleshooting

### Health Monitoring

Run health checks to verify all services:

```bash
# Automated health check with auto-restart
bash /app/scripts/health_check.sh

# View health check logs
tail -f /var/log/health_check.log

# Test backend health endpoint
curl http://localhost:8001/api/health
```

### Common Issues

See **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** for detailed solutions to:

- ❌ "Web server returned an unknown error"
- ❌ Frontend shows "BACKOFF" or crashes
- ❌ Backend not responding
- ❌ Services keep stopping
- ❌ Changes not reflecting in browser

### Service Logs

```bash
# Backend logs
tail -f /var/log/supervisor/backend.err.log

# Frontend logs  
tail -f /var/log/supervisor/frontend.err.log

# MongoDB logs
tail -f /var/log/mongodb.err.log
```

## 📁 Project Structure

```
/app/
├── backend/              # FastAPI backend
│   ├── server.py        # Main server with all endpoints
│   ├── init_db.py       # Database initialization
│   ├── requirements.txt # Python dependencies
│   └── .env             # Backend environment variables
├── frontend/            # React frontend
│   ├── src/
│   │   └── pages/      # All page components
│   ├── package.json    # Node.js dependencies
│   └── .env            # Frontend environment variables
├── scripts/            # Utility scripts
│   ├── health_check.sh      # Automated health monitoring
│   ├── startup_check.sh     # Startup verification
│   └── ensure-dependencies.sh
├── test_result.md      # Testing data and history
├── TROUBLESHOOTING.md  # Comprehensive troubleshooting guide
└── README.md           # This file
```

## 🔐 Environment Variables

### ⚠️ CRITICAL - DO NOT MODIFY

- **Frontend `.env`:** `REACT_APP_BACKEND_URL` (production-configured)
- **Backend `.env`:** `MONGO_URL` (configured for MongoDB)

These are pre-configured for the deployment environment. Modifying them will break the application.

### Using Environment Variables

```javascript
// Frontend - API calls
const backendUrl = process.env.REACT_APP_BACKEND_URL;
```

```python
# Backend - Database connection
mongo_url = os.environ['MONGO_URL']
```

## 🧪 Testing

### Backend Testing

```bash
# Run comprehensive backend tests
# (Add your backend test command here)
```

### Frontend Testing

```bash
cd /app/frontend
yarn test
```

### End-to-End Testing

See `/app/test_result.md` for testing history and protocols.

## 📦 Dependency Management

### Backend (Python)

```bash
cd /app/backend
pip install -r requirements.txt
sudo supervisorctl restart backend
```

### Frontend (Node.js)

**⚠️ ALWAYS use `yarn`, NEVER use `npm`**

```bash
cd /app/frontend
yarn install --frozen-lockfile
sudo supervisorctl restart frontend
```

## 🔧 Development Workflow

### Making Changes

1. Edit your code files
2. Services will hot-reload automatically (frontend and backend have hot reload enabled)
3. Only restart services when:
   - Installing new dependencies
   - Modifying `.env` files
   - Services crash or stop

### After Installing Dependencies

```bash
# Backend dependencies
sudo supervisorctl restart backend

# Frontend dependencies  
sudo supervisorctl restart frontend
```

### Verifying Changes

```bash
# Run startup check
bash /app/scripts/startup_check.sh

# Or check services manually
sudo supervisorctl status
```

## 🎯 API Routes

All backend API routes are prefixed with `/api`:

- `GET /api/health` - Health check endpoint
- `POST /api/auth/login` - User authentication
- `GET /api/parties` - Get all parties
- `GET /api/parties/{id}/summary` - Get party gold + money summary
- `GET /api/gold-ledger` - Get gold ledger entries
- `POST /api/jobcards` - Create job card
- `POST /api/invoices` - Create invoice
- `POST /api/purchases` - Create purchase
- And many more...

See `backend/server.py` for complete API documentation.

## 📊 Database Collections

- `users` - User accounts and authentication
- `parties` - Customers and vendors
- `inventory_headers` - Inventory categories (e.g., Gold 22K)
- `stock_movements` - Stock IN/OUT movements
- `gold_ledger` - Party gold balance tracking
- `jobcards` - Job cards
- `invoices` - Customer invoices
- `purchases` - Vendor purchases
- `transactions` - Financial transactions
- `accounts` - Chart of accounts
- `audit_log` - Complete audit trail

## 🚨 Emergency Recovery

If the system is completely unresponsive:

```bash
# 1. Check what's running
sudo supervisorctl status

# 2. Restart everything
sudo supervisorctl restart all

# 3. Wait 10 seconds
sleep 10

# 4. Verify
bash /app/scripts/startup_check.sh
```

If issues persist, see **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** or contact support.

## 📝 Best Practices

1. ✅ Run `startup_check.sh` after major changes
2. ✅ Use `health_check.sh` for periodic monitoring  
3. ✅ Monitor logs when making changes
4. ✅ Never modify `.env` URLs/ports
5. ✅ Always use `yarn` for frontend packages
6. ✅ Restart services after installing dependencies
7. ✅ Keep audit logs for compliance
8. ✅ Test thoroughly before production deployment

## 🔗 Useful Links

- Testing History: `/app/test_result.md`
- Troubleshooting Guide: `/app/TROUBLESHOOTING.md`
- Health Check Logs: `/var/log/health_check.log`
- Backend Logs: `/var/log/supervisor/backend.err.log`
- Frontend Logs: `/var/log/supervisor/frontend.err.log`

## 📞 Support

For issues not covered in this documentation:

1. Check `/app/TROUBLESHOOTING.md` first
2. Review `/app/test_result.md` for testing history
3. Run diagnostic commands from troubleshooting guide
4. Contact system administrator with log outputs

---

**Last Updated:** January 2025  
**Version:** 1.0  
**Status:** Production Ready