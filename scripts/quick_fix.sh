#!/bin/bash

###############################################################################
# Quick Fix Script - Immediate Solution for "Web server returned an unknown error"
# Run this script whenever you see the error
###############################################################################

echo "🔧 Quick Fix - Restarting Services..."
echo ""

# Restart all services
echo "→ Restarting all services..."
sudo supervisorctl restart all

# Wait for services to start
echo "→ Waiting for services to stabilize..."
sleep 8

# Check status
echo ""
echo "📊 Service Status:"
sudo supervisorctl status

echo ""
echo "✅ Quick fix complete!"
echo ""
echo "If the issue persists, run: bash /app/scripts/startup_check.sh"
echo "For detailed troubleshooting, see: /app/TROUBLESHOOTING.md"
echo ""
