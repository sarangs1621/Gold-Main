#!/bin/bash
# Permanent solution to ensure all dependencies are installed before starting services

set -e  # Exit on error

echo "=========================================="
echo "Ensuring all dependencies are installed..."
echo "=========================================="

# Check and install backend dependencies
echo "📦 Checking backend dependencies..."
if [ -f "/app/backend/requirements.txt" ]; then
    cd /app/backend
    pip install -q -r requirements.txt
    echo "✅ Backend dependencies verified"
else
    echo "⚠️  No requirements.txt found in backend"
fi

# Check and install frontend dependencies
echo "📦 Checking frontend dependencies..."
if [ -f "/app/frontend/package.json" ]; then
    cd /app/frontend
    
    # Check if node_modules exists and has packages
    if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
        echo "📥 Installing frontend dependencies..."
        yarn install --frozen-lockfile
    else
        # Verify critical dependencies
        if [ ! -d "node_modules/@craco" ]; then
            echo "⚠️  Critical dependency @craco/craco missing, reinstalling..."
            yarn install --frozen-lockfile
        else
            echo "✅ Frontend dependencies verified"
        fi
    fi
else
    echo "⚠️  No package.json found in frontend"
fi

echo "=========================================="
echo "✅ All dependencies verified and installed"
echo "=========================================="
